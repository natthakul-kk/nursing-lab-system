import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractCleanCode } from '@/lib/scanner-utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawCode = searchParams.get('code');
    if (!rawCode || !rawCode.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสที่ต้องการค้นหา' }, { status: 400 });
    }

    const { cleanCode, detectedType } = extractCleanCode(rawCode);
    const code = cleanCode || rawCode.trim();
    const rawTrim = rawCode.trim();
    const candidates = Array.from(new Set([code, rawTrim])).filter(Boolean);

    // 1. ตรวจสอบว่าตรงกับรหัสผู้ใช้งาน (Student ID หรือ Email) หรือไม่
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { studentId: { in: candidates } },
          { email: { in: candidates.map((c) => c.toLowerCase()) } },
          { id: { in: candidates } },
        ],
      },
      select: {
        id: true,
        name: true,
        studentId: true,
        email: true,
        role: true,
        avatar: true,
      },
    });

    if (user) {
      return NextResponse.json({
        type: 'USER',
        user,
      });
    }

    // 2. ตรวจสอบว่าตรงกับรหัสกล่องพัสดุ (StockLotBox: เช่น CS-SHP-01-2569-B001) หรือไม่
    const box = await prisma.stockLotBox.findFirst({
      where: {
        boxCode: { in: candidates },
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
        box: {
          id: box.id,
          boxCode: box.boxCode,
          boxNumberInLot: box.boxNumberInLot,
          status: box.status,
          year: box.year,
        },
        lot: {
          id: box.lot.id,
          lotNumber: box.lot.lotNumber,
          unitCost: box.lot.unitCost,
          packSize: box.lot.packSize,
          expiryDate: box.lot.expiryDate,
        },
        item: box.lot.item,
      });
    }

    // 3. ตรวจสอบว่าตรงกับรหัสซองย่อยสเตอร์ไรด์ (RepackPackItem: เช่น SL-CS-...) หรือไม่
    const pack = await prisma.repackPackItem.findFirst({
      where: {
        packCode: { in: candidates },
      },
      include: {
        repackRecord: {
          include: {
            targetItem: {
              include: { category: true },
            },
            sourceItem: {
              include: { category: true },
            },
            sourceLot: true,
          },
        },
      },
    });

    if (pack) {
      const parentRecord = pack.repackRecord;
      const displayItem = parentRecord.targetItem || parentRecord.sourceItem;
      const unitCostPerPiece = parentRecord.sourceLot?.unitCost && parentRecord.unitsPerPack
        ? parentRecord.sourceLot.unitCost / parentRecord.unitsPerPack
        : (parentRecord.sourceLot?.unitCost || 0);

      return NextResponse.json({
        type: 'PACK',
        pack: {
          id: pack.id,
          packCode: pack.packCode,
          packNumber: pack.packNumber,
          status: pack.status,
          piecesPerPack: pack.unitsCount,
        },
        record: {
          id: parentRecord.id,
          repackCode: parentRecord.subLotNumber || parentRecord.recordNumber,
          expiryDate: parentRecord.sterileExpiryDate,
          unitCostPerPiece,
        },
        item: displayItem,
      });
    }

    // 3.5 ตรวจสอบว่าตรงกับรหัสชุด Sub-lot ของการ Repack หรือไม่
    const repack = await prisma.repackRecord.findFirst({
      where: {
        OR: [
          { subLotNumber: { in: candidates } },
          { recordNumber: { in: candidates } },
        ],
      },
      include: {
        targetItem: { include: { category: true } },
        sourceItem: { include: { category: true } },
        sourceLot: true,
        packItems: {
          where: { status: 'AVAILABLE' },
          orderBy: { packNumber: 'asc' },
        },
      },
    });

    if (repack) {
      const displayItem = repack.targetItem || repack.sourceItem;
      const nextPack = repack.packItems[0] || null;
      const unitCostPerPiece = repack.sourceLot?.unitCost && repack.unitsPerPack
        ? repack.sourceLot.unitCost / repack.unitsPerPack
        : (repack.sourceLot?.unitCost || 0);

      return NextResponse.json({
        type: 'SUBLOT',
        record: {
          id: repack.id,
          repackCode: repack.subLotNumber || repack.recordNumber,
          expiryDate: repack.sterileExpiryDate,
          unitCostPerPiece,
          totalPacksProduced: repack.totalPacksProduced,
          availablePacksCount: repack.packItems.length,
          unitsPerPack: repack.unitsPerPack,
        },
        nextPack: nextPack
          ? {
              id: nextPack.id,
              packCode: nextPack.packCode,
              packNumber: nextPack.packNumber,
              status: nextPack.status,
              piecesPerPack: nextPack.unitsCount,
            }
          : null,
        item: displayItem,
      });
    }

    // 3.8 ตรวจสอบว่าตรงกับรหัสล็อตพัสดุ (StockLot: เช่น อว 6501.38/1429 หรือ LOT-001) หรือไม่
    const lot = await prisma.stockLot.findFirst({
      where: {
        OR: [
          { lotNumber: { in: candidates } },
          { id: { in: candidates } },
        ],
      },
      include: {
        item: { include: { category: true } },
        boxes: {
          where: { status: { in: ['IN_STOCK', 'IN_USE'] } },
          orderBy: [
            { status: 'desc' }, // IN_USE first
            { boxNumberInLot: 'asc' },
          ],
        },
      },
    });

    if (lot) {
      const nextBox =
        lot.boxes.find((b) => b.status === 'IN_USE') ||
        lot.boxes.find((b) => b.status === 'IN_STOCK') ||
        null;

      return NextResponse.json({
        type: 'LOT',
        lot: {
          id: lot.id,
          lotNumber: lot.lotNumber,
          unitCost: lot.unitCost,
          packSize: lot.packSize,
          expiryDate: lot.expiryDate,
          quantityRemaining: lot.quantityRemaining,
          openPackRemainder: lot.openPackRemainder,
        },
        box: nextBox
          ? {
              id: nextBox.id,
              boxCode: nextBox.boxCode,
              boxNumberInLot: nextBox.boxNumberInLot,
              boxNumberInYear: nextBox.boxNumberInYear,
              status: nextBox.status,
              year: nextBox.year,
            }
          : null,
        item: lot.item,
      });
    }

    // 4. ตรวจสอบว่าตรงกับรหัสครุภัณฑ์รายชิ้น (EquipmentAsset: เช่น EQ-MNK-001) หรือไม่
    const asset = await prisma.equipmentAsset.findFirst({
      where: {
        OR: [
          { assetCode: { in: candidates } },
          { govAssetCode: { in: candidates } },
          { id: { in: candidates } },
        ],
      },
      include: {
        item: {
          include: { category: true },
        },
        borrowItems: {
          where: { isReturned: false },
          include: {
            borrowRequest: {
              include: {
                user: {
                  select: { id: true, name: true, studentId: true, role: true },
                },
                course: true,
              },
            },
          },
          orderBy: { borrowRequest: { createdAt: 'desc' } },
          take: 1,
        },
      },
    });

    if (asset) {
      const activeBorrowItem = asset.borrowItems[0] || null;
      return NextResponse.json({
        type: 'ASSET',
        asset: {
          id: asset.id,
          assetCode: asset.assetCode,
          govAssetCode: asset.govAssetCode,
          status: asset.status,
          condition: asset.condition,
          location: asset.location,
          isBorrowable: asset.isBorrowable,
          brand: asset.brand,
          model: asset.model,
          imageUrl: asset.imageUrl,
        },
        item: asset.item,
        activeBorrow: activeBorrowItem
          ? {
              borrowItemId: activeBorrowItem.id,
              borrowRequestId: activeBorrowItem.borrowRequestId,
              requestNumber: activeBorrowItem.borrowRequest.requestNumber,
              user: activeBorrowItem.borrowRequest.user,
              course: activeBorrowItem.borrowRequest.course,
              borrowDate: activeBorrowItem.borrowRequest.borrowDate,
              expectedReturnDate: activeBorrowItem.borrowRequest.expectedReturnDate,
              purpose: activeBorrowItem.borrowRequest.purpose,
            }
          : null,
      });
    }

    // 5. ตรวจสอบว่าตรงกับรหัสพัสดุทั่วไป (Item Code: เช่น CS-NDL-18, CS-GLOVE-07) หรือไม่
    const item = await prisma.item.findFirst({
      where: {
        OR: [
          { code: { in: candidates } },
          { id: { in: candidates } },
        ],
      },
      include: {
        category: true,
        stockLots: {
          where: { quantityRemaining: { gt: 0 } },
          orderBy: [
            { expiryDate: 'asc' },
            { receivedDate: 'asc' },
          ],
          include: {
            boxes: {
              where: { status: { in: ['IN_STOCK', 'IN_USE'] } },
              orderBy: { boxNumberInLot: 'asc' },
            },
          },
        },
      },
    });

    if (item) {
      const currentStock = item.stockLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);
      return NextResponse.json({
        type: 'ITEM',
        item: {
          id: item.id,
          code: item.code,
          name: item.name,
          type: item.type,
          unit: item.unit,
          usageUnit: item.usageUnit,
          conversionRatio: item.conversionRatio,
          location: item.location,
          category: item.category,
          currentStock,
        },
      });
    }

    return NextResponse.json(
      { error: `ไม่พบข้อมูลสำหรับรหัส "${code}" ในระบบ` },
      { status: 404 }
    );
  } catch (err: any) {
    console.error('POS Scan Error:', err);
    return NextResponse.json(
      { error: err.message || 'เกิดข้อผิดพลาดในการสแกนค้นหา' },
      { status: 500 }
    );
  }
}
