import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { createNotification, notifyAdvisorByName } from '@/lib/notifications';

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      requestId,
      requestType, // 'BORROW' | 'REQUISITION' | 'UNIFIED'
      lastKnownUpdatedAt,
      userId,
      purpose,
      useTarget = 'SIMULATION',
      courseId,
      advisorName,
      borrowDate,
      expectedReturnDate,
      dateNeeded,
      borrowItems = [],
      requisitionItems = [],
    } = body;

    if (!requestId || !userId) {
      return NextResponse.json({ error: 'ข้อมูลคำขอไม่ครบถ้วน' }, { status: 400 });
    }

    // Determine target record
    let borrowRecord: any = null;
    let requisitionRecord: any = null;

    if (requestType === 'BORROW' || requestType === 'UNIFIED') {
      borrowRecord = await prisma.borrowRequest.findUnique({
        where: { id: requestId },
        include: {
          items: true,
          requisitionRequest: {
            include: { items: true },
          },
        },
      });

      if (!borrowRecord && requestType === 'UNIFIED') {
        // Maybe requestId was the requisition ID
        requisitionRecord = await prisma.requisitionRequest.findUnique({
          where: { id: requestId },
          include: {
            items: true,
            borrowRequest: {
              include: { items: true },
            },
          },
        });
        if (requisitionRecord?.borrowRequest) {
          borrowRecord = requisitionRecord.borrowRequest;
        }
      } else if (borrowRecord?.requisitionRequest) {
        requisitionRecord = borrowRecord.requisitionRequest;
      }
    } else {
      requisitionRecord = await prisma.requisitionRequest.findUnique({
        where: { id: requestId },
        include: {
          items: true,
          borrowRequest: {
            include: { items: true },
          },
        },
      });
      if (requisitionRecord?.borrowRequest) {
        borrowRecord = requisitionRecord.borrowRequest;
      }
    }

    const primaryRecord = borrowRecord || requisitionRecord;
    if (!primaryRecord) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลคำขอในระบบ' }, { status: 404 });
    }

    // 1. Check user permission (owner or officer/admin)
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    const isAuthorized =
      primaryRecord.userId === userId ||
      currentUser?.role === 'OFFICER' ||
      currentUser?.role === 'ADMIN';

    if (!isAuthorized) {
      return NextResponse.json({ error: 'ท่านไม่มีสิทธิ์ในการแก้ไขคำขอนี้' }, { status: 403 });
    }

    // 2. Check if the status allows editing
    const nonEditableStatuses = ['BORROWED', 'DISPENSED', 'RETURNED_COMPLETE', 'RETURNED_WITH_ISSUE', 'CANCELLED'];
    if (nonEditableStatuses.includes(primaryRecord.status)) {
      return NextResponse.json(
        { error: 'ไม่สามารถแก้ไขคำขอที่ส่งมอบพัสดุแล้ว หรือถูกยกเลิกแล้วได้' },
        { status: 400 }
      );
    }

    // 3. Optimistic Concurrency Control (OCC)
    if (lastKnownUpdatedAt) {
      const dbTime = new Date(primaryRecord.updatedAt).getTime();
      const clientTime = new Date(lastKnownUpdatedAt).getTime();
      // If mismatch > 1000ms
      if (Math.abs(dbTime - clientTime) > 1000) {
        return NextResponse.json(
          {
            error: 'CONCURRENCY_CONFLICT',
            message: '⚠️ ข้อมูลคำขอมีการเปลี่ยนแปลง กรุณาตรวจสอบใหม่อีกครั้ง',
            currentUpdatedAt: primaryRecord.updatedAt,
          },
          { status: 409 }
        );
      }
    }

    // 4. Resolve advisor name
    let finalAdvisorName = advisorName || primaryRecord.advisorName || null;
    if (courseId) {
      const courseInfo = await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorName: true },
      });
      if (courseInfo?.instructorName && !advisorName) {
        finalAdvisorName = courseInfo.instructorName;
      }
    }

    // 5. Validate items
    const validBorrowItems = (borrowItems || []).filter((it: any) => it.itemId && Number(it.quantity) > 0);
    const validReqItems = (requisitionItems || []).filter((it: any) => it.itemId && Number(it.quantity) > 0);

    const hasBorrow = Boolean(borrowRecord || validBorrowItems.length > 0);
    const hasReq = Boolean(requisitionRecord || validReqItems.length > 0);

    if (hasBorrow && validBorrowItems.length === 0 && (!hasReq || validReqItems.length === 0)) {
      return NextResponse.json({ error: 'กรุณาระบุรายการครุภัณฑ์หรือวัสดุที่ต้องการขออย่างน้อย 1 รายการ' }, { status: 400 });
    }

    // Stock validation for Borrow Items
    if (validBorrowItems.length > 0) {
      const borrowItemIds = validBorrowItems.map((it: any) => it.itemId);
      const [equipmentRecords, activeBorrows] = await Promise.all([
        prisma.item.findMany({
          where: { id: { in: borrowItemIds } },
          include: {
            assets: {
              where: { status: 'AVAILABLE', isBorrowable: true },
            },
          },
        }),
        prisma.borrowItem.findMany({
          where: {
            itemId: { in: borrowItemIds },
            borrowRequest: {
              status: { in: ['PENDING', 'APPROVED'] },
              ...(borrowRecord ? { id: { not: borrowRecord.id } } : {}),
            },
          },
          select: { itemId: true, quantity: true },
        }),
      ]);

      const reservedMap = new Map<string, number>();
      for (const b of activeBorrows) {
        reservedMap.set(b.itemId, (reservedMap.get(b.itemId) || 0) + b.quantity);
      }

      for (const it of validBorrowItems) {
        const itemRecord = equipmentRecords.find((e) => e.id === it.itemId);
        if (!itemRecord) {
          return NextResponse.json({ error: 'ไม่พบครุภัณฑ์บางรายการในระบบ' }, { status: 400 });
        }
        const totalAvail = itemRecord.assets?.length ?? 0;
        const reserved = reservedMap.get(it.itemId) || 0;
        const availableCount = Math.max(0, totalAvail - reserved);
        const reqQty = Number(it.quantity) || 1;

        if (reqQty > availableCount) {
          return NextResponse.json(
            {
              error: `ไม่สามารถขอเกินจำนวนพร้อมใช้ได้: ครุภัณฑ์ "${itemRecord.name}" มีพร้อมให้ยืม ${availableCount} ${itemRecord.unit || 'ชิ้น'} (ท่านระบุ ${reqQty})`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Stock validation for Requisition Items
    let estimatedReqTotalCost = 0;
    const reqItemsToCreate: any[] = [];

    if (validReqItems.length > 0) {
      const reqItemIds = validReqItems.map((it: any) => it.itemId);
      const [consumableRecords, activeReqs] = await Promise.all([
        prisma.item.findMany({
          where: { id: { in: reqItemIds } },
          include: {
            stockLots: {
              where: {
                quantityRemaining: { gt: 0 },
              },
              orderBy: [
                { expiryDate: 'asc' },
                { receivedDate: 'asc' },
                { createdAt: 'asc' },
              ],
            },
          },
        }),
        prisma.requisitionItem.findMany({
          where: {
            itemId: { in: reqItemIds },
            requisitionRequest: {
              status: { in: ['PENDING', 'APPROVED'] },
              ...(requisitionRecord ? { id: { not: requisitionRecord.id } } : {}),
            },
          },
          select: { itemId: true, quantityRequested: true, isSubUnit: true },
        }),
      ]);

      const reqMap = new Map(consumableRecords.map((c) => [c.id, c]));
      const reservedReqMap = new Map<string, number>();

      for (const r of activeReqs) {
        const c = reqMap.get(r.itemId);
        const ratio = Number(c?.conversionRatio) > 0 ? Number(c?.conversionRatio) : 1;
        const packVal = r.isSubUnit ? r.quantityRequested / ratio : r.quantityRequested;
        reservedReqMap.set(r.itemId, (reservedReqMap.get(r.itemId) || 0) + packVal);
      }

      for (const it of validReqItems) {
        const itemRecord = reqMap.get(it.itemId);
        if (!itemRecord) {
          return NextResponse.json({ error: 'ไม่พบวัสดุบางรายการในระบบ' }, { status: 400 });
        }

        const validLots =
          useTarget === 'HUMAN'
            ? itemRecord.stockLots.filter((lot: any) => !lot.expiryDate || new Date(lot.expiryDate) >= new Date())
            : itemRecord.stockLots;

        const totalStockRemaining = validLots.reduce((sum: number, lot: any) => sum + lot.quantityRemaining, 0);
        const totalOpenRemainder = validLots.reduce((sum: number, lot: any) => sum + (lot.openPackRemainder || 0), 0);
        const ratio = Number(itemRecord.conversionRatio) > 0 ? Number(itemRecord.conversionRatio) : 1;
        const reservedReq = reservedReqMap.get(it.itemId) || 0;
        const availableStock = Math.max(0, totalStockRemaining - Math.ceil(reservedReq));
        const totalAvailablePieces = availableStock * ratio + totalOpenRemainder;

        const isSub = it.isSubUnit === true;
        const qty = Number(it.quantity) || 1;
        const latestLot = itemRecord.stockLots[0];
        const wholeUnitCost = latestLot?.unitCost || 0;

        if (isSub) {
          const subUnitName = it.requestedUnit || itemRecord.usageUnit || 'ชิ้น';
          if (qty > totalAvailablePieces) {
            return NextResponse.json(
              {
                error: `ไม่สามารถขอเบิกเกินสต็อกพร้อมใช้ได้: วัสดุ "${itemRecord.name}" มีพร้อมเบิก ${totalAvailablePieces} ${subUnitName} (ท่านระบุ ${qty} ${subUnitName})`,
              },
              { status: 400 }
            );
          }
          const subUnitCost = ratio > 0 ? wholeUnitCost / ratio : wholeUnitCost;
          const itemTotal = qty * subUnitCost;
          estimatedReqTotalCost += itemTotal;
          reqItemsToCreate.push({
            itemId: it.itemId,
            quantityRequested: qty,
            requestedUnit: subUnitName,
            isSubUnit: true,
            unitCost: subUnitCost,
            totalCost: itemTotal,
          });
        } else {
          if (qty > availableStock) {
            return NextResponse.json(
              {
                error: `ไม่สามารถขอเบิกเกินสต็อกพร้อมใช้ได้: วัสดุ "${itemRecord.name}" มีพร้อมเบิก ${availableStock} ${itemRecord.unit} (ท่านระบุ ${qty})`,
              },
              { status: 400 }
            );
          }
          const itemTotal = qty * wholeUnitCost;
          estimatedReqTotalCost += itemTotal;
          reqItemsToCreate.push({
            itemId: it.itemId,
            quantityRequested: qty,
            requestedUnit: it.requestedUnit || itemRecord.unit,
            isSubUnit: false,
            unitCost: wholeUnitCost,
            totalCost: itemTotal,
          });
        }
      }
    }

    // 6. Execute atomic transaction to update requests and reset status to PENDING
    const result = await prisma.$transaction(
      async (tx) => {
        let updatedBorrow: any = null;
        let updatedRequisition: any = null;

        // Update Requisition Request if exists
        if (requisitionRecord) {
          // Delete old items
          await tx.requisitionItem.deleteMany({
            where: { requisitionRequestId: requisitionRecord.id },
          });

          // Update header record - reset status to PENDING
          updatedRequisition = await tx.requisitionRequest.update({
            where: { id: requisitionRecord.id },
            data: {
              courseId: courseId || null,
              advisorName: finalAdvisorName,
              purpose: purpose || requisitionRecord.purpose,
              useTarget,
              dateNeeded: dateNeeded ? new Date(dateNeeded) : requisitionRecord.dateNeeded,
              status: 'PENDING',
              approverId: null,
              approvedAt: null,
              instructorAcknowledged: false,
              acknowledgedAt: null,
              totalCost: estimatedReqTotalCost,
              items: {
                create: reqItemsToCreate,
              },
            },
            include: {
              items: { include: { item: true } },
              course: true,
              user: true,
            },
          });
        }

        // Update Borrow Request if exists
        if (borrowRecord) {
          // Delete old items
          await tx.borrowItem.deleteMany({
            where: { borrowRequestId: borrowRecord.id },
          });

          // Update header record - reset status to PENDING
          updatedBorrow = await tx.borrowRequest.update({
            where: { id: borrowRecord.id },
            data: {
              courseId: courseId || null,
              advisorName: finalAdvisorName,
              purpose: purpose || borrowRecord.purpose,
              useTarget,
              borrowDate: borrowDate ? new Date(borrowDate) : borrowRecord.borrowDate,
              expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : borrowRecord.expectedReturnDate,
              status: 'PENDING',
              approverId: null,
              approvedAt: null,
              instructorAcknowledged: false,
              acknowledgedAt: null,
              items: {
                create: validBorrowItems.map((it: any) => ({
                  itemId: it.itemId,
                  quantity: Number(it.quantity) || 1,
                })),
              },
            },
            include: {
              items: { include: { item: true, asset: true } },
              course: true,
              user: true,
            },
          });
        }

        return { updatedBorrow, updatedRequisition };
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    // 7. Invalidate caches
    invalidateCache('borrow:');
    invalidateCache('requisitions:');
    invalidateCache('items:');
    invalidateCache('dashboard:');

    // 8. Notifications
    const reqNum = borrowRecord?.requestNumber || requisitionRecord?.requestNumber || '';
    const studentUserId = primaryRecord.userId;

    // Notify student
    createNotification({
      userId: studentUserId,
      title: 'แก้ไขคำขอสำเร็จ',
      message: `คำขอเลขที่ ${reqNum} ได้รับการแก้ไขและปรับสถานะเป็น "รออนุมัติ" เรียบร้อยแล้ว`,
      type: 'STATUS_UPDATE',
      priority: 'NORMAL',
      linkUrl: borrowRecord ? '/borrow' : '/requisitions',
      entityType: borrowRecord ? 'BORROW' : 'REQUISITION',
      entityId: primaryRecord.id,
    }).catch(() => {});

    // Notify Advisor / Approver if assigned
    if (finalAdvisorName) {
      notifyAdvisorByName(finalAdvisorName, {
        title: 'คำขอพัสดุมีการแก้ไขข้อมูล',
        message: `คำขอเลขที่ ${reqNum} ของนิสิตได้รับการแก้ไขข้อมูล ระบบได้ปรับสถานะเป็น "รออนุมัติ" เพื่อให้อาจารย์ตรวจสอบข้อมูลล่าสุด`,
        type: 'REQUEST_SUBMITTED',
        priority: 'HIGH',
        linkUrl: '/approvals',
        entityType: borrowRecord ? 'BORROW' : 'REQUISITION',
        entityId: primaryRecord.id,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: 'บันทึกการแก้ไขคำขอสำเร็จ สถานะถูกปรับเป็นรออนุมัติเพื่อให้อาจารย์ตรวจสอบอีกครั้ง',
      data: result,
    });
  } catch (error: any) {
    console.error('Error in request edit:', error);
    return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการแก้ไขคำขอ' }, { status: 500 });
  }
}
