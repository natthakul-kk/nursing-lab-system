import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const location: any = await prisma.storageLocation.findFirst({
      where: {
        OR: [
          { id },
          { code: id.toUpperCase() },
          { qrCodeToken: id },
        ],
      },
      include: {
        room: true,
        items: {
          include: {
            category: true,
            stockLots: {
              where: { quantityRemaining: { gt: 0 } },
              orderBy: { expiryDate: 'asc' },
            },
            _count: {
              select: { assets: true },
            },
          },
          orderBy: { name: 'asc' },
        },
        assets: {
          include: {
            item: {
              include: {
                category: true,
              },
            },
            maintenanceLogs: {
              take: 3,
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { assetCode: 'asc' },
        },
      },
    });

    if (!location) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลตู้หรือจุดจัดเก็บ' }, { status: 404 });
    }

    const formattedItems = location.items.map((item: any) => {
      const totalQty =
        item.type === 'CONSUMABLE'
          ? item.stockLots.reduce((acc: number, l: any) => acc + l.quantityRemaining, 0)
          : item._count?.assets || 0;
      return {
        ...item,
        totalQuantity: totalQty,
        minQuantity: item.minStockAlert,
      };
    });

    return NextResponse.json({
      ...location,
      items: formattedItems,
    });
  } catch (error: any) {
    console.error('Error fetching storage location details:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch storage location' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { code, name, type, roomId, roomName, floor, building, description, status } = body;

    const existing = await prisma.storageLocation.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลตู้หรือจุดจัดเก็บที่ต้องการแก้ไข' }, { status: 404 });
    }

    if (code && code.trim().toUpperCase() !== existing.code) {
      const codeTaken = await prisma.storageLocation.findUnique({
        where: { code: code.trim().toUpperCase() },
      });
      if (codeTaken) {
        return NextResponse.json({ error: `รหัส ${code} ถูกใช้งานแล้วโดยจุดจัดเก็บอื่น` }, { status: 400 });
      }
    }

    let finalRoomName = roomName ?? existing.roomName;
    let finalFloor = floor ?? existing.floor;
    let finalBuilding = building ?? existing.building;

    if (roomId && roomId !== existing.roomId) {
      const room = await prisma.practiceRoom.findUnique({ where: { id: roomId } });
      if (room) {
        finalRoomName = room.name;
        if (room.location && room.location.includes('ชั้น')) {
          const match = room.location.match(/ชั้น\s*\d+/);
          if (match) finalFloor = match[0];
        }
      }
    }

    const updated = await prisma.storageLocation.update({
      where: { id },
      data: {
        code: code ? code.trim().toUpperCase() : existing.code,
        name: name ? name.trim() : existing.name,
        type: type ?? existing.type,
        roomId: roomId !== undefined ? roomId : existing.roomId,
        roomName: finalRoomName,
        floor: finalFloor,
        building: finalBuilding,
        description: description !== undefined ? description?.trim() || null : existing.description,
        status: status ?? existing.status,
      },
      include: {
        room: true,
        _count: {
          select: { items: true, assets: true },
        },
      },
    });

    const legacyLocationStr = `${updated.name} (${updated.roomName || updated.code})`;
    await prisma.item.updateMany({
      where: { storageLocationId: id },
      data: { location: legacyLocationStr },
    });
    await prisma.equipmentAsset.updateMany({
      where: { storageLocationId: id },
      data: { location: legacyLocationStr },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating storage location:', error);
    return NextResponse.json({ error: error.message || 'Failed to update storage location' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await prisma.storageLocation.findUnique({
      where: { id },
      include: {
        _count: {
          select: { items: true, assets: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบจุดจัดเก็บ' }, { status: 404 });
    }

    await prisma.item.updateMany({
      where: { storageLocationId: id },
      data: { storageLocationId: null },
    });

    await prisma.equipmentAsset.updateMany({
      where: { storageLocationId: id },
      data: { storageLocationId: null },
    });

    await prisma.storageLocation.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `ลบจุดจัดเก็บ ${existing.name} (${existing.code}) เรียบร้อยแล้ว (ปลดพัสดุ ${existing._count.items} รายการ และครุภัณฑ์ ${existing._count.assets} ชิ้นเป็นสถานะไม่ระบุตู้)`,
    });
  } catch (error: any) {
    console.error('Error deleting storage location:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete storage location' }, { status: 500 });
  }
}
