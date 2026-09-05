import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT: Update an individual asset
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      assetCode,
      govAssetCode,
      sequenceNumber,
      serialNumber,
      location,
      cost,
      receivedDate,
      imageUrl,
      note,
      status,
      condition,
    } = body;

    const existing = await prisma.equipmentAsset.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลอุปกรณ์ชิ้นนี้' }, { status: 404 });
    }

    // Check duplicate assetCode if changed
    if (assetCode && assetCode !== existing.assetCode) {
      const duplicate = await prisma.equipmentAsset.findUnique({
        where: { assetCode },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `รหัสแล็บ ${assetCode} ถูกใช้งานไปแล้ว กรุณาใช้รหัสอื่น` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.equipmentAsset.update({
      where: { id },
      data: {
        assetCode: assetCode !== undefined ? assetCode : undefined,
        govAssetCode: govAssetCode !== undefined ? govAssetCode || null : undefined,
        sequenceNumber: sequenceNumber !== undefined ? Number(sequenceNumber) : undefined,
        serialNumber: serialNumber !== undefined ? serialNumber || null : undefined,
        location: location !== undefined ? location || null : undefined,
        cost: cost !== undefined ? Number(cost) : undefined,
        receivedDate: receivedDate ? new Date(receivedDate) : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl || null : undefined,
        note: note !== undefined ? note || null : undefined,
        status: status !== undefined ? status : undefined,
        condition: condition !== undefined ? condition : undefined,
      },
      include: {
        item: true,
      },
    });

    return NextResponse.json({ success: true, asset: updated });
  } catch (error: any) {
    console.error('Update asset error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลอุปกรณ์' },
      { status: 500 }
    );
  }
}

// DELETE: Delete an individual asset
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const asset = await prisma.equipmentAsset.findUnique({
      where: { id },
      include: {
        borrowItems: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลอุปกรณ์ที่ต้องการลบ' }, { status: 404 });
    }

    if (asset.status === 'BORROWED') {
      return NextResponse.json(
        { error: 'ไม่สามารถลบอุปกรณ์ชิ้นนี้ได้ เนื่องจากกำลังถูกยืมใช้งานอยู่' },
        { status: 400 }
      );
    }

    if (asset.borrowItems && asset.borrowItems.length > 0) {
      return NextResponse.json(
        {
          error:
            'อุปกรณ์ชิ้นนี้มีประวัติการยืม-คืนในระบบแล้ว แนะนำให้เปลี่ยนสถานะเป็นจำหน่ายออก (RETIRED) หรือซ่อมบำรุง แทนการลบเพื่อรักษาความถูกต้องของประวัติการใช้งาน',
        },
        { status: 400 }
      );
    }

    // Delete maintenance logs first if any
    await prisma.maintenanceLog.deleteMany({
      where: { assetId: id },
    });

    // Delete the asset
    await prisma.equipmentAsset.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'ลบข้อมูลอุปกรณ์เรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('Delete asset error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการลบอุปกรณ์' },
      { status: 500 }
    );
  }
}
