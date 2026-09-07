import { verifySignedApprovalToken } from '@/lib/token';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendApprovalNotificationWithQrEmail } from '@/lib/email';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    let id = searchParams.get('id');
    let type = searchParams.get('type');
    let action = searchParams.get('action');

    // If token is provided, verify its HMAC cryptographic signature & expiry
    if (token) {
      const verification = verifySignedApprovalToken(token);
      if (!verification.valid) {
        return renderResponseHtml({
          success: false,
          title: 'ลิงก์ไม่ถูกต้องหรือหมดอายุ',
          message: verification.error || 'ไม่สามารถยืนยันความถูกต้องของลิงก์การอนุมัตินี้ได้',
          isDanger: true,
        });
      }
      id = verification.id!;
      type = verification.type!;
      action = verification.action!;
    } else {
      // Direct parameters require id, type, action
      if (!id || !type || !action) {
        return renderResponseHtml({
          success: false,
          title: 'ข้อมูลไม่ครบถ้วน',
          message: 'ลิงก์การอนุมัติไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึง',
          isDanger: true,
        });
      }
    }

    if (type === 'PRACTICE') {
      const booking = await prisma.practiceBooking.findUnique({
        where: { id },
        include: {
          user: true,
          slot: {
            include: { room: true },
          },
        },
      });

      if (!booking) {
        return renderResponseHtml({
          success: false,
          title: 'ไม่พบคำขอ',
          message: 'ไม่พบข้อมูลคำขอจองห้องฝึกนี้ในระบบ',
        });
      }

      if (booking.status === 'APPROVED') {
        return renderResponseHtml({
          success: true,
          title: 'คำขอนี้ได้รับการอนุมัติแล้ว',
          message: `คำขอจอง ${booking.bookingNumber} (${booking.skillTopic}) ได้รับการอนุมัติไปเรียบร้อยแล้ว`,
          badge: 'อนุมัติแล้ว',
        });
      }

      if (action === 'APPROVE') {
        const updated = await prisma.practiceBooking.update({
          where: { id },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(),
          },
        });

        // Trigger email with QR code to student
        if (booking.user?.email) {
          const slotDateStr = new Date(booking.slot.date).toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          const dateTimeStr = `${slotDateStr} เวลา ${booking.slot.startTime} - ${booking.slot.endTime} น.`;

          sendApprovalNotificationWithQrEmail({
            studentEmail: booking.user.email,
            studentName: booking.user.name,
            bookingNumber: booking.bookingNumber,
            skillTopic: booking.skillTopic,
            roomName: booking.slot.room?.name || 'ห้องปฏิบัติการพยาบาล',
            dateTimeStr,
            qrCodeToken: booking.qrCodeToken,
          }).catch((err) => console.error('Background email failed:', err));
        }

        return renderResponseHtml({
          success: true,
          title: 'อนุมัติคำขอจองสำเร็จเรียบร้อย! 🎉',
          message: `อนุมัติการจอง ${booking.bookingNumber} สำหรับ ${booking.user.name} (${booking.skillTopic}) สำเร็จ ระบบได้ส่ง QR Code เข้าอีเมลนิสิตเรียบร้อยแล้ว`,
          badge: 'อนุมัติเรียบร้อย',
        });
      } else if (action === 'REJECT') {
        await prisma.practiceBooking.update({
          where: { id },
          data: {
            status: 'REJECTED',
            rejectionReason: 'ไม่อนุมัติผ่านอีเมล',
          },
        });

        return renderResponseHtml({
          success: true,
          title: 'บันทึกการไม่อนุมัติคำขอแล้ว',
          message: `คำขอจอง ${booking.bookingNumber} ได้รับการบันทึกสถานะเป็นไม่อนุมัติเรียบร้อยแล้ว`,
          badge: 'ไม่อนุมัติ',
          isDanger: true,
        });
      }
    }

    if (type === 'BORROW') {
      const borrow = await prisma.borrowRequest.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!borrow) {
        return renderResponseHtml({
          success: false,
          title: 'ไม่พบคำขอยืม',
          message: 'ไม่พบคำขอยืมครุภัณฑ์นี้ในระบบ',
        });
      }

      if (action === 'APPROVE') {
        await prisma.borrowRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            instructorAcknowledged: true,
            acknowledgedAt: new Date(),
            approvedAt: new Date(),
          },
        });

        return renderResponseHtml({
          success: true,
          title: 'อนุมัติคำขอยืมครุภัณฑ์สำเร็จ',
          message: `คำขอยืม ${borrow.requestNumber} ของ ${borrow.user.name} ได้รับการอนุมัติแล้ว เจ้าหน้าที่ห้องแล็บจะเตรียมส่งมอบอุปกรณ์ตามวันเวลาที่นัดหมาย`,
          badge: 'อนุมัติแล้ว',
        });
      } else {
        await prisma.borrowRequest.update({
          where: { id },
          data: {
            status: 'REJECTED',
            rejectionReason: 'ไม่อนุมัติผ่านอีเมล',
          },
        });

        return renderResponseHtml({
          success: true,
          title: 'บันทึกการไม่อนุมัติคำขอยืมแล้ว',
          message: `คำขอยืม ${borrow.requestNumber} ได้รับการบันทึกสถานะเป็นไม่อนุมัติเรียบร้อยแล้ว`,
          badge: 'ไม่อนุมัติ',
          isDanger: true,
        });
      }
    }

    return renderResponseHtml({
      success: false,
      title: 'ไม่รองรับคำขอนี้',
      message: 'ประเภทของคำขอไม่ถูกต้อง',
    });
  } catch (error: any) {
    console.error('Quick action error:', error);
    return renderResponseHtml({
      success: false,
      title: 'เกิดข้อผิดพลาดในการประมวลผล',
      message: error.message || 'กรุณาลองใหม่อีกครั้ง หรือเข้าสู่ระบบเพื่อดำเนินการ',
    });
  }
}

function renderResponseHtml(params: {
  success: boolean;
  title: string;
  message: string;
  badge?: string;
  isDanger?: boolean;
}) {
  const { success, title, message, badge, isDanger } = params;
  const badgeColor = isDanger ? '#e11d48' : success ? '#0d9488' : '#eab308';
  const badgeBg = isDanger ? '#ffe4e6' : success ? '#ccfbf1' : '#fef9c3';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - Nursing Lab System</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 16px;
        }
        .card {
          background: #ffffff;
          max-width: 480px;
          width: 100%;
          border-radius: 24px;
          padding: 32px 28px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
          text-align: center;
          border: 1px solid #e2e8f0;
        }
        .badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 700;
          background-color: ${badgeBg};
          color: ${badgeColor};
          margin-bottom: 16px;
        }
        h1 {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 12px;
        }
        p {
          font-size: 14px;
          line-height: 1.6;
          color: #475569;
          margin: 0 0 24px;
        }
        .btn {
          display: inline-block;
          background-color: #0d9488;
          color: #ffffff;
          font-weight: 700;
          font-size: 13px;
          padding: 10px 22px;
          border-radius: 12px;
          text-decoration: none;
          transition: background 0.2s;
        }
        .btn:hover {
          background-color: #0f766e;
        }
      </style>
    </head>
    <body>
      <div class="card">
        ${badge ? `<div class="badge">${badge}</div>` : ''}
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="/approvals" class="btn">ไปยังศูนย์อนุมัติในระบบ</a>
      </div>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
