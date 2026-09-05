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
        },
        orderBy: { packedDate: 'desc' },
      }),
      prisma.item.findMany({
        where: { type: 'CONSUMABLE', status: 'ACTIVE' },
        include: {
          category: true,
          stockLots: {
            where: { quantityRemaining: { gt: 0 } },
            orderBy: { expiryDate: 'asc' },
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
      subLotNumber,
      unitsPerPack,
      totalPacksProduced,
      packedDate,
      sterileExpiryDate,
      sterilizeMethod,
      operatorId,
      note,
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

    // Generate record number
    const count = await prisma.repackRecord.count();
    const recordNumber = 'RP-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');

    let autoSubLot = subLotNumber ? subLotNumber.trim().toUpperCase() : '';
    if (!autoSubLot) {
      const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      autoSubLot = 'SL-' + (sourceLot.item.code || 'MED') + '-' + todayStr + '-' + String(count + 1).padStart(2, '0');
    }

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

    // 2. Record Transaction OUT_REPACK
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
        note: 'เบิกแบ่งบรรจุย่อย: ' + autoSubLot + ' (ได้ ' + totalPacksProduced + ' ซองย่อย)',
      },
    });

    // 3. Create or Add to new Sub-lot in stockLots
    const newSubLot = await prisma.stockLot.create({
      data: {
        itemId: sourceItemId,
        lotNumber: autoSubLot,
        quantityInitial: totalPacksProduced,
        quantityRemaining: totalPacksProduced,
        unitCost: unitCostPerPack,
        expiryDate: parsedSterileExpiry || sourceLot.expiryDate,
        receivedDate: parsedPackedDate,
        supplier: 'แล็บพยาบาลแบ่งบรรจุย่อย (Sterile Pack)',
      },
    });

    // 4. Record Transaction IN for new sub-lot
    await prisma.stockTransaction.create({
      data: {
        itemId: sourceItemId,
        lotId: newSubLot.id,
        type: 'IN',
        quantity: totalPacksProduced,
        unitCost: unitCostPerPack,
        totalCost: totalSourceCost,
        referenceNumber: recordNumber,
        createdById: operatorId,
        note: 'รับเข้าจากการแบ่งบรรจุย่อย ' + autoSubLot + ' (ขนาด ' + (unitsPerPack || 1) + ' ชิ้น/ซอง)',
      },
    });

    // 5. Create RepackRecord
    const record = await prisma.repackRecord.create({
      data: {
        recordNumber,
        sourceItemId,
        sourceLotId,
        sourceQtyUsed,
        subLotNumber: autoSubLot,
        unitsPerPack: unitsPerPack || 1,
        totalPacksProduced,
        packedDate: parsedPackedDate,
        sterileExpiryDate: parsedSterileExpiry,
        sterilizeMethod: sterilizeMethod || 'Autoclave (ไอน้ำ)',
        operatorId,
        note: note || null,
      },
      include: {
        sourceItem: true,
        sourceLot: true,
        operator: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'บันทึกการแบ่งบรรจุย่อยสำเร็จ รหัสล็อตใหม่: ' + autoSubLot,
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