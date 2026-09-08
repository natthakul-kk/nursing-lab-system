import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOtp } from '@/lib/auth-security';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawInput = body.identifier || body.email;

    if (!rawInput || !rawInput.trim()) {
      return NextResponse.json(
        { error: 'กรุณากรอกรหัสประจำตัว (ID) หรืออีเมลที่ลงทะเบียนไว้' },
        { status: 400 }
      );
    }

    const trimmedInput = rawInput.trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: trimmedInput, mode: 'insensitive' } },
          { studentId: { equals: trimmedInput, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      // Do not leak existence of email for security, or return clear message
      return NextResponse.json({
        success: true,
        message: 'หากอีเมลนี้มีอยู่ในระบบ ท่านจะได้รับรหัสยืนยัน (OTP) ทางอีเมล',
      });
    }

    // Generate 6-digit OTP and 15-minute expiry
    const otpCode = generateOtp();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: otpCode,
        resetTokenExpiry: expiry,
      },
    });

    // Send email
    const emailResult = await sendPasswordResetEmail({
      recipientEmail: user.email,
      recipientName: user.name,
      otpCode,
    });

    return NextResponse.json({
      success: true,
      message: 'ระบบได้ส่งรหัสยืนยัน (OTP) ไปยังอีเมลของท่านแล้ว (รหัสมีอายุ 15 นาที)',
      // Provide devOtp if in dev mode / email not sent for immediate testing convenience
      ...(emailResult?.devMode ? { devOtp: otpCode } : {}),
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการส่งคำขอรีเซ็ตรหัสผ่าน' },
      { status: 500 }
    );
  }
}
