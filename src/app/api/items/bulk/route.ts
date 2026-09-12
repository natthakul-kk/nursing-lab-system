import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Map Thai or common item type words with smart fallback from name and category
function normalizeItemType(
  typeInput?: string,
  itemName?: string,
  categoryName?: string,
  code?: string,
  packSize?: number,
  usageUnit?: string
): 'EQUIPMENT' | 'CONSUMABLE' {
  if (typeInput) {
    const t = typeInput.trim().toUpperCase();
    if (t.includes('CONSUMABLE') || t.includes('สิ้นเปลือง') || t.includes('เวชภัณฑ์') || t.includes('ยา') || t.includes('วัสดุ')) {
      return 'CONSUMABLE';
    }
    if (t.includes('EQUIPMENT') || t.includes('ครุภัณฑ์') || t.includes('เครื่อง') || t.includes('หุ่น') || t.includes('เตียง')) {
      return 'EQUIPMENT';
    }
  }

  // Code prefix check
  if (code) {
    const upperCode = code.trim().toUpperCase();
    if (upperCode.startsWith('CS-') || upperCode.startsWith('CON-')) {
      return 'CONSUMABLE';
    }
    if (upperCode.startsWith('EQ-')) {
      return 'EQUIPMENT';
    }
  }

  // Sub-unit or pack size check
  if ((packSize && packSize > 1) || (usageUnit && usageUnit.trim() !== '')) {
    return 'CONSUMABLE';
  }

  // Smart fallback: detect medical consumable keywords from item name or category
  const textToCheck = `${itemName || ''} ${categoryName || ''}`.toLowerCase();
  const consumableKeywords = [
    'เข็ม', 'needle', 'syringe', 'หลอดฉีดยา', 'ไซริงค์', 'ถุงมือ', 'glove',
    'สำลี', 'cotton', 'ผ้าก๊อซ', 'gauze', 'พลาสเตอร์', 'plaster', 'แอลกอฮอล์',
    'alcohol', 'เบตาดีน', 'betadine', 'สายยาง', 'catheter', 'tube', 'ใบมีด',
    'blade', 'swab', 'ยา', 'เวชภัณฑ์', 'สิ้นเปลือง', 'mask', 'หน้ากาก',
    'แผ่นรอง', 'iv set', 'สายน้ำเกลือ', 'ชุดให้น้ำเกลือ', 'เซตทำแผล',
    'nss', 'd-5-w', 'd5w', 'สารน้ำ', 'น้ำเกลือ', 'suction', 'ดูดเสมหะ',
    'urine', 'ปัสสาวะ', 'สายสวน', 'feed', 'ให้อาหาร', 'ezbag', 'eztube',
    'ถุงซิป', 'zip', 'ทิ้งเข็ม', 'คม', 'วัตถุมีคม', 'ถังทิ้ง', 'ถังขยะติดเชื้อ',
    'ez-bag', 'ez-tube', 'ถุง', 'สาย'
  ];
  if (consumableKeywords.some((kw) => textToCheck.includes(kw))) {
    return 'CONSUMABLE';
  }

  return 'EQUIPMENT';
}

// Safely parse date from string, number (Excel serial), or Date object
function parseSafeDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'number') {
    // Excel serial date number
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + val * 86400000);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return null;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    const parts = s.split(/[\/\-.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (!isNaN(parsed.getTime())) return parsed;
      }
      if (parts[2].length === 4) {
        let yr = Number(parts[2]);
        if (yr > 2400) yr -= 543; // Handle Buddhist Era e.g. 2569 -> 2026
        const parsed = new Date(yr, Number(parts[1]) - 1, Number(parts[0]));
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
  }
  return null;
}

// Robust extractor for Thai & English headers from Excel/CSV
function extractItemFromRow(row: Record<string, any>) {
  const map: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined || v === null) continue;
    const cleanKey = k.toString().trim().toLowerCase().replace(/[\s\-_/()]/g, '');
    map[cleanKey] = typeof v === 'string' ? v.trim() : v;
    map[k.trim()] = typeof v === 'string' ? v.trim() : v;
  }

  // 1. Name
  const name =
    map['ชื่อรายการ'] ||
    map['ชื่อพัสดุ'] ||
    map['ชื่ออุปกรณ์'] ||
    map['ชื่อเวชภัณฑ์'] ||
    map['ชื่อ'] ||
    map['name'] ||
    map['itemname'] ||
    row['ชื่อรายการ'] ||
    row['ชื่อพัสดุ'] ||
    row['ชื่ออุปกรณ์'] ||
    row['ชื่อ'] ||
    row['name'] ||
    '';

  // 2. Code
  const code =
    map['รหัสพัสดุ'] ||
    map['รหัสอุปกรณ์'] ||
    map['รหัสเวชภัณฑ์'] ||
    map['รหัส'] ||
    map['code'] ||
    map['itemcode'] ||
    row['รหัสพัสดุ'] ||
    row['รหัส'] ||
    row['code'] ||
    '';

  // 3. Type
  const type =
    map['ประเภท'] ||
    map['ประเภทพัสดุ'] ||
    map['ประเภทequipmentconsumable'] ||
    row['ประเภท (EQUIPMENT/CONSUMABLE)'] ||
    row['ประเภท'] ||
    row['type'] ||
    '';

  // 4. Category
  const category =
    map['หมวดหมู่'] ||
    map['หมวด'] ||
    map['category'] ||
    row['หมวดหมู่'] ||
    row['category'] ||
    '';

  // 5. Unit / Package Unit (หน่วยบรรจุใหญ่ เช่น กล่อง, ห่อ, ลัง)
  const unit =
    map['หน่วยบรรจุหน่วยใหญ่'] ||
    map['หน่วยบรรจุ'] ||
    map['หน่วยนับ'] ||
    map['หน่วย'] ||
    map['unit'] ||
    map['packageunit'] ||
    row['หน่วยบรรจุ (หน่วยใหญ่)'] ||
    row['หน่วยบรรจุ'] ||
    row['หน่วยนับ'] ||
    row['unit'] ||
    '';

  // 5.1 Usage Unit (หน่วยย่อยที่เบิกใช้ เช่น เล่ม, ชิ้น, ก้อน, คู่)
  const usageUnit =
    map['หน่วยย่อยที่เบิกใช้'] ||
    map['หน่วยย่อย'] ||
    map['หน่วยเบิกใช้'] ||
    map['หน่วยเบิก'] ||
    map['usageunit'] ||
    map['dispenseunit'] ||
    row['หน่วยย่อยที่เบิกใช้'] ||
    row['หน่วยย่อย'] ||
    row['usageUnit'] ||
    '';

  // 5.2 Pack Size (จำนวนย่อยต่อแพ็ค/กล่อง เช่น 100 เล่ม/กล่อง)
  const rawPackSize =
    map['จำนวนย่อยต่อแพ็คชิ้นกล่อง'] ||
    map['จำนวนย่อยต่อแพ็ค'] ||
    map['จำนวนย่อยต่อหน่วยบรรจุ'] ||
    map['ขนาดบรรจุ'] ||
    map['บรรจุกล่องละ'] ||
    map['จำนวนชิ้นต่อแพ็ค'] ||
    map['จำนวนต่อกล่อง'] ||
    map['packsize'] ||
    map['piecesperpack'] ||
    map['conversionratio'] ||
    map['อัตราแปลง'] ||
    row['จำนวนย่อยต่อแพ็ค (ชิ้น/กล่อง)'] ||
    row['จำนวนย่อยต่อแพ็ค'] ||
    row['ขนาดบรรจุ'] ||
    row['packSize'] ||
    1;
  const packSize = Math.max(1, Number(rawPackSize) || 1);

  // 5.3 Min Stock Alert (จุดแจ้งเตือนสต็อกขั้นต่ำ)
  const rawMinStock =
    map['จุดแจ้งเตือนสต็อกขั้นต่ำ'] ||
    map['จุดเตือนขั้นต่ำ'] ||
    map['สต็อกขั้นต่ำ'] ||
    map['minstockalert'] ||
    map['minstock'] ||
    row['จุดแจ้งเตือนสต็อกขั้นต่ำ'] ||
    row['จุดเตือนขั้นต่ำ'] ||
    row['minStockAlert'] ||
    5;
  const minStockAlert = Math.max(0, Number(rawMinStock) || 5);

  // 6. Quantity (จำนวนรับเข้า ทั้งหน่วยเดี่ยวและหน่วยใหญ่)
  const rawQuantity =
    map['จำนวนรับเข้าหน่วยใหญ่'] ||
    map['จำนวนรับเข้า'] ||
    map['จำนวน'] ||
    map['จำนวนชิ้น'] ||
    map['quantity'] ||
    map['qty'] ||
    row['จำนวนรับเข้า (หน่วยใหญ่)'] ||
    row['จำนวนรับเข้า'] ||
    row['จำนวน'] ||
    row['quantity'] ||
    1;
  const quantity = Math.max(1, Number(rawQuantity) || 1);

  // 7. Cost (ราคาต่อหน่วย หรือราคาต่อหน่วยบรรจุ)
  const rawCost =
    map['ราคาต่อหน่วยบรรจุ'] ||
    map['ราคาต่อหน่วย'] ||
    map['ราคา'] ||
    map['ราคาทุน'] ||
    map['cost'] ||
    map['price'] ||
    map['unitcost'] ||
    row['ราคาต่อหน่วยบรรจุ'] ||
    row['ราคาต่อหน่วย'] ||
    row['ราคา'] ||
    row['cost'] ||
    0;
  const cost = Math.max(0, Number(rawCost) || 0);

  // 8. Location
  const location =
    map['สถานที่จัดเก็บ'] ||
    map['สถานที่'] ||
    map['location'] ||
    row['สถานที่จัดเก็บ'] ||
    row['location'] ||
    '';

  // 9. Description
  const description =
    map['คำอธิบาย'] ||
    map['รายละเอียด'] ||
    map['หมายเหตุ'] ||
    map['description'] ||
    map['note'] ||
    row['คำอธิบาย'] ||
    row['description'] ||
    '';

  // 10. Consumable - Lot Number
  const lotNumber =
    map['หมายเลขล็อต'] ||
    map['ล็อต'] ||
    map['เลขล็อต'] ||
    map['lotnumber'] ||
    map['lot'] ||
    row['หมายเลขล็อต'] ||
    row['lotNumber'] ||
    '';

  // 10. Received Date (Both Equipment & Consumable)
  const rawReceivedDate =
    map['วันที่รับเข้าyyyymmdd'] ||
    map['วันที่รับเข้า'] ||
    map['วันที่ตรวจรับ'] ||
    map['วันที่ได้มา'] ||
    map['receiveddate'] ||
    map['received_date'] ||
    row['วันที่รับเข้า (YYYY-MM-DD)'] ||
    row['วันที่รับเข้า'] ||
    row['วันที่ตรวจรับ'] ||
    row['receivedDate'] ||
    '';

  // 11. Consumable - Expiry Date
  const expiryDate =
    map['วันหมดอายุyyyymmdd'] ||
    map['วันหมดอายุ'] ||
    map['หมดอายุ'] ||
    map['expirydate'] ||
    map['expiry'] ||
    row['วันหมดอายุ (YYYY-MM-DD)'] ||
    row['วันหมดอายุ'] ||
    row['expiryDate'] ||
    '';

  // 12. Supplier (Both Equipment & Consumable)
  const supplier =
    map['ผู้จัดจำหน่าย'] ||
    map['ผู้จำหน่าย'] ||
    map['ผู้จัดจำหน่ายsupplier'] ||
    map['ผู้จำหน่ายsupplier'] ||
    map['บริษัทคู่ค้า'] ||
    map['บริษัท'] ||
    map['supplier'] ||
    map['vendor'] ||
    row['ผู้จัดจำหน่าย (Supplier)'] ||
    row['ผู้จำหน่าย (Supplier)'] ||
    row['ผู้จัดจำหน่าย'] ||
    row['ผู้จำหน่าย'] ||
    row['supplier'] ||
    '';

  // 13. Brand (ยี่ห้อ / ผู้ผลิต)
  const brand =
    map['ยี่ห้อ'] ||
    map['ยี่ห้อbrand'] ||
    map['แบรนด์'] ||
    map['ผู้ผลิต'] ||
    map['brand'] ||
    map['manufacturer'] ||
    row['ยี่ห้อ (Brand)'] ||
    row['ยี่ห้อ'] ||
    row['brand'] ||
    '';

  // 14. Model (รุ่น)
  const model =
    map['รุ่น'] ||
    map['รุ่นmodel'] ||
    map['โมเดล'] ||
    map['model'] ||
    row['รุ่น (Model)'] ||
    row['รุ่น'] ||
    row['model'] ||
    '';

  // 15. Warranty Expiry Date
  const rawWarrantyExpiry =
    map['วันหมดประกัน'] ||
    map['วันสิ้นสุดการรับประกัน'] ||
    map['วันหมดประกันyyyymmdd'] ||
    map['warrantyexpiry'] ||
    map['warranty'] ||
    row['วันหมดประกัน (YYYY-MM-DD)'] ||
    row['วันหมดประกัน'] ||
    row['วันสิ้นสุดการรับประกัน'] ||
    row['warrantyExpiry'] ||
    '';

  // 16. Equipment - Lab Code Prefix
  const labCodePrefix =
    map['รหัสแล็บขึ้นต้น'] ||
    map['รหัสแล็บ'] ||
    map['รหัสครุภัณฑ์'] ||
    map['assetcode'] ||
    row['รหัสแล็บ (ขึ้นต้น)'] ||
    row['รหัสแล็บ'] ||
    row['assetCode'] ||
    '';

  // 17. Equipment - Gov Asset Code
  const govAssetCode =
    map['เลขครุภัณฑ์ราชการ'] ||
    map['เลขครุภัณฑ์'] ||
    map['หมายเลขครุภัณฑ์'] ||
    map['govassetcode'] ||
    row['เลขครุภัณฑ์ราชการ'] ||
    row['govAssetCode'] ||
    '';

  // 18. Equipment - Serial Number
  const serialNumber =
    map['หมายเลขเครื่อง'] ||
    map['serialnumber'] ||
    map['serial'] ||
    row['หมายเลขเครื่อง'] ||
    row['serialNumber'] ||
    '';

  return {
    name: String(name || '').trim(),
    code: String(code || '').trim().toUpperCase(),
    type: String(type || '').trim(),
    category: String(category || '').trim(),
    unit: String(unit || '').trim(),
    quantity: Math.max(1, Number(quantity) || 1),
    cost: Number(cost) || 0,
    location: String(location || '').trim(),
    description: String(description || '').trim(),
    lotNumber: String(lotNumber || '').trim(),
    expiryDate: parseSafeDate(expiryDate),
    receivedDate: parseSafeDate(rawReceivedDate),
    supplier: String(supplier || '').trim(),
    brand: String(brand || '').trim(),
    model: String(model || '').trim(),
    warrantyExpiry: parseSafeDate(rawWarrantyExpiry),
    labCodePrefix: String(labCodePrefix || '').trim(),
    assetCode: String(labCodePrefix || '').trim(),
    govAssetCode: String(govAssetCode || '').trim(),
    serialNumber: String(serialNumber || '').trim(),
    packSize,
    usageUnit: String(usageUnit || '').trim(),
    minStockAlert,
  };
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
    let updatedItemsCount = 0;
    let createdAssetsCount = 0;
    let createdLotsCount = 0;
    const errors: string[] = [];

    const currentYearThai = new Date().getFullYear() + 543;

    for (let i = 0; i < items.length; i++) {
      const raw = items[i];
      const rowNum = i + 1;

      if (!raw || typeof raw !== 'object') continue;

      const row = extractItemFromRow(raw);

      // Skip completely blank rows in Excel
      if (!row.name && !row.code && !row.category) {
        continue;
      }

      if (!row.name) {
        errors.push(`แถวที่ ${rowNum}: กรุณาระบุชื่ออุปกรณ์/เวชภัณฑ์`);
        continue;
      }

      const name = row.name;
      const type = normalizeItemType(row.type, row.name, row.category, row.code, row.packSize, row.usageUnit);
      const unit = row.unit || (type === 'EQUIPMENT' ? 'เครื่อง' : 'ชิ้น');
      const location = row.location || 'ห้องปฏิบัติการพยาบาล';
      const cost = row.cost;
      const quantity = row.quantity;

      // Handle category
      let categoryId = '';
      const catName = row.category || (type === 'EQUIPMENT' ? 'ครุภัณฑ์ทั่วไป' : 'เวชภัณฑ์ทั่วไป');
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
      let code = row.code;
      if (!code) {
        const prefix = type === 'EQUIPMENT' ? 'EQ' : 'CON';
        const count = await prisma.item.count({ where: { type } });
        code = `${prefix}-${String(count + createdItemsCount + 1).padStart(3, '0')}`;
      }

      try {
        // Find existing item or create new
        let item = await prisma.item.findFirst({
          where: {
            OR: [
              { code: { equals: code, mode: 'insensitive' as const } },
              { name: { equals: name, mode: 'insensitive' as const } },
            ],
          },
        });

        const effectiveUsageUnit = row.usageUnit || (type === 'CONSUMABLE' ? 'ชิ้น' : null);
        const effectivePackSize = row.packSize || 1;
        const effectiveMinStock = row.minStockAlert || 5;

        if (!item) {
          item = await prisma.item.create({
            data: {
              code,
              name,
              type,
              categoryId,
              unit,
              usageUnit: effectiveUsageUnit,
              conversionRatio: effectivePackSize,
              location,
              minStockAlert: effectiveMinStock,
              brand: row.brand || null,
              model: row.model || null,
              description: row.description || null,
            },
          });
          createdItemsCount++;
        } else {
          // If existing item, update conversionRatio/usageUnit if user provided new values
          if (row.usageUnit || row.packSize > 1) {
            await prisma.item.update({
              where: { id: item.id },
              data: {
                ...(row.usageUnit ? { usageUnit: row.usageUnit } : {}),
                ...(row.packSize > 1 ? { conversionRatio: row.packSize } : {}),
              },
            });
          }
          updatedItemsCount++;
        }

        if (type === 'CONSUMABLE') {
          // Create Stock Lot for consumable with sub-units tracking
          let lotNum = row.lotNumber ? String(row.lotNumber).trim() : '';
          if (!lotNum) {
            const lotCount = await prisma.stockLot.count({
              where: { itemId: item.id },
            });
            lotNum = `LOT-${currentYearThai}-${String(lotCount + createdLotsCount + 1).padStart(3, '0')}`;
          }

          const expiryDate = row.expiryDate;
          const receivedDate = row.receivedDate || new Date();
          const supplier = row.supplier ? String(row.supplier).trim() : null;
          const packSize = row.packSize || Math.round(Number(item.conversionRatio) || 1);
          const totalPieces = quantity * packSize;
          const packageUnit = unit || item.unit || 'กล่อง';
          const usageUnit = row.usageUnit || item.usageUnit || 'ชิ้น';

          const lot = await prisma.stockLot.create({
            data: {
              itemId: item.id,
              lotNumber: lotNum,
              packSize: packSize,
              packageUnit: packageUnit,
              totalPieces: totalPieces,
              piecesRemaining: totalPieces,
              quantityInitial: quantity,
              quantityRemaining: quantity,
              unitCost: cost,
              expiryDate,
              receivedDate,
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
              createdAt: receivedDate,
              note: packSize > 1 
                ? `นำเข้าสต็อกเป็นชุด (Lot: ${lotNum}) ${quantity} ${packageUnit} บรรจุ ${packSize} ${usageUnit}/${packageUnit} (รวม ${totalPieces.toLocaleString()} ${usageUnit})`
                : `นำเข้าสต็อกเป็นชุด (Lot: ${lotNum})`,
            },
          });

          // Auto-generate boxes/units for this consumable lot with yearly sequence
          const currentYearStr = String(currentYearThai);
          const maxBox = await prisma.stockLotBox.findFirst({
            where: { itemId: item.id, year: currentYearStr },
            orderBy: { boxNumberInYear: 'desc' },
          });
          let currentYearCounter = maxBox ? maxBox.boxNumberInYear : 0;

          const cleanItemCode = (item.code || 'ITEM').replace(/[^a-zA-Z0-9-]/g, '');
          const boxesData = [];
          const boxesCount = Math.min(quantity, 500);
          for (let b = 1; b <= boxesCount; b++) {
            currentYearCounter++;
            boxesData.push({
              lotId: lot.id,
              itemId: item.id,
              boxCode: `${cleanItemCode}-${currentYearStr}-B${String(currentYearCounter).padStart(3, '0')}`,
              boxNumberInLot: b,
              boxNumberInYear: currentYearCounter,
              year: currentYearStr,
              status: 'IN_STOCK',
            });
          }

          if (boxesData.length > 0) {
            await prisma.stockLotBox.createMany({ data: boxesData });
          }

          createdLotsCount++;
        } else {
          // EQUIPMENT: create individual assets
          const existingAssetsCount = await prisma.equipmentAsset.count({
            where: { itemId: item.id },
          });

          const prefixClean = item.code.replace('EQ-', '').replace(/-\d+$/, '') || 'EQ';
          const govCodes = row.govAssetCode
            ? String(row.govAssetCode).split(',').map((s: string) => s.trim()).filter(Boolean)
            : [];

          for (let q = 1; q <= quantity; q++) {
            let seq = existingAssetsCount + q;
            let assetCode = '';

            // Clean sequential check: if code exists, increment to next number (001, 002, 003...)
            // NEVER use random numbers or timestamps!
            while (true) {
              if (row.labCodePrefix) {
                const prefixNorm = row.labCodePrefix.endsWith('-') ? row.labCodePrefix : `${row.labCodePrefix}-`;
                assetCode = `${prefixNorm}${String(seq).padStart(3, '0')}`;
              } else {
                assetCode = `${prefixClean}-${currentYearThai}-${String(seq).padStart(3, '0')}`;
              }

              const existingAsset = await prisma.equipmentAsset.findUnique({
                where: { assetCode },
              });
              if (!existingAsset) {
                break;
              }
              seq++;
            }

            const govCode = govCodes[q - 1] || (quantity === 1 && row.govAssetCode ? String(row.govAssetCode).trim() : null);
            const serialNumber = quantity === 1 && row.serialNumber ? String(row.serialNumber).trim() : null;
            const assetReceivedDate = row.receivedDate || new Date();

            await prisma.equipmentAsset.create({
              data: {
                itemId: item.id,
                assetCode,
                govAssetCode: govCode,
                sequenceNumber: seq,
                brand: row.brand || item.brand || null,
                model: row.model || item.model || null,
                serialNumber,
                supplier: row.supplier || null,
                warrantyExpiry: row.warrantyExpiry || null,
                location: row.location || item.location || 'ห้องปฏิบัติการพยาบาล',
                cost,
                receivedDate: assetReceivedDate,
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
                createdAt: assetReceivedDate,
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
      itemsCreated: createdItemsCount,
      updatedItemsCount,
      itemsUpdated: updatedItemsCount,
      createdAssetsCount,
      assetsCreated: createdAssetsCount,
      createdLotsCount,
      lotsCreated: createdLotsCount,
      errors,
      message: `นำเข้าพัสดุและครุภัณฑ์เรียบร้อยแล้ว: เพิ่มรายการใหม่ ${createdItemsCount} รายการ, อัปเดต ${updatedItemsCount} รายการ, ครุภัณฑ์ ${createdAssetsCount} ชิ้น, ล็อตเวชภัณฑ์ ${createdLotsCount} ล็อต`,
    });
  } catch (error: any) {
    console.error('Bulk item import error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการนำเข้าพัสดุ' },
      { status: 500 }
    );
  }
}
