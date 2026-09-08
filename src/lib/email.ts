import { generateSignedApprovalToken } from '@/lib/token';
import { Resend } from 'resend';
import QRCode from 'qrcode';

// Initialize Resend with API Key from environment or fallback
const resendApiKey = process.env.RESEND_API_KEY || '';
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Sender email address
const senderEmail = process.env.EMAIL_FROM || 'Nursing Lab System <onboarding@resend.dev>';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Helper to generate QR code data URL
 */
export async function generateQrCodeDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f766e', // Teal color
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('Failed to generate QR Code data URL:', error);
    return '';
  }
}

/**
 * 1. Send Email Notification to Instructor/Approver when student books a practice slot or requests borrow
 */
export async function sendApprovalRequestEmail(params: {
  approverEmail: string;
  approverName: string;
  studentName: string;
  studentId?: string;
  type: 'PRACTICE' | 'BORROW' | 'REQUISITION';
  title: string;
  details: { label: string; value: string }[];
  requestId: string;
}) {
  const { approverEmail, approverName, studentName, studentId, type, title, details, requestId } = params;

  if (!resend) {
    console.log(`[Email Mock - RESEND_API_KEY not set] Approval request to ${approverEmail} for ${title}`);
    return { success: true, mocked: true };
  }

  const approveToken = generateSignedApprovalToken(requestId, type, 'APPROVE');
  const approveUrl = `${appUrl}/api/approvals/quick-action?token=${approveToken}`;
  const rejectToken = generateSignedApprovalToken(requestId, type, 'REJECT');
  const rejectUrl = `${appUrl}/api/approvals/quick-action?token=${rejectToken}`;
  const viewUrl = `${appUrl}/approvals`;

  const detailsHtml = details
    .map(
      (d) => `
      <tr>
        <td style="padding: 8px 12px; font-weight: 600; color: #475569; width: 35%; border-bottom: 1px solid #f1f5f9;">${d.label}:</td>
        <td style="padding: 8px 12px; color: #0f172a; font-weight: 500; border-bottom: 1px solid #f1f5f9;">${d.value}</td>
      </tr>`
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 28px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">ระบบห้องปฏิบัติการพยาบาล (Nursing Lab)</h2>
          <p style="margin: 6px 0 0; opacity: 0.9; font-size: 13px;">มีคำขอใหม่รอการพิจารณาอนุมัติจากท่าน</p>
        </div>

        <!-- Body -->
        <div style="padding: 24px 28px;">
          <p style="margin-top: 0; font-size: 14px; line-height: 1.6; color: #334155;">
            เรียน <b>${approverName || 'อาจารย์/เจ้าหน้าที่'}</b>,
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            นิสิต <b>${studentName}</b> ${studentId ? `(รหัส: ${studentId})` : ''} ได้ยื่นคำขอเกี่ยวกับ <b>${title}</b> ในระบบ โดยมีรายละเอียดดังนี้:
          </p>

          <!-- Details Table -->
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 12px; margin: 18px 0; border: 1px solid #e2e8f0;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              ${detailsHtml}
            </table>
          </div>

          <p style="font-size: 13px; color: #64748b; margin: 18px 0 24px;">
            💡 ท่านสามารถกด <b>"อนุมัติทันที"</b> หรือ <b>"ไม่อนุมัติ"</b> ได้โดยตรงจากปุ่มด้านล่างนี้ โดยไม่จำเป็นต้องล็อกอินเข้าสู่ระบบ:
          </p>

          <!-- Quick Action Buttons -->
          <div style="text-align: center; margin: 28px 0 16px;">
            <a href="${approveUrl}" style="background-color: #0d9488; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; margin-right: 12px; box-shadow: 0 2px 4px rgba(13, 148, 136, 0.2);">
              ✓ อนุมัติคำขอนี้ (Approve)
            </a>
            <a href="${rejectUrl}" style="background-color: #f43f5e; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(244, 63, 94, 0.2);">
              ✕ ไม่อนุมัติ (Reject)
            </a>
          </div>

          <div style="text-align: center; margin-top: 16px;">
            <a href="${viewUrl}" style="color: #64748b; font-size: 12px; text-decoration: underline;">
              ดูรายการคำขอทั้งหมดในศูนย์อนุมัติ
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 16px 28px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
          ระบบบริหารจัดการห้องปฏิบัติการพยาบาล คณะพยาบาลศาสตร์ • อีเมลแจ้งเตือนอัตโนมัติ กรุณาอย่าตอบกลับอีเมลนี้
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await resend.emails.send({
      from: senderEmail,
      to: [approverEmail],
      subject: `[รออนุมัติ] ${title} - ${studentName}`,
      html: htmlContent,
    });
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Resend email error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 2. Send Approved Email to Student with Attached/Embedded Dynamic QR Code
 */
export async function sendApprovalNotificationWithQrEmail(params: {
  studentEmail: string;
  studentName: string;
  bookingNumber: string;
  skillTopic: string;
  roomName: string;
  dateTimeStr: string;
  qrCodeToken: string;
}) {
  const { studentEmail, studentName, bookingNumber, skillTopic, roomName, dateTimeStr, qrCodeToken } = params;

  if (!resend) {
    console.log(`[Email Mock - RESEND_API_KEY not set] Approved email with QR sent to ${studentEmail}`);
    return { success: true, mocked: true };
  }

  // Generate QR Code Data URL
  const qrDataUrl = await generateQrCodeDataUrl(qrCodeToken);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>คำขอจองห้องฝึกปฏิบัติการได้รับการอนุมัติแล้ว</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 28px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700;">คำขอจองห้องฝึกปฏิบัติการได้รับการอนุมัติแล้ว ✅</h2>
          <p style="margin: 6px 0 0; opacity: 0.95; font-size: 13px;">กรุณาบันทึก QR Code นี้ไว้สำหรับสแกนเข้าห้องปฏิบัติการ</p>
        </div>

        <!-- Body -->
        <div style="padding: 24px 28px;">
          <p style="margin-top: 0; font-size: 14px; line-height: 1.6; color: #334155;">
            สวัสดี <b>${studentName}</b>,
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            คำขอจองรอบฝึกปฏิบัติการของท่านได้รับการพิจารณาอนุมัติเรียบร้อยแล้ว ท่านสามารถนำ QR Code ด้านล่างนี้ไปสแกนที่จุด Check-in หน้าห้องเพื่อเข้าใช้งานได้ตามกำหนดเวลา:
          </p>

          <!-- QR Code Display Box -->
          <div style="text-align: center; background-color: #f0fdf4; border-radius: 16px; padding: 20px; margin: 20px 0; border: 2px dashed #86efac;">
            <div style="font-size: 12px; font-weight: 700; color: #15803d; margin-bottom: 12px;">
              🎟️ QR CODE ประจำคำขอ: ${bookingNumber}
            </div>
            ${
              qrDataUrl
                ? `<img src="${qrDataUrl}" alt="Check-in QR Code" style="width: 220px; height: 220px; border-radius: 12px; background: #ffffff; padding: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.08);" />`
                : `<p style="color: #ef4444;">ไม่สามารถสร้างรูปภาพ QR Code ได้</p>`
            }
            <div style="font-size: 11px; font-family: monospace; color: #166534; font-weight: bold; margin-top: 10px;">
              Token: ${qrCodeToken}
            </div>
          </div>

          <!-- Booking Summary Table -->
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 14px; margin: 18px 0; border: 1px solid #e2e8f0;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 10px; font-weight: 600; color: #64748b; width: 35%;">รหัสการจอง:</td>
                <td style="padding: 6px 10px; font-weight: 700; color: #0f172a;">${bookingNumber}</td>
              </tr>
              <tr>
                <td style="padding: 6px 10px; font-weight: 600; color: #64748b;">หัตถการ:</td>
                <td style="padding: 6px 10px; font-weight: 600; color: #0d9488;">${skillTopic}</td>
              </tr>
              <tr>
                <td style="padding: 6px 10px; font-weight: 600; color: #64748b;">ห้องปฏิบัติการ:</td>
                <td style="padding: 6px 10px; color: #0f172a;">${roomName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 10px; font-weight: 600; color: #64748b;">วันและเวลา:</td>
                <td style="padding: 6px 10px; color: #0f172a; font-weight: 700;">${dateTimeStr}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #fffbeb; border-radius: 10px; padding: 12px 14px; border: 1px solid #fef3c7; font-size: 12px; color: #92400e; margin-top: 16px;">
            ⚠️ <b>ข้อปฏิบัติ:</b> สามารถสแกน Check-in ได้ก่อนเวลาเริ่มรอบล่วงหน้า 30 นาที และกรุณาแต่งกายด้วยชุดฝึกปฏิบัติการให้เรียบร้อย
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 16px 28px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
          ระบบบริหารจัดการห้องปฏิบัติการพยาบาล คณะพยาบาลศาสตร์
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await resend.emails.send({
      from: senderEmail,
      to: [studentEmail],
      subject: `[อนุมัติแล้ว] QR Code เข้าห้องฝึกปฏิบัติการ (${bookingNumber})`,
      html: htmlContent,
    });
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Resend email error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 3. Send Password Reset OTP Email
 */
export async function sendPasswordResetEmail(params: {
  recipientEmail: string;
  recipientName: string;
  otpCode: string;
}) {
  const { recipientEmail, recipientName, otpCode } = params;

  if (!resend) {
    console.log(`[DEV MODE] Resend not configured. Password Reset OTP for ${recipientEmail}: ${otpCode}`);
    return { success: true, devMode: true };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>รหัสยืนยันเพื่อรีเซ็ตรหัสผ่าน (OTP)</title>
    </head>
    <body style="font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #0d9488, #0f766e); padding: 24px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700;">รีเซ็ตรหัสผ่าน</h2>
          <p style="margin: 4px 0 0; font-size: 12px; color: #ccfbf1;">ห้องปฏิบัติการพยาบาลศาสตร์</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 14px; color: #334155; margin-top: 0;">เรียนคุณ <b>${recipientName}</b>,</p>
          <p style="font-size: 13px; color: #475569; line-height: 1.6;">
            ระบบได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี <b>${recipientEmail}</b> กรุณาใช้รหัสยืนยัน (OTP) ด้านล่างนี้เพื่อตั้งรหัสผ่านใหม่:
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <div style="display: inline-block; background-color: #f0fdfa; border: 2px dashed #0d9488; padding: 14px 32px; border-radius: 12px; letter-spacing: 6px; font-size: 28px; font-weight: 800; color: #0f766e; font-family: monospace;">
              ${otpCode}
            </div>
            <p style="font-size: 11px; color: #64748b; margin-top: 8px;">รหัสมีอายุการใช้งาน 15 นาที</p>
          </div>
          <div style="background-color: #fffbeb; border-radius: 8px; padding: 10px 12px; font-size: 11px; color: #92400e;">
            ⚠️ หากท่านไม่ได้ส่งคำขอนี้ สามารถเพิกเฉยต่ออีเมลฉบับนี้ได้ บัญชีของท่านยังคงปลอดภัย
          </div>
        </div>
        <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
          ระบบบริหารจัดการห้องปฏิบัติการพยาบาลศาสตร์
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await resend.emails.send({
      from: senderEmail,
      to: [recipientEmail],
      subject: `[รหัส OTP: ${otpCode}] สำหรับรีเซ็ตรหัสผ่านระบบห้องแล็บพยาบาล`,
      html: htmlContent,
    });
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Resend email error:', error);
    return { success: false, error: error.message };
  }
}

