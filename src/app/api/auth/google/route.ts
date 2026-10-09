import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '@/lib/prisma';

// Use configured client ID or fallback
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(googleClientId);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { credential } = body;

    if (!credential) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลการยืนยันตัวตนจาก Google (Missing credential)' },
        { status: 400 }
      );
    }

    let payload: any = null;

    // Verify token using google-auth-library
    if (googleClientId) {
      try {
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: googleClientId,
        });
        payload = ticket.getPayload();
      } catch (verifyErr: any) {
        console.error('Google token verification failed with client ID:', verifyErr);
        return NextResponse.json(
          { error: 'การยืนยันตัวตนกับ Google ล้มเหลว กรุณาลองใหม่อีกครั้ง' },
          { status: 401 }
        );
      }
    } else {
      // Fallback verification using Google's public tokeninfo endpoint
      try {
        const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (!tokenInfoRes.ok) {
          throw new Error('Invalid token from tokeninfo');
        }
        payload = await tokenInfoRes.json();
      } catch (err: any) {
        console.error('Tokeninfo fetch error:', err);
        return NextResponse.json(
          { error: 'ไม่สามารถตรวจสอบความถูกต้องของโทเคน Google ได้' },
          { status: 401 }
        );
      }
    }

    if (!payload || !payload.email) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลอีเมลจากบัญชี Google' },
        { status: 400 }
      );
    }

    const email = String(payload.email).trim().toLowerCase();
    const name = payload.name || payload.given_name || 'ผู้ใช้งาน Google';

    // Find user in database by email (case-insensitive)
    let user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
      },
    });

    // If user does not exist in database
    if (!user) {
      // Auto-register only if KU domain email (@ku.th)
      const isKuEmail = email.endsWith('@ku.th');

      if (isKuEmail) {
        // Extract student ID from email if pattern bXXXXXXXXXX@ku.th or similar
        let extractedStudentId: string | null = null;
        const match = email.match(/^b?(\d{8,10})@ku\.th$/i);
        if (match && match[1]) {
          extractedStudentId = `b${match[1]}`;
        }

        user = await prisma.user.create({
          data: {
            email,
            name,
            role: 'USER',
            studentId: extractedStudentId,
            status: 'ACTIVE',
            approvalScopes: 'ALL',
            password: 'GOOGLE_OAUTH_ACCOUNT', // Safe placeholder
          },
        });
        console.log(`[GOOGLE AUTH] Created new user account for ${email} with role USER`);
      } else {
        return NextResponse.json(
          {
            error: `ไม่พบบัญชี "${email}" ในระบบห้องปฏิบัติการพยาบาล กรุณาเข้าสู่ระบบด้วยอีเมลมหาวิทยาลัย (@ku.th) หรือติดต่อเจ้าหน้าที่ห้องปฏิบัติการเพื่อลงทะเบียน`,
          },
          { status: 403 }
        );
      }
    }

    // Check account status
    if (user.status && user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'บัญชีผู้ใช้นี้ถูกปิดการใช้งานหรือระงับสิทธิ์แล้ว กรุณาติดต่อเจ้าหน้าที่ห้องปฏิบัติการ' },
        { status: 403 }
      );
    }

    // Return sanitized user (exclude password, resetToken) - Strict zero profile picture overwrite
    const sanitizedUser = {
      id: user.id,
      prefix: user.prefix,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      studentId: user.studentId,
      phone: user.phone,
      avatar: user.avatar,
      status: user.status,
      approvalScopes: user.approvalScopes || 'ALL',
    };

    return NextResponse.json({
      success: true,
      user: sanitizedUser,
    });
  } catch (error: any) {
    console.error('Google login route error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google' },
      { status: 500 }
    );
  }
}
