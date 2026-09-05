import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'CONSUMABLE', 'EQUIPMENT', or 'ALL'

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
    });
  } catch (error: any) {
    console.error('Reports API error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการสร้างข้อมูลรายงาน' },
      { status: 500 }
    );
  }
}
