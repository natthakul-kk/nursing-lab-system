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

      // Check early check-in window constraint
      const config = await prisma.practiceConfig.findUnique({ where: { id: 'default' } });
      const checkInEarlyMinutes = config?.checkInEarlyMinutes ?? 30;

      if (booking.slot?.date && booking.slot?.startTime) {
        const slotDate = new Date(booking.slot.date);
        const [hours, minutes] = booking.slot.startTime.split(':').map(Number);
        const slotStartDateTime = new Date(slotDate);
        slotStartDateTime.setHours(hours, minutes, 0, 0);

        const now = new Date();
        const earliestCheckIn = new Date(slotStartDateTime.getTime() - checkInEarlyMinutes * 60 * 1000);

        if (now < earliestCheckIn) {
          const diffMinutes = Math.ceil((earliestCheckIn.getTime() - now.getTime()) / 60000);
          return NextResponse.json(
            {
              error: `ยังไม่ถึงช่วงเวลาที่อนุญาตให้เช็คอิน (อนุญาตให้เช็คอินได้ล่วงหน้าไม่เกิน ${checkInEarlyMinutes} นาที ก่อนเริ่มเวลา ${booking.slot.startTime} น. - กรุณารออีกประมาณ ${diffMinutes} นาที)`,
            },
            { status: 400 }
          );
        }
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

      // Optional check on early checkout if needed (or warning, but allow completion if student finishes practice)
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
