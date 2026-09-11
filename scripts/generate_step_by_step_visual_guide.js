const puppeteer = require('d:/LAB-system/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const IMAGES_DIR = path.join('d:', 'LAB-system', 'manual', 'images');

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Student User
const studentUser = {
  id: 'cmts3h6tb001nl104rq9ppt0n',
  name: 'นางสาวกัลยรัตน์ ช่อทับทิม',
  email: 'kanyarat.chot@ku.th',
  role: 'USER',
  studentId: '6811700661',
  department: 'คณะพยาบาลศาสตร์'
};

async function generateVisualSteps() {
  console.log('Starting Puppeteer for Step-by-Step Annotated Guides...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 2 });

  // --------------------------------------------------------------------------
  // 1. REAL SYSTEM: BORROW & REQUISITION ONE-STOP (STEP 1, 2, 3, 4, 5, 6, 7)
  // --------------------------------------------------------------------------
  console.log('Capturing Real One-Stop Requisition Steps with Arrows...');
  await page.evaluateOnNewDocument((user) => {
    localStorage.setItem('cached_current_user', JSON.stringify(user));
    localStorage.setItem('active_user_id', user.id);
    localStorage.setItem('session_last_active', Date.now().toString());
    localStorage.setItem('session_expires_at', (Date.now() + 86400000).toString());
  }, studentUser);

  await page.goto('http://localhost:3000/borrow?hide_pwa=1', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  // Open Modal
  const btns = await page.$$('button');
  for (const b of btns) {
    const text = await page.evaluate(el => el.innerText, b);
    if (text.includes('ขอยืม') || text.includes('One-Stop') || text.includes('คำขอ')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 2000));

  // Fill in sample field values in real DOM
  await page.evaluate(() => {
    const selects = document.querySelectorAll('select');
    if (selects.length > 0 && selects[0].options.length > 1) {
      selects[0].selectedIndex = 1;
      selects[0].dispatchEvent(new Event('change', { bubbles: true }));
    }
    const ta = document.querySelector('textarea');
    if (ta) {
      ta.value = 'ฝึกปฏิบัติการทักษะการทำแผลปลอดเชื้อและตรวจวัดสัญญาณชีพ OSCE ห้อง Lab 101';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  // Render comprehensive Step-by-Step diagram overlay with TH Sarabun PSK 16pt
  await page.evaluate(() => {
    const modal = document.querySelector('div[role="dialog"]') || document.querySelector('.bg-white.rounded-2xl') || document.querySelector('.fixed.inset-0 .bg-white');
    if (!modal) return;

    const overlay = document.createElement('div');
    overlay.id = 'guide-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 9999999;
      font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif;
    `;

    overlay.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
        .callout-card {
          position: absolute;
          background: #ffffff;
          border: 2px solid #0f766e;
          border-radius: 12px;
          padding: 8px 14px;
          box-shadow: 0 8px 24px rgba(15, 118, 110, 0.25);
          font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif;
          font-size: 16px;
          line-height: 1.35;
          color: #0f172a;
          max-width: 330px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .callout-num {
          background: #0f766e;
          color: white;
          width: 28px;
          height: 28px;
          min-width: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 800;
        }
        .callout-num.warn {
          background: #e11d48;
        }
        .callout-num.blue {
          background: #0284c7;
        }
        .callout-title {
          font-weight: 800;
          font-size: 17px;
          color: #0f766e;
          margin-bottom: 2px;
        }
        .callout-desc {
          font-size: 15px;
          color: #334155;
        }
        .arrow-line {
          position: absolute;
          pointer-events: none;
        }
      </style>
    `;
    document.body.appendChild(overlay);

    // Let's create an annotated side panel on the right with direct pointer badges
    const sidePanel = document.createElement('div');
    sidePanel.style.cssText = `
      position: absolute;
      top: 30px;
      right: 30px;
      width: 360px;
      background: rgba(255, 255, 255, 0.98);
      border: 2px solid #0d9488;
      border-radius: 18px;
      padding: 20px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif;
      font-size: 16px;
    `;

    sidePanel.innerHTML = `
      <div style="border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 14px;">
        <h3 style="font-size: 20px; font-weight: 800; color: #0f766e; margin: 0;">
          📋 ขั้นตอนการกรอกฟอร์มขอยืม-เบิก (One-Stop)
        </h3>
        <span style="font-size: 14px; color: #64748b;">ทำตามลำดับขั้นตอน 1 ถึง 7 อย่างถูกต้อง</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; gap: 10px;">
          <span class="callout-num">1</span>
          <div>
            <div class="callout-title">เลือกวัตถุประสงค์การใช้งาน</div>
            <div class="callout-desc">• <b>ฝึกกับหุ่น (Sim-Lab):</b> เบิกของหมดอายุได้<br>• <b>คนจริง (Clinical):</b> ล็อกความปลอดภัย บล็อกของหมดอายุ 100%</div>
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <span class="callout-num">2</span>
          <div>
            <div class="callout-title">เลือกรหัสรายวิชาทางการพยาบาล</div>
            <div class="callout-desc">เลือกวิชา เช่น <i>NS201 การพยาบาลพื้นฐาน</i> ระบบจะดึงชื่ออาจารย์ผู้รับผิดชอบให้อัตโนมัติ</div>
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <span class="callout-num">3</span>
          <div>
            <div class="callout-title">กำหนดวันเวลารับของและส่งคืน</div>
            <div class="callout-desc">ระบุวันเวลาที่มารับอุปกรณ์ที่ห้องแล็บ และวันกำหนดส่งคืนครุภัณฑ์</div>
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <span class="callout-num">4</span>
          <div>
            <div class="callout-title">ระบุวัตถุประสงค์และสถานที่ใช้งาน</div>
            <div class="callout-desc">ระบุหัตถการและห้องปฏิบัติการ เช่น ฝึกทำแผลปลอดเชื้อ ห้อง Lab 101</div>
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <span class="callout-num">5</span>
          <div>
            <div class="callout-title">เลือกรายการครุภัณฑ์ที่ต้องการยืม</div>
            <div class="callout-desc">เลือกอุปกรณ์ทางการแพทย์ และระบุจำนวน (ชิ้น/เครื่อง) ที่ต้องส่งคืน</div>
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <span class="callout-num">6</span>
          <div>
            <div class="callout-title">เลือกรายการเวชภัณฑ์สิ้นเปลืองที่เบิก</div>
            <div class="callout-desc">ระบุพัสดุใช้หมดไป เช่น ถุงมือยาง, กอซ, สำลี พร้อมระบุจำนวนและหน่วย</div>
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <span class="callout-num blue">7</span>
          <div>
            <div class="callout-title" style="color: #0284c7;">กดยืนยันส่งคำขอ One-Stop</div>
            <div class="callout-desc">ตรวจสอบความถูกต้องแล้วกดปุ่มส่งคำขอเข้าสู่ระบบเพื่อรออนุมัติ</div>
          </div>
        </div>
      </div>
    `;
    overlay.appendChild(sidePanel);

    // Place badge markers on the modal inputs
    function placeBadge(targetEl, stepNum, text, offsetX = -35, offsetY = -15) {
      if (!targetEl) return;
      const rect = targetEl.getBoundingClientRect();
      const badge = document.createElement('div');
      badge.style.cssText = `
        position: absolute;
        top: ${rect.top + offsetY + window.scrollY}px;
        left: ${rect.left + offsetX + window.scrollX}px;
        background: #0f766e;
        color: white;
        border: 2px solid white;
        border-radius: 20px;
        padding: 4px 10px;
        font-size: 15px;
        font-weight: 800;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 6px;
        z-index: 10000000;
      `;
      badge.innerHTML = `<span style="background:white; color:#0f766e; width:20px; height:20px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:13px; font-weight:900;">${stepNum}</span><span>${text}</span>`;
      overlay.appendChild(badge);
    }

    const targets = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('หุ่นจำลอง') || b.innerText.includes('คนจริง'));
    if (targets.length > 0) placeBadge(targets[0], 1, 'จุดที่ 1: วัตถุประสงค์การใช้งาน', 0, -32);

    const selCourse = document.querySelector('select');
    if (selCourse) placeBadge(selCourse, 2, 'จุดที่ 2: เลือกรหัสรายวิชา', 0, -32);

    const dates = document.querySelectorAll('input[type="datetime-local"]');
    if (dates.length > 0) placeBadge(dates[0], 3, 'จุดที่ 3: วันเวลารับของ-ส่งคืน', 0, -32);

    const taField = document.querySelector('textarea');
    if (taField) placeBadge(taField, 4, 'จุดที่ 4: วัตถุประสงค์และสถานที่', 0, -32);

    const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('ส่งคำขอ') || b.innerText.includes('ยืนยัน'));
    if (submitBtn) placeBadge(submitBtn, 7, 'จุดที่ 7: กดยืนยันส่งคำขอ', 0, -34);
  });

  const borrowStepPath = path.join(IMAGES_DIR, 'step_borrow_one_stop_guide.png');
  await page.screenshot({ path: borrowStepPath, fullPage: false });
  console.log(`Saved: ${borrowStepPath}`);

  // --------------------------------------------------------------------------
  // 2. REAL LOGIN SCREEN WITH NUMBERED ARROWS (STEP 1, 2, 3)
  // --------------------------------------------------------------------------
  console.log('Capturing Real Login Guide with Numbered Steps...');
  await page.goto('http://localhost:3000/login?hide_pwa=1', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  const loginInputs = await page.$$('input');
  if (loginInputs.length >= 2) {
    await loginInputs[0].type('6811700661', { delay: 30 });
    await loginInputs[1].type('P@ssword1234', { delay: 30 });
  }

  await page.evaluate(() => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 9999999;
      font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif;
    `;

    overlay.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
        .step-callout {
          position: absolute;
          background: #0f766e;
          color: white;
          border: 2px solid white;
          border-radius: 12px;
          padding: 6px 14px;
          font-size: 16px;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(15, 118, 110, 0.4);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .step-circle {
          background: white;
          color: #0f766e;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 900;
        }
      </style>
    `;
    document.body.appendChild(overlay);

    const inps = document.querySelectorAll('input');
    if (inps.length >= 2) {
      const r0 = inps[0].getBoundingClientRect();
      const c0 = document.createElement('div');
      c0.className = 'step-callout';
      c0.style.top = (r0.top - 46 + window.scrollY) + 'px';
      c0.style.left = (r0.left + window.scrollX) + 'px';
      c0.innerHTML = '<span class="step-circle">1</span><span>ขั้นตอนที่ 1: กรอกรหัสนิสิต (เช่น 6811700661) หรืออีเมลมหาวิทยาลัย</span>';
      overlay.appendChild(c0);

      const r1 = inps[1].getBoundingClientRect();
      const c1 = document.createElement('div');
      c1.className = 'step-callout';
      c1.style.top = (r1.top - 46 + window.scrollY) + 'px';
      c1.style.left = (r1.left + window.scrollX) + 'px';
      c1.innerHTML = '<span class="step-circle">2</span><span>ขั้นตอนที่ 2: กรอกรหัสผ่านบัญชีผู้ใช้งาน</span>';
      overlay.appendChild(c1);
    }

    const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('เข้าสู่ระบบ'));
    if (btn) {
      const rb = btn.getBoundingClientRect();
      const cb = document.createElement('div');
      cb.className = 'step-callout';
      cb.style.background = '#0284c7';
      cb.style.top = (rb.bottom + 14 + window.scrollY) + 'px';
      cb.style.left = (rb.left + window.scrollX) + 'px';
      cb.innerHTML = '<span class="step-circle" style="color:#0284c7;">3</span><span>ขั้นตอนที่ 3: กดปุ่ม "เข้าสู่ระบบ (Sign In)"</span>';
      overlay.appendChild(cb);
    }
  });

  const loginStepPath = path.join(IMAGES_DIR, 'step_login_guide.png');
  await page.screenshot({ path: loginStepPath, fullPage: false });
  console.log(`Saved: ${loginStepPath}`);

  // --------------------------------------------------------------------------
  // 3. REAL PRACTICE KITS GUIDE (STEP 1, 2, 3)
  // --------------------------------------------------------------------------
  console.log('Capturing Real Practice Kits Guide with Numbered Steps...');
  await page.goto('http://localhost:3000/kits?hide_pwa=1', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  await page.evaluate(() => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 9999999;
      font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif;
    `;

    overlay.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
        .kit-callout {
          position: absolute;
          background: #0f766e;
          color: white;
          border: 2px solid white;
          border-radius: 12px;
          padding: 6px 14px;
          font-size: 16px;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(15, 118, 110, 0.4);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .kit-circle {
          background: white;
          color: #0f766e;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 900;
        }
      </style>
    `;
    document.body.appendChild(overlay);

    const cards = document.querySelectorAll('div[class*="rounded"]');
    if (cards.length > 0) {
      const r0 = cards[0].getBoundingClientRect();
      const c0 = document.createElement('div');
      c0.className = 'kit-callout';
      c0.style.top = (r0.top - 40 + window.scrollY) + 'px';
      c0.style.left = (r0.left + window.scrollX) + 'px';
      c0.innerHTML = '<span class="kit-circle">1</span><span>ขั้นตอนที่ 1: เลือกชุด Box Set ตามหัตถการที่ต้องการฝึก</span>';
      overlay.appendChild(c0);

      const oneBtn = cards[0].querySelector('button');
      if (oneBtn) {
        const rb = oneBtn.getBoundingClientRect();
        const cb = document.createElement('div');
        cb.className = 'kit-callout';
        cb.style.background = '#0284c7';
        cb.style.top = (rb.top - 40 + window.scrollY) + 'px';
        cb.style.left = (rb.left + window.scrollX) + 'px';
        cb.innerHTML = '<span class="kit-circle" style="color:#0284c7;">2</span><span>ขั้นตอนที่ 2: กดปุ่ม "⚡ ขอเบิกชุดนี้ทันที (One-Click)"</span>';
        overlay.appendChild(cb);
      }
    }
  });

  const kitsStepPath = path.join(IMAGES_DIR, 'step_kits_guide.png');
  await page.screenshot({ path: kitsStepPath, fullPage: false });
  console.log(`Saved: ${kitsStepPath}`);

  // --------------------------------------------------------------------------
  // 4. REAL PRACTICE BOOKING GUIDE (STEP 1, 2, 3, 4)
  // --------------------------------------------------------------------------
  console.log('Capturing Real Practice Booking Guide with Numbered Steps...');
  await page.goto('http://localhost:3000/practice?hide_pwa=1', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  await page.evaluate(() => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 9999999;
      font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif;
    `;

    overlay.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
        .bk-callout {
          position: absolute;
          background: #0f766e;
          color: white;
          border: 2px solid white;
          border-radius: 12px;
          padding: 6px 14px;
          font-size: 16px;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(15, 118, 110, 0.4);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .bk-circle {
          background: white;
          color: #0f766e;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 900;
        }
      </style>
    `;
    document.body.appendChild(overlay);

    const headers = document.querySelectorAll('h2, h3, select, button');
    if (headers.length > 0) {
      const r0 = headers[0].getBoundingClientRect();
      const c0 = document.createElement('div');
      c0.className = 'bk-callout';
      c0.style.top = (r0.top - 40 + window.scrollY) + 'px';
      c0.style.left = (r0.left + window.scrollX) + 'px';
      c0.innerHTML = '<span class="bk-circle">1</span><span>ขั้นตอนที่ 1: เลือกห้องปฏิบัติการและวันที่ต้องการฝึก</span>';
      overlay.appendChild(c0);
    }
  });

  const bookingStepPath = path.join(IMAGES_DIR, 'step_booking_guide.png');
  await page.screenshot({ path: bookingStepPath, fullPage: false });
  console.log(`Saved: ${bookingStepPath}`);

  await browser.close();
  console.log('All annotated step-by-step guides generated successfully!');
}

generateVisualSteps().catch(err => {
  console.error('Error generating visual steps:', err);
  process.exit(1);
});
