import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, userId, reason, assignedAssets, returnCondition, returnNote } = body;

    const borrow = await prisma.borrowRequest.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!borrow) {
      return NextResponse.json({ error: 'ไม่พบคำขอยืม' }, { status: 404 });
    }

    if (action === 'ACKNOWLEDGE') {
      const updated = await prisma.borrowRequest.update({
        where: { id },
        data: {
          instructorAcknowledged: true,
          acknowledgedAt: new Date(),
          advisorName: body.advisorName || borrow.advisorName,
        },
      });

      // Synchronize with linked requisition request if unified
      if (borrow.requisitionRequestId) {
        await prisma.requisitionRequest.update({
          where: { id: borrow.requisitionRequestId },
          data: {
            instructorAcknowledged: true,
            acknowledgedAt: new Date(),
            advisorName: body.advisorName || borrow.advisorName,
          },
        }).catch((e) => console.error('Failed to sync linked requisition acknowledge:', e));
      }

      return NextResponse.json(updated);
    }

    if (action === 'APPROVE') {
      const updated = await prisma.borrowRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approverId: userId,
          approvedAt: new Date(),
        },
      });

      // Synchronize with linked requisition request if unified
      if (borrow.requisitionRequestId) {
        await prisma.requisitionRequest.update({
          where: { id: borrow.requisitionRequestId },
          data: {
            status: 'APPROVED',
            approverId: userId,
            approvedAt: new Date(),
          },
        }).catch((e) => console.error('Failed to sync linked requisition approve:', e));
      }

      return NextResponse.json(updated);
    }

    if (action === 'REJECT') {
      const updated = await prisma.borrowRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approverId: userId,
          rejectionReason: reason || 'ไม่อนุมัติ',
        },
      });

      // Synchronize with linked requisition request if unified
      if (borrow.requisitionRequestId) {
        await prisma.requisitionRequest.update({
          where: { id: borrow.requisitionRequestId },
          data: {
            status: 'REJECTED',
            approverId: userId,
            rejectionReason: reason || 'ไม่อนุมัติ',
          },
        }).catch((e) => console.error('Failed to sync linked requisition reject:', e));
      }

      return NextResponse.json(updated);
    }
    if (action === 'UPDATE_DATES') {
      const { borrowDate, expectedReturnDate } = body;
      const dataToUpdate: any = {};
      if (borrowDate) dataToUpdate.borrowDate = new Date(borrowDate);
      if (expectedReturnDate) dataToUpdate.expectedReturnDate = new Date(expectedReturnDate);

      const updated = await prisma.borrowRequest.update({
        where: { id },
        data: dataToUpdate,
      });
      return NextResponse.json(updated);
    }

    if (action === 'CHECKOUT') {
      // Officer checks out equipment.
      // If specific assignedAssets provided: array of { borrowItemId, assetId }
      if (assignedAssets && Array.isArray(assignedAssets)) {
        for (const assign of assignedAssets) {
          if (assign.assetId) {
            await prisma.borrowItem.update({
              where: { id: assign.borrowItemId },
              data: { assetId: assign.assetId },
            });
            await prisma.equipmentAsset.update({
              where: { id: assign.assetId },
              data: { status: 'BORROWED' },
            });
          }
        }
      } else {
        // Auto-assign available assets for items
        for (const bItem of borrow.items) {
          if (!bItem.assetId) {
            const availableAsset = await prisma.equipmentAsset.findFirst({
              where: { itemId: bItem.itemId, status: 'AVAILABLE' },
            });
            if (availableAsset) {
              await prisma.borrowItem.update({
                where: { id: bItem.id },
                data: { assetId: availableAsset.id },
              });
              await prisma.equipmentAsset.update({
                where: { id: availableAsset.id },
                data: { status: 'BORROWED' },
              });
            }
          }
        }
      }

      // If linked with a RequisitionRequest, also dispense its consumable items via FIFO automatically
      if (borrow.requisitionRequestId) {
        try {
          const linkedReq = await prisma.requisitionRequest.findUnique({
            where: { id: borrow.requisitionRequestId },
            include: { items: true, course: true },
          });

          if (linkedReq && linkedReq.status !== 'DISPENSED') {
            let reqActualTotalCost = 0;
            for (const reqItem of linkedReq.items) {
              let remainingToDeduct = reqItem.quantityRequested;
              let itemCost = 0;

              const availableLots = await prisma.stockLot.findMany({
                where: { itemId: reqItem.itemId, quantityRemaining: { gt: 0 } },
                orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
              });

              for (const lot of availableLots) {
                if (remainingToDeduct <= 0) break;
                const deduct = Math.min(lot.quantityRemaining, remainingToDeduct);
                const cost = deduct * lot.unitCost;

                await prisma.stockLot.update({
                  where: { id: lot.id },
                  data: { quantityRemaining: lot.quantityRemaining - deduct },
                });

                await prisma.stockTransaction.create({
                  data: {
                    itemId: reqItem.itemId,
                    lotId: lot.id,
                    type: 'OUT_REQUISITION',
                    quantity: -deduct,
                    unitCost: lot.unitCost,
                    totalCost: cost,
                    courseId: linkedReq.courseId,
                    referenceNumber: linkedReq.requestNumber,
                    createdById: userId,
                    note: `จ่ายพร้อมส่งมอบคำขอยืม ${borrow.requestNumber} (วิชา ${linkedReq.course?.code || ''})`,
                  },
                });

                itemCost += cost;
                remainingToDeduct -= deduct;
              }

              await prisma.requisitionItem.update({
                where: { id: reqItem.id },
                data: {
                  quantityDispensed: reqItem.quantityRequested - remainingToDeduct,
                  unitCost: reqItem.quantityRequested > 0 ? itemCost / reqItem.quantityRequested : 0,
                  totalCost: itemCost,
                },
              });
              reqActualTotalCost += itemCost;
            }

            await prisma.requisitionRequest.update({
              where: { id: linkedReq.id },
              data: {
                status: 'DISPENSED',
                officerId: userId,
                dispensedAt: new Date(),
                totalCost: reqActualTotalCost,
              },
            });
          }
        } catch (err) {
          console.error('Failed to auto-dispense linked requisition:', err);
        }
      }

      const updated = await prisma.borrowRequest.update({
        where: { id },
        data: {
          status: 'BORROWED',
          officerId: userId,
          checkedOutAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === 'RETURN') {
      // Officer checks in equipment with individual item condition evaluation
      // body.itemReturns can be an array: [{ id: borrowItemId, condition: 'GOOD'|'DAMAGED', note?: string }]
      const { itemReturns } = body;
      let hasAnyDamaged = false;

      if (itemReturns && Array.isArray(itemReturns) && itemReturns.length > 0) {
        for (const itemRet of itemReturns) {
          const itemCond = itemRet.condition === 'DAMAGED' ? 'DAMAGED' : 'GOOD';
          if (itemCond === 'DAMAGED') {
            hasAnyDamaged = true;
          }

          const updatedBItem = await prisma.borrowItem.update({
            where: { id: itemRet.id },
            data: {
              isReturned: true,
              returnCondition: itemCond,
            },
          });

          if (updatedBItem.assetId) {
            await prisma.equipmentAsset.update({
              where: { id: updatedBItem.assetId },
              data: {
                status: itemCond === 'DAMAGED' ? 'MAINTENANCE' : 'AVAILABLE',
                condition: itemCond,
                note: itemRet.note || (itemCond === 'DAMAGED' ? 'ชำรุดจากการยืม' : undefined),
              },
            });
          }
        }
      } else {
        // Fallback: evaluate all items with global returnCondition
        const isDamaged = returnCondition === 'DAMAGED';
        if (isDamaged) hasAnyDamaged = true;

        for (const bItem of borrow.items) {
          await prisma.borrowItem.update({
            where: { id: bItem.id },
            data: {
              isReturned: true,
              returnCondition: returnCondition || 'GOOD',
            },
          });

          if (bItem.assetId) {
            await prisma.equipmentAsset.update({
              where: { id: bItem.assetId },
              data: {
                status: isDamaged ? 'MAINTENANCE' : 'AVAILABLE',
                condition: returnCondition || 'GOOD',
                note: returnNote ? `ส่งคืนเมื่อ ${new Date().toLocaleDateString('th-TH')}: ${returnNote}` : undefined,
              },
            });
          }
        }
      }

      const updated = await prisma.borrowRequest.update({
        where: { id },
        data: {
          status: hasAnyDamaged ? 'RETURNED_WITH_ISSUE' : 'RETURNED_COMPLETE',
          actualReturnDate: new Date(),
          officerId: userId,
          checkedInAt: new Date(),
          returnNote: returnNote || null,
        },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Borrow update error:', error);
    return NextResponse.json({ error: error.message || 'Update failed' }, { status: 500 });
  }
}
