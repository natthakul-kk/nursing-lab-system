const fs = require('fs');
const path = require('path');
const puppeteer = require('d:/LAB-system/node_modules/puppeteer-core');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MANUAL_DIR = path.join('d:', 'LAB-system', 'manual');
const FLOWCHART_DIR = path.join(MANUAL_DIR, 'flowcharts');
const IMAGES_DIR = path.join(MANUAL_DIR, 'images');

[MANUAL_DIR, FLOWCHART_DIR, IMAGES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 1. Mermaid Flowchart Definitions with strict standard symbols & colors
const flowcharts = [
  {
    id: 'flowchart_1_student_lifecycle',
    title: 'ผังงานที่ 1: ภาพรวมขั้นตอนการใช้งานของนิสิต (Overall Student Lifecycle)',
    mermaid: `flowchart TD
    classDef terminator fill:#047857,stroke:#065f46,stroke-width:2.5px,color:#ffffff,font-weight:bold;
    classDef process fill:#ffffff,stroke:#0284c7,stroke-width:2px,color:#0f172a;
    classDef inputOutput fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e40af;
    classDef decision fill:#fef3c7,stroke:#d97706,stroke-width:2.5px,color:#92400e,font-weight:bold;
    classDef successProcess fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#14532d,font-weight:bold;
    classDef warnProcess fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#991b1b;
    classDef doc fill:#fdf4ff,stroke:#a855f7,stroke-width:2px,color:#6b21a8;

    Start([🟢 เริ่มต้น: นิสิตล็อกอินเข้าระบบด้วยรหัสนิสิต]):::terminator
    SelectService{เลือกบริการ<br/>ที่ต้องการใช้งาน?}:::decision
    Start --> SelectService

    %% Branch 1: Borrow & Requisition
    ReqService[/1. ยืม-คืนครุภัณฑ์ และเบิกพัสดุสิ้นเปลือง/]:::inputOutput
    SelectService -->|ต้องการอุปกรณ์รายวิชา| ReqService
    FillUnifiedForm[กรอกฟอร์ม One-Stop: เลือกวิชา, กำหนดวัตถุประสงค์, เลือกของ]:::process
    ReqService --> FillUnifiedForm
    WaitApproval{อาจารย์และเจ้าหน้าที่<br/>อนุมัติคำขอหรือไม่?}:::decision
    FillUnifiedForm --> WaitApproval
    RejectReq[❌ ไม่อนุมัติ: ดูเหตุผลและแก้ไขส่งใหม่]:::warnProcess
    WaitApproval -->|ไม่อนุมัติ| RejectReq
    RejectReq -.->|ปรับแก้| FillUnifiedForm
    ApproveReq[✅ อนุมัติคำขอ: สถานะ APPROVED พร้อมรับของ]:::successProcess
    WaitApproval -->|อนุมัติ| ApproveReq
    PickItems[ติดต่อรับของที่ห้องแล็บพยาบาล ณ วันนัดหมาย]:::process
    ApproveReq --> PickItems
    UseItems[นำอุปกรณ์ไปใช้ฝึกปฏิบัติการในคาบเรียน]:::process
    PickItems --> UseItems
    ReturnItems[นำครุภัณฑ์ส่งคืน ณ เคาน์เตอร์แล็บตามกำหนด]:::process
    UseItems --> ReturnItems
    CheckCondition{สภาพครุภัณฑ์<br/>สมบูรณ์หรือไม่?}:::decision
    ReturnItems --> CheckCondition
    ReturnOk[เจ้าหน้าที่ตรวจรับครบถ้วน: คืนเสร็จสมบูรณ์ RETURNED]:::successProcess
    CheckCondition -->|สมบูรณ์| ReturnOk
    ReturnIssue[บันทึกอาการชำรุด / ส่งซ่อมบำรุง RETURNED_WITH_ISSUE]:::warnProcess
    CheckCondition -->|ชำรุด/มีปัญหา| ReturnIssue

    %% Branch 2: Practice Kits
    KitService[/2. ชุดฝึกปฏิบัติการสำเร็จรูป Kits/]:::inputOutput
    SelectService -->|ต้องการชุด Box Set| KitService
    SelectKit[เลือกชุดตามหัตถการ เช่น ชุดทำแผล, ชุดสวนปัสสาวะ]:::process
    KitService --> SelectKit
    OneClickReq[กดขอเบิกแบบ One-Click: ระบบดึงพัสดุทั้งชุดอัตโนมัติ]:::process
    SelectKit --> OneClickReq
    OneClickReq --> WaitApproval

    %% Branch 3: Practice Booking
    BookingService[/3. ขอเข้าฝึกปฏิบัติด้วยตนเอง จองห้องแล็บ/]:::inputOutput
    SelectService -->|ต้องการซ้อมนอกเวลา| BookingService
    SelectSlot[เลือกห้องแล็บ วันที่ และรอบเวลาที่เปิดบริการ]:::process
    BookingService --> SelectSlot
    CheckSlot{รอบเวลาดังกล่าว<br/>มีที่ว่างหรือไม่?}:::decision
    SelectSlot --> CheckSlot
    SlotFull[❌ รอบเต็ม: กรุณาเลือกรอบอื่นหรือห้องอื่น]:::warnProcess
    CheckSlot -->|รอบเต็ม| SlotFull
    SlotFull -.-> SelectSlot
    ConfirmBooking[ยืนยันการจอง: ระบุวิชา และอาจารย์ที่ปรึกษา]:::process
    CheckSlot -->|มีที่ว่าง| ConfirmBooking
    GetTicket[📄 ได้รับ E-Ticket พร้อม QR Code ประจำการจอง]:::doc
    ConfirmBooking --> GetTicket
    ArriveLab[เดินทางมาถึงหน้าห้องแล็บตามวัน-เวลาที่จอง]:::process
    GetTicket --> ArriveLab
    ScanQR[สแกน QR Code Check-in เพื่อเข้าห้องปฏิบัติการ]:::process
    ArriveLab --> ScanQR
    CompletePractice[เสร็จสิ้นการฝึกซ้อม บันทึกสถิติชั่วโมงฝึก COMPLETED]:::successProcess
    ScanQR --> CompletePractice

    %% End
    EndSuccess([🔴 สิ้นสุด: การใช้งานระบบสมบูรณ์]):::terminator
    ReturnOk --> EndSuccess
    ReturnIssue --> EndSuccess
    CompletePractice --> EndSuccess
    `
  },
  {
    id: 'flowchart_2_unified_borrow_requisition',
    title: 'ผังงานที่ 2: ขั้นตอนการยืม-เบิกแบบ One-Stop พร้อมเงื่อนไขตรวจสอบความปลอดภัย (Unified Request Flow)',
    mermaid: `flowchart TD
    classDef terminator fill:#0f766e,stroke:#115e59,stroke-width:2.5px,color:#ffffff,font-weight:bold;
    classDef process fill:#ffffff,stroke:#0284c7,stroke-width:2px,color:#0f172a;
    classDef inputOutput fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e40af;
    classDef decision fill:#fef3c7,stroke:#d97706,stroke-width:2.5px,color:#92400e,font-weight:bold;
    classDef successProcess fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#14532d,font-weight:bold;
    classDef warnProcess fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#991b1b;
    classDef doc fill:#fdf4ff,stroke:#a855f7,stroke-width:2px,color:#6b21a8;

    StartReq([🟢 เริ่มต้น: กดสร้างคำขอยืม-เบิกใหม่ One-Stop]):::terminator
    ChooseCourse[/เลือกรหัสรายวิชา: ระบบค้นหาชื่ออาจารย์ผู้รับผิดชอบให้อัตโนมัติ/]:::inputOutput
    StartReq --> ChooseCourse

    DecideTarget{วัตถุประสงค์การใช้งาน<br/>(Use Target)?}:::decision
    ChooseCourse --> DecideTarget

    %% Human Branch
    HumanPath[/🧑‍⚕️ ใช้งานกับคนจริง / คลินิก Clinical Patient/]:::inputOutput
    DecideTarget -->|ใช้กับคนจริง| HumanPath
    LockSafety[🛡️ เปิดระบบ Patient Safety Lock ตรวจสอบวันหมดอายุ 100%]:::process
    HumanPath --> LockSafety
    CheckUnexpired{ยอดสต็อกที่ยังไม่หมดอายุ<br/>มีเพียงพอหรือไม่?}:::decision
    LockSafety --> CheckUnexpired
    RejectHuman[❌ ปฏิเสธการขอเบิก: ล็อตหมดอายุไม่สามารถใช้กับคนจริงได้]:::warnProcess
    CheckUnexpired -->|ไม่พอ/หมดอายุ| RejectHuman
    RejectHuman -.->|เปลี่ยนรายการ/ลดจำนวน| ChooseCourse
    PassHuman[✅ ตรวจสอบผ่าน: จัดสรรเฉพาะล็อตที่ยังไม่หมดอายุ]:::successProcess
    CheckUnexpired -->|เพียงพอ| PassHuman

    %% Simulation Branch
    SimPath[/🧪 ฝึกปฏิบัติการกับหุ่นจำลอง Sim-Lab Training/]:::inputOutput
    DecideTarget -->|ฝึกกับหุ่น| SimPath
    AllowExpired[ระบบอนุญาตให้ใช้เวชภัณฑ์ที่หมดอายุได้เพื่อประหยัดทรัพยากร]:::process
    SimPath --> AllowExpired
    CheckTotalStock{ยอดสต็อกรวมทั้งหมด<br/>มีเพียงพอหรือไม่?}:::decision
    AllowExpired --> CheckTotalStock
    RejectSim[❌ ปฏิเสธ: ยอดของในคลังไม่พอ]:::warnProcess
    CheckTotalStock -->|ไม่เพียงพอ| RejectSim
    RejectSim -.->|เปลี่ยนรายการ| ChooseCourse
    PassSim[✅ ตรวจสอบผ่าน: ติดป้ายเตือนสีเหลือง สำหรับฝึกกับหุ่นเท่านั้น]:::successProcess
    CheckTotalStock -->|เพียงพอ| PassSim

    %% Merge
    SelectItems[/เลือกรายการครุภัณฑ์ที่ยืม และระบุวัสดุสิ้นเปลืองที่ขอเบิก/]:::inputOutput
    PassHuman --> SelectItems
    PassSim --> SelectItems
    SetDates[/ระบุวัน-เวลาที่ยืม และกำหนดวันส่งคืน/]:::inputOutput
    SelectItems --> SetDates
    SubmitForm[กดยืนยัน: ส่งคำขอรวม One-Stop เข้าสู่ระบบ]:::process
    SetDates --> SubmitForm

    NotifyAdvisor[📄 ส่งแจ้งเตือนอาจารย์ผู้รับผิดชอบรายวิชารับทราบ]:::doc
    SubmitForm --> NotifyAdvisor
    AdvisorAck{อาจารย์ผู้สอน<br/>กดรับทราบแล้วหรือไม่?}:::decision
    NotifyAdvisor --> AdvisorAck
    WaitAck[สถานะ: รออาจารย์รับทราบ Pending Advisor Acknowledgment]:::warnProcess
    AdvisorAck -->|ยังไม่รับทราบ| WaitAck
    WaitAck -.->|อาจารย์ตรวจสอบ| AdvisorAck

    OfficerReview[เจ้าหน้าที่แล็บพยาบาล ตรวจสอบและจัดสรรของ]:::process
    AdvisorAck -->|รับทราบแล้ว| OfficerReview
    OfficerApprove{เจ้าหน้าที่แล็บ<br/>อนุมัติคำขอหรือไม่?}:::decision
    OfficerReview --> OfficerApprove
    RejectOfficer[❌ ไม่อนุมัติ: ระบุเหตุผลในระบบ]:::warnProcess
    OfficerApprove -->|ไม่อนุมัติ| RejectOfficer
    ApproveDone[✅ อนุมัติเรียบร้อย: สถานะ APPROVED พร้อมจ่ายของ]:::successProcess
    OfficerApprove -->|อนุมัติ| ApproveDone

    DispenseItems[นิสิตติดต่อรับพัสดุ: เจ้าหน้าที่จ่ายของตามล็อตที่อนุมัติ]:::process
    ApproveDone --> DispenseItems
    EndReq([🔴 สิ้นสุดขั้นตอนการยืม-เบิก]):::terminator
    DispenseItems --> EndReq
    `
  },
  {
    id: 'flowchart_3_practice_booking',
    title: 'ผังงานที่ 3: ขั้นตอนการจองห้องปฏิบัติการและ Check-in สแกนเข้าห้อง (Practice Booking & Check-in Flow)',
    mermaid: `flowchart TD
    classDef terminator fill:#1e3a8a,stroke:#1e40af,stroke-width:2.5px,color:#ffffff,font-weight:bold;
    classDef process fill:#ffffff,stroke:#0284c7,stroke-width:2px,color:#0f172a;
    classDef inputOutput fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e40af;
    classDef decision fill:#fef3c7,stroke:#d97706,stroke-width:2.5px,color:#92400e,font-weight:bold;
    classDef successProcess fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#14532d,font-weight:bold;
    classDef warnProcess fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#991b1b;
    classDef doc fill:#fdf4ff,stroke:#a855f7,stroke-width:2px,color:#6b21a8;

    StartBook([🟢 เริ่มต้น: เข้าเมนู ขอเข้าฝึกปฏิบัติด้วยตนเอง]):::terminator
    ChooseRoomDate[/1. เลือกห้องปฏิบัติการ และวันที่ต้องการฝึกซ้อม/]:::inputOutput
    StartBook --> ChooseRoomDate
    ViewSlots[ระบบแสดงตารางรอบเวลา Time Slots และจำนวนที่ว่าง]:::process
    ChooseRoomDate --> ViewSlots
    SelectTimeSlot[/2. เลือกรอบเวลาฝึก เช่น 16:30 - 18:00 น./]:::inputOutput
    ViewSlots --> SelectTimeSlot

    CheckSlotAvailable{รอบเวลาดังกล่าว<br/>มีที่ว่างหรือไม่?}:::decision
    SelectTimeSlot --> CheckSlotAvailable
    SlotFullNotice[❌ รอบนี้เต็มแล้ว: ระบบแสดงป้ายสีแดง]:::warnProcess
    CheckSlotAvailable -->|เต็ม| SlotFullNotice
    SlotFullNotice -.->|เลือกรอบอื่น/ห้องอื่น| ChooseRoomDate

    FillBookingDetails[/3. ระบุรายวิชา, วัตถุประสงค์ และอาจารย์ที่ปรึกษา/]:::inputOutput
    CheckSlotAvailable -->|มีที่ว่าง| FillBookingDetails
    AttachKit{ต้องการชุดฝึก<br/>หัตถการ Kits ด้วยหรือไม่?}:::decision
    FillBookingDetails --> AttachKit
    SelectKitOption[/เลือกชุด Kit ที่ต้องการ เช่น ชุดสวนปัสสาวะ, ชุดทำแผล/]:::inputOutput
    AttachKit -->|ต้องการชุดฝึก| SelectKitOption
    SelectKitOption --> ConfirmSubmit
    ConfirmSubmit[กดยืนยันการจองห้องปฏิบัติการ]:::process
    AttachKit -->|ไม่ต้องการชุดฝึก| ConfirmSubmit

    SaveBooking[ระบบบันทึกการจอง และล็อกที่นั่งในรอบเวลาทันที]:::process
    ConfirmSubmit --> SaveBooking
    GenerateTicket[📄 ออก E-Ticket พร้อม QR Code ประจำรอบการจอง]:::doc
    SaveBooking --> GenerateTicket

    DayOfPractice[นิสิตเดินทางมาถึงหน้าห้องแล็บตามวัน-เวลาที่จอง]:::process
    GenerateTicket --> DayOfPractice
    ScanCheckin[/สแกน QR Code หน้าห้องแล็บเพื่อ Check-in/]:::inputOutput
    DayOfPractice --> ScanCheckin

    ValidateCheckin{ระบบตรวจสอบ<br/>วัน-เวลาและสิทธิ์ถูกต้อง?}:::decision
    ScanCheckin --> ValidateCheckin
    InvalidCheckin[❌ ปฏิเสธ: ไม่อยู่ในช่วงเวลาที่จองไว้]:::warnProcess
    ValidateCheckin -->|ไม่ถูกต้อง| InvalidCheckin
    InvalidCheckin -.->|รอถึงเวลา| DayOfPractice

    CheckinSuccess[✅ Check-in สำเร็จ: สถานะ IN_PRACTICE เข้าฝึกได้]:::successProcess
    ValidateCheckin -->|ถูกต้อง| CheckinSuccess
    FinishPractice[เมื่อฝึกซ้อมเสร็จสิ้น: กด Check-out หรือหมดเวลาอัตโนมัติ]:::process
    CheckinSuccess --> FinishPractice
    RecordHours[บันทึกสถิติชั่วโมงการฝึกซ้อมลงประวัติส่วนตัว COMPLETED]:::successProcess
    FinishPractice --> RecordHours
    EndBook([🔴 สิ้นสุดการเข้าฝึกปฏิบัติการ]):::terminator
    RecordHours --> EndBook
    `
  }
];

// Helper: Generate HTML template with Mermaid
function generateHtmlPage(fc) {
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>${fc.title}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Prompt:wght@400;600;700&display=swap');
    body {
      margin: 0;
      padding: 30px;
      background: #ffffff;
      font-family: 'Sarabun', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .header-box {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 2px solid #0d9488;
      width: 100%;
      max-width: 950px;
    }
    .header-box h1 {
      font-family: 'Prompt', sans-serif;
      font-size: 20px;
      color: #0f766e;
      margin: 0 0 6px 0;
    }
    .header-box p {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
    .legend {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 10px;
      font-size: 11px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .legend-box {
      width: 14px;
      height: 14px;
      border-radius: 4px;
    }
    .mermaid {
      background: #ffffff;
      display: flex;
      justify-content: center;
    }
    .mermaid svg {
      max-width: 100%;
      height: auto;
      font-family: 'Sarabun', sans-serif !important;
    }
  </style>
</head>
<body>
  <div class="header-box">
    <h1>${fc.title}</h1>
    <p>คู่มือการใช้งานระบบห้องปฏิบัติการพยาบาลศาสตร์ สำหรับนิสิต (Student User Manual)</p>
    <div class="legend">
      <div class="legend-item"><span class="legend-box" style="background:#047857;"></span><span>จุดเริ่มต้น/สิ้นสุด (Terminal)</span></div>
      <div class="legend-item"><span class="legend-box" style="background:#ffffff;border:1.5px solid #0284c7;"></span><span>ขั้นตอนการทำงาน (Process)</span></div>
      <div class="legend-item"><span class="legend-box" style="background:#fef3c7;border:1.5px solid #d97706;"></span><span>จุดตัดสินใจเงื่อนไข (Decision)</span></div>
      <div class="legend-item"><span class="legend-box" style="background:#eff6ff;border:1.5px solid #2563eb;"></span><span>การรับ-แสดงข้อมูล (Input/Output)</span></div>
      <div class="legend-item"><span class="legend-box" style="background:#f0fdf4;border:1.5px solid #16a34a;"></span><span>สำเร็จ/อนุมัติ (Approved)</span></div>
      <div class="legend-item"><span class="legend-box" style="background:#fef2f2;border:1.5px solid #dc2626;"></span><span>ไม่อนุมัติ/ข้อผิดพลาด (Rejected)</span></div>
    </div>
  </div>
  <div class="mermaid">
    ${fc.mermaid}
  </div>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'basis'
      }
    });
  </script>
</body>
</html>`;
}

async function renderFlowcharts() {
  console.log('Starting Puppeteer with Edge...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 2000, deviceScaleFactor: 2 });

  for (const fc of flowcharts) {
    console.log(`Rendering ${fc.id}...`);
    const htmlContent = generateHtmlPage(fc);
    const htmlPath = path.join(FLOWCHART_DIR, `${fc.id}.html`);
    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');

    await page.goto(`file:///${htmlPath.replace(/\\\\/g, '/')}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.mermaid svg');

    // Extract pure SVG
    const svgContent = await page.$eval('.mermaid svg', el => el.outerHTML);
    const svgPath = path.join(FLOWCHART_DIR, `${fc.id}.svg`);
    fs.writeFileSync(svgPath, svgContent, 'utf-8');

    // Screenshot PNG
    const pngPath = path.join(FLOWCHART_DIR, `${fc.id}.png`);
    const container = await page.$('body');
    if (container) {
      await container.screenshot({ path: pngPath });
    }
    console.log(`Saved SVG and PNG for ${fc.id}`);
  }

  await browser.close();
  console.log('All flowcharts rendered successfully!');
}

renderFlowcharts().catch(err => {
  console.error('Error rendering flowcharts:', err);
  process.exit(1);
});
