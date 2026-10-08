const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function exportMissingImagesReport() {
  console.log('Fetching equipment data from database...');

  // 1. Fetch all equipment items and their assets
  const items = await prisma.item.findMany({
    where: { type: 'EQUIPMENT' },
    include: {
      category: true,
      assets: {
        include: {
          storageLocation: true
        },
        orderBy: { assetCode: 'asc' }
      }
    },
    orderBy: [
      { category: { name: 'asc' } },
      { code: 'asc' }
    ]
  });

  console.log(`Found ${items.length} total equipment items.`);

  // -------------------------------------------------------------
  // Sheet 1: รายการครุภัณฑ์ที่ยังไม่มีรูปภาพ (ภาพรวมระดับ Item / ชนิดครุภัณฑ์)
  // -------------------------------------------------------------
  const sheet1Data = [];
  let noImgItemIdx = 1;

  for (const it of items) {
    const totalAssets = it.assets.length;
    const assetsWithImg = it.assets.filter(a => a.imageUrl && a.imageUrl.trim() !== '').length;
    const assetsWithoutImg = totalAssets - assetsWithImg;
    const itemHasImg = Boolean(it.imageUrl && it.imageUrl.trim() !== '');

    // Focus on items where either the item itself has no image or there are missing assets
    if (!itemHasImg || assetsWithoutImg > 0) {
      const govCodes = it.assets.map(a => a.govAssetCode).filter(Boolean);
      let govCodeSummary = '-';
      if (govCodes.length === 1) {
        govCodeSummary = govCodes[0];
      } else if (govCodes.length > 1) {
        govCodeSummary = `${govCodes[0]} ถึง ${govCodes[govCodes.length - 1]} (มี ${govCodes.length} เลข)`;
      }

      const locations = Array.from(new Set(it.assets.map(a => a.storageLocation?.name || a.location).filter(Boolean))).join(', ') || '-';
      const brands = Array.from(new Set(it.assets.map(a => a.brand).concat([it.brand]).filter(Boolean))).join(', ') || '-';
      const models = Array.from(new Set(it.assets.map(a => a.model).concat([it.model]).filter(Boolean))).join(', ') || '-';

      let statusDesc = 'ยังไม่มีรูปภาพเลย (0%)';
      if (assetsWithImg > 0) {
        statusDesc = `มีรูปบางส่วน (${assetsWithImg}/${totalAssets} ชิ้น)`;
      }

      sheet1Data.push({
        'ลำดับ': noImgItemIdx++,
        'หมวดหมู่ครุภัณฑ์': it.category?.name || 'ไม่ระบุหมวดหมู่',
        'รหัสระบบ (Item Code)': it.code,
        'ชื่อรายการครุภัณฑ์': it.name,
        'ยี่ห้อ (Brand)': brands,
        'รุ่น / โมเดล (Model)': models,
        'จำนวนทั้งหมด (ชิ้น)': totalAssets,
        'จำนวนที่ยังไม่มีรูป (ชิ้น)': assetsWithoutImg,
        'สถานะรูปภาพ': statusDesc,
        'ตัวอย่างเลขครุภัณฑ์ (Gov Asset Code)': govCodeSummary,
        'สถานที่จัดเก็บ': locations,
        'ลิงก์รูปภาพปัจจุบัน': it.imageUrl || '',
        'ช่องสำหรับใส่ลิงก์รูปภาพใหม่ (Google Drive)': ''
      });
    }
  }

  // -------------------------------------------------------------
  // Sheet 2: รายละเอียดรายชิ้นครุภัณฑ์ที่ยังไม่มีรูปภาพ (EquipmentAsset Detail)
  // -------------------------------------------------------------
  const sheet2Data = [];
  let noImgAssetIdx = 1;

  for (const it of items) {
    for (const a of it.assets) {
      if (!a.imageUrl || a.imageUrl.trim() === '') {
        sheet2Data.push({
          'ลำดับ': noImgAssetIdx++,
          'หมวดหมู่': it.category?.name || '-',
          'รหัสครุภัณฑ์ (Lab Asset Code)': a.assetCode,
          'เลขทะเบียนครุภัณฑ์ (Gov Code)': a.govAssetCode || '-',
          'ชื่อรายการ': it.name,
          'ลำดับชิ้นที่': a.sequenceNumber || 1,
          'ยี่ห้อ': a.brand || it.brand || '-',
          'รุ่น / โมเดล': a.model || it.model || '-',
          'ซีเรียลนัมเบอร์ (S/N)': a.serialNumber || '-',
          'สถานที่จัดเก็บ': a.storageLocation?.name || a.location || it.location || '-',
          'สถานะการใช้งาน': a.status === 'AVAILABLE' ? 'พร้อมใช้งาน' : a.status === 'BORROWED' ? 'ถูกยืม' : a.status === 'MAINTENANCE' ? 'ซ่อมบำรุง' : a.status,
          'สภาพครุภัณฑ์': a.condition === 'GOOD' ? 'สมบูรณ์ดี' : a.condition === 'FAIR' ? 'พอใช้' : a.condition === 'DAMAGED' ? 'ชำรุด' : a.condition,
          'ราคาจัดซื้อ (บาท)': a.cost || 0,
          'รหัสอ้างอิง Item (Item Code)': it.code,
          'ช่องสำหรับใส่ลิงก์รูปภาพ (Google Drive URL)': ''
        });
      }
    }
  }

  // -------------------------------------------------------------
  // Sheet 3: สรุปภาพรวมครุภัณฑ์ทั้งหมดในระบบ (Summary Dashboard)
  // -------------------------------------------------------------
  const catSummaryMap = new Map();
  for (const it of items) {
    const cName = it.category?.name || 'ไม่ระบุ';
    if (!catSummaryMap.has(cName)) {
      catSummaryMap.set(cName, {
        categoryName: cName,
        totalItems: 0,
        totalAssets: 0,
        assetsWithImg: 0,
        assetsNoImg: 0
      });
    }
    const stat = catSummaryMap.get(cName);
    stat.totalItems += 1;
    for (const a of it.assets) {
      stat.totalAssets += 1;
      if (a.imageUrl && a.imageUrl.trim() !== '') {
        stat.assetsWithImg += 1;
      } else {
        stat.assetsNoImg += 1;
      }
    }
  }

  const sheet3Data = [];
  let catIdx = 1;
  let sumItems = 0;
  let sumAssets = 0;
  let sumWithImg = 0;
  let sumNoImg = 0;

  for (const [_, stat] of catSummaryMap) {
    const pct = stat.totalAssets > 0 ? ((stat.assetsWithImg / stat.totalAssets) * 100).toFixed(1) + '%' : '0%';
    sheet3Data.push({
      'ลำดับ': catIdx++,
      'หมวดหมู่ครุภัณฑ์': stat.categoryName,
      'จำนวนชนิด (Items)': stat.totalItems,
      'จำนวนชิ้นรวม (Assets)': stat.totalAssets,
      'มีรูปแล้ว (ชิ้น)': stat.assetsWithImg,
      'ยังไม่มีรูป (ชิ้น)': stat.assetsNoImg,
      'ความสมบูรณ์ของรูปภาพ (%)': pct
    });
    sumItems += stat.totalItems;
    sumAssets += stat.totalAssets;
    sumWithImg += stat.assetsWithImg;
    sumNoImg += stat.assetsNoImg;
  }

  // Add Grand Total row
  sheet3Data.push({
    'ลำดับ': 'รวมทั้งสิ้น',
    'หมวดหมู่ครุภัณฑ์': '-',
    'จำนวนชนิด (Items)': sumItems,
    'จำนวนชิ้นรวม (Assets)': sumAssets,
    'มีรูปแล้ว (ชิ้น)': sumWithImg,
    'ยังไม่มีรูป (ชิ้น)': sumNoImg,
    'ความสมบูรณ์ของรูปภาพ (%)': ((sumWithImg / sumAssets) * 100).toFixed(1) + '%'
  });

  // Create Workbook
  const wb = XLSX.utils.book_new();

  // Create Worksheets
  const wsSummary = XLSX.utils.json_to_sheet(sheet3Data);
  const wsItems = XLSX.utils.json_to_sheet(sheet1Data);
  const wsAssets = XLSX.utils.json_to_sheet(sheet2Data);

  // Set column widths for Sheet 1
  wsItems['!cols'] = [
    { wch: 8 },  // ลำดับ
    { wch: 32 }, // หมวดหมู่ครุภัณฑ์
    { wch: 18 }, // รหัสระบบ
    { wch: 45 }, // ชื่อรายการครุภัณฑ์
    { wch: 25 }, // ยี่ห้อ
    { wch: 30 }, // รุ่น / โมเดล
    { wch: 16 }, // จำนวนทั้งหมด
    { wch: 20 }, // จำนวนที่ยังไม่มีรูป
    { wch: 24 }, // สถานะรูปภาพ
    { wch: 45 }, // ตัวอย่างเลขครุภัณฑ์
    { wch: 25 }, // สถานที่จัดเก็บ
    { wch: 30 }, // ลิงก์รูปภาพปัจจุบัน
    { wch: 45 }  // ช่องสำหรับใส่ลิงก์รูปภาพใหม่
  ];

  // Set column widths for Sheet 2
  wsAssets['!cols'] = [
    { wch: 8 },  // ลำดับ
    { wch: 28 }, // หมวดหมู่
    { wch: 18 }, // รหัสครุภัณฑ์ Lab
    { wch: 36 }, // เลขทะเบียนครุภัณฑ์ Gov
    { wch: 40 }, // ชื่อรายการ
    { wch: 12 }, // ลำดับชิ้นที่
    { wch: 22 }, // ยี่ห้อ
    { wch: 26 }, // รุ่น / โมเดล
    { wch: 20 }, // S/N
    { wch: 24 }, // สถานที่จัดเก็บ
    { wch: 16 }, // สถานะการใช้งาน
    { wch: 14 }, // สภาพ
    { wch: 16 }, // ราคาจัดซื้อ
    { wch: 16 }, // รหัสอ้างอิง Item
    { wch: 45 }  // ช่องสำหรับใส่ลิงก์
  ];

  // Set column widths for Sheet 3
  wsSummary['!cols'] = [
    { wch: 10 }, // ลำดับ
    { wch: 35 }, // หมวดหมู่ครุภัณฑ์
    { wch: 20 }, // จำนวนชนิด
    { wch: 22 }, // จำนวนชิ้นรวม
    { wch: 18 }, // มีรูปแล้ว
    { wch: 18 }, // ยังไม่มีรูป
    { wch: 25 }  // ความสมบูรณ์
  ];

  // Append sheets
  XLSX.utils.book_append_sheet(wb, wsSummary, '1.สรุปภาพรวมแยกตามหมวดหมู่');
  XLSX.utils.book_append_sheet(wb, wsItems, '2.รายการครุภัณฑ์ที่ยังไม่มีรูป');
  XLSX.utils.book_append_sheet(wb, wsAssets, '3.รายชิ้นครุภัณฑ์ที่ขาดรูป');

  // Define target output path
  const exportDir = path.join(__dirname, '..', 'ข้อมูลครุภัณฑ์');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const exportFilePath = path.join(exportDir, 'รายงานรายการครุภัณฑ์คงทนที่ยังไม่มีรูปภาพ.xlsx');
  try {
    XLSX.writeFile(wb, exportFilePath);
    console.log(`\nExport successfully generated!`);
    console.log(`File location: ${exportFilePath}`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      const fallbackPath = path.join(exportDir, 'รายงานรายการครุภัณฑ์คงทนที่ยังไม่มีรูปภาพ.updated.xlsx');
      XLSX.writeFile(wb, fallbackPath);
      console.log(`\nOriginal file is open in Excel. Saved updated report to: ${fallbackPath}`);
    } else {
      throw err;
    }
  }
  console.log(`Summary:`);
  console.log(`- หมวดหมู่ทั้งหมด: ${catSummaryMap.size} หมวด`);
  console.log(`- รายการครุภัณฑ์ (ชนิด) ที่ยังไม่มีรูป: ${sheet1Data.length} รายการ`);
  console.log(`- รายชิ้นครุภัณฑ์ (Assets) ที่ยังไม่มีรูป: ${sheet2Data.length} ชิ้น (จากทั้งหมด ${sumAssets} ชิ้น)`);
}

exportMissingImagesReport()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
