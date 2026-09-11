const puppeteer = require('d:/LAB-system/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const IMAGES_DIR = path.join('d:', 'LAB-system', 'manual', 'images');

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Student User Credentials
const studentUser = {
  id: 'cmts3h6tb001nl104rq9ppt0n',
  name: 'นางสาวกัลยรัตน์ ช่อทับทิม',
  email: 'kanyarat.chot@ku.th',
  role: 'USER',
  studentId: '6811700661',
  department: 'คณะพยาบาลศาสตร์'
};

async function captureSteps() {
  console.log('Launching browser with Edge...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 950, deviceScaleFactor: 2 });

  // -------------------------------------------------------------
  // STEP 1: REAL LOGIN SCREEN
  // -------------------------------------------------------------
  console.log('Capturing Step 1: Real Login Screen...');
  await page.goto('http://localhost:3000/login?hide_pwa=1', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // Type student ID into input
  const inputs = await page.$$('input');
  if (inputs.length >= 2) {
    await inputs[0].type('6811700661', { delay: 50 });
    await inputs[1].type('P@ssword1234', { delay: 50 });
  }

  // Inject step overlay annotations with TH Sarabun PSK font
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
      .step-badge {
        position: absolute;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 8px;
        background: #0f766e;
        color: white;
        padding: 6px 14px;
        border-radius: 30px;
        font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif;
        font-size: 18px;
        font-weight: 700;
        box-shadow: 0 4px 14px rgba(15, 118, 110, 0.4);
        border: 2px solid #ffffff;
      }
      .step-number {
        background: #ffffff;
        color: #0f766e;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: 800;
      }
      .step-pointer {
        position: absolute;
        z-index: 9998;
        border: 2px dashed #0f766e;
        border-radius: 10px;
        pointer-events: none;
        box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.15);
      }
    `;
    document.head.appendChild(style);

    // Annotate inputs
    const allInputs = document.querySelectorAll('input');
    if (allInputs.length >= 2) {
      const rect0 = allInputs[0].getBoundingClientRect();
      const b0 = document.createElement('div');
      b0.className = 'step-badge';
      b0.style.top = (rect0.top - 44 + window.scrollY) + 'px';
      b0.style.left = (rect0.left + window.scrollX) + 'px';
      b0.innerHTML = '<span class="step-number">1</span><span>กรอกรหัสนิสิต (เช่น 6811700661) หรืออีเมลมหาวิทยาลัย</span>';
      document.body.appendChild(b0);

      const rect1 = allInputs[1].getBoundingClientRect();
      const b1 = document.createElement('div');
      b1.className = 'step-badge';
      b1.style.top = (rect1.top - 44 + window.scrollY) + 'px';
      b1.style.left = (rect1.left + window.scrollX) + 'px';
      b1.innerHTML = '<span class="step-number">2</span><span>กรอกรหัสผ่านบัญชีนิสิต</span>';
      document.body.appendChild(b1);
    }

    const loginBtn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('เข้าสู่ระบบ'));
    if (loginBtn) {
      const rectBtn = loginBtn.getBoundingClientRect();
      const b2 = document.createElement('div');
      b2.className = 'step-badge';
      b2.style.background = '#0284c7';
      b2.style.top = (rectBtn.bottom + 12 + window.scrollY) + 'px';
      b2.style.left = (rectBtn.left + window.scrollX) + 'px';
      b2.innerHTML = '<span class="step-number" style="color:#0284c7;">3</span><span>กดปุ่ม "เข้าสู่ระบบ (Sign In)"</span>';
      document.body.appendChild(b2);
    }
  });

  await page.screenshot({ path: path.join(IMAGES_DIR, 'step_1_login_real.png'), fullPage: false });
  console.log('Saved step_1_login_real.png');

  // -------------------------------------------------------------
  // STEP 2: REAL BORROW & REQUISITION ONE-STOP MODAL
  // -------------------------------------------------------------
  console.log('Navigating to borrow page as authenticated student...');
  await page.evaluateOnNewDocument((user) => {
    localStorage.setItem('cached_current_user', JSON.stringify(user));
    localStorage.setItem('active_user_id', user.id);
    localStorage.setItem('session_last_active', Date.now().toString());
    localStorage.setItem('session_expires_at', (Date.now() + 86400000).toString());
  }, studentUser);

  await page.goto('http://localhost:3000/borrow?hide_pwa=1', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  // Find button to open One-Stop Modal
  console.log('Opening One-Stop Modal...');
  const allBtns = await page.$$('button');
  for (const b of allBtns) {
    const text = await page.evaluate(el => el.innerText, b);
    if (text.includes('ขอยืม') || text.includes('One-Stop') || text.includes('คำขอ')) {
      await b.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 2000));

  // Fill in form fields in the real modal!
  await page.evaluate(() => {
    // Select course dropdown if present
    const selects = document.querySelectorAll('select');
    selects.forEach(s => {
      if (s.options.length > 1) {
        s.selectedIndex = 1;
        s.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Purpose textarea
    const ta = document.querySelector('textarea');
    if (ta) {
      ta.value = 'ฝึกปฏิบัติการทักษะการทำแผลปลอดเชื้อและตรวจวัดสัญญาณชีพ ห้อง Lab 101';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  await new Promise(r => setTimeout(r, 1000));

  // Inject numbered step badges with pointer arrows directly onto the real modal
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
      .step-tag {
        position: absolute;
        z-index: 100000;
        display: flex;
        align-items: center;
        gap: 8px;
        background: #0f766e;
        color: white;
        padding: 5px 12px;
        border-radius: 20px;
        font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif;
        font-size: 16px;
        font-weight: 700;
        box-shadow: 0 4px 12px rgba(15, 118, 110, 0.45);
        border: 2px solid white;
        pointer-events: none;
      }
      .step-num {
        background: white;
        color: #0f766e;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 800;
      }
      .field-highlight {
        position: absolute;
        z-index: 99999;
        border: 2.5px solid #0d9488;
        border-radius: 12px;
        pointer-events: none;
        box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.2);
      }
    `;
    document.head.appendChild(style);

    // Find key modal sections
    // 1. Target buttons (Sim vs Human)
    const targetBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('หุ่นจำลอง') || b.innerText.includes('คนจริง'));
    if (targetBtns.length > 0) {
      const rect = targetBtns[0].getBoundingClientRect();
      const tag = document.createElement('div');
      tag.className = 'step-tag';
      tag.style.top = (rect.top - 36 + window.scrollY) + 'px';
      tag.style.left = (rect.left + window.scrollX) + 'px';
      tag.innerHTML = '<span class="step-num">1</span><span>เลือกวัตถุประสงค์: ฝึกกับหุ่น (Sim-Lab) หรือ คนจริง (Patient Safety Lock)</span>';
      document.body.appendChild(tag);
    }

    // 2. Course Select
    const courseSelect = document.querySelector('select');
    if (courseSelect) {
      const rect = courseSelect.getBoundingClientRect();
      const tag = document.createElement('div');
      tag.className = 'step-tag';
      tag.style.top = (rect.top - 36 + window.scrollY) + 'px';
      tag.style.left = (rect.left + window.scrollX) + 'px';
      tag.innerHTML = '<span class="step-num">2</span><span>เลือกรายวิชา (ระบบดึงชื่ออาจารย์ผู้รับผิดชอบให้อัตโนมัติ)</span>';
      document.body.appendChild(tag);
    }

    // 3. Date inputs
    const dateInputs = document.querySelectorAll('input[type="datetime-local"]');
    if (dateInputs.length > 0) {
      const rect = dateInputs[0].getBoundingClientRect();
      const tag = document.createElement('div');
      tag.className = 'step-tag';
      tag.style.top = (rect.top - 36 + window.scrollY) + 'px';
      tag.style.left = (rect.left + window.scrollX) + 'px';
      tag.innerHTML = '<span class="step-num">3</span><span>ระบุวันและเวลารับของ - กำหนดวันส่งคืน</span>';
      document.body.appendChild(tag);
    }

    // 4. Purpose textarea
    const ta = document.querySelector('textarea');
    if (ta) {
      const rect = ta.getBoundingClientRect();
      const tag = document.createElement('div');
      tag.className = 'step-tag';
      tag.style.top = (rect.top - 36 + window.scrollY) + 'px';
      tag.style.left = (rect.left + window.scrollX) + 'px';
      tag.innerHTML = '<span class="step-num">4</span><span>ระบุวัตถุประสงค์และสถานที่ใช้งาน</span>';
      document.body.appendChild(tag);
    }

    // 5. Submit button
    const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('ส่งคำขอ') || b.innerText.includes('ยืนยัน'));
    if (submitBtn) {
      const rect = submitBtn.getBoundingClientRect();
      const tag = document.createElement('div');
      tag.className = 'step-tag';
      tag.style.background = '#0284c7';
      tag.style.top = (rect.top - 36 + window.scrollY) + 'px';
      tag.style.left = (rect.left + window.scrollX) + 'px';
      tag.innerHTML = '<span class="step-num" style="color:#0284c7;">5</span><span>กดยืนยันเพื่อส่งคำขอ One-Stop เข้าสู่ระบบ</span>';
      document.body.appendChild(tag);
    }
  });

  await page.screenshot({ path: path.join(IMAGES_DIR, 'step_2_unified_request_real.png'), fullPage: false });
  console.log('Saved step_2_unified_request_real.png');

  // -------------------------------------------------------------
  // STEP 3: REAL NURSING PRACTICE KITS
  // -------------------------------------------------------------
  console.log('Capturing Step 3: Practice Kits...');
  await page.goto('http://localhost:3000/kits?hide_pwa=1', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  await page.evaluate(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
      .kit-step-tag {
        position: absolute;
        z-index: 100000;
        display: flex;
        align-items: center;
        gap: 8px;
        background: #0f766e;
        color: white;
        padding: 6px 14px;
        border-radius: 20px;
        font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif;
        font-size: 16px;
        font-weight: 700;
        box-shadow: 0 4px 14px rgba(15, 118, 110, 0.4);
        border: 2px solid white;
        pointer-events: none;
      }
      .kit-step-num {
        background: white;
        color: #0f766e;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 800;
      }
    `;
    document.head.appendChild(style);

    const firstCard = document.querySelector('.bg-white') || document.querySelector('article') || document.querySelector('div[class*="rounded"]');
    if (firstCard) {
      const rect = firstCard.getBoundingClientRect();
      const tag1 = document.createElement('div');
      tag1.className = 'kit-step-tag';
      tag1.style.top = (rect.top + 20 + window.scrollY) + 'px';
      tag1.style.left = (rect.left + 20 + window.scrollX) + 'px';
      tag1.innerHTML = '<span class="kit-step-num">1</span><span>เลือกชุดฝึกตามหัตถการทางการพยาบาล</span>';
      document.body.appendChild(tag1);

      const oneClickBtn = firstCard.querySelector('button');
      if (oneClickBtn) {
        const bRect = oneClickBtn.getBoundingClientRect();
        const tag2 = document.createElement('div');
        tag2.className = 'kit-step-tag';
        tag2.style.background = '#0284c7';
        tag2.style.top = (bRect.top - 40 + window.scrollY) + 'px';
        tag2.style.left = (bRect.left + window.scrollX) + 'px';
        tag2.innerHTML = '<span class="kit-step-num" style="color:#0284c7;">2</span><span>กดขอเบิกชุดนี้ทันที (One-Click Request)</span>';
        document.body.appendChild(tag2);
      }
    }
  });

  await page.screenshot({ path: path.join(IMAGES_DIR, 'step_3_kits_real.png'), fullPage: false });
  console.log('Saved step_3_kits_real.png');

  // -------------------------------------------------------------
  // STEP 4: REAL SELF-PRACTICE BOOKING
  // -------------------------------------------------------------
  console.log('Capturing Step 4: Practice Booking...');
  await page.goto('http://localhost:3000/practice?hide_pwa=1', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  await page.evaluate(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
      .practice-step-tag {
        position: absolute;
        z-index: 100000;
        display: flex;
        align-items: center;
        gap: 8px;
        background: #0f766e;
        color: white;
        padding: 6px 14px;
        border-radius: 20px;
        font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif;
        font-size: 16px;
        font-weight: 700;
        box-shadow: 0 4px 14px rgba(15, 118, 110, 0.4);
        border: 2px solid white;
        pointer-events: none;
      }
      .practice-step-num {
        background: white;
        color: #0f766e;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 800;
      }
    `;
    document.head.appendChild(style);

    // Annotate booking controls
    const headers = Array.from(document.querySelectorAll('h2, h3, div')).filter(el => el.innerText.includes('ห้อง') || el.innerText.includes('รอบเวลา'));
    if (headers.length > 0) {
      const rect = headers[0].getBoundingClientRect();
      const tag1 = document.createElement('div');
      tag1.className = 'practice-step-tag';
      tag1.style.top = (rect.top - 36 + window.scrollY) + 'px';
      tag1.style.left = (rect.left + window.scrollX) + 'px';
      tag1.innerHTML = '<span class="practice-step-num">1</span><span>เลือกห้องปฏิบัติการและรอบเวลา (Time Slots)</span>';
      document.body.appendChild(tag1);
    }
  });

  await page.screenshot({ path: path.join(IMAGES_DIR, 'step_4_booking_real.png'), fullPage: false });
  console.log('Saved step_4_booking_real.png');

  await browser.close();
  console.log('All real system screenshots captured successfully!');
}

captureSteps().catch(err => {
  console.error('Error capturing real system steps:', err);
  process.exit(1);
});
