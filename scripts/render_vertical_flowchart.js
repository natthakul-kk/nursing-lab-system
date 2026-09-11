const fs = require('fs');
const path = require('path');
const puppeteer = require('d:/LAB-system/node_modules/puppeteer-core');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TARGET_DIR = path.join('d:', 'LAB-system', 'system_flow');
const MANUAL_IMG_DIR = path.join('d:', 'LAB-system', 'manual', 'images');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}
if (!fs.existsSync(MANUAL_IMG_DIR)) {
  fs.mkdirSync(MANUAL_IMG_DIR, { recursive: true });
}

const flowchartMermaid = `flowchart TD
    %% Styling Definitions
    classDef startEnd fill:#0f172a,stroke:#334155,stroke-width:2.5px,color:#ffffff,font-weight:bold,rx:20,ry:20;
    classDef process fill:#ffffff,stroke:#0284c7,stroke-width:2px,color:#0f172a,rx:8,ry:8;
    classDef decision fill:#fef3c7,stroke:#d97706,stroke-width:2.5px,color:#92400e,font-weight:bold;
    classDef prep fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#14532d,rx:8,ry:8;
    classDef warn fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#991b1b,rx:8,ry:8;
    classDef audit fill:#faf5ff,stroke:#9333ea,stroke-width:2px,color:#581c87,rx:8,ry:8;

    Start([🔵 เริ่มต้น: ผู้ใช้งานเข้าสู่ระบบ Nursing Lab System]):::startEnd
    Auth[🔑 ตรวจสอบยืนยันตัวตนและสิทธิ์การใช้งาน<br/>(Supabase Auth & Role-Based Access Control: RLS)]:::process
    Start --> Auth

    %% STAGE 1
    subgraph S1 ["ขั้นตอนที่ 1: การเตรียมข้อมูลแม่แบบและบริหารคลังพัสดุ (Master Data & Inventory Setup)"]
        CourseSetup[📚 อาจารย์/เจ้าหน้าที่กำหนดรายวิชาและผูกชุดอุปกรณ์แม่แบบ<br/>(Course Setup & Kit Templates)]:::prep
        CheckStock[📦 ตรวจสอบยอดคงคลัง: เวชภัณฑ์ในสต็อกและครุภัณฑ์พร้อมใช้<br/>(Check Consumables & Equipment Assets)]:::prep
        IsStockEnough{ยอดพัสดุในคลัง<br/>เพียงพอหรือไม่?}:::decision
        OrderSupply[⚠️ แจ้งเตือนสต็อกต่ำ & ดำเนินการสั่งซื้อ/รับเข้าพัสดุใหม่<br/>(Low Stock Alert & Procurement)]:::warn
        StockIn[📥 ตรวจรับพัสดุเข้าคลัง บันทึก Lot วันหมดอายุ และติด QR Code<br/>(Stock-In Processing)]:::prep
        PackPrep[✂️ จัดเตรียมเซ็ตฝึกปฏิบัติและแบ่งบรรจุซองสเตอร์ไรด์<br/>(Repack & Set Preparation)]:::prep

        CourseSetup --> CheckStock
        CheckStock --> IsStockEnough
        IsStockEnough -- ❌ ไม่เพียงพอ --> OrderSupply
        OrderSupply --> StockIn
        StockIn --> CheckStock
        IsStockEnough --  เพียงพอ --> PackPrep
    end
    Auth --> CourseSetup

    %% STAGE 2
    subgraph S2 ["ขั้นตอนที่ 2: การยื่นคำร้องและการจองฝึกปฏิบัติ (Request & Booking Submission)"]
        UserSelect[🗓️ ผู้ขอ (นศ./อาจารย์) เลือกรายวิชา ระบุวัน-เวลา ห้องแลป และอุปกรณ์<br/>(Select Course, Time Slot & Required Items)]:::process
        CreateReq[📝 ส่งคำร้องขอเบิกพัสดุ หรือจองฝึกทักษะการพยาบาล<br/>(Submit Material Request / Practice Booking)]:::process
        ReqStatus[⏳ บันทึกคำร้องลงฐานข้อมูล สถานะ: รอดำเนินการ (PENDING)<br/>(Pending Approval Queue)]:::process

        PackPrep --> UserSelect
        UserSelect --> CreateReq
        CreateReq --> ReqStatus
    end

    %% STAGE 3
    subgraph S3 ["ขั้นตอนที่ 3: การตรวจสอบและพิจารณาอนุมัติคำขอ (Review & Approval Process)"]
        ReviewReq[🔍 อาจารย์ผู้รับผิดชอบหรือเจ้าหน้าที่แลปตรวจสอบความถูกต้อง<br/>(Review Request Details & Lab Availability)]:::process
        IsApproved{ผลการพิจารณา<br/>อนุมัติหรือไม่?}:::decision
        RejectReq[🚫 ไม่อนุมัติ: แจ้งเหตุผลปฏิเสธและส่งกลับให้ผู้ขอดำเนินการ<br/>(Rejected / Reason Provided)]:::warn
        ApproveReq[✅ อนุมัติคำขอ: จองคิวห้องแลปและกันยอดพัสดุในระบบทันที<br/>(Approved: Hold Inventory & Reserve Room)]:::process

        ReqStatus --> ReviewReq
        ReviewReq --> IsApproved
        IsApproved -- ❌ ไม่อนุมัติ --> RejectReq
        RejectReq -.->|แก้ไขข้อมูล/ยื่นใหม่| UserSelect
        IsApproved --  อนุมัติ --> ApproveReq
    end

    %% STAGE 4
    subgraph S4 ["ขั้นตอนที่ 4: การจัดเตรียมและส่งมอบอุปกรณ์ (Fulfillment & Check-out)"]
        StaffPick[🛒 เจ้าหน้าที่จัดของตามใบงาน หยิบครุภัณฑ์และเวชภัณฑ์ตามจำนวน<br/>(Staff Pick & Assemble Items)]:::process
        ScanQR[📱 สแกน QR Code ประจำเครื่องเพื่อตรวจสอบความถูกต้องรายชิ้น<br/>(QR Code Verification)]:::process
        Handover[🤝 ส่งมอบอุปกรณ์ให้ผู้ขอ ตรวจสอบสภาพร่วมกันและลงชื่อรับ<br/>(Handover & Sign-off Confirmation)]:::process
        SetInUse[🚀 ระบบปรับสถานะคำร้องเป็น: อยู่ระหว่างใช้งาน (IN_USE)<br/>(Status Updated to IN_USE)]:::process

        ApproveReq --> StaffPick
        StaffPick --> ScanQR
        ScanQR --> Handover
        Handover --> SetInUse
    end

    %% STAGE 5
    subgraph S5 ["ขั้นตอนที่ 5: การฝึกปฏิบัติและการตรวจรับคืน (Practice & Return Inspection)"]
        InPractice[🩺 ดำเนินการเรียนการสอน หรือฝึกทักษะการพยาบาลตามตาราง<br/>(Active Nursing Practice Session)]:::process
        ReturnItem[🔄 นำอุปกรณ์และเวชภัณฑ์ที่เหลือมาส่งคืนที่ห้องปฏิบัติการ<br/>(Return Items to Nursing Lab)]:::process
        InspectItem[🔬 เจ้าหน้าที่ตรวจนับจำนวน ตรวจสภาพการทำงาน และความสะอาด<br/>(Inspection & Count Verification)]:::process
        IsDamaged{พบการชำรุด<br/>เสียหาย หรือสูญหาย?}:::decision

        InPractice --> ReturnItem
        ReturnItem --> InspectItem
        InspectItem --> IsDamaged

        subgraph S5_Damaged ["⚠️ กรณีพบความเสียหายหรือสูญหาย (Damage Handling)"]
            RecordDamage[📋 บันทึกประเมินความเสียหาย (Damage Assessment Record)<br/>ระบุลักษณะอาการ ภาพถ่าย และสาเหตุ]:::warn
            AssessFine[💰 คำนวณค่าปรับ/ค่าชดใช้ตามระเบียบคณะพยาบาลศาสตร์<br/>(Fine & Compensation Assessment)]:::warn
            SendRepair[🛠️ ส่งรายการเข้าคิวแจ้งซ่อม ปรับสถานะเครื่องเป็น MAINTENANCE<br/>(Create Maintenance Ticket)]:::warn
        end

        subgraph S5_Normal [" กรณีสภาพปกติสมบูรณ์ (Normal Return)"]
            AcceptReturn[✨ ยืนยันการรับคืนสำเร็จ ปรับสถานะเครื่องเป็น AVAILABLE พร้อมใช้<br/>(Update Asset to AVAILABLE)]:::prep
            CutStock[📊 ตัดลดยอดเวชภัณฑ์ที่ใช้หมดไปตามจริง (Consumed Stock)<br/>(Update Stock Lot Balances)]:::prep
        end

        IsDamaged -- ⚠️ พบชำรุด/สูญหาย --> RecordDamage
        RecordDamage --> AssessFine
        AssessFine --> SendRepair

        IsDamaged --  ปกติสมบูรณ์ --> AcceptReturn
        AcceptReturn --> CutStock
    end
    SetInUse --> InPractice

    %% STAGE 6
    subgraph S6 ["ขั้นตอนที่ 6: การบันทึกประวัติ สรุปผล และรายงานผู้บริหาร (Audit & Analytics)"]
        CloseReq[🏁 ปิดคำร้องสมบูรณ์ อัปเดตสถานะเป็น: เสร็จสิ้น (COMPLETED)<br/>(Finalize Request)]:::audit
        AuditLog[🔒 บันทึก Audit Trail ทุกการกระทำ เวลา และผู้รับผิดชอบอย่างโปร่งใส<br/>(Immutable System Audit Log)]:::audit
        CalcMetrics[📈 ประมวลผลดัชนีชี้วัด (KPIs): อัตราการใช้ห้อง อุปกรณ์ยอดนิยม ยอดชำรุด<br/>(Compute Strategic Metrics)]:::audit
        ExecDashboard[📊 นำเสนอข้อมูลบน Executive Dashboard สำหรับอาจารย์และผู้บริหาร<br/>(Dean & Faculty Analytics View)]:::audit
        EndNode([🔴 สิ้นสุดกระบวนการทำงาน]):::startEnd

        SendRepair --> CloseReq
        CutStock --> CloseReq
        CloseReq --> AuditLog
        AuditLog --> CalcMetrics
        CalcMetrics --> ExecDashboard
        ExecDashboard --> EndNode
    end
`;

const htmlTemplate = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ผังขั้นตอนการทำงานทั้งระบบ (System Operational Flowchart) - ระบบห้องปฏิบัติการพยาบาล</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=Prompt:wght@400;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Sarabun', 'Leelawadee UI', sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      padding: 30px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .container {
      max-width: 1200px;
      width: 100%;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05);
      padding: 40px;
      border: 1px solid #e2e8f0;
    }
    .header {
      text-align: center;
      margin-bottom: 35px;
      padding-bottom: 25px;
      border-bottom: 2px solid #e2e8f0;
    }
    .badge {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      font-size: 14px;
      font-weight: 600;
      padding: 6px 16px;
      border-radius: 9999px;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    h1 {
      font-family: 'Prompt', 'Sarabun', sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 10px;
    }
    p.subtitle {
      font-size: 16px;
      color: #64748b;
      max-width: 850px;
      margin: 0 auto;
      line-height: 1.6;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 15px;
      margin-top: 20px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #334155;
    }
    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
    }
    .diagram-wrapper {
      display: flex;
      justify-content: center;
      background: #ffffff;
      padding: 20px 10px;
      overflow-x: auto;
    }
    .mermaid {
      width: 100%;
      display: flex;
      justify-content: center;
    }
    .mermaid svg {
      max-width: 100%;
      height: auto;
    }
    .footer-notes {
      margin-top: 35px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 14px;
      color: #64748b;
      line-height: 1.6;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }
    .note-card {
      background: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #0284c7;
    }
    .note-card h4 {
      font-size: 15px;
      color: #0f172a;
      margin-bottom: 6px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">SYSTEM OPERATIONAL FLOWCHART</span>
      <h1>ผังขั้นตอนการทำงานและความเชื่อมโยงทั้งระบบ (Vertical Flowchart)</h1>
      <p class="subtitle">แสดงลำดับขั้นตอนการปฏิบัติงาน (Business Process Lifecycle) ตั้งแต่การตั้งค่ารายวิชา การบริหารคลังพัสดุ การยื่นคำร้อง การพิจารณาอนุมัติ การจ่าย-คืนพัสดุ การตรวจนับความเสียหาย ไปจนถึงการสรุปผลสู่ผู้บริหาร</p>
      
      <div class="legend">
        <div class="legend-item"><span class="legend-color" style="background:#0f172a;"></span> จุดเริ่มต้น / สิ้นสุด (Terminator)</div>
        <div class="legend-item"><span class="legend-color" style="background:#ffffff; border:2px solid #0284c7;"></span> ขั้นตอนการทำงาน (Process)</div>
        <div class="legend-item"><span class="legend-color" style="background:#fef3c7; border:2px solid #d97706;"></span> จุดตัดสินใจ / เงื่อนไข (Decision Diamond)</div>
        <div class="legend-item"><span class="legend-color" style="background:#f0fdf4; border:2px solid #16a34a;"></span> การจัดการพัสดุ/คืนสมบูรณ์ (Success)</div>
        <div class="legend-item"><span class="legend-color" style="background:#fef2f2; border:2px solid #dc2626;"></span> แจ้งเตือน/ตรวจพบชำรุด (Warning & Incident)</div>
        <div class="legend-item"><span class="legend-color" style="background:#faf5ff; border:2px solid #9333ea;"></span> บันทึกประวัติและรายงาน (Audit & Analytics)</div>
      </div>
    </div>

    <div class="diagram-wrapper">
      <div class="mermaid">
${flowchartMermaid}
      </div>
    </div>

    <div class="footer-notes">
      <div class="note-card">
        <h4>1. มาตรฐานการควบคุมคุณภาพ (Quality Gate)</h4>
        <p>มีจุดตัดสินใจ (Decision Point) ตรวจสอบความพร้อมของพัสดุก่อนเปิดให้จอง และตรวจสอบสภาพอุปกรณ์รายชิ้นผ่าน QR Code ก่อนปิดคำร้องทุกครั้ง</p>
      </div>
      <div class="note-card" style="border-left-color: #10b981;">
        <h4>2. การเชื่อมโยงอัตโนมัติ (Automated Linkage)</h4>
        <p>เมื่อคำขอได้รับการอนุมัติ ระบบจะล็อกยอดคงคลังและจองคิวห้องทันที และเมื่อรับคืนเสร็จสิ้น สต็อกเวชภัณฑ์จะถูกตัดยอดตามจริงโดยอัตโนมัติ</p>
      </div>
      <div class="note-card" style="border-left-color: #8b5cf6;">
        <h4>3. ธรรมาภิบาลและการตรวจสอบ (Audit & Governance)</h4>
        <p>ทุกการเปลี่ยนแปลงข้อมูลจะถูกบันทึกลงใน Audit Trail แบบแก้ไขไม่ได้ พร้อมประมวลผลเป็นดัชนีชี้วัด (KPIs) บน Executive Dashboard</p>
      </div>
    </div>
  </div>

  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'base',
      themeVariables: {
        fontFamily: "'Sarabun', 'Leelawadee UI', sans-serif",
        fontSize: '14px',
        primaryColor: '#ffffff',
        primaryTextColor: '#0f172a',
        primaryBorderColor: '#0284c7',
        lineColor: '#475569',
        secondaryColor: '#f0fdf4',
        tertiaryColor: '#fef3c7',
        edgeLabelBackground: '#ffffff'
      },
      flowchart: {
        curve: 'basis',
        htmlLabels: true,
        useMaxWidth: false,
        nodeSpacing: 40,
        rankSpacing: 45
      }
    });
  </script>
</body>
</html>`;

async function main() {
  console.log('Writing HTML and Markdown files...');
  
  // 1. Write HTML
  const htmlPath = path.join(TARGET_DIR, 'system_operational_flowchart.html');
  fs.writeFileSync(htmlPath, htmlTemplate, 'utf8');
  console.log('Written HTML:', htmlPath);

  // 2. Write Markdown
  const mdContent = `# ผังขั้นตอนการทำงานและความเชื่อมโยงทั้งระบบ (System Operational Flowchart)
**ระบบห้องปฏิบัติการพยาบาล (Nursing Lab System)**

ผังงานนี้แสดงลำดับขั้นตอนการปฏิบัติงานในรูปแบบ **Vertical Flowchart (แนวตั้ง)** ตามมาตรฐานผังงานสากล มีจุดเริ่มต้น-สิ้นสุด (Terminator), กล่องขั้นตอน (Process), และจุดตัดสินใจเงื่อนไข (Decision Diamonds) พร้อมการแยกแขนงกรณีปกติและกรณีเกิดความเสียหายอย่างชัดเจน

\`\`\`mermaid
${flowchartMermaid}
\`\`\`

---

### รายละเอียด 6 ขั้นตอนหลักในผังงาน:
1. **ขั้นตอนที่ 1: การเตรียมข้อมูลแม่แบบและบริหารคลังพัสดุ (Master Data & Inventory Setup)**
   - อาจารย์/เจ้าหน้าที่กำหนดรายวิชาและผูกชุดอุปกรณ์แม่แบบ (Kit Templates)
   - ตรวจสอบยอดคงคลัง: เวชภัณฑ์ในสต็อกและครุภัณฑ์พร้อมใช้
   - **จุดตัดสินใจ 1**: ยอดพัสดุในคลังเพียงพอหรือไม่? หากไม่พอ แจ้งเตือน Low Stock เพื่อสั่งซื้อและตรวจรับเข้าคลังใหม่ (Stock-In) หากเพียงพอ จัดเตรียมเซ็ตฝึกและแบ่งบรรจุสเตอร์ไรด์ (Repack)
2. **ขั้นตอนที่ 2: การยื่นคำร้องและการจองฝึกปฏิบัติ (Request & Booking Submission)**
   - ผู้ขอกำหนดวัน-เวลา รายวิชา และเลือกรายการอุปกรณ์
   - ยื่นคำร้องผ่านระบบ สถานะจะถูกบันทึกเป็น \`PENDING\`
3. **ขั้นตอนที่ 3: การตรวจสอบและพิจารณาอนุมัติคำขอ (Review & Approval Process)**
   - อาจารย์ผู้รับผิดชอบหรือเจ้าหน้าที่ตรวจสอบรายละเอียด
   - **จุดตัดสินใจ 2**: ผลการพิจารณาอนุมัติหรือไม่? หากไม่อนุมัติ ระบบแจ้งเหตุผลและส่งกลับให้แก้ไข หากอนุมัติ ระบบจะล็อกยอดคงคลังและจองคิวห้องแลปทันที
4. **ขั้นตอนที่ 4: การจัดเตรียมและส่งมอบอุปกรณ์ (Fulfillment & Check-out)**
   - เจ้าหน้าที่จัดของตามใบงาน และสแกน QR Code ประจำเครื่องเพื่อตรวจสอบความถูกต้อง
   - ส่งมอบอุปกรณ์ให้ผู้ขอ เซ็นรับในระบบ และปรับสถานะเป็น \`IN_USE\`
5. **ขั้นตอนที่ 5: การฝึกปฏิบัติและการตรวจรับคืน (Practice & Return Inspection)**
   - นักศึกษาฝึกทักษะการพยาบาลตามเวลา เมื่อเสร็จสิ้นนำส่งคืนที่ห้องปฏิบัติการ
   - เจ้าหน้าที่ตรวจนับจำนวน ตรวจสภาพการทำงาน และความสะอาด
   - **จุดตัดสินใจ 3**: พบการชำรุด เสียหาย หรือสูญหายหรือไม่?
     - **กรณีพบชำรุด/สูญหาย**: บันทึกประเมินความเสียหาย (Damage Assessment) -> คำนวณค่าปรับตามระเบียบ -> ส่งรายการเข้าคิวแจ้งซ่อม (MAINTENANCE)
     - **กรณีปกติสมบูรณ์**: ปรับสถานะเครื่องเป็นพร้อมใช้ (AVAILABLE) -> ตัดลดยอดเวชภัณฑ์ที่ใช้หมดไปตามจริง (Consumed Stock)
6. **ขั้นตอนที่ 6: การบันทึกประวัติ สรุปผล และรายงานผู้บริหาร (Audit & Analytics)**
   - ปิดคำร้องสมบูรณ์ (\`COMPLETED\`)
   - บันทึกประวัติการทำรายการลง Audit Trail แบบเปลี่ยนแปลงไม่ได้
   - ประมวลผลดัชนีชี้วัด (KPIs) และนำเสนอข้อมูลบน Executive Dashboard
`;
  const mdPath = path.join(TARGET_DIR, 'SYSTEM_OPERATIONAL_FLOWCHART.md');
  fs.writeFileSync(mdPath, mdContent, 'utf8');
  console.log('Written Markdown:', mdPath);

  // 3. Launch Puppeteer Edge headless
  console.log('Launching Edge for high-resolution rendering...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 2600, deviceScaleFactor: 2.5 });

  console.log('Loading HTML file in headless browser...');
  await page.goto('file:///' + htmlPath.replace(/\\\\/g, '/'), { waitUntil: 'networkidle0' });

  // Wait for mermaid SVG
  await page.waitForSelector('.mermaid svg', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  const pngThai = path.join(TARGET_DIR, 'ผังขั้นตอนการทำงานทั้งระบบ_System_Flowchart.png');
  const pngEng = path.join(TARGET_DIR, 'system_operational_flowchart.png');
  const jpgThai = path.join(TARGET_DIR, 'ผังขั้นตอนการทำงานทั้งระบบ_System_Flowchart.jpg');
  const manualPng = path.join(MANUAL_IMG_DIR, 'flow_system_operational_flowchart.png');

  console.log('Capturing full diagram container as PNG...');
  const container = await page.$('.container');
  await container.screenshot({ path: pngThai, type: 'png' });
  fs.copyFileSync(pngThai, pngEng);
  fs.copyFileSync(pngThai, manualPng);
  console.log('Saved PNG:', pngThai);

  console.log('Capturing JPG...');
  await container.screenshot({ path: jpgThai, type: 'jpeg', quality: 95 });
  console.log('Saved JPG:', jpgThai);

  console.log('Generating Portrait PDF...');
  const pdfThai = path.join(TARGET_DIR, 'ผังขั้นตอนการทำงานทั้งระบบ_System_Flowchart.pdf');
  const pdfEng = path.join(TARGET_DIR, 'system_operational_flowchart.pdf');
  await page.pdf({
    path: pdfThai,
    format: 'A3',
    landscape: false,
    printBackground: true,
    margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
  });
  fs.copyFileSync(pdfThai, pdfEng);
  console.log('Saved PDF:', pdfThai);

  await browser.close();
  console.log('Browser rendering finished successfully!');
}

main().catch(err => {
  console.error('Error rendering flowchart:', err);
  process.exit(1);
});
