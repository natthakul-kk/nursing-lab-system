import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendApprovalRequestEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userId,
      courseId,
      advisorName,
      purpose,
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

    const hasBorrow = Array.isArray(borrowItems) && borrowItems.length > 0 && borrowItems.some((it) => it.itemId);
    const hasRequisition = Array.isArray(requisitionItems) && requisitionItems.length > 0 && requisitionItems.some((it) => it.itemId);

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

    // 1. Validate equipment stock/available count
    const validBorrowItems = (borrowItems || []).filter((it: any) => it.itemId);
    for (const it of validBorrowItems) {
      const qty = Number(it.quantity) || 1;
      const itemRecord = await prisma.item.findUnique({
        where: { id: it.itemId },
        include: {
          assets: { where: { status: 'AVAILABLE' } },
        },
      });

      if (!itemRecord) {
        return NextResponse.json({ error: `ไม่พบข้อมูลครุภัณฑ์ในระบบ` }, { status: 400 });
      }

      const availableCount = itemRecord.assets.length;
      if (availableCount <= 0) {
        return NextResponse.json(
          { error: `ไม่สามารถขอยืมได้: ครุภัณฑ์ "${itemRecord.name}" ไม่มีอุปกรณ์ที่พร้อมใช้งานในขณะนี้` },
          { status: 400 }
        );
      }
      if (qty > availableCount) {
        return NextResponse.json(
          {
            error: `ไม่สามารถขอยืมเกินจำนวนพร้อมใช้ได้: ครุภัณฑ์ "${itemRecord.name}" มีพร้อมให้ยืมเพียง ${availableCount} ${itemRecord.unit || 'ชิ้น'} (ท่านระบุ ${qty})`,
          },
          { status: 400 }
        );
      }
    }

    // 2. Validate consumable stock remaining
    const validRequisitionItems = (requisitionItems || []).filter((it: any) => it.itemId);
    let estimatedReqTotalCost = 0;
    const reqItemsToCreate: any[] = [];

    for (const it of validRequisitionItems) {
      const qty = Number(it.quantity) || 1;
      const itemRecord = await prisma.item.findUnique({
        where: { id: it.itemId },
        include: {
          stockLots: {
            where: { quantityRemaining: { gt: 0 } },
            orderBy: { expiryDate: 'asc' },
          },
        },
      });

      if (!itemRecord) {
        return NextResponse.json({ error: `ไม่พบข้อมูลวัสดุในระบบ` }, { status: 400 });
      }

      const totalStockRemaining = itemRecord.stockLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);
      if (totalStockRemaining <= 0) {
        return NextResponse.json(
          { error: `ไม่สามารถขอเบิกได้: วัสดุ "${itemRecord.name}" สินค้าหมดในคลัง (คงเหลือ 0 ${itemRecord.unit})` },
          { status: 400 }
        );
      }
      if (qty > totalStockRemaining) {
        return NextResponse.json(
          {
            error: `ไม่สามารถขอเบิกเกินสต็อกได้: วัสดุ "${itemRecord.name}" มีคงเหลือในคลังเพียง ${totalStockRemaining} ${itemRecord.unit} (ท่านระบุ ${qty})`,
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
    }

    // 3. Database transaction: create requisition (if any) and borrow (if any) linked together
    const result = await prisma.$transaction(async (tx) => {
      let createdRequisition: any = null;
      let createdBorrow: any = null;

      if (hasRequisition) {
        const reqCount = await tx.requisitionRequest.count();
        const reqNumber = `REQ-${todayStr}-${String(reqCount + 1).padStart(3, '0')}`;
        const dateNeededVal = borrowDate ? new Date(borrowDate) : new Date();

        createdRequisition = await tx.requisitionRequest.create({
          data: {
            requestNumber: reqNumber,
            userId,
            courseId: courseId || null,
            advisorName: finalAdvisorName,
            purpose,
            dateNeeded: dateNeededVal,
            status: 'PENDING',
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

      if (hasBorrow) {
        const brwCount = await tx.borrowRequest.count();
        const brwNumber = `BRW-${todayStr}-${String(brwCount + 1).padStart(3, '0')}`;
        const bDateVal = borrowDate ? new Date(borrowDate) : new Date();
        const retDateVal = expectedReturnDate
          ? new Date(expectedReturnDate)
          : new Date(Date.now() + 8 * 3600 * 1000); // default 8 hrs later

        createdBorrow = await tx.borrowRequest.create({
          data: {
            requestNumber: brwNumber,
            userId,
            courseId: courseId || null,
            advisorName: finalAdvisorName,
            purpose,
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
          include: {
            items: { include: { item: true } },
            course: true,
            user: true,
          },
        });
      }

      return { createdBorrow, createdRequisition };
    });

    // 4. Send combined approval request email to instructor/approver
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

        // Collect item names from both borrow and requisition
        const allItemsList: { name: string; quantity: number; unit?: string; type?: string }[] = [];
        if (result.createdBorrow?.items) {
          result.createdBorrow.items.forEach((it: any) => {
            allItemsList.push({
              name: `[📦 ครุภัณฑ์] ${it.item?.name || 'ครุภัณฑ์'}`,
              quantity: it.quantity,
              unit: it.item?.unit || 'ชิ้น',
            });
          });
        }
        if (result.createdRequisition?.items) {
          result.createdRequisition.items.forEach((it: any) => {
            allItemsList.push({
              name: `[🧪 วัสดุสิ้นเปลือง] ${it.item?.name || 'วัสดุ'}`,
              quantity: it.quantityRequested,
              unit: it.item?.unit || 'หน่วย',
            });
          });
        }

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
