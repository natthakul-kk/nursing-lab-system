import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const slotId = searchParams.get('slotId');

    const where: any = {};
    if (userId) where.userId = userId;
    if (status && status !== 'ALL') where.status = status;
    if (slotId) where.slotId = slotId;

    const bookings = await prisma.practiceBooking.findMany({
      where,
      include: {
        user: true,
        slot: {
          include: {
            room: true,
          },
        },
        course: true,
        practiceKit: true,
        approver: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(bookings);
  } catch (error: any) {
    console.error('Error fetching practice bookings:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userId,
      slotId,
      skillTopic,
      objectives,
      advisorName,
      courseId,
      practiceKitId,
    } = body;

    if (!userId || !slotId || !skillTopic) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลนิสิต รอบเวลา และหัตถการที่ต้องการฝึก' },
        { status: 400 }
      );
    }

    // 1. Fetch slot & config
    const [slot, config] = await Promise.all([
      prisma.practiceSlot.findUnique({
        where: { id: slotId },
        include: { room: true },
      }),
      prisma.practiceConfig.findUnique({
        where: { id: 'default' },
      }),
    ]);

    if (!slot) {
      return NextResponse.json({ error: 'ไม่พบรอบเวลาที่เลือก' }, { status: 404 });
    }

    if (!slot.isOpen) {
      return NextResponse.json(
        { error: `รอบเวลานี้ปิดการให้บริการ (${slot.closeReason || 'กรุณาเลือกรอบเวลาอื่น'})` },
        { status: 400 }
      );
    }

    // 2. Validate advance booking window
    const now = new Date();
    const slotDate = new Date(slot.date);
    const [startH, startM] = slot.startTime.split(':').map(Number);
    const slotStartDateTime = new Date(slotDate);
    slotStartDateTime.setHours(startH || 0, startM || 0, 0, 0);

    const maxAdvanceDays = config?.maxAdvanceDays || 7;
    const maxFutureDate = new Date();
    maxFutureDate.setDate(now.getDate() + maxAdvanceDays);
    maxFutureDate.setHours(23, 59, 59, 999);

    if (slotStartDateTime > maxFutureDate) {
      return NextResponse.json(
        { error: `ระบบเปิดให้จองล่วงหน้าได้ไม่เกิน ${maxAdvanceDays} วัน` },
        { status: 400 }
      );
    }

    if (slotStartDateTime < now) {
      return NextResponse.json(
        { error: 'ไม่สามารถจองรอบเวลาที่ผ่านมาแล้วได้' },
        { status: 400 }
      );
    }

    // 3. Check capacity in this slot
    const activeCount = await prisma.practiceBooking.count({
      where: {
        slotId,
        status: { in: ['PENDING', 'APPROVED', 'CHECKED_IN'] },
      },
    });

    if (activeCount >= slot.maxCapacity) {
      return NextResponse.json(
        { error: `รอบเวลานี้เต็มแล้ว (ความจุสูงสุด ${slot.maxCapacity} ท่าน)` },
        { status: 400 }
      );
    }

    // 4. Check duplicate booking by the same student in this slot
    const existing = await prisma.practiceBooking.findFirst({
      where: {
        userId,
        slotId,
        status: { in: ['PENDING', 'APPROVED', 'CHECKED_IN'] },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'ท่านได้ยื่นคำขอในรอบเวลานี้ไปแล้ว' },
        { status: 400 }
      );
    }

    // 5. Generate booking number: SPB-YYYYMMDD-XXX
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = await prisma.practiceBooking.count();
    const bookingNumber = `SPB-${todayStr}-${String(countToday + 1).padStart(3, '0')}`;

    // 6. Generate secure QR token
    const qrCodeToken = `SPK-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    // 7. Resolve advisorName: from course if provided, otherwise from user selection
    let finalAdvisorName = advisorName || null;
    if (courseId && !finalAdvisorName) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorName: true },
      });
      if (course?.instructorName) {
        finalAdvisorName = course.instructorName;
      }
    }

    const booking = await prisma.practiceBooking.create({
      data: {
        bookingNumber,
        userId,
        slotId,
        skillTopic,
        objectives: objectives || null,
        advisorName: finalAdvisorName,
        courseId: courseId || null,
        practiceKitId: practiceKitId || null,
        status: 'PENDING',
        qrCodeToken,
      },
      include: {
        user: true,
        slot: {
          include: {
            room: true,
          },
        },
        course: true,
        practiceKit: true,
      },
    });

    return NextResponse.json(booking);
  } catch (error: any) {
    console.error('Error creating practice booking:', error);
    return NextResponse.json({ error: error.message || 'Failed to create booking' }, { status: 500 });
  }
}
