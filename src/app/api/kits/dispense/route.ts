import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST: Instant Kit Preparation & Stock Dispensing for a Class Session
// Supports: Open Pack Remainder & Bonus Remainder (เศษซองเปิด + แถมเศษเคลียร์ตู้)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      kitId,
      setsToPrepare, // จำนวนชุดที่ต้องการจัด เช่น 3 ชุด
      userId,
      courseId,
      instructorName,
      roomOrLocation,
      note,
      useOpenPackFirst = true,     // ดึงจากเศษซองเปิดก่อนถ้ามี
      giveRemainderAsBonus = false, // แถมเศษที่เหลือในซองให้นักศึกษาไปด้วย (เคลียร์ซองเปิด)
    } = body;

    if (!kitId || !setsToPrepare || Number(setsToPrepare) < 1) {
      return NextResponse.json(
        { error: 'กรุณาระบุชุดฝึกและจำนวนชุดที่ต้องการจัดเตรียม (อย่างน้อย 1 ชุด)' },
        { status: 400 }
      );
    }

    const numSets = Number(setsToPrepare);

    // 1. Fetch PracticeKit with items and current stocks & lots
    const kit = await prisma.practiceKit.findUnique({
      where: { id: kitId },
      include: {
        items: {
          include: {
            item: {
              include: {
                category: true,
                stockLots: {
                  where: {
                    OR: [
                      { quantityRemaining: { gt: 0 } },
                      { openPackRemainder: { gt: 0 } },
                    ],
                  },
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

    // 3. Pre-check stock availability
    const shortageItems: string[] = [];
    kit.items.forEach((kitItem) => {
      const requiredQty = kitItem.quantity * numSets;
      if (kitItem.item.type === 'CONSUMABLE') {
        const availableWholePacks = kitItem.item.stockLots.reduce(
          (sum, lot) => sum + lot.quantityRemaining,
          0
        );
        const availableOpenPieces = kitItem.item.stockLots.reduce(
          (sum, lot) => sum + (lot.openPackRemainder || 0),
          0
        );
        const ratio = Number(kitItem.item.conversionRatio) || 1;
        const totalPiecesAvailable = (availableWholePacks * ratio) + availableOpenPieces;

        // If kitItem specifies in packs or pieces
        const piecesNeeded = ratio > 1 ? requiredQty : requiredQty;
        if (availableWholePacks < 1 && availableOpenPieces < piecesNeeded) {
          shortageItems.push(
            `${kitItem.item.name}: ต้องการ ${piecesNeeded} ${kitItem.item.usageUnit || kitItem.item.unit} แต่มีไม่พอ`
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

    // 5. Execute Deduction with Open Pack & Bonus Support
    for (const kitItem of kit.items) {
      const requiredQty = kitItem.quantity * numSets;

      if (kitItem.item.type === 'CONSUMABLE') {
        const ratio = Number(kitItem.item.conversionRatio) || 1;
        const isRepackWithPieces = ratio > 1;

        let piecesNeeded = requiredQty;
        let piecesTakenFromOpenPack = 0;
        let wholePacksOpened = 0;
        let remainderLeftInPack = 0;
        let bonusPiecesGiven = 0;
        let itemTotalCost = 0;
        const usedLotsInfo: any[] = [];

        for (const lot of kitItem.item.stockLots) {
          if (piecesNeeded <= 0) break;

          let currentOpenRemainder = lot.openPackRemainder || 0;
          let currentWholePacks = lot.quantityRemaining || 0;

          // Step A: Use loose pieces from already open pack if enabled
          if (useOpenPackFirst && currentOpenRemainder > 0) {
            const takeFromOpen = Math.min(currentOpenRemainder, piecesNeeded);
            piecesTakenFromOpenPack += takeFromOpen;
            currentOpenRemainder -= takeFromOpen;
            piecesNeeded -= takeFromOpen;

            // If user checked "giveRemainderAsBonus" and some remainder still sits in this open pack
            if (giveRemainderAsBonus && currentOpenRemainder > 0 && piecesNeeded <= 0) {
              bonusPiecesGiven += currentOpenRemainder;
              currentOpenRemainder = 0;
            }
          }

          // Step B: If more pieces still needed, open whole packs
          if (piecesNeeded > 0 && currentWholePacks > 0) {
            if (isRepackWithPieces) {
              // Calculate how many whole packs to open
              const packsRequired = Math.ceil(piecesNeeded / ratio);
              const packsToDeduct = Math.min(currentWholePacks, packsRequired);
              const piecesProvided = packsToDeduct * ratio;

              wholePacksOpened += packsToDeduct;
              currentWholePacks -= packsToDeduct;

              const costForPacks = packsToDeduct * lot.unitCost;
              itemTotalCost += costForPacks;

              if (piecesProvided >= piecesNeeded) {
                const leftover = piecesProvided - piecesNeeded;
                piecesNeeded = 0;

                if (giveRemainderAsBonus && leftover > 0) {
                  // Give remainder to student as bonus
                  bonusPiecesGiven += leftover;
                  currentOpenRemainder = 0;
                } else {
                  // Keep remainder in open pack pool
                  currentOpenRemainder += leftover;
                  remainderLeftInPack = currentOpenRemainder;
                }
              } else {
                piecesNeeded -= piecesProvided;
              }
            } else {
              // Normal 1:1 unit item
              const deductQty = Math.min(currentWholePacks, piecesNeeded);
              wholePacksOpened += deductQty;
              currentWholePacks -= deductQty;
              itemTotalCost += deductQty * lot.unitCost;
              piecesNeeded -= deductQty;
            }
          }

          // Update stock lot in DB
          await prisma.stockLot.update({
            where: { id: lot.id },
            data: {
              quantityRemaining: currentWholePacks,
              openPackRemainder: currentOpenRemainder,
            },
          });

          // Build descriptive note for transaction
          const noteDetails: string[] = [];
          if (wholePacksOpened > 0) {
            noteDetails.push(`เปิดซองใหม่ ${wholePacksOpened} ${kitItem.item.unit}`);
          }
          if (piecesTakenFromOpenPack > 0) {
            noteDetails.push(`ดึงจากเศษซองเปิด ${piecesTakenFromOpenPack} ${kitItem.item.usageUnit || kitItem.item.unit}`);
          }
          if (bonusPiecesGiven > 0) {
            noteDetails.push(`🎁 แถมเศษ ${bonusPiecesGiven} ${kitItem.item.usageUnit || kitItem.item.unit} เคลียร์ซอง`);
          } else if (remainderLeftInPack > 0) {
            noteDetails.push(`เก็บเศษในซองเปิด ${remainderLeftInPack} ${kitItem.item.usageUnit || kitItem.item.unit}`);
          }

          const fullNote = `จัดเตรียมชุดฝึก ${kit.name} (${numSets} ชุด) - ${noteDetails.join(' | ')}`;

          // Record transaction
          await prisma.stockTransaction.create({
            data: {
              itemId: kitItem.itemId,
              lotId: lot.id,
              type: 'OUT_REQUISITION',
              quantity: -(wholePacksOpened || piecesTakenFromOpenPack),
              unitCost: lot.unitCost,
              totalCost: itemTotalCost,
              courseId: courseId || null,
              referenceNumber: prepReference,
              createdById: userId || null,
              note: fullNote,
            },
          });

          usedLotsInfo.push({
            lotNumber: lot.lotNumber,
            wholePacksOpened,
            piecesTakenFromOpenPack,
            bonusPiecesGiven,
            remainderLeftInPack: currentOpenRemainder,
            unitCost: lot.unitCost,
          });
        }

        totalValueDispensed += itemTotalCost;

        dispensedSummary.push({
          itemId: kitItem.itemId,
          name: kitItem.item.name,
          code: kitItem.item.code,
          type: 'CONSUMABLE',
          unit: kitItem.item.unit,
          usageUnit: kitItem.item.usageUnit || kitItem.item.unit,
          ratio,
          isRepackWithPieces,
          qtyPerSet: kitItem.quantity,
          totalQtyRequested: requiredQty,
          piecesTakenFromOpenPack,
          wholePacksOpened,
          bonusPiecesGiven,
          remainderLeftInPack,
          totalCost: itemTotalCost,
          usedLots: usedLotsInfo,
        });
      } else {
        // Equipment
        dispensedSummary.push({
          itemId: kitItem.itemId,
          name: kitItem.item.name,
          code: kitItem.item.code,
          type: 'EQUIPMENT',
          unit: kitItem.item.unit,
          usageUnit: kitItem.item.unit,
          qtyPerSet: kitItem.quantity,
          totalQtyRequested: requiredQty,
          piecesTakenFromOpenPack: 0,
          wholePacksOpened: requiredQty,
          bonusPiecesGiven: 0,
          remainderLeftInPack: 0,
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
      useOpenPackFirst,
      giveRemainderAsBonus,
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
