import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    if (!code) {
      return NextResponse.json({ error: 'ไม่พบรหัสที่ระบุ' }, { status: 400 });
    }

    const decodedCode = decodeURIComponent(code).trim();

    // 1. Check if it's a StockLotBox (e.g. CON-PPE-001-2569-B001)
    const box = await prisma.stockLotBox.findFirst({
      where: {
        OR: [
          { boxCode: decodedCode },
          { boxCode: { equals: decodedCode, mode: 'insensitive' } },
        ],
      },
      include: {
        lot: {
          include: {
            item: {
              include: { category: true },
            },
          },
        },
      },
    });

    if (box) {
      return NextResponse.json({
        type: 'BOX',
        boxCode: box.boxCode,
        boxNumberInLot: box.boxNumberInLot,
        boxNumberInYear: box.boxNumberInYear,
        year: box.year,
        status: box.status,
        openedAt: box.openedAt,
        depletedAt: box.depletedAt,
        lot: {
          id: box.lot.id,
          lotNumber: box.lot.lotNumber,
          expiryDate: box.lot.expiryDate,
          receivedDate: box.lot.receivedDate,
          quantityInitial: box.lot.quantityInitial,
          quantityRemaining: box.lot.quantityRemaining,
          openPackRemainder: box.lot.openPackRemainder,
          supplier: box.lot.supplier,
        },
        item: {
          id: box.lot.item.id,
          name: box.lot.item.name,
          code: box.lot.item.code,
          unit: box.lot.item.unit,
          usageUnit: box.lot.item.usageUnit,
          location: box.lot.item.location,
          description: box.lot.item.description,
          imageUrl: box.lot.item.imageUrl,
          categoryName: box.lot.item.category?.name,
        },
      });
    }

    // 2. Check if it's a RepackPackItem (e.g. SL-CON-PPE-001-260905-01-P01)
    const pack = await prisma.repackPackItem.findFirst({
      where: {
        OR: [
          { packCode: decodedCode },
          { packCode: { equals: decodedCode, mode: 'insensitive' } },
        ],
      },
      include: {
        repackRecord: {
          include: {
            sourceItem: { include: { category: true } },
            targetItem: { include: { category: true } },
            sourceLot: true,
            operator: { select: { name: true } },
          },
        },
      },
    });

    if (pack) {
      const activeItem = pack.repackRecord.targetItem || pack.repackRecord.sourceItem;
      return NextResponse.json({
        type: 'PACK',
        packCode: pack.packCode,
        packNumber: pack.packNumber,
        unitsCount: pack.unitsCount,
        status: pack.status,
        dispensedTo: pack.dispensedTo,
        dispensedAt: pack.dispensedAt,
        repackRecord: {
          subLotNumber: pack.repackRecord.subLotNumber,
          totalPacksProduced: pack.repackRecord.totalPacksProduced,
          unitsPerPack: pack.repackRecord.unitsPerPack,
          packedDate: pack.repackRecord.packedDate,
          sterileExpiryDate: pack.repackRecord.sterileExpiryDate,
          sterilizeMethod: pack.repackRecord.sterilizeMethod,
          operatorName: pack.repackRecord.operator?.name,
          sourceLotNumber: pack.repackRecord.sourceLot?.lotNumber,
        },
        item: {
          id: activeItem.id,
          name: activeItem.name,
          code: activeItem.code,
          unit: activeItem.unit,
          usageUnit: activeItem.usageUnit || pack.repackRecord.sourceItem.usageUnit,
          location: activeItem.location || pack.repackRecord.sourceItem.location,
          imageUrl: activeItem.imageUrl || pack.repackRecord.sourceItem.imageUrl,
          categoryName: activeItem.category?.name,
        },
      });
    }

    // 3. Check if it's a StockLot (e.g. GLV-S7-889 or SL-...)
    const lot = await prisma.stockLot.findFirst({
      where: {
        OR: [
          { lotNumber: decodedCode },
          { lotNumber: { equals: decodedCode, mode: 'insensitive' } },
        ],
      },
      include: {
        item: { include: { category: true } },
        boxes: {
          orderBy: { boxNumberInLot: 'asc' },
        },
      },
    });

    if (lot) {
      const nextBox =
        lot.boxes.find((b) => b.status === 'IN_USE') ||
        lot.boxes.find((b) => b.status === 'IN_STOCK');

      return NextResponse.json({
        type: 'LOT',
        lot: {
          id: lot.id,
          lotNumber: lot.lotNumber,
          expiryDate: lot.expiryDate,
          receivedDate: lot.receivedDate,
          quantityInitial: lot.quantityInitial,
          quantityRemaining: lot.quantityRemaining,
          openPackRemainder: lot.openPackRemainder,
          supplier: lot.supplier,
          totalBoxes: lot.boxes.length,
          nextBox: nextBox
            ? {
                boxCode: nextBox.boxCode,
                boxNumberInLot: nextBox.boxNumberInLot,
                boxNumberInYear: nextBox.boxNumberInYear,
                status: nextBox.status,
              }
            : null,
        },
        item: {
          id: lot.item.id,
          name: lot.item.name,
          code: lot.item.code,
          unit: lot.item.unit,
          usageUnit: lot.item.usageUnit,
          location: lot.item.location,
          description: lot.item.description,
          imageUrl: lot.item.imageUrl,
          categoryName: lot.item.category?.name,
        },
      });
    }

    // 4. Check if it's an Item by code (e.g. CON-PPE-001)
    const item = await prisma.item.findFirst({
      where: {
        OR: [
          { code: decodedCode },
          { code: { equals: decodedCode, mode: 'insensitive' } },
        ],
        type: 'CONSUMABLE',
      },
      include: {
        category: true,
        stockLots: {
          where: { quantityRemaining: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
          include: {
            boxes: {
              where: { status: { in: ['IN_STOCK', 'IN_USE'] } },
              orderBy: { boxNumberInLot: 'asc' },
              take: 5,
            },
          },
        },
      },
    });

    if (item) {
      const totalStock = item.stockLots.reduce((sum, l) => sum + l.quantityRemaining, 0);
      const totalOpenRemainders = item.stockLots.reduce((sum, l) => sum + (l.openPackRemainder || 0), 0);

      return NextResponse.json({
        type: 'ITEM',
        item: {
          id: item.id,
          name: item.name,
          code: item.code,
          unit: item.unit,
          usageUnit: item.usageUnit,
          location: item.location,
          description: item.description,
          imageUrl: item.imageUrl,
          categoryName: item.category?.name,
          totalStock,
          totalOpenRemainders,
          lotsCount: item.stockLots.length,
          nearestExpiry: item.stockLots[0]?.expiryDate || null,
        },
      });
    }

    return NextResponse.json({ error: 'ไม่พบข้อมูลวัสดุสิ้นเปลืองจากรหัสนี้' }, { status: 404 });
  } catch (error: any) {
    console.error('Public Consumable Fetch Error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการค้นหาข้อมูล' }, { status: 500 });
  }
}
