import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, otp } = body;

    if (!userId || !otp) {
      return NextResponse.json(
        { error: 'กรุณาระบุรหัสยืนยัน OTP' },
        { status: 400 }
      );
    }

    const trimmedOtp = String(otp).trim();

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบบัญชีผู้ใช้งานในระบบ' },
        { status: 404 }
      );
    }

    if (!user.pendingEmail || !user.emailOtp) {
      return NextResponse.json(
        { error: 'ไม่มีคำขอเปลี่ยนอีเมลที่รอยืนยัน หรือคำขอหมดอายุแล้ว' },
        { status: 400 }
      );
    }

    // Check expiry
    if (!user.emailOtpExpiry || new Date() > user.emailOtpExpiry) {
      return NextResponse.json(
        { error: 'รหัส OTP หมดอายุแล้ว กรุณากดส่งรหัสยืนยันใหม่อีกครั้ง' },
        { status: 400 }
      );
    }

    // Check OTP match
    if (user.emailOtp !== trimmedOtp) {
      return NextResponse.json(
        { error: 'รหัสยืนยัน (OTP) ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' },
        { status: 400 }
      );
    }

    // Re-check if pendingEmail got taken while waiting for OTP
    const emailConflict = await prisma.user.findFirst({
      where: {
        email: { equals: user.pendingEmail, mode: 'insensitive' },
        id: { not: userId },
      },
    });

    if (emailConflict) {
      return NextResponse.json(
        { error: 'อีเมลนี้ถูกใช้งานโดยบัญชีอื่นแล้ว กรุณาใช้อีเมลอื่น' },
        { status: 400 }
      );
    }

    const newEmail = user.pendingEmail;

    // Apply email change and clear pending fields
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email: newEmail,
        pendingEmail: null,
        emailOtp: null,
        emailOtpExpiry: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'ยืนยันและเปลี่ยนอีเมลสำเร็จเรียบร้อยแล้ว',
      user: {
        id: updatedUser.id,
        prefix: updatedUser.prefix,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        department: updatedUser.department,
        studentId: updatedUser.studentId,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        status: updatedUser.status,
      },
    });
  } catch (error: any) {
    console.error('Verify email change error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการยืนยันรหัส OTP กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
