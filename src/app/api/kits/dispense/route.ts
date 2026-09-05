import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST: Instant Kit Preparation & Stock Dispensing for a Class Session
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      kitId,
      setsToPrepare, // จำนวนชุดที่ต้องการจัด เช่น 5 ชุด
      userId,
      courseId,
      instructorName,
      roomOrLocation,
      note,
    } = body;

    if (!kitId || !setsToPrepare || Number(setsToPrepare) < 1) {
      return NextResponse.json(
        { error: 'กรุณาระบุชุดฝึกและจำนวนชุดที่ต้องการจัดเตรียม (อย่างน้อย 1 ชุด)' },
        { status: 400 }
      );
    }

    const numSets = Number(setsToPrepare);

    // 1. Fetch PracticeKit with items and current stocks
    const kit = await prisma.practiceKit.findUnique({
      where: { id: kitId },
      include: {
        items: {
          include: {
            item: {
              include: {
                category: true,
                stockLots: {
                  where: { quantityRemaining: { gt: 0 } },
                  orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
                },
                assets: {
                  where: { status: 'AVAILABLE' },
                },
              },
            },
          },
        },
      },
    });

    if (!kit) {
      return NextResponse.json({ error: 'ไม่พบชุดฝึกปฏิบัติการที่ระบุ' }, { status: 404 });
    }

    // 2. Fetch course if provided
    let course = null;
    if (courseId) {
      course = await prisma.course.findUnique({ where: { id: courseId } });
    }

    // 3. Pre-check stock availability for all items
    const shortageItems: string[] = [];
    kit.items.forEach((kitItem) => {
      const requiredQty = kitItem.quantity * numSets;
      if (kitItem.item.type === 'CONSUMABLE') {
        const availableInLots = kitItem.item.stockLots.reduce(
          (sum, lot) => sum + lot.quantityRemaining,
          0
        );
        if (availableInLots < requiredQty) {
          shortageItems.push(
            `${kitItem.item.name}: ต้องการ ${requiredQty} ${kitItem.item.unit} แต่มีเพียง ${availableInLots} ${kitItem.item.unit}`
          );
        }
      }
    });

    if (shortageItems.length > 0) {
      return NextResponse.json(
        {
          error: `สต็อกวัสดุไม่เพียงพอสำหรับจัด ${numSets} ชุด:\n` + shortageItems.join('\n'),
        },
        { status: 400 }
      );
    }

    // 4. Generate Prep Reference Number
    const countTx = await prisma.stockTransaction.count();
    const prepReference = `PREP-${new Date().getFullYear()}-${String(countTx + 1).padStart(5, '0')}`;

    const dispensedSummary: any[] = [];
    let totalValueDispensed = 0;

    // 5. Execute FIFO deduction for consumable items
    for (const kitItem of kit.items) {
      const requiredQty = kitItem.quantity * numSets;

      if (kitItem.item.type === 'CONSUMABLE') {
        let remainingToDeduct = requiredQty;
        let itemTotalCost = 0;
        const usedLotsInfo: any[] = [];

        for (const lot of kitItem.item.stockLots) {
          if (remainingToDeduct <= 0) break;

          const deductFromLot = Math.min(lot.quantityRemaining, remainingToDeduct);
          const costForDeduction = deductFromLot * lot.unitCost;

          // Deduct from stock lot
          await prisma.stockLot.update({
            where: { id: lot.id },
            data: {
              quantityRemaining: lot.quantityRemaining - deductFromLot,
            },
          });

          // Create stock transaction record
          await prisma.stockTransaction.create({
            data: {
              itemId: kitItem.itemId,
              lotId: lot.id,
              type: 'OUT_REQUISITION',
              quantity: -deductFromLot,
              unitCost: lot.unitCost,
              totalCost: costForDeduction,
              courseId: courseId || null,
              referenceNumber: prepReference,
              createdById: userId || null,
              note: `จัดเตรียมชุดฝึก: ${kit.name} (${numSets} ชุด) สำหรับวิชา ${course ? `[${course.code}] ${course.name}` : 'ทั่วไป'}`,
            },
          });

          usedLotsInfo.push({
            lotNumber: lot.lotNumber,
            deducted: deductFromLot,
            unitCost: lot.unitCost,
          });

          itemTotalCost += costForDeduction;
          remainingToDeduct -= deductFromLot;
        }

        totalValueDispensed += itemTotalCost;
        dispensedSummary.push({
          itemId: kitItem.itemId,
          name: kitItem.item.name,
          code: kitItem.item.code,
          type: 'CONSUMABLE',
          unit: kitItem.item.unit,
          qtyPerSet: kitItem.quantity,
          totalQtyDispensed: requiredQty,
          totalCost: itemTotalCost,
          usedLots: usedLotsInfo,
        });
      } else {
        // Equipment (Assigned to class session)
        dispensedSummary.push({
          itemId: kitItem.itemId,
          name: kitItem.item.name,
          code: kitItem.item.code,
          type: 'EQUIPMENT',
          unit: kitItem.item.unit,
          qtyPerSet: kitItem.quantity,
          totalQtyDispensed: requiredQty,
          totalCost: 0,
          usedLots: [],
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `จัดเตรียมชุดฝึก ${kit.name} จำนวน ${numSets} ชุด เรียบร้อยแล้ว`,
      prepReference,
      preparedAt: new Date().toISOString(),
      kit: {
        id: kit.id,
        code: kit.code,
        name: kit.name,
        category: kit.category,
        targetCourse: kit.targetCourse,
      },
      numSets,
      course: course ? { code: course.code, name: course.name } : null,
      instructorName: instructorName || '-',
      roomOrLocation: roomOrLocation || 'ห้องปฏิบัติการพยาบาล',
      note: note || '',
      totalValueDispensed,
      items: dispensedSummary,
    });
  } catch (error: any) {
    console.error('Kit Dispense Error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการตัดสต็อกจัดเตรียมชุดฝึก' },
      { status: 500 }
    );
  }
}
