import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth-security';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const dataToUpdate: any = {};
    if (body.name !== undefined) dataToUpdate.name = body.name;
    if (body.email !== undefined) dataToUpdate.email = body.email;
    if (body.phone !== undefined) dataToUpdate.phone = body.phone;
    if (body.department !== undefined) dataToUpdate.department = body.department;
    if (body.studentId !== undefined) {
      const trimmedId = body.studentId ? String(body.studentId).trim() : null;
      if (trimmedId) {
        const duplicate = await prisma.user.findFirst({
          where: {
            studentId: { equals: trimmedId, mode: 'insensitive' },
            id: { not: id },
          },
        });
        if (duplicate) {
          return NextResponse.json(
            { error: `รหัสประจำตัว (ID) "${trimmedId}" นี้มีผู้ใช้งานอื่นใช้อยู่แล้ว` },
            { status: 400 }
          );
        }
      }
      dataToUpdate.studentId = trimmedId;
    }
    if (body.role !== undefined) dataToUpdate.role = body.role;
    if (body.password) {
      dataToUpdate.password = await hashPassword(body.password);
    }
    if (body.status !== undefined) dataToUpdate.status = body.status;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}
