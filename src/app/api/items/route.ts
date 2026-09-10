import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // EQUIPMENT, CONSUMABLE, or all
    const compact = searchParams.get('compact') === 'true';

    const cacheKey = `items:list:${type || 'ALL'}:${compact ? 'COMPACT' : 'FULL'}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const whereCondition: any = {};
    if (type && (type === 'EQUIPMENT' || type === 'CONSUMABLE')) {
      whereCondition.type = type;
    }

    // Fetch active reservations concurrently to calculate real available stock
    const [pendingReqItems, pendingBorrowItems] = await Promise.all([
      prisma.requisitionItem.groupBy({
        by: ['itemId'],
        where: {
          requisitionRequest: {
            status: { in: ['PENDING', 'APPROVED'] },
          },
        },
        _sum: { quantityRequested: true },
      }),
      prisma.borrowItem.groupBy({
        by: ['itemId'],
        where: {
          borrowRequest: {
            status: { in: ['PENDING', 'APPROVED'] },
          },
        },
        _sum: { quantity: true },
      }),
    ]);

    const reservedReqMap = new Map(
      pendingReqItems.map((r) => [r.itemId, r._sum.quantityRequested || 0])
    );
    const reservedBorrowMap = new Map(
      pendingBorrowItems.map((b) => [b.itemId, b._sum.quantity || 0])
    );

    if (compact) {
      // Lean payload optimized for dropdowns and selection lists
      const items = await prisma.item.findMany({
        where: whereCondition,
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          unit: true,
          usageUnit: true,
          conversionRatio: true,
          minStockAlert: true,
          brand: true,
          model: true,
          location: true,
          description: true,
          imageUrl: true,
          status: true,
          categoryId: true,
          category: { select: { id: true, name: true } },
          assets: {
            where: { status: 'AVAILABLE' },
            select: { id: true, assetCode: true, sequenceNumber: true, location: true, brand: true, model: true, supplier: true, warrantyExpiry: true },
            orderBy: { sequenceNumber: 'asc' },
          },
          stockLots: {
            where: { quantityRemaining: { gt: 0 } },
            select: { quantityRemaining: true, openPackRemainder: true },
          },
          targetRepacks: {
            where: {
              packItems: { some: { status: 'AVAILABLE' } },
            },
            select: {
              subLotNumber: true,
              sterileExpiryDate: true,
              packItems: {
                where: { status: 'AVAILABLE' },
                select: { id: true, packNumber: true, packCode: true },
                orderBy: { packNumber: 'asc' },
                take: 5,
              },
            },
            orderBy: { sterileExpiryDate: 'asc' },
            take: 1,
          },
        },
        orderBy: { code: 'asc' },
      });

      const formatted = items.map((item) => {
        const physicalStock =
          item.type === 'EQUIPMENT'
            ? item.assets.length
            : item.stockLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);

        const reservedStock =
          item.type === 'EQUIPMENT'
            ? (reservedBorrowMap.get(item.id) || 0)
            : (reservedReqMap.get(item.id) || 0);

        const availableStock = Math.max(0, physicalStock - reservedStock);

        const openPackRemainder =
          item.type === 'CONSUMABLE'
            ? item.stockLots.reduce((sum, lot) => sum + (lot.openPackRemainder || 0), 0)
            : 0;

        return {
          id: item.id,
          code: item.code,
          name: item.name,
          type: item.type,
          unit: item.unit,
          usageUnit: item.usageUnit,
          conversionRatio: item.conversionRatio,
          minStockAlert: item.minStockAlert,
          location: item.location,
          description: item.description,
          imageUrl: item.imageUrl,
          status: item.status,
          categoryId: item.categoryId,
          category: item.category,
          physicalStock,
          reservedStock,
          availableStock,
          currentStock: availableStock, // Guarantees all selectors and stock checks validate against available stock
          openPackRemainder,
          isLowStock: availableStock <= item.minStockAlert,
          availableAssets: item.type === 'EQUIPMENT' ? item.assets : [],
          nextRecommendedPacks:
            item.type === 'CONSUMABLE' && (item as any).targetRepacks?.[0]?.packItems?.length > 0
              ? {
                  subLotNumber: (item as any).targetRepacks[0].subLotNumber,
                  expiryDate: (item as any).targetRepacks[0].sterileExpiryDate,
                  packs: (item as any).targetRepacks[0].packItems.map((p: any) => ({
                    packNumber: p.packNumber,
                    packCode: p.packCode,
                  })),
                }
              : null,
        };
      });

      setCached(cacheKey, formatted, 30 * 1000); // 30s TTL
      return NextResponse.json(formatted);
    }

    // Full query for detailed inventory view
    const items = await prisma.item.findMany({
      where: whereCondition,
      include: {
        category: true,
        assets: {
          include: {
            maintenanceLogs: {
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { sequenceNumber: 'asc' },
        },
        stockLots: {
          where: { quantityRemaining: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
          include: {
            boxes: {
              orderBy: { boxNumberInLot: 'asc' },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    const formatted = items.map((item) => {
      const physicalStock =
        item.type === 'EQUIPMENT'
          ? item.assets.filter((a) => a.status === 'AVAILABLE').length
          : item.stockLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);

      const reservedStock =
        item.type === 'EQUIPMENT'
          ? (reservedBorrowMap.get(item.id) || 0)
          : (reservedReqMap.get(item.id) || 0);

      const availableStock = Math.max(0, physicalStock - reservedStock);

      const totalQuantity =
        item.type === 'EQUIPMENT'
          ? item.assets.length
          : item.stockLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);

      const openPackRemainder =
        item.type === 'CONSUMABLE'
          ? item.stockLots.reduce((sum, lot) => sum + (lot.openPackRemainder || 0), 0)
          : 0;

      return {
        ...item,
        physicalStock,
        reservedStock,
        availableStock,
        currentStock: availableStock,
        openPackRemainder,
        totalQuantity,
        isLowStock: availableStock <= item.minStockAlert,
      };
    });

    setCached(cacheKey, formatted, 30 * 1000); // 30s TTL
    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to get items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const item = await prisma.item.create({
      data: {
        code: body.code,
        name: body.name,
        type: body.type, // 'EQUIPMENT' or 'CONSUMABLE'
        categoryId: body.categoryId,
        unit: body.unit,
        usageUnit: body.usageUnit ? String(body.usageUnit).trim() : null,
        conversionRatio: body.conversionRatio ? Number(body.conversionRatio) : (body.type === 'CONSUMABLE' ? 1 : null),
        minStockAlert: Number(body.minStockAlert) || 5,
        brand: body.brand ? String(body.brand).trim() : null,
        model: body.model ? String(body.model).trim() : null,
        location: body.location,
        description: body.description,
      },
      include: {
        category: true,
      },
    });

    invalidateCache('items:');
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Failed to create item:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
