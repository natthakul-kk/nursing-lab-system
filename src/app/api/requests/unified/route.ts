import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendApprovalRequestEmail } from '@/lib/email';
import { invalidateCache } from '@/lib/cache';

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
              orderBy: { expiryDate: 'asc' },
            },
          },
        }),
        prisma.requisitionItem.groupBy({
          by: ['itemId'],
          where: {
            itemId: { in: reqItemIds },
            requisitionRequest: { status: { in: ['PENDING', 'APPROVED'] } },
          },
          _sum: { quantityRequested: true },
        }),
      ]);
      const reqMap = new Map(reqRecords.map((r) => [r.id, r]));
      const pendingReqMap = new Map(pendingReqList.map((r) => [r.itemId, r._sum.quantityRequested || 0]));

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
        const reservedReq = pendingReqMap.get(it.itemId) || 0;
        const availableStock = Math.max(0, totalStockRemaining - reservedReq);

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
                : `ไม่สามารถขอเบิกได้: วัสดุ "${itemRecord.name}" มีคงคลัง ${totalStockRemaining} ${itemRecord.unit} แต่มีคำขอรอจ่ายอยู่ ${reservedReq} ${itemRecord.unit} (คงเหลือพร้อมให้ขอได้ 0 ${itemRecord.unit})`,
            },
            { status: 400 }
          );
        }
        if (qty > availableStock) {
          return NextResponse.json(
            {
              error: useTarget === 'HUMAN'
                ? `ไม่สามารถขอเบิกเกินจำนวนที่ยังไม่หมดอายุได้: วัสดุ "${itemRecord.name}" มีสต็อกยังไม่หมดอายุพร้อมใช้เพียง ${availableStock} ${itemRecord.unit} (ท่านระบุ ${qty})`
                : `ไม่สามารถขอเบิกเกินสต็อกพร้อมใช้ได้: วัสดุ "${itemRecord.name}" มีในคลัง ${totalStockRemaining} ${itemRecord.unit} (มีคำขอรอจ่ายค้างอยู่ ${reservedReq} ${itemRecord.unit}) จึงพร้อมให้ขอได้เพียง ${availableStock} ${itemRecord.unit} (ท่านระบุ ${qty})`,
            },
            { status: 400 }
          );
        }

        const latestLot = itemRecord.stockLots[0];
        const unitCost = latestLot?.unitCost || 0;
        const itemTotal = qty * unitCost;
        estimatedReqTotalCost += itemTotal;

        reqItemsToCreate.push({
          itemId: it.itemId,
          quantityRequested: qty,
          unitCost,
          totalCost: itemTotal,
        });

        reqSummaryList.push({
          name: itemRecord.name,
          quantity: qty,
          unit: itemRecord.unit || 'หน่วย',
        });
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
    try {
      let approverEmail = '';
      let approverName = finalAdvisorName || 'อาจารย์ผู้ดูแล';

      if (finalAdvisorName) {
        const advisorUser = await prisma.user.findFirst({
          where: {
            OR: [
              { name: { contains: finalAdvisorName } },
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
        const student = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });

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
          studentName: student?.name || 'นิสิต',
          type: 'BORROW',
          title: `คำขอเบิก-ยืมพัสดุแบบรวม: ${purpose}`,
          details,
          requestId: result.createdBorrow?.id || result.createdRequisition?.id || '',
        }).catch((err) => console.error('Failed to send unified approval email:', err));
      }
    } catch (e) {
      console.error('Email notification error:', e);
    }

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
