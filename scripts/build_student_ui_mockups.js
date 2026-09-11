const fs = require('fs');
const path = require('path');
const puppeteer = require('d:/LAB-system/node_modules/puppeteer-core');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const IMAGES_DIR = path.join('d:', 'LAB-system', 'manual', 'images');

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

const mockups = [
  {
    id: 'ui_mockup_login',
    title: 'Student Login Screen',
    width: 900,
    height: 650,
    html: `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Prompt:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Sarabun', sans-serif; }
    body {
      background: linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 50%, #f8fafc 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }
    .card {
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 20px 40px -15px rgba(13, 148, 136, 0.15), 0 0 1px 1px rgba(0,0,0,0.05);
      width: 100%;
      max-width: 440px;
      padding: 36px 32px;
      border: 1px solid #ccfbf1;
    }
    .header { text-align: center; margin-bottom: 24px; }
    .logo-badge {
      width: 68px; height: 68px;
      background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
      border-radius: 20px;
      display: inline-flex; align-items: center; justify-content: center;
      box-shadow: 0 10px 20px -5px rgba(13, 148, 136, 0.4);
      margin-bottom: 14px; color: white; font-size: 32px;
    }
    .title { font-family: 'Prompt', sans-serif; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3; }
    .subtitle { font-size: 13px; color: #0d9488; font-weight: 600; margin-top: 4px; }
    .desc { font-size: 12px; color: #64748b; margin-top: 2px; }
    .persona-box {
      background: #f0fdfa; border: 1px dashed #5eead4; border-radius: 12px;
      padding: 10px 14px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;
    }
    .persona-avatar {
      width: 38px; height: 38px; background: #0d9488; color: white; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;
    }
    .persona-info { font-size: 11.5px; color: #134e4a; line-height: 1.4; }
    .persona-name { font-weight: 700; color: #042f2e; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; }
    input {
      width: 100%; padding: 12px 14px; border: 1.5px solid #cbd5e1; border-radius: 12px;
      font-size: 13px; color: #0f172a; background: #f8fafc; outline: none;
    }
    input:focus { border-color: #0d9488; background: #ffffff; box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15); }
    .btn-login {
      width: 100%; padding: 12px; background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
      color: white; border: none; border-radius: 12px; font-family: 'Prompt', sans-serif;
      font-size: 14px; font-weight: 600; cursor: pointer;
      box-shadow: 0 10px 20px -5px rgba(13, 148, 136, 0.4); margin-top: 8px;
    }
    .footer-note { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 18px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo-badge">🩺</div>
      <h1 class="title">ระบบห้องปฏิบัติการพยาบาลศาสตร์</h1>
      <div class="subtitle">Smart Nursing Lab Management System</div>
      <div class="desc">คณะพยาบาลศาสตร์ มหาวิทยาลัย</div>
    </div>
    <div class="persona-box">
      <div class="persona-avatar">NJ</div>
      <div class="persona-info">
        <div>ข้อมูลนิสิตจำลองสำหรับคู่มือ:</div>
        <div class="persona-name">น.ส. นภัสสร ใจดี (รหัส 66010023)</div>
        <div>หลักสูตรพยาบาลศาสตรบัณฑิต (ชั้นปีที่ 2)</div>
      </div>
    </div>
    <div class="form-group">
      <label>รหัสนิสิต (Student ID) / บัญชีผู้ใช้</label>
      <input type="text" value="66010023" readonly>
    </div>
    <div class="form-group">
      <label>รหัสผ่าน (Password)</label>
      <input type="password" value="••••••••••••" readonly>
    </div>
    <button class="btn-login">เข้าสู่ระบบ (Sign In)</button>
    <div class="footer-note">* ใช้อีเมลมหาวิทยาลัย (@nu.ac.th) หรือรหัสนิสิตเพื่อเข้าใช้งาน</div>
  </div>
</body>
</html>`
  },
  {
    id: 'ui_mockup_unified_request',
    title: 'One-Stop Unified Request Modal',
    width: 960,
    height: 840,
    html: `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Prompt:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Sarabun', sans-serif; }
    body { background: #f1f5f9; padding: 24px; display: flex; justify-content: center; }
    .modal {
      background: #ffffff; width: 100%; max-width: 860px; border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; overflow: hidden;
    }
    .modal-header {
      background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
      color: white; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center;
    }
    .modal-title { font-family: 'Prompt', sans-serif; font-size: 18px; font-weight: 700; }
    .modal-subtitle { font-size: 12px; opacity: 0.9; margin-top: 2px; }
    .badge-onestop {
      background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3);
      padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
    }
    .modal-body { padding: 24px; }
    .section-title {
      font-family: 'Prompt', sans-serif; font-size: 13px; font-weight: 700; color: #0f766e;
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; display: flex;
      align-items: center; gap: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;
    }
    .toggle-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
    .toggle-card {
      border: 2px solid #e2e8f0; border-radius: 14px; padding: 12px 14px;
      display: flex; gap: 12px; align-items: flex-start; background: #f8fafc;
    }
    .toggle-card.active-sim {
      border-color: #0d9488; background: #f0fdfa; box-shadow: 0 4px 12px -2px rgba(13, 148, 136, 0.15);
    }
    .toggle-card.inactive-human { border-color: #fecdd3; background: #fff1f2; opacity: 0.75; }
    .toggle-icon { font-size: 24px; }
    .toggle-content h4 { font-size: 12.5px; font-weight: 700; color: #0f172a; }
    .toggle-content p { font-size: 11px; color: #64748b; margin-top: 2px; line-height: 1.3; }
    .sim-tag { background: #ccfbf1; color: #0f766e; font-size: 10px; padding: 2px 6px; border-radius: 6px; font-weight: 700; display: inline-block; margin-left: 6px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
    .field label { display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 5px; }
    .field input, .field select, .field textarea {
      width: 100%; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 10px;
      font-size: 12px; background: #ffffff; color: #1e293b;
    }
    .auto-fill-bar {
      grid-column: span 2; background: #f0fdfa; border: 1px solid #99f6e4;
      border-radius: 10px; padding: 8px 12px; display: flex; justify-content: space-between;
      align-items: center; font-size: 11.5px; color: #0f766e;
    }
    .table-container { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; }
    td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    .badge-item-type { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }
    .type-eq { background: #dbeafe; color: #1e40af; }
    .type-con { background: #ffedd5; color: #9a3412; }
    .modal-footer {
      display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px;
      padding-top: 14px; border-top: 1px solid #e2e8f0;
    }
    .btn-cancel {
      padding: 9px 18px; border-radius: 10px; border: 1px solid #cbd5e1;
      background: #ffffff; color: #64748b; font-size: 12.5px; font-weight: 600;
    }
    .btn-submit {
      padding: 9px 22px; border-radius: 10px; border: none; background: #0d9488;
      color: white; font-size: 12.5px; font-weight: 700; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
    }
  </style>
</head>
<body>
  <div class="modal">
    <div class="modal-header">
      <div>
        <div class="modal-title">📑 ฟอร์มสร้างคำขอยืม-เบิกพัสดุและครุภัณฑ์ One-Stop</div>
        <div class="modal-subtitle">คณะพยาบาลศาสตร์ มหาวิทยาลัย (ผู้ยื่น: น.ส. นภัสสร ใจดี - รหัส 66010023)</div>
      </div>
      <div class="badge-onestop">One-Stop Requisition</div>
    </div>

    <div class="modal-body">
      <div class="section-title">1. วัตถุประสงค์การใช้งาน (Use Target & Safety Lock)</div>
      <div class="toggle-grid">
        <div class="toggle-card active-sim">
          <div class="toggle-icon">🧪</div>
          <div class="toggle-content">
            <h4>ฝึกปฏิบัติการกับหุ่นจำลอง <span class="sim-tag">Sim-Lab (แนะนำ)</span></h4>
            <p>สำหรับซ้อมในห้องปฏิบัติการ อนุญาตให้ใช้เวชภัณฑ์หมดอายุได้เพื่อประหยัดงบประมาณ</p>
          </div>
        </div>

        <div class="toggle-card inactive-human">
          <div class="toggle-icon">🧑‍⚕️</div>
          <div class="toggle-content">
            <h4 style="color: #9f1239;">ใช้งานกับคนจริง / คลินิก (Clinical Patient)</h4>
            <p style="color: #be123c;">สำหรับผู้ป่วยจริง มีระบบล็อคความปลอดภัย (บล็อกล็อตหมดอายุ 100%)</p>
          </div>
        </div>
      </div>

      <div class="section-title">2. ข้อมูลรายวิชาและวันเวลานัดหมาย</div>
      <div class="form-row">
        <div class="field">
          <label>รายวิชาทางการพยาบาล *</label>
          <input type="text" value="NS201 การพยาบาลพื้นฐาน (Fundamental of Nursing)" readonly>
        </div>
        <div class="field">
          <label>อาจารย์ผู้รับผิดชอบรายวิชา / ที่ปรึกษา *</label>
          <input type="text" value="ผศ.ดร.พิมพา สุขเกษม (ภาควิชาการพยาบาลพื้นฐาน)" readonly>
        </div>
        <div class="auto-fill-bar">
          <span>🎓 <b>ระบบค้นหาอัตโนมัติ:</b> ตรวจพบรายวิชา NS201 กำหนดอาจารย์ผู้สอนให้อัตโนมัติ</span>
          <span style="background: white; border: 1px solid #5eead4; padding: 2px 8px; border-radius: 6px; font-weight: bold;">✓ ตรวจสอบแล้ว</span>
        </div>
      </div>

      <div class="form-row">
        <div class="field">
          <label>วัน-เวลาที่ต้องการรับของ *</label>
          <input type="text" value="12 ก.ย. 2569 เวลา 09:00 น." readonly>
        </div>
        <div class="field">
          <label>กำหนดวันส่งคืนครุภัณฑ์ *</label>
          <input type="text" value="12 ก.ย. 2569 เวลา 16:30 น." readonly>
        </div>
      </div>

      <div class="section-title">3. รายการพัสดุและครุภัณฑ์ที่ต้องการขอรับ</div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width: 15%;">ประเภท</th>
              <th>ชื่อรายการอุปกรณ์ / เวชภัณฑ์</th>
              <th style="width: 15%;">จำนวนขอ</th>
              <th style="width: 25%;">ล็อต / หมายเหตุความปลอดภัย</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="badge-item-type type-eq">ยืมครุภัณฑ์</span></td>
              <td><b>หุ่นฝึกทำแผลจำลองเสมือนจริง (Adult Wound Care Manikin)</b></td>
              <td>1 ตัว</td>
              <td>พร้อมกล่องใส่อุปกรณ์ครบชุด</td>
            </tr>
            <tr>
              <td><span class="badge-item-type type-eq">ยืมครุภัณฑ์</span></td>
              <td><b>เครื่องวัดความดันโลหิตแบบดิจิทัล (Digital Sphygmomanometer)</b></td>
              <td>1 เครื่อง</td>
              <td>ผ่านการสอบเทียบมาตรฐาน</td>
            </tr>
            <tr>
              <td><span class="badge-item-type type-con">เบิกสิ้นเปลือง</span></td>
              <td><b>ถุงมือยางสังเคราะห์ตรวจโรค ไซส์ M (Nitrile Gloves M)</b></td>
              <td>2 คู่</td>
              <td>จัดสรรจากสต็อกฝึกแล็บ</td>
            </tr>
            <tr>
              <td><span class="badge-item-type type-con">เบิกสิ้นเปลือง</span></td>
              <td><b>ผ้ากอซสเตอไรล์ (Sterile Gauze 3x3 นิ้ว)</b></td>
              <td>1 แพ็ค (5 ชิ้น)</td>
              <td>ล็อตสำหรับหุ่น (Expired for Sim OK)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel">ยกเลิก</button>
        <button class="btn-submit">🚀 ยืนยันและส่งคำขอ One-Stop</button>
      </div>
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'ui_mockup_kits',
    title: 'Nursing Practice Kits',
    width: 960,
    height: 640,
    html: `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Prompt:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Sarabun', sans-serif; }
    body { background: #f8fafc; padding: 30px; }
    .header-bar { margin-bottom: 24px; }
    .header-bar h2 {
      font-family: 'Prompt', sans-serif; font-size: 20px; color: #0f172a; display: flex; align-items: center; gap: 8px;
    }
    .header-bar p { font-size: 13px; color: #64748b; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .kit-card {
      background: #ffffff; border-radius: 18px; border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); padding: 20px;
      display: flex; flex-direction: column; justify-content: space-between;
    }
    .kit-badge {
      display: inline-block; padding: 3px 8px; background: #ccfbf1; color: #0f766e;
      font-size: 10px; font-weight: 700; border-radius: 6px; margin-bottom: 10px;
    }
    .kit-title { font-family: 'Prompt', sans-serif; font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 8px; line-height: 1.3; }
    .kit-items {
      font-size: 11.5px; color: #475569; background: #f8fafc; border-radius: 10px;
      padding: 10px; margin-bottom: 16px; border: 1px solid #f1f5f9; line-height: 1.6;
    }
    .kit-items li { margin-left: 14px; }
    .btn-kit {
      width: 100%; padding: 10px; background: #0d9488; color: white; border: none;
      border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 6px;
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <h2>📦 ชุดฝึกปฏิบัติการสำเร็จรูป (Nursing Practice Kits / Box Sets)</h2>
    <p>รวมชุดอุปกรณ์และเวชภัณฑ์ตามมาตรฐานหัตถการทางการพยาบาล สะดวก รวดเร็ว ขอเบิกได้ในคลิกเดียว (One-Click)</p>
  </div>

  <div class="grid">
    <div class="kit-card">
      <div>
        <span class="kit-badge">รหัสชุด: KIT-01 • การพยาบาลพื้นฐาน</span>
        <div class="kit-title">ชุดฝึกทำแผลปลอดเชื้อ<br>(Sterile Dressing Kit)</div>
        <div class="kit-items">
          <b>อุปกรณ์ภายในชุด (ครบเซ็ต):</b>
          <ul>
            <li>ปากคีบมีเขี้ยวและไม่มีเขี้ยว (อย่างละ 1 อัน)</li>
            <li>ถ้วยไอโอดีนสแตนเลส (1 ใบ)</li>
            <li>สำลีก้อนปลอดเชื้อ (4 ก้อน)</li>
            <li>ผ้ากอซสี่เหลี่ยม 3x3 นิ้ว (3 ชิ้น)</li>
            <li>ผ้าสี่เหลี่ยมเจาะกลางปลอดเชื้อ (1 ผืน)</li>
          </ul>
        </div>
      </div>
      <button class="btn-kit">⚡ ขอเบิกชุดนี้ทันที (One-Click)</button>
    </div>

    <div class="kit-card">
      <div>
        <span class="kit-badge">รหัสชุด: KIT-02 • การพยาบาลพื้นฐาน</span>
        <div class="kit-title">ชุดฝึกสวนปัสสาวะ<br>(Catheterization Kit)</div>
        <div class="kit-items">
          <b>อุปกรณ์ภายในชุด (ครบเซ็ต):</b>
          <ul>
            <li>สายสวนปัสสาวะโฟเลย์ (Foley Catheter Ch.14)</li>
            <li>ถุงรองรับน้ำปัสสาวะ Urine Bag (1 ใบ)</li>
            <li>กระบอกฉีดยา Syringe 10 ml (1 อัน)</li>
            <li>สารหล่อลื่น K-Y Jelly (1 ซอง)</li>
            <li>ถุงมือปลอดเชื้อ Sterile Gloves เบอร์ 7 (1 คู่)</li>
          </ul>
        </div>
      </div>
      <button class="btn-kit">⚡ ขอเบิกชุดนี้ทันที (One-Click)</button>
    </div>

    <div class="kit-card">
      <div>
        <span class="kit-badge">รหัสชุด: KIT-03 • การประเมินสุขภาพ</span>
        <div class="kit-title">ชุดฝึกตรวจสัญญาณชีพ<br>(Vital Signs Assessment Kit)</div>
        <div class="kit-items">
          <b>อุปกรณ์ภายในชุด (ครบเซ็ต):</b>
          <ul>
            <li>หูฟังแพทย์ Stethoscope คุณภาพสูง (1 อัน)</li>
            <li>เครื่องวัดความดันโลหิตแบบดิจิทัล (1 เครื่อง)</li>
            <li>เทอร์โมมิเตอร์วัดอุณหภูมิดิจิทัล (1 อัน)</li>
            <li>เครื่องวัดระดับออกซิเจนในเลือด Pulse Oxi (1 อัน)</li>
            <li>สำลีแอลกอฮอล์สำหรับเช็ดทำความสะอาด (5 ซอง)</li>
          </ul>
        </div>
      </div>
      <button class="btn-kit" style="background: #0284c7;">⚡ ขอยืมชุดนี้ทันที (One-Click)</button>
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'ui_mockup_practice_booking',
    title: 'Practice Room Booking',
    width: 960,
    height: 700,
    html: `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Prompt:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Sarabun', sans-serif; }
    body { background: #f8fafc; padding: 24px; }
    .title-box { margin-bottom: 20px; }
    .title-box h2 { font-family: 'Prompt', sans-serif; font-size: 20px; color: #0f172a; }
    .title-box p { font-size: 13px; color: #64748b; }
    .booking-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .panel {
      background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;
      padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .panel h3 {
      font-family: 'Prompt', sans-serif; font-size: 14px; font-weight: 700; color: #0f766e;
      margin-bottom: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;
    }
    .slot-item {
      display: flex; justify-content: space-between; align-items: center; padding: 12px 14px;
      border-radius: 12px; border: 1.5px solid #e2e8f0; margin-bottom: 10px; background: #f8fafc;
    }
    .slot-item.selected {
      border-color: #0d9488; background: #f0fdfa; box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.2);
    }
    .slot-item.full { opacity: 0.6; background: #fff1f2; border-color: #fecdd3; }
    .slot-time { font-size: 13px; font-weight: 700; color: #0f172a; }
    .slot-room { font-size: 11px; color: #64748b; margin-top: 2px; }
    .badge-status { font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 6px; }
    .badge-avail { background: #dcfce7; color: #166534; }
    .badge-full { background: #fee2e2; color: #991b1b; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px; }
    .form-group input { width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 12px; color: #1e293b; }
    .btn-confirm {
      width: 100%; padding: 12px; background: #0d9488; color: white; border: none;
      border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer;
      box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3); margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="title-box">
    <h2>📅 ระบบขอเข้าฝึกปฏิบัติด้วยตนเอง (Self-Directed Practice Booking)</h2>
    <p>จองเตียงฝึกปฏิบัติการและห้องปฏิบัติการทักษะทางการพยาบาลล่วงหน้า</p>
  </div>

  <div class="booking-layout">
    <div class="panel">
      <h3>1. เลือกรอบเวลาที่เปิดให้บริการ (Time Slots)</h3>
      
      <div class="slot-item">
        <div>
          <div class="slot-time">⏰ 09:00 - 11:30 น. (ช่วงเช้า)</div>
          <div class="slot-room">ห้อง Lab Skill 101 • เตียง 01-10</div>
        </div>
        <span class="badge-status badge-avail">ว่าง 4 ที่นั่ง</span>
      </div>

      <div class="slot-item full">
        <div>
          <div class="slot-time">⏰ 13:00 - 15:30 น. (ช่วงบ่าย)</div>
          <div class="slot-room">ห้อง Lab Skill 101 • เตียง 01-10</div>
        </div>
        <span class="badge-status badge-full">เต็ม (10/10)</span>
      </div>

      <div class="slot-item selected">
        <div>
          <div class="slot-time">⏰ 16:30 - 18:30 น. (ช่วงเย็นนอกเวลา) ✓</div>
          <div class="slot-room">ห้อง Lab Skill 101 • เตียง 04 (เลือกแล้ว)</div>
        </div>
        <span class="badge-status badge-avail">ว่าง 2 ที่นั่ง</span>
      </div>
    </div>

    <div class="panel">
      <h3>2. รายละเอียดการฝึกและอาจารย์ที่ปรึกษา</h3>
      
      <div class="form-group">
        <label>นิสิตผู้ขอจอง</label>
        <input type="text" value="น.ส. นภัสสร ใจดี (รหัส 66010023)" readonly>
      </div>

      <div class="form-group">
        <label>รายวิชาที่ต้องการฝึกซ้อม</label>
        <input type="text" value="NS201 การพยาบาลพื้นฐาน" readonly>
      </div>

      <div class="form-group">
        <label>อาจารย์ผู้รับทราบ / ที่ปรึกษา</label>
        <input type="text" value="ผศ.ดร.พิมพา สุขเกษม" readonly>
      </div>

      <div class="form-group">
        <label>หัตถการที่ต้องการฝึกซ้อม</label>
        <input type="text" value="ฝึกทักษะการทำแผลปลอดเชื้อ (Sterile Wound Dressing)" readonly>
      </div>

      <button class="btn-confirm">🎟️ ยืนยันการจอง และออก E-Ticket ทันที</button>
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'ui_mockup_practice_ticket',
    title: 'E-Ticket & QR Code Check-in',
    width: 600,
    height: 720,
    html: `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Prompt:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Sarabun', sans-serif; }
    body { background: #0f172a; padding: 30px; display: flex; justify-content: center; align-items: center; }
    .ticket {
      background: #ffffff; width: 100%; max-width: 440px; border-radius: 24px;
      overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    .ticket-header { background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: white; padding: 24px; text-align: center; }
    .ticket-header h3 { font-family: 'Prompt', sans-serif; font-size: 18px; font-weight: 700; }
    .ticket-header p { font-size: 12px; opacity: 0.9; margin-top: 2px; }
    .ticket-body { padding: 24px; }
    .qr-box {
      background: #f8fafc; border: 2px dashed #0d9488; border-radius: 16px;
      padding: 20px; text-align: center; margin-bottom: 20px;
    }
    .qr-svg { width: 160px; height: 160px; margin: 0 auto 10px auto; display: block; }
    .qr-code-text { font-family: monospace; font-size: 13px; font-weight: 700; color: #0f766e; letter-spacing: 1px; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; }
    .info-label { color: #64748b; }
    .info-val { font-weight: 700; color: #0f172a; }
    .status-badge { background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; }
    .ticket-footer {
      background: #f8fafc; padding: 14px 24px; border-top: 1px dashed #cbd5e1;
      text-align: center; font-size: 11px; color: #64748b; line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="ticket-header">
      <h3>🎫 DIGITAL LAB E-TICKET</h3>
      <p>บัตรเข้าห้องปฏิบัติการพยาบาลศาสตร์เสมือน</p>
    </div>

    <div class="ticket-body">
      <div class="qr-box">
        <svg class="qr-svg" viewBox="0 0 100 100" fill="#0f172a">
          <rect x="5" y="5" width="28" height="28" rx="4" fill="#0d9488"/>
          <rect x="9" y="9" width="20" height="20" rx="2" fill="white"/>
          <rect x="13" y="13" width="12" height="12" rx="1" fill="#0d9488"/>

          <rect x="67" y="5" width="28" height="28" rx="4" fill="#0d9488"/>
          <rect x="71" y="9" width="20" height="20" rx="2" fill="white"/>
          <rect x="75" y="13" width="12" height="12" rx="1" fill="#0d9488"/>

          <rect x="5" y="67" width="28" height="28" rx="4" fill="#0d9488"/>
          <rect x="9" y="71" width="20" height="20" rx="2" fill="white"/>
          <rect x="13" y="75" width="12" height="12" rx="1" fill="#0d9488"/>

          <rect x="38" y="10" width="5" height="5"/>
          <rect x="48" y="10" width="5" height="5"/>
          <rect x="58" y="10" width="5" height="5"/>
          <rect x="38" y="20" width="5" height="5"/>
          <rect x="48" y="25" width="5" height="5"/>
          <rect x="10" y="38" width="5" height="5"/>
          <rect x="20" y="48" width="5" height="5"/>
          <rect x="38" y="38" width="8" height="8" fill="#0d9488"/>
          <rect x="52" y="38" width="6" height="6"/>
          <rect x="65" y="45" width="8" height="5"/>
          <rect x="80" y="40" width="6" height="6"/>
          <rect x="40" y="55" width="6" height="6"/>
          <rect x="55" y="55" width="8" height="8" fill="#0d9488"/>
          <rect x="70" y="58" width="6" height="6"/>
          <rect x="85" y="55" width="5" height="5"/>
          <rect x="38" y="70" width="5" height="5"/>
          <rect x="48" y="75" width="5" height="5"/>
          <rect x="60" y="70" width="6" height="6"/>
          <rect x="75" y="72" width="6" height="6"/>
          <rect x="40" y="85" width="6" height="6"/>
          <rect x="55" y="85" width="6" height="6"/>
          <rect x="70" y="85" width="8" height="8"/>
        </svg>
        <div class="qr-code-text">REF: LAB-20260912-0042</div>
      </div>

      <div class="info-row">
        <span class="info-label">ผู้จอง:</span>
        <span class="info-val">น.ส. นภัสสร ใจดี (66010023)</span>
      </div>
      <div class="info-row">
        <span class="info-label">ห้องปฏิบัติการ:</span>
        <span class="info-val">Lab Skill Room 101 (เตียงที่ 04)</span>
      </div>
      <div class="info-row">
        <span class="info-label">วัน-เวลาฝึก:</span>
        <span class="info-val">12 ก.ย. 2569 • 16:30 - 18:30 น.</span>
      </div>
      <div class="info-row">
        <span class="info-label">รายวิชา:</span>
        <span class="info-val">NS201 การพยาบาลพื้นฐาน</span>
      </div>
      <div class="info-row">
        <span class="info-label">สถานะตั๋ว:</span>
        <span class="status-badge">🟢 พร้อม Check-in เข้าห้อง</span>
      </div>
    </div>

    <div class="ticket-footer">
      💡 สแกน QR Code หน้าห้องแล็บก่อนเวลา 5 นาที<br>
      เมื่อ Check-in แล้วระบบจะเริ่มบันทึกชั่วโมงฝึกซ้อมอัตโนมัติ
    </div>
  </div>
</body>
</html>`
  }
];

async function generateMockups() {
  console.log('Starting Puppeteer for UI Mockups...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  for (const m of mockups) {
    console.log(`Generating mockup: ${m.id}...`);
    await page.setViewport({ width: m.width, height: m.height, deviceScaleFactor: 2 });
    
    const htmlPath = path.join(IMAGES_DIR, `${m.id}.html`);
    fs.writeFileSync(htmlPath, m.html, 'utf-8');

    await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });

    const pngPath = path.join(IMAGES_DIR, `${m.id}.png`);
    await page.screenshot({ path: pngPath, fullPage: false });
    console.log(`Saved PNG: ${pngPath}`);
  }

  await browser.close();
  console.log('All UI mockups generated successfully!');
}

generateMockups().catch(err => {
  console.error('Error generating UI mockups:', err);
  process.exit(1);
});
