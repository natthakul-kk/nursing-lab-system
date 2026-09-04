import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      include: {
        requisitionRequests: {
          include: {
            user: true,
            items: {
              include: { item: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        stockTransactions: {
          where: { type: 'OUT_REQUISITION' },
          include: { item: true },
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
    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('Failed to create course:', error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
