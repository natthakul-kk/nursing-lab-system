const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function syncAllMasterExcel() {
  console.log('=== Syncing Master Excel Templates with DB ===');

  const assets = await prisma.equipmentAsset.findMany({
    include: {
      item: { include: { category: true } }
    }
  });

  const govMap = new Map();
  for (const a of assets) {
    if (a.govAssetCode) {
      govMap.set(a.govAssetCode.trim(), a);
    }
  }

  const masterFiles = [
    'Template_Items_and_Assets_v3.xlsx',
    'Template_Items_and_Assets_v3.updated.xlsx'
  ];

  for (const mName of masterFiles) {
    const mPath = path.join(__dirname, '..', 'ข้อมูลครุภัณฑ์', mName);
    if (!fs.existsSync(mPath)) continue;

    console.log(`Syncing ${mName}...`);
    const wb = XLSX.readFile(mPath);
    const ws = wb.Sheets['แบบฟอร์มนำเข้าพัสดุ'];
    const rows = XLSX.utils.sheet_to_json(ws);

    let updatedCount = 0;
    for (const r of rows) {
      const gov = r['เลขครุภัณฑ์ราชการ'] ? String(r['เลขครุภัณฑ์ราชการ']).trim() : '';
      if (gov && govMap.has(gov)) {
        const a = govMap.get(gov);
        r['รหัสพัสดุ'] = a.assetCode;
        r['ชื่อรายการ'] = a.item.name;
        r['หมวดหมู่'] = a.item.category?.name || r['หมวดหมู่'];
        r['ยี่ห้อ (Brand)'] = a.brand || a.item.brand || r['ยี่ห้อ (Brand)'];
        r['รุ่น (Model)'] = a.model || a.item.model || r['รุ่น (Model)'];
        if (a.imageUrl) {
          r['ลิงก์รูปภาพ (Image URL)'] = a.imageUrl;
          r['รูปภาพ'] = a.imageUrl;
        }
        updatedCount++;
      }
    }

    const newWs = XLSX.utils.json_to_sheet(rows);
    wb.Sheets['แบบฟอร์มนำเข้าพัสดุ'] = newWs;
    XLSX.writeFile(wb, mPath);
    console.log(`✓ Updated ${updatedCount} rows in ${mName}`);
  }
}

syncAllMasterExcel()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
