import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePasswordStrength } from '@/lib/auth-security';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otpCode, newPassword } = body;

    if (!email || !otpCode || !newPassword) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = otpCode.trim();

    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      return NextResponse.json(
        { error: 'ไม่พบคำขอรีเซ็ตรหัสผ่าน หรือรหัสยืนยันไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date() > new Date(user.resetTokenExpiry)) {
      return NextResponse.json(
        { error: 'รหัสยืนยัน (OTP) หมดอายุแล้ว กรุณาส่งคำขอใหม่อีกครั้ง' },
        { status: 400 }
      );
    }

    // Check token match
    if (user.resetToken !== trimmedOtp) {
      return NextResponse.json(
        { error: 'รหัสยืนยัน (OTP) ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' },
        { status: 400 }
      );
    }

    // Hash and update
    const hashedNewPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'รีเซ็ตรหัสผ่านใหม่สำเร็จแล้ว ท่านสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการตั้งรหัสผ่านใหม่' },
      { status: 500 }
    );
  }
}
