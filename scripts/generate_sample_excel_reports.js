const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

const OUTPUT_DIR = path.join(__dirname, '..', 'reports_sample');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function formatDateThai(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear() + 543;
  return `${day}/${month}/${year}`;
}

async function generateReports() {
  console.log('Fetching database data for sample reports...');

  // 1. Fetch Equipment Assets
  const assets = await prisma.equipmentAsset.findMany({
    take: 20,
    include: {
      item: {
        include: {
          category: true,
          storageLocation: { include: { room: true } },
        },
      },
      storageLocation: { include: { room: true } },
    },
    orderBy: { assetCode: 'asc' },
  });

  // 2. Fetch Consumable Items with Lots
  const consumables = await prisma.item.findMany({
    where: { type: 'CONSUMABLE' },
    take: 20,
    include: {
      category: true,
      storageLocation: { include: { room: true } },
      stockLots: {
        where: { quantityRemaining: { gt: 0 } },
        orderBy: { expiryDate: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  console.log(`Found ${assets.length} equipment assets and ${consumables.length} consumables.`);

  const CUSTODIAN_UNIT_NAME = 'ศูนย์การเรียนรู้ปฏิบัติการทางการพยาบาลเสมือนจริง';
  const FACULTY_NAME = 'คณะพยาบาลศาสตร์';
  const UNIVERSITY_NAME = 'มหาวิทยาลัยเกษตรศาสตร์';
  const FULL_CUSTODIAN_LABEL = `${CUSTODIAN_UNIT_NAME} ${FACULTY_NAME}`;

  // ----------------------------------------------------
  // BUILD EQUIPMENT WORKSHEET
  // ----------------------------------------------------
  const eqRows = [
    ['ทะเบียนคุมทรัพย์สิน (ครุภัณฑ์ทางการศึกษาและการพยาบาล)'],
    [`ส่วนราชการ: ${FACULTY_NAME} ${UNIVERSITY_NAME}       หน่วยงานผู้ครอบครอง: ${CUSTODIAN_UNIT_NAME}       ประเภท: ครุภัณฑ์การแพทย์และฝึกทักษะ`],
    ['ข้อมูล ณ วันที่: 30 กันยายน 2569       ปีงบประมาณ: 2569       ผู้จัดทำรายงาน: เจ้าหน้าที่ห้องปฏิบัติการทางการพยาบาล'],
    [],
    [
      'ลำดับ',
      'หมายเลขครุภัณฑ์ราชการ',
      'รหัสประจำเครื่อง (แล็บ)',
      'รายการ / ชื่อครุภัณฑ์',
      'ยี่ห้อ / รุ่น',
      'หมายเลขเครื่อง (S/N)',
      'วันที่ได้มา',
      'สถานที่จัดเก็บ / ประจำห้อง',
      'ราคาต่อหน่วย (บาท)',
      'สภาพ',
      'สถานะการใช้งาน',
      'ผู้รับผิดชอบ',
      'หมายเหตุ',
    ],
  ];

  let eqStartDataRow = 6; // 1-based row in Excel
  assets.forEach((a, idx) => {
    const loc = a.storageLocation
      ? `${a.storageLocation.name} (${a.storageLocation.room?.name || a.storageLocation.code})`
      : a.location || a.item?.location || CUSTODIAN_UNIT_NAME;

    const brandModel = [a.brand || a.item?.brand, a.model || a.item?.model].filter(Boolean).join(' / ') || '-';
    
    let statusText = 'พร้อมใช้งาน';
    if (a.status === 'BORROWED') statusText = 'กำลังถูกยืม';
    else if (a.status === 'MAINTENANCE') statusText = 'ส่งซ่อมบำรุง';
    else if (a.status === 'RETIRED') statusText = 'จำหน่ายออก';

    let conditionText = 'ปกติ';
    if (a.condition === 'DAMAGED') conditionText = 'ชำรุด';
    else if (a.condition === 'FAIR') conditionText = 'พอใช้';

    let noteText = '-';
    if (a.status === 'BORROWED') {
      noteText = 'นิสิตยืมฝึกปฏิบัติการ';
    }

    eqRows.push([
      idx + 1,
      a.govAssetCode || `6510-001-${String(idx + 1).padStart(4, '0')}/2568`,
      a.assetCode,
      a.item?.name || 'ครุภัณฑ์',
      brandModel,
      a.serialNumber || '-',
      formatDateThai(a.receivedDate),
      loc,
      Number(a.cost) || 0,
      conditionText,
      statusText,
      FULL_CUSTODIAN_LABEL,
      noteText,
    ]);
  });

  const eqEndDataRow = eqRows.length; // 1-based

  // Summary Row with Excel formula
  const eqSummaryRow = [
    '',
    '',
    '',
    'รวมมูลค่าทั้งสิ้น',
    '',
    '',
    '',
    '',
    { f: `SUM(I${eqStartDataRow}:I${eqEndDataRow})` },
    '',
    '',
    '',
    '',
  ];
  eqRows.push(eqSummaryRow);
  eqRows.push([]); // blank
  eqRows.push([]); // blank

  // Signatures
  eqRows.push([
    '',
    '(ลงชื่อ) ..............................................................',
    '',
    '',
    '',
    '',
    '',
    '(ลงชื่อ) ..............................................................',
    '',
    '',
    '',
    '',
    '',
  ]);
  eqRows.push([
    '',
    '       (                                                      )',
    '',
    '',
    '',
    '',
    '',
    '       (                                                      )',
    '',
    '',
    '',
    '',
    '',
  ]);
  eqRows.push([
    '',
    'ตำแหน่ง: เจ้าหน้าที่ห้องปฏิบัติการทางการพยาบาล',
    '',
    '',
    '',
    '',
    '',
    'ตำแหน่ง: หัวหน้างานพัสดุและอาคารสถานที่ / ประธานกรรมการตรวจนับ',
    '',
    '',
    '',
    '',
    '',
  ]);
  eqRows.push([
    '',
    'วันที่: ...... / ...... / ..........',
    '',
    '',
    '',
    '',
    '',
    'วันที่: ...... / ...... / ..........',
    '',
    '',
    '',
    '',
    '',
  ]);

  const eqWs = XLSX.utils.aoa_to_sheet(eqRows);
  eqWs['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 12 } },
  ];
  eqWs['!cols'] = [
    { wch: 6 },  // A: ลำดับ
    { wch: 32 }, // B: หมายเลขครุภัณฑ์ราชการ
    { wch: 18 }, // C: รหัสประจำเครื่อง (แล็บ)
    { wch: 38 }, // D: รายการ / ชื่อครุภัณฑ์
    { wch: 28 }, // E: ยี่ห้อ / รุ่น
    { wch: 18 }, // F: S/N
    { wch: 14 }, // G: วันที่ได้มา
    { wch: 28 }, // H: สถานที่จัดเก็บ
    { wch: 18 }, // I: ราคาต่อหน่วย (บาท)
    { wch: 10 }, // J: สภาพ
    { wch: 16 }, // K: สถานะการใช้งาน
    { wch: 36 }, // L: ผู้รับผิดชอบ
    { wch: 28 }, // M: หมายเหตุ
  ];

  // ----------------------------------------------------
  // BUILD CONSUMABLES WORKSHEET
  // ----------------------------------------------------
  const conRows = [
    ['บัญชีคุมวัสดุสิ้นเปลืองและเวชภัณฑ์ทางการพยาบาล (Stock Inventory Report)'],
    [`ส่วนราชการ: ${FACULTY_NAME} ${UNIVERSITY_NAME}       หน่วยงานผู้ครอบครอง: ${CUSTODIAN_UNIT_NAME}       ประเภท: วัสดุการแพทย์และเวชภัณฑ์สิ้นเปลือง`],
    ['ข้อมูล ณ วันที่: 30 กันยายน 2569       ปีงบประมาณ: 2569       ผู้จัดทำรายงาน: เจ้าหน้าที่ห้องปฏิบัติการทางการพยาบาล'],
    [],
    [
      'ลำดับ',
      'รหัสพัสดุ',
      'รายการ / ชื่อวัสดุสิ้นเปลือง',
      'หมวดหมู่',
      'หน่วยนับ',
      'สถานที่จัดเก็บ / ตู้',
      'หมายเลขล็อต (Lot No.)',
      'วันหมดอายุ',
      'ยอดคงเหลือ',
      'ราคาต่อหน่วย (บาท)',
      'มูลค่ารวม (บาท)',
      'สถานะคงคลัง',
      'หมายเหตุ',
    ],
  ];

  let conStartDataRow = 6;
  let conIndex = 1;

  consumables.forEach((item) => {
    const loc = item.storageLocation
      ? `${item.storageLocation.name} (${item.storageLocation.room?.name || item.storageLocation.code})`
      : item.location || CUSTODIAN_UNIT_NAME;

    if (item.stockLots && item.stockLots.length > 0) {
      item.stockLots.forEach((lot) => {
        const qty = Number(lot.quantityRemaining) || 0;
        const cost = Number(lot.unitCost) || 0;
        const total = qty * cost;
        const currentDataRowIndex = conRows.length + 1; // 1-based

        let statusStock = qty <= item.minStockAlert ? 'ต่ำกว่าเกณฑ์' : 'ปกติ';

        conRows.push([
          conIndex++,
          item.code,
          item.name,
          item.category?.name || 'เวชภัณฑ์',
          item.unit || 'ชิ้น',
          loc,
          lot.lotNumber || '-',
          formatDateThai(lot.expiryDate),
          qty,
          cost,
          { f: `I${currentDataRowIndex}*J${currentDataRowIndex}` },
          statusStock,
          lot.supplier ? `ผู้จำหน่าย: ${lot.supplier}` : '-',
        ]);
      });
    } else {
      const currentDataRowIndex = conRows.length + 1;
      conRows.push([
        conIndex++,
        item.code,
        item.name,
        item.category?.name || 'เวชภัณฑ์',
        item.unit || 'ชิ้น',
        loc,
        '-',
        '-',
        0,
        0,
        { f: `I${currentDataRowIndex}*J${currentDataRowIndex}` },
        'สินค้าหมด',
        'ไม่มีล็อตคงเหลือ',
      ]);
    }
  });

  const conEndDataRow = conRows.length;

  // Summary Row with Excel formula
  conRows.push([
    '',
    '',
    'รวมมูลค่าทั้งสิ้น',
    '',
    '',
    '',
    '',
    '',
    { f: `SUM(I${conStartDataRow}:I${conEndDataRow})` },
    '',
    { f: `SUM(K${conStartDataRow}:K${conEndDataRow})` },
    '',
    '',
  ]);
  conRows.push([]);
  conRows.push([]);

  // Signatures
  conRows.push([
    '',
    '(ลงชื่อ) ..............................................................',
    '',
    '',
    '',
    '',
    '',
    '(ลงชื่อ) ..............................................................',
    '',
    '',
    '',
    '',
    '',
  ]);
  conRows.push([
    '',
    '       (                                                      )',
    '',
    '',
    '',
    '',
    '',
    '       (                                                      )',
    '',
    '',
    '',
    '',
    '',
  ]);
  conRows.push([
    '',
    'ตำแหน่ง: เจ้าหน้าที่ห้องปฏิบัติการทางการพยาบาล',
    '',
    '',
    '',
    '',
    '',
    'ตำแหน่ง: หัวหน้างานพัสดุและอาคารสถานที่ / ประธานกรรมการตรวจนับ',
    '',
    '',
    '',
    '',
    '',
  ]);
  conRows.push([
    '',
    'วันที่: ...... / ...... / ..........',
    '',
    '',
    '',
    '',
    '',
    'วันที่: ...... / ...... / ..........',
    '',
    '',
    '',
    '',
    '',
  ]);

  const conWs = XLSX.utils.aoa_to_sheet(conRows);
  conWs['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 12 } },
  ];
  conWs['!cols'] = [
    { wch: 6 },  // A: ลำดับ
    { wch: 18 }, // B: รหัสพัสดุ
    { wch: 38 }, // C: รายการ
    { wch: 22 }, // D: หมวดหมู่
    { wch: 12 }, // E: หน่วยนับ
    { wch: 28 }, // F: สถานที่จัดเก็บ
    { wch: 18 }, // G: ล็อต
    { wch: 14 }, // H: วันหมดอายุ
    { wch: 14 }, // I: จำนวนคงเหลือ
    { wch: 18 }, // J: ราคาต่อหน่วย (บาท)
    { wch: 18 }, // K: มูลค่ารวม (บาท)
    { wch: 16 }, // L: สถานะ
    { wch: 28 }, // M: หมายเหตุ
  ];

  // ----------------------------------------------------
  // WRITE 3 EXCEL FILES
  // ----------------------------------------------------

  // File 1: ทะเบียนครุภัณฑ์อย่างเดียว
  const wbEq = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbEq, eqWs, 'ทะเบียนครุภัณฑ์');
  const fileEqPath = path.join(OUTPUT_DIR, 'แบบฟอร์มทะเบียนครุภัณฑ์_ตัวอย่าง.xlsx');
  XLSX.writeFile(wbEq, fileEqPath);
  console.log(`Created: ${fileEqPath}`);

  // File 2: บัญชีคุมวัสดุสิ้นเปลืองอย่างเดียว
  const wbCon = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbCon, conWs, 'บัญชีคุมวัสดุสิ้นเปลือง');
  const fileConPath = path.join(OUTPUT_DIR, 'แบบฟอร์มบัญชีคุมวัสดุสิ้นเปลือง_ตัวอย่าง.xlsx');
  XLSX.writeFile(wbCon, fileConPath);
  console.log(`Created: ${fileConPath}`);

  // File 3: รวม 2 แผ่นงานในเล่มเดียวกัน
  const wbCombined = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbCombined, eqWs, 'ทะเบียนครุภัณฑ์');
  XLSX.utils.book_append_sheet(wbCombined, conWs, 'บัญชีคุมวัสดุสิ้นเปลือง');
  const fileCombinedPath = path.join(OUTPUT_DIR, 'รายงานทะเบียนพัสดุและครุภัณฑ์รวม_ตัวอย่าง.xlsx');
  XLSX.writeFile(wbCombined, fileCombinedPath);
  console.log(`Created: ${fileCombinedPath}`);

  console.log('All sample reports generated successfully.');
}

generateReports()
  .catch((err) => {
    console.error('Error generating reports:', err);
  })
  .finally(() => prisma.$disconnect());
