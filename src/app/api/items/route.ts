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
          location: true,
          description: true,
          imageUrl: true,
          status: true,
          categoryId: true,
          assets: {
            where: { status: 'AVAILABLE' },
            select: { id: true },
          },
          stockLots: {
            where: { quantityRemaining: { gt: 0 } },
            select: { quantityRemaining: true, openPackRemainder: true },
          },
        },
        orderBy: { code: 'asc' },
      });

      const formatted = items.map((item) => {
        const currentStock =
          item.type === 'EQUIPMENT'
            ? item.assets.length
            : item.stockLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);

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
          currentStock,
          openPackRemainder,
          isLowStock: currentStock <= item.minStockAlert,
        };
      });

      setCached(cacheKey, formatted, 60 * 1000); // 60s TTL
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
              orderBy: { sentDate: 'desc' },
              include: { handledBy: { select: { name: true } } },
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
      const currentStock =
        item.type === 'EQUIPMENT'
          ? item.assets.filter((a) => a.status === 'AVAILABLE').length
          : item.stockLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);

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
        currentStock,
        openPackRemainder,
        totalQuantity,
        isLowStock: currentStock <= item.minStockAlert,
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
