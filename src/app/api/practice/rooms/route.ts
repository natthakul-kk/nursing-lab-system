import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const rooms = await prisma.practiceRoom.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { slots: true },
        },
      },
      orderBy: { code: 'asc' },
    });
    return NextResponse.json(rooms);
  } catch (error: any) {
    console.error('Error fetching practice rooms:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch rooms' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, name, location, capacity, description } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'กรุณากรอกรหัสและชื่อห้องปฏิบัติการ' }, { status: 400 });
    }

    const room = await prisma.practiceRoom.create({
      data: {
        code,
        name,
        location: location || null,
        capacity: Number(capacity) || 10,
        description: description || null,
      },
    });

    return NextResponse.json(room);
  } catch (error: any) {
    console.error('Error creating practice room:', error);
    return NextResponse.json({ error: error.message || 'Failed to create room' }, { status: 500 });
  }
}
