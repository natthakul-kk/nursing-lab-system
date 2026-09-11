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

// 4 Highly Realistic Requests
const mockBorrowData = [
  {
    id: 'req-0042',
    requestNumber: 'BR-2026-0042',
    status: 'PENDING',
    useTarget: 'SIMULATION',
    purpose: 'ฝึกทักษะการทำแผลปลอดเชื้อและตรวจวัดสัญญาณชีพ OSCE ห้อง Lab Skill 101',
    borrowDate: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    expectedReturnDate: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
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
      name: 'การพยาบาลพื้นฐาน (Fundamental of Nursing)',
      instructorName: 'ผศ.ดร.พิมพา สุขเกษม'
    },
    items: [
      {
        id: 'bi-1',
        quantity: 1,
        item: { name: 'หุ่นฝึกทำแผลจำลองเสมือนจริง (Adult Wound Care Manikin)', unit: 'ตัว' },
        asset: { assetCode: 'EQ-NS-0042' }
      },
      {
        id: 'bi-2',
        quantity: 1,
        item: { name: 'เครื่องวัดความดันโลหิตแบบดิจิทัล (Digital Sphygmomanometer)', unit: 'เครื่อง' },
        asset: { assetCode: 'EQ-NS-0118' }
      }
    ],
    requisitionRequest: {
      id: 'req-req-42',
      requestNumber: 'RQ-2026-0042',
      status: 'PENDING',
      items: [
        {
          id: 'ri-1',
          quantityRequested: 2,
          item: { name: 'ถุงมือยางสังเคราะห์ตรวจโรค ไซส์ M (Nitrile Gloves)', unit: 'คู่' }
        },
        {
          id: 'ri-2',
          quantityRequested: 1,
          item: { name: 'ผ้ากอซสเตอไรล์ Sterile Gauze 3x3 นิ้ว', unit: 'แพ็ค' }
        }
      ]
    }
  },
  {
    id: 'req-0038',
    requestNumber: 'BR-2026-0038',
    status: 'APPROVED',
    useTarget: 'SIMULATION',
    purpose: 'ฝึกปฏิบัติการสวนปัสสาวะและบันทึก I/O ห้อง Lab Skill 102',
    borrowDate: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    expectedReturnDate: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    instructorAcknowledged: true,
    advisorName: 'ผศ.ดร.พิมพา สุขเกษม',
    acknowledgedAt: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
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
        id: 'bi-3',
        quantity: 1,
        item: { name: 'หุ่นจำลองฝึกสวนปัสสาวะเพศหญิง (Catheterization Model)', unit: 'ตัว' },
        asset: { assetCode: 'EQ-NS-0089' }
      }
    ],
    requisitionRequest: {
      id: 'req-req-38',
      requestNumber: 'RQ-2026-0038',
      status: 'APPROVED',
      items: [
        {
          id: 'ri-3',
          quantityRequested: 1,
          item: { name: 'สายสวนปัสสาวะ Foley Catheter Ch.14', unit: 'เส้น' }
        },
        {
          id: 'ri-4',
          quantityRequested: 1,
          item: { name: 'ถุงรองรับน้ำปัสสาวะ Urine Bag 2000 ml', unit: 'ใบ' }
        }
      ]
    }
  },
  {
    id: 'req-0025',
    requestNumber: 'BR-2026-0025',
    status: 'DISPENSED',
    useTarget: 'SIMULATION',
    purpose: 'ฝึกตรวจประเมินสัญญาณชีพและการฟังเสียงปอด หอผู้ป่วยจำลอง',
    borrowDate: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    expectedReturnDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
    instructorAcknowledged: true,
    advisorName: 'ผศ.ดร.พิมพา สุขเกษม',
    acknowledgedAt: new Date(Date.now() - 49 * 3600 * 1000).toISOString(),
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
        id: 'bi-4',
        quantity: 1,
        item: { name: 'หูฟังแพทย์ Littmann Classic III (Stethoscope)', unit: 'อัน' },
        asset: { assetCode: 'EQ-NS-0205' }
      },
      {
        id: 'bi-5',
        quantity: 1,
        item: { name: 'เครื่องวัดระดับออกซิเจนปลายนิ้ว (Fingertip Pulse Oximeter)', unit: 'เครื่อง' },
        asset: { assetCode: 'EQ-NS-0143' }
      }
    ]
  },
  {
    id: 'req-0012',
    requestNumber: 'BR-2026-0012',
    status: 'RETURNED_COMPLETE',
    useTarget: 'SIMULATION',
    purpose: 'ศึกษาโครงสร้างกระดูกและระบบประสาทมนุษย์ ห้องปฏิบัติการกายวิภาคศาสตร์',
    borrowDate: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    expectedReturnDate: new Date(Date.now() - 14 * 24 * 3600 * 1000 + 4 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    instructorAcknowledged: true,
    advisorName: 'อ.ดร.กิตติพงษ์ สว่างวงศ์',
    acknowledgedAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    user: {
      name: 'นางสาวกัลยรัตน์ ช่อทับทิม',
      studentId: '6811700661'
    },
    course: {
      code: 'NS102',
      name: 'กายวิภาคศาสตร์และสรีรวิทยา (Anatomy & Physiology)',
      instructorName: 'อ.ดร.กิตติพงษ์ สว่างวงศ์'
    },
    items: [
      {
        id: 'bi-6',
        quantity: 1,
        item: { name: 'แบบจำลองโครงกระดูกมนุษย์ขนาดเท่าจริง (Human Skeleton Model)', unit: 'ชุด' },
        asset: { assetCode: 'EQ-AN-0005' }
      }
    ]
  }
];

async function captureRealisticOverview() {
  console.log('Launching browser for Realistic Overview Dashboard...');
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

  // Enable Request Interception to inject realistic data into /api/borrow without modifying real database!
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/api/borrow') && request.method() === 'GET') {
      console.log('Intercepted /api/borrow - returning 4 realistic student requests!');
      request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBorrowData)
      });
    } else {
      request.continue();
    }
  });

  console.log('Navigating to borrow overview page...');
  await page.goto('http://localhost:3000/borrow?hide_pwa=1', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Capture clean realistic overview screen
  const overviewCleanPath = path.join(IMAGES_DIR, 'overview_student_dashboard_real.png');
  await page.screenshot({ path: overviewCleanPath, fullPage: false });
  console.log(`Saved clean overview: ${overviewCleanPath}`);

  // 2. Inject annotated callout badges with TH Sarabun PSK font
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
      .ov-badge {
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
      .ov-num {
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

    // Badge 1: New request button
    const newBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('ขอยืม') || b.innerText.includes('One-Stop'));
    if (newBtn) {
      const rect = newBtn.getBoundingClientRect();
      const b1 = document.createElement('div');
      b1.className = 'ov-badge';
      b1.style.background = '#0d9488';
      b1.style.top = (rect.bottom + 12 + window.scrollY) + 'px';
      b1.style.left = (rect.left + window.scrollX) + 'px';
      b1.innerHTML = '<span class="ov-num" style="color:#0d9488;">1</span><span>กดปุ่มนี้เพื่อสร้างคำขอยืม-เบิกอุปกรณ์ใหม่ (One-Stop)</span>';
      document.body.appendChild(b1);
    }

    // Badge 2: Status filter tabs
    const filters = document.querySelector('.flex.flex-wrap.gap-2') || document.querySelector('nav');
    if (filters) {
      const rect = filters.getBoundingClientRect();
      const b2 = document.createElement('div');
      b2.className = 'ov-badge';
      b2.style.top = (rect.top - 44 + window.scrollY) + 'px';
      b2.style.left = (rect.left + window.scrollX) + 'px';
      b2.innerHTML = '<span class="ov-num">2</span><span>แถบตัวกรองสถานะ: ดูทั้งหมด, รออนุมัติ, กำลังยืม, หรือคืนแล้ว</span>';
      document.body.appendChild(b2);
    }

    // Badge 3: First request card (Pending)
    const cards = document.querySelectorAll('.bg-white.rounded-2xl.border');
    if (cards.length > 0) {
      const rect = cards[0].getBoundingClientRect();
      const b3 = document.createElement('div');
      b3.className = 'ov-badge';
      b3.style.background = '#d97706';
      b3.style.top = (rect.top + 16 + window.scrollY) + 'px';
      b3.style.right = '40px';
      b3.innerHTML = '<span class="ov-num" style="color:#d97706;">3</span><span>การ์ดคำขอยืม-เบิก: แสดงรหัสคำขอ, สถานะ, รายชื่ออุปกรณ์ และการรับทราบของอาจารย์</span>';
      document.body.appendChild(b3);
    }
  });

  const overviewAnnotatedPath = path.join(IMAGES_DIR, 'overview_student_dashboard_annotated.png');
  await page.screenshot({ path: overviewAnnotatedPath, fullPage: false });
  console.log(`Saved annotated overview: ${overviewAnnotatedPath}`);

  await browser.close();
  console.log('Realistic overview screenshots captured successfully!');
}

captureRealisticOverview().catch(err => {
  console.error('Error in captureRealisticOverview:', err);
  process.exit(1);
});
