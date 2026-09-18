import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { itemIds = [], assetIds = [], action = 'ASSIGN' } = body;

    const location = await prisma.storageLocation.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!location) {
      return NextResponse.json({ error: 'ไม่พบจุดจัดเก็บ' }, { status: 404 });
    }

    const legacyLocationStr = `${location.name} (${location.roomName || location.room?.name || location.code})`;

    if (action === 'ASSIGN') {
      if (itemIds.length > 0) {
        await prisma.item.updateMany({
          where: { id: { in: itemIds } },
          data: {
            storageLocationId: id,
            location: legacyLocationStr,
          },
        });
      }

      if (assetIds.length > 0) {
        await prisma.equipmentAsset.updateMany({
          where: { id: { in: assetIds } },
          data: {
            storageLocationId: id,
            location: legacyLocationStr,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `จัดเก็บพัสดุ ${itemIds.length} รายการ และครุภัณฑ์ ${assetIds.length} ชิ้น เข้าสู่ ${location.name} เรียบร้อยแล้ว`,
      });
    } else if (action === 'UNASSIGN') {
      if (itemIds.length > 0) {
        await prisma.item.updateMany({
          where: {
            id: { in: itemIds },
            storageLocationId: id,
          },
          data: {
            storageLocationId: null,
          },
        });
      }

      if (assetIds.length > 0) {
        await prisma.equipmentAsset.updateMany({
          where: {
            id: { in: assetIds },
            storageLocationId: id,
          },
          data: {
            storageLocationId: null,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `นำพัสดุ/ครุภัณฑ์ออกจาก ${location.name} เรียบร้อยแล้ว`,
      });
    }

    return NextResponse.json({ error: 'การกระทำไม่ถูกต้อง (Action must be ASSIGN or UNASSIGN)' }, { status: 400 });
  } catch (error: any) {
    console.error('Error assigning items to storage location:', error);
    return NextResponse.json({ error: error.message || 'Failed to update storage assignments' }, { status: 500 });
  }
}
