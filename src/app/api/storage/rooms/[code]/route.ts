import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const cleanCode = decodeURIComponent(code).trim();

    const room: any = await prisma.practiceRoom.findFirst({
      where: {
        OR: [
          { code: { equals: cleanCode, mode: 'insensitive' } },
          { qrCodeToken: cleanCode },
          { id: cleanCode },
        ],
      },
      include: {
        storageLocations: {
          where: { status: 'ACTIVE' },
          include: {
            _count: {
              select: { items: true, assets: true },
            },
            items: {
              include: {
                category: { select: { id: true, name: true } },
                stockLots: {
                  where: { quantityRemaining: { gt: 0 } },
                  orderBy: { expiryDate: 'asc' },
                  select: { lotNumber: true, quantityRemaining: true, expiryDate: true },
                },
                _count: {
                  select: { assets: true },
                },
              },
            },
            assets: {
              include: {
                item: {
                  select: { id: true, name: true, category: { select: { name: true } } },
                },
              },
            },
          },
          orderBy: { code: 'asc' },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลห้องปฏิบัติการ' }, { status: 404 });
    }

    // Flatten all items across all cabinets in this room for fast cross-cabinet searching
    const allItems: any[] = [];
    const allAssets: any[] = [];

    room.storageLocations.forEach((cabinet: any) => {
      cabinet.items.forEach((item: any) => {
        const totalQty =
          item.type === 'CONSUMABLE'
            ? item.stockLots.reduce((acc: number, l: any) => acc + l.quantityRemaining, 0)
            : item._count?.assets || 0;

        let stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
        if (totalQty <= 0) {
          stockStatus = 'OUT_OF_STOCK';
        } else if (totalQty <= (item.minStockAlert || 5)) {
          stockStatus = 'LOW_STOCK';
        }

        allItems.push({
          id: item.id,
          code: item.code,
          name: item.name,
          type: item.type,
          unit: item.unit,
          totalQuantity: totalQty,
          minQuantity: item.minStockAlert || 5,
          stockStatus,
          imageUrl: item.imageUrl,
          categoryName: item.category?.name || 'ทั่วไป',
          cabinetId: cabinet.id,
          cabinetCode: cabinet.code,
          cabinetName: cabinet.name,
          cabinetType: cabinet.type,
          floor: cabinet.floor,
          lots: item.stockLots.map((lot: any) => ({
            lotNumber: lot.lotNumber,
            remainingQuantity: lot.quantityRemaining,
            expiryDate: lot.expiryDate ? lot.expiryDate.toISOString().split('T')[0] : null,
          })),
        });
      });

      cabinet.assets.forEach((asset: any) => {
        allAssets.push({
          id: asset.id,
          assetCode: asset.assetCode,
          serialNumber: asset.serialNumber,
          status: asset.status,
          condition: asset.condition,
          itemId: asset.itemId,
          itemName: asset.item?.name || 'ครุภัณฑ์',
          categoryName: asset.item?.category?.name || 'ทั่วไป',
          cabinetId: cabinet.id,
          cabinetCode: cabinet.code,
          cabinetName: cabinet.name,
          cabinetType: cabinet.type,
        });
      });
    });

    const storageSummary = room.storageLocations.map((loc: any) => ({
      id: loc.id,
      code: loc.code,
      name: loc.name,
      type: loc.type,
      description: loc.description,
      floor: loc.floor,
      building: loc.building,
      qrCodeToken: loc.qrCodeToken,
      itemCount: loc._count.items,
      assetCount: loc._count.assets,
    }));

    return NextResponse.json({
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        location: room.location,
        capacity: room.capacity,
        description: room.description,
        isActive: room.isActive,
        qrCodeToken: room.qrCodeToken,
      },
      cabinets: storageSummary,
      allItems,
      allAssets,
      stats: {
        totalCabinets: storageSummary.length,
        totalItems: allItems.length,
        totalAssets: allAssets.length,
        inStockCount: allItems.filter((i: any) => i.stockStatus === 'IN_STOCK').length,
        lowStockCount: allItems.filter((i: any) => i.stockStatus === 'LOW_STOCK').length,
        outOfStockCount: allItems.filter((i: any) => i.stockStatus === 'OUT_OF_STOCK').length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching room storage data:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch room storage data' }, { status: 500 });
  }
}
