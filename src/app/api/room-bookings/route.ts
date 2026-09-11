import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const date = searchParams.get('date');
    const roomId = searchParams.get('roomId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    const where: any = {};

    if (roomId && roomId !== 'ALL') {
      where.roomId = roomId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(targetDate);
      nextDate.setDate(targetDate.getDate() + 1);

      where.bookingDate = {
        gte: targetDate,
        lt: nextDate,
      };
    } else if (year && month) {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10) - 1; // 0-based
      const startOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

      where.bookingDate = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    const bookings = await prisma.roomBooking.findMany({
      where,
      include: {
        room: true,
        user: {
          select: {
            id: true,
            name: true,
            prefix: true,
            email: true,
            studentId: true,
            phone: true,
            role: true,
            department: true,
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            prefix: true,
            role: true,
          },
        },
      },
      orderBy: [{ bookingDate: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json(bookings);
  } catch (error: any) {
    console.error('Error fetching room bookings:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch room bookings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      roomId,
      bookingDate,
      startTime,
      endTime,
      title,
      purpose,
      attendeesCount,
      courseId,
      advisorName,
      contactPhone,
      equipmentNeeded,
      note,
      userId,
    } = body;

    if (!roomId || !bookingDate || !startTime || !endTime || !title || !purpose || !userId || !attendeesCount || Number(attendeesCount) <= 0) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ห้อง, วันที่, เวลา, ชื่องาน, วัตถุประสงค์, จำนวนผู้เข้าใช้งาน, ผู้จอง)' },
        { status: 400 }
      );
    }

    // 1. Check if room exists and is active
    const room = await prisma.practiceRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return NextResponse.json({ error: 'ไม่พบห้องปฏิบัติการที่เลือก' }, { status: 404 });
    }

    if (!room.isActive) {
      return NextResponse.json(
        { error: `ห้อง "${room.name}" ปิดให้บริการชั่วคราว ${room.closeReason ? `(${room.closeReason})` : ''} ไม่สามารถจองได้` },
        { status: 400 }
      );
    }

    // 2. Validate time format and ordering
    if (startTime >= endTime) {
      return NextResponse.json(
        { error: 'เวลาเริ่มต้นต้องมาก่อนเวลาสิ้นสุดการใช้งาน' },
        { status: 400 }
      );
    }

    const bDate = new Date(bookingDate);
    bDate.setHours(0, 0, 0, 0);

    // 3. Conflict Detection: Check overlapping APPROVED bookings for the same room on the same date
    const nextDay = new Date(bDate);
    nextDay.setDate(bDate.getDate() + 1);

    const conflictingBookings = await prisma.roomBooking.findMany({
      where: {
        roomId,
        bookingDate: {
          gte: bDate,
          lt: nextDay,
        },
        status: 'APPROVED',
      },
    });

    // An overlap occurs if (startA < endB && endA > startB)
    const conflict = conflictingBookings.find((existing) => {
      return startTime < existing.endTime && endTime > existing.startTime;
    });

    if (conflict) {
      return NextResponse.json(
        {
          error: `ห้อง "${room.name}" ได้รับการอนุมัติให้ใช้งานแล้วในช่วงเวลา ${conflict.startTime} - ${conflict.endTime} น. ("${conflict.title}") กรุณาเลือกช่วงเวลาอื่น`,
        },
        { status: 409 }
      );
    }

    // 4. Generate unique Booking Number e.g. "ROOM-25690911-001"
    const now = new Date();
    const thaiYear = now.getFullYear() + 543;
    const datePart = `${thaiYear}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    const todayCount = await prisma.roomBooking.count({
      where: {
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
        },
      },
    });

    const bookingNumber = `ROOM-${datePart}-${String(todayCount + 1).padStart(3, '0')}`;

    // 5. Create Room Booking Record
    const booking = await prisma.roomBooking.create({
      data: {
        bookingNumber,
        roomId,
        userId,
        title,
        purpose,
        bookingDate: bDate,
        startTime,
        endTime,
        attendeesCount: Number(attendeesCount) || 1,
        courseId: courseId || null,
        advisorName: advisorName || null,
        contactPhone: contactPhone || null,
        equipmentNeeded: equipmentNeeded || null,
        note: note || null,
        status: 'PENDING',
      },
      include: {
        room: true,
        user: {
          select: {
            id: true,
            name: true,
            prefix: true,
            studentId: true,
            email: true,
          },
        },
      },
    });

    invalidateCache('room:bookings:');
    return NextResponse.json(booking, { status: 201 });
  } catch (error: any) {
    console.error('Error creating room booking:', error);
    return NextResponse.json({ error: error.message || 'Failed to create room booking' }, { status: 500 });
  }
}
