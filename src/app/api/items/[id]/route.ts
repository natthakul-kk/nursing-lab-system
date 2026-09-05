import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT: Update an item (name, code, category, etc.)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      name,
      code,
      categoryId,
      unit,
      usageUnit,
      conversionRatio,
      minStockAlert,
      location,
      description,
      imageUrl,
    } = body;

    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบรายการพัสดุนี้' }, { status: 404 });
    }

    if (code && code !== existing.code) {
      const duplicate = await prisma.item.findUnique({ where: { code } });
      if (duplicate) {
        return NextResponse.json(
          { error: `รหัสพัสดุ ${code} มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.item.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        code: code !== undefined ? code : undefined,
        categoryId: categoryId !== undefined ? categoryId : undefined,
        unit: unit !== undefined ? unit : undefined,
        usageUnit: usageUnit !== undefined ? (usageUnit ? String(usageUnit).trim() : null) : undefined,
        conversionRatio: conversionRatio !== undefined ? (conversionRatio ? Number(conversionRatio) : null) : undefined,
        minStockAlert: minStockAlert !== undefined ? Number(minStockAlert) : undefined,
        location: location !== undefined ? location || null : undefined,
        description: description !== undefined ? description || null : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl || null : undefined,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    console.error('Update item error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการแก้ไขรายการพัสดุ' },
      { status: 500 }
    );
  }
}

// DELETE: Delete an item
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        assets: true,
        stockLots: true,
        borrowItems: true,
        requisitionItems: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'ไม่พบรายการพัสดุที่ต้องการลบ' }, { status: 404 });
    }

    if (item.assets.length > 0 || item.stockLots.length > 0) {
      return NextResponse.json(
        {
          error: `ไม่สามารถลบรายการนี้ได้ เนื่องจากมีชิ้นครุภัณฑ์หรือล็อตสต็อกผูกอยู่ (${item.assets.length} ชิ้น / ${item.stockLots.length} ล็อต) กรุณาลบชิ้นอุปกรณ์ในรายการออกก่อน`,
        },
        { status: 400 }
      );
    }

    if (item.borrowItems.length > 0 || item.requisitionItems.length > 0) {
      return NextResponse.json(
        {
          error: 'ไม่สามารถลบรายการนี้ได้ เนื่องจากมีประวัติการเบิก-ยืมในระบบแล้ว',
        },
        { status: 400 }
      );
    }

    await prisma.stockTransaction.deleteMany({ where: { itemId: id } });
    await prisma.item.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'ลบรายการพัสดุเรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('Delete item error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการลบรายการพัสดุ' },
      { status: 500 }
    );
  }
}
