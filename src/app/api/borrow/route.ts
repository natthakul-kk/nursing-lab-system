import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

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
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requests);
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

    // Determine final advisorName: from course if provided, otherwise from user selection
    let finalAdvisorName = advisorName || null;
    if (courseId) {
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

    return NextResponse.json(borrow, { status: 201 });
  } catch (error: any) {
    console.error('Create borrow error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create borrow request' }, { status: 500 });
  }
}
