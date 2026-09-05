import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // EQUIPMENT, CONSUMABLE, or all

    const whereCondition: any = {};
    if (type && (type === 'EQUIPMENT' || type === 'CONSUMABLE')) {
      whereCondition.type = type;
    }

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

      return {
        ...item,
        currentStock,
        totalQuantity,
        isLowStock: currentStock <= item.minStockAlert,
      };
    });

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
        type: body.type, // "EQUIPMENT" or "CONSUMABLE"
        categoryId: body.categoryId,
        unit: body.unit,
        minStockAlert: Number(body.minStockAlert) || 5,
        location: body.location,
        description: body.description,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Failed to create item:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
