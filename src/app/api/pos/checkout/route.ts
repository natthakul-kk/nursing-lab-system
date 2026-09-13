import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, courseId, purpose, cart, operatorId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'กรุณาระบุผู้ทำรายการเบิก' }, { status: 400 });
    }

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: 'ไม่มีรายการพัสดุในตะกร้า' }, { status: 400 });
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่จริง
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, studentId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ใช้นี้ในระบบ' }, { status: 404 });
    }

    const course = courseId
      ? await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, code: true, name: true } })
      : null;

    const timestamp = Date.now();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `RCP-${dateStr}-${randomSuffix}`;
    const reqNumber = `REQ-POS-${dateStr}-${randomSuffix}`;
    const borNumber = `BOR-POS-${dateStr}-${randomSuffix}`;

    const consumableItems = cart.filter((c: any) => c.type === 'ITEM' || c.type === 'BOX' || c.type === 'PACK');
    const assetItems = cart.filter((c: any) => c.type === 'ASSET');

    let totalReceiptCost = 0;
    const dispensedDetails: any[] = [];
    const borrowedDetails: any[] = [];

    // ดำเนินการแบบ Database Transaction
    await prisma.$transaction(async (tx) => {
      // 1. จัดการฝั่งวัสดุสิ้นเปลือง / ซองย่อย / กล่อง
      if (consumableItems.length > 0) {
        // สร้างใบเบิกคำร้องสถานะ DISPENSED อัตโนมัติ เพื่อให้ระบบบัญชีและสถิติตรงกัน
        const requisition = await tx.requisitionRequest.create({
          data: {
            requestNumber: reqNumber,
            userId: user.id,
            courseId: courseId || null,
            purpose: purpose || 'เบิกจ่ายด่วน ณ จุดบริการ (Express POS)',
            dateNeeded: new Date(),
            status: 'DISPENSED',
            approvedAt: new Date(),
            officerId: operatorId || null,
            dispensedAt: new Date(),
          },
        });

        for (const item of consumableItems) {
          if (item.type === 'BOX') {
            // กรณีเป็นกล่องเฉพาะ (StockLotBox)
            const box = await tx.stockLotBox.findUnique({
              where: { id: item.id },
              include: { lot: true },
            });

            if (box && box.status !== 'DISPENSED') {
              await tx.stockLotBox.update({
                where: { id: box.id },
                data: { status: 'DISPENSED' },
              });

              const pSize = Number(box.lot.packSize) > 0 ? Number(box.lot.packSize) : 1;
              const newLotQty = Math.max(0, box.lot.quantityRemaining - 1);
              const newLotPieces = Math.max(0, (box.lot.piecesRemaining || box.lot.quantityRemaining * pSize) - pSize);

              await tx.stockLot.update({
                where: { id: box.lotId },
                data: {
                  quantityRemaining: newLotQty,
                  piecesRemaining: newLotPieces,
                },
              });

              const cost = box.lot.unitCost || 0;
              totalReceiptCost += cost;

              await tx.stockTransaction.create({
                data: {
                  itemId: box.lot.itemId,
                  lotId: box.lotId,
                  type: 'OUT_REQUISITION',
                  quantity: 1,
                  unitCost: cost,
                  totalCost: cost,
                  courseId: courseId || null,
                  referenceNumber: receiptNumber,
                  createdById: operatorId || user.id,
                  note: `เบิกกล่องด่วน [${box.boxCode}] ผ่าน POS`,
                },
              });

              await tx.requisitionItem.create({
                data: {
                  requisitionRequestId: requisition.id,
                  itemId: box.lot.itemId,
                  quantityRequested: 1,
                  quantityDispensed: 1,
                  unitCost: cost,
                  totalCost: cost,
                },
              });

              dispensedDetails.push({
                name: item.name || 'กล่องพัสดุ',
                code: box.boxCode,
                quantity: 1,
                unit: item.unit || 'กล่อง',
                cost,
              });
            }
          } else if (item.type === 'PACK') {
            // กรณีเป็นซองสเตอร์ไรด์แบ่งบรรจุ (RepackPackItem)
            const pack = await tx.repackPackItem.findUnique({
              where: { id: item.id },
              include: {
                repackRecord: {
                  include: {
                    sourceLot: true,
                  },
                },
              },
            });

            if (pack && pack.status !== 'DISPENSED') {
              await tx.repackPackItem.update({
                where: { id: pack.id },
                data: {
                  status: 'DISPENSED',
                  dispensedTo: user.name,
                  dispensedAt: new Date(),
                },
              });

              const cost = pack.repackRecord?.sourceLot?.unitCost || 0;
              totalReceiptCost += cost;
              const targetItemId = pack.repackRecord?.targetItemId || pack.repackRecord?.sourceItemId;

              if (targetItemId) {
                await tx.stockTransaction.create({
                  data: {
                    itemId: targetItemId,
                    type: 'OUT_REQUISITION',
                    quantity: 1,
                    unitCost: cost,
                    totalCost: cost,
                    courseId: courseId || null,
                    referenceNumber: receiptNumber,
                    createdById: operatorId || user.id,
                    note: `เบิกซองสเตอร์ไรด์ [${pack.packCode}] ผ่าน POS`,
                  },
                });

                await tx.requisitionItem.create({
                  data: {
                    requisitionRequestId: requisition.id,
                    itemId: targetItemId,
                    quantityRequested: 1,
                    quantityDispensed: 1,
                    unitCost: cost,
                    totalCost: cost,
                  },
                });
              }

              dispensedDetails.push({
                name: item.name || 'ซองสเตอร์ไรด์แบ่งบรรจุ',
                code: pack.packCode,
                quantity: 1,
                unit: 'ซอง',
                cost,
              });
            }
          } else {
            // กรณีเป็นพัสดุทั่วไป (Item Code) ตัดตาม FEFO
            const requestedQty = Number(item.quantity) || 1;
            let remainingToDeduct = requestedQty;
            let itemTotalCost = 0;

            const lots = await tx.stockLot.findMany({
              where: {
                itemId: item.id,
                quantityRemaining: { gt: 0 },
              },
              orderBy: [
                { expiryDate: 'asc' },
                { receivedDate: 'asc' },
              ],
            });

            for (const lot of lots) {
              if (remainingToDeduct <= 0) break;
              const deduct = Math.min(lot.quantityRemaining, remainingToDeduct);
              const costThisLot = deduct * lot.unitCost;
              itemTotalCost += costThisLot;
              const pSize = Number(lot.packSize) > 0 ? Number(lot.packSize) : 1;
              const newQty = Math.max(0, lot.quantityRemaining - deduct);
              const newPieces = Math.max(0, newQty * pSize);

              await tx.stockLot.update({
                where: { id: lot.id },
                data: {
                  quantityRemaining: newQty,
                  piecesRemaining: newPieces,
                },
              });

              // อัปเดตกล่องในล็อตนี้ตามลำดับ
              const boxesToDispense = await tx.stockLotBox.findMany({
                where: {
                  lotId: lot.id,
                  status: { in: ['IN_STOCK', 'IN_USE'] },
                },
                orderBy: { boxNumberInLot: 'asc' },
                take: deduct,
              });

              if (boxesToDispense.length > 0) {
                await tx.stockLotBox.updateMany({
                  where: { id: { in: boxesToDispense.map((b) => b.id) } },
                  data: { status: 'DISPENSED' },
                });
              }

              await tx.stockTransaction.create({
                data: {
                  itemId: item.id,
                  lotId: lot.id,
                  type: 'OUT_REQUISITION',
                  quantity: deduct,
                  unitCost: lot.unitCost,
                  totalCost: costThisLot,
                  courseId: courseId || null,
                  referenceNumber: receiptNumber,
                  createdById: operatorId || user.id,
                  note: `เบิกจ่ายด่วนผ่าน POS (${deduct} ${item.unit || 'ชิ้น'})`,
                },
              });

              remainingToDeduct -= deduct;
            }

            totalReceiptCost += itemTotalCost;

            await tx.requisitionItem.create({
              data: {
                requisitionRequestId: requisition.id,
                itemId: item.id,
                quantityRequested: requestedQty,
                quantityDispensed: requestedQty,
                unitCost: itemTotalCost / (requestedQty || 1),
                totalCost: itemTotalCost,
              },
            });

            dispensedDetails.push({
              name: item.name,
              code: item.code,
              quantity: requestedQty,
              unit: item.unit,
              cost: itemTotalCost,
            });
          }
        }
      }

      // 2. จัดการฝั่งครุภัณฑ์ / เครื่องมือคงทน (Equipment Borrow)
      if (assetItems.length > 0) {
        const today = new Date();
        const endOfDay = new Date(today);
        endOfDay.setHours(17, 30, 0, 0); // คืนตอนเลิกเรียนประจำวันเป็นค่าเริ่มต้น

        const borrow = await tx.borrowRequest.create({
          data: {
            requestNumber: borNumber,
            userId: user.id,
            courseId: courseId || null,
            purpose: purpose || 'ยืมอุปกรณ์ด่วน ณ จุดบริการ (Express POS)',
            borrowDate: today,
            expectedReturnDate: endOfDay,
            status: 'BORROWED',
            requestType: 'NORMAL',
            approvedAt: today,
            checkedOutAt: today,
            officerId: operatorId || null,
          },
        });

        for (const assetItem of assetItems) {
          const asset = await tx.equipmentAsset.findUnique({
            where: { id: assetItem.id },
            include: { item: true },
          });

          if (asset) {
            await tx.equipmentAsset.update({
              where: { id: asset.id },
              data: { status: 'BORROWED' },
            });

            await tx.borrowItem.create({
              data: {
                borrowRequestId: borrow.id,
                itemId: asset.itemId,
                assetId: asset.id,
                quantity: 1,
                isReturned: false,
              },
            });

            borrowedDetails.push({
              name: asset.item.name,
              assetCode: asset.assetCode,
              unit: asset.item.unit || 'เครื่อง',
              condition: asset.condition,
            });
          }
        }
      }
    });

    // Invalidate caches
    invalidateCache('items:list');
    invalidateCache('dashboard:stats');
    invalidateCache('requisitions:list');
    invalidateCache('borrow:list');

    return NextResponse.json({
      success: true,
      receipt: {
        receiptNumber,
        checkoutAt: new Date().toISOString(),
        user: {
          id: user.id,
          name: user.name,
          studentId: user.studentId,
        },
        course: course ? { id: course.id, code: course.code, name: course.name } : null,
        purpose: purpose || 'เบิกจ่ายด่วน ณ จุดบริการ',
        dispensedItems: dispensedDetails,
        borrowedItems: borrowedDetails,
        totalCost: totalReceiptCost,
      },
    });
  } catch (err: any) {
    console.error('POS Checkout Error:', err);
    return NextResponse.json(
      { error: err.message || 'เกิดข้อผิดพลาดในการทำรายการเบิกจ่าย' },
      { status: 500 }
    );
  }
}
