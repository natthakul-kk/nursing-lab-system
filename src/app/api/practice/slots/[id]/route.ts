import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { isOpen, closeReason, maxCapacity } = body;

    const dataToUpdate: any = {};
    if (isOpen !== undefined) {
      dataToUpdate.isOpen = Boolean(isOpen);
      if (dataToUpdate.isOpen) {
        dataToUpdate.closeReason = null; // Clear close reason when reopened
      }
    }
    if (closeReason !== undefined) {
      dataToUpdate.closeReason = closeReason;
    }
    if (maxCapacity !== undefined) {
      dataToUpdate.maxCapacity = Number(maxCapacity);
    }

    const updated = await prisma.practiceSlot.update({
      where: { id },
      data: dataToUpdate,
      include: {
        room: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating practice slot:', error);
    return NextResponse.json({ error: error.message || 'Failed to update slot' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Check if there are active bookings
    const bookingsCount = await prisma.practiceBooking.count({
      where: {
        slotId: id,
        status: { in: ['APPROVED', 'CHECKED_IN', 'PENDING'] },
      },
    });

    if (bookingsCount > 0) {
      return NextResponse.json(
        { error: 'ไม่สามารถลบช่วงเวลานี้ได้ เนื่องจากมีนิสิตจองหรือใช้งานอยู่ แนะนำให้ใช้การปิดรอบแทน' },
        { status: 400 }
      );
    }

    await prisma.practiceSlot.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting practice slot:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete slot' }, { status: 500 });
  }
}
