const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const path = require('path');

const UPRIGHT_NAME = 'บริษัท อัพไรท์ ซิมมูเลชั่น จำกัด';
const FOUR_DEM_NAME = '4DEM';

async function main() {
  console.log('=== Starting Equipment Supplier Update ===');

  // 1. Read ERP file
  const erpPath = path.join(process.cwd(), 'ข้อมูลครุภัณฑ์', 'ครุภัณฑ์าก ERP.xlsx');
  const wbErp = xlsx.readFile(erpPath);
  const erpRows = xlsx.utils.sheet_to_json(wbErp.Sheets[wbErp.SheetNames[0]]);

  const cleanCode = (s) => (s ? String(s).replace(/[\s\r\n\t]/g, '').trim() : '');
  const erpMap = new Map();
  for (const r of erpRows) {
    if (r['หมายเลขสินทรัพย์ถาวร']) {
      erpMap.set(cleanCode(r['หมายเลขสินทรัพย์ถาวร']), r);
    }
  }

  // 2. Fetch all equipment assets from DB
  const allAssets = await prisma.equipmentAsset.findMany({
    include: { item: true }
  });
  console.log(`Total equipment assets in DB: ${allAssets.length}`);

  const group164 = []; // In ERP with seller -> UPRIGHT
  const group71 = [];  // In ERP with empty seller (FT) -> 4DEM
  const group138 = []; // Not in ERP (FA) -> UPRIGHT

  for (const a of allAssets) {
    const code = cleanCode(a.govAssetCode);
    if (erpMap.has(code)) {
      const erp = erpMap.get(code);
      const seller = erp['ชื่อผู้ขาย'] ? String(erp['ชื่อผู้ขาย']).trim() : '';
      if (seller) {
        group164.push(a);
      } else {
        group71.push(a);
      }
    } else {
      group138.push(a);
    }
  }

  console.log(`Group 164 (ERP with Upright): ${group164.length}`);
  console.log(`Group 71 (ERP with empty seller -> 4DEM): ${group71.length}`);
  console.log(`Group 138 (Not in ERP -> Upright Simulation): ${group138.length}`);

  // 3. Batch Update DB using updateMany where possible or loop
  console.log(`\nUpdating Group 71 to "${FOUR_DEM_NAME}"...`);
  await prisma.equipmentAsset.updateMany({
    where: { id: { in: group71.map(a => a.id) } },
    data: { supplier: FOUR_DEM_NAME }
  });

  console.log(`Updating Group 138 to "${UPRIGHT_NAME}"...`);
  await prisma.equipmentAsset.updateMany({
    where: { id: { in: group138.map(a => a.id) } },
    data: { supplier: UPRIGHT_NAME }
  });

  console.log(`Updating Group 164 to "${UPRIGHT_NAME}"...`);
  await prisma.equipmentAsset.updateMany({
    where: { id: { in: group164.map(a => a.id) } },
    data: { supplier: UPRIGHT_NAME }
  });

  console.log('Database update completed.');

  // 4. Update Excel template: Template_Items_and_Assets_v3.xlsx
  const templatePath = path.join(process.cwd(), 'ข้อมูลครุภัณฑ์', 'Template_Items_and_Assets_v3.xlsx');
  const wbTemplate = xlsx.readFile(templatePath);
  const sheetName = wbTemplate.SheetNames[0];
  const templateRows = xlsx.utils.sheet_to_json(wbTemplate.Sheets[sheetName], { defval: '' });

  let excel71Count = 0;
  let excel138Count = 0;
  let excel164Count = 0;

  const updatedRows = templateRows.map(row => {
    const govCode = cleanCode(row['เลขครุภัณฑ์ราชการ']);
    if (erpMap.has(govCode)) {
      const erp = erpMap.get(govCode);
      const seller = erp['ชื่อผู้ขาย'] ? String(erp['ชื่อผู้ขาย']).trim() : '';
      if (seller) {
        excel164Count++;
        row['ผู้จัดจำหน่าย (Supplier)'] = UPRIGHT_NAME;
      } else {
        excel71Count++;
        row['ผู้จัดจำหน่าย (Supplier)'] = FOUR_DEM_NAME;
      }
    } else {
      excel138Count++;
      row['ผู้จัดจำหน่าย (Supplier)'] = UPRIGHT_NAME;
    }
    return row;
  });

  console.log(`\nExcel template rows updated:`);
  console.log(`- Upright Simulation (164 in ERP): ${excel164Count}`);
  console.log(`- Upright Simulation (138 FA): ${excel138Count}`);
  console.log(`- 4DEM (71 FT): ${excel71Count}`);
  console.log(`- Total Upright Simulation: ${excel164Count + excel138Count}`);

  const newSheet = xlsx.utils.json_to_sheet(updatedRows);
  wbTemplate.Sheets[sheetName] = newSheet;
  try {
    xlsx.writeFile(wbTemplate, templatePath);
    console.log(`Excel template saved to ${templatePath}`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      const altPath = path.join(process.cwd(), 'ข้อมูลครุภัณฑ์', 'Template_Items_and_Assets_v3.updated.xlsx');
      xlsx.writeFile(wbTemplate, altPath);
      console.log(`Notice: ${templatePath} is currently open in another program (Excel). Saved updated copy to ${altPath}`);
    } else {
      throw err;
    }
  }

  // 5. Verification
  const verifyAssets = await prisma.equipmentAsset.findMany();
  const summary = {};
  for (const a of verifyAssets) {
    const s = a.supplier || 'NULL';
    summary[s] = (summary[s] || 0) + 1;
  }
  console.log('\n=== Verification: Current Supplier Counts in DB ===');
  console.log(summary);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
