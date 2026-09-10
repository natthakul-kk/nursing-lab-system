import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCached, setCached, invalidateCache } from '@/lib/cache';
import { hashPassword } from '@/lib/auth-security';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role'); // e.g. "APPROVER", "TEACHER", "OFFICER"

    const cacheKey = `users:list:${role || 'ALL'}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const whereCondition: any = { status: 'ACTIVE' };
    if (role === 'APPROVER' || role === 'INSTRUCTOR' || role === 'TEACHER') {
      whereCondition.OR = [
        { role: 'APPROVER' },
        { role: 'TEACHER' },
        { role: 'ADMIN' },
        { role: 'OFFICER' },
        { email: { contains: 'teacher' } },
        { name: { startsWith: 'อ.' } },
        { name: { startsWith: 'ผศ.' } },
        { name: { startsWith: 'รศ.' } },
        { name: { startsWith: 'ดร.' } },
        { name: { startsWith: 'ศ.' } },
        { department: { contains: 'อาจารย์' } },
      ];
    } else if (role) {
      whereCondition.role = role;
    }

    const users = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        studentId: true,
        phone: true,
        avatar: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    });

    setCached(cacheKey, users, 60 * 1000); // 60s TTL
    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to get users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawPassword = body.password || '123456';
    const hashedPassword = await hashPassword(rawPassword);

    const trimmedStudentId = body.studentId ? String(body.studentId).trim() : null;
    if (trimmedStudentId) {
      const duplicate = await prisma.user.findFirst({
        where: { studentId: { equals: trimmedStudentId, mode: 'insensitive' } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `รหัสประจำตัว (ID) "${trimmedStudentId}" นี้มีผู้ใช้งานอื่นใช้อยู่แล้ว` },
          { status: 400 }
        );
      }
    }

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
        role: body.role || 'USER',
        department: body.department,
        studentId: trimmedStudentId,
        phone: body.phone,
      },
    });

    invalidateCache('users:');
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
