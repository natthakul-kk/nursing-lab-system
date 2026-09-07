import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { code, name, location, capacity, description, isActive } = body;

    const room = await prisma.practiceRoom.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(location !== undefined && { location: location || null }),
        ...(capacity !== undefined && { capacity: Number(capacity) || 10 }),
        ...(description !== undefined && { description: description || null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    invalidateCache('practice:rooms:');
    return NextResponse.json(room);
  } catch (error: any) {
    console.error('Error updating practice room:', error);
    return NextResponse.json({ error: error.message || 'Failed to update room' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const slotsCount = await prisma.practiceSlot.count({
      where: { roomId: id },
    });

    if (slotsCount > 0) {
      await prisma.practiceRoom.update({
        where: { id },
        data: { isActive: false },
      });
      invalidateCache('practice:rooms:');
      return NextResponse.json({ message: 'ปิดการใช้งานห้องปฏิบัติการเรียบร้อยแล้ว เนื่องจากมีรอบเวลาที่เคยเปิดไว้' });
    }

    await prisma.practiceRoom.delete({
      where: { id },
    });

    invalidateCache('practice:rooms:');
    return NextResponse.json({ message: 'ลบห้องปฏิบัติการเรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('Error deleting practice room:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete room' }, { status: 500 });
  }
}
