const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

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
  const rows = XLSX.utils.sheet_to_json(ws);

  let updatedCount = 0;
  for (const r of rows) {
    const gov = r['เลขครุภัณฑ์ราชการ'] ? String(r['เลขครุภัณฑ์ราชการ']).trim() : '';
    const code = r['รหัสพัสดุ'] ? String(r['รหัสพัสดุ']).trim() : '';

    // 1. Manikin 001-68 -> EQ-AI-0001
    if (gov === '1-B9701-FA17-65450010004/001-68') {
      r['รหัสพัสดุ'] = 'EQ-AI-0001';
      r['ชื่อรายการ'] = '(AI) หุ่นฝึกทักษะการพยาบาลขั้นสูง';
      r['หมวดหมู่'] = '(หุ่น AI) อุปกรณ์จำลองสถานการณ์และหุ่นฝึกปฏิบัติการ';
      r['ลิงก์รูปภาพ (Image URL)'] = 'https://drive.google.com/file/d/160g4PcsX-3XGAXL-EOawSV-chhNloiWr/view?usp=drive_link';
      r['รูปภาพ'] = r['ลิงก์รูปภาพ (Image URL)'];
      updatedCount++;
    }
    // 2. Manikin 002-68 -> EQ-AI-0002
    else if (gov === '1-B9701-FA17-65450010004/002-68') {
      r['รหัสพัสดุ'] = 'EQ-AI-0002';
      r['ชื่อรายการ'] = '(AI) หุ่นฝึกทักษะการพยาบาลขั้นสูง';
      r['หมวดหมู่'] = '(หุ่น AI) อุปกรณ์จำลองสถานการณ์และหุ่นฝึกปฏิบัติการ';
      r['ลิงก์รูปภาพ (Image URL)'] = 'https://drive.google.com/file/d/160g4PcsX-3XGAXL-EOawSV-chhNloiWr/view?usp=drive_link';
      r['รูปภาพ'] = r['ลิงก์รูปภาพ (Image URL)'];
      updatedCount++;
    }
    // 3. LED Screen 003-68 -> EQ-AI-0003
    else if (gov === '1-B9701-FA09-66600010001/003-68' || (code === 'EQ-AI-0001' && r['ชื่อรายการ'] === 'จอ LED 40 นิ้ว')) {
      r['รหัสพัสดุ'] = 'EQ-AI-0003';
      updatedCount++;
    }
    // 4. LED Screen 004-68 -> EQ-AI-0004
    else if (gov === '1-B9701-FA09-66600010001/004-68' || (code === 'EQ-AI-0002' && r['ชื่อรายการ'] === 'จอ LED 40 นิ้ว')) {
      r['รหัสพัสดุ'] = 'EQ-AI-0004';
      updatedCount++;
    }
    // 5. Tablet 001-68 -> EQ-AI-0005
    else if (gov === '1-B9701-FN18-74400010005/001-68' || (code === 'EQ-AI-0003' && r['ชื่อรายการ'] === 'แทบเล็ตสำหรับหุ่น AI')) {
      r['รหัสพัสดุ'] = 'EQ-AI-0005';
      updatedCount++;
    }
    // 6. Tablet 002-68 -> EQ-AI-0006
    else if (gov === '1-B9701-FN18-74400010005/002-68' || (code === 'EQ-AI-0004' && r['ชื่อรายการ'] === 'แทบเล็ตสำหรับหุ่น AI')) {
      r['รหัสพัสดุ'] = 'EQ-AI-0006';
      updatedCount++;
    }
  }

  const newWs = XLSX.utils.json_to_sheet(rows);
  wb.Sheets['แบบฟอร์มนำเข้าพัสดุ'] = newWs;
  XLSX.writeFile(wb, mPath);
  console.log(`✓ Master Excel updated with AI rename: ${mName} (${updatedCount} rows affected)`);
}
