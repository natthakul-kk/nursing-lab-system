import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCached, setCached, invalidateCache } from '@/lib/cache';
import { formatTeacherName } from '@/lib/user-utils';
import { notifyRoles, notifyAdvisorByName } from '@/lib/notifications';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const courseId = searchParams.get('courseId');
    const userId = searchParams.get('userId');

    const cacheKey = `requisitions:list:${status || 'ALL'}:${courseId || 'ALL'}:${userId || 'ALL'}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const where: any = {};
    if (status) where.status = status;
    if (courseId) where.courseId = courseId;
    if (userId) where.userId = userId;

    const requisitions = await prisma.requisitionRequest.findMany({
      where,
      include: {
        user: true,
        course: true,
        approver: true,
        borrowRequest: {
          include: {
            items: {
              include: {
                item: true,
                asset: true,
              },
            },
          },
        },
        items: {
          include: {
            item: {
              include: {
                storageLocation: true,
                stockLots: {
                  where: { quantityRemaining: { gt: 0 } },
                  orderBy: { expiryDate: 'asc' },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Populate officer details for dispense logs
    const officerIds = Array.from(new Set(requisitions.map((r: any) => r.officerId).filter(Boolean))) as string[];
    let officerMap = new Map<string, any>();
    if (officerIds.length > 0) {
      const officers = await prisma.user.findMany({
        where: { id: { in: officerIds } },
        select: { id: true, name: true, prefix: true, role: true },
      });
      officers.forEach((o) => officerMap.set(o.id, o));
    }

    const requisitionsWithOfficer = requisitions.map((r: any) => ({
      ...r,
      officer: r.officerId ? officerMap.get(r.officerId) || null : null,
    }));

    setCached(cacheKey, requisitionsWithOfficer, 15); // 15s cache
    return NextResponse.json(requisitionsWithOfficer);
  } catch (error) {
    console.error('Failed to get requisitions:', error);
    return NextResponse.json({ error: 'Failed to fetch requisitions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, courseId, advisorName: customAdvisorName, purpose, dateNeeded, items } = body;

    if (!userId || !courseId || !purpose || !dateNeeded || !items || items.length === 0) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.requisitionRequest.count();
    const requestNumber = `REQ-${todayStr}-${String(count + 1).padStart(3, '0')}`;

    // Compute estimated cost based on lowest available lot unitCost and check stock availability
    let estimatedTotalCost = 0;
    const itemsToCreate = [];

    for (const it of items) {
      const qty = Number(it.quantity) || 1;
      const isSub = it.isSubUnit === true;

      // Verify item existence and remaining stock across lots
      const itemRecord = await prisma.item.findUnique({
        where: { id: it.itemId },
        include: {
          stockLots: {
            where: {
              OR: [
                { quantityRemaining: { gt: 0 } },
                { openPackRemainder: { gt: 0 } },
              ],
            },
            orderBy: [
              { expiryDate: 'asc' },
              { receivedDate: 'asc' },
              { createdAt: 'asc' },
            ],
          },
        },
      });

      if (!itemRecord) {
        return NextResponse.json({ error: `ไม่พบข้อมูลวัสดุในระบบ` }, { status: 400 });
      }

      const totalStockRemaining = itemRecord.stockLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);
      const totalOpenRemainder = itemRecord.stockLots.reduce((sum, lot) => sum + (lot.openPackRemainder || 0), 0);
      const ratio = Number(itemRecord.conversionRatio) > 0 ? Number(itemRecord.conversionRatio) : 1;

      // Check active reservations (PENDING & APPROVED) to calculate availableStock
      const pendingReqList = await prisma.requisitionItem.findMany({
        where: {
          itemId: it.itemId,
          requisitionRequest: { status: { in: ['PENDING', 'APPROVED'] } },
        },
        select: { quantityRequested: true, isSubUnit: true },
      });
      const reservedPieces = pendingReqList.reduce((sum, p) => {
        return sum + (p.isSubUnit ? p.quantityRequested : p.quantityRequested * ratio);
      }, 0);

      const totalPhysicalPieces = (totalStockRemaining * ratio) + totalOpenRemainder;
      const totalAvailablePieces = Math.max(0, totalPhysicalPieces - reservedPieces);
      const availableWholeStock = Math.floor(totalAvailablePieces / ratio);

      const latestLot = itemRecord.stockLots[0];
      const wholeUnitCost = latestLot?.unitCost || 0;

      if (isSub) {
        // Sub-unit validation (เช่น อัน/ชิ้น)
        const subUnitName = it.requestedUnit || itemRecord.usageUnit || 'ชิ้น';
        if (totalAvailablePieces <= 0) {
          return NextResponse.json(
            {
              error: `ไม่สามารถขอเบิกได้: วัสดุ "${itemRecord.name}" ไม่มีสต็อกพร้อมเบิกในระบบ`,
            },
            { status: 400 }
          );
        }
        if (qty > totalAvailablePieces) {
          return NextResponse.json(
            {
              error: `ไม่สามารถขอเบิกเกินสต็อกพร้อมใช้ได้: วัสดุ "${itemRecord.name}" มีพร้อมเบิก ${totalAvailablePieces} ${subUnitName} (${availableWholeStock} ${itemRecord.unit} + เศษเปิด ${totalOpenRemainder} ${subUnitName}) (ท่านระบุ ${qty} ${subUnitName})`,
            },
            { status: 400 }
          );
        }

        const subUnitCost = ratio > 0 ? wholeUnitCost / ratio : wholeUnitCost;
        const itemTotal = qty * subUnitCost;
        estimatedTotalCost += itemTotal;

        itemsToCreate.push({
          itemId: it.itemId,
          quantityRequested: qty,
          requestedUnit: subUnitName,
          isSubUnit: true,
          unitCost: subUnitCost,
          totalCost: itemTotal,
        });
      } else {
        // Whole pack validation (เช่น แพ็ค/กล่อง)
        const reservedPacks = Math.ceil(reservedPieces / ratio);
        if (availableWholeStock <= 0) {
          return NextResponse.json(
            {
              error: `ไม่สามารถขอเบิกได้: วัสดุ "${itemRecord.name}" มีในคลัง ${totalStockRemaining} ${itemRecord.unit} แต่มีคำขอรอจ่ายอยู่ ${reservedPacks} ${itemRecord.unit} (คงเหลือพร้อมให้ขอได้ 0 ${itemRecord.unit})`,
            },
            { status: 400 }
          );
        }
        if (qty > availableWholeStock) {
          return NextResponse.json(
            {
              error: `ไม่สามารถขอเบิกเกินสต็อกพร้อมใช้ได้: วัสดุ "${itemRecord.name}" มีในคลัง ${totalStockRemaining} ${itemRecord.unit} (มีคำขอรอจ่ายค้างอยู่ ${reservedPacks} ${itemRecord.unit}) จึงพร้อมให้ขอได้เพียง ${availableWholeStock} ${itemRecord.unit} (ท่านระบุ ${qty})`,
            },
            { status: 400 }
          );
        }

        const itemTotal = qty * wholeUnitCost;
        estimatedTotalCost += itemTotal;

        itemsToCreate.push({
          itemId: it.itemId,
          quantityRequested: qty,
          requestedUnit: it.requestedUnit || itemRecord.unit,
          isSubUnit: false,
          unitCost: wholeUnitCost,
          totalCost: itemTotal,
        });
      }
    }

    // Find course instructor name if not provided
    let advisorName = customAdvisorName ? formatTeacherName(customAdvisorName) : null;
    if (!advisorName && courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorName: true },
      });
      if (course?.instructorName) {
        advisorName = formatTeacherName(course.instructorName);
      }
    }

    const reqRecord = await prisma.requisitionRequest.create({
      data: {
        requestNumber,
        userId,
        courseId,
        advisorName,
        purpose,
        dateNeeded: new Date(dateNeeded),
        status: 'PENDING',
        totalCost: estimatedTotalCost,
        items: {
          create: itemsToCreate,
        },
      },
      include: {
        items: { include: { item: true } },
        course: true,
        user: true,
      },
    });

    // In-app & Push notifications
    notifyRoles(['OFFICER', 'ADMIN', 'APPROVER'], {
      templateId: 'REQUISITION_REQUEST_SUBMITTED',
      variables: {
        studentName: reqRecord.user?.name || '',
        requestNumber: reqRecord.requestNumber,
        itemSummary: reqRecord.purpose || `${items.length} รายการ`,
      },
      title: 'มีคำขอเบิกพัสดุใหม่ 📋',
      message: `นิสิต ${reqRecord.user?.name || ''} ยื่นคำขอเบิกเลขที่ ${reqRecord.requestNumber} (${reqRecord.purpose})`,
      type: 'APPROVAL',
      linkUrl: '/approvals',
      entityType: 'REQUISITION',
      entityId: reqRecord.id,
      priority: 'HIGH',
    }, 'REQUISITION').catch(() => {});

    if (advisorName) {
      notifyAdvisorByName(advisorName, {
        title: 'มีคำขอเบิกพัสดุรอกดรับทราบ 👩‍🏫',
        message: `นิสิต ${reqRecord.user?.name || ''} ยื่นคำขอเบิกเลขที่ ${reqRecord.requestNumber} ในรายวิชา ${reqRecord.course?.name || ''} รออาจารย์รับทราบ`,
        type: 'REQUEST_SUBMITTED',
        priority: 'HIGH',
        linkUrl: '/approvals',
        entityType: 'REQUISITION',
        entityId: reqRecord.id,
      }).catch(() => {});
    }

    invalidateCache('requisitions:');
    invalidateCache('dashboard:');
    invalidateCache('items:');
    return NextResponse.json(reqRecord, { status: 201 });
  } catch (error: any) {
    console.error('Create requisition error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create requisition' }, { status: 500 });
  }
}
