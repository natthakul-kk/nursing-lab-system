import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await prisma.roomBooking.findUnique({
      where: { id },
      include: {
        room: true,
        user: true,
        course: true,
        approver: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลการจองห้อง' }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error: any) {
    console.error('Error fetching room booking:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch room booking' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, userId, reason, title, purpose, attendeesCount, equipmentNeeded, note } = body;

    const existing = await prisma.roomBooking.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบรายการคำขอจองห้อง' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      // Re-check conflict to prevent double booking
      const conflicting = await prisma.roomBooking.findFirst({
        where: {
          id: { not: id },
          roomId: existing.roomId,
          bookingDate: existing.bookingDate,
          status: 'APPROVED',
          startTime: { lt: existing.endTime },
          endTime: { gt: existing.startTime },
        },
      });

      if (conflicting) {
        return NextResponse.json(
          {
            error: `ไม่สามารถอนุมัติได้ เนื่องจากห้องนี้ถูกอนุมัติให้รายการอื่นแล้ว (${conflicting.startTime} - ${conflicting.endTime} น.: ${conflicting.title})`,
          },
          { status: 409 }
        );
      }

      const updated = await prisma.roomBooking.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approverId: userId || null,
          approvedAt: new Date(),
          rejectionReason: null,
        },
        include: {
          room: true,
          user: true,
          approver: true,
        },
      });

      invalidateCache('room:bookings:');
      return NextResponse.json(updated);
    }

    if (action === 'REJECT') {
      const updated = await prisma.roomBooking.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approverId: userId || null,
          rejectionReason: reason || 'ไม่อนุมัติคำขอ',
        },
        include: {
          room: true,
          user: true,
          approver: true,
        },
      });

      invalidateCache('room:bookings:');
      return NextResponse.json(updated);
    }

    if (action === 'CANCEL') {
      const updated = await prisma.roomBooking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
        include: {
          room: true,
          user: true,
        },
      });

      invalidateCache('room:bookings:');
      return NextResponse.json(updated);
    }

    // Default update fields
    const updated = await prisma.roomBooking.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(purpose && { purpose }),
        ...(attendeesCount !== undefined && { attendeesCount: Number(attendeesCount) || 1 }),
        ...(equipmentNeeded !== undefined && { equipmentNeeded }),
        ...(note !== undefined && { note }),
      },
    });

    invalidateCache('room:bookings:');
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating room booking:', error);
    return NextResponse.json({ error: error.message || 'Failed to update room booking' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.roomBooking.delete({
      where: { id },
    });

    invalidateCache('room:bookings:');
    return NextResponse.json({ message: 'ลบรายการจองห้องเรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('Error deleting room booking:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete room booking' }, { status: 500 });
  }
}
