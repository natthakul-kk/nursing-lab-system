import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date'); // YYYY-MM-DD
    const roomId = searchParams.get('roomId');

    const where: any = {};
    if (roomId) where.roomId = roomId;

    if (dateParam) {
      const targetDate = new Date(dateParam);
      const startOfDay = new Date(targetDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else {
      // Default: from today onwards for the next 14 days
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const future = new Date();
      future.setDate(today.getDate() + 14);
      future.setHours(23, 59, 59, 999);

      where.date = {
        gte: today,
        lte: future,
      };
    }

    const slots = await prisma.practiceSlot.findMany({
      where,
      include: {
        room: true,
        bookings: {
          select: {
            id: true,
            status: true,
            userId: true,
            bookingNumber: true,
            skillTopic: true,
            user: {
              select: {
                id: true,
                name: true,
                studentId: true,
              },
            },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    const enrichedSlots = slots.map((slot) => {
      const activeBookings = slot.bookings.filter(
        (b) => b.status === 'APPROVED' || b.status === 'CHECKED_IN'
      );
      const pendingBookings = slot.bookings.filter((b) => b.status === 'PENDING');
      const bookedCount = activeBookings.length;
      const availableSeats = Math.max(0, slot.maxCapacity - bookedCount);

      return {
        ...slot,
        bookedCount,
        pendingCount: pendingBookings.length,
        availableSeats,
        isFull: availableSeats <= 0,
      };
    });

    return NextResponse.json(enrichedSlots);
  } catch (error: any) {
    console.error('Error fetching practice slots:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch slots' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomId, date, startTime, endTime, maxCapacity, isOpen, closeReason } = body;

    if (!roomId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลห้อง, วันที่, และเวลาให้ครบถ้วน' }, { status: 400 });
    }

    const slotDate = new Date(date);
    slotDate.setHours(0, 0, 0, 0);

    const slot = await prisma.practiceSlot.create({
      data: {
        roomId,
        date: slotDate,
        startTime,
        endTime,
        maxCapacity: Number(maxCapacity) || 6,
        isOpen: isOpen !== undefined ? isOpen : true,
        closeReason: closeReason || null,
      },
      include: {
        room: true,
      },
    });

    return NextResponse.json(slot);
  } catch (error: any) {
    console.error('Error creating practice slot:', error);
    return NextResponse.json({ error: error.message || 'Failed to create slot' }, { status: 500 });
  }
}
