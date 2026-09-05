import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function normalizeItemType(typeInput?: string): 'EQUIPMENT' | 'CONSUMABLE' {
  if (!typeInput) return 'EQUIPMENT';
  const t = typeInput.trim().toUpperCase();
  if (t.includes('CONSUMABLE') || t.includes('สิ้นเปลือง') || t.includes('เวชภัณฑ์') || t.includes('ยา')) {
    return 'CONSUMABLE';
  }
  return 'EQUIPMENT';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, userId } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลรายการพัสดุที่ต้องการนำเข้า' }, { status: 400 });
    }

    // Cache categories to avoid repetitive queries
    const existingCategories = await prisma.category.findMany();
    const categoryMap = new Map<string, string>();
    existingCategories.forEach((c) => categoryMap.set(c.name.trim().toLowerCase(), c.id));

    let createdItemsCount = 0;
    let createdAssetsCount = 0;
    let createdLotsCount = 0;
    const errors: string[] = [];

    const currentYearThai = new Date().getFullYear() + 543;

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const rowNum = i + 1;

      if (!row.name || !row.name.trim()) {
        errors.push(`แถวที่ ${rowNum}: กรุณาระบุชื่ออุปกรณ์/เวชภัณฑ์`);
        continue;
      }

      const name = row.name.trim();
      const type = normalizeItemType(row.type);
      const unit = row.unit ? String(row.unit).trim() : (type === 'EQUIPMENT' ? 'เครื่อง' : 'ชิ้น');
      const location = row.location ? String(row.location).trim() : 'ห้องปฏิบัติการพยาบาล';
      const cost = Number(row.cost || row.unitCost || row.price) || 0;
      const quantity = Math.max(1, Number(row.quantity) || 1);

      // Handle category
      let categoryId = '';
      const catName = row.category ? String(row.category).trim() : (type === 'EQUIPMENT' ? 'ครุภัณฑ์ทั่วไป' : 'เวชภัณฑ์ทั่วไป');
      const catKey = catName.toLowerCase();

      if (categoryMap.has(catKey)) {
        categoryId = categoryMap.get(catKey)!;
      } else {
        const newCat = await prisma.category.create({
          data: {
            name: catName,
            type: type,
            description: 'สร้างอัตโนมัติจากการนำเข้าข้อมูลเป็นชุด',
          },
        });
        categoryId = newCat.id;
        categoryMap.set(catKey, newCat.id);
      }

      // Generate or sanitize item code
      let code = row.code ? String(row.code).trim().toUpperCase() : '';
      if (!code) {
        const prefix = type === 'EQUIPMENT' ? 'EQ' : 'CON';
        const count = await prisma.item.count({ where: { type } });
        code = `${prefix}-${String(count + createdItemsCount + 1).padStart(3, '0')}`;
      }

      try {
        // Find existing item or create new
        let item = await prisma.item.findUnique({
          where: { code },
        });

        if (!item) {
          item = await prisma.item.create({
            data: {
              code,
              name,
              type,
              categoryId,
              unit,
              location,
              minStockAlert: Number(row.minStockAlert) || 5,
              description: row.description || null,
            },
          });
          createdItemsCount++;
        }

        if (type === 'CONSUMABLE') {
          // Create Stock Lot for consumable
          const lotNum = row.lotNumber
            ? String(row.lotNumber).trim()
            : `LOT-${currentYearThai}-${String(Date.now()).slice(-4)}`;

          const expiryDate = row.expiryDate ? new Date(row.expiryDate) : null;
          const supplier = row.supplier ? String(row.supplier).trim() : null;

          const lot = await prisma.stockLot.create({
            data: {
              itemId: item.id,
              lotNumber: lotNum,
              quantityInitial: quantity,
              quantityRemaining: quantity,
              unitCost: cost,
              expiryDate,
              supplier,
            },
          });

          await prisma.stockTransaction.create({
            data: {
              itemId: item.id,
              lotId: lot.id,
              type: 'IN',
              quantity,
              unitCost: cost,
              totalCost: quantity * cost,
              createdById: userId || null,
              note: `นำเข้าสต็อกเป็นชุด (Lot: ${lotNum})`,
            },
          });

          createdLotsCount++;
        } else {
          // EQUIPMENT: create individual assets
          const existingAssetsCount = await prisma.equipmentAsset.count({
            where: { itemId: item.id },
          });

          const prefixClean = item.code.replace('EQ-', '').replace(/-\d+$/, '') || 'EQ';

          for (let q = 1; q <= quantity; q++) {
            const seq = existingAssetsCount + q;
            let assetCode = '';

            // If only 1 piece and user provided custom assetCode, use it
            if (quantity === 1 && row.assetCode) {
              assetCode = String(row.assetCode).trim().toUpperCase();
            } else {
              assetCode = `${prefixClean}-${currentYearThai}-${String(seq).padStart(3, '0')}`;
            }

            // Verify unique
            const existingAsset = await prisma.equipmentAsset.findUnique({
              where: { assetCode },
            });
            if (existingAsset) {
              assetCode = `${assetCode}-${String(Date.now()).slice(-3)}`;
            }

            const govCode = quantity === 1 && row.govAssetCode ? String(row.govAssetCode).trim() : null;
            const serialNumber = quantity === 1 && row.serialNumber ? String(row.serialNumber).trim() : null;

            await prisma.equipmentAsset.create({
              data: {
                itemId: item.id,
                assetCode,
                govAssetCode: govCode,
                sequenceNumber: seq,
                serialNumber,
                location: row.location || item.location || 'ห้องปฏิบัติการพยาบาล',
                cost,
                status: 'AVAILABLE',
                condition: 'GOOD',
                note: `นำเข้าเป็นชุด ลำดับที่ ${seq}`,
              },
            });

            await prisma.stockTransaction.create({
              data: {
                itemId: item.id,
                type: 'IN',
                quantity: 1,
                unitCost: cost,
                totalCost: cost,
                createdById: userId || null,
                note: `นำเข้าครุภัณฑ์เป็นชุด (รหัส: ${assetCode})`,
              },
            });

            createdAssetsCount++;
          }
        }
      } catch (err: any) {
        errors.push(`แถวที่ ${rowNum} (${name}): ${err.message || 'บันทึกล้มเหลว'}`);
      }
    }

    return NextResponse.json({
      success: true,
      totalProcessed: items.length,
      createdItemsCount,
      createdAssetsCount,
      createdLotsCount,
      errors,
      message: `นำเข้าพัสดุและครุภัณฑ์เรียบร้อยแล้ว: เพิ่มรายการหลัก ${createdItemsCount} รายการ, ครุภัณฑ์ ${createdAssetsCount} ชิ้น, ล็อตเวชภัณฑ์ ${createdLotsCount} ล็อต`,
    });
  } catch (error: any) {
    console.error('Bulk item import error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการนำเข้าพัสดุ' },
      { status: 500 }
    );
  }
}
