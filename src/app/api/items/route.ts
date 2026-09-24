import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

function computeConsumableStock(lots: any[], defaultRatio: number, reservedPieces: number) {
  const physicalStock = lots.reduce((sum, lot) => sum + (lot.quantityRemaining || 0), 0);
  const physicalOpen = lots.reduce((sum, lot) => sum + (lot.openPackRemainder || 0), 0);
  const totalPhysicalPieces = lots.reduce((sum, lot) => {
    const pSize = Number(lot.packSize) > 0 ? Number(lot.packSize) : defaultRatio;
    const pPieces = lot.quantityRemaining > 0
      ? (typeof lot.piecesRemaining === 'number' && lot.piecesRemaining <= lot.quantityRemaining * pSize
          ? lot.piecesRemaining
          : lot.quantityRemaining * pSize)
      : 0;
    return sum + pPieces + (lot.openPackRemainder || 0);
  }, 0);

  if (reservedPieces <= 0) {
    return {
      physicalStock,
      availableStock: physicalStock,
      openPackRemainder: physicalOpen,
      totalPiecesRemaining: totalPhysicalPieces,
      reservedStock: 0,
    };
  }

  // Simulate reserving piecesNeeded in FIFO order across lots:
  const simLots = lots.map((l) => {
    const pSize = Number(l.packSize) > 0 ? Number(l.packSize) : defaultRatio;
    return {
      packSize: pSize,
      quantityRemaining: l.quantityRemaining || 0,
      openPackRemainder: l.openPackRemainder || 0,
    };
  });

  let piecesToReserve = reservedPieces;

  // Step 1: Dedicate whole packs if piecesToReserve >= lot.packSize
  for (const l of simLots) {
    if (piecesToReserve <= 0) break;
    if (l.quantityRemaining <= 0) continue;
    const packs = Math.min(l.quantityRemaining, Math.floor(piecesToReserve / l.packSize));
    if (packs > 0) {
      l.quantityRemaining -= packs;
      piecesToReserve -= packs * l.packSize;
    }
  }

  // Step 2: From openPackRemainder
  if (piecesToReserve > 0) {
    for (const l of simLots) {
      if (piecesToReserve <= 0) break;
      if (l.openPackRemainder <= 0) continue;
      const take = Math.min(l.openPackRemainder, piecesToReserve);
      l.openPackRemainder -= take;
      piecesToReserve -= take;
    }
  }

  // Step 3: If still need pieces, open whole pack
  if (piecesToReserve > 0) {
    for (const l of simLots) {
      if (piecesToReserve <= 0) break;
      if (l.quantityRemaining <= 0) continue;
      const packs = Math.min(l.quantityRemaining, Math.ceil(piecesToReserve / l.packSize));
      const provided = packs * l.packSize;
      const take = Math.min(provided, piecesToReserve);
      const leftover = provided - take;
      l.quantityRemaining -= packs;
      l.openPackRemainder += leftover;
      piecesToReserve -= take;
    }
  }

  const availableStock = simLots.reduce((sum, l) => sum + l.quantityRemaining, 0);
  const openPackRemainder = simLots.reduce((sum, l) => sum + l.openPackRemainder, 0);
  const availablePieces = Math.max(0, totalPhysicalPieces - reservedPieces);

  return {
    physicalStock,
    availableStock,
    openPackRemainder,
    totalPiecesRemaining: availablePieces,
    reservedStock: physicalStock - availableStock,
  };
}

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
      prisma.requisitionItem.findMany({
        where: {
          requisitionRequest: {
            status: { in: ['PENDING', 'APPROVED'] },
          },
        },
        select: {
          itemId: true,
          quantityRequested: true,
          isSubUnit: true,
          item: {
            select: { conversionRatio: true },
          },
        },
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

    const reservedPiecesMap = new Map<string, number>();
    for (const r of pendingReqItems) {
      const ratio = Number(r.item?.conversionRatio) > 0 ? Number(r.item.conversionRatio) : 1;
      const pieces = r.isSubUnit ? r.quantityRequested : r.quantityRequested * ratio;
      reservedPiecesMap.set(r.itemId, (reservedPiecesMap.get(r.itemId) || 0) + pieces);
    }

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
          storageLocation: { select: { id: true, code: true, name: true, roomName: true, floor: true, building: true } },
          description: true,
          imageUrl: true,
          status: true,
          isBorrowable: true,
          allowExpiredForSim: true,
          categoryId: true,
          category: { select: { id: true, name: true } },
          assets: {
            where: { status: 'AVAILABLE' },
            select: {
              id: true,
              assetCode: true,
              serialNumber: true,
              sequenceNumber: true,
              location: true,
              storageLocation: { select: { id: true, code: true, name: true, roomName: true, floor: true, building: true } },
              brand: true,
              model: true,
              supplier: true,
              warrantyExpiry: true,
              isBorrowable: true,
            },
            orderBy: { sequenceNumber: 'asc' },
          },
          stockLots: {
            where: { quantityRemaining: { gt: 0 } },
            select: {
              id: true,
              lotNumber: true,
              expiryDate: true,
              receivedDate: true,
              packSize: true,
              quantityRemaining: true,
              openPackRemainder: true,
              brand: true,
            },
            orderBy: [
              { expiryDate: 'asc' },
              { receivedDate: 'asc' },
              { createdAt: 'asc' },
            ],
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
        const ratio = Number(item.conversionRatio) > 0 ? Number(item.conversionRatio) : 1;
        const physicalStock =
          item.type === 'EQUIPMENT'
            ? item.assets.length
            : item.stockLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);

        let availableStock = 0;
        let reservedStock = 0;
        let openPackRemainder = 0;
        let totalPiecesRemaining = 0;

        if (item.type === 'EQUIPMENT') {
          reservedStock = reservedBorrowMap.get(item.id) || 0;
          availableStock = Math.max(0, physicalStock - reservedStock);
        } else {
          const reservedPieces = reservedPiecesMap.get(item.id) || 0;
          const stockCalc = computeConsumableStock(item.stockLots, ratio, reservedPieces);
          availableStock = stockCalc.availableStock;
          reservedStock = stockCalc.reservedStock;
          openPackRemainder = stockCalc.openPackRemainder;
          totalPiecesRemaining = stockCalc.totalPiecesRemaining;
        }

        const isLowStock =
          item.type === 'CONSUMABLE' && ratio > 1 && item.minStockAlert > ratio
            ? totalPiecesRemaining <= item.minStockAlert
            : availableStock <= item.minStockAlert;

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
          storageLocation: item.storageLocation,
          stockLots: item.stockLots,
          description: item.description,
          imageUrl: item.imageUrl,
          status: item.status,
          categoryId: item.categoryId,
          category: item.category,
          isBorrowable: (item as any).isBorrowable !== false,
          allowExpiredForSim: (item as any).allowExpiredForSim !== false,
          physicalStock,
          reservedStock,
          availableStock,
          currentStock: availableStock, // Guarantees all selectors and stock checks validate against available stock
          openPackRemainder,
          totalPiecesRemaining,
          isLowStock,
          availableAssets: item.type === 'EQUIPMENT' ? (item.assets || []).filter((a: any) => a.isBorrowable !== false) : [],
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

      setCached(cacheKey, formatted, 15); // 15s TTL
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
          orderBy: [
            { expiryDate: 'asc' },
            { receivedDate: 'asc' },
            { createdAt: 'asc' },
          ],
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
      const ratio = Number(item.conversionRatio) > 0 ? Number(item.conversionRatio) : 1;
      const physicalStock =
        item.type === 'EQUIPMENT'
          ? item.assets.filter((a) => a.status === 'AVAILABLE').length
          : item.stockLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);

      const totalQuantity =
        item.type === 'EQUIPMENT'
          ? item.assets.length
          : item.stockLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);

      let availableStock = 0;
      let reservedStock = 0;
      let openPackRemainder = 0;
      let totalPiecesRemaining = 0;

      if (item.type === 'EQUIPMENT') {
        reservedStock = reservedBorrowMap.get(item.id) || 0;
        availableStock = Math.max(0, physicalStock - reservedStock);
      } else {
        const reservedPieces = reservedPiecesMap.get(item.id) || 0;
        const stockCalc = computeConsumableStock(item.stockLots, ratio, reservedPieces);
        availableStock = stockCalc.availableStock;
        reservedStock = stockCalc.reservedStock;
        openPackRemainder = stockCalc.openPackRemainder;
        totalPiecesRemaining = stockCalc.totalPiecesRemaining;
      }

      const isLowStock =
        item.type === 'CONSUMABLE' && ratio > 1 && item.minStockAlert > ratio
          ? totalPiecesRemaining <= item.minStockAlert
          : availableStock <= item.minStockAlert;

      return {
        ...item,
        physicalStock,
        reservedStock,
        availableStock,
        currentStock: availableStock,
        openPackRemainder,
        totalPiecesRemaining,
        totalQuantity,
        isLowStock,
      };
    });

    setCached(cacheKey, formatted, 15); // 15s TTL
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
        isBorrowable: body.isBorrowable !== undefined ? Boolean(body.isBorrowable) : true,
        allowExpiredForSim: body.allowExpiredForSim !== undefined ? Boolean(body.allowExpiredForSim) : true,
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
