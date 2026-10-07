const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

async function main() {
  console.log('=== Updating Exact 14 Brand and Model Items ===');

  const updateRules = [
    { prefix: '1-B9701-FT17-65450010003/', range: [1, 5], newBrand: 'Prestan พรีสแตน', newModel: 'PP AM 100M MS' },
    { prefix: '1-B9701-FT17-65300010001/', range: [21, 21], newBrand: 'เตียงเฟาร์เลอร์ 2 ไกร์', newModel: 'แบบ ดิจิตอล' },
    { prefix: '1-B9701-FT17-65450010002/001-68', isExact: true, newBrand: '4DEM', newModel: 'หุ่น SIM MAN Gaumard Scientific' },
    { prefix: '1-B9701-FT17-65450010002/002-68', isExact: true, newBrand: '4DEM', newModel: 'Qube AVPro' },
    { prefix: '1-B9701-FT17-65450010004/', range: [11, 15], newBrand: 'KOKEN', newModel: 'LM-097B' },
    { prefix: '1-B9701-FT17-65450010004/016-68', isExact: true, newName: 'หุ่นจำลองผู้ใหญ่ (SIM MAN)', newBrand: 'Gaumard Scientific', newModel: 'S3201.PK' },
    { prefix: '1-B9701-FT17-65450010004/', range: [34, 38], newBrand: 'CLA Nursing Doll', newModel: 'CLA 1M' },
    { prefix: '1-B9701-FT17-65450010004/', range: [39, 43], newBrand: 'CLA Nursing Doll', newModel: 'CLA 1F' },
    { prefix: '1-B9701-FT17-65450010004/', range: [1, 5], newBrand: 'Limbs & Things', newModel: '60850' },
    { prefix: '1-B9701-FT17-65450010004/', range: [6, 10], newBrand: 'Limbs & Things', newModel: '60851' },
    { prefix: '1-B9701-FT17-65450010004/', range: [17, 23], newBrand: 'Koken', newModel: 'LM-028' },
    { prefix: '1-B9701-FT17-65450010004/', range: [24, 28], newBrand: 'Nasco Healthcare', newModel: 'LF00929U' },
    { prefix: '1-B9701-FT17-65450010004/', range: [29, 33], newBrand: '4DEM', newModel: 'L-IMD' },
    { prefix: '1-B9701-FA17-65450010004/', range: [45, 54], newBrand: 'อัพไรท์ ซิมมูเลชั่น', newModel: '800-816' },
  ];

  function matchRule(govCode) {
    if (!govCode) return null;
    const clean = String(govCode).trim();
    for (const rule of updateRules) {
      if (rule.isExact) {
        if (clean === rule.prefix) return rule;
      } else {
        if (clean.startsWith(rule.prefix)) {
          const remainder = clean.slice(rule.prefix.length);
          const match = remainder.match(/^(\d+)-/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num >= rule.range[0] && num <= rule.range[1]) return rule;
          }
        }
      }
    }
    return null;
  }

  // 1. Update Database Assets
  const assets = await prisma.equipmentAsset.findMany({ include: { item: true } });
  let dbAssetCount = 0;
  const affectedItemIds = new Set();

  for (const a of assets) {
    const rule = matchRule(a.govAssetCode);
    if (rule) {
      await prisma.equipmentAsset.update({
        where: { id: a.id },
        data: {
          brand: rule.newBrand,
          model: rule.newModel,
        },
      });
      affectedItemIds.add(a.itemId);
      dbAssetCount++;
      console.log(`✓ Updated Asset ${a.assetCode} (${a.govAssetCode}): ${rule.newBrand} / ${rule.newModel}`);
    }
  }

  console.log(`Total database assets updated: ${dbAssetCount}`);

  // 2. Update Database Parent Items
  for (const itemId of affectedItemIds) {
    const it = await prisma.item.findUnique({
      where: { id: itemId },
      include: { assets: true },
    });
    if (it && it.assets.length > 0) {
      const sampleAsset = it.assets.find((ast) => matchRule(ast.govAssetCode));
      if (sampleAsset) {
        const rule = matchRule(sampleAsset.govAssetCode);
        if (rule) {
          await prisma.item.update({
            where: { id: it.id },
            data: {
              brand: rule.newBrand,
              model: rule.newModel,
              ...(rule.newName ? { name: rule.newName } : {}),
            },
          });
          console.log(`✓ Updated Item ${it.code} (${rule.newName || it.name}): ${rule.newBrand} / ${rule.newModel}`);
        }
      }
    }
  }

  // 3. Update Excel Templates
  const excelFiles = [
    path.join(process.cwd(), 'ข้อมูลครุภัณฑ์', 'Template_Items_and_Assets_v3.updated.xlsx'),
    path.join(process.cwd(), 'ข้อมูลครุภัณฑ์', 'Template_Items_and_Assets_v3.xlsx'),
  ];

  for (const filePath of excelFiles) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const wb = xlsx.readFile(filePath);
      const sheetName = wb.SheetNames[0];
      const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
      let excelCount = 0;
      const updatedRows = rows.map((r) => {
        const rule = matchRule(r['เลขครุภัณฑ์ราชการ']);
        if (rule) {
          r['ยี่ห้อ (Brand)'] = rule.newBrand;
          r['รุ่น (Model)'] = rule.newModel;
          if (rule.newName) r['ชื่อรายการ'] = rule.newName;
          excelCount++;
        }
        return r;
      });
      wb.Sheets[sheetName] = xlsx.utils.json_to_sheet(updatedRows);
      xlsx.writeFile(wb, filePath);
      console.log(`✓ Excel updated: ${path.basename(filePath)} (${excelCount} rows)`);
    } catch (e) {
      console.log(`Notice: Could not write ${filePath} (${e.message})`);
    }
  }

  console.log('=== Update finished successfully ===');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
