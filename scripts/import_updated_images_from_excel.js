const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function importUpdatedImages() {
  console.log('=== Reading Updated Images from Excel ===');
  const reportPath = path.join(__dirname, '..', 'ข้อมูลครุภัณฑ์', 'รายงานรายการครุภัณฑ์คงทนที่ยังไม่มีรูปภาพ.xlsx');
  
  if (!fs.existsSync(reportPath)) {
    throw new Error(`File not found: ${reportPath}`);
  }

  const wb = XLSX.readFile(reportPath);
  const sheet3 = wb.Sheets['3.รายชิ้นครุภัณฑ์ที่ขาดรูป'];
  if (!sheet3) {
    throw new Error('Sheet "3.รายชิ้นครุภัณฑ์ที่ขาดรูป" not found');
  }

  const rows = XLSX.utils.sheet_to_json(sheet3);
  const updatedRows = rows.filter(r => {
    const url = r['ช่องสำหรับใส่ลิงก์รูปภาพ (Google Drive URL)'];
    return url && String(url).trim() !== '';
  });

  console.log(`Found ${updatedRows.length} assets with image URLs in Excel.`);

  let updatedAssetCount = 0;
  const itemUrlMap = new Map(); // itemId -> imageUrl

  for (const row of updatedRows) {
    const assetCode = String(row['รหัสครุภัณฑ์ (Lab Asset Code)']).trim();
    const rawUrl = String(row['ช่องสำหรับใส่ลิงก์รูปภาพ (Google Drive URL)']).trim();
    
    // Find asset in database
    const asset = await prisma.equipmentAsset.findUnique({
      where: { assetCode },
      include: { item: true }
    });

    if (!asset) {
      console.warn(`Asset not found in database: ${assetCode}`);
      continue;
    }

    // Update EquipmentAsset imageUrl
    await prisma.equipmentAsset.update({
      where: { id: asset.id },
      data: { imageUrl: rawUrl }
    });
    updatedAssetCount++;

    // Track for updating parent Item
    if (asset.itemId && !itemUrlMap.has(asset.itemId)) {
      itemUrlMap.set(asset.itemId, rawUrl);
    }
  }

  console.log(`✓ Updated ${updatedAssetCount} EquipmentAsset records with imageUrl.`);

  // Update parent Items
  let updatedItemCount = 0;
  for (const [itemId, imageUrl] of itemUrlMap.entries()) {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (item) {
      await prisma.item.update({
        where: { id: itemId },
        data: { imageUrl }
      });
      console.log(`✓ Updated parent Item [${item.code}] ${item.name} -> ${imageUrl}`);
      updatedItemCount++;
    }
  }

  console.log(`✓ Updated ${updatedItemCount} parent Item records.`);

  // -------------------------------------------------------------------------
  // Update Master Excel Templates
  // -------------------------------------------------------------------------
  const masterFiles = [
    'Template_Items_and_Assets_v3.xlsx',
    'Template_Items_and_Assets_v3.updated.xlsx'
  ];

  for (const mName of masterFiles) {
    const mPath = path.join(__dirname, '..', 'ข้อมูลครุภัณฑ์', mName);
    if (!fs.existsSync(mPath)) continue;

    console.log(`\nUpdating master Excel: ${mName}...`);
    const masterWb = XLSX.readFile(mPath);

    // 1. Update Asset sheet
    const assetSheetName = masterWb.SheetNames.find(s => s.toLowerCase().includes('asset') || s.includes('รายชิ้น'));
    let masterAssetUpdated = 0;
    if (assetSheetName) {
      const aSheet = masterWb.Sheets[assetSheetName];
      const aRows = XLSX.utils.sheet_to_json(aSheet, { header: 1 });
      if (aRows.length > 0) {
        const header = aRows[0];
        const codeColIdx = header.findIndex(h => h && (String(h).includes('รหัสประจำชิ้น') || String(h).includes('Asset Code') || String(h).includes('รหัสครุภัณฑ์')));
        const imgColIdx = header.findIndex(h => h && (String(h).includes('รูปภาพ') || String(h).includes('Image')));

        if (codeColIdx !== -1 && imgColIdx !== -1) {
          // Build lookup map from updatedRows
          const assetUrlMap = new Map();
          for (const r of updatedRows) {
            assetUrlMap.set(String(r['รหัสครุภัณฑ์ (Lab Asset Code)']).trim(), String(r['ช่องสำหรับใส่ลิงก์รูปภาพ (Google Drive URL)']).trim());
          }

          for (let r = 1; r < aRows.length; r++) {
            const rowCode = aRows[r][codeColIdx];
            if (rowCode && assetUrlMap.has(String(rowCode).trim())) {
              const newUrl = assetUrlMap.get(String(rowCode).trim());
              const cellAddress = XLSX.utils.encode_cell({ r, c: imgColIdx });
              aSheet[cellAddress] = { t: 's', v: newUrl };
              masterAssetUpdated++;
            }
          }
        }
      }
    }

    // 2. Update Item sheet
    const itemSheetName = masterWb.SheetNames.find(s => s.toLowerCase().includes('item') || s.includes('ทะเบียน'));
    let masterItemUpdated = 0;
    if (itemSheetName) {
      const iSheet = masterWb.Sheets[itemSheetName];
      const iRows = XLSX.utils.sheet_to_json(iSheet, { header: 1 });
      if (iRows.length > 0) {
        const header = iRows[0];
        const itemCodeColIdx = header.findIndex(h => h && (String(h).includes('รหัสหมวด') || String(h).includes('Item Code') || String(h).includes('รหัสรายการ')));
        const itemImgColIdx = header.findIndex(h => h && (String(h).includes('รูปภาพ') || String(h).includes('Image')));

        if (itemCodeColIdx !== -1 && itemImgColIdx !== -1) {
          // Build item lookup from updated items
          const itemCodeToUrl = new Map();
          for (const r of updatedRows) {
            const itCode = String(r['รหัสอ้างอิง Item (Item Code)']).trim();
            const url = String(r['ช่องสำหรับใส่ลิงก์รูปภาพ (Google Drive URL)']).trim();
            if (!itemCodeToUrl.has(itCode)) itemCodeToUrl.set(itCode, url);
          }

          for (let r = 1; r < iRows.length; r++) {
            const rowCode = iRows[r][itemCodeColIdx];
            if (rowCode && itemCodeToUrl.has(String(rowCode).trim())) {
              const newUrl = itemCodeToUrl.get(String(rowCode).trim());
              const cellAddress = XLSX.utils.encode_cell({ r, c: itemImgColIdx });
              iSheet[cellAddress] = { t: 's', v: newUrl };
              masterItemUpdated++;
            }
          }
        }
      }
    }

    try {
      XLSX.writeFile(masterWb, mPath);
      console.log(`✓ Master Excel updated: ${mName} (Assets: ${masterAssetUpdated}, Items: ${masterItemUpdated})`);
    } catch (err) {
      console.warn(`Could not overwrite ${mName}: ${err.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // Re-generate updated missing images report
  // -------------------------------------------------------------------------
  console.log('\nRefreshing missing images Excel report...');
  const exportScript = require('./export_missing_images_excel.js');
}

importUpdatedImages()
  .then(() => {
    console.log('\n=== Image import finished successfully ===');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error during image import:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
