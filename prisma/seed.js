const fs = require('fs');
const path = require('path');

// Manually parse .env from project directory
try {
  const envContent = fs.readFileSync('d:\\LAB-system\\.env', 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
} catch (e) {
  console.log('Error reading .env:', e.message);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanAndSeed() {
  console.log('--- Cleaning test records from database ---');

  // 1. Delete dependent transactional records
  await prisma.practiceKitItem.deleteMany();
  await prisma.practiceKit.deleteMany();
  await prisma.repackPackItem.deleteMany();
  await prisma.repackRecord.deleteMany();
  await prisma.borrowItem.deleteMany();
  await prisma.borrowRequest.deleteMany();
  await prisma.requisitionItem.deleteMany();
  await prisma.requisitionRequest.deleteMany();
  await prisma.stockLotBox.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.equipmentAsset.deleteMany();
  await prisma.stockLot.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  console.log('Database cleaned successfully.');

  // 2. Create Users
  console.log('Creating standard users...');
  const admin = await prisma.user.create({
    data: {
      name: 'ผู้ดูแลระบบกลาง (Admin)',
      email: 'admin@lab.nurse.ac.th',
      password: 'admin',
      role: 'ADMIN',
      department: 'ศูนย์เทคโนโลยีสารสนเทศ คณะพยาบาลศาสตร์',
      phone: '02-123-4567 ต่อ 101',
    },
  });

  const officer = await prisma.user.create({
    data: {
      name: 'คุณรัชนี มีสุข (เจ้าหน้าที่ห้องแล็บ)',
      email: 'officer@lab.nurse.ac.th',
      password: 'officer',
      role: 'OFFICER',
      department: 'งานบริการห้องปฏิบัติการพยาบาล',
      phone: '081-234-5678',
    },
  });

  const approver = await prisma.user.create({
    data: {
      name: 'ผศ.ดร. นภาพร มงคลการ (หัวหน้าสาขาวิชา)',
      email: 'approver@lab.nurse.ac.th',
      password: 'approver',
      role: 'APPROVER',
      department: 'กลุ่มวิชาการพยาบาลพื้นฐานและบริหารการพยาบาล',
      phone: '089-876-5432',
    },
  });

  const teacher = await prisma.user.create({
    data: {
      name: 'อ. สมหญิง ใจดี (อาจารย์ผู้สอน)',
      email: 'teacher@lab.nurse.ac.th',
      password: 'teacher',
      role: 'USER',
      department: 'กลุ่มวิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ',
      phone: '086-555-1234',
    },
  });

  const student = await prisma.user.create({
    data: {
      name: 'นศ.พย. กิตติศักดิ์ แก้วมณี (นิสิต)',
      email: 'student@lab.nurse.ac.th',
      password: 'student',
      role: 'USER',
      department: 'นิสิตพยาบาลศาสตร์ ชั้นปีที่ 3',
      studentId: '6610210045',
      phone: '095-999-8877',
    },
  });

  // 3. Create Courses
  console.log('Creating academic courses...');
  const c1 = await prisma.course.create({
    data: {
      code: 'NUR1101',
      name: 'การพยาบาลพื้นฐาน (Fundamental of Nursing)',
      semester: '1',
      academicYear: '2569',
      instructorName: 'ผศ.ดร. นภาพร มงคลการ',
      description: 'ฝึกปฏิบัติการหัตถการทางการพยาบาลขั้นพื้นฐาน การสุขวิทยาส่วนบุคคล การวัดสัญญาณชีพ',
      allocatedBudget: 50000,
    },
  });

  const c2 = await prisma.course.create({
    data: {
      code: 'NUR2102',
      name: 'การประเมินภาวะสุขภาพ (Health Assessment)',
      semester: '1',
      academicYear: '2569',
      instructorName: 'อ. สมหญิง ใจดี',
      description: 'การตรวจร่างกายตามระบบ การฟังเสียงปอดและหัวใจ การประเมินสัญญาณชีพขั้นสูง',
      allocatedBudget: 35000,
    },
  });

  const c3 = await prisma.course.create({
    data: {
      code: 'NUR3105',
      name: 'การพยาบาลมารดา ทารก และการผดุงครรภ์ 1',
      semester: '2',
      academicYear: '2569',
      instructorName: 'รศ. พัชรี ศรีสวัสดิ์',
      description: 'การฝึกทำคลอดในหุ่นจำลอง การตรวจครรภ์ Leopold maneuvers การประเมินทารกแรกเกิด',
      allocatedBudget: 60000,
    },
  });

  const c4 = await prisma.course.create({
    data: {
      code: 'NUR4108',
      name: 'การช่วยฟื้นคืนชีพขั้นสูงและการพยาบาลฉุกเฉิน (ACLS & Trauma)',
      semester: '2',
      academicYear: '2569',
      instructorName: 'อ. นพ. ธีรพัฒน์ วงศ์สุวรรณ',
      description: 'การกู้ชีพ CPR ขั้นสูง การใส่ท่อช่วยหายใจ การใช้ Defibrillator',
      allocatedBudget: 80000,
    },
  });

  // 4. Create Master Categories
  console.log('Creating categories...');
  const catManikin = await prisma.category.create({
    data: {
      name: 'หุ่นจำลองและโมเดลฝึกทักษะทางการพยาบาล',
      type: 'EQUIPMENT',
      description: 'หุ่นฝึกทำหัตถการ แขนฝึกฉีดยา หุ่นทำคลอด หุ่น CPR ผู้ใหญ่และเด็ก',
    },
  });

  const catMonitoring = await prisma.category.create({
    data: {
      name: 'เครื่องมือและอุปกรณ์ตรวจวัดสัญญาณชีพ',
      type: 'EQUIPMENT',
      description: 'เครื่องวัดความดันดิจิทัล ปรอทวัดไข้ หูฟังแพทย์ Stethoscope และ Pulse Oximeter',
    },
  });

  const catProcedure = await prisma.category.create({
    data: {
      name: 'อุปกรณ์และเครื่องมือหัตถการคงทน',
      type: 'EQUIPMENT',
      description: 'รถเข็นทำแผล Dressing Cart, เสาน้ำเกลือ IV Pole, โคมไฟส่องตรวจหัตถการ',
    },
  });

  const catIVSupplies = await prisma.category.create({
    data: {
      name: 'เวชภัณฑ์ฉีดและให้สารน้ำทางหลอดเลือดดำ',
      type: 'CONSUMABLE',
      description: 'เข็มฉีดยา Syringes, สาย IV Set, น้ำเกลือ NSS, Extension Tube',
    },
  });

  const catWoundCare = await prisma.category.create({
    data: {
      name: 'เวชภัณฑ์ทำแผลและสารฆ่าเชื้อ',
      type: 'CONSUMABLE',
      description: 'ชุดทำแผล Sterile Set, สำลีก้อน, ผ้าก๊อซ, พลาสเตอร์, แอลกอฮอล์ 70%',
    },
  });

  const catPPE = await prisma.category.create({
    data: {
      name: 'อุปกรณ์ป้องกันส่วนบุคคลและการควบคุมการติดเชื้อ',
      type: 'CONSUMABLE',
      description: 'ถุงมือแพทย์ Sterile & Non-sterile, หน้ากากอนามัย, หมวกคลุมผม, เสื้อกาวน์กันเปื้อน',
    },
  });

  // 5. Create Master Equipment Items & Assets
  console.log('Creating equipment items and assets...');

  // 5.1 CPR Manikin
  const itemCpr = await prisma.item.create({
    data: {
      code: 'EQ-MNK-001',
      name: 'หุ่นฝึกช่วยฟื้นคืนชีพขั้นสูงพร้อมจอแสดงผล (Adult CPR Manikin with Feedback)',
      type: 'EQUIPMENT',
      categoryId: catManikin.id,
      unit: 'ตัว',
      minStockAlert: 2,
      location: 'ห้อง Simulation Lab 1 (ตู้ M1)',
      description: 'หุ่นจำลองผู้ใหญ่ฝึกกดหน้าอกและช่วยหายใจพร้อมเซ็นเซอร์วัดแรงกดและความลึก',
    },
  });

  await prisma.equipmentAsset.createMany({
    data: [
      { itemId: itemCpr.id, assetCode: 'CPR-2567-001', sequenceNumber: 1, serialNumber: 'SN-CPR-9021', location: 'ห้อง Simulation Lab 1 (ตู้ M1)', receivedDate: new Date('2025-06-10'), cost: 48000, status: 'AVAILABLE', condition: 'GOOD', note: 'เครื่องที่ 1 พร้อมใช้งาน' },
      { itemId: itemCpr.id, assetCode: 'CPR-2567-002', sequenceNumber: 2, serialNumber: 'SN-CPR-9022', location: 'ห้อง Simulation Lab 1 (ตู้ M1)', receivedDate: new Date('2025-06-10'), cost: 48000, status: 'AVAILABLE', condition: 'GOOD', note: 'เครื่องที่ 2 พร้อมใช้งาน' },
      { itemId: itemCpr.id, assetCode: 'CPR-2567-003', sequenceNumber: 3, serialNumber: 'SN-CPR-9023', location: 'ห้อง Simulation Lab 1 (ตู้ M1)', receivedDate: new Date('2025-06-10'), cost: 48000, status: 'AVAILABLE', condition: 'GOOD', note: 'เครื่องที่ 3 พร้อมใช้งาน' },
    ],
  });

  // 5.2 IV Training Arm
  const itemIvArm = await prisma.item.create({
    data: {
      code: 'EQ-MNK-002',
      name: 'แบบจำลองแขนฝึกเจาะเลือดและให้สารน้ำทางหลอดเลือดดำ (IV Training Arm)',
      type: 'EQUIPMENT',
      categoryId: catManikin.id,
      unit: 'ชุด',
      minStockAlert: 3,
      location: 'ห้อง Skill Lab 2 (ตู้ M2)',
      description: 'แขนยางสังเคราะห์มีหลอดเลือดดำจำลองสำหรับฝึกแทงเข็ม IV Catheter',
    },
  });

  await prisma.equipmentAsset.createMany({
    data: [
      { itemId: itemIvArm.id, assetCode: 'ARM-2567-001', sequenceNumber: 1, serialNumber: 'ARM-X1', location: 'ห้อง Skill Lab 2 (ตู้ M2)', receivedDate: new Date('2025-07-20'), cost: 12500, status: 'AVAILABLE', condition: 'GOOD' },
      { itemId: itemIvArm.id, assetCode: 'ARM-2567-002', sequenceNumber: 2, serialNumber: 'ARM-X2', location: 'ห้อง Skill Lab 2 (ตู้ M2)', receivedDate: new Date('2025-07-20'), cost: 12500, status: 'AVAILABLE', condition: 'GOOD' },
      { itemId: itemIvArm.id, assetCode: 'ARM-2567-003', sequenceNumber: 3, serialNumber: 'ARM-X3', location: 'ห้อง Skill Lab 2 (ตู้ M2)', receivedDate: new Date('2025-07-20'), cost: 12500, status: 'AVAILABLE', condition: 'GOOD' },
      { itemId: itemIvArm.id, assetCode: 'ARM-2567-004', sequenceNumber: 4, serialNumber: 'ARM-X4', location: 'ห้อง Skill Lab 2 (ตู้ M2)', receivedDate: new Date('2025-07-20'), cost: 12500, status: 'AVAILABLE', condition: 'GOOD' },
    ],
  });

  // 5.3 Stethoscope Littmann
  const itemSteth = await prisma.item.create({
    data: {
      code: 'EQ-MED-001',
      name: 'หูฟังตรวจแพทย์สองหน้า (Stethoscope Dual-Head Teaching Model)',
      type: 'EQUIPMENT',
      categoryId: catMonitoring.id,
      unit: 'อัน',
      minStockAlert: 5,
      location: 'ตู้กระจก E-102',
      description: 'หูฟังตรวจหัวใจและปอดคุณภาพสูงสำหรับฝึกฟังเสียงทางคลินิก',
    },
  });

  await prisma.equipmentAsset.createMany({
    data: [
      { itemId: itemSteth.id, assetCode: 'STETH-2568-01', sequenceNumber: 1, serialNumber: 'LT-881', location: 'ตู้กระจก E-102', receivedDate: new Date('2026-01-05'), cost: 3800, status: 'AVAILABLE', condition: 'GOOD' },
      { itemId: itemSteth.id, assetCode: 'STETH-2568-02', sequenceNumber: 2, serialNumber: 'LT-882', location: 'ตู้กระจก E-102', receivedDate: new Date('2026-01-05'), cost: 3800, status: 'AVAILABLE', condition: 'GOOD' },
      { itemId: itemSteth.id, assetCode: 'STETH-2568-03', sequenceNumber: 3, serialNumber: 'LT-883', location: 'ตู้กระจก E-102', receivedDate: new Date('2026-01-05'), cost: 3800, status: 'AVAILABLE', condition: 'GOOD' },
      { itemId: itemSteth.id, assetCode: 'STETH-2568-04', sequenceNumber: 4, serialNumber: 'LT-884', location: 'ตู้กระจก E-102', receivedDate: new Date('2026-01-05'), cost: 3800, status: 'AVAILABLE', condition: 'GOOD' },
      { itemId: itemSteth.id, assetCode: 'STETH-2568-05', sequenceNumber: 5, serialNumber: 'LT-885', location: 'ตู้กระจก E-102', receivedDate: new Date('2026-01-05'), cost: 3800, status: 'AVAILABLE', condition: 'GOOD' },
    ],
  });

  // 5.4 Digital BP Monitor
  const itemBp = await prisma.item.create({
    data: {
      code: 'EQ-MED-002',
      name: 'เครื่องวัดความดันโลหิตอัตโนมัติชนิดสอดแขน (Automatic Blood Pressure Monitor)',
      type: 'EQUIPMENT',
      categoryId: catMonitoring.id,
      unit: 'เครื่อง',
      minStockAlert: 2,
      location: 'ห้องตรวจ 1 Lab Station',
      description: 'เครื่องวัดความดันมาตรฐานโรงพยาบาล พร้อมพิมพ์ผลตรวจ',
    },
  });

  await prisma.equipmentAsset.createMany({
    data: [
      { itemId: itemBp.id, assetCode: 'BP-2568-001', sequenceNumber: 1, serialNumber: 'OMRON-901', location: 'ห้องตรวจ 1 Lab Station', receivedDate: new Date('2026-01-10'), cost: 24500, status: 'AVAILABLE', condition: 'GOOD' },
      { itemId: itemBp.id, assetCode: 'BP-2568-002', sequenceNumber: 2, serialNumber: 'OMRON-902', location: 'ห้องตรวจ 1 Lab Station', receivedDate: new Date('2026-01-10'), cost: 24500, status: 'AVAILABLE', condition: 'GOOD' },
    ],
  });

  // 5.5 Automated External Defibrillator (AED)
  const itemAed = await prisma.item.create({
    data: {
      code: 'EQ-AED-001',
      name: 'เครื่องฟื้นคืนคลื่นหัวใจด้วยไฟฟ้าแบบอัตโนมัติ (Automated External Defibrillator - AED)',
      type: 'EQUIPMENT',
      categoryId: catMonitoring.id,
      unit: 'เครื่อง',
      minStockAlert: 1,
      location: 'ตู้ฉุกเฉิน เสา C ห้อง Simulation Lab 1',
      description: 'เครื่อง AED สำหรับฝึกช่วยฟื้นคืนชีพและใช้งานกรณีฉุกเฉิน มีเสียงแนะนำการกดหน้าอกภาษาไทย',
      imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600&auto=format&fit=crop&q=80',
    },
  });

  await prisma.equipmentAsset.createMany({
    data: [
      {
        itemId: itemAed.id,
        assetCode: 'AED-2569-001',
        sequenceNumber: 1,
        serialNumber: 'ZOLL-AED-8801',
        location: 'ตู้ฉุกเฉิน เสา C ห้อง Simulation Lab 1 (ตู้ติดผนังสีแดง)',
        receivedDate: new Date('2026-01-15'),
        cost: 65000.0,
        imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600&auto=format&fit=crop&q=80',
        status: 'AVAILABLE',
        condition: 'GOOD',
        note: 'เครื่อง AED เครื่องที่ 1 แบตเตอรี่เต็ม แผ่นแปะผู้ใหญ่ 2 ชุด',
      },
      {
        itemId: itemAed.id,
        assetCode: 'AED-2569-002',
        sequenceNumber: 2,
        serialNumber: 'ZOLL-AED-8802',
        location: 'รถเข็นกู้ชีพฉุกเฉิน Crash Cart ห้อง Skill Lab 2',
        receivedDate: new Date('2026-02-01'),
        cost: 65000.0,
        imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600&auto=format&fit=crop&q=80',
        status: 'AVAILABLE',
        condition: 'GOOD',
        note: 'เครื่อง AED เครื่องที่ 2 ประจำรถเข็นฉุกเฉิน',
      },
    ],
  });

  // 6. Create Master Consumable Items, Fresh Lots, and Compact Box Sequences (2569)
  console.log('Creating consumable items, fresh lots, and boxes...');

  async function createLotWithBoxes(item, lotData, boxCount) {
    const lot = await prisma.stockLot.create({
      data: {
        itemId: item.id,
        ...lotData,
      },
    });

    const boxes = [];
    const cleanItemCode = item.code.trim();
    for (let b = 1; b <= boxCount; b++) {
      boxes.push({
        lotId: lot.id,
        itemId: item.id,
        boxCode: `${cleanItemCode}-2569-B${String(b).padStart(3, '0')}`,
        boxNumberInLot: b,
        boxNumberInYear: b,
        year: '2569',
        status: 'IN_STOCK',
      });
    }

    if (boxes.length > 0) {
      await prisma.stockLotBox.createMany({ data: boxes });
    }

    // Record initial StockTransaction IN
    await prisma.stockTransaction.create({
      data: {
        itemId: item.id,
        lotId: lot.id,
        type: 'IN',
        quantity: lotData.quantityInitial,
        unitCost: lotData.unitCost,
        totalCost: lotData.quantityInitial * lotData.unitCost,
        createdById: officer.id,
        note: `รับเข้าสต็อกเริ่มต้น ล็อต: ${lotData.lotNumber} (${boxCount} กล่อง/หน่วย)`,
      },
    });

    return lot;
  }

  // 6.1 NSS 1000ml (ขวด)
  const itemNss = await prisma.item.create({
    data: {
      code: 'CON-IV-001',
      name: '0.9% Normal Saline Solution (NSS) 1,000 ml สำหรับฝึกปฏิบัติการ',
      type: 'CONSUMABLE',
      categoryId: catIVSupplies.id,
      unit: 'ขวด',
      usageUnit: 'ขวด',
      conversionRatio: 1,
      minStockAlert: 20,
      location: 'ชั้นวางเวชภัณฑ์ D-1 (ตู้ควบคุมอุณหภูมิ)',
      description: 'น้ำเกลือปราศจากเชื้อสำหรับฝึกผสมยาและต่อสาย IV Set',
    },
  });
  await createLotWithBoxes(itemNss, {
    lotNumber: 'NSS-680105',
    quantityInitial: 50,
    quantityRemaining: 50,
    unitCost: 42.0,
    expiryDate: new Date('2027-12-31'),
    supplier: 'บริษัท สหเวชกิจการ จำกัด',
  }, 50);

  // 6.2 IV Infusion Set (ชุด)
  const itemIvSet = await prisma.item.create({
    data: {
      code: 'CON-IV-002',
      name: 'ชุดให้สารน้ำทางหลอดเลือดดำ (IV Infusion Set 20 drops/ml)',
      type: 'CONSUMABLE',
      categoryId: catIVSupplies.id,
      unit: 'ชุด',
      usageUnit: 'ชิ้น',
      conversionRatio: 1,
      minStockAlert: 25,
      location: 'ชั้นวางเวชภัณฑ์ D-2',
      description: 'สายน้ำเกลือปลอดเชื้อพร้อมเข็มแอร์และ Roller clamp',
    },
  });
  await createLotWithBoxes(itemIvSet, {
    lotNumber: 'IVSET-26011',
    quantityInitial: 60,
    quantityRemaining: 60,
    unitCost: 28.5,
    expiryDate: new Date('2028-06-30'),
    supplier: 'บริษัท เมดิคอลซัพพลายส์ จำกัด',
  }, 60);

  // 6.3 IV Cannula G22 (กล่องละ 50 ชิ้น / สต็อก 10 กล่อง = 500 ชิ้น)
  const itemIvCath = await prisma.item.create({
    data: {
      code: 'CON-IV-003',
      name: 'เข็มแทงน้ำเกลือพร้อมปลอกพลาสติก No. 22 (IV Cannula G22)',
      type: 'CONSUMABLE',
      categoryId: catIVSupplies.id,
      unit: 'กล่อง',
      usageUnit: 'ชิ้น',
      conversionRatio: 50,
      minStockAlert: 3,
      location: 'ลิ้นชักเวชภัณฑ์ C-04',
      description: 'เข็มแทงเส้นเลือดดำสีฟ้า No. 22 สำหรับฝึกหัตถการแทงน้ำเกลือ บรรจุกล่องละ 50 ชิ้น',
    },
  });
  await createLotWithBoxes(itemIvCath, {
    lotNumber: 'CATH-22B-98',
    quantityInitial: 10,
    quantityRemaining: 10,
    unitCost: 750.0,
    expiryDate: new Date('2027-08-31'),
    supplier: 'ห้างหุ้นส่วน เวชภัณฑ์สยาม',
  }, 10);

  // 6.4 Syringe 5ml (กล่องละ 100 ชิ้น / สต็อก 5 กล่อง = 500 ชิ้น)
  const itemSyringe = await prisma.item.create({
    data: {
      code: 'CON-IV-004',
      name: 'กระบอกฉีดยาปลอดเชื้อ ขนาด 5 ml (Sterile Disposable Syringe 5ml)',
      type: 'CONSUMABLE',
      categoryId: catIVSupplies.id,
      unit: 'กล่อง',
      usageUnit: 'ชิ้น',
      conversionRatio: 100,
      minStockAlert: 2,
      location: 'ลิ้นชักเวชภัณฑ์ C-02',
      description: 'กระบอกฉีดยา Nipro 5ml ชนิด Luer Slip บรรจุกล่องละ 100 ชิ้น',
    },
  });
  await createLotWithBoxes(itemSyringe, {
    lotNumber: 'SYR-5ML-04',
    quantityInitial: 5,
    quantityRemaining: 5,
    unitCost: 450.0,
    expiryDate: new Date('2028-01-31'),
    supplier: 'บริษัท นิโปร ประเทศไทย จำกัด',
  }, 5);

  // 6.5 Sterile Dressing Set (ชุด)
  const itemDressing = await prisma.item.create({
    data: {
      code: 'CON-WD-001',
      name: 'ชุดทำแผลปลอดเชื้อมาตรฐาน (Sterile Dressing Set พร้อมสำลีและคีมคีบ)',
      type: 'CONSUMABLE',
      categoryId: catWoundCare.id,
      unit: 'ชุด',
      usageUnit: 'ชุด',
      conversionRatio: 1,
      minStockAlert: 20,
      location: 'ชั้นวางหัตถการ W-1',
      description: 'ในชุดประกอบด้วย ปากคีบ Forceps 2 ตัว, สำลีก้อน 6 ก้อน, ผ้าก๊อซ 3 แผ่น, ถาดพลาสติก',
    },
  });
  await createLotWithBoxes(itemDressing, {
    lotNumber: 'DRS-SET-2026',
    quantityInitial: 50,
    quantityRemaining: 50,
    unitCost: 35.0,
    expiryDate: new Date('2027-05-15'),
    supplier: 'บริษัท บางกอกเมดิคอลแวร์ จำกัด',
  }, 50);

  // 6.6 Sterile Gloves No. 7 (กล่องละ 50 คู่ / สต็อก 10 กล่อง = 500 คู่)
  const itemGloves = await prisma.item.create({
    data: {
      code: 'CON-PPE-001',
      name: 'ถุงมือตรวจโรคปลอดเชื้อ ชนิดมีแป้ง เบอร์ 7 (Sterile Surgical Gloves Size 7.0)',
      type: 'CONSUMABLE',
      categoryId: catPPE.id,
      unit: 'กล่อง',
      usageUnit: 'คู่',
      conversionRatio: 50,
      minStockAlert: 3,
      location: 'ตู้ PPE ลิ้นชัก G-1',
      description: 'ถุงมือยางธรรมชาติ Sterile บรรจุกล่องละ 50 คู่ (ซองแยกคู่)',
    },
  });
  await createLotWithBoxes(itemGloves, {
    lotNumber: 'GLV-S7-889',
    quantityInitial: 10,
    quantityRemaining: 10,
    unitCost: 1100.0,
    expiryDate: new Date('2027-11-20'),
    supplier: 'บริษัท ศรีตรังโกลฟส์ (ประเทศไทย) จำกัด',
  }, 10);

  // 6.7 Alcohol 70% 450ml (ขวด)
  const itemAlcohol = await prisma.item.create({
    data: {
      code: 'CON-WD-002',
      name: 'แอลกอฮอล์สำหรับฆ่าเชื้อ 70% Ethyl Alcohol ขนาด 450 ml',
      type: 'CONSUMABLE',
      categoryId: catWoundCare.id,
      unit: 'ขวด',
      usageUnit: 'ขวด',
      conversionRatio: 1,
      minStockAlert: 10,
      location: 'ตู้สารเคมี Flammable Cabinet',
      description: 'เอทิลแอลกอฮอล์ 70% V/V ชนิดใส',
    },
  });
  await createLotWithBoxes(itemAlcohol, {
    lotNumber: 'ALC-70-109',
    quantityInitial: 30,
    quantityRemaining: 30,
    unitCost: 55.0,
    expiryDate: new Date('2027-04-30'),
    supplier: 'องค์การเภสัชกรรม (GPO)',
  }, 30);

  // 7. Create Standard Practice Kits (ชุดฝึกปฏิบัติการมาตรฐาน)
  console.log('Creating standard practice kits...');

  // Kit 1: IV Therapy Practice Kit
  await prisma.practiceKit.create({
    data: {
      code: 'KIT-IV-01',
      name: 'ชุดฝึกเปิดเส้นให้สารน้ำทางหลอดเลือดดำ (IV Therapy Practice Kit)',
      category: 'หัตถการให้สารน้ำและยา',
      description: 'ชุดฝึกปฏิบัติการเปิดเส้นแทงน้ำเกลือ บรรจุแขนฝึกเจาะเลือด ถุงมือตรวจโรค สาย IV Set น้ำเกลือ และเข็มแทงพร้อมใช้งาน',
      targetCourse: 'NUR1101 การพยาบาลพื้นฐาน',
      items: {
        create: [
          { itemId: itemIvArm.id, quantity: 1 },
          { itemId: itemNss.id, quantity: 1 },
          { itemId: itemIvSet.id, quantity: 1 },
          { itemId: itemIvCath.id, quantity: 2 },
          { itemId: itemSyringe.id, quantity: 1 },
          { itemId: itemAlcohol.id, quantity: 1 },
        ],
      },
    },
  });

  // Kit 2: Sterile Dressing Set
  await prisma.practiceKit.create({
    data: {
      code: 'KIT-DRESSING-01',
      name: 'ชุดฝึกปฏิบัติการทำแผลปราศจากเชื้อ (Sterile Dressing Set)',
      category: 'หัตถการพื้นฐานทางการพยาบาล',
      description: 'สำหรับฝึกปฏิบัติการทำแผลแห้ง (Dry dressing) และแผลเปียก (Wet dressing) พร้อมชุดทำแผลและแอลกอฮอล์',
      targetCourse: 'NUR1101 การพยาบาลพื้นฐาน',
      items: {
        create: [
          { itemId: itemDressing.id, quantity: 1 },
          { itemId: itemAlcohol.id, quantity: 1 },
        ],
      },
    },
  });

  // Kit 3: Emergency CPR & BLS Kit
  await prisma.practiceKit.create({
    data: {
      code: 'KIT-CPR-01',
      name: 'ชุดฝึกช่วยฟื้นคืนชีพและการกู้ชีพฉุกเฉิน (CPR & Basic Life Support Set)',
      category: 'การพยาบาลฉุกเฉินและอุบัติเหตุ',
      description: 'สำหรับฝึกการช่วยฟื้นคืนชีพขั้นพื้นฐาน หุ่น CPR, เครื่องกระตุกหัวใจไฟฟ้า AED และหูฟังตรวจแพทย์',
      targetCourse: 'NUR4108 การช่วยฟื้นคืนชีพขั้นสูงและการพยาบาลฉุกเฉิน',
      items: {
        create: [
          { itemId: itemCpr.id, quantity: 1 },
          { itemId: itemAed.id, quantity: 1 },
          { itemId: itemSteth.id, quantity: 1 },
        ],
      },
    },
  });

  console.log('--- Production Seed Completed Successfully! ---');
}

cleanAndSeed()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
