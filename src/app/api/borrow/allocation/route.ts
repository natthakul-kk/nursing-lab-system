import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';

// GET: ดึงรายการจัดสรรประจำรายวิชาทั้งหมด
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const courseId = searchParams.get('courseId');

    const where: any = {
      requestType: 'COURSE_ALLOCATION',
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (courseId) {
      where.courseId = courseId;
    }

    const allocations = await prisma.borrowRequest.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, role: true, email: true },
        },
        course: true,
        items: {
          include: {
            item: true,
            asset: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(allocations);
  } catch (err: any) {
    console.error('Fetch Allocations Error:', err);
    return NextResponse.json(
      { error: err.message || 'เกิดข้อผิดพลาดในการโหลดรายการจัดสรร' },
      { status: 500 }
    );
  }
}

// POST: สร้างและจ่ายการจัดสรรครุภัณฑ์ประจำวิชาตลอดภาคการศึกษา
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      courseId,
      advisorName,
      purpose,
      targetLocation,
      borrowDate,
      expectedReturnDate,
      assetIds,
      operatorId,
    } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'กรุณาเลือกระบุรายวิชา' }, { status: 400 });
    }

    if (!targetLocation || !targetLocation.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุห้องปฏิบัติการหรือสถานที่ติดตั้ง' }, { status: 400 });
    }

    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json({ error: 'กรุณาเลือกอุปกรณ์หรือหุ่นจำลองอย่างน้อย 1 รายการ' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลรายวิชานี้ในระบบ' }, { status: 404 });
    }

    // กำหนดผู้สร้างรายการ (หากไม่ระบุ ให้ใช้อาจารย์ผู้ประสานงาน หรือผู้ดำเนินการ)
    const effectiveUserId =
      operatorId ||
      (await prisma.user.findFirst({ where: { role: 'ADMIN' } }))?.id;

    if (!effectiveUserId) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้สำหรับบันทึกรายการ' }, { status: 400 });
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const requestNumber = `ALC-${course.code}-${dateStr}-${randomSuffix}`;

    const startDate = borrowDate ? new Date(borrowDate) : new Date();
    const endDate = expectedReturnDate ? new Date(expectedReturnDate) : new Date(Date.now() + 120 * 24 * 60 * 60 * 1000); // 4 เดือน

    const result = await prisma.$transaction(async (tx) => {
      // 1. สร้าง BorrowRequest แบบ COURSE_ALLOCATION
      const allocation = await tx.borrowRequest.create({
        data: {
          requestNumber,
          userId: effectiveUserId,
          courseId: course.id,
          advisorName: advisorName || course.instructorName || null,
          purpose: purpose || `จัดสรรครุภัณฑ์ประจำวิชา ${course.code} ณ ${targetLocation.trim()}`,
          targetLocation: targetLocation.trim(),
          borrowDate: startDate,
          expectedReturnDate: endDate,
          status: 'BORROWED',
          requestType: 'COURSE_ALLOCATION',
          approvedAt: startDate,
          checkedOutAt: startDate,
          officerId: operatorId || null,
        },
      });

      // 2. ปรับปรุงสถานะและที่ตั้งของครุภัณฑ์รายชิ้น
      const createdItems: any[] = [];
      for (const assetId of assetIds) {
        const asset = await tx.equipmentAsset.findUnique({
          where: { id: assetId },
          include: { item: true },
        });

        if (asset) {
          const prevLoc = asset.location || 'คลังพัสดุหลัก';

          // อัปเดตตำแหน่งและสถานะของชิ้นอุปกรณ์
          await tx.equipmentAsset.update({
            where: { id: asset.id },
            data: {
              status: 'IN_COURSE_USE',
              previousLocation: prevLoc,
              location: `${targetLocation.trim()} (ประจำวิชา ${course.code})`,
            },
          });

          // บันทึกรายการยืม
          const bItem = await tx.borrowItem.create({
            data: {
              borrowRequestId: allocation.id,
              itemId: asset.itemId,
              assetId: asset.id,
              previousLocation: prevLoc,
              quantity: 1,
              isReturned: false,
            },
            include: {
              asset: true,
              item: true,
            },
          });

          createdItems.push(bItem);
        }
      }

      return {
        ...allocation,
        items: createdItems,
      };
    });

    invalidateCache('borrow:list');
    invalidateCache('items:list');
    invalidateCache('dashboard:stats');

    return NextResponse.json({
      success: true,
      allocation: result,
    });
  } catch (err: any) {
    console.error('Create Allocation Error:', err);
    return NextResponse.json(
      { error: err.message || 'เกิดข้อผิดพลาดในการสร้างคำขอจัดสรรประจำวิชา' },
      { status: 500 }
    );
  }
}

// PUT: ดำเนินการตรวจรับคืนเข้าคลังทั้งหมด (Bulk Return & Reclaim at Semester End)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { borrowRequestId, itemConditions = {}, returnNote, operatorId } = body;

    if (!borrowRequestId) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสการจัดสรร' }, { status: 400 });
    }

    const allocation = await prisma.borrowRequest.findUnique({
      where: { id: borrowRequestId },
      include: {
        course: true,
        items: {
          include: {
            asset: true,
            item: true,
          },
        },
      },
    });

    if (!allocation) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลการจัดสรรนี้' }, { status: 404 });
    }

    const now = new Date();
    let hasDamaged = false;

    await prisma.$transaction(async (tx) => {
      for (const item of allocation.items) {
        if (!item.isReturned && item.asset) {
          const cond = itemConditions[item.asset.id] || 'GOOD';
          if (cond === 'DAMAGED') hasDamaged = true;

          // 1. อัปเดตรายการยืม
          await tx.borrowItem.update({
            where: { id: item.id },
            data: {
              isReturned: true,
              returnCondition: cond,
            },
          });

          // 2. คืนสถานะและย้าย Location กลับคลังเดิม
          const originalLocation = item.previousLocation || item.asset.previousLocation || 'คลังพัสดุหลัก';

          if (cond === 'DAMAGED') {
            await tx.equipmentAsset.update({
              where: { id: item.asset.id },
              data: {
                status: 'MAINTENANCE',
                condition: 'DAMAGED',
                location: originalLocation,
                previousLocation: null,
              },
            });

            await tx.maintenanceLog.create({
              data: {
                assetId: item.asset.id,
                issue: `ตรวจพบชำรุดหลังส่งคืนจากการจัดสรรวิชา ${allocation.course?.code || 'ทั่วไป'}`,
                sentDate: now,
                status: 'UNDER_REPAIR',
                handledById: operatorId || null,
              },
            });
          } else {
            await tx.equipmentAsset.update({
              where: { id: item.asset.id },
              data: {
                status: 'AVAILABLE',
                condition: 'GOOD',
                location: originalLocation,
                previousLocation: null,
              },
            });
          }
        }
      }

      // 3. ปิดสถานะใบจัดสรร
      await tx.borrowRequest.update({
        where: { id: allocation.id },
        data: {
          status: hasDamaged ? 'RETURNED_WITH_ISSUE' : 'RETURNED_COMPLETE',
          actualReturnDate: now,
          returnNote: returnNote || 'ตรวจรับคืนเข้าคลังทั้งหมดสมบูรณ์เมื่อสิ้นสุดภาคการศึกษา',
        },
      });
    });

    invalidateCache('borrow:list');
    invalidateCache('items:list');
    invalidateCache('dashboard:stats');

    return NextResponse.json({
      success: true,
      message: 'ตรวจรับคืนครุภัณฑ์เข้าคลังทั้งหมดเรียบร้อยแล้ว',
    });
  } catch (err: any) {
    console.error('Bulk Return Allocation Error:', err);
    return NextResponse.json(
      { error: err.message || 'เกิดข้อผิดพลาดในการตรวจรับคืนอุปกรณ์' },
      { status: 500 }
    );
  }
}
