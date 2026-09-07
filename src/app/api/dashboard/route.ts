import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    const ninetyDaysLater = new Date();
    ninetyDaysLater.setDate(now.getDate() + 90);

    const [
      totalEquipmentItems,
      totalConsumableItems,
      totalAssets,
      availableAssets,
      borrowedAssets,
      maintenanceAssets,
      pendingBorrows,
      pendingRequisitions,
      consumables,
      expiringLots,
      courses,
      recentTransactions,
      activePracticeCount,
      pendingPracticeCount,
      completedPracticeSessions,
    ] = await Promise.all([
      prisma.item.count({ where: { type: 'EQUIPMENT' } }),
      prisma.item.count({ where: { type: 'CONSUMABLE' } }),
      prisma.equipmentAsset.count(),
      prisma.equipmentAsset.count({ where: { status: 'AVAILABLE' } }),
      prisma.equipmentAsset.count({ where: { status: 'BORROWED' } }),
      prisma.equipmentAsset.count({ where: { status: 'MAINTENANCE' } }),
      prisma.borrowRequest.count({ where: { status: 'PENDING' } }),
      prisma.requisitionRequest.count({ where: { status: 'PENDING' } }),
      prisma.item.findMany({
        where: { type: 'CONSUMABLE' },
        include: {
          stockLots: true,
          category: true,
        },
      }),
      prisma.stockLot.findMany({
        where: {
          quantityRemaining: { gt: 0 },
          expiryDate: {
            not: null,
            lte: ninetyDaysLater,
          },
        },
        include: {
          item: true,
        },
        orderBy: { expiryDate: 'asc' },
      }),
      prisma.course.findMany({
        include: {
          stockTransactions: {
            where: { type: 'OUT_REQUISITION' },
          },
          requisitionRequests: true,
        },
      }),
      prisma.stockTransaction.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          item: true,
          course: true,
          createdBy: true,
        },
      }),
      prisma.practiceBooking.count({ where: { status: 'CHECKED_IN' } }),
      prisma.practiceBooking.count({ where: { status: 'PENDING' } }),
      prisma.practiceBooking.findMany({
        where: { status: 'COMPLETED' },
        select: { actualMinutes: true },
      }),
    ]);

    const lowStockItems = consumables
      .map((item) => {
        const currentStock = item.stockLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);
        return {
          id: item.id,
          code: item.code,
          name: item.name,
          unit: item.unit,
          minStockAlert: item.minStockAlert,
          currentStock,
          isLowStock: currentStock <= item.minStockAlert,
        };
      })
      .filter((item) => item.isLowStock);

    const courseCosts = courses.map((course) => {
      const totalExpense = course.stockTransactions.reduce((sum, tx) => sum + Math.abs(tx.totalCost), 0);
      const percentBudget = course.allocatedBudget > 0 ? (totalExpense / course.allocatedBudget) * 100 : 0;
      return {
        id: course.id,
        code: course.code,
        name: course.name,
        semester: course.semester,
        academicYear: course.academicYear,
        instructorName: course.instructorName,
        allocatedBudget: course.allocatedBudget,
        totalExpense,
        percentBudget: Math.round(percentBudget * 10) / 10,
        requisitionCount: course.requisitionRequests.length,
      };
    });

    const totalSystemExpense = courseCosts.reduce((sum, c) => sum + c.totalExpense, 0);

    const totalPracticeMinutes = completedPracticeSessions.reduce((sum, b) => sum + (b.actualMinutes || 0), 0);
    const totalPracticeHours = (totalPracticeMinutes / 60).toFixed(1);

    return NextResponse.json({
      totalEquipmentItems,
      totalConsumableItems,
      totalAssets,
      availableAssets,
      borrowedAssets,
      maintenanceAssets,
      pendingBorrows,
      pendingRequisitions,
      lowStockItems,
      expiringLots,
      courseCosts,
      totalSystemExpense,
      recentTransactions,
      activePracticeCount,
      pendingPracticeCount,
      totalPracticeMinutes,
      totalPracticeHours,
    });
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
