import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      type, // 'CONSUMABLE' or 'EQUIPMENT'
      itemId,
      userId,
      note,
      // For Consumable:
      lotNumber,
      quantity,
      unitCost,
      expiryDate,
      supplier,
      // For Equipment:
      assetCode,
      govAssetCode,
      serialNumber,
      sequenceNumber,
      location,
      cost,
      receivedDate,
      imageUrl,
    } = body;

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      return NextResponse.json({ error: 'ไม่พบรายการอุปกรณ์/เวชภัณฑ์' }, { status: 404 });
    }

    if (item.type === 'CONSUMABLE') {
      if (!lotNumber || !quantity || Number(quantity) <= 0) {
        return NextResponse.json({ error: 'กรุณาระบุเลข Lot และจำนวนที่ถูกต้อง' }, { status: 400 });
      }

      const qty = Number(quantity);
      const cst = Number(unitCost) || 0;
      const total = qty * cst;

      const lot = await prisma.stockLot.create({
        data: {
          itemId,
          lotNumber,
          quantityInitial: qty,
          quantityRemaining: qty,
          unitCost: cst,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          supplier: supplier || null,
        },
      });

      const tx = await prisma.stockTransaction.create({
        data: {
          itemId,
          lotId: lot.id,
          type: 'IN',
          quantity: qty,
          unitCost: cst,
          totalCost: total,
          createdById: userId,
          note: note || `รับเข้าสต็อก Lot: ${lotNumber}`,
        },
      });

      return NextResponse.json({ success: true, lot, transaction: tx });
    } else {
      // Equipment
      if (!assetCode) {
        return NextResponse.json({ error: 'กรุณาระบุรหัสประจำชิ้น (Asset Code)' }, { status: 400 });
      }

      // Find next sequence number if not explicitly specified
      let seq = Number(sequenceNumber);
      if (!seq || isNaN(seq)) {
        const existingCount = await prisma.equipmentAsset.count({ where: { itemId } });
        seq = existingCount + 1;
      }

      const assetCost = Number(cost) || 0;

      const asset = await prisma.equipmentAsset.create({
        data: {
          itemId,
          assetCode,
          govAssetCode: govAssetCode || null,
          sequenceNumber: seq,
          serialNumber: serialNumber || null,
          location: location || item.location || 'ห้องปฏิบัติการพยาบาล',
          receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
          cost: assetCost,
          imageUrl: imageUrl || null,
          status: 'AVAILABLE',
          condition: 'GOOD',
          note: note || `เครื่อง/ชิ้นที่ ${seq}`,
        },
      });

      const tx = await prisma.stockTransaction.create({
        data: {
          itemId,
          type: 'IN',
          quantity: 1,
          unitCost: assetCost,
          totalCost: assetCost,
          createdById: userId,
          note: note || `รับเข้าครุภัณฑ์ ${item.name} เครื่องที่ ${seq} (รหัส: ${assetCode})`,
        },
      });

      return NextResponse.json({ success: true, asset, transaction: tx });
    }
  } catch (error: any) {
    console.error('Stock in error:', error);
    return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดในการบันทึกรับเข้า' }, { status: 500 });
  }
}
