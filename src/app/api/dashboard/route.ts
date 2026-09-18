import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCached, setCached } from '@/lib/cache';

export async function GET() {
  try {
    const cacheKey = 'dashboard:stats';
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

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
      pendingRoomBookings,
      pastTransactions,
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
      prisma.roomBooking.count({ where: { status: 'PENDING' } }),
      prisma.stockTransaction.findMany({
        where: {
          createdAt: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 5)),
          },
        },
        select: {
          type: true,
          totalCost: true,
          quantity: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
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
      const studentCount = course.studentCount || 0;
      const costPerStudent = studentCount > 0 ? Number((totalExpense / studentCount).toFixed(2)) : 0;
      return {
        id: course.id,
        code: course.code,
        name: course.name,
        semester: course.semester,
        academicYear: course.academicYear,
        instructorName: course.instructorName,
        allocatedBudget: course.allocatedBudget,
        studentCount,
        costPerStudent,
        totalExpense,
        percentBudget: Math.round(percentBudget * 10) / 10,
        requisitionCount: course.requisitionRequests.length,
      };
    });

    const totalSystemExpense = courseCosts.reduce((sum, c) => sum + c.totalExpense, 0);

    const totalPracticeMinutes = completedPracticeSessions.reduce((sum, b) => sum + (b.actualMinutes || 0), 0);
    const totalPracticeHours = (totalPracticeMinutes / 60).toFixed(1);

    // 1. Category Distribution for Consumables
    const categoryMap: Record<string, { name: string; itemCount: number; totalStock: number; totalValue: number }> = {};
    for (const item of consumables) {
      const catName = item.category?.name || 'วัสดุทั่วไป';
      if (!categoryMap[catName]) {
        categoryMap[catName] = { name: catName, itemCount: 0, totalStock: 0, totalValue: 0 };
      }
      categoryMap[catName].itemCount += 1;
      for (const lot of item.stockLots) {
        categoryMap[catName].totalStock += lot.quantityRemaining;
        categoryMap[catName].totalValue += lot.quantityRemaining * (lot.unitCost || 0);
      }
    }
    const categoryDistribution = Object.values(categoryMap)
      .filter((c) => c.totalValue > 0 || c.totalStock > 0)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 8);

    // 2. Monthly Outflow / Expense Trends (Last 6 Months)
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const monthlyMap: Record<string, { monthKey: string; month: string; outflowCost: number; inflowCost: number; txCount: number }> = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mIdx = d.getMonth();
      const yThai = (d.getFullYear() + 543) % 100;
      const key = `${d.getFullYear()}-${String(mIdx + 1).padStart(2, '0')}`;
      monthlyMap[key] = {
        monthKey: key,
        month: `${thaiMonths[mIdx]} '${yThai}`,
        outflowCost: 0,
        inflowCost: 0,
        txCount: 0,
      };
    }

    for (const tx of pastTransactions as any[]) {
      const d = new Date(tx.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[key]) {
        if (tx.type === 'OUT_REQUISITION') {
          monthlyMap[key].outflowCost += Math.abs(tx.totalCost);
          monthlyMap[key].txCount += 1;
        } else if (tx.type === 'IN') {
          monthlyMap[key].inflowCost += Math.abs(tx.totalCost);
        }
      }
    }
    const monthlyTrends = Object.values(monthlyMap);

    // 3. Asset Status Breakdown
    const assetBreakdown = [
      { name: 'พร้อมใช้งาน', value: availableAssets, color: '#0d9488', status: 'AVAILABLE' },
      { name: 'กำลังถูกยืม', value: borrowedAssets, color: '#3b82f6', status: 'BORROWED' },
      { name: 'ส่งซ่อม/ชำรุด', value: maintenanceAssets, color: '#f43f5e', status: 'MAINTENANCE' },
    ];

    const payload = {
      totalEquipmentItems,
      totalConsumableItems,
      totalAssets,
      availableAssets,
      borrowedAssets,
      maintenanceAssets,
      assetBreakdown,
      pendingBorrows,
      pendingRequisitions,
      lowStockItems,
      expiringLots,
      courseCosts,
      totalSystemExpense,
      recentTransactions,
      activePracticeCount,
      pendingPracticeCount,
      pendingRoomBookings,
      totalPracticeMinutes,
      totalPracticeHours,
      categoryDistribution,
      monthlyTrends,
    };

    setCached(cacheKey, payload, 30 * 1000); // 30s TTL
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
