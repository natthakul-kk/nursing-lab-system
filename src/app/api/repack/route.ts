import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch all repack records and consumable items with active lots
export async function GET(req: Request) {
  try {
    const [records, consumableItems] = await Promise.all([
      prisma.repackRecord.findMany({
        include: {
          sourceItem: true,
          sourceLot: true,
          targetItem: true,
          operator: true,
          packItems: {
            orderBy: { packNumber: 'asc' },
          },
        },
        orderBy: { packedDate: 'desc' },
      }),
      prisma.item.findMany({
        where: {
          type: 'CONSUMABLE',
          status: 'ACTIVE',
          // ไม่แสดงเวชภัณฑ์ที่เกิดจากการแบ่งบรรจุแล้ว (เช่น รหัส RP- หรือหน่วย ซอง) มาเป็นต้นทางแบ่งซ้ำ
          NOT: [
            { code: { startsWith: 'RP-' } },
            { unit: 'ซอง' },
          ],
        },
        include: {
          category: true,
          stockLots: {
            where: {
              quantityRemaining: { gt: 0 },
              // ไม่แสดงล็อตย่อย (SL-) หรือล็อตที่เกิดจากการแบ่งบรรจุมาเป็นล็อตต้นทาง
              NOT: [
                { lotNumber: { startsWith: 'SL-' } },
                { lotNumber: { startsWith: 'RP-' } },
              ],
            },
            orderBy: { expiryDate: 'asc' },
            include: {
              boxes: {
                orderBy: { boxNumberInLot: 'asc' },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({ records, consumableItems });
  } catch (error: any) {
    console.error('Fetch Repack Data Error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลงานแบ่งบรรจุ' },
      { status: 500 }
    );
  }
}

// POST: Create a new Repack operation
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      sourceItemId,
      sourceLotId,
      sourceQtyUsed,
      customUsageUnit,
      customRatio,
      subLotNumber,
      unitsPerPack,
      totalPacksProduced,
      packedDate,
      sterileExpiryDate,
      sterilizeMethod,
      operatorId,
      note,
      // Target item options
      targetItemId: rawTargetItemId,
      autoCreateTargetItem,
      targetItemName: rawTargetItemName,
      targetItemCode: rawTargetItemCode,
    } = body;

    if (!sourceItemId || !sourceLotId || !sourceQtyUsed || sourceQtyUsed <= 0) {
      return NextResponse.json(
        { error: 'กรุณาเลือกรายการเวชภัณฑ์ เลือกล็อตเดิม และระบุจำนวนที่เบิกมาแพ็ค' },
        { status: 400 }
      );
    }

    if (!totalPacksProduced || totalPacksProduced <= 0) {
      return NextResponse.json(
        { error: 'กรุณาระบุจำนวนซองย่อยที่ได้ (มากกว่า 0)' },
        { status: 400 }
      );
    }

    // Check source lot remaining quantity
    const sourceLot = await prisma.stockLot.findUnique({
      where: { id: sourceLotId },
      include: { item: true },
    });

    if (!sourceLot) {
      return NextResponse.json({ error: 'ไม่พบล็อตเวชภัณฑ์ที่เลือก' }, { status: 404 });
    }

    if (sourceLot.quantityRemaining < sourceQtyUsed) {
      return NextResponse.json(
        {
          error: 'ยอดคงเหลือในล็อตนี้ไม่เพียงพอ (คงเหลือ ' + sourceLot.quantityRemaining + ' ' + sourceLot.item.unit + ')',
        },
        { status: 400 }
      );
    }

    // Determine or create Target Item (เวชภัณฑ์สำเร็จรูปแบ่งบรรจุสเตอร์ไรด์ หน่วยเป็น 'ซอง')
    let finalTargetItemId = rawTargetItemId || null;
    const effectiveUsageUnit = customUsageUnit || sourceLot.item.usageUnit || 'ชิ้น';
    const effectiveUnitsPerPack = Number(unitsPerPack) || 1;

    if (!finalTargetItemId) {
      // Auto-generate code & name for target item
      const defaultTargetCode = rawTargetItemCode?.trim() || `RP-${sourceLot.item.code}-${effectiveUnitsPerPack}`;
      const defaultTargetName = rawTargetItemName?.trim() || `${sourceLot.item.name} (ซอง ${effectiveUnitsPerPack} ${effectiveUsageUnit} ปลอดเชื้อ)`;

      // Check if target item already exists with this code
      let existingTarget = await prisma.item.findUnique({
        where: { code: defaultTargetCode },
      });

      if (!existingTarget) {
        // Find if any item has exact same name
        existingTarget = await prisma.item.findFirst({
          where: { name: defaultTargetName },
        });
      }

      if (existingTarget) {
        finalTargetItemId = existingTarget.id;
      } else {
        // Create new Target Item with unit: "ซอง"
        const createdItem = await prisma.item.create({
          data: {
            code: defaultTargetCode,
            name: defaultTargetName,
            type: 'CONSUMABLE',
            categoryId: sourceLot.item.categoryId,
            unit: 'ซอง',
            usageUnit: effectiveUsageUnit,
            conversionRatio: effectiveUnitsPerPack,
            location: sourceLot.item.location ? `${sourceLot.item.location} (ตู้เก็บของสเตอร์ไรด์)` : 'ห้องปฏิบัติการพยาบาล (ตู้ปลอดเชื้อ)',
            description: `เวชภัณฑ์แบ่งบรรจุและสเตอร์ไรด์จาก ${sourceLot.item.name} (ซองละ ${effectiveUnitsPerPack} ${effectiveUsageUnit})`,
            minStockAlert: 10,
          },
        });
        finalTargetItemId = createdItem.id;
      }
    }

    // Fetch final target item detail for logging/naming
    const targetItem = await prisma.item.findUnique({
      where: { id: finalTargetItemId },
    });

    // Generate record number
    const count = await prisma.repackRecord.count();
    const recordNumber = 'RP-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');

    let autoSubLot = subLotNumber ? subLotNumber.trim().toUpperCase() : '';
    if (!autoSubLot) {
      const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      autoSubLot = 'SL-' + (sourceLot.item.code || 'MED') + '-' + todayStr + '-01';
    }

    // Ensure autoSubLot and its packCodes do not collide with any existing record or packCode
    let candidateSubLot = autoSubLot;
    let suffix = 1;
    while (true) {
      const existingRecord = await prisma.repackRecord.findFirst({
        where: { subLotNumber: candidateSubLot },
      });
      const existingPack = await prisma.repackPackItem.findFirst({
        where: { packCode: { startsWith: `${candidateSubLot}-P` } },
      });
      const existingLot = await prisma.stockLot.findFirst({
        where: { lotNumber: candidateSubLot },
      });

      if (!existingRecord && !existingPack && !existingLot) {
        break;
      }

      suffix++;
      const baseClean = autoSubLot.replace(/-\d+$/, '');
      candidateSubLot = `${baseClean}-${String(suffix).padStart(2, '0')}`;
    }
    autoSubLot = candidateSubLot;

    const parsedPackedDate = packedDate ? new Date(packedDate) : new Date();
    const parsedSterileExpiry = sterileExpiryDate ? new Date(sterileExpiryDate) : null;

    // Calculate cost per pack
    const totalSourceCost = sourceQtyUsed * sourceLot.unitCost;
    const unitCostPerPack = totalPacksProduced > 0 ? totalSourceCost / totalPacksProduced : 0;

    // 1. Deduct source lot
    await prisma.stockLot.update({
      where: { id: sourceLotId },
      data: {
        quantityRemaining: { decrement: sourceQtyUsed },
      },
    });

    // 2. Record Transaction OUT_REQUISITION for source item
    await prisma.stockTransaction.create({
      data: {
        itemId: sourceItemId,
        lotId: sourceLotId,
        type: 'OUT_REQUISITION',
        quantity: sourceQtyUsed,
        unitCost: sourceLot.unitCost,
        totalCost: totalSourceCost,
        referenceNumber: recordNumber,
        createdById: operatorId,
        note: `เบิกแบ่งบรรจุย่อยเข้าสู่: ${targetItem?.name || 'เวชภัณฑ์สเตอร์ไรด์'} [Sub-lot: ${autoSubLot}] (${totalPacksProduced} ซอง)`,
      },
    });

    // 3. Create or Add to new Sub-lot in stockLots belonging to TARGET ITEM (หน่วย: ซอง)
    const newSubLot = await prisma.stockLot.create({
      data: {
        itemId: finalTargetItemId,
        lotNumber: autoSubLot,
        quantityInitial: totalPacksProduced,
        quantityRemaining: totalPacksProduced,
        unitCost: unitCostPerPack,
        expiryDate: parsedSterileExpiry || sourceLot.expiryDate,
        receivedDate: parsedPackedDate,
        supplier: `แล็บพยาบาลแบ่งบรรจุสเตอร์ไรด์ (จาก Lot ${sourceLot.lotNumber})`,
      },
    });

    // 4. Record Transaction IN for Target Item
    await prisma.stockTransaction.create({
      data: {
        itemId: finalTargetItemId,
        lotId: newSubLot.id,
        type: 'IN',
        quantity: totalPacksProduced,
        unitCost: unitCostPerPack,
        totalCost: totalSourceCost,
        referenceNumber: recordNumber,
        createdById: operatorId,
        note: `รับเข้าเวชภัณฑ์แบ่งบรรจุสำเร็จรูป ${autoSubLot} (ขนาด ${effectiveUnitsPerPack} ${effectiveUsageUnit}/ซอง) รวม ${totalPacksProduced} ซอง`,
      },
    });

    // 5. Create RepackRecord with individual RepackPackItems
    const packItemsData = [];
    for (let i = 1; i <= totalPacksProduced; i++) {
      packItemsData.push({
        packNumber: i,
        packCode: `${autoSubLot}-P${String(i).padStart(2, '0')}`,
        unitsCount: effectiveUnitsPerPack,
        status: 'AVAILABLE',
      });
    }

    const record = await prisma.repackRecord.create({
      data: {
        recordNumber,
        sourceItemId,
        sourceLotId,
        sourceQtyUsed,
        targetItemId: finalTargetItemId,
        subLotNumber: autoSubLot,
        unitsPerPack: effectiveUnitsPerPack,
        totalPacksProduced,
        packedDate: parsedPackedDate,
        sterileExpiryDate: parsedSterileExpiry,
        sterilizeMethod: sterilizeMethod || 'Autoclave (ไอน้ำ)',
        operatorId,
        note: note || null,
        packItems: {
          create: packItemsData,
        },
      },
      include: {
        sourceItem: true,
        sourceLot: true,
        targetItem: true,
        operator: true,
        packItems: {
          orderBy: { packNumber: 'asc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `บันทึกการแบ่งบรรจุสำเร็จ! รับเข้าสต็อกพัสดุ: ${targetItem?.name} จำนวน ${totalPacksProduced} ซอง (Sub-lot: ${autoSubLot})`,
      record,
    });
  } catch (error: any) {
    console.error('Repack API Error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการบันทึกการแบ่งบรรจุ' },
      { status: 500 }
    );
  }
}
