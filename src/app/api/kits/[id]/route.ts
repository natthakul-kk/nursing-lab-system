import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT: Update an existing Practice Kit
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, category, description, targetCourse, imageUrl, items } = body;

    const existingKit = await prisma.practiceKit.findUnique({
      where: { id },
    });

    if (!existingKit) {
      return NextResponse.json({ error: 'ไม่พบชุดฝึกปฏิบัติการนี้' }, { status: 404 });
    }

    // Delete old items and insert updated items if items provided
    if (items && Array.isArray(items)) {
      await prisma.practiceKitItem.deleteMany({
        where: { kitId: id },
      });

      await prisma.practiceKitItem.createMany({
        data: items.map((it: any) => ({
          kitId: id,
          itemId: it.itemId,
          quantity: Math.max(1, Number(it.quantity) || 1),
        })),
      });
    }

    const updatedKit = await prisma.practiceKit.update({
      where: { id },
      data: {
        name: name ? name.trim() : existingKit.name,
        category: category || existingKit.category,
        description: description !== undefined ? description : existingKit.description,
        targetCourse: targetCourse !== undefined ? targetCourse : existingKit.targetCourse,
        imageUrl: imageUrl !== undefined ? imageUrl : existingKit.imageUrl,
      },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    return NextResponse.json(updatedKit);
  } catch (error: any) {
    console.error('Update Kit Error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการแก้ไขชุดฝึกปฏิบัติการ' },
      { status: 500 }
    );
  }
}

// DELETE: Delete (or deactivate) a Practice Kit
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.practiceKit.delete({
      where: { id },
    });
    return NextResponse.json({ success: true, message: 'ลบชุดฝึกปฏิบัติการเรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('Delete Kit Error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการลบชุดฝึกปฏิบัติการ' },
      { status: 500 }
    );
  }
}