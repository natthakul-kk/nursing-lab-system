import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendApprovalRequestEmail } from '@/lib/email';
import { invalidateCache } from '@/lib/cache';
import { notifyRoles, notifyAdvisorByName, createNotification } from '@/lib/notifications';
import { stripAllPrefixes } from '@/lib/user-utils';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userId,
      courseId,
      advisorName,
      purpose,
      useTarget = 'SIMULATION',
      borrowDate,
      expectedReturnDate,
      borrowItems = [],
      requisitionItems = [],
    } = body;

    if (!userId || !purpose) {
      return NextResponse.json(
        { error: 'กรุณาระบุข้อมูลผู้ขอ และวัตถุประสงค์การใช้งาน' },
        { status: 400 }
      );
    }

    const validBorrowItems = (borrowItems || []).filter((it: any) => it.itemId);
    const validRequisitionItems = (requisitionItems || []).filter((it: any) => it.itemId);

    const hasBorrow = validBorrowItems.length > 0;
    const hasRequisition = validRequisitionItems.length > 0;

    if (!hasBorrow && !hasRequisition) {
      return NextResponse.json(
        { error: 'กรุณาระบุรายการครุภัณฑ์ที่ต้องการยืม หรือวัสดุสิ้นเปลืองที่ต้องการเบิกอย่างน้อย 1 รายการ' },
        { status: 400 }
      );
    }

    // Determine advisor name from course or manual input
    let finalAdvisorName = advisorName || null;
    let courseInfo: any = null;
    if (courseId) {
      courseInfo = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, code: true, name: true, instructorName: true },
      });
      if (courseInfo?.instructorName && !finalAdvisorName) {
        finalAdvisorName = courseInfo.instructorName;
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    // 1. Batch validate equipment stock/available count (single roundtrip)
    const borrowSummaryList: { name: string; quantity: number; unit: string }[] = [];
    if (hasBorrow) {
      const borrowItemIds = validBorrowItems.map((it: any) => it.itemId);
      const [equipmentRecords, pendingBorrowList] = await Promise.all([
        prisma.item.findMany({
          where: { id: { in: borrowItemIds } },
          include: {
            assets: { where: { status: 'AVAILABLE' } },
          },
        }),
        prisma.borrowItem.groupBy({
          by: ['itemId'],
          where: {
            itemId: { in: borrowItemIds },
            borrowRequest: { status: { in: ['PENDING', 'APPROVED'] } },
          },
          _sum: { quantity: true },
        }),
      ]);
      const eqMap = new Map(equipmentRecords.map((r) => [r.id, r]));
      const pendingBrwMap = new Map(pendingBorrowList.map((b) => [b.itemId, b._sum.quantity || 0]));

      for (const it of validBorrowItems) {
        const qty = Number(it.quantity) || 1;
        const itemRecord = eqMap.get(it.itemId);

        if (!itemRecord) {
          return NextResponse.json({ error: 'ไม่พบข้อมูลครุภัณฑ์ในระบบ' }, { status: 400 });
        }

        const reservedCount = pendingBrwMap.get(it.itemId) || 0;
        const availableEquipment = Math.max(0, itemRecord.assets.length - reservedCount);

        if (availableEquipment <= 0) {
          return NextResponse.json(
            {
              error: `ไม่สามารถขอยืมได้: ครุภัณฑ์ "${itemRecord.name}" มีในระบบ ${itemRecord.assets.length} ชิ้น แต่มีคำขอยืมรอส่งมอบอยู่แล้ว ${reservedCount} ชิ้น (คงเหลือพร้อมให้ยืมได้ 0 ชิ้น)`,
            },
            { status: 400 }
          );
        }
        if (qty > availableEquipment) {
          return NextResponse.json(
            {
              error: `ไม่สามารถขอยืมเกินจำนวนพร้อมใช้ได้: ครุภัณฑ์ "${itemRecord.name}" มีในระบบ ${itemRecord.assets.length} ชิ้น (มีคำขอรอส่งมอบ ${reservedCount} ชิ้น) จึงพร้อมให้ยืมเพียง ${availableEquipment} ${itemRecord.unit || 'ชิ้น'} (ท่านระบุ ${qty})`,
            },
            { status: 400 }
          );
        }

        borrowSummaryList.push({
          name: itemRecord.name,
          quantity: qty,
          unit: itemRecord.unit || 'ชิ้น',
        });
      }
    }

    // 2. Batch validate consumable stock remaining (single roundtrip)
    let estimatedReqTotalCost = 0;
    const reqItemsToCreate: any[] = [];
    const reqSummaryList: { name: string; quantity: number; unit: string }[] = [];

    if (hasRequisition) {
      const reqItemIds = validRequisitionItems.map((it: any) => it.itemId);
      const [reqRecords, pendingReqList] = await Promise.all([
        prisma.item.findMany({
          where: { id: { in: reqItemIds } },
          include: {
            stockLots: {
              where: { quantityRemaining: { gt: 0 } },
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
            requisitionRequest: { status: { in: ['PENDING', 'APPROVED'] } },
          },
          select: {
            itemId: true,
            quantityRequested: true,
            isSubUnit: true,
          },
        }),
      ]);
      const reqMap = new Map(reqRecords.map((r) => [r.id, r]));
      const reservedPiecesMap = new Map<string, number>();
      for (const p of pendingReqList) {
        const itemRec = reqMap.get(p.itemId);
        const ratio = Number(itemRec?.conversionRatio) > 0 ? Number(itemRec?.conversionRatio) : 1;
        const pieces = p.isSubUnit ? p.quantityRequested : p.quantityRequested * ratio;
        reservedPiecesMap.set(p.itemId, (reservedPiecesMap.get(p.itemId) || 0) + pieces);
      }

      for (const it of validRequisitionItems) {
        const qty = Number(it.quantity) || 1;
        const itemRecord = reqMap.get(it.itemId);

        if (!itemRecord) {
          return NextResponse.json({ error: 'ไม่พบข้อมูลวัสดุในระบบ' }, { status: 400 });
        }

        // Check expiration if requested for real human patients
        const validLots = useTarget === 'HUMAN'
          ? itemRecord.stockLots.filter((lot: any) => !lot.expiryDate || new Date(lot.expiryDate) >= new Date())
          : itemRecord.stockLots;

        const totalStockRemaining = validLots.reduce((sum: number, lot: any) => sum + lot.quantityRemaining, 0);
        const totalOpenRemainder = validLots.reduce((sum: number, lot: any) => sum + (lot.openPackRemainder || 0), 0);
        const ratio = Number(itemRecord.conversionRatio) > 0 ? Number(itemRecord.conversionRatio) : 1;
        const totalPhysicalPieces = validLots.reduce((sum: number, lot: any) => {
          const pSize = Number(lot.packSize) > 0 ? Number(lot.packSize) : ratio;
          const pPieces = lot.quantityRemaining > 0
            ? (typeof lot.piecesRemaining === 'number' && lot.piecesRemaining <= lot.quantityRemaining * pSize
                ? lot.piecesRemaining
                : lot.quantityRemaining * pSize)
            : 0;
          return sum + pPieces + (lot.openPackRemainder || 0);
        }, 0);
        const reservedPieces = reservedPiecesMap.get(it.itemId) || 0;
        const totalAvailablePieces = Math.max(0, totalPhysicalPieces - reservedPieces);
        const availableStock = ratio > 1 ? Math.floor(totalAvailablePieces / ratio) : Math.max(0, totalStockRemaining - Math.ceil(reservedPieces / ratio));
        const isSub = it.isSubUnit === true;

        const latestLot = itemRecord.stockLots[0];
        const wholeUnitCost = latestLot?.unitCost || 0;

        if (isSub) {
          const subUnitName = it.requestedUnit || itemRecord.usageUnit || 'ชิ้น';
          if (totalAvailablePieces <= 0) {
            return NextResponse.json(
              {
                error: useTarget === 'HUMAN'
                  ? `ไม่สามารถขอเบิกสำหรับใช้กับคนจริงได้: วัสดุ "${itemRecord.name}" ไม่มีสต็อกที่ยังไม่หมดอายุคงเหลือในคลัง`
                  : `ไม่สามารถขอเบิกได้: วัสดุ "${itemRecord.name}" ไม่มีสต็อกพร้อมเบิกในระบบ`,
              },
              { status: 400 }
            );
          }
          if (qty > totalAvailablePieces) {
            return NextResponse.json(
              {
                error: `ไม่สามารถขอเบิกเกินสต็อกพร้อมใช้ได้: วัสดุ "${itemRecord.name}" มีพร้อมเบิก ${totalAvailablePieces} ${subUnitName} (${availableStock} ${itemRecord.unit} + เศษเปิด ${totalOpenRemainder} ${subUnitName}) (ท่านระบุ ${qty} ${subUnitName})`,
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

          reqSummaryList.push({
            name: itemRecord.name,
            quantity: qty,
            unit: subUnitName,
          });
        } else {
          const reservedPacks = Math.ceil(reservedPieces / ratio);
          if (useTarget === 'HUMAN' && totalStockRemaining <= 0) {
            return NextResponse.json(
              {
                error: `ไม่สามารถขอเบิกสำหรับใช้กับคนจริงได้: วัสดุ "${itemRecord.name}" ไม่มีสต็อกที่ยังไม่หมดอายุคงเหลือในคลัง (พบเฉพาะสต็อกหมดอายุที่อนุญาตให้ใช้ฝึกกับหุ่นเท่านั้น)`,
              },
              { status: 400 }
            );
          }

          if (availableStock <= 0) {
            return NextResponse.json(
              {
                error: useTarget === 'HUMAN'
                  ? `ไม่สามารถขอเบิกสำหรับใช้กับคนจริงได้: วัสดุ "${itemRecord.name}" มีสต็อกที่ยังไม่หมดอายุคงเหลือ 0 ${itemRecord.unit}`
                  : `ไม่สามารถขอเบิกได้: วัสดุ "${itemRecord.name}" มีคงคลัง ${totalStockRemaining} ${itemRecord.unit} แต่มีคำขอรอจ่ายอยู่ ${reservedPacks} ${itemRecord.unit} (คงเหลือพร้อมให้ขอได้ 0 ${itemRecord.unit})`,
              },
              { status: 400 }
            );
          }
          if (qty > availableStock) {
            return NextResponse.json(
              {
                error: useTarget === 'HUMAN'
                  ? `ไม่สามารถขอเบิกเกินจำนวนที่ยังไม่หมดอายุได้: วัสดุ "${itemRecord.name}" มีสต็อกยังไม่หมดอายุพร้อมใช้เพียง ${availableStock} ${itemRecord.unit} (ท่านระบุ ${qty})`
                  : `ไม่สามารถขอเบิกเกินสต็อกพร้อมใช้ได้: วัสดุ "${itemRecord.name}" มีในคลัง ${totalStockRemaining} ${itemRecord.unit} (มีคำขอรอจ่ายค้างอยู่ ${reservedPacks} ${itemRecord.unit}) จึงพร้อมให้ขอได้เพียง ${availableStock} ${itemRecord.unit} (ท่านระบุ ${qty})`,
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

          reqSummaryList.push({
            name: itemRecord.name,
            quantity: qty,
            unit: it.requestedUnit || itemRecord.unit || 'หน่วย',
          });
        }
      }
    }

    // 3. Pre-fetch request counts concurrently OUTSIDE the transaction
    const [reqCount, brwCount] = await Promise.all([
      hasRequisition ? prisma.requisitionRequest.count() : Promise.resolve(0),
      hasBorrow ? prisma.borrowRequest.count() : Promise.resolve(0),
    ]);

    const reqNumber = `REQ-${todayStr}-${String(reqCount + 1).padStart(3, '0')}`;
    const brwNumber = `BRW-${todayStr}-${String(brwCount + 1).padStart(3, '0')}`;
    const dateNeededVal = borrowDate ? new Date(borrowDate) : new Date();
    const bDateVal = borrowDate ? new Date(borrowDate) : new Date();
    const retDateVal = expectedReturnDate
      ? new Date(expectedReturnDate)
      : new Date(Date.now() + 8 * 3600 * 1000); // default 8 hrs later

    // 4. Ultra-fast database transaction with extended timeout (30s) and minimal insert payload
    const result = await prisma.$transaction(
      async (tx) => {
        let createdRequisition: any = null;
        let createdBorrow: any = null;

        if (hasRequisition) {
          createdRequisition = await tx.requisitionRequest.create({
            data: {
              requestNumber: reqNumber,
              userId,
              courseId: courseId || null,
              advisorName: finalAdvisorName,
              purpose,
              useTarget,
              dateNeeded: dateNeededVal,
              status: 'PENDING',
              totalCost: estimatedReqTotalCost,
              items: {
                create: reqItemsToCreate,
              },
            },
            select: {
              id: true,
              requestNumber: true,
              status: true,
              totalCost: true,
            },
          });
        }

        if (hasBorrow) {
          createdBorrow = await tx.borrowRequest.create({
            data: {
              requestNumber: brwNumber,
              userId,
              courseId: courseId || null,
              advisorName: finalAdvisorName,
              purpose,
              useTarget,
              borrowDate: bDateVal,
              expectedReturnDate: retDateVal,
              status: 'PENDING',
              requisitionRequestId: createdRequisition?.id || null,
              items: {
                create: validBorrowItems.map((it: any) => ({
                  itemId: it.itemId,
                  quantity: Number(it.quantity) || 1,
                })),
              },
            },
            select: {
              id: true,
              requestNumber: true,
              status: true,
              borrowDate: true,
              expectedReturnDate: true,
              requisitionRequestId: true,
            },
          });
        }

        return { createdBorrow, createdRequisition };
      },
      {
        maxWait: 15000, // 15 seconds to acquire connection
        timeout: 30000, // 30 seconds transaction execution limit
      }
    );

    // 5. Send combined approval request email to instructor/approver (asynchronous, outside transaction)
    const student = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, studentId: true, prefix: true },
    });
    const studentDisplayName = student?.name || 'นิสิต';

    try {
      let approverEmail = '';
      let approverName = finalAdvisorName || 'อาจารย์ผู้ดูแล';

      if (finalAdvisorName) {
        const cleanAdvisor = stripAllPrefixes(finalAdvisorName).trim();
        const advisorUser = await prisma.user.findFirst({
          where: {
            OR: [
              { name: { contains: cleanAdvisor, mode: 'insensitive' } },
              { name: { contains: finalAdvisorName, mode: 'insensitive' } },
              { email: { contains: 'teacher' } },
              { role: 'APPROVER' },
            ],
          },
        });
        if (advisorUser?.email) {
          approverEmail = advisorUser.email;
          approverName = advisorUser.name;
        }
      }

      if (!approverEmail) {
        const fallbackApprover = await prisma.user.findFirst({
          where: { role: 'APPROVER', status: 'ACTIVE' },
        });
        if (fallbackApprover?.email) {
          approverEmail = fallbackApprover.email;
          approverName = fallbackApprover.name;
        }
      }

      if (approverEmail) {
        const allItemsList: { name: string; quantity: number; unit?: string }[] = [
          ...borrowSummaryList.map((it) => ({
            name: `[📦 ครุภัณฑ์] ${it.name}`,
            quantity: it.quantity,
            unit: it.unit,
          })),
          ...reqSummaryList.map((it) => ({
            name: `[🧪 วัสดุสิ้นเปลือง] ${it.name}`,
            quantity: it.quantity,
            unit: it.unit,
          })),
        ];

        const dateStr = borrowDate
          ? new Date(borrowDate).toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : new Date().toLocaleDateString('th-TH');

        const refNumber =
          result.createdBorrow && result.createdRequisition
            ? `${result.createdBorrow.requestNumber} + ${result.createdRequisition.requestNumber}`
            : result.createdBorrow?.requestNumber || result.createdRequisition?.requestNumber || 'REQ';

        const details: { label: string; value: string }[] = [
          { label: 'รหัสคำขอ', value: refNumber },
          { label: 'วัตถุประสงค์', value: purpose },
        ];
        if (courseInfo) {
          details.push({ label: 'รายวิชา', value: `${courseInfo.code} ${courseInfo.name}` });
        }
        details.push({ label: 'กำหนดวันเวลาใช้งาน', value: dateStr });
        const itemsSummary = allItemsList.map((it) => `${it.name} (${it.quantity} ${it.unit})`).join(', ');
        details.push({ label: 'รายการพัสดุรวม', value: itemsSummary });

        sendApprovalRequestEmail({
          approverEmail,
          approverName,
          studentName: studentDisplayName,
          studentId: student?.studentId || undefined,
          type: 'BORROW',
          title: `คำขอเบิก-ยืมพัสดุแบบรวม: ${purpose}`,
          details,
          requestId: result.createdBorrow?.id || result.createdRequisition?.id || '',
        }).catch((err) => console.error('Failed to send unified approval email:', err));
      }
    } catch (e) {
      console.error('Email notification error:', e);
    }

    // 6. In-App & Push Notifications for Approvers and Advisors
    if (result.createdBorrow) {
      notifyRoles(
        ['OFFICER', 'ADMIN', 'APPROVER'],
        {
          templateId: 'BORROW_REQUEST_SUBMITTED',
          variables: {
            studentName: studentDisplayName,
            requestNumber: result.createdBorrow.requestNumber,
            itemSummary: purpose || `${borrowSummaryList.length} รายการ`,
          },
          title: 'มีคำขอยืมครุภัณฑ์ใหม่ 📋',
          message: `นิสิต ${studentDisplayName} ยื่นคำขอยืมเลขที่ ${result.createdBorrow.requestNumber} (${purpose})`,
          type: 'APPROVAL',
          linkUrl: '/approvals',
          entityType: 'BORROW',
          entityId: result.createdBorrow.id,
          priority: 'HIGH',
        },
        'BORROW'
      ).catch((err) => console.error('Failed to notify borrow roles:', err));

      if (finalAdvisorName) {
        notifyAdvisorByName(finalAdvisorName, {
          title: 'มีคำขอยืมครุภัณฑ์รอกดรับทราบ 👩‍🏫',
          message: `นิสิต ${studentDisplayName} ยื่นคำขอยืมเลขที่ ${result.createdBorrow.requestNumber} ${courseInfo ? `ในรายวิชา ${courseInfo.name}` : ''} รออาจารย์รับทราบ`,
          type: 'REQUEST_SUBMITTED',
          priority: 'HIGH',
          linkUrl: '/approvals',
          entityType: 'BORROW',
          entityId: result.createdBorrow.id,
        }).catch((err) => console.error('Failed to notify borrow advisor:', err));
      }
    }

    if (result.createdRequisition) {
      notifyRoles(
        ['OFFICER', 'ADMIN', 'APPROVER'],
        {
          templateId: 'REQUISITION_REQUEST_SUBMITTED',
          variables: {
            studentName: studentDisplayName,
            requestNumber: result.createdRequisition.requestNumber,
            itemSummary: purpose || `${reqSummaryList.length} รายการ`,
          },
          title: 'มีคำขอเบิกพัสดุใหม่ 📋',
          message: `นิสิต ${studentDisplayName} ยื่นคำขอเบิกเลขที่ ${result.createdRequisition.requestNumber} (${purpose})`,
          type: 'APPROVAL',
          linkUrl: '/approvals',
          entityType: 'REQUISITION',
          entityId: result.createdRequisition.id,
          priority: 'HIGH',
        },
        'REQUISITION'
      ).catch((err) => console.error('Failed to notify requisition roles:', err));

      if (finalAdvisorName) {
        notifyAdvisorByName(finalAdvisorName, {
          title: 'มีคำขอเบิกพัสดุรอกดรับทราบ 👩‍🏫',
          message: `นิสิต ${studentDisplayName} ยื่นคำขอเบิกเลขที่ ${result.createdRequisition.requestNumber} ${courseInfo ? `ในรายวิชา ${courseInfo.name}` : ''} รออาจารย์รับทราบ`,
          type: 'REQUEST_SUBMITTED',
          priority: 'HIGH',
          linkUrl: '/approvals',
          entityType: 'REQUISITION',
          entityId: result.createdRequisition.id,
        }).catch((err) => console.error('Failed to notify requisition advisor:', err));
      }
    }

    // Confirmation notification to Student
    const combinedRefNumber =
      result.createdBorrow && result.createdRequisition
        ? `${result.createdBorrow.requestNumber} + ${result.createdRequisition.requestNumber}`
        : result.createdBorrow?.requestNumber || result.createdRequisition?.requestNumber || 'REQ';

    createNotification({
      userId,
      title: 'ยื่นคำขอเรียบร้อยแล้ว ✅',
      message: `คำขอเลขที่ ${combinedRefNumber} ของท่านถูกส่งเข้าสู่ระบบแล้ว และอยู่ระหว่างรอการอนุมัติ`,
      type: 'STATUS_UPDATE',
      priority: 'NORMAL',
      linkUrl: result.createdBorrow ? '/borrow' : '/requisitions',
      entityType: result.createdBorrow ? 'BORROW' : 'REQUISITION',
      entityId: result.createdBorrow?.id || result.createdRequisition?.id,
    }).catch(() => {});

    // Invalidate caches so other screens immediately reflect updated reservations
    invalidateCache('borrow:');
    invalidateCache('requisitions:');
    invalidateCache('items:');
    invalidateCache('dashboard:');

    return NextResponse.json({
      success: true,
      message: 'บันทึกคำขอเบิก-ยืมพัสดุเรียบร้อยแล้ว',
      borrow: result.createdBorrow,
      requisition: result.createdRequisition,
      isUnified: !!(result.createdBorrow && result.createdRequisition),
    });
  } catch (error: any) {
    console.error('Failed to process unified request:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการประมวลผลคำขอรวม' },
      { status: 500 }
    );
  }
}
