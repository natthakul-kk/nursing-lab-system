import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // 1. Fetch Consumable Items with Active Lots
    const consumableItems = await prisma.item.findMany({
      where: { type: 'CONSUMABLE' },
      include: {
        category: true,
        stockLots: {
          orderBy: { expiryDate: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });

    const now = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(now.getDate() + 90);

    let totalConsumableStock = 0;
    let totalConsumableValuation = 0;
    let lowStockConsumableCount = 0;
    let expiringSoonLotsCount = 0;

    const consumableRows = consumableItems.map((item) => {
      const remainingQty = item.stockLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);
      const totalCost = item.stockLots.reduce(
        (sum, lot) => sum + lot.quantityRemaining * lot.unitCost,
        0
      );
      const isLowStock = remainingQty <= item.minStockAlert;
      if (isLowStock) lowStockConsumableCount++;

      totalConsumableStock += remainingQty;
      totalConsumableValuation += totalCost;

      const activeLots = item.stockLots
        .filter((l) => l.quantityRemaining > 0)
        .map((l) => {
          const isExpiringSoon = l.expiryDate && new Date(l.expiryDate) <= ninetyDaysFromNow;
          const isExpired = l.expiryDate && new Date(l.expiryDate) < now;
          if (isExpiringSoon && !isExpired) expiringSoonLotsCount++;
          return {
            ...l,
            isExpiringSoon,
            isExpired,
          };
        });

      return {
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category?.name || 'ทั่วไป',
        unit: item.unit,
        location: item.location || 'ห้องปฏิบัติการพยาบาล',
        minStockAlert: item.minStockAlert,
        currentStock: remainingQty,
        totalValuation: totalCost,
        isLowStock,
        lots: activeLots,
      };
    });

    // 2. Fetch Equipment Items with Individual Assets
    const equipmentItems = await prisma.item.findMany({
      where: { type: 'EQUIPMENT' },
      include: {
        category: true,
        assets: {
          include: {
            maintenanceLogs: {
              orderBy: { sentDate: 'desc' },
            },
          },
          orderBy: { sequenceNumber: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });

    let totalEquipmentCount = 0;
    let totalEquipmentValuation = 0;
    let availableCount = 0;
    let borrowedCount = 0;
    let maintenanceCount = 0;
    let retiredCount = 0;

    const equipmentAssetRows: any[] = [];

    equipmentItems.forEach((item) => {
      item.assets.forEach((asset) => {
        totalEquipmentCount++;
        totalEquipmentValuation += Number(asset.cost) || 0;

        if (asset.status === 'AVAILABLE') availableCount++;
        else if (asset.status === 'BORROWED') borrowedCount++;
        else if (asset.status === 'MAINTENANCE') maintenanceCount++;
        else if (asset.status === 'RETIRED') retiredCount++;

        equipmentAssetRows.push({
          id: asset.id,
          itemId: item.id,
          itemName: item.name,
          itemCode: item.code,
          category: item.category?.name || 'ทั่วไป',
          unit: item.unit,
          assetCode: asset.assetCode,
          govAssetCode: asset.govAssetCode,
          sequenceNumber: asset.sequenceNumber,
          serialNumber: asset.serialNumber,
          location: asset.location || item.location || 'ห้องปฏิบัติการพยาบาล',
          receivedDate: asset.receivedDate,
          cost: asset.cost,
          status: asset.status,
          condition: asset.condition,
          note: asset.note,
          maintenanceCount: asset.maintenanceLogs.length,
          lastMaintenanceDate: asset.maintenanceLogs[0]?.sentDate || null,
        });
      });
    });

    // 3. Cost-per-Skill & Cost-per-Student Analytics
    const [courses, practiceKits] = await Promise.all([
      prisma.course.findMany({
        include: {
          practiceBookings: {
            where: { status: { in: ['CONFIRMED', 'CHECKED_OUT', 'COMPLETED'] } },
            include: {
              user: true,
              practiceKit: true,
            },
          },
          requisitionRequests: {
            where: { status: 'DISPENSED' },
            include: {
              items: {
                include: { item: { include: { stockLots: true } } },
              },
            },
          },
        },
        orderBy: { code: 'asc' },
      }),
      prisma.practiceKit.findMany({
        include: {
          items: {
            include: {
              item: {
                include: {
                  stockLots: true,
                },
              },
            },
          },
          practiceBookings: {
            where: { status: { in: ['CONFIRMED', 'CHECKED_OUT', 'COMPLETED'] } },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Calculate Practice Kit Unit Costs
    const kitAnalytics = practiceKits.map((kit) => {
      let unitCost = 0;
      const itemBreakdown = kit.items.map((pki) => {
        const lots = pki.item.stockLots || [];
        const avgLotCost = lots.length > 0
          ? lots.reduce((acc, l) => acc + l.unitCost, 0) / lots.length
          : 0;
        const subtotal = pki.quantity * avgLotCost;
        unitCost += subtotal;
        return {
          itemId: pki.item.id,
          itemName: pki.item.name,
          itemCode: pki.item.code,
          quantity: pki.quantity,
          unit: pki.item.unit,
          avgUnitCost: avgLotCost,
          subtotal,
        };
      });

      const usageCount = kit.practiceBookings.length;
      const totalCostDispensed = unitCost * usageCount;

      return {
        id: kit.id,
        code: kit.code,
        name: kit.name,
        category: kit.category,
        targetCourse: kit.targetCourse,
        unitCost,
        usageCount,
        totalCostDispensed,
        items: itemBreakdown,
      };
    });

    const kitCostMap = new Map(kitAnalytics.map((k) => [k.id, k.unitCost]));

    // Calculate Course Costs
    let totalFacultyAllocatedBudget = 0;
    let totalFacultyConsumableSpent = 0;

    const courseAnalytics = courses.map((course) => {
      totalFacultyAllocatedBudget += course.allocatedBudget || 0;

      // Requisition items cost
      let requisitionCost = 0;
      course.requisitionRequests.forEach((req) => {
        req.items.forEach((reqItem) => {
          const lots = reqItem.item.stockLots || [];
          const avgCost = lots.length > 0
            ? lots.reduce((a, l) => a + l.unitCost, 0) / lots.length
            : 0;
          requisitionCost += (reqItem.quantityDispensed || reqItem.quantityRequested) * avgCost;
        });
      });

      // Practice kits cost
      let practiceKitsCost = 0;
      const uniqueStudentIds = new Set<string>();
      course.practiceBookings.forEach((b) => {
        if (b.userId) uniqueStudentIds.add(b.userId);
        if (b.practiceKitId && kitCostMap.has(b.practiceKitId)) {
          practiceKitsCost += kitCostMap.get(b.practiceKitId)!;
        }
      });

      const totalCost = requisitionCost + practiceKitsCost;
      totalFacultyConsumableSpent += totalCost;

      const studentCount = uniqueStudentIds.size || (course.practiceBookings.length > 0 ? course.practiceBookings.length : 1);
      const costPerStudent = totalCost / studentCount;
      const budgetUtilization = course.allocatedBudget > 0
        ? (totalCost / course.allocatedBudget) * 100
        : 0;

      return {
        id: course.id,
        code: course.code,
        name: course.name,
        semester: course.semester,
        academicYear: course.academicYear,
        instructorName: course.instructorName,
        allocatedBudget: course.allocatedBudget,
        requisitionCost,
        practiceKitsCost,
        totalCost,
        totalBookings: course.practiceBookings.length,
        studentCount: uniqueStudentIds.size,
        costPerStudent,
        budgetUtilization,
      };
    });

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      consumables: {
        totalItems: consumableItems.length,
        totalStock: totalConsumableStock,
        totalValuation: totalConsumableValuation,
        lowStockCount: lowStockConsumableCount,
        expiringSoonCount: expiringSoonLotsCount,
        rows: consumableRows,
      },
      equipment: {
        totalItems: equipmentItems.length,
        totalAssets: totalEquipmentCount,
        totalValuation: totalEquipmentValuation,
        availableCount,
        borrowedCount,
        maintenanceCount,
        retiredCount,
        rows: equipmentAssetRows,
      },
      costAnalytics: {
        totalAllocatedBudget: totalFacultyAllocatedBudget,
        totalConsumableSpent: totalFacultyConsumableSpent,
        courses: courseAnalytics,
        kits: kitAnalytics,
      },
    });
  } catch (error: any) {
    console.error('Reports API error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการสร้างข้อมูลรายงาน' },
      { status: 500 }
    );
  }
}
