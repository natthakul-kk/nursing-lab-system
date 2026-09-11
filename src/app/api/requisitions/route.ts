import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

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
        select: { id: true, name: true, role: true },
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

      // Verify item existence and remaining stock across lots
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

      // Check active reservations (PENDING & APPROVED) to calculate availableStock
      const pendingReq = await prisma.requisitionItem.aggregate({
        where: {
          itemId: it.itemId,
          requisitionRequest: { status: { in: ['PENDING', 'APPROVED'] } },
        },
        _sum: { quantityRequested: true },
      });
      const reservedReq = pendingReq._sum.quantityRequested || 0;
      const availableStock = Math.max(0, totalStockRemaining - reservedReq);

      if (availableStock <= 0) {
        return NextResponse.json(
          {
            error: `ไม่สามารถขอเบิกได้: วัสดุ "${itemRecord.name}" มีในคลัง ${totalStockRemaining} ${itemRecord.unit} แต่มีคำขอรอจ่ายอยู่ ${reservedReq} ${itemRecord.unit} (คงเหลือพร้อมให้ขอได้ 0 ${itemRecord.unit})`,
          },
          { status: 400 }
        );
      }

      if (qty > availableStock) {
        return NextResponse.json(
          {
            error: `ไม่สามารถขอเบิกเกินสต็อกพร้อมใช้ได้: วัสดุ "${itemRecord.name}" มีในคลัง ${totalStockRemaining} ${itemRecord.unit} (มีคำขอรอจ่ายค้างอยู่ ${reservedReq} ${itemRecord.unit}) จึงพร้อมให้ขอได้เพียง ${availableStock} ${itemRecord.unit} (ท่านระบุ ${qty})`,
          },
          { status: 400 }
        );
      }

      const latestLot = itemRecord.stockLots[0];
      const unitCost = latestLot?.unitCost || 0;
      const itemTotal = qty * unitCost;
      estimatedTotalCost += itemTotal;

      itemsToCreate.push({
        itemId: it.itemId,
        quantityRequested: qty,
        unitCost,
        totalCost: itemTotal,
      });
    }

    // Find course instructor name if not provided
    let advisorName = customAdvisorName || null;
    if (!advisorName && courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorName: true },
      });
      if (course?.instructorName) {
        advisorName = course.instructorName;
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

    invalidateCache('requisitions:');
    invalidateCache('dashboard:');
    invalidateCache('items:');
    return NextResponse.json(reqRecord, { status: 201 });
  } catch (error: any) {
    console.error('Create requisition error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create requisition' }, { status: 500 });
  }
}
