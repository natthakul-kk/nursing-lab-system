const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_PATH = 'C:\\Users\\Nurse2\\.gemini\\antigravity\\brain\\d6e319fc-9087-45cf-b5f5-fcd102558f90\\system_flow.md';
const DESKTOP_DIR = 'C:\\Users\\Nurse2\\Desktop';
const LAB_DIR = 'd:\\LAB-system';

async function exportSystemFlow() {
  console.log('--- 1. READING ORIGINAL ARTIFACT system_flow.md ---');
  const mdContent = fs.readFileSync(ARTIFACT_PATH, 'utf8');

  // Copy raw .md file to D:\LAB-system and Desktop
  const mdLabPath = path.join(LAB_DIR, 'system_flow.md');
  const mdDesktopPath = path.join(DESKTOP_DIR, 'system_flow.md');
  fs.writeFileSync(mdLabPath, mdContent, 'utf8');
  fs.writeFileSync(mdDesktopPath, mdContent, 'utf8');
  console.log('Saved .md file to:', mdLabPath);
  console.log('Saved .md file to Desktop:', mdDesktopPath);

  // Extract Mermaid code and other markdown text
  const mermaidMatch = mdContent.match(/```mermaid([\s\S]*?)```/);
  const mermaidCode = mermaidMatch ? mermaidMatch[1].trim() : '';

  // Build beautiful standalone HTML document
  const htmlContent = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>แผนภาพความเชื่อมโยงทั้งระบบ (System Architecture & Operational Flow)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    :root {
      --primary: #0F766E;
      --primary-dark: #115E59;
      --secondary: #0E7490;
      --slate-dark: #0F172A;
      --slate-muted: #475569;
      --bg-page: #F8FAFC;
      --bg-card: #FFFFFF;
      --border-color: #E2E8F0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Sarabun', 'Leelawadee UI', Tahoma, sans-serif;
      background-color: var(--bg-page);
      color: var(--slate-dark);
      padding: 30px;
      line-height: 1.7;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 16px;
      border: 1px solid var(--border-color);
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
      padding: 40px;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      padding-bottom: 24px;
      border-bottom: 2px solid #CCFBF1;
      margin-bottom: 28px;
    }
    .header-title h1 {
      font-size: 26px;
      color: var(--primary);
      font-weight: 700;
      margin-bottom: 4px;
    }
    .header-title h2 {
      font-size: 18px;
      color: var(--secondary);
      font-weight: 600;
      margin-bottom: 8px;
    }
    .header-title p {
      font-size: 15px;
      color: var(--slate-muted);
    }
    .btn-group {
      display: flex;
      gap: 10px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
      border: none;
    }
    .btn-primary {
      background: var(--primary);
      color: white;
    }
    .btn-primary:hover {
      background: var(--primary-dark);
      transform: translateY(-2px);
    }
    .btn-secondary {
      background: #E2E8F0;
      color: var(--slate-dark);
    }
    .btn-secondary:hover {
      background: #CBD5E1;
      transform: translateY(-2px);
    }
    .diagram-section {
      background: #F8FAFC;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 36px;
      overflow-x: auto;
      text-align: center;
    }
    .mermaid svg {
      max-width: 100% !important;
      height: auto !important;
      font-family: 'Sarabun', 'Leelawadee UI', Tahoma, sans-serif !important;
    }
    .content-section {
      margin-top: 30px;
    }
    .content-section h3 {
      font-size: 20px;
      color: var(--primary);
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    }
    .ascii-flow {
      background: #0F172A;
      color: #38BDF8;
      padding: 20px;
      border-radius: 10px;
      font-family: Consolas, monospace;
      font-size: 13.5px;
      line-height: 1.5;
      overflow-x: auto;
      margin-bottom: 30px;
    }
    .module-card {
      background: #F8FAFC;
      border-left: 4px solid var(--primary);
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 16px;
    }
    .module-card h4 {
      font-size: 16.5px;
      color: var(--slate-dark);
      margin-bottom: 6px;
    }
    .module-card ul {
      margin-left: 20px;
      font-size: 15px;
      color: #334155;
    }
    .module-card li {
      margin-bottom: 4px;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { border: none; box-shadow: none; padding: 0; }
      .btn-group { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-bar">
      <div class="header-title">
        <h1>แผนภาพความเชื่อมโยงทั้งระบบ (System Architecture & Operational Flow)</h1>
        <h2>ระบบบริหารจัดการห้องปฏิบัติการพยาบาล (Nursing Lab System)</h2>
        <p>แผนภาพแสดงความสัมพันธ์และการไหลเวียนของข้อมูล (Data Flow & Business Logic) ตั้งแต่การรับเข้าพัสดุ จนถึงการเรียนการสอนและการวิเคราะห์ต้นทุน</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="window.print()">🖨️ พิมพ์ / บันทึก PDF</button>
        <a href="./system_flow.md" download="system_flow.md" class="btn btn-secondary">📥 ดาวน์โหลด .md</a>
      </div>
    </div>

    <!-- Interactive Mermaid Diagram -->
    <div class="diagram-section">
      <div class="mermaid">
${mermaidCode}
      </div>
    </div>

    <!-- Details Section -->
    <div class="content-section">
      <h3>รายละเอียดการเชื่อมโยงของ 6 ส่วนหลัก</h3>

      <div class="ascii-flow">
[1. คลังพัสดุ & ครุภัณฑ์]
      │
      ├── (ตัดยอดกล่องใหญ่) ────────► [2. แบ่งบรรจุ Repack & จัดชุด Kit]
      │                                       │
      ├── (ผูกเข้าวิชา/จองห้อง) ──────────────┼──────► [3. รายวิชา & จองซ้อมแล็บ]
      │                                       │                     │
      ▼                                       ▼                     ▼
[4. ยื่นคำขอเบิก/ยืม (Unified Request) & ขั้นตอนการอนุมัติ (Approval Flow)]
      │
      ├─────► [จ่ายของ] ───► ตัดสต็อก Lots & ล็อกสถานะ Assets เป็น BORROWED
      │                         │
      │                         ▼
      │              [5. คืนพัสดุ & ตรวจสอบสภาพ]
      │                         │
      │                         ├── สภาพดี ──► คืนสต็อก พร้อมใช้ (AVAILABLE)
      │                         └── ชำรุด ──► ส่งซ่อมบำรุง (Maintenance Log)
      │
      ▼
[6. คำนวณต้นทุนจริงรายวิชา vs งบประมาณ & ออกรายงานบริหารจัดการ (Reports)]
      </div>

      <div class="module-card">
        <h4>1. ทะเบียนคลัง & ครุภัณฑ์ (Inventory & Asset Core)</h4>
        <ul>
          <li>นำเข้าข้อมูลพัสดุผ่าน Excel / ERP</li>
          <li><b>ครุภัณฑ์ (Equipment)</b>: ควบคุมเป็นรายชิ้น มี QR Code สแกนดูประวัติ สเปก ยี่ห้อ รุ่น บริษัทผู้จำหน่าย และวันหมดประกัน</li>
          <li><b>วัสดุสิ้นเปลือง (Consumables)</b>: ควบคุมเป็นรายล็อต (Lot) มีวันหมดอายุและจำนวนคงเหลือ</li>
        </ul>
      </div>

      <div class="module-card">
        <h4>2. การเตรียมการสอน & จัดชุด (Lab Preparation & Repack)</h4>
        <ul>
          <li>นำเวชภัณฑ์กล่องใหญ่มาแบ่งบรรจุ (Repack) และสเตอร์ไรด์เป็นซองย่อยปลอดเชื้อ</li>
          <li>นำทั้งครุภัณฑ์และวัสดุสิ้นเปลืองมารวมกันเป็น <b>ชุดฝึกปฏิบัติการ (Practice Kits)</b> เพื่อให้ง่ายต่อการเบิกไปสอนเป็นกลุ่ม</li>
        </ul>
      </div>

      <div class="module-card">
        <h4>3. หลักสูตร & การฝึกปฏิบัติ (Academic & Practice)</h4>
        <ul>
          <li>อาจารย์เปิดรายวิชา กำหนดงบประมาณ และอาจารย์ผู้ประสานงาน</li>
          <li>ระบบเปิดให้นิสิตจองห้องแล็บและรอบเวลา (Slots) เพื่อเข้ามาซ้อมหัตถการนอกเวลาเรียน</li>
        </ul>
      </div>

      <div class="module-card">
        <h4>4. ระบบคำขอ & อนุมัติแบบรวมศูนย์ (Unified Request & Approval Chain)</h4>
        <ul>
          <li>อาจารย์และนิสิตยื่นคำขอในหน้าต่างเดียว: ยืมครุภัณฑ์, เบิกวัสดุ, หรือขอใช้ชุดฝึก</li>
          <li>ระบบส่งต่อให้อาจารย์ที่ปรึกษา -> เจ้าหน้าที่แล็บ ตรวจสอบและอนุมัติ</li>
          <li>เมื่อกดจ่ายของ ระบบจะตัดยอดสต็อกและเปลี่ยนสถานะอุปกรณ์อัตโนมัติ</li>
        </ul>
      </div>

      <div class="module-card">
        <h4>5. การคืนพัสดุ & ตรวจสอบสภาพ (Return & Maintenance)</h4>
        <ul>
          <li>เมื่อนำอุปกรณ์มาคืน เจ้าหน้าที่ตรวจสอบสภาพ:</li>
          <li>หากสภาพดี: กลับคืนสถานะพร้อมใช้ (AVAILABLE)</li>
          <li>หากชำรุด: ระบบตัดเข้าสู่กระบวนการส่งซ่อม (UNDER_REPAIR) และบันทึกประวัติค่าซ่อมบำรุง</li>
        </ul>
      </div>

      <div class="module-card">
        <h4>6. การวิเคราะห์ต้นทุน & รายงานผู้บริหาร (Cost Analytics & Reports)</h4>
        <ul>
          <li>ทุกการจ่ายของจะถูกบันทึกต้นทุนย้อนกลับไปยัง <b>รายวิชา (Course)</b> ที่ใช้</li>
          <li>ผู้บริหารและหัวหน้าภาควิชาสามารถตรวจสอบได้ทันทีว่างบประมาณที่จัดสรรถูกใช้ไปเท่าใด เหลือเท่าใด และวิเคราะห์แนวโน้มการใช้งานของแล็บได้แบบเรียลไทม์</li>
        </ul>
      </div>
    </div>
  </div>

  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'neutral',
      flowchart: { curve: 'basis', htmlLabels: true },
      fontFamily: 'Sarabun, Leelawadee UI, Tahoma, sans-serif'
    });
  </script>
</body>
</html>`;

  const htmlLabPath = path.join(LAB_DIR, 'system_flow.html');
  const htmlDesktopPath = path.join(DESKTOP_DIR, 'system_flow.html');
  fs.writeFileSync(htmlLabPath, htmlContent, 'utf8');
  fs.writeFileSync(htmlDesktopPath, htmlContent, 'utf8');
  console.log('Saved HTML to:', htmlLabPath);
  console.log('Saved HTML to Desktop:', htmlDesktopPath);

  console.log('--- 2. RENDERING PDF VIA PUPPETEER ---');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 2 });
  await page.goto('file:///' + htmlLabPath.replace(/\\\\/g, '/'), { waitUntil: 'networkidle0' });

  // Wait for mermaid SVG
  await page.waitForSelector('.mermaid svg', { timeout: 15000 });

  const pdfLabPath = path.join(LAB_DIR, 'system_flow.pdf');
  const pdfDesktopPath = path.join(DESKTOP_DIR, 'system_flow.pdf');

  await page.pdf({
    path: pdfLabPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
  });
  fs.copyFileSync(pdfLabPath, pdfDesktopPath);
  console.log('Saved PDF to:', pdfLabPath);
  console.log('Saved PDF to Desktop:', pdfDesktopPath);

  await browser.close();
  console.log('--- EXPORT OF system_flow.md COMPLETED ---');
}

exportSystemFlow().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
