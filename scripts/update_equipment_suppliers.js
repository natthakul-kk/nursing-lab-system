const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const path = require('path');

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

  const group164 = []; // In ERP with seller
  const group71 = [];  // In ERP with empty seller -> set to "4DEM"
  const group138 = []; // Not in ERP -> clear to null

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
  console.log(`Group 138 (Not in ERP -> FA items -> clear null): ${group138.length}`);

  // 3. Update DB
  // Group 71 -> 4DEM
  console.log('\nUpdating Group 71 to "4DEM"...');
  for (const a of group71) {
    await prisma.equipmentAsset.update({
      where: { id: a.id },
      data: { supplier: '4DEM' }
    });
  }

  // Group 138 -> null (clearing erroneous upright simulation)
  console.log('Clearing Group 138 to null (unspecified)...');
  for (const a of group138) {
    await prisma.equipmentAsset.update({
      where: { id: a.id },
      data: { supplier: null }
    });
  }

  // Group 164 -> ensure it has "บริษัท อัพไรท์ ซิมมูเลชั่น  จำกัด"
  for (const a of group164) {
    await prisma.equipmentAsset.update({
      where: { id: a.id },
      data: { supplier: 'บริษัท อัพไรท์ ซิมมูเลชั่น  จำกัด' }
    });
  }

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
        row['ผู้จัดจำหน่าย (Supplier)'] = 'บริษัท อัพไรท์ ซิมมูเลชั่น  จำกัด';
      } else {
        excel71Count++;
        row['ผู้จัดจำหน่าย (Supplier)'] = '4DEM';
      }
    } else {
      excel138Count++;
      row['ผู้จัดจำหน่าย (Supplier)'] = '';
    }
    return row;
  });

  console.log(`\nExcel template rows updated:`);
  console.log(`- Upright Simulation: ${excel164Count}`);
  console.log(`- 4DEM: ${excel71Count}`);
  console.log(`- Cleared to empty: ${excel138Count}`);

  const newSheet = xlsx.utils.json_to_sheet(updatedRows);
  wbTemplate.Sheets[sheetName] = newSheet;
  xlsx.writeFile(wbTemplate, templatePath);
  console.log(`Excel template saved to ${templatePath}`);

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
