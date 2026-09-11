const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const DESKTOP_DIR = 'C:\\Users\\Nurse2\\Desktop';
const LAB_DIR = 'd:\\LAB-system';

const mermaidCode = `
flowchart TB
    %% STYLING DEFINITIONS
    classDef master fill:#f8fafc,stroke:#64748b,stroke-width:2px,color:#0f172a;
    classDef inv fill:#ecfdf5,stroke:#10b981,stroke-width:2px,color:#065f46;
    classDef teach fill:#eff6ff,stroke:#3b82f6,stroke-width:2px,color:#1e40af;
    classDef flow fill:#fff7ed,stroke:#f97316,stroke-width:2px,color:#9a3412;
    classDef report fill:#faf5ff,stroke:#a855f7,stroke-width:2px,color:#6b21a8;
    classDef action fill:#047857,stroke:#065f46,stroke-width:2px,color:#ffffff;

    %% 1. INVENTORY & ASSET CORE
    subgraph S1 ["1. ทะเบียนคลัง & ครุภัณฑ์ (Inventory & Assets)"]
        direction TB
        ERP["ไฟล์ฐานข้อมูล ERP / Excel"] --> StockIn["รับเข้าพัสดุ (Stock-In)"]
        StockIn --> Items["ทะเบียนพัสดุหลัก (Item)\\n(รหัส, ชื่อ, หน่วยนับ, ยี่ห้อ, รุ่น)"]
        Items -->|ประเภท EQUIPMENT| Assets["ครุภัณฑ์รายชิ้น (EquipmentAsset)\\n(รหัสชิ้น, เลขครุภัณฑ์, สถานะ, ผู้จำหน่าย, ประกัน)"]
        Items -->|ประเภท CONSUMABLE| Lots["ล็อตเวชภัณฑ์ (StockLot)\\n(Lot No, วันหมดอายุ, จำนวนคงเหลือ)"]
        
        Assets --> QR["QR Code ประจำเครื่อง\\n(ป้ายสแกนดูข้อมูล & คู่มือ)"]
        Assets --> Maint["ระบบแจ้งซ่อม / ประวัติบำรุงรักษา\\n(Maintenance Logs)"]
    end
    class S1 inv;
    class ERP,StockIn,Items,Assets,Lots,QR,Maint inv;

    %% 2. LAB PREPARATION & PACKAGING
    subgraph S2 ["2. การเตรียมการสอน & จัดชุด (Preparation & Repack)"]
        direction TB
        Lots -->|เบิกตัดยอดกล่องใหญ่| Repack["ระบบแบ่งบรรจุ & สเตอร์ไรด์ (Repack)\\n(ห่อซองย่อยปลอดเชื้อ เช่น สำลี/ผ้าก๊อซ)"]
        Repack --> Packs["เวชภัณฑ์พร้อมใช้ (Packs/Sets)\\n(มีบาร์โค้ด & วันหมดอายุซอง)"]
        
        Assets -.->|ประกอบเป็นเซ็ต| Kits["ชุดฝึกปฏิบัติการ (Practice Kits)\\n(เช่น ชุดสวนปัสสาวะ, ชุดทำแผล, กระเป๋าเยี่ยมบ้าน)"]
        Lots -.->|ประกอบเป็นเซ็ต| Kits
        Packs -.->|ประกอบเป็นเซ็ต| Kits
    end
    class S2 flow;
    class Repack,Packs,Kits flow;

    %% 3. ACADEMIC & PRACTICE SLOTS
    subgraph S3 ["3. หลักสูตร & การฝึกปฏิบัติ (Academic & Practice)"]
        direction TB
        Faculty["คณาจารย์ / หัวหน้าภาค"] --> Course["จัดการรายวิชา & ต้นทุน\\n(รหัสวิชา, อาจารย์ผู้ประสานงาน, งบประมาณ)"]
        Course -.-> Kits
        
        Rooms["ห้องปฏิบัติการพยาบาล (Rooms)"] --> Practice["ระบบจองฝึกหัตถการอิสระ"]
        Slots["ตารางช่วงเวลา (Slots)"] --> Practice
        Students["นิสิตพยาบาล (Students)"] -->|จองห้องซ้อมแล็บ| Practice
        Practice -->|ผูกกับ| Course
    end
    class S3 teach;
    class Faculty,Course,Rooms,Slots,Students,Practice teach;

    %% 4. REQUEST & APPROVAL WORKFLOW
    subgraph S4 ["4. ระบบคำขอ & อนุมัติ (Unified Request Flow)"]
        direction TB
        Request["ยื่นคำขอใช้งานพัสดุ (Unified Request)\\n- ยืมครุภัณฑ์ (Borrow)\\n- เบิกวัสดุสิ้นเปลือง (Requisition)\\n- เบิกชุดฝึกประจำวิชา (Kit Request)"]
        
        Students -->|ยื่นคำขอ| Request
        Faculty -->|ยื่นคำขอ| Request
        
        Request --> Approver["ขั้นตอนการอนุมัติ (Approval Chain)\\n(อาจารย์ผู้สอน -> เจ้าหน้าที่แล็บ -> หัวหน้าแล็บ)"]
        Approver -->|อนุมัติและจ่ายของ| Dispense["จ่ายพัสดุ / สแกนจ่าย (Dispense)"]
        
        Dispense -->|ยืมครุภัณฑ์| Assets
        Dispense -->|ตัดยอดคงเหลือ| Lots
        Dispense -->|ตัดยอดชุดฝึก| Kits
    end
    class S4 flow;
    class Request,Approver,Dispense flow;

    %% 5. RETURN & RECOVERY
    subgraph S5 ["5. การคืนพัสดุ & สถานะเครื่อง (Return & Status)"]
        direction TB
        Return["คืนครุภัณฑ์ (Return)"]
        Dispense -.->|เมื่อใช้งานเสร็จ| Return
        Return --> Check["ตรวจสอบสภาพ (Inspection)\\n- สภาพดี -> คืนเข้าสต็อก (AVAILABLE)\\n- ชำรุด -> ส่งซ่อม (UNDER_REPAIR)"]
        Check --> Assets
        Check --> Maint
    end
    class S5 master;
    class Return,Check master;

    %% 6. ANALYTICS & EXECUTIVE INTELLIGENCE
    subgraph S6 ["6. การวิเคราะห์ต้นทุน & รายงาน (Executive Intelligence)"]
        direction TB
        Dispense --> Tx["บันทึกธุรกรรม (Stock Transactions)"]
        Course --> CostCalc["คำนวณต้นทุนวัสดุรายวิชา (Cost Analytics)"]
        Tx --> CostCalc
        
        CostCalc --> Balance["งบประมาณที่จัดสรร vs ยอดใช้จริง"]
        CostCalc --> Reports["รายงานและสถิติภาพรวม (Reports)\\n- อัตราการใช้ห้องแล็บ\\n- ครุภัณฑ์ที่ถูกใช้งานบ่อย/เสื่อมสภาพ\\n- สรุปต้นทุนแยกตามภาควิชา"]
    end
    class S6 report;
    class Tx,CostCalc,Balance,Reports report;
`;

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #FFFFFF;
      font-family: 'Sarabun', 'Leelawadee UI', Tahoma, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px;
    }
    #diagram-card {
      background: #FFFFFF;
      border: 2px solid #0F766E;
      border-radius: 16px;
      padding: 36px 40px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      max-width: 1500px;
      width: 100%;
    }
    .header-block {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 2px solid #E2E8F0;
    }
    .header-sub {
      color: #0F766E;
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .header-title {
      color: #0F172A;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .header-desc {
      color: #64748B;
      font-size: 14px;
    }
    .mermaid {
      display: flex;
      justify-content: center;
    }
    .mermaid svg {
      font-family: 'Sarabun', 'Leelawadee UI', Tahoma, sans-serif !important;
      max-width: 100% !important;
      height: auto !important;
    }
    .footer-block {
      text-align: center;
      margin-top: 20px;
      padding-top: 14px;
      border-top: 1px solid #E2E8F0;
      color: #94A3B8;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div id="diagram-card">
    <div class="header-block">
      <div class="header-sub">คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์</div>
      <div class="header-title">แผนภาพความเชื่อมโยงทั้งระบบ (System Architecture & Operational Flow)</div>
      <div class="header-desc">ระบบบริหารจัดการห้องปฏิบัติการพยาบาล (Nursing Lab System) • แผนภาพแสดงความสัมพันธ์และการไหลเวียนของข้อมูล 6 มิติหลัก</div>
    </div>
    <div class="mermaid">
${mermaidCode}
    </div>
    <div class="footer-block">
      NURSING SKILLS & SIMULATION LAB SYSTEM (NSS-LAB) • KASETSART UNIVERSITY
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

async function render() {
  const tempHtml = path.join(LAB_DIR, 'temp_diagram_render.html');
  fs.writeFileSync(tempHtml, html, 'utf8');

  console.log('Launching Edge to render exact diagram image...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1600, deviceScaleFactor: 2.5 });
  await page.goto('file:///' + tempHtml.replace(/\\\\/g, '/'), { waitUntil: 'networkidle0' });

  // Wait for mermaid SVG
  await page.waitForSelector('.mermaid svg', { timeout: 15000 });
  console.log('Mermaid rendered successfully!');

  // Capture diagram-card
  const cardHandle = await page.$('#diagram-card');
  if (cardHandle) {
    // 1. Save PNG to Desktop
    const pngDesktop = path.join(DESKTOP_DIR, 'แผนภาพความเชื่อมโยงทั้งระบบ.png');
    const pngLab = path.join(LAB_DIR, 'แผนภาพความเชื่อมโยงทั้งระบบ.png');
    const pngEng = path.join(DESKTOP_DIR, 'system_architecture_flow.png');
    
    await cardHandle.screenshot({ path: pngDesktop, type: 'png' });
    fs.copyFileSync(pngDesktop, pngLab);
    fs.copyFileSync(pngDesktop, pngEng);
    console.log('Saved PNG to:', pngDesktop);

    // 2. Save JPG to Desktop
    const jpgDesktop = path.join(DESKTOP_DIR, 'แผนภาพความเชื่อมโยงทั้งระบบ.jpg');
    await cardHandle.screenshot({ path: jpgDesktop, type: 'jpeg', quality: 95 });
    console.log('Saved JPG to:', jpgDesktop);
  }

  // 3. Save PDF
  const pdfDesktop = path.join(DESKTOP_DIR, 'แผนภาพความเชื่อมโยงทั้งระบบ.pdf');
  const pdfLab = path.join(LAB_DIR, 'แผนภาพความเชื่อมโยงทั้งระบบ.pdf');
  await page.pdf({
    path: pdfDesktop,
    format: 'A3',
    landscape: true,
    printBackground: true,
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
  });
  fs.copyFileSync(pdfDesktop, pdfLab);
  console.log('Saved PDF to:', pdfDesktop);

  await browser.close();

  // Clean up temp
  if (fs.existsSync(tempHtml)) {
    fs.unlinkSync(tempHtml);
  }
  console.log('--- ALL DIAGRAM FILES GENERATED ON DESKTOP AND D:\\LAB-system ---');
}

render().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});
