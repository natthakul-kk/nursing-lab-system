import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { createNotification } from '@/lib/notifications';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, userId, reason, itemAdjustments, dispenseNote } = body;

    const requisition = await prisma.requisitionRequest.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            item: true,
          },
        },
        course: true,
        borrowRequest: true,
        user: true,
      },
    });

    if (!requisition) {
      return NextResponse.json({ error: 'ไม่พบรายการคำขอเบิก' }, { status: 404 });
    }

    const respondUpdated = (data: any) => {
      invalidateCache('requisitions:');
      invalidateCache('borrow:');
      invalidateCache('items:');
      invalidateCache('dashboard:');
      return NextResponse.json(data);
    };

    if (action === 'ACKNOWLEDGE') {
      const updated = await prisma.requisitionRequest.update({
        where: { id },
        data: {
          instructorAcknowledged: true,
          acknowledgedAt: new Date(),
          advisorName: body.advisorName || requisition.advisorName,
        },
      });

      // Synchronize with linked borrow request if unified
      if (requisition.borrowRequest) {
        await prisma.borrowRequest.update({
          where: { id: requisition.borrowRequest.id },
          data: {
            instructorAcknowledged: true,
            acknowledgedAt: new Date(),
            advisorName: body.advisorName || requisition.advisorName,
          },
        }).catch((e) => console.error('Failed to sync linked borrow acknowledge:', e));
      }

      // Notify student
      createNotification({
        userId: requisition.userId,
        title: 'อาจารย์รับทราบคำขอเบิกแล้ว',
        message: `อาจารย์ ${body.advisorName || requisition.advisorName || 'ผู้สอน'} ได้กดรับทราบคำขอเบิกเลขที่ ${requisition.requestNumber} แล้ว`,
        type: 'INSTRUCTOR_ACK',
        linkUrl: '/requisitions',
        entityType: 'REQUISITION',
        entityId: requisition.id,
      }).catch(() => {});

      return respondUpdated(updated);
    }

    if (action === 'APPROVE') {
      const updated = await prisma.requisitionRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approverId: userId,
          approvedAt: new Date(),
        },
      });

      // Synchronize with linked borrow request if unified
      if (requisition.borrowRequest) {
        await prisma.borrowRequest.update({
          where: { id: requisition.borrowRequest.id },
          data: {
            status: 'APPROVED',
            approverId: userId,
            approvedAt: new Date(),
          },
        }).catch((e) => console.error('Failed to sync linked borrow approve:', e));
      }

      // Notify student
      createNotification({
        userId: requisition.userId,
        title: 'คำขอเบิกพัสดุได้รับการอนุมัติแล้ว 🎉',
        message: `คำขอเบิกเลขที่ ${requisition.requestNumber} ได้รับการอนุมัติแล้ว กรุณาติดต่อรับพัสดุที่ห้องแล็บ`,
        type: 'APPROVAL',
        priority: 'HIGH',
        linkUrl: '/requisitions',
        entityType: 'REQUISITION',
        entityId: requisition.id,
      }).catch(() => {});

      return respondUpdated(updated);
    }

    if (action === 'REJECT') {
      const updated = await prisma.requisitionRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approverId: userId,
          rejectionReason: reason || 'ไม่อนุมัติ',
        },
      });

      // Synchronize with linked borrow request if unified
      if (requisition.borrowRequest) {
        await prisma.borrowRequest.update({
          where: { id: requisition.borrowRequest.id },
          data: {
            status: 'REJECTED',
            approverId: userId,
            rejectionReason: reason || 'ไม่อนุมัติ',
          },
        }).catch((e) => console.error('Failed to sync linked borrow reject:', e));
      }

      // Notify student
      createNotification({
        userId: requisition.userId,
        title: 'คำขอเบิกพัสดุไม่ได้รับการอนุมัติ',
        message: `คำขอเบิกเลขที่ ${requisition.requestNumber} ไม่ได้รับการอนุมัติ: ${reason || 'ไม่อนุมัติ'}`,
        type: 'REJECTION',
        priority: 'HIGH',
        linkUrl: '/requisitions',
        entityType: 'REQUISITION',
        entityId: requisition.id,
      }).catch(() => {});

      return respondUpdated(updated);
    }
    if (action === 'UPDATE_DATES') {
      const { dateNeeded } = body;
      const dataToUpdate: any = {};
      if (dateNeeded) dataToUpdate.dateNeeded = new Date(dateNeeded);

      const updated = await prisma.requisitionRequest.update({
        where: { id },
        data: dataToUpdate,
      });
      return respondUpdated(updated);
    }

    if (action === 'DISPENSE') {
      // Officer dispenses items and deducts stock FIFO with adjustments
      let actualTotalCost = 0;

      for (const reqItem of requisition.items) {
        const adj = Array.isArray(itemAdjustments)
          ? itemAdjustments.find((a: any) => a.id === reqItem.id)
          : null;

        const isAllowed = adj ? adj.allowed !== false : true;
        if (!isAllowed) {
          await prisma.requisitionItem.update({
            where: { id: reqItem.id },
            data: {
              quantityDispensed: 0,
              unitCost: 0,
              totalCost: 0,
            },
          });
          continue;
        }

        let remainingToDeduct =
          adj && adj.quantity !== undefined
            ? Math.max(0, Number(adj.quantity))
            : reqItem.quantityRequested;

        const requestedTarget = remainingToDeduct;
        let itemTotalCost = 0;

        const isSub = reqItem.isSubUnit === true;
        const ratio = Number(reqItem.item?.conversionRatio) > 0 ? Number(reqItem.item?.conversionRatio) : 1;

        // Fetch lots FIFO: sorted by expiryDate ascending
        const whereLots: any = {
          itemId: reqItem.itemId,
          OR: [
            { quantityRemaining: { gt: 0 } },
            { openPackRemainder: { gt: 0 } },
          ],
        };
        // Strict safety lock: if requested for human use, NEVER deduct expired lots
        if (requisition.useTarget === 'HUMAN') {
          whereLots.AND = [
            {
              OR: [
                { expiryDate: null },
                { expiryDate: { gte: new Date() } },
              ],
            },
          ];
        }

        const availableLots = await prisma.stockLot.findMany({
          where: whereLots,
          orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
        });

        if (!isSub) {
          // ==========================================
          // Case 1: Whole Pack Requisition
          // ==========================================
          // Deduct whole packs from lot.quantityRemaining, keeping openPackRemainder intact for sub-unit users
          for (const lot of availableLots) {
            if (remainingToDeduct <= 0) break;
            if (lot.quantityRemaining <= 0) continue;

            const deductFromThisLot = Math.min(lot.quantityRemaining, remainingToDeduct);
            const costForThisDeduction = deductFromThisLot * lot.unitCost;
            const newQty = Math.max(0, lot.quantityRemaining - deductFromThisLot);
            const openRem = lot.openPackRemainder || 0;
            const newPieces = Math.max(0, (newQty * ratio) + openRem);

            // Update lot
            await prisma.stockLot.update({
              where: { id: lot.id },
              data: {
                quantityRemaining: newQty,
                piecesRemaining: newPieces,
              },
            });

            // Update individual StockLotBoxes in sequential order (1..N)
            const availableBoxes = await prisma.stockLotBox.findMany({
              where: {
                lotId: lot.id,
                status: { in: ['IN_STOCK', 'IN_USE'] },
              },
              orderBy: { boxNumberInLot: 'asc' },
              take: deductFromThisLot,
            });

            if (availableBoxes.length > 0) {
              await prisma.stockLotBox.updateMany({
                where: { id: { in: availableBoxes.map((b) => b.id) } },
                data: { status: 'DISPENSED' },
              });
            }

            // Create stock transaction
            await prisma.stockTransaction.create({
              data: {
                itemId: reqItem.itemId,
                lotId: lot.id,
                type: 'OUT_REQUISITION',
                quantity: -deductFromThisLot,
                unitCost: lot.unitCost,
                totalCost: costForThisDeduction,
                courseId: requisition.courseId,
                referenceNumber: requisition.requestNumber,
                createdById: userId,
                note: dispenseNote
                  ? `จ่ายตามคำขอ ${requisition.requestNumber} (วิชา ${requisition.course?.code || ''}) | หมายเหตุ: ${String(dispenseNote).trim()}`
                  : `จ่ายตามคำขอ ${requisition.requestNumber} (วิชา ${requisition.course?.code || ''})`,
              },
            });

            // Update individual RepackPackItems in sequential order (1..N) if this lot belongs to a repack sub-lot
            const availablePacks = await prisma.repackPackItem.findMany({
              where: {
                repackRecord: { subLotNumber: lot.lotNumber },
                status: 'AVAILABLE',
              },
              orderBy: { packNumber: 'asc' },
              take: deductFromThisLot,
            });

            if (availablePacks.length > 0) {
              await prisma.repackPackItem.updateMany({
                where: { id: { in: availablePacks.map((p) => p.id) } },
                data: {
                  status: 'DISPENSED',
                  dispensedTo: requisition.user ? `${requisition.user.name} (${requisition.requestNumber})` : requisition.requestNumber,
                  dispensedAt: new Date(),
                },
              });
            }

            itemTotalCost += costForThisDeduction;
            remainingToDeduct -= deductFromThisLot;
          }
        } else {
          // ==========================================
          // Case 2: Sub-Unit Requisition (Option A)
          // ==========================================
          // remainingToDeduct is in sub-units (e.g. 10 or 100 or 110 pieces)
          let piecesNeeded = remainingToDeduct;
          const wholePacksNeeded = ratio > 1 ? Math.floor(piecesNeeded / ratio) : 0;
          let wholePacksRemainingToDeduct = wholePacksNeeded;

          // Step 1 (Option A Priority): If >= ratio, prioritize dispensing whole sealed packs first!
          if (wholePacksRemainingToDeduct > 0) {
            for (const lot of availableLots) {
              if (wholePacksRemainingToDeduct <= 0) break;
              if (lot.quantityRemaining <= 0) continue;

              const deductPacks = Math.min(lot.quantityRemaining, wholePacksRemainingToDeduct);
              const costForPacks = deductPacks * lot.unitCost;
              const newQty = lot.quantityRemaining - deductPacks;
              const openRem = lot.openPackRemainder || 0;
              const newPieces = Math.max(0, (newQty * ratio) + openRem);

              lot.quantityRemaining = newQty;

              await prisma.stockLot.update({
                where: { id: lot.id },
                data: {
                  quantityRemaining: newQty,
                  piecesRemaining: newPieces,
                },
              });

              // Update StockLotBox
              const availableBoxes = await prisma.stockLotBox.findMany({
                where: { lotId: lot.id, status: { in: ['IN_STOCK', 'IN_USE'] } },
                orderBy: { boxNumberInLot: 'asc' },
                take: deductPacks,
              });
              if (availableBoxes.length > 0) {
                await prisma.stockLotBox.updateMany({
                  where: { id: { in: availableBoxes.map((b) => b.id) } },
                  data: { status: 'DISPENSED' },
                });
              }

              // Repack items
              const availablePacks = await prisma.repackPackItem.findMany({
                where: { repackRecord: { subLotNumber: lot.lotNumber }, status: 'AVAILABLE' },
                orderBy: { packNumber: 'asc' },
                take: deductPacks,
              });
              if (availablePacks.length > 0) {
                await prisma.repackPackItem.updateMany({
                  where: { id: { in: availablePacks.map((p) => p.id) } },
                  data: {
                    status: 'DISPENSED',
                    dispensedTo: requisition.user ? `${requisition.user.name} (${requisition.requestNumber})` : requisition.requestNumber,
                    dispensedAt: new Date(),
                  },
                });
              }

              // Stock transaction
              await prisma.stockTransaction.create({
                data: {
                  itemId: reqItem.itemId,
                  lotId: lot.id,
                  type: 'OUT_REQUISITION',
                  quantity: -deductPacks,
                  unitCost: lot.unitCost,
                  totalCost: costForPacks,
                  courseId: requisition.courseId,
                  referenceNumber: requisition.requestNumber,
                  createdById: userId,
                  note: dispenseNote
                    ? `จ่ายแพ็คเต็ม (Option A: เบิกย่อย ${deductPacks * ratio} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'}) ตามคำขอ ${requisition.requestNumber} | ${String(dispenseNote).trim()}`
                    : `จ่ายแพ็คเต็ม (Option A: เบิกย่อย ${deductPacks * ratio} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'}) ตามคำขอ ${requisition.requestNumber}`,
                },
              });

              itemTotalCost += costForPacks;
              wholePacksRemainingToDeduct -= deductPacks;
              piecesNeeded -= deductPacks * ratio;
            }
          }

          // Step 2: Fulfill remaining fractional pieces (or any remaining pieces if whole packs ran out)
          if (piecesNeeded > 0) {
            // Step 2A: Check loose pieces in open pack (openPackRemainder > 0)
            for (const lot of availableLots) {
              if (piecesNeeded <= 0) break;
              const currentOpen = lot.openPackRemainder || 0;
              if (currentOpen <= 0) continue;

              const takeFromOpen = Math.min(currentOpen, piecesNeeded);
              const newOpen = currentOpen - takeFromOpen;
              const pieceCost = lot.unitCost / ratio;
              const costForLoose = takeFromOpen * pieceCost;
              const newPieces = Math.max(0, (lot.quantityRemaining * ratio) + newOpen);

              lot.openPackRemainder = newOpen;

              await prisma.stockLot.update({
                where: { id: lot.id },
                data: {
                  openPackRemainder: newOpen,
                  piecesRemaining: newPieces,
                },
              });

              await prisma.stockTransaction.create({
                data: {
                  itemId: reqItem.itemId,
                  lotId: lot.id,
                  type: 'OUT_REQUISITION',
                  quantity: -(takeFromOpen / ratio),
                  unitCost: lot.unitCost,
                  totalCost: costForLoose,
                  courseId: requisition.courseId,
                  referenceNumber: requisition.requestNumber,
                  createdById: userId,
                  note: dispenseNote
                    ? `จ่ายจากเศษแพ็คเปิด ${takeFromOpen} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} ตามคำขอ ${requisition.requestNumber} | ${String(dispenseNote).trim()}`
                    : `จ่ายจากเศษแพ็คเปิด ${takeFromOpen} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} ตามคำขอ ${requisition.requestNumber}`,
                },
              });

              itemTotalCost += costForLoose;
              piecesNeeded -= takeFromOpen;
            }

            // Step 2B: If still need pieces, open 1 new whole pack and keep leftover in openPackRemainder
            if (piecesNeeded > 0) {
              for (const lot of availableLots) {
                if (piecesNeeded <= 0) break;
                if (lot.quantityRemaining <= 0) continue;

                const packsToOpen = Math.min(lot.quantityRemaining, Math.ceil(piecesNeeded / ratio));
                const piecesProvided = packsToOpen * ratio;
                const piecesToDeduct = Math.min(piecesProvided, piecesNeeded);
                const leftoverPieces = piecesProvided - piecesToDeduct;

                const newQty = lot.quantityRemaining - packsToOpen;
                const currentOpen = lot.openPackRemainder || 0;
                const newOpen = currentOpen + leftoverPieces;
                const newPieces = Math.max(0, (newQty * ratio) + newOpen);

                lot.quantityRemaining = newQty;
                lot.openPackRemainder = newOpen;

                await prisma.stockLot.update({
                  where: { id: lot.id },
                  data: {
                    quantityRemaining: newQty,
                    openPackRemainder: newOpen,
                    piecesRemaining: newPieces,
                  },
                });

                // Update StockLotBox for opened pack
                const availableBoxes = await prisma.stockLotBox.findMany({
                  where: { lotId: lot.id, status: { in: ['IN_STOCK'] } },
                  orderBy: { boxNumberInLot: 'asc' },
                  take: packsToOpen,
                });
                if (availableBoxes.length > 0) {
                  await prisma.stockLotBox.updateMany({
                    where: { id: { in: availableBoxes.map((b) => b.id) } },
                    data: { status: leftoverPieces > 0 ? 'IN_USE' : 'DISPENSED' },
                  });
                }

                const pieceCost = lot.unitCost / ratio;
                const costForDispensedPieces = piecesToDeduct * pieceCost;

                await prisma.stockTransaction.create({
                  data: {
                    itemId: reqItem.itemId,
                    lotId: lot.id,
                    type: 'OUT_REQUISITION',
                    quantity: -(piecesToDeduct / ratio),
                    unitCost: lot.unitCost,
                    totalCost: costForDispensedPieces,
                    courseId: requisition.courseId,
                    referenceNumber: requisition.requestNumber,
                    createdById: userId,
                    note: dispenseNote
                      ? `เปิดแพ็คใหม่ ${packsToOpen} แพ็ค → จ่าย ${piecesToDeduct} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} (เก็บเศษ ${leftoverPieces} เข้าคลัง) ตามคำขอ ${requisition.requestNumber} | ${String(dispenseNote).trim()}`
                      : `เปิดแพ็คใหม่ ${packsToOpen} แพ็ค → จ่าย ${piecesToDeduct} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} (เก็บเศษ ${leftoverPieces} เข้าคลัง) ตามคำขอ ${requisition.requestNumber}`,
                  },
                });

                itemTotalCost += costForDispensedPieces;
                piecesNeeded -= piecesToDeduct;
              }
            }
          }

          remainingToDeduct = piecesNeeded;
        }

        const actualDispensed = requestedTarget - remainingToDeduct;

        // Update requisition item with dispensed quantity and actual cost
        await prisma.requisitionItem.update({
          where: { id: reqItem.id },
          data: {
            quantityDispensed: actualDispensed,
            unitCost: actualDispensed > 0 ? itemTotalCost / actualDispensed : 0,
            totalCost: itemTotalCost,
          },
        });

        actualTotalCost += itemTotalCost;
      }

      const updated = await prisma.requisitionRequest.update({
        where: { id },
        data: {
          status: 'DISPENSED',
          officerId: userId,
          dispensedAt: new Date(),
          dispenseNote: dispenseNote ? String(dispenseNote).trim() : null,
          totalCost: actualTotalCost,
        },
        include: {
          items: { include: { item: true } },
          course: true,
        },
      });

      // Synchronize with linked borrow request if unified
      if (requisition.borrowRequest) {
        await prisma.borrowRequest.update({
          where: { id: requisition.borrowRequest.id },
          data: {
            checkoutNote: dispenseNote ? String(dispenseNote).trim() : undefined,
          },
        }).catch((e) => console.error('Failed to sync linked borrow checkout note:', e));
      }

      // Notify student
      createNotification({
        userId: requisition.userId,
        title: 'จ่ายพัสดุเรียบร้อยแล้ว 📦',
        message: `เจ้าหน้าที่ได้จ่ายพัสดุตามคำขอเบิกเลขที่ ${requisition.requestNumber} เรียบร้อยแล้ว`,
        type: 'APPROVAL',
        linkUrl: '/requisitions',
        entityType: 'REQUISITION',
        entityId: requisition.id,
      }).catch(() => {});

      invalidateCache('items:');
      invalidateCache('dashboard:');
      return respondUpdated(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Requisition dispense error:', error);
    return NextResponse.json({ error: error.message || 'Dispense failed' }, { status: 500 });
  }
}
