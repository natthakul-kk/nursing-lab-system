import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST: Quick Request for a Practice Kit (Generates Borrow and/or Requisition requests)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      kitId,
      setsRequested, // จำนวนชุดที่ต้องการ เช่น 10 ชุด
      userId,
      courseId,
      purpose,
      borrowDate,
      expectedReturnDate,
      advisorName,
    } = body;

    if (!kitId || !setsRequested || setsRequested < 1) {
      return NextResponse.json(
        { error: 'กรุณาระบุชุดฝึกและจำนวนชุดที่ต้องการ (อย่างน้อย 1 ชุด)' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' }, { status: 401 });
    }

    const kit = await prisma.practiceKit.findUnique({
      where: { id: kitId },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!kit) {
      return NextResponse.json({ error: 'ไม่พบชุดฝึกปฏิบัติการที่เลือก' }, { status: 404 });
    }

    const equipmentItems: { itemId: string; quantity: number }[] = [];
    const consumableItems: { itemId: string; quantity: number }[] = [];

    kit.items.forEach((kitItem) => {
      const totalQty = kitItem.quantity * setsRequested;
      if (kitItem.item.type === 'EQUIPMENT') {
        equipmentItems.push({ itemId: kitItem.itemId, quantity: totalQty });
      } else {
        consumableItems.push({ itemId: kitItem.itemId, quantity: totalQty });
      }
    });

    let createdBorrow = null;
    let createdRequisition = null;

    const defaultBorrowDate = borrowDate ? new Date(borrowDate) : new Date();
    const defaultReturnDate = expectedReturnDate
      ? new Date(expectedReturnDate)
      : new Date(Date.now() + 4 * 60 * 60 * 1000); // default 4 hours

    const fullPurpose = 'ขอใช้ชุดฝึก: ' + kit.name + ' (' + setsRequested + ' ชุด) - ' + (purpose || 'สำหรับการฝึกปฏิบัติการเรียนการสอน');

    // 1. Create Borrow Request if equipment present
    if (equipmentItems.length > 0) {
      const count = await prisma.borrowRequest.count();
      const requestNumber = 'BR-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');

      createdBorrow = await prisma.borrowRequest.create({
        data: {
          requestNumber,
          userId,
          courseId: courseId || null,
          purpose: fullPurpose,
          borrowDate: defaultBorrowDate,
          expectedReturnDate: defaultReturnDate,
          advisorName: advisorName || null,
          status: 'PENDING',
          items: {
            create: equipmentItems.map((eq) => ({
              itemId: eq.itemId,
              quantity: eq.quantity,
            })),
          },
        },
        include: { items: true },
      });
    }

    // 2. Create Requisition Request if consumables present
    if (consumableItems.length > 0) {
      // Get or fallback course
      let validCourseId = courseId;
      if (!validCourseId) {
        const firstCourse = await prisma.course.findFirst();
        validCourseId = firstCourse?.id || '';
      }

      if (validCourseId) {
        const count = await prisma.requisitionRequest.count();
        const requestNumber = 'RQ-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');

        createdRequisition = await prisma.requisitionRequest.create({
          data: {
            requestNumber,
            userId,
            courseId: validCourseId,
            purpose: fullPurpose,
            dateNeeded: defaultBorrowDate,
            advisorName: advisorName || null,
            status: 'PENDING',
            items: {
              create: consumableItems.map((cs) => ({
                itemId: cs.itemId,
                quantityRequested: cs.quantity,
              })),
            },
          },
          include: { items: true },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'ยื่นคำขอชุดฝึกปฏิบัติการสำเร็จ (' + setsRequested + ' ชุด)',
      borrowRequest: createdBorrow,
      requisitionRequest: createdRequisition,
    });
  } catch (error: any) {
    console.error('Kit Quick Request Error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการยื่นคำขอชุดฝึกปฏิบัติการ' },
      { status: 500 }
    );
  }
}