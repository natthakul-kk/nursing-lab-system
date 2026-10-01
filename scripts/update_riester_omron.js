const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

async function main() {
  console.log('=== Updating Brand: Riester and Omron ===');

  // 1. Update ชุดตรวจหูตรวจตา -> Riester
  const diaItem = await prisma.item.findUnique({
    where: { code: 'EQ-DIA-0001' }
  });
  if (diaItem) {
    await prisma.item.update({
      where: { id: diaItem.id },
      data: { brand: 'Riester' }
    });
    console.log('✓ Updated Item EQ-DIA-0001 (ชุดตรวจหูตรวจตา) brand to "Riester".');
  }

  const diaAssetsUpdated = await prisma.equipmentAsset.updateMany({
    where: {
      item: { code: 'EQ-DIA-0001' }
    },
    data: { brand: 'Riester' }
  });
  console.log(`✓ Updated ${diaAssetsUpdated.count} assets for ชุดตรวจหูตรวจตา to brand "Riester".`);

  // 2. Update เครื่องวัดความดันโลหิตอัตโนมัติ (Digital BP) -> Omron
  const bpItem = await prisma.item.findUnique({
    where: { code: 'EQ-BP-0006' }
  });
  if (bpItem) {
    await prisma.item.update({
      where: { id: bpItem.id },
      data: { brand: 'Omron' }
    });
    console.log('✓ Updated Item EQ-BP-0006 (เครื่องวัดความดันโลหิตอัตโนมัติ) brand to "Omron".');
  }

  const bpAssetsUpdated = await prisma.equipmentAsset.updateMany({
    where: {
      item: { code: 'EQ-BP-0006' }
    },
    data: { brand: 'Omron' }
  });
  console.log(`✓ Updated ${bpAssetsUpdated.count} assets for เครื่องวัดความดันโลหิตอัตโนมัติ to brand "Omron".`);

  // 3. Update Excel Template
  const templatePath = path.join(process.cwd(), 'ข้อมูลครุภัณฑ์', 'Template_Items_and_Assets_v3.xlsx');
  const updatedPath = path.join(process.cwd(), 'ข้อมูลครุภัณฑ์', 'Template_Items_and_Assets_v3.updated.xlsx');
  
  // Read from updatedPath if exists, else templatePath
  const sourcePath = fs.existsSync(updatedPath) ? updatedPath : templatePath;
  const wb = xlsx.readFile(sourcePath);
  const sheetName = wb.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });

  let excelDiaCount = 0;
  let excelBpCount = 0;

  const clean = s => s ? String(s).replace(/[\s\r\n\t]/g, '').trim() : '';

  const newRows = rows.map(r => {
    const code = clean(r['รหัสพัสดุ'] || '');
    const name = clean(r['ชื่อรายการ'] || '');

    if (code.startsWith('EQ-DIA-0001') || code.startsWith('EQ-DIA-000') || name.includes('ชุดตรวจหูตรวจตา')) {
      // Check if it's the 10 diagnostic sets
      if (code === 'EQ-DIA-0001' || (code.startsWith('EQ-DIA-00') && !['EQ-DIA-0011', 'EQ-DIA-0012'].includes(code))) {
        r['ยี่ห้อ (Brand)'] = 'Riester';
        excelDiaCount++;
      }
    }

    if (code.startsWith('EQ-BP-000') || name.includes('เครื่องวัดความดันโลหิตอัตโนมัติ')) {
      if (['EQ-BP-0006', 'EQ-BP-0007', 'EQ-BP-0008', 'EQ-BP-0009', 'EQ-BP-0010', 'EQ-BP-0011', 'EQ-BP-0012', 'EQ-BP-0013', 'EQ-BP-0014', 'EQ-BP-0015'].includes(code) || name === 'เครื่องวัดความดันโลหิตอัตโนมัติ') {
        r['ยี่ห้อ (Brand)'] = 'Omron';
        excelBpCount++;
      }
    }

    return r;
  });

  console.log(`Excel adjustments: ${excelDiaCount} rows set to Riester, ${excelBpCount} rows set to Omron.`);

  wb.Sheets[sheetName] = xlsx.utils.json_to_sheet(newRows);
  xlsx.writeFile(wb, updatedPath);
  console.log(`✓ Saved to: ${updatedPath}`);

  try {
    xlsx.writeFile(wb, templatePath);
    console.log(`✓ Also saved directly to main template: ${templatePath}`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.log(`Notice: Main template ${templatePath} is currently locked by Excel.`);
    }
  }

  // 4. Verification in Database
  const allAssets = await prisma.equipmentAsset.findMany();
  const brandStats = {};
  for (const a of allAssets) {
    const b = a.brand || 'NULL';
    brandStats[b] = (brandStats[b] || 0) + 1;
  }

  console.log('\n=== Verification: Updated Brand Distribution ===');
  console.table(Object.entries(brandStats).sort((a, b) => b[1] - a[1]));

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
