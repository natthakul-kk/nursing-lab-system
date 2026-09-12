const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseSafeDate(val) {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'number') {
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
        if (yr > 2400) yr -= 543;
        const parsed = new Date(yr, Number(parts[1]) - 1, Number(parts[0]));
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
  }
  return null;
}

function normalizeItemType(typeInput, itemName, categoryName, code, packSize, usageUnit) {
  if (typeInput) {
    const t = typeInput.trim().toUpperCase();
    if (t.includes('CONSUMABLE') || t.includes('สิ้นเปลือง') || t.includes('เวชภัณฑ์') || t.includes('ยา') || t.includes('วัสดุ')) {
      return 'CONSUMABLE';
    }
    if (t.includes('EQUIPMENT') || t.includes('ครุภัณฑ์') || t.includes('เครื่อง') || t.includes('หุ่น') || t.includes('เตียง')) {
      return 'EQUIPMENT';
    }
  }

  if (code) {
    const upperCode = code.trim().toUpperCase();
    if (upperCode.startsWith('CS-') || upperCode.startsWith('CON-')) {
      return 'CONSUMABLE';
    }
    if (upperCode.startsWith('EQ-')) {
      return 'EQUIPMENT';
    }
  }

  if ((packSize && packSize > 1) || (usageUnit && usageUnit.trim() !== '')) {
    return 'CONSUMABLE';
  }

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

function extractItemFromRow(row) {
  const map = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined || v === null) continue;
    const cleanKey = k.toString().trim().toLowerCase().replace(/[\s\-_/()]/g, '');
    map[cleanKey] = typeof v === 'string' ? v.trim() : v;
    map[k.trim()] = typeof v === 'string' ? v.trim() : v;
  }

  const name = map['ชื่อรายการ'] || map['ชื่อพัสดุ'] || map['ชื่อเวชภัณฑ์'] || map['ชื่อ'] || row['ชื่อรายการ'] || '';
  const code = map['รหัสพัสดุ'] || map['รหัสเวชภัณฑ์'] || map['รหัส'] || row['รหัสพัสดุ'] || '';
  const category = map['หมวดหมู่'] || map['หมวด'] || row['หมวดหมู่'] || '';
  const unit = map['หน่วยบรรจุหน่วยใหญ่'] || map['หน่วยบรรจุ'] || map['หน่วยนับ'] || row['หน่วยบรรจุ (หน่วยใหญ่)'] || '';
  const usageUnit = map['หน่วยย่อยที่เบิกใช้'] || map['หน่วยย่อย'] || row['หน่วยย่อยที่เบิกใช้'] || '';
  const packSize = Math.max(1, Number(map['จำนวนย่อยต่อแพ็คชิ้นกล่อง'] || map['จำนวนย่อยต่อแพ็ค'] || row['จำนวนย่อยต่อแพ็ค (ชิ้น/กล่อง)'] || 1));
  const minStockAlert = Math.max(0, Number(map['จุดแจ้งเตือนสต็อกขั้นต่ำ'] || map['จุดเตือนขั้นต่ำ'] || row['จุดแจ้งเตือนสต็อกขั้นต่ำ'] || 5));

  const rawQuantity = map['จำนวนรับเข้าหน่วยใหญ่'] || map['จำนวนรับเข้า'] || map['จำนวน'] || row['จำนวนรับเข้า (หน่วยใหญ่)'] || row['จำนวนรับเข้า'] || 1;
  const quantity = Math.max(1, Number(rawQuantity) || 1);

  const rawCost = map['ราคาต่อหน่วยบรรจุ'] || map['ราคาต่อหน่วย'] || map['ราคา'] || map['ราคาทุน'] || row['ราคาต่อหน่วยบรรจุ'] || row['ราคาต่อหน่วย'] || 0;
  const cost = Math.max(0, Number(rawCost) || 0);

  const location = map['สถานที่จัดเก็บ'] || map['สถานที่'] || row['สถานที่จัดเก็บ'] || 'ห้องเก็บของ';
  const description = map['คำอธิบาย'] || map['รายละเอียด'] || row['คำอธิบาย'] || '';
  const lotNumber = map['หมายเลขล็อต'] || map['ล็อต'] || row['หมายเลขล็อต'] || '';
  const supplier = map['ผู้จัดจำหน่ายsupplier'] || map['ผู้จัดจำหน่าย'] || row['ผู้จัดจำหน่าย (Supplier)'] || '';
  const rawReceivedDate = map['วันที่รับเข้าyyyymmdd'] || map['วันที่รับเข้า'] || row['วันที่รับเข้า (YYYY-MM-DD)'] || '';
  const rawExpiryDate = map['วันหมดอายุyyyymmdd'] || map['วันหมดอายุ'] || row['วันหมดอายุ (YYYY-MM-DD)'] || '';

  const type = normalizeItemType(row['ประเภท'], name, category, code, packSize, usageUnit);

  return {
    name: String(name || '').trim(),
    code: String(code || '').trim().toUpperCase(),
    type,
    category: String(category || '').trim(),
    unit: String(unit || 'ชิ้น').trim(),
    quantity,
    cost,
    location: String(location || 'ห้องเก็บของ').trim(),
    description: String(description || '').trim(),
    lotNumber: String(lotNumber || '').trim(),
    expiryDate: parseSafeDate(rawExpiryDate),
    receivedDate: parseSafeDate(rawReceivedDate) || new Date('2026-08-14T00:00:00.000Z'),
    supplier: String(supplier || '').trim(),
    packSize,
    usageUnit: String(usageUnit || unit || 'ชิ้น').trim(),
    minStockAlert,
  };
}

async function main() {
  console.log('--- Starting Consumables Bulk Import ---');

  const baseDir = 'd:\\LAB-system';
  const dirName = fs.readdirSync(baseDir).find(f => f.includes('วัสดุสิ้นเปลือง'));
  if (!dirName) {
    throw new Error('Directory ข้อมูลวัสดุสิ้นเปลือง not found!');
  }
  const folderPath = path.join(baseDir, dirName);
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
  if (files.length === 0) {
    throw new Error('No Excel file found in ' + folderPath);
  }
  const filePath = path.join(folderPath, files[0]);
  console.log('Reading file:', filePath);

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet);
  console.log('Found total rows in sheet:', rawRows.length);

  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { createdAt: 'asc' }
  });
  const userId = admin ? admin.id : null;
  console.log('Using admin user ID for audit log:', userId, '(' + (admin ? admin.name : 'Unknown') + ')');

  const existingCategories = await prisma.category.findMany();
  const categoryMap = new Map();
  existingCategories.forEach((c) => categoryMap.set(c.name.trim().toLowerCase(), c.id));

  let createdCount = 0;
  let updatedCount = 0;
  let lotCount = 0;
  let txCount = 0;
  let totalPiecesCalculated = 0;
  let totalCostCalculated = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    if (!raw || typeof raw !== 'object') continue;

    const row = extractItemFromRow(raw);
    if (!row.name && !row.code) continue;

    let categoryId = '';
    const catName = row.category || 'เวชภัณฑ์ทั่วไป';
    const catKey = catName.toLowerCase();
    if (categoryMap.has(catKey)) {
      categoryId = categoryMap.get(catKey);
    } else {
      const newCat = await prisma.category.create({
        data: {
          name: catName,
          type: 'CONSUMABLE',
          description: 'หมวดหมู่วัสดุสิ้นเปลืองและเวชภัณฑ์ห้องปฏิบัติการ',
        },
      });
      categoryId = newCat.id;
      categoryMap.set(catKey, newCat.id);
      console.log('+ Created new category: ' + catName + ' (' + newCat.id + ')');
    }

    let item = await prisma.item.findFirst({
      where: {
        OR: [
          { code: { equals: row.code, mode: 'insensitive' } },
          { name: { equals: row.name, mode: 'insensitive' } },
        ],
      },
    });

    if (!item) {
      item = await prisma.item.create({
        data: {
          code: row.code,
          name: row.name,
          type: 'CONSUMABLE',
          categoryId: categoryId,
          unit: row.unit,
          usageUnit: row.usageUnit,
          conversionRatio: row.packSize,
          location: row.location,
          minStockAlert: row.minStockAlert,
          description: row.description || null,
        },
      });
      createdCount++;
      console.log('[' + (i + 1) + '/' + rawRows.length + '] Created Item: [' + item.code + '] ' + item.name);
    } else {
      item = await prisma.item.update({
        where: { id: item.id },
        data: {
          usageUnit: row.usageUnit,
          conversionRatio: row.packSize,
          unit: row.unit,
          categoryId: categoryId,
          location: row.location,
          minStockAlert: row.minStockAlert,
          description: row.description || item.description,
        },
      });
      updatedCount++;
      console.log('[' + (i + 1) + '/' + rawRows.length + '] Updated Item: [' + item.code + '] ' + item.name);
    }

    const lotNum = row.lotNumber || 'อว 6501.38/1429';
    const packSize = row.packSize || 1;
    const totalPieces = row.quantity * packSize;
    const packageUnit = row.unit || 'กล่อง';
    const usageUnit = row.usageUnit || 'ชิ้น';
    const totalCost = row.quantity * row.cost;

    const lot = await prisma.stockLot.create({
      data: {
        itemId: item.id,
        lotNumber: lotNum,
        packSize: packSize,
        packageUnit: packageUnit,
        totalPieces: totalPieces,
        piecesRemaining: totalPieces,
        quantityInitial: row.quantity,
        quantityRemaining: row.quantity,
        unitCost: row.cost,
        expiryDate: row.expiryDate,
        receivedDate: row.receivedDate,
        supplier: row.supplier || null,
      },
    });
    lotCount++;

    await prisma.stockTransaction.create({
      data: {
        itemId: item.id,
        lotId: lot.id,
        type: 'IN',
        quantity: row.quantity,
        unitCost: row.cost,
        totalCost: totalCost,
        createdById: userId,
        createdAt: row.receivedDate,
        note: packSize > 1
          ? 'นำเข้าสต็อกวัสดุสิ้นเปลือง (Lot: ' + lotNum + ') ' + row.quantity + ' ' + packageUnit + ' บรรจุ ' + packSize + ' ' + usageUnit + '/' + packageUnit + ' (รวม ' + totalPieces.toLocaleString() + ' ' + usageUnit + ')'
          : 'นำเข้าสต็อกวัสดุสิ้นเปลือง (Lot: ' + lotNum + ') ' + row.quantity + ' ' + packageUnit,
      },
    });
    txCount++;

    totalPiecesCalculated += totalPieces;
    totalCostCalculated += totalCost;
  }

  console.log('\n=============================================');
  console.log('IMPORT COMPLETED SUCCESSFULLY!');
  console.log('- Items Created: ' + createdCount);
  console.log('- Items Updated: ' + updatedCount);
  console.log('- Stock Lots Created: ' + lotCount);
  console.log('- Stock Transactions Created: ' + txCount);
  console.log('- Total Sub-pieces in Stock: ' + totalPiecesCalculated.toLocaleString());
  console.log('- Total Inventory Value: ฿' + totalCostCalculated.toLocaleString());
  console.log('=============================================\n');
}

main()
  .catch((err) => {
    console.error('ERROR during import:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma['$disconnect']();
  });
