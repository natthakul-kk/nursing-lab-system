import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendApprovalRequestEmail } from '@/lib/email';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    const cacheKey = `borrow:list:${status || 'ALL'}:${userId || 'ALL'}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const requests = await prisma.borrowRequest.findMany({
      where,
      include: {
        user: true,
        course: true,
        approver: true,
        items: {
          include: {
            item: true,
            asset: true,
          },
        },
        requisitionRequest: {
          include: {
            items: {
              include: {
                item: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Populate officer details for checkout & return logs
    const officerIds = Array.from(new Set(requests.map((r: any) => r.officerId).filter(Boolean))) as string[];
    let officerMap = new Map<string, any>();
    if (officerIds.length > 0) {
      const officers = await prisma.user.findMany({
        where: { id: { in: officerIds } },
        select: { id: true, name: true, role: true },
      });
      officers.forEach((o) => officerMap.set(o.id, o));
    }

    const requestsWithOfficer = requests.map((r: any) => ({
      ...r,
      officer: r.officerId ? officerMap.get(r.officerId) || null : null,
    }));

    setCached(cacheKey, requestsWithOfficer, 15); // 15s cache
    return NextResponse.json(requestsWithOfficer);
  } catch (error) {
    console.error('Failed to get borrow requests:', error);
    return NextResponse.json({ error: 'Failed to fetch borrow requests' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, courseId, purpose, borrowDate, expectedReturnDate, items, advisorName } = body;

    if (!userId || !purpose || !borrowDate || !expectedReturnDate || !items || items.length === 0) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    // Determine final advisorName: use provided advisorName, or fallback to course instructor
    let finalAdvisorName = advisorName || null;
    if (!finalAdvisorName && courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorName: true },
      });
      if (course?.instructorName) {
        finalAdvisorName = course.instructorName;
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.borrowRequest.count();
    const requestNumber = `BRW-${todayStr}-${String(count + 1).padStart(3, '0')}`;

    // Validate that requested equipment items have enough available assets
    for (const it of items) {
      const qty = Number(it.quantity) || 1;
      const itemRecord = await prisma.item.findUnique({
        where: { id: it.itemId },
        include: {
          assets: {
            where: { status: 'AVAILABLE' },
          },
        },
      });

      if (!itemRecord) {
        return NextResponse.json({ error: `ไม่พบข้อมูลครุภัณฑ์ในระบบ` }, { status: 400 });
      }

      const pendingBrw = await prisma.borrowItem.aggregate({
        where: {
          itemId: it.itemId,
          borrowRequest: { status: { in: ['PENDING', 'APPROVED'] } },
        },
        _sum: { quantity: true },
      });
      const reservedCount = pendingBrw._sum.quantity || 0;
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
            error: `ไม่สามารถขอยืมเกินจำนวนพร้อมใช้ได้: ครุภัณฑ์ "${itemRecord.name}" มีในระบบ ${itemRecord.assets.length} ชิ้น (มีคำขอรอส่งมอบ ${reservedCount} ชิ้น) จึงพร้อมให้ยืมเพียง ${availableEquipment} ${itemRecord.unit || 'ชิ้น'} (ท่านระบุ ${qty} ${itemRecord.unit || 'ชิ้น'})`,
          },
          { status: 400 }
        );
      }
    }

    const borrow = await prisma.borrowRequest.create({
      data: {
        requestNumber,
        userId,
        courseId: courseId || null,
        advisorName: finalAdvisorName,
        purpose,
        borrowDate: new Date(borrowDate),
        expectedReturnDate: new Date(expectedReturnDate),
        status: 'PENDING',
        items: {
          create: items.map((it: any) => ({
            itemId: it.itemId,
            quantity: Number(it.quantity) || 1,
          })),
        },
      },
      include: {
        items: {
          include: { item: true },
        },
        course: true,
        user: true,
      },
    });

    // Background notification: Send email to advisor/approver
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
        sendApprovalRequestEmail({
          approverEmail,
          approverName,
          studentName: borrow.user?.name || 'นิสิต',
          studentId: borrow.user?.studentId || undefined,
          type: 'BORROW',
          title: `คำขอยืมครุภัณฑ์ (${requestNumber})`,
          requestId: borrow.id,
          details: [
            { label: 'รหัสคำขอ', value: requestNumber },
            { label: 'วัตถุประสงค์', value: purpose },
            { label: 'เวลานัดรับอุปกรณ์', value: new Date(borrowDate).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) + ' น.' },
            { label: 'กำหนดส่งคืน', value: new Date(expectedReturnDate).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) + ' น.' },
            { label: 'รายวิชา', value: borrow.course ? `[${borrow.course.code}] ${borrow.course.name}` : 'ฝึกอิสระนอกหลักสูตร' },
            { label: 'จำนวนรายการที่ยืม', value: `${items.length} รายการ` },
          ],
        }).catch((err) => console.error('Background borrow approval email failed:', err));
      }
    } catch (emailErr) {
      console.error('Failed to trigger borrow email:', emailErr);
    }

    invalidateCache('borrow:');
    invalidateCache('dashboard:');
    return NextResponse.json(borrow, { status: 201 });
  } catch (error: any) {
    console.error('Create borrow error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create borrow request' }, { status: 500 });
  }
}
