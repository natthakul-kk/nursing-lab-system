import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, hashPassword } from '@/lib/auth-security';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกอีเมลและรหัสผ่าน' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบบัญชีผู้ใช้นี้ หรืออีเมลไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    if (user.status === 'INACTIVE') {
      return NextResponse.json(
        { error: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 403 }
      );
    }

    // Verify password using bcrypt or plain text with auto-upgrade
    const { isValid, needsMigration } = await verifyPassword(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' },
        { status: 401 }
      );
    }

    // If password was stored as plain text, migrate to bcrypt hash immediately
    if (needsMigration) {
      const secureHash = await hashPassword(password);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: secureHash },
      });
      console.log(`[AUTH SECURITY] Upgraded password for ${user.email} to bcrypt hash.`);
    }

    // Return sanitized user (exclude password, resetToken)
    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      studentId: user.studentId,
      phone: user.phone,
      avatar: user.avatar,
      status: user.status,
    };

    return NextResponse.json({
      success: true,
      user: sanitizedUser,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}
