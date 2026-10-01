const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

async function main() {
  console.log('=== Executing Equipment Brand & Model Fix ===');

  // 1. Fix EQ-IV-0001
  const iv0001 = await prisma.equipmentAsset.findUnique({
    where: { assetCode: 'EQ-IV-0001' },
    include: { item: true }
  });
  if (iv0001) {
    await prisma.equipmentAsset.update({
      where: { id: iv0001.id },
      data: {
        brand: iv0001.item.brand || 'Nasco Life/form',
        model: iv0001.item.model || 'LF00698 Venipuncture Arm'
      }
    });
    console.log('✓ Fixed EQ-IV-0001 brand and model from parent item.');
  }

  // 2. Identify and fix 28 assets in 4DEM supplier that currently have Brand = 'Upright Simulation'
  const assets4DEM = await prisma.equipmentAsset.findMany({
    where: {
      supplier: '4DEM',
      brand: 'Upright Simulation'
    },
    include: { item: true }
  });

  console.log(`Found ${assets4DEM.length} assets with supplier 4DEM and brand "Upright Simulation".`);

  const updatedAssetIds = [];
  const affectedItemIds = new Set();

  for (const a of assets4DEM) {
    updatedAssetIds.push(a.id);
    affectedItemIds.add(a.itemId);
  }

  if (updatedAssetIds.length > 0) {
    await prisma.equipmentAsset.updateMany({
      where: { id: { in: updatedAssetIds } },
      data: { brand: '4DEM' }
    });
    console.log(`✓ Updated ${updatedAssetIds.length} assets brand to "4DEM".`);
  }

  // Also check if the parent Items for these assets have brand = 'Upright Simulation'
  for (const itemId of affectedItemIds) {
    const it = await prisma.item.findUnique({
      where: { id: itemId },
      include: { assets: true }
    });
    if (it && it.brand === 'Upright Simulation') {
      // Check if all its assets are 4DEM
      const hasOtherSupplier = it.assets.some(a => a.supplier !== '4DEM');
      if (!hasOtherSupplier) {
        await prisma.item.update({
          where: { id: itemId },
          data: { brand: '4DEM' }
        });
        console.log(`✓ Updated parent Item "${it.name}" (${it.code}) brand to "4DEM".`);
      }
    }
  }

  // 3. Update Excel Template
  const templatePath = path.join(process.cwd(), 'ข้อมูลครุภัณฑ์', 'Template_Items_and_Assets_v3.xlsx');
  const wb = xlsx.readFile(templatePath);
  const sheetName = wb.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });

  let excelFixed4DEM = 0;
  let excelFixedIV = 0;

  const clean = s => s ? String(s).replace(/[\s\r\n\t]/g, '').trim() : '';

  const updatedRows = rows.map(r => {
    const code = clean(r['รหัสพัสดุ'] || '');
    const sup = r['ผู้จัดจำหน่าย (Supplier)'] || '';
    const b = r['ยี่ห้อ (Brand)'] || '';

    // Fix EQ-IV-0001 in template if needed
    if (code === 'EQ-IV-0001' && (!r['ยี่ห้อ (Brand)'] || !r['รุ่น (Model)'])) {
      r['ยี่ห้อ (Brand)'] = 'Nasco Life/form';
      r['รุ่น (Model)'] = 'LF00698 Venipuncture Arm';
      excelFixedIV++;
    }

    // Fix 4DEM items with Upright brand
    if (sup === '4DEM' && b === 'Upright Simulation') {
      r['ยี่ห้อ (Brand)'] = '4DEM';
      excelFixed4DEM++;
    }

    return r;
  });

  console.log(`Excel adjustments: ${excelFixed4DEM} rows set brand to 4DEM, ${excelFixedIV} rows fixed for IV-0001.`);

  wb.Sheets[sheetName] = xlsx.utils.json_to_sheet(updatedRows);

  try {
    xlsx.writeFile(wb, templatePath);
    console.log(`✓ Excel template successfully updated: ${templatePath}`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      const altPath = path.join(process.cwd(), 'ข้อมูลครุภัณฑ์', 'Template_Items_and_Assets_v3.updated.xlsx');
      xlsx.writeFile(wb, altPath);
      console.log(`Notice: File was busy. Written to: ${altPath}`);
    } else {
      throw err;
    }
  }

  // 4. Verification in Database
  const allAssets = await prisma.equipmentAsset.findMany();
  const brandStats = {};
  let nullBrandCount = 0;
  let nullModelCount = 0;
  let clashCount = 0;

  for (const a of allAssets) {
    const b = a.brand || 'NULL';
    if (!a.brand) nullBrandCount++;
    if (!a.model) nullModelCount++;
    if (a.supplier === '4DEM' && a.brand === 'Upright Simulation') clashCount++;
    brandStats[b] = (brandStats[b] || 0) + 1;
  }

  console.log('\n=== Verification Summary ===');
  console.log(`Total Assets: ${allAssets.length}`);
  console.log(`Null Brand count: ${nullBrandCount}`);
  console.log(`Null Model count: ${nullModelCount}`);
  console.log(`Clashing 4DEM with Upright brand: ${clashCount}`);
  console.log('\nBrand Breakdown across all 373 assets:');
  console.table(Object.entries(brandStats).sort((a, b) => b[1] - a[1]));

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
