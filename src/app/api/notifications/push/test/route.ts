import { NextResponse } from 'next/server';
import { sendPushToUser } from '@/lib/webpush';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'กรุณาระบุ userId' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, role: true },
    });

    const isApproverOrOfficer =
      user?.role === 'APPROVER' || user?.role === 'OFFICER' || user?.role === 'ADMIN';

    const testPayload = {
      title: 'ทดสอบการแจ้งเตือนสำเร็จ 🔔',
      message: `สวัสดีคุณ ${user?.name || 'ผู้ใช้งาน'} โทรศัพท์ของคุณเชื่อมต่อระบบแจ้งเตือนของห้องปฏิบัติการพยาบาลศาสตร์เรียบร้อยแล้ว`,
      linkUrl: isApproverOrOfficer ? '/approvals' : '/dashboard',
      tag: `test-push-${Date.now()}`,
      actions: isApproverOrOfficer
        ? [
            { action: 'approve', title: '✅ ทดสอบปุ่มอนุมัติ' },
            { action: 'view', title: '🔍 เปิดดูระบบ' },
          ]
        : [{ action: 'view', title: '📲 เปิดดูระบบ' }],
    };

    const res = await sendPushToUser(userId, testPayload);

    if (!res.success) {
      return NextResponse.json({ error: res.error || 'Failed to send' }, { status: 500 });
    }

    if (res.count === 0) {
      return NextResponse.json(
        {
          warning: true,
          message: 'ยังไม่พบอุปกรณ์ที่ลงทะเบียนสำหรับบัญชีนี้ กรุณากด "เปิดการแจ้งเตือนบนอุปกรณ์นี้" ก่อนทดสอบ',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `ส่งการแจ้งเตือนทดสอบไปยัง ${res.count} อุปกรณ์เรียบร้อยแล้ว`,
      deliveredCount: res.count,
    });
  } catch (error: any) {
    console.error('Error sending test push:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
