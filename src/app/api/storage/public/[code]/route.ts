import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const cleanCode = decodeURIComponent(code).trim();

    const location: any = await prisma.storageLocation.findFirst({
      where: {
        OR: [
          { code: { equals: cleanCode, mode: 'insensitive' } },
          { qrCodeToken: cleanCode },
          { id: cleanCode },
        ],
      },
      include: {
        room: {
          select: {
            id: true,
            code: true,
            name: true,
            location: true,
            qrCodeToken: true,
          },
        },
        items: {
          include: {
            category: {
              select: { id: true, name: true, code: true },
            },
            stockLots: {
              where: { quantityRemaining: { gt: 0 } },
              orderBy: { expiryDate: 'asc' },
              select: {
                id: true,
                lotNumber: true,
                quantityRemaining: true,
                expiryDate: true,
              },
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
              select: {
                id: true,
                code: true,
                name: true,
                category: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { assetCode: 'asc' },
        },
      },
    });

    if (!location) {
      return NextResponse.json({ error: 'ไม่พบตู้หรือจุดจัดเก็บที่ระบุ' }, { status: 404 });
    }

    // Format items with stock status
    const formattedItems = location.items.map((item: any) => {
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

      return {
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
        lots: item.stockLots.map((lot: any) => ({
          lotNumber: lot.lotNumber,
          remainingQuantity: lot.quantityRemaining,
          expiryDate: lot.expiryDate ? lot.expiryDate.toISOString().split('T')[0] : null,
        })),
      };
    });

    // Format assets
    const formattedAssets = location.assets.map((asset: any) => ({
      id: asset.id,
      assetCode: asset.assetCode,
      serialNumber: asset.serialNumber,
      status: asset.status,
      condition: asset.condition,
      itemId: asset.itemId,
      itemName: asset.item?.name || 'ครุภัณฑ์',
      categoryName: asset.item?.category?.name || 'ทั่วไป',
    }));

    const stats = {
      totalItems: formattedItems.length,
      inStockCount: formattedItems.filter((i: any) => i.stockStatus === 'IN_STOCK').length,
      lowStockCount: formattedItems.filter((i: any) => i.stockStatus === 'LOW_STOCK').length,
      outOfStockCount: formattedItems.filter((i: any) => i.stockStatus === 'OUT_OF_STOCK').length,
      totalAssets: formattedAssets.length,
      availableAssets: formattedAssets.filter((a: any) => a.status === 'AVAILABLE').length,
    };

    return NextResponse.json({
      storage: {
        id: location.id,
        code: location.code,
        name: location.name,
        type: location.type,
        floor: location.floor,
        building: location.building,
        description: location.description,
        status: location.status,
        qrCodeToken: location.qrCodeToken,
      },
      room: location.room,
      items: formattedItems,
      assets: formattedAssets,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching public storage data:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch cabinet data' }, { status: 500 });
  }
}
