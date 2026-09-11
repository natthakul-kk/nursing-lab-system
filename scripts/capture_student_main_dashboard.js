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

// Realistic borrow requests for dashboard
const mockBorrowData = [
  {
    id: 'req-0038',
    requestNumber: 'BR-2026-0038',
    status: 'BORROWED',
    useTarget: 'SIMULATION',
    purpose: 'ฝึกปฏิบัติการสวนปัสสาวะและตรวจวัดสัญญาณชีพ OSCE ห้อง Lab Skill 102',
    borrowDate: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    expectedReturnDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(), // 2 days left
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    instructorAcknowledged: true,
    advisorName: 'ผศ.ดร.พิมพา สุขเกษม',
    acknowledgedAt: new Date(Date.now() - 46 * 3600 * 1000).toISOString(),
    user: {
      name: 'นางสาวกัลยรัตน์ ช่อทับทิม',
      studentId: '6811700661'
    },
    course: {
      code: 'NS201',
      name: 'การพยาบาลพื้นฐาน (Fundamental of Nursing)',
      instructorName: 'ผศ.ดร.พิมพา สุขเกษม'
    },
    items: [
      {
        id: 'bi-3',
        quantity: 1,
        item: { name: 'หุ่นฝึกสวนปัสสาวะเพศหญิง (Female Catheterization Trainer)', unit: 'ตัว' },
        asset: { assetCode: 'EQ-NS-0089' }
      },
      {
        id: 'bi-4',
        quantity: 1,
        item: { name: 'หูฟังแพทย์ Littmann Classic III (Stethoscope)', unit: 'อัน' },
        asset: { assetCode: 'EQ-NS-0204' }
      }
    ]
  },
  {
    id: 'req-0042',
    requestNumber: 'BR-2026-0042',
    status: 'PENDING',
    useTarget: 'SIMULATION',
    purpose: 'ฝึกทักษะการทำแผลปลอดเชื้อ OSCE ห้อง Lab Skill 101',
    borrowDate: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    expectedReturnDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    instructorAcknowledged: true,
    advisorName: 'ผศ.ดร.พิมพา สุขเกษม',
    acknowledgedAt: new Date().toISOString(),
    user: {
      name: 'นางสาวกัลยรัตน์ ช่อทับทิม',
      studentId: '6811700661'
    },
    course: {
      code: 'NS201',
      name: 'การพยาบาลพื้นฐาน',
      instructorName: 'ผศ.ดร.พิมพา สุขเกษม'
    },
    items: [
      {
        id: 'bi-1',
        quantity: 1,
        item: { name: 'ชุดทำแผลปลอดเชื้อสำเร็จรูป (Dressing Set)', unit: 'เซ็ต' },
        asset: { assetCode: 'EQ-NS-0042' }
      }
    ]
  },
  {
    id: 'req-0025',
    requestNumber: 'BR-2026-0025',
    status: 'RETURNED',
    useTarget: 'SIMULATION',
    purpose: 'ฝึกประเมินพัฒนาการและตรวจร่างกายทารกแรกเกิด',
    borrowDate: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    expectedReturnDate: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    instructorAcknowledged: true,
    advisorName: 'อ.ดร.ศิริพร บุญช่วย',
    user: {
      name: 'นางสาวกัลยรัตน์ ช่อทับทิม',
      studentId: '6811700661'
    },
    course: {
      code: 'NS302',
      name: 'การพยาบาลมารดาและทารก',
      instructorName: 'อ.ดร.ศิริพร บุญช่วย'
    },
    items: [
      {
        id: 'bi-5',
        quantity: 1,
        item: { name: 'หุ่นจำลองทารกแรกเกิด (Newborn Baby Model)', unit: 'ตัว' },
        asset: { assetCode: 'EQ-OB-0014' }
      }
    ]
  },
  {
    id: 'req-0012',
    requestNumber: 'BR-2026-0012',
    status: 'RETURNED',
    useTarget: 'SIMULATION',
    purpose: 'ฝึกการตรวจประเมินข้อต่อและกล้ามเนื้อ Anatomy',
    borrowDate: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    expectedReturnDate: new Date(Date.now() - 13 * 24 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    user: {
      name: 'นางสาวกัลยรัตน์ ช่อทับทิม',
      studentId: '6811700661'
    },
    course: {
      code: 'NS101',
      name: 'กายวิภาคศาสตร์และสรีรวิทยา',
      instructorName: 'อ.นพ.วิศิษฏ์ เมธาพาณิชย์'
    },
    items: [
      {
        id: 'bi-6',
        quantity: 1,
        item: { name: 'แบบจำลองโครงกระดูกมนุษย์ขนาดเท่าจริง (Skeleton Model)', unit: 'ชุด' },
        asset: { assetCode: 'EQ-AN-0005' }
      }
    ]
  }
];

async function captureStudentMainDashboard() {
  console.log('Launching browser for Student Main Dashboard (Home /)...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 2 });

  // Set student user session in localStorage before navigating
  await page.evaluateOnNewDocument((user) => {
    localStorage.setItem('cached_current_user', JSON.stringify(user));
    localStorage.setItem('active_user_id', user.id);
    localStorage.setItem('session_last_active', Date.now().toString());
    localStorage.setItem('session_expires_at', (Date.now() + 86400000).toString());
  }, studentUser);

  // Enable Request Interception
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/api/borrow')) {
      request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBorrowData)
      });
    } else if (url.includes('/api/practice/stats')) {
      request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userStats: {
            totalHours: 4.5,
            completedSessions: 3
          }
        })
      });
    } else {
      request.continue();
    }
  });

  console.log('Navigating to student home dashboard...');
  await page.goto('http://localhost:3000/?hide_pwa=1', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Capture clean student dashboard
  const cleanPath = path.join(IMAGES_DIR, 'student_main_dashboard_real.png');
  await page.screenshot({ path: cleanPath, fullPage: false });
  console.log(`Saved clean student dashboard: ${cleanPath}`);

  // 2. Inject annotated callout badges with TH Sarabun PSK font
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
      .db-badge {
        position: absolute;
        z-index: 10000;
        background: #0f766e;
        color: white;
        padding: 6px 14px;
        border-radius: 20px;
        border: 2px solid white;
        font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif;
        font-size: 16px;
        font-weight: 700;
        box-shadow: 0 4px 14px rgba(15, 118, 110, 0.4);
        display: flex;
        align-items: center;
        gap: 8px;
        pointer-events: none;
      }
      .db-num {
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
    `;
    document.head.appendChild(style);

    // Badge 1: Student Header & Quick Actions
    const headerEl = document.querySelector('.bg-gradient-to-r');
    if (headerEl) {
      const rect = headerEl.getBoundingClientRect();
      const b1 = document.createElement('div');
      b1.className = 'db-badge';
      b1.style.background = '#0d9488';
      b1.style.top = (rect.top + 16 + window.scrollY) + 'px';
      b1.style.right = '40px';
      b1.innerHTML = '<span class="db-num" style="color:#0d9488;">1</span><span>แถบข้อมูลนิสิต & ปุ่มทางลัด (ยื่นขอยืมอุปกรณ์, ขอเบิกวัสดุ)</span>';
      document.body.appendChild(b1);
    }

    // Badge 2: 4 KPI Cards
    const kpiGrid = document.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4');
    if (kpiGrid) {
      const rect = kpiGrid.getBoundingClientRect();
      const b2 = document.createElement('div');
      b2.className = 'db-badge';
      b2.style.background = '#0284c7';
      b2.style.top = (rect.top - 40 + window.scrollY) + 'px';
      b2.style.left = (rect.left + window.scrollX) + 'px';
      b2.innerHTML = '<span class="db-num" style="color:#0284c7;">2</span><span>การ์ดสรุปสถานะ 4 ด้าน: กำลังยืม, รออนุมัติ, คืนแล้ว, ชม.ฝึกซ้อมสะสม</span>';
      document.body.appendChild(b2);
    }

    // Badge 3: Active Loans Section Header & Due Date Alerts
    const loansHeader = Array.from(document.querySelectorAll('h3')).find(h => h.innerText.includes('รายการอุปกรณ์ที่ฉันกำลังยืม'));
    if (loansHeader) {
      const rect = loansHeader.getBoundingClientRect();
      const b3 = document.createElement('div');
      b3.className = 'db-badge';
      b3.style.background = '#d97706';
      b3.style.top = (rect.top - 38 + window.scrollY) + 'px';
      b3.style.right = '40px';
      b3.innerHTML = '<span class="db-num" style="color:#d97706;">3</span><span>แถบติดตามกำหนดวันส่งคืน: ระบบคำนวณวันคงเหลือแบบอัตโนมัติ</span>';
      document.body.appendChild(b3);
    }

    // Badge 4: Loan Item Card with Due Badge
    const itemCards = document.querySelectorAll('.divide-y > div');
    if (itemCards.length > 0) {
      const rect = itemCards[0].getBoundingClientRect();
      const b4 = document.createElement('div');
      b4.className = 'db-badge';
      b4.style.background = '#10b981';
      b4.style.top = (rect.bottom - 46 + window.scrollY) + 'px';
      b4.style.left = (rect.left + 20 + window.scrollX) + 'px';
      b4.innerHTML = '<span class="db-num" style="color:#10b981;">4</span><span>การ์ดรายการอุปกรณ์ที่ถือครอง: แสดงรหัสคำขอ, รายการพัสดุ, และสถานะกำหนดคืน</span>';
      document.body.appendChild(b4);
    }
  });

  const annotatedPath = path.join(IMAGES_DIR, 'student_main_dashboard_annotated.png');
  await page.screenshot({ path: annotatedPath, fullPage: false });
  console.log(`Saved annotated student dashboard: ${annotatedPath}`);

  await browser.close();
  console.log('Student main dashboard captured successfully!');
}

captureStudentMainDashboard().catch(err => {
  console.error('Error capturing student main dashboard:', err);
  process.exit(1);
});
