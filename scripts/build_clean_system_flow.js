const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT_DIR = 'd:\\LAB-system';
const SVG_PATH = path.join(ROOT_DIR, 'SYSTEM_FLOW_DIAGRAM.svg');
const PNG_PATH = path.join(ROOT_DIR, 'SYSTEM_FLOW_DIAGRAM.png');
const PDF_PATH = path.join(ROOT_DIR, 'SYSTEM_FLOW_DIAGRAM.pdf');
const HTML_PATH = path.join(ROOT_DIR, 'SYSTEM_FLOW_VIEWER.html');

// Create high-definition standalone SVG
function buildSVG() {
  const width = 1600;
  const height = 1320;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background:#F8FAFC; font-family:'Leelawadee UI', 'Sarabun', 'Tahoma', sans-serif;">
  <defs>
    <linearGradient id="gradHeader" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F766E"/>
      <stop offset="100%" stop-color="#0E7490"/>
    </linearGradient>

    <!-- Card Gradients -->
    <linearGradient id="gradTier1" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F0FDF4"/>
    </linearGradient>
    <linearGradient id="gradTier2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#EFF6FF"/>
    </linearGradient>
    <linearGradient id="gradTier3" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#FFFBEB"/>
    </linearGradient>
    <linearGradient id="gradTier4" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#FAF5FF"/>
    </linearGradient>

    <!-- Drop Shadows -->
    <filter id="shadowCard" x="-5%" y="-5%" width="110%" height="115%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0F172A" flood-opacity="0.06"/>
    </filter>
    <filter id="shadowHeader" x="-2%" y="-5%" width="104%" height="120%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#0F766E" flood-opacity="0.25"/>
    </filter>

    <!-- Arrow Marker -->
    <marker id="arrowTeal" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0F766E"/>
    </marker>
    <marker id="arrowBlue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#2563EB"/>
    </marker>
    <marker id="arrowAmber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#D97706"/>
    </marker>
    <marker id="arrowPurple" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#7C3AED"/>
    </marker>
    <marker id="arrowGray" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748B"/>
    </marker>
  </defs>

  <!-- ========================================================================= -->
  <!-- HEADER BANNER -->
  <!-- ========================================================================= -->
  <rect x="50" y="35" width="1500" height="110" rx="16" fill="url(#gradHeader)" filter="url(#shadowHeader)"/>
  <text x="80" y="80" fill="#CCFBF1" font-size="15" font-weight="600" letter-spacing="0.5">คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์ • KASETSART UNIVERSITY FACULTY OF NURSING</text>
  <text x="80" y="118" fill="#FFFFFF" font-size="25" font-weight="700">แผนภาพแสดงความเชื่อมโยงการไหลเวียนข้อมูลและกระบวนการทำงานทั้งระบบ (System Flow Diagram)</text>
  <rect x="1270" y="65" width="250" height="48" rx="8" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
  <text x="1395" y="95" fill="#FFFFFF" font-size="14" font-weight="600" text-anchor="middle">NSS-LAB ARCHITECTURE v2.0</text>

  <!-- ========================================================================= -->
  <!-- STAGE 1: ฐานข้อมูล & คลังพัสดุต้นทาง (FOUNDATION & INVENTORY) -->
  <!-- ========================================================================= -->
  <!-- Stage Container -->
  <rect x="50" y="175" width="1500" height="230" rx="14" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" filter="url(#shadowCard)"/>
  <rect x="50" y="175" width="1500" height="42" rx="14" fill="#ECFDF5"/>
  <rect x="50" y="202" width="1500" height="15" fill="#ECFDF5"/>
  <rect x="68" y="184" width="12" height="24" rx="3" fill="#10B981"/>
  <text x="90" y="202" fill="#065F46" font-size="16" font-weight="700">ส่วนที่ 1: ฐานข้อมูลพัสดุและคลังพัสดุต้นทาง (Inventory &amp; Asset Foundation)</text>
  <text x="1410" y="201" fill="#059669" font-size="13" font-weight="600" text-anchor="end">ERP Integration • Medical Assets 373 Items</text>

  <!-- Card 1A: ERP Sync & Stock-In -->
  <rect x="80" y="235" width="440" height="150" rx="10" fill="url(#gradTier1)" stroke="#10B981" stroke-width="1.8"/>
  <rect x="96" y="248" width="130" height="26" rx="5" fill="#10B981"/>
  <text x="161" y="265" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">1.1 รับเข้าพัสดุ</text>
  <text x="96" y="298" fill="#0F172A" font-size="15" font-weight="700">ฐานข้อมูล ERP &amp; การรับเข้า (Stock-In)</text>
  <text x="96" y="322" fill="#334155" font-size="13">• นำเข้าและซิงค์ข้อมูลพัสดุจริง 373 ชิ้น จากระบบ ERP</text>
  <text x="96" y="342" fill="#334155" font-size="13">• ตรวจสอบและลงทะเบียนเข้าสู่ระบบ Master Items</text>
  <text x="96" y="362" fill="#334155" font-size="13">• กำหนดหน่วยนับหลัก (หน่วยซื้อ) และหน่วยย่อย (หน่วยเบิก)</text>

  <!-- Arrow 1A -> 1B & 1C -->
  <path d="M 520 310 L 560 310" stroke="#10B981" stroke-width="2" marker-end="url(#arrowTeal)"/>

  <!-- Card 1B: Equipment Assets -->
  <rect x="575" y="235" width="445" height="150" rx="10" fill="url(#gradTier1)" stroke="#10B981" stroke-width="1.8"/>
  <rect x="591" y="248" width="150" height="26" rx="5" fill="#059669"/>
  <text x="666" y="265" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">1.2 ทะเบียนครุภัณฑ์</text>
  <text x="591" y="298" fill="#0F172A" font-size="15" font-weight="700">ครุภัณฑ์รายชิ้น &amp; QR Code ประจำเครื่อง</text>
  <text x="591" y="322" fill="#334155" font-size="13">• คุมสินทรัพย์รายชิ้น (EquipmentAsset) พร้อมเลขครุภัณฑ์</text>
  <text x="591" y="342" fill="#334155" font-size="13">• สติกเกอร์ QR Code สแกนดูสเปก คู่มือ และวิดีโอสาธิต</text>
  <text x="591" y="362" fill="#334155" font-size="13">• บันทึกประวัติส่งซ่อมและบำรุงรักษา (Maintenance Logs)</text>

  <!-- Arrow 1B -> 1C -->
  <path d="M 1020 310 L 1060 310" stroke="#10B981" stroke-width="2" marker-end="url(#arrowTeal)"/>

  <!-- Card 1C: Consumables & Lots -->
  <rect x="1075" y="235" width="445" height="150" rx="10" fill="url(#gradTier1)" stroke="#10B981" stroke-width="1.8"/>
  <rect x="1091" y="248" width="160" height="26" rx="5" fill="#047857"/>
  <text x="1171" y="265" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">1.3 คลังเวชภัณฑ์</text>
  <text x="1091" y="298" fill="#0F172A" font-size="15" font-weight="700">วัสดุสิ้นเปลืองรายล็อต (Stock Lots)</text>
  <text x="1091" y="322" fill="#334155" font-size="13">• ควบคุมตาม Lot Number และวันหมดอายุ (Expiry Date)</text>
  <text x="1091" y="342" fill="#334155" font-size="13">• ระบบแจ้งเตือนสต็อกต่ำกว่าเกณฑ์ปลอดภัย (Min Stock)</text>
  <text x="1091" y="362" fill="#334155" font-size="13">• พร้อมส่งต่อไปยังขั้นตอนแบ่งบรรจุปลอดเชื้อ</text>

  <!-- Flow Connector Down: Stage 1 -> Stage 2 -->
  <path d="M 800 405 L 800 440" stroke="#0F766E" stroke-width="2.5" marker-end="url(#arrowTeal)"/>
  <rect x="730" y="413" width="140" height="22" rx="4" fill="#0F766E"/>
  <text x="800" y="428" fill="#FFFFFF" font-size="11.5" font-weight="700" text-anchor="middle">จ่ายเข้าสู่การจัดเตรียม ↓</text>

  <!-- ========================================================================= -->
  <!-- STAGE 2: การเตรียมการสอน & จัดชุด (PREPARATION & ACADEMIC SETUP) -->
  <!-- ========================================================================= -->
  <rect x="50" y="445" width="1500" height="230" rx="14" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" filter="url(#shadowCard)"/>
  <rect x="50" y="445" width="1500" height="42" rx="14" fill="#EFF6FF"/>
  <rect x="50" y="472" width="1500" height="15" fill="#EFF6FF"/>
  <rect x="68" y="454" width="12" height="24" rx="3" fill="#2563EB"/>
  <text x="90" y="472" fill="#1E40AF" font-size="16" font-weight="700">ส่วนที่ 2: การเตรียมการสอนและจัดสรรทรัพยากรห้องแล็บ (Preparation &amp; Academic Setup)</text>
  <text x="1410" y="471" fill="#2563EB" font-size="13" font-weight="600" text-anchor="end">Repack System • Standard Kits • Course Budget</text>

  <!-- Card 2A: Repack System -->
  <rect x="80" y="505" width="440" height="150" rx="10" fill="url(#gradTier2)" stroke="#2563EB" stroke-width="1.8"/>
  <rect x="96" y="518" width="170" height="26" rx="5" fill="#2563EB"/>
  <text x="181" y="535" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">2.1 ระบบแบ่งบรรจุ</text>
  <text x="96" y="568" fill="#0F172A" font-size="15" font-weight="700">แบ่งบรรจุสเตอร์ไรด์ (Repackaging)</text>
  <text x="96" y="592" fill="#334155" font-size="13">• เบิกตัดยอดกล่องใหญ่มาแบ่งบรรจุเป็นซองย่อยปลอดเชื้อ</text>
  <text x="96" y="612" fill="#334155" font-size="13">• กำหนดรหัสบาร์โค้ดประจำซองและวันหมดอายุซองย่อย</text>
  <text x="96" y="632" fill="#334155" font-size="13">• เช่น สำลีสเตอร์ไรด์, ผ้าก๊อซแพ็ค 10 ชิ้น, เซ็ตทำแผลย่อย</text>

  <!-- Arrow 2A -> 2B -->
  <path d="M 520 580 L 560 580" stroke="#2563EB" stroke-width="2" marker-end="url(#arrowBlue)"/>

  <!-- Card 2B: Practice Kits Library -->
  <rect x="575" y="505" width="445" height="150" rx="10" fill="url(#gradTier2)" stroke="#2563EB" stroke-width="1.8"/>
  <rect x="591" y="518" width="180" height="26" rx="5" fill="#1D4ED8"/>
  <text x="681" y="535" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">2.2 ชุดฝึกปฏิบัติการ</text>
  <text x="591" y="568" fill="#0F172A" font-size="15" font-weight="700">ชุดฝึกมาตรฐานวิชาชีพ (Practice Kits)</text>
  <text x="591" y="592" fill="#334155" font-size="13">• รวบรวมหุ่นฝึก + ครุภัณฑ์ + เวชภัณฑ์ เข้าเป็นชุดสำเร็จรูป</text>
  <text x="591" y="612" fill="#334155" font-size="13">• เช่น ชุดทำแผล (Dressing), สวนปัสสาวะ (Foley), ทำคลอด, CPR</text>
  <text x="591" y="632" fill="#334155" font-size="13">• นิสิตและอาจารย์สามารถขอใช้งานได้ใน 1 คลิก (One-Click)</text>

  <!-- Arrow 2B -> 2C -->
  <path d="M 1020 580 L 1060 580" stroke="#2563EB" stroke-width="2" marker-end="url(#arrowBlue)"/>

  <!-- Card 2C: Courses & Timetable Slots -->
  <rect x="1075" y="505" width="445" height="150" rx="10" fill="url(#gradTier2)" stroke="#2563EB" stroke-width="1.8"/>
  <rect x="1091" y="518" width="190" height="26" rx="5" fill="#1E40AF"/>
  <text x="1186" y="535" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">2.3 รายวิชา &amp; ตารางห้อง</text>
  <text x="1091" y="568" fill="#0F172A" font-size="15" font-weight="700">หลักสูตร &amp; ตารางเวลา (Timetable Slots)</text>
  <text x="1091" y="592" fill="#334155" font-size="13">• อาจารย์เปิดรายวิชา ระบุผู้ประสานงาน และเพดานงบประมาณ</text>
  <text x="1091" y="612" fill="#334155" font-size="13">• เปิดตารางเวลาห้องแล็บ 3 ห้อง (เช้า / บ่าย / เย็น)</text>
  <text x="1091" y="632" fill="#334155" font-size="13">• จัดสรรรอบซ้อมอิสระ ป้องกันการจองชนกัน 100%</text>

  <!-- Flow Connector Down: Stage 2 -> Stage 3 -->
  <path d="M 800 675 L 800 710" stroke="#2563EB" stroke-width="2.5" marker-end="url(#arrowBlue)"/>
  <rect x="720" y="683" width="160" height="22" rx="4" fill="#2563EB"/>
  <text x="800" y="698" fill="#FFFFFF" font-size="11.5" font-weight="700" text-anchor="middle">ส่งต่อไปยังระบบคำขอรวม ↓</text>

  <!-- ========================================================================= -->
  <!-- STAGE 3: ระบบคำขอรวม & การอนุมัติ (UNIFIED REQUEST & APPROVAL) -->
  <!-- ========================================================================= -->
  <rect x="50" y="715" width="1500" height="230" rx="14" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" filter="url(#shadowCard)"/>
  <rect x="50" y="715" width="1500" height="42" rx="14" fill="#FFFBEB"/>
  <rect x="50" y="742" width="1500" height="15" fill="#FFFBEB"/>
  <rect x="68" y="724" width="12" height="24" rx="3" fill="#D97706"/>
  <text x="90" y="742" fill="#92400E" font-size="16" font-weight="700">ส่วนที่ 3: ระบบคำขอรวมแบบเบ็ดเสร็จและสายการอนุมัติ (Unified Request &amp; Approval Chain)</text>
  <text x="1410" y="741" fill="#D97706" font-size="13" font-weight="600" text-anchor="end">One-Stop Modal • Real-time Stock Guard • Digital Approval</text>

  <!-- Card 3A: Unified Request Modal -->
  <rect x="80" y="775" width="440" height="150" rx="10" fill="url(#gradTier3)" stroke="#D97706" stroke-width="1.8"/>
  <rect x="96" y="788" width="160" height="26" rx="5" fill="#D97706"/>
  <text x="176" y="805" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">3.1 แบบฟอร์มรวม</text>
  <text x="96" y="838" fill="#0F172A" font-size="15" font-weight="700">One-Stop Unified Request</text>
  <text x="96" y="862" fill="#334155" font-size="13">• รวมคำขอยืมหุ่น + เบิกวัสดุ + จองห้อง ในหน้าต่างเดียว</text>
  <text x="96" y="882" fill="#334155" font-size="13">• นิสิตเลือกรายวิชา อาจารย์ผู้รับทราบ และวันเวลาที่ต้องการ</text>
  <text x="96" y="902" fill="#334155" font-size="13">• ระบบออกรหัสคำขอ REQ-... เข้าคิวรอพิจารณา</text>

  <!-- Arrow 3A -> 3B -->
  <path d="M 520 850 L 560 850" stroke="#D97706" stroke-width="2" marker-end="url(#arrowAmber)"/>

  <!-- Card 3B: Real-time Stock Guard -->
  <rect x="575" y="775" width="445" height="150" rx="10" fill="url(#gradTier3)" stroke="#D97706" stroke-width="1.8"/>
  <rect x="591" y="788" width="180" height="26" rx="5" fill="#B45309"/>
  <text x="681" y="805" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">3.2 ตรวจสอบสต็อก</text>
  <text x="591" y="838" fill="#0F172A" font-size="15" font-weight="700">Real-time Stock Guard</text>
  <text x="591" y="862" fill="#334155" font-size="13">• ตรวจสอบสต็อกคงเหลือจริงทันทีขณะพิมพ์จำนวน</text>
  <text x="591" y="882" fill="#334155" font-size="13">• แจ้งเตือนสีแดงและบล็อกการส่งคำขอหากยอดเบิกเกินคลัง</text>
  <text x="591" y="902" fill="#334155" font-size="13">• ป้องกันสต็อกติดลบและการแย่งอุปกรณ์ซ้ำซ้อน 100%</text>

  <!-- Arrow 3B -> 3C -->
  <path d="M 1020 850 L 1060 850" stroke="#D97706" stroke-width="2" marker-end="url(#arrowAmber)"/>

  <!-- Card 3C: Approval & Handover -->
  <rect x="1075" y="775" width="445" height="150" rx="10" fill="url(#gradTier3)" stroke="#D97706" stroke-width="1.8"/>
  <rect x="1091" y="788" width="170" height="26" rx="5" fill="#92400E"/>
  <text x="1176" y="805" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">3.3 อนุมัติ &amp; ส่งมอบ</text>
  <text x="1091" y="838" fill="#0F172A" font-size="15" font-weight="700">การอนุมัติและส่งมอบ (Dispense)</text>
  <text x="1091" y="862" fill="#334155" font-size="13">• อาจารย์ตรวจสอบวัตถุประสงค์และกดยืนยันอนุมัติ</text>
  <text x="1091" y="882" fill="#334155" font-size="13">• เจ้าหน้าที่จัดเตรียมอุปกรณ์และส่งมอบแก่นิสิตที่เคาน์เตอร์</text>
  <text x="1091" y="902" fill="#334155" font-size="13">• ตัดสต็อกคลังทันที และปรับสถานะเป็น 'กำลังยืม (Borrowed)'</text>

  <!-- Flow Connector Down: Stage 3 -> Stage 4 -->
  <path d="M 800 945 L 800 980" stroke="#D97706" stroke-width="2.5" marker-end="url(#arrowAmber)"/>
  <rect x="715" y="953" width="170" height="22" rx="4" fill="#D97706"/>
  <text x="800" y="968" fill="#FFFFFF" font-size="11.5" font-weight="700" text-anchor="middle">เสร็จสิ้นการฝึกปฏิบัติ ↓</text>

  <!-- ========================================================================= -->
  <!-- STAGE 4: การส่งคืน ตรวจสภาพ & วิเคราะห์ต้นทุน (RETURN & ANALYTICS) -->
  <!-- ========================================================================= -->
  <rect x="50" y="985" width="1500" height="230" rx="14" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" filter="url(#shadowCard)"/>
  <rect x="50" y="985" width="1500" height="42" rx="14" fill="#FAF5FF"/>
  <rect x="50" y="1012" width="1500" height="15" fill="#FAF5FF"/>
  <rect x="68" y="994" width="12" height="24" rx="3" fill="#8B5CF6"/>
  <text x="90" y="1012" fill="#6B21A8" font-size="16" font-weight="700">ส่วนที่ 4: การส่งคืน ตรวจรับสภาพ และการวิเคราะห์บริหารจัดการ (Return &amp; Executive Analytics)</text>
  <text x="1410" y="1011" fill="#7C3AED" font-size="13" font-weight="600" text-anchor="end">Inspection • QR Check-in • Cost Analytics • Reports</text>

  <!-- Card 4A: Return & Inspection -->
  <rect x="80" y="1045" width="440" height="150" rx="10" fill="url(#gradTier4)" stroke="#8B5CF6" stroke-width="1.8"/>
  <rect x="96" y="1058" width="160" height="26" rx="5" fill="#8B5CF6"/>
  <text x="176" y="1075" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">4.1 ตรวจรับคืน</text>
  <text x="96" y="1108" fill="#0F172A" font-size="15" font-weight="700">การส่งคืนและตรวจสภาพ (Inspection)</text>
  <text x="96" y="1132" fill="#334155" font-size="13">• นิสิตทำความสะอาดและนำส่งคืนก่อน 16:30 น.</text>
  <text x="96" y="1152" fill="#334155" font-size="13">• สภาพสมบูรณ์: คืนเข้าสต็อกพร้อมใช้ (Available)</text>
  <text x="96" y="1172" fill="#334155" font-size="13">• ชำรุด/สูญหาย: บันทึกส่งซ่อม (Under Repair) ทันที</text>

  <!-- Arrow 4A -> 4B -->
  <path d="M 520 1120 L 560 1120" stroke="#8B5CF6" stroke-width="2" marker-end="url(#arrowPurple)"/>

  <!-- Card 4B: QR Check-in & Practice Hours -->
  <rect x="575" y="1045" width="445" height="150" rx="10" fill="url(#gradTier4)" stroke="#8B5CF6" stroke-width="1.8"/>
  <rect x="591" y="1058" width="180" height="26" rx="5" fill="#7C3AED"/>
  <text x="681" y="1075" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">4.2 สแกนเช็คอิน</text>
  <text x="591" y="1108" fill="#0F172A" font-size="15" font-weight="700">Dynamic QR Check-in &amp; Hours</text>
  <text x="591" y="1132" fill="#334155" font-size="13">• แสดงบัตร QR Pass สแกนหน้าห้องก่อนเข้าฝึกซ้อม</text>
  <text x="591" y="1152" fill="#334155" font-size="13">• บันทึกเวลาเข้าฝึกจริงและป้องกันการสวมสิทธิ์</text>
  <text x="591" y="1172" fill="#334155" font-size="13">• คำนวณชั่วโมงฝึกสะสมลงในประวัติรายบุคคล</text>

  <!-- Arrow 4B -> 4C -->
  <path d="M 1020 1120 L 1060 1120" stroke="#8B5CF6" stroke-width="2" marker-end="url(#arrowPurple)"/>

  <!-- Card 4C: Cost Analytics & Reports -->
  <rect x="1075" y="1045" width="445" height="150" rx="10" fill="url(#gradTier4)" stroke="#8B5CF6" stroke-width="1.8"/>
  <rect x="1091" y="1058" width="170" height="26" rx="5" fill="#6D28D9"/>
  <text x="1176" y="1075" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">4.3 รายงานบริหาร</text>
  <text x="1091" y="1108" fill="#0F172A" font-size="15" font-weight="700">การวิเคราะห์ต้นทุน &amp; รายงาน (Reports)</text>
  <text x="1091" y="1132" fill="#334155" font-size="13">• คำนวณต้นทุนการใช้วัสดุผูกตรงเข้ากับรหัสรายวิชา</text>
  <text x="1091" y="1152" fill="#334155" font-size="13">• เปรียบเทียบงบประมาณจัดสรร vs ใช้งานจริง Real-time</text>
  <text x="1091" y="1172" fill="#334155" font-size="13">• รายงานสรุปอัตราการใช้ห้องและครุภัณฑ์สำหรับผู้บริหาร</text>

  <!-- FOOTER NOTE -->
  <text x="800" y="1260" fill="#64748B" font-size="13.5" font-weight="600" text-anchor="middle">คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์ • ระบบบริหารจัดการห้องปฏิบัติการทักษะและสถานการณ์จำลองทางการพยาบาล (NSS-LAB)</text>
  <text x="800" y="1285" fill="#94A3B8" font-size="12" text-anchor="middle">End-to-End Operational Pipeline &amp; Data Synchronization Architecture</text>
</svg>`;
}

// Create the interactive HTML wrapper
function buildHTML(svgContent) {
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>แผนภาพความเชื่อมโยงทั้งระบบ (System Flow Diagram) - NSS-LAB</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #0F766E;
      --primary-dark: #115E59;
      --secondary: #0E7490;
      --slate-dark: #0F172A;
      --slate-muted: #475569;
      --bg-page: #F1F5F9;
      --bg-card: #FFFFFF;
      --border-color: #CBD5E1;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Sarabun', 'Leelawadee UI', Tahoma, sans-serif;
      background-color: var(--bg-page);
      color: var(--slate-dark);
      padding: 24px;
      line-height: 1.6;
    }
    .container {
      max-width: 1650px;
      margin: 0 auto;
    }
    header {
      background: linear-gradient(135deg, #0F766E 0%, #0E7490 100%);
      color: white;
      padding: 28px 36px;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(15, 118, 110, 0.25);
      margin-bottom: 20px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }
    .header-content h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .header-content p {
      font-size: 14.5px;
      color: #CCFBF1;
    }
    .action-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
      border: none;
    }
    .btn-white {
      background-color: #FFFFFF;
      color: var(--primary);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .btn-white:hover {
      background-color: #F0FDFA;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
    }
    .btn-outline {
      background-color: rgba(255, 255, 255, 0.15);
      color: #FFFFFF;
      border: 1px solid rgba(255, 255, 255, 0.4);
    }
    .btn-outline:hover {
      background-color: rgba(255, 255, 255, 0.25);
      transform: translateY(-2px);
    }
    .diagram-card {
      background: var(--bg-card);
      border-radius: 16px;
      padding: 24px;
      border: 1px solid var(--border-color);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      margin-bottom: 24px;
    }
    .diagram-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color);
    }
    .diagram-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--primary);
    }
    .zoom-controls {
      display: flex;
      gap: 8px;
    }
    .zoom-btn {
      padding: 6px 14px;
      border: 1px solid var(--border-color);
      background: #F8FAFC;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      color: var(--slate-dark);
      transition: all 0.2s ease;
    }
    .zoom-btn:hover { background: #E2E8F0; }
    .svg-viewport {
      width: 100%;
      overflow: auto;
      border-radius: 10px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 10px;
      text-align: center;
    }
    #svg-wrapper {
      display: inline-block;
      transition: transform 0.2s ease;
      transform-origin: top center;
      width: 100%;
      max-width: 1600px;
    }
    #svg-wrapper svg {
      width: 100%;
      height: auto;
      display: block;
    }
    footer {
      text-align: center;
      margin-top: 30px;
      padding: 20px;
      color: #94A3B8;
      font-size: 14px;
    }
    @media print {
      body { background: white; padding: 0; }
      header, .zoom-controls, .action-buttons, footer { display: none; }
      .diagram-card { border: none; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-content">
        <h1>แผนภาพแสดงความเชื่อมโยงการไหลเวียนข้อมูลและกระบวนการทำงานทั้งระบบ</h1>
        <p>คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์ • Nursing Skills & Simulation Lab System (NSS-LAB)</p>
      </div>
      <div class="action-buttons">
        <a href="./SYSTEM_FLOW_DIAGRAM.png" download="NSS_Lab_System_Flow_Diagram.png" class="btn btn-white">💾 ดาวน์โหลดภาพ PNG</a>
        <a href="./SYSTEM_FLOW_DIAGRAM.svg" download="NSS_Lab_System_Flow_Diagram.svg" class="btn btn-outline">📐 ดาวน์โหลดไฟล์ SVG</a>
        <a href="./SYSTEM_FLOW_DIAGRAM.pdf" download="NSS_Lab_System_Flow_Diagram.pdf" class="btn btn-outline">📄 ดาวน์โหลด PDF</a>
        <button class="btn btn-outline" onclick="window.print()">🖨️ พิมพ์เอกสาร</button>
      </div>
    </header>

    <div class="diagram-card">
      <div class="diagram-toolbar">
        <div class="diagram-title">🌐 แผนผังกระบวนการทำงาน 4 ลำดับขั้นแบบบูรณาการ (End-to-End Operational Pipeline)</div>
        <div class="zoom-controls">
          <button class="zoom-btn" onclick="zoomIn()">🔍 ซูมเข้า (+)</button>
          <button class="zoom-btn" onclick="zoomOut()">🔍 ซูมออก (-)</button>
          <button class="zoom-btn" onclick="resetZoom()">↺ รีเซ็ตขนาด</button>
        </div>
      </div>

      <div class="svg-viewport">
        <div id="svg-wrapper">
          ${svgContent}
        </div>
      </div>
    </div>

    <footer>
      คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์ • ระบบบริหารจัดการห้องปฏิบัติการทักษะและสถานการณ์จำลองทางการพยาบาล (NSS-LAB)
    </footer>
  </div>

  <script>
    let currentScale = 1;
    const wrapper = document.getElementById('svg-wrapper');
    function zoomIn() {
      currentScale += 0.15;
      wrapper.style.transform = 'scale(' + currentScale + ')';
    }
    function zoomOut() {
      if (currentScale > 0.5) {
        currentScale -= 0.15;
        wrapper.style.transform = 'scale(' + currentScale + ')';
      }
    }
    function resetZoom() {
      currentScale = 1;
      wrapper.style.transform = 'scale(1)';
    }
  </script>
</body>
</html>`;
}

async function run() {
  console.log('1. Building clean, structured SVG diagram...');
  const svg = buildSVG();
  fs.writeFileSync(SVG_PATH, svg, 'utf8');
  console.log('Saved SVG:', SVG_PATH);

  console.log('2. Building interactive HTML Viewer...');
  const html = buildHTML(svg);
  fs.writeFileSync(HTML_PATH, html, 'utf8');
  console.log('Saved HTML:', HTML_PATH);

  console.log('3. Rendering High-Resolution PNG & Landscape A3 PDF via Edge...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1700, height: 1400, deviceScaleFactor: 2.5 });
  await page.goto('file:///' + HTML_PATH.replace(/\\\\/g, '/'), { waitUntil: 'networkidle0' });

  // Wait for svg-wrapper
  await page.waitForSelector('#svg-wrapper svg', { timeout: 10000 });

  // Screenshot pure diagram
  const svgHandle = await page.$('#svg-wrapper svg');
  if (svgHandle) {
    await svgHandle.screenshot({
      path: PNG_PATH,
      type: 'png'
    });
    console.log('Saved High-Res Clean PNG:', PNG_PATH);
  }

  // Print PDF
  await page.pdf({
    path: PDF_PATH,
    format: 'A3',
    landscape: true,
    printBackground: true,
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
  });
  console.log('Saved Clean Landscape PDF:', PDF_PATH);

  await browser.close();
  console.log('ALL ARTIFACTS GENERATED CLEANLY!');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
