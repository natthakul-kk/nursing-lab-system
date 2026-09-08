import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, code, type, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อหมวดหมู่' }, { status: 400 });
    }

    const categoryType = type === 'EQUIPMENT' ? 'EQUIPMENT' : 'CONSUMABLE';
    const categoryCode = code ? code.trim().toUpperCase() : null;

    // Check duplicate name with other category
    const existingName = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        NOT: { id },
      },
    });

    if (existingName) {
      return NextResponse.json({ error: 'ชื่อหมวดหมู่นี้มีอยู่ในระบบแล้ว' }, { status: 400 });
    }

    // Check duplicate code with other category
    if (categoryCode) {
      const existingCode = await prisma.category.findFirst({
        where: {
          code: categoryCode,
          NOT: { id },
        },
      });
      if (existingCode) {
        return NextResponse.json({ error: `รหัสหมวดหมู่ "${categoryCode}" มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น` }, { status: 400 });
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name.trim(),
        code: categoryCode,
        type: categoryType,
        description: description?.trim() || null,
      },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error: any) {
    console.error('Update category error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if category has items
    const itemCount = await prisma.item.count({
      where: { categoryId: id },
    });

    if (itemCount > 0) {
      return NextResponse.json(
        { error: `ไม่สามารถลบหมวดหมู่นี้ได้ เนื่องจากมีพัสดุในหมวดหมู่นี้อยู่ ${itemCount} รายการ` },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'ลบหมวดหมู่สำเร็จ' });
  } catch (error: any) {
    console.error('Delete category error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete category' }, { status: 500 });
  }
}
