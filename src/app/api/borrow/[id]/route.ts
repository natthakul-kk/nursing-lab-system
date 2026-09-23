import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { formatUserName } from '@/lib/user-utils';
import { createNotification } from '@/lib/notifications';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      action,
      userId,
      reason,
      assignedAssets,
      returnCondition,
      returnNote,
      checkoutNote,
      borrowItemAdjustments,
      requisitionItemAdjustments,
    } = body;

    const borrow = await prisma.borrowRequest.findUnique({
      where: { id },
      include: { items: true, user: true },
    });

    if (!borrow) {
      return NextResponse.json({ error: 'ไม่พบคำขอยืม' }, { status: 404 });
    }

    // Optimistic Concurrency Control (OCC) Check
    if (body.lastKnownUpdatedAt) {
      const dbTime = new Date(borrow.updatedAt).getTime();
      const clientTime = new Date(body.lastKnownUpdatedAt).getTime();
      if (Math.abs(dbTime - clientTime) > 1000) {
        return NextResponse.json(
          {
            error: 'CONCURRENCY_CONFLICT',
            message: '⚠️ ข้อมูลคำขอมีการเปลี่ยนแปลง กรุณาตรวจสอบใหม่อีกครั้ง',
            currentUpdatedAt: borrow.updatedAt,
          },
          { status: 409 }
        );
      }
    }

    const respondUpdated = (data: any) => {
      invalidateCache('borrow:');
      invalidateCache('requisitions:');
      invalidateCache('items:');
      invalidateCache('dashboard:');
      return NextResponse.json(data);
    };

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

      // Notify student
      createNotification({
        userId: borrow.userId,
        title: 'อาจารย์รับทราบคำขอยืมแล้ว',
        message: `อาจารย์ ${body.advisorName || borrow.advisorName || 'ผู้สอน'} ได้กดรับทราบคำขอยืมเลขที่ ${borrow.requestNumber} แล้ว`,
        type: 'INSTRUCTOR_ACK',
        linkUrl: '/borrow',
        entityType: 'BORROW',
        entityId: borrow.id,
      }).catch(() => {});

      return respondUpdated(updated);
    }

    if (action === 'APPROVE') {
      if (borrow.status !== 'PENDING') {
        return NextResponse.json(
          {
            error: 'CONCURRENCY_CONFLICT',
            message: '⚠️ ข้อมูลคำขอมีการเปลี่ยนแปลง กรุณาตรวจสอบใหม่อีกครั้ง',
            currentStatus: borrow.status,
          },
          { status: 409 }
        );
      }

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

      // Notify student
      createNotification({
        userId: borrow.userId,
        title: 'คำขอยืมได้รับการอนุมัติแล้ว 🎉',
        message: `คำขอยืมเลขที่ ${borrow.requestNumber} ได้รับการอนุมัติแล้ว กรุณาติดต่อรับอุปกรณ์ที่ห้องแล็บ`,
        type: 'APPROVAL',
        priority: 'HIGH',
        linkUrl: '/borrow',
        entityType: 'BORROW',
        entityId: borrow.id,
      }).catch(() => {});

      return respondUpdated(updated);
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

      // Notify student
      createNotification({
        userId: borrow.userId,
        title: 'คำขอยืมไม่ได้รับการอนุมัติ',
        message: `คำขอยืมเลขที่ ${borrow.requestNumber} ไม่ได้รับการอนุมัติ: ${reason || 'ไม่อนุมัติ'}`,
        type: 'REJECTION',
        priority: 'HIGH',
        linkUrl: '/borrow',
        entityType: 'BORROW',
        entityId: borrow.id,
      }).catch(() => {});

      return respondUpdated(updated);
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
      return respondUpdated(updated);
    }

    if (action === 'CHECKOUT') {
      // 1. Process equipment items with officer adjustments
      for (const bItem of borrow.items) {
        const adj = Array.isArray(borrowItemAdjustments)
          ? borrowItemAdjustments.find((a: any) => a.id === bItem.id)
          : null;

        const isAllowed = adj ? adj.allowed !== false : true;
        const newQty = adj && Number(adj.quantity) > 0 ? Number(adj.quantity) : bItem.quantity;

        if (!isAllowed) {
          // Officer disallowed this equipment item
          await prisma.borrowItem.update({
            where: { id: bItem.id },
            data: {
              quantity: 0,
              returnCondition: 'DISALLOWED',
              isReturned: true,
            },
          });
          continue;
        }

        // Update quantity if adjusted
        if (newQty !== bItem.quantity) {
          await prisma.borrowItem.update({
            where: { id: bItem.id },
            data: { quantity: newQty },
          });
        }

        // Explicit asset assignment or auto-assign available asset
        const explicitAssign =
          assignedAssets?.find((a: any) => a.borrowItemId === bItem.id) ||
          (adj?.assetId ? { assetId: adj.assetId } : null);
        if (explicitAssign?.assetId) {
          await prisma.borrowItem.update({
            where: { id: bItem.id },
            data: { assetId: explicitAssign.assetId },
          });
          await prisma.equipmentAsset.update({
            where: { id: explicitAssign.assetId },
            data: { status: 'BORROWED' },
          });
        } else if (!bItem.assetId) {
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

      // 2. Process linked requisition items (FIFO dispense with officer adjustments)
      if (borrow.requisitionRequestId) {
        try {
          const linkedReq = await prisma.requisitionRequest.findUnique({
            where: { id: borrow.requisitionRequestId },
            include: {
              items: {
                include: {
                  item: true,
                },
              },
              course: true,
            },
          });

          if (linkedReq && linkedReq.status !== 'DISPENSED') {
            let reqActualTotalCost = 0;

            for (const reqItem of linkedReq.items) {
              const adj = Array.isArray(requisitionItemAdjustments)
                ? requisitionItemAdjustments.find((a: any) => a.id === reqItem.id)
                : null;

              const isAllowed = adj ? adj.allowed !== false : true;
              if (!isAllowed) {
                // Officer disallowed this consumable item
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
              let itemCost = 0;

              const isSub = reqItem.isSubUnit === true;
              const ratio = Number(reqItem.item?.conversionRatio) > 0 ? Number(reqItem.item?.conversionRatio) : 1;

              const availableLots = await prisma.stockLot.findMany({
                where: {
                  itemId: reqItem.itemId,
                  OR: [
                    { quantityRemaining: { gt: 0 } },
                    { openPackRemainder: { gt: 0 } },
                  ],
                },
                orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
              });

              if (!isSub) {
                // Case 1: Whole pack deduction (Option A)
                for (const lot of availableLots) {
                  if (remainingToDeduct <= 0) break;
                  if (lot.quantityRemaining <= 0) continue;

                  const deduct = Math.min(lot.quantityRemaining, remainingToDeduct);
                  const cost = deduct * lot.unitCost;
                  const newQty = lot.quantityRemaining - deduct;
                  const openRem = lot.openPackRemainder || 0;
                  const newPieces = Math.max(0, (newQty * ratio) + openRem);

                  await prisma.stockLot.update({
                    where: { id: lot.id },
                    data: {
                      quantityRemaining: newQty,
                      piecesRemaining: newPieces,
                    },
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
                      note: checkoutNote
                        ? `จ่ายตามคำขอเบิก-ยืม ${borrow.requestNumber} (วิชา ${linkedReq.course?.code || ''}) | หมายเหตุ: ${String(checkoutNote).trim()}`
                        : `จ่ายตามคำขอเบิก-ยืม ${borrow.requestNumber} (วิชา ${linkedReq.course?.code || ''})`,
                    },
                  });

                  // Update individual RepackPackItems
                  const availablePacks = await prisma.repackPackItem.findMany({
                    where: {
                      repackRecord: { subLotNumber: lot.lotNumber },
                      status: 'AVAILABLE',
                    },
                    orderBy: { packNumber: 'asc' },
                    take: deduct,
                  });

                  if (availablePacks.length > 0) {
                    await prisma.repackPackItem.updateMany({
                      where: { id: { in: availablePacks.map((p) => p.id) } },
                      data: {
                        status: 'DISPENSED',
                        dispensedTo: borrow.user ? `${formatUserName(borrow.user)} (${borrow.requestNumber})` : borrow.requestNumber,
                        dispensedAt: new Date(),
                      },
                    });
                  }

                  itemCost += cost;
                  remainingToDeduct -= deduct;
                }
              } else {
                // Case 2: Sub-unit deduction (Option A)
                let piecesNeeded = remainingToDeduct;
                const wholePacksNeeded = ratio > 1 ? Math.floor(piecesNeeded / ratio) : 0;
                let wholePacksRemainingToDeduct = wholePacksNeeded;

                // Step 1: Dispense whole packs first
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
                          dispensedTo: borrow.user ? `${formatUserName(borrow.user)} (${borrow.requestNumber})` : borrow.requestNumber,
                          dispensedAt: new Date(),
                        },
                      });
                    }

                    await prisma.stockTransaction.create({
                      data: {
                        itemId: reqItem.itemId,
                        lotId: lot.id,
                        type: 'OUT_REQUISITION',
                        quantity: -deductPacks,
                        unitCost: lot.unitCost,
                        totalCost: costForPacks,
                        courseId: linkedReq.courseId,
                        referenceNumber: linkedReq.requestNumber,
                        createdById: userId,
                        note: checkoutNote
                          ? `จ่ายแพ็คเต็ม (Option A: เบิกย่อย ${deductPacks * ratio} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'}) ตามคำขอเบิก-ยืม ${borrow.requestNumber} | ${String(checkoutNote).trim()}`
                          : `จ่ายแพ็คเต็ม (Option A: เบิกย่อย ${deductPacks * ratio} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'}) ตามคำขอเบิก-ยืม ${borrow.requestNumber}`,
                      },
                    });

                    itemCost += costForPacks;
                    wholePacksRemainingToDeduct -= deductPacks;
                    piecesNeeded -= deductPacks * ratio;
                  }
                }

                // Step 2: Fulfill remaining fractional pieces
                if (piecesNeeded > 0) {
                  // Step 2A: From openPackRemainder
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
                        courseId: linkedReq.courseId,
                        referenceNumber: linkedReq.requestNumber,
                        createdById: userId,
                        note: checkoutNote
                          ? `จ่ายจากเศษแพ็คเปิด ${takeFromOpen} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} ตามคำขอเบิก-ยืม ${borrow.requestNumber} | ${String(checkoutNote).trim()}`
                          : `จ่ายจากเศษแพ็คเปิด ${takeFromOpen} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} ตามคำขอเบิก-ยืม ${borrow.requestNumber}`,
                      },
                    });

                    itemCost += costForLoose;
                    piecesNeeded -= takeFromOpen;
                  }

                  // Step 2B: Open 1 new whole pack
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
                          courseId: linkedReq.courseId,
                          referenceNumber: linkedReq.requestNumber,
                          createdById: userId,
                          note: checkoutNote
                            ? `เปิดแพ็คใหม่ ${packsToOpen} แพ็ค → จ่าย ${piecesToDeduct} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} (เก็บเศษ ${leftoverPieces} เข้าคลัง) ตามคำขอเบิก-ยืม ${borrow.requestNumber} | ${String(checkoutNote).trim()}`
                            : `เปิดแพ็คใหม่ ${packsToOpen} แพ็ค → จ่าย ${piecesToDeduct} ${reqItem.requestedUnit || reqItem.item?.usageUnit || 'ชิ้น'} (เก็บเศษ ${leftoverPieces} เข้าคลัง) ตามคำขอเบิก-ยืม ${borrow.requestNumber}`,
                        },
                      });

                      itemCost += costForDispensedPieces;
                      piecesNeeded -= piecesToDeduct;
                    }
                  }
                }

                remainingToDeduct = piecesNeeded;
              }

              const actualDispensed = requestedTarget - remainingToDeduct;
              await prisma.requisitionItem.update({
                where: { id: reqItem.id },
                data: {
                  quantityDispensed: actualDispensed,
                  unitCost: actualDispensed > 0 ? itemCost / actualDispensed : 0,
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
                dispenseNote: checkoutNote ? String(checkoutNote).trim() : null,
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
          checkoutNote: checkoutNote ? String(checkoutNote).trim() : null,
        },
      });

      // Notify student
      createNotification({
        userId: borrow.userId,
        title: 'จ่ายครุภัณฑ์เรียบร้อยแล้ว 📦',
        message: `เจ้าหน้าที่ได้จ่ายครุภัณฑ์ตามคำขอ ${borrow.requestNumber} แล้ว กำหนดคืนวันที่ ${new Date(borrow.expectedReturnDate).toLocaleDateString('th-TH')}`,
        type: 'DUE_REMINDER',
        linkUrl: '/borrow',
        entityType: 'BORROW',
        entityId: borrow.id,
      }).catch(() => {});

      return respondUpdated(updated);
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
                note: itemRet.note ? `ส่งคืนเมื่อ ${new Date().toLocaleDateString('th-TH')}: ${itemRet.note}` : undefined,
              },
            });

            // Automatically create MaintenanceLog if damaged
            if (itemCond === 'DAMAGED') {
              await prisma.maintenanceLog.create({
                data: {
                  assetId: updatedBItem.assetId,
                  issue: itemRet.note || `ชำรุดจากการยืมใช้งานตามคำขอ ${borrow.requestNumber}`,
                  sentDate: new Date(),
                  status: 'UNDER_REPAIR',
                  handledById: userId || null,
                  technicianNote: `ตรวจพบชำรุดขณะตรวจรับคืนครุภัณฑ์ (ผู้ยืม: ${formatUserName(borrow.user) || 'ไม่ระบุ'})`,
                },
              });
            }
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

            // Automatically create MaintenanceLog if damaged
            if (isDamaged) {
              await prisma.maintenanceLog.create({
                data: {
                  assetId: bItem.assetId,
                  issue: returnNote || `ชำรุดจากการยืมใช้งานตามคำขอ ${borrow.requestNumber}`,
                  sentDate: new Date(),
                  status: 'UNDER_REPAIR',
                  handledById: userId || null,
                  technicianNote: `ตรวจพบชำรุดขณะตรวจรับคืนครุภัณฑ์ (ผู้ยืม: ${formatUserName(borrow.user) || 'ไม่ระบุ'})`,
                },
              });
            }
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

      // Notify student
      createNotification({
        userId: borrow.userId,
        title: hasAnyDamaged ? 'ตรวจรับคืนครุภัณฑ์ (พบรายการชำรุด)' : 'คืนครุภัณฑ์เรียบร้อยแล้ว ✅',
        message: hasAnyDamaged
          ? `เจ้าหน้าที่ตรวจรับคืนคำขอ ${borrow.requestNumber} แล้ว โดยพบอุปกรณ์ชำรุด กรุณาติดต่อเจ้าหน้าที่ห้องแล็บ`
          : `เจ้าหน้าที่ได้ตรวจรับคืนครุภัณฑ์ตามคำขอ ${borrow.requestNumber} เรียบร้อยแล้ว ขอบคุณที่ดูแลอุปกรณ์`,
        type: hasAnyDamaged ? 'REJECTION' : 'APPROVAL',
        priority: hasAnyDamaged ? 'HIGH' : 'NORMAL',
        linkUrl: '/borrow',
        entityType: 'BORROW',
        entityId: borrow.id,
      }).catch(() => {});

      return respondUpdated(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Borrow update error:', error);
    return NextResponse.json({ error: error.message || 'Update failed' }, { status: 500 });
  }
}
