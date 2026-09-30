import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const currentMonth = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const currentYear = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const startDateMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
    const endDateMonth = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));

    // 1. Equipment Assets Metrics
    const assets = await prisma.equipmentAsset.findMany({
      include: {
        item: {
          select: {
            name: true,
            code: true,
            unit: true,
            brand: true,
            model: true,
            imageUrl: true,
            category: { select: { name: true } },
          },
        },
        storageLocation: {
          include: { room: { select: { name: true, code: true } } },
        },
      },
      orderBy: { assetCode: 'asc' },
    });

    const totalAssetsCount = assets.length;
    let totalValuation = 0;
    let availableCount = 0;
    let borrowedCount = 0;
    let maintenanceCount = 0;
    let retiredCount = 0;
    let damagedCount = 0;

    assets.forEach((a) => {
      totalValuation += Number(a.cost) || 0;
      if (a.status === 'AVAILABLE') availableCount++;
      else if (a.status === 'BORROWED') borrowedCount++;
      else if (a.status === 'MAINTENANCE') maintenanceCount++;
      else if (a.status === 'RETIRED') retiredCount++;

      if (a.condition === 'DAMAGED') damagedCount++;
    });

    const readinessRate =
      totalAssetsCount > 0 ? Math.round(((availableCount + borrowedCount) / totalAssetsCount) * 1000) / 10 : 100;

    // 2. AC Energy & Operation Hours (only logs with usageHours > 0)
    const acLogs = await prisma.acOperationLog.findMany({
      where: {
        date: {
          gte: startDateMonth,
          lte: endDateMonth,
        },
        usageHours: { gt: 0 },
      },
      include: {
        room: { select: { id: true, name: true, code: true } },
      },
    });

    let totalAcHoursMonth = 0;
    let maintenanceAcHours = 0;
    let teachingAcHours = 0;
    const roomAcHoursMap: Record<string, { roomName: string; hours: number }> = {};

    acLogs.forEach((l) => {
      const h = Number(l.usageHours) || 0;
      if (h <= 0) return;

      totalAcHoursMonth += h;
      if (l.purpose?.includes('รักษาอุปกรณ์')) maintenanceAcHours += h;
      else teachingAcHours += h;

      const rName = l.room.name || 'ห้องปฏิบัติการ';
      if (!roomAcHoursMap[l.roomId]) {
        roomAcHoursMap[l.roomId] = { roomName: rName, hours: 0 };
      }
      roomAcHoursMap[l.roomId].hours = Math.round((roomAcHoursMap[l.roomId].hours + h) * 10) / 10;
    });

    // 3. Consumables Stock Valuation
    const consumableLots = await prisma.stockLot.findMany({
      where: { quantityRemaining: { gt: 0 } },
      select: { quantityRemaining: true, unitCost: true, expiryDate: true },
    });

    let totalConsumablesValuation = 0;
    let expiringCount = 0;
    const ninetyDaysLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    consumableLots.forEach((l) => {
      totalConsumablesValuation += (Number(l.quantityRemaining) || 0) * (Number(l.unitCost) || 0);
      if (l.expiryDate && new Date(l.expiryDate) < ninetyDaysLater) {
        expiringCount++;
      }
    });

    // 4. Student Practice Hours (นิสิต)
    const practiceBookings = await prisma.practiceBooking.findMany({
      where: {
        status: { in: ['COMPLETED', 'CHECKED_IN', 'APPROVED'] },
      },
      select: { actualMinutes: true },
    });

    const totalPracticeHours = practiceBookings.reduce((acc, b) => {
      return acc + (b.actualMinutes ? b.actualMinutes / 60 : 2.0);
    }, 0);

    // 5. Rooms Count
    const totalRoomsCount = await prisma.practiceRoom.count({ where: { isActive: true } });

    // Format equipment list for drill-down modal browser
    const equipmentList = assets.map((a) => {
      const roomName = a.storageLocation?.room?.name || a.location || 'ศูนย์ฝึกทักษะการพยาบาล';
      return {
        id: a.id,
        assetCode: a.assetCode,
        govAssetCode: a.govAssetCode,
        sequenceNumber: a.sequenceNumber,
        itemName: a.item.name,
        brand: a.brand || a.item.brand || '-',
        model: a.model || a.item.model || '-',
        serialNumber: a.serialNumber || '-',
        cost: Number(a.cost) || 0,
        receivedDate: a.receivedDate ? a.receivedDate.toISOString() : null,
        roomName,
        condition: a.condition || 'GOOD',
        status: a.status || 'AVAILABLE',
        categoryName: a.item.category?.name || 'ครุภัณฑ์',
        supplier: a.supplier || '-',
        warrantyExpiry: a.warrantyExpiry ? a.warrantyExpiry.toISOString() : null,
        imageUrl: a.imageUrl || a.item.imageUrl || null,
      };
    });

    return NextResponse.json({
      success: true,
      currentMonth,
      currentYear,
      kpis: {
        totalAssetsCount,
        totalValuation,
        readinessRate,
        availableCount,
        borrowedCount,
        maintenanceCount,
        retiredCount,
        damagedCount,
        totalAcHoursMonth: Math.round(totalAcHoursMonth * 10) / 10,
        maintenanceAcHours: Math.round(maintenanceAcHours * 10) / 10,
        teachingAcHours: Math.round(teachingAcHours * 10) / 10,
        roomAcBreakdown: Object.values(roomAcHoursMap)
          .filter((r) => r.hours > 0)
          .sort((a, b) => b.hours - a.hours),
        totalConsumablesValuation,
        expiringLotsCount: expiringCount,
        totalPracticeHours: Math.round(totalPracticeHours * 10) / 10,
        totalRoomsCount,
      },
      equipmentList,
    });
  } catch (error: any) {
    console.error('Executive stats error:', error);
    return NextResponse.json(
      { error: error.message || 'ไม่สามารถโหลดข้อมูลสถิติผู้บริหารได้' },
      { status: 500 }
    );
  }
}
