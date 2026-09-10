const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUTPUT_DIR = path.join(__dirname, '..', 'manual_images');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Strictly Mock / Fictional Users
const mockStudentUser = {
  id: 'demo-student-001',
  name: 'นางสาวสมหญิง ใจดี (นิสิตตัวอย่าง)',
  email: 'somying.demo@ku.th',
  role: 'USER',
  department: 'นิสิตชั้นปีที่ 2 คณะพยาบาลศาสตร์',
  studentId: '6811799999',
  status: 'ACTIVE'
};

const mockTeacherUser = {
  id: 'demo-teacher-001',
  name: 'ผศ.ดร.พยาบาล อารีรัตน์ (อาจารย์ตัวอย่าง)',
  email: 'nursing.demo@ku.th',
  role: 'TEACHER',
  department: 'ภาควิชาการพยาบาลพื้นฐาน, อาจารย์',
  studentId: 'fnrsdemo',
  status: 'ACTIVE'
};

async function setAuth(page, user) {
  await page.evaluate((u) => {
    const expires = Date.now() + 24 * 3600 * 1000;
    const now = Date.now();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('active_user_id', u.id);
    localStorage.setItem('cached_current_user', JSON.stringify(u));
    localStorage.setItem('session_expires_at', expires.toString());
    localStorage.setItem('session_last_active', now.toString());
  }, user);
}

async function run() {
  console.log('Launching Edge Browser for Mock Screenshots...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    defaultViewport: { width: 1280, height: 850, deviceScaleFactor: 1.5 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 1. Login Page
    console.log('1. Capturing Login Page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01_login_page.png') });

    // Switch to Mock Student
    await setAuth(page, mockStudentUser);

    // 2. Student Dashboard
    console.log('2. Capturing Mock Student Dashboard...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '02_student_dashboard.png') });

    // 3. Borrow Page
    console.log('3. Capturing Mock Borrow Page...');
    await page.goto('http://localhost:3000/borrow', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '03_borrow_page.png') });

    // 4. Open Unified Request Modal
    console.log('4. Capturing Unified Request Modal...');
    const modalOpened = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.innerText.includes('ยื่น') || b.innerText.includes('ขอ') || b.innerText.includes('ยืม') || b.className.includes('bg-teal'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (modalOpened) {
      await new Promise(r => setTimeout(r, 1500));
      await page.screenshot({ path: path.join(OUTPUT_DIR, '04_unified_request_modal.png') });
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 500));
    }

    // 5. Kits Library
    console.log('5. Capturing Kits Library...');
    await page.goto('http://localhost:3000/kits', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '05_kits_page.png') });

    // 6. Practice Room Booking Timetable
    console.log('6. Capturing Practice Booking Timetable...');
    await page.goto('http://localhost:3000/practice', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '06_practice_timetable.png') });

    // 7. Practice Booking Tab / Pass
    console.log('7. Capturing Practice My Bookings (with Mock QR Pass)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const tab = btns.find(b => b.innerText.includes('จองของฉัน') || b.innerText.includes('รายการจอง'));
      if (tab) tab.click();
    });
    await new Promise(r => setTimeout(r, 1800));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '07_practice_my_bookings.png') });

    // 8. Asset QR Details page
    console.log('8. Capturing Asset Detail Page...');
    let assetCode = 'EQ-001';
    try {
      const assetRes = await page.evaluate(async () => {
        const r = await fetch('/api/equipment?limit=1');
        const j = await r.json();
        return j.items?.[0]?.assetCode || j[0]?.assetCode || 'EQ-001';
      });
      if (assetRes) assetCode = assetRes;
    } catch(e) {}
    console.log('Asset code target:', assetCode);
    await page.goto(`http://localhost:3000/asset/${assetCode}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '08_asset_detail_page.png') });

    // 9. Switch to Mock Teacher User
    console.log('9. Switching to Mock Teacher User...');
    await setAuth(page, mockTeacherUser);

    // 10. Teacher Approvals Page
    console.log('10. Capturing Mock Teacher Approvals Page...');
    await page.goto('http://localhost:3000/approvals', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '09_teacher_approvals.png') });

    // 11. Courses & Cost Analytics Page
    console.log('11. Capturing Mock Courses Page...');
    await page.goto('http://localhost:3000/courses', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '10_courses_analytics.png') });

    console.log('ALL SCREENSHOTS CAPTURED WITH STRICTLY MOCK/FICTIONAL NAMES!');
  } catch (err) {
    console.error('Capture error:', err);
  } finally {
    await browser.close();
  }
}

run();
