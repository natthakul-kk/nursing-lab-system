const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function updateMasterTemplates() {
  console.log('=== Updating Master Templates with latest Image URLs from Database ===');

  // Fetch all assets with image URLs
  const assets = await prisma.equipmentAsset.findMany({
    where: {
      imageUrl: { not: null }
    },
    select: {
      assetCode: true,
      govAssetCode: true,
      imageUrl: true
    }
  });

  const validAssets = assets.filter(a => a.imageUrl && a.imageUrl.trim() !== '');
  console.log(`Found ${validAssets.length} assets with valid image URLs in database.`);

  const assetMap = new Map();
  for (const a of validAssets) {
    assetMap.set(a.assetCode, a.imageUrl.trim());
    if (a.govAssetCode) {
      assetMap.set(a.govAssetCode.trim(), a.imageUrl.trim());
    }
  }

  const masterFiles = [
    'Template_Items_and_Assets_v3.xlsx',
    'Template_Items_and_Assets_v3.updated.xlsx'
  ];

  for (const mName of masterFiles) {
    const mPath = path.join(__dirname, '..', 'ข้อมูลครุภัณฑ์', mName);
    if (!fs.existsSync(mPath)) continue;

    console.log(`Updating ${mName}...`);
    const wb = XLSX.readFile(mPath);
    const ws = wb.Sheets['แบบฟอร์มนำเข้าพัสดุ'];
    if (!ws) {
      console.warn(`Sheet "แบบฟอร์มนำเข้าพัสดุ" not found in ${mName}`);
      continue;
    }

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (rows.length === 0) continue;

    const header = rows[0];
    const assetCodeIdx = header.findIndex(h => h === 'รหัสพัสดุ');
    const govCodeIdx = header.findIndex(h => h === 'เลขครุภัณฑ์ราชการ');
    let urlIdx = header.findIndex(h => h === 'ลิงก์รูปภาพ (Image URL)');
    let imgIdx = header.findIndex(h => h === 'รูปภาพ');

    if (urlIdx === -1) {
      urlIdx = header.length;
      header.push('ลิงก์รูปภาพ (Image URL)');
    }
    if (imgIdx === -1) {
      imgIdx = header.length;
      header.push('รูปภาพ');
    }

    let updatedCount = 0;
    for (let r = 1; r < rows.length; r++) {
      const code = rows[r][assetCodeIdx] ? String(rows[r][assetCodeIdx]).trim() : '';
      const govCode = rows[r][govCodeIdx] ? String(rows[r][govCodeIdx]).trim() : '';

      let foundUrl = null;
      if (code && assetMap.has(code)) {
        foundUrl = assetMap.get(code);
      } else if (govCode && assetMap.has(govCode)) {
        foundUrl = assetMap.get(govCode);
      }

      if (foundUrl) {
        const urlCell = XLSX.utils.encode_cell({ r, c: urlIdx });
        const imgCell = XLSX.utils.encode_cell({ r, c: imgIdx });
        ws[urlCell] = { t: 's', v: foundUrl };
        ws[imgCell] = { t: 's', v: foundUrl };
        updatedCount++;
      }
    }

    // Update range
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Q374');
    range.e.c = Math.max(range.e.c, urlIdx, imgIdx);
    ws['!ref'] = XLSX.utils.encode_range(range);

    try {
      XLSX.writeFile(wb, mPath);
      console.log(`✓ Updated ${updatedCount} rows in ${mName}`);
    } catch (err) {
      console.error(`Failed to write ${mName}: ${err.message}`);
    }
  }
}

updateMasterTemplates()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
