import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 1. Counts
    const totalEquipmentItems = await prisma.item.count({ where: { type: 'EQUIPMENT' } });
    const totalConsumableItems = await prisma.item.count({ where: { type: 'CONSUMABLE' } });
    
    // Assets status
    const totalAssets = await prisma.equipmentAsset.count();
    const availableAssets = await prisma.equipmentAsset.count({ where: { status: 'AVAILABLE' } });
    const borrowedAssets = await prisma.equipmentAsset.count({ where: { status: 'BORROWED' } });
    const maintenanceAssets = await prisma.equipmentAsset.count({ where: { status: 'MAINTENANCE' } });

    // Pending Requests
    const pendingBorrows = await prisma.borrowRequest.count({ where: { status: 'PENDING' } });
    const pendingRequisitions = await prisma.requisitionRequest.count({ where: { status: 'PENDING' } });

    // 2. Low stock consumable items
    const consumables = await prisma.item.findMany({
      where: { type: 'CONSUMABLE' },
      include: {
        stockLots: true,
        category: true,
      },
    });

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

    // 3. Expiring soon lots (within 90 days)
    const now = new Date();
    const ninetyDaysLater = new Date();
    ninetyDaysLater.setDate(now.getDate() + 90);

    const expiringLots = await prisma.stockLot.findMany({
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
    });

    // 4. Course cost breakdown
    const courses = await prisma.course.findMany({
      include: {
        stockTransactions: {
          where: { type: 'OUT_REQUISITION' },
        },
        requisitionRequests: true,
      },
    });

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

    // 5. Recent Transactions
    const recentTransactions = await prisma.stockTransaction.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        item: true,
        course: true,
        createdBy: true,
      },
    });

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
    });
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
