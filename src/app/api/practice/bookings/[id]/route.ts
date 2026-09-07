import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // id could be either the booking id, bookingNumber, or qrCodeToken
    const booking = await prisma.practiceBooking.findFirst({
      where: {
        OR: [
          { id },
          { bookingNumber: id },
          { qrCodeToken: id },
        ],
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
        approver: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลคำขอเข้าฝึกปฏิบัติ' }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error: any) {
    console.error('Error fetching practice booking:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch booking' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, userId, reason, notes } = body;

    // Resolve booking by id, bookingNumber, or qrCodeToken
    const booking = await prisma.practiceBooking.findFirst({
      where: {
        OR: [
          { id },
          { bookingNumber: id },
          { qrCodeToken: id },
        ],
      },
      include: {
        slot: {
          include: { room: true },
        },
        user: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลคำขอเข้าฝึกปฏิบัติ' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      const updated = await prisma.practiceBooking.update({
        where: { id: booking.id },
        data: {
          status: 'APPROVED',
          approverId: userId || null,
          approvedAt: new Date(),
        },
        include: {
          user: true,
          slot: { include: { room: true } },
          approver: true,
        },
      });
      return NextResponse.json(updated);
    }

    if (action === 'REJECT') {
      const updated = await prisma.practiceBooking.update({
        where: { id: booking.id },
        data: {
          status: 'REJECTED',
          approverId: userId || null,
          rejectionReason: reason || 'ไม่อนุมัติ',
        },
        include: {
          user: true,
          slot: { include: { room: true } },
          approver: true,
        },
      });
      return NextResponse.json(updated);
    }

    if (action === 'CHECK_IN') {
      if (booking.status === 'COMPLETED') {
        return NextResponse.json(
          { error: 'คำขอนี้ได้เสร็จสิ้นการฝึกปฏิบัติไปแล้ว ไม่สามารถเช็คอินซ้ำได้' },
          { status: 400 }
        );
      }
      if (booking.status === 'CHECKED_IN') {
        return NextResponse.json(
          { error: 'นิสิตได้ทำการเช็คอินเข้าห้องแล็บไปแล้ว', booking },
          { status: 200 }
        );
      }
      if (booking.status === 'REJECTED' || booking.status === 'CANCELLED') {
        return NextResponse.json(
          { error: `ไม่สามารถเช็คอินได้เนื่องจากสถานะคำขอคือ ${booking.status}` },
          { status: 400 }
        );
      }

      const checkInTime = new Date();
      const updated = await prisma.practiceBooking.update({
        where: { id: booking.id },
        data: {
          status: 'CHECKED_IN',
          checkInTime,
        },
        include: {
          user: true,
          slot: { include: { room: true } },
          approver: true,
        },
      });
      return NextResponse.json({ message: 'เช็คอินเข้าห้องปฏิบัติการสำเร็จ', booking: updated });
    }

    if (action === 'CHECK_OUT') {
      if (booking.status !== 'CHECKED_IN' && !booking.checkInTime) {
        return NextResponse.json(
          { error: 'ยังไม่มีประวัติการเช็คอินเข้าห้องแล็บ ไม่สามารถเช็คเอาท์ได้' },
          { status: 400 }
        );
      }

      const checkOutTime = new Date();
      const checkInTime = booking.checkInTime || new Date();
      const actualMinutes = Math.max(1, Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000));

      const updated = await prisma.practiceBooking.update({
        where: { id: booking.id },
        data: {
          status: 'COMPLETED',
          checkOutTime,
          actualMinutes,
          notes: notes || booking.notes,
        },
        include: {
          user: true,
          slot: { include: { room: true } },
          approver: true,
        },
      });
      return NextResponse.json({ message: 'เช็คเอาท์เสร็จสิ้น บันทึกเวลาการฝึกเรียบร้อย', booking: updated });
    }

    if (action === 'CANCEL') {
      const updated = await prisma.practiceBooking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
        },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating practice booking:', error);
    return NextResponse.json({ error: error.message || 'Update failed' }, { status: 500 });
  }
}
