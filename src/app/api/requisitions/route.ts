import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const courseId = searchParams.get('courseId');
    const userId = searchParams.get('userId');

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

    return NextResponse.json(requisitionsWithOfficer);
  } catch (error) {
    console.error('Failed to get requisitions:', error);
    return NextResponse.json({ error: 'Failed to fetch requisitions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, courseId, purpose, dateNeeded, items } = body;

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

      if (totalStockRemaining <= 0) {
        return NextResponse.json(
          { error: `ไม่สามารถขอเบิกได้: วัสดุ "${itemRecord.name}" สินค้าหมดในคลัง (คงเหลือ 0 ${itemRecord.unit})` },
          { status: 400 }
        );
      }

      if (qty > totalStockRemaining) {
        return NextResponse.json(
          {
            error: `ไม่สามารถขอเบิกเกินสต็อกได้: วัสดุ "${itemRecord.name}" มีคงเหลือในคลังเพียง ${totalStockRemaining} ${itemRecord.unit} (ท่านระบุ ${qty} ${itemRecord.unit})`,
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

    // Find course instructor name
    let advisorName = null;
    if (courseId) {
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

    return NextResponse.json(reqRecord, { status: 201 });
  } catch (error: any) {
    console.error('Create requisition error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create requisition' }, { status: 500 });
  }
}
