import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const compact = searchParams.get('compact') === 'true';

    const cacheKey = compact ? 'courses_compact' : 'courses_detailed';
    const cached = getCached<any[]>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    if (compact) {
      // Fast path: Only fetch fields needed for dropdowns and selectors
      const courses = await prisma.course.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          instructorName: true,
          allocatedBudget: true,
        },
        orderBy: { code: 'asc' },
      });
      setCached(cacheKey, courses, 60); // 60s cache
      return NextResponse.json(courses);
    }

    // Detailed analytics path
    const courses = await prisma.course.findMany({
      include: {
        requisitionRequests: {
          include: {
            user: { select: { id: true, name: true } },
            items: {
              include: { item: { select: { id: true, code: true, name: true, unit: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        stockTransactions: {
          where: { type: 'OUT_REQUISITION' },
          select: {
            itemId: true,
            quantity: true,
            totalCost: true,
            item: { select: { code: true, name: true, unit: true } },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    const detailedCourses = courses.map((course) => {
      // Aggregate items used
      const itemUsageMap: Record<
        string,
        {
          code: string;
          name: string;
          unit: string;
          totalQuantity: number;
          totalCost: number;
        }
      > = {};

      course.stockTransactions.forEach((tx) => {
        const key = tx.itemId;
        const qty = Math.abs(tx.quantity);
        const cost = Math.abs(tx.totalCost);

        if (!itemUsageMap[key]) {
          itemUsageMap[key] = {
            code: tx.item.code,
            name: tx.item.name,
            unit: tx.item.unit,
            totalQuantity: 0,
            totalCost: 0,
          };
        }

        itemUsageMap[key].totalQuantity += qty;
        itemUsageMap[key].totalCost += cost;
      });

      const itemsUsed = Object.values(itemUsageMap).sort((a, b) => b.totalCost - a.totalCost);
      const totalExpense = itemsUsed.reduce((sum, it) => sum + it.totalCost, 0);
      const remainingBudget = course.allocatedBudget - totalExpense;

      return {
        id: course.id,
        code: course.code,
        name: course.name,
        semester: course.semester,
        academicYear: course.academicYear,
        instructorName: course.instructorName,
        description: course.description,
        allocatedBudget: course.allocatedBudget,
        totalExpense,
        remainingBudget,
        percentUsed:
          course.allocatedBudget > 0
            ? Math.round((totalExpense / course.allocatedBudget) * 1000) / 10
            : 0,
        itemsUsed,
        recentRequisitions: course.requisitionRequests,
      };
    });

    setCached(cacheKey, detailedCourses, 30); // 30s cache
    return NextResponse.json(detailedCourses);
  } catch (error) {
    console.error('Failed to get courses analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const course = await prisma.course.create({
      data: {
        code: body.code,
        name: body.name,
        semester: body.semester || '1',
        academicYear: body.academicYear || '2569',
        instructorName: body.instructorName,
        description: body.description,
        allocatedBudget: Number(body.allocatedBudget) || 0,
      },
    });

    invalidateCache('courses_');
    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('Failed to create course:', error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
