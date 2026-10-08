const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

async function main() {
  console.log('=== Updating Images for Specified Items ===');

  const imageRules = [
    // 1: CPR ผู้ใหญ่ครึ่งตัว
    {
      prefix: '1-B9701-FT17-65450010003/',
      range: [1, 5],
      imageUrl: 'https://drive.google.com/file/d/1qWDRLyiRBRWXFeMUaNj08d7du6_Nq4v0/view?usp=drive_link',
      label: 'ลำดับ 1: CPR ผู้ใหญ่ครึ่งตัว'
    },
    // 4: เครื่องแสดงสัญญาณชีพ
    {
      prefix: '1-B9701-FT17-65450010002/001-68',
      isExact: true,
      imageUrl: 'https://drive.google.com/file/d/1DWZW08_PLRwGlqQl4BoUlhh71GbyPON2/view?usp=sharing',
      label: 'ลำดับ 4: เครื่องแสดงสัญญาณชีพ'
    },
    // 7: หุ่นจำลองผู้ใหญ่ (SIM MAN)
    {
      prefix: '1-B9701-FT17-65450010004/016-68',
      isExact: true,
      imageUrl: 'https://drive.google.com/file/d/1kiOynTyquGIhurpptqoCWFk2f4YJTzt-/view?usp=sharing',
      label: 'ลำดับ 7: หุ่นจำลองผู้ใหญ่ (SIM MAN)'
    },
    // 8: หุ่นฝึกปฏิบัติการพยาบาลพื้นฐาน (ชาย)
    {
      prefix: '1-B9701-FT17-65450010004/',
      range: [34, 38],
      imageUrl: 'https://drive.google.com/file/d/1I3j4FtFdzZNOq74M-lt01NwuHRQca8va/view?usp=drive_link',
      label: 'ลำดับ 8: หุ่นฝึกปฏิบัติการพยาบาลพื้นฐาน (ชาย)'
    },
    // 9: หุ่นฝึกปฏิบัติการพยาบาลพื้นฐาน (หญิง)
    {
      prefix: '1-B9701-FT17-65450010004/',
      range: [39, 43],
      imageUrl: 'https://drive.google.com/file/d/1I3j4FtFdzZNOq74M-lt01NwuHRQca8va/view?usp=drive_link',
      label: 'ลำดับ 9: หุ่นฝึกปฏิบัติการพยาบาลพื้นฐาน (หญิง)'
    },
    // 10: หุ่นจำลองฝึกสวนปัสสาวะ (ชาย)
    {
      prefix: '1-B9701-FT17-65450010004/',
      range: [1, 5],
      imageUrl: 'https://drive.google.com/file/d/1KMDffuqSb8cDJ424qT4DNEhzM1LmaWw8/view?usp=drive_link',
      label: 'ลำดับ 10: หุ่นจำลองฝึกสวนปัสสาวะ (ชาย)'
    },
    // 11: หุ่นจำลองฝึกสวนปัสสาวะ (หญิง)
    {
      prefix: '1-B9701-FT17-65450010004/',
      range: [6, 10],
      imageUrl: 'https://drive.google.com/file/d/1xyCtKRsHoSu51SrvV2dwPtellv1vdJQK/view?usp=drive_link',
      label: 'ลำดับ 11: หุ่นจำลองฝึกสวนปัสสาวะ (หญิง)'
    },
    // 15: โมเดลบาดแผลจำลอง
    {
      prefix: '1-B9701-FA17-65450010004/',
      range: [45, 54],
      imageUrl: 'https://drive.google.com/file/d/1BKFWzzaVlnwr6u5W10lyJMxDFtTqV6oX/view?usp=drive_link',
      label: 'ลำดับ 15: โมเดลบาดแผลจำลอง'
    },
  ];

  function matchRule(govCode) {
    if (!govCode) return null;
    const clean = String(govCode).trim();
    for (const rule of imageRules) {
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
          imageUrl: rule.imageUrl,
        },
      });
      affectedItemIds.add(a.itemId);
      dbAssetCount++;
      console.log(`✓ Updated Asset Image ${a.assetCode} (${a.govAssetCode}): ${rule.label}`);
    }
  }

  console.log(`Total database assets with image updated: ${dbAssetCount}`);

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
              imageUrl: rule.imageUrl,
            },
          });
          console.log(`✓ Updated Item Image ${it.code} (${it.name}): ${rule.imageUrl}`);
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
          r['ลิงก์รูปภาพ (Image URL)'] = rule.imageUrl;
          r['รูปภาพ'] = rule.imageUrl;
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

  console.log('=== Image update finished successfully ===');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
