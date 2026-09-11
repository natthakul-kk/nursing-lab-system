import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where = includeInactive ? {} : { isActive: true };

    const rooms = await prisma.practiceRoom.findMany({
      where,
      include: {
        _count: {
          select: {
            roomBookings: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json(rooms);
  } catch (error: any) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch rooms' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, name, location, capacity, description, closeReason } = body;

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
        closeReason: closeReason || null,
        isActive: true,
      },
    });

    invalidateCache('practice:rooms:');
    return NextResponse.json(room, { status: 201 });
  } catch (error: any) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: error.message || 'Failed to create room' }, { status: 500 });
  }
}
