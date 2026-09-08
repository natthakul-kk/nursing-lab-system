import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOtp } from '@/lib/auth-security';
import { sendEmailChangeOtpEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, newEmail } = body;

    if (!userId || !newEmail) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ครบถ้วน กรุณาระบุรหัสผู้ใช้และอีเมลใหม่' },
        { status: 400 }
      );
    }

    const trimmedEmail = String(newEmail).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: 'รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบบัญชีผู้ใช้งานในระบบ' },
        { status: 404 }
      );
    }

    if (user.email.toLowerCase() === trimmedEmail) {
      return NextResponse.json(
        { error: 'อีเมลที่ระบุเป็นอีเมลปัจจุบันของท่านอยู่แล้ว' },
        { status: 400 }
      );
    }

    // Check if new email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email: { equals: trimmedEmail, mode: 'insensitive' },
        id: { not: userId },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'อีเมลนี้มีผู้ใช้งานอื่นในระบบลงทะเบียนไว้แล้ว' },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP and 15-minute expiry
    const otpCode = generateOtp();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    // Save pending email and OTP to user
    await prisma.user.update({
      where: { id: userId },
      data: {
        pendingEmail: trimmedEmail,
        emailOtp: otpCode,
        emailOtpExpiry: expiry,
      },
    });

    // Send email to the NEW email address
    const emailResult = await sendEmailChangeOtpEmail({
      recipientEmail: trimmedEmail,
      recipientName: user.name,
      otpCode,
    });

    return NextResponse.json({
      success: true,
      message: `ระบบได้ส่งรหัส OTP 6 หลักไปยัง ${trimmedEmail} แล้ว (รหัสมีอายุ 15 นาที)`,
      ...(emailResult?.devMode ? { devOtp: otpCode } : {}),
    });
  } catch (error: any) {
    console.error('Request email change error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่งรหัส OTP กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
