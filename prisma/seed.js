const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning database...');
  await prisma.requisitionItem.deleteMany();
  await prisma.requisitionRequest.deleteMany();
  await prisma.borrowItem.deleteMany();
  await prisma.borrowRequest.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.stockLot.deleteMany();
  await prisma.equipmentAsset.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating users...');
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

  console.log('Creating courses...');
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

  console.log('Creating items...');
  // 1. Manikin CPR
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

  // Assets for CPR Manikin
  await prisma.equipmentAsset.createMany({
    data: [
      { itemId: itemCpr.id, assetCode: 'CPR-2567-001', sequenceNumber: 1, serialNumber: 'SN-CPR-9021', location: 'ห้อง Simulation Lab 1 (ตู้ M1)', receivedDate: new Date('2025-06-10'), cost: 48000, status: 'AVAILABLE', condition: 'GOOD' },
      { itemId: itemCpr.id, assetCode: 'CPR-2567-002', sequenceNumber: 2, serialNumber: 'SN-CPR-9022', location: 'ห้อง Simulation Lab 1 (ตู้ M1)', receivedDate: new Date('2025-06-10'), cost: 48000, status: 'AVAILABLE', condition: 'GOOD' },
      { itemId: itemCpr.id, assetCode: 'CPR-2567-003', sequenceNumber: 3, serialNumber: 'SN-CPR-9023', location: 'ห้อง Simulation Lab 1 (ตู้ M1)', receivedDate: new Date('2025-06-10'), cost: 48000, status: 'AVAILABLE', condition: 'GOOD' },
    ],
  });

  // 2. IV Arm Trainer
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
      { itemId: itemIvArm.id, assetCode: 'ARM-2567-004', sequenceNumber: 4, serialNumber: 'ARM-X4', location: 'ห้องซ่อมบำรุง Lab', receivedDate: new Date('2025-07-20'), cost: 12500, status: 'MAINTENANCE', condition: 'DAMAGED', note: 'ท่อยางรั่ว รอเปลี่ยนอะไหล่' },
    ],
  });

  // 3. Stethoscope Littmann
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

  // 4. Digital BP Monitor
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

  // 5. Automated External Defibrillator (AED) - User's explicit requested example!
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

  // Consumables:
  // 5. 0.9% Normal Saline 1,000 ml
  const itemNss = await prisma.item.create({
    data: {
      code: 'CON-IV-001',
      name: '0.9% Normal Saline Solution (NSS) 1,000 ml สำหรับฝึกปฏิบัติการ',
      type: 'CONSUMABLE',
      categoryId: catIVSupplies.id,
      unit: 'ขวด',
      minStockAlert: 20,
      location: 'ชั้นวางเวชภัณฑ์ D-1 (ตู้ควบคุมอุณหภูมิ)',
      description: 'น้ำเกลือปราศจากเชื้อสำหรับฝึกผสมยาและต่อสาย IV Set',
    },
  });

  const lotNss1 = await prisma.stockLot.create({
    data: {
      itemId: itemNss.id,
      lotNumber: 'NSS-680105',
      quantityInitial: 100,
      quantityRemaining: 68,
      unitCost: 42.0,
      expiryDate: new Date('2027-12-31'),
      supplier: 'บริษัท สหเวชกิจการ จำกัด',
    },
  });

  // 6. IV Set (Infusion Giving Set)
  const itemIvSet = await prisma.item.create({
    data: {
      code: 'CON-IV-002',
      name: 'ชุดให้สารน้ำทางหลอดเลือดดำ (IV Infusion Set 20 drops/ml)',
      type: 'CONSUMABLE',
      categoryId: catIVSupplies.id,
      unit: 'ชุด',
      minStockAlert: 30,
      location: 'ชั้นวางเวชภัณฑ์ D-2',
      description: 'สายน้ำเกลือปลอดเชื้อพร้อมเข็มแอร์และ Roller clamp',
    },
  });

  const lotIvSet1 = await prisma.stockLot.create({
    data: {
      itemId: itemIvSet.id,
      lotNumber: 'IVSET-26011',
      quantityInitial: 200,
      quantityRemaining: 115,
      unitCost: 28.5,
      expiryDate: new Date('2028-06-30'),
      supplier: 'บริษัท เมดิคอลซัพพลายส์ จำกัด',
    },
  });

  // 7. IV Catheter No. 22 (เข็มแทงน้ำเกลือ)
  const itemIvCath = await prisma.item.create({
    data: {
      code: 'CON-IV-003',
      name: 'เข็มแทงน้ำเกลือพร้อมปลอกพลาสติก No. 22 (IV Cannula G22)',
      type: 'CONSUMABLE',
      categoryId: catIVSupplies.id,
      unit: 'ชิ้น',
      minStockAlert: 50,
      location: 'ลิ้นชักเวชภัณฑ์ C-04',
      description: 'เข็มแทงเส้นเลือดดำสีฟ้า No. 22 สำหรับฝึกหัตถการแทงน้ำเกลือ',
    },
  });

  const lotCath1 = await prisma.stockLot.create({
    data: {
      itemId: itemIvCath.id,
      lotNumber: 'CATH-22B-98',
      quantityInitial: 300,
      quantityRemaining: 180,
      unitCost: 15.0,
      expiryDate: new Date('2027-08-31'),
      supplier: 'ห้างหุ้นส่วน เวชภัณฑ์สยาม',
    },
  });

  // 8. Syringe 5 ml
  const itemSyringe = await prisma.item.create({
    data: {
      code: 'CON-IV-004',
      name: 'กระบอกฉีดยาปลอดเชื้อ ขนาด 5 ml (Sterile Disposable Syringe 5ml)',
      type: 'CONSUMABLE',
      categoryId: catIVSupplies.id,
      unit: 'ชิ้น',
      minStockAlert: 40,
      location: 'ลิ้นชักเวชภัณฑ์ C-02',
      description: 'กระบอกฉีดยา Nipro 5ml ชนิด Luer Slip',
    },
  });

  const lotSyr1 = await prisma.stockLot.create({
    data: {
      itemId: itemSyringe.id,
      lotNumber: 'SYR-5ML-04',
      quantityInitial: 250,
      quantityRemaining: 140,
      unitCost: 4.5,
      expiryDate: new Date('2028-01-31'),
      supplier: 'บริษัท นิโปร ประเทศไทย จำกัด',
    },
  });

  // 9. Sterile Dressing Set (ชุดทำแผลปลอดเชื้อ)
  const itemDressing = await prisma.item.create({
    data: {
      code: 'CON-WD-001',
      name: 'ชุดทำแผลปลอดเชื้อมาตรฐาน (Sterile Dressing Set พร้อมสำลีและคีมคีบ)',
      type: 'CONSUMABLE',
      categoryId: catWoundCare.id,
      unit: 'ชุด',
      minStockAlert: 25,
      location: 'ชั้นวางหัตถการ W-1',
      description: 'ในชุดประกอบด้วย ปากคีบ Forceps 2 ตัว, สำลีก้อน 6 ก้อน, ผ้าก๊อซ 3 แผ่น, ถาดพลาสติก',
    },
  });

  const lotDrs1 = await prisma.stockLot.create({
    data: {
      itemId: itemDressing.id,
      lotNumber: 'DRS-SET-2026',
      quantityInitial: 150,
      quantityRemaining: 85,
      unitCost: 35.0,
      expiryDate: new Date('2027-05-15'),
      supplier: 'บริษัท บางกอกเมดิคอลแวร์ จำกัด',
    },
  });

  // 10. Sterile Gloves No. 7 (ถุงมือผ่าตัดปลอดเชื้อ)
  const itemGloves = await prisma.item.create({
    data: {
      code: 'CON-PPE-001',
      name: 'ถุงมือตรวจโรคปลอดเชื้อ ชนิดมีแป้ง เบอร์ 7 (Sterile Surgical Gloves Size 7.0)',
      type: 'CONSUMABLE',
      categoryId: catPPE.id,
      unit: 'คู่',
      minStockAlert: 50,
      location: 'ตู้ PPE ลิ้นชัก G-1',
      description: 'ถุงมือยางธรรมชาติ Sterile บรรจุซองแยกคู่',
    },
  });

  const lotGlv1 = await prisma.stockLot.create({
    data: {
      itemId: itemGloves.id,
      lotNumber: 'GLV-S7-889',
      quantityInitial: 200,
      quantityRemaining: 92,
      unitCost: 22.0,
      expiryDate: new Date('2027-11-20'),
      supplier: 'บริษัท ศรีตรังโกลฟส์ (ประเทศไทย) จำกัด',
    },
  });

  // 11. Low stock item: Alcohol 70% 450 ml
  const itemAlcohol = await prisma.item.create({
    data: {
      code: 'CON-WD-002',
      name: 'แอลกอฮอล์สำหรับฆ่าเชื้อ 70% Ethyl Alcohol ขนาด 450 ml',
      type: 'CONSUMABLE',
      categoryId: catWoundCare.id,
      unit: 'ขวด',
      minStockAlert: 15,
      location: 'ตู้สารเคมี Flammable Cabinet',
      description: 'เอทิลแอลกอฮอล์ 70% V/V ชนิดใส',
    },
  });

  const lotAlc1 = await prisma.stockLot.create({
    data: {
      itemId: itemAlcohol.id,
      lotNumber: 'ALC-70-109',
      quantityInitial: 40,
      quantityRemaining: 6, // Low stock! < 15
      unitCost: 55.0,
      expiryDate: new Date('2026-11-15'), // Expiring in ~2 months!
      supplier: 'องค์การเภสัชกรรม (GPO)',
    },
  });

  console.log('Creating sample requisitions with course cost tracking...');
  // Sample 1: Completed Requisition for Course NUR1101 (Fundamental Nursing)
  const req1 = await prisma.requisitionRequest.create({
    data: {
      requestNumber: 'REQ-25690901-001',
      userId: teacher.id,
      courseId: c1.id,
      purpose: 'ฝึกปฏิบัติการหัตถการแทงน้ำเกลือและให้สารน้ำ กลุ่มเรียน A (นศ. 40 คน)',
      dateNeeded: new Date('2026-09-02'),
      status: 'DISPENSED',
      approverId: approver.id,
      approvedAt: new Date('2026-09-01T14:30:00'),
      officerId: officer.id,
      dispensedAt: new Date('2026-09-02T08:15:00'),
      totalCost: 3490.0,
      items: {
        create: [
          { itemId: itemNss.id, quantityRequested: 40, quantityDispensed: 40, unitCost: 42.0, totalCost: 1680.0 },
          { itemId: itemIvSet.id, quantityRequested: 40, quantityDispensed: 40, unitCost: 28.5, totalCost: 1140.0 },
          { itemId: itemIvCath.id, quantityRequested: 45, quantityDispensed: 45, unitCost: 15.0, totalCost: 670.0 },
        ],
      },
    },
  });

  // Transactions for req1
  await prisma.stockTransaction.createMany({
    data: [
      {
        itemId: itemNss.id,
        lotId: lotNss1.id,
        type: 'OUT_REQUISITION',
        quantity: -40,
        unitCost: 42.0,
        totalCost: 1680.0,
        courseId: c1.id,
        referenceNumber: req1.requestNumber,
        createdById: officer.id,
        note: 'เบิกใช้ประกอบการสอน NUR1101 กลุ่ม A',
      },
      {
        itemId: itemIvSet.id,
        lotId: lotIvSet1.id,
        type: 'OUT_REQUISITION',
        quantity: -40,
        unitCost: 28.5,
        totalCost: 1140.0,
        courseId: c1.id,
        referenceNumber: req1.requestNumber,
        createdById: officer.id,
        note: 'เบิกใช้ประกอบการสอน NUR1101 กลุ่ม A',
      },
      {
        itemId: itemIvCath.id,
        lotId: lotCath1.id,
        type: 'OUT_REQUISITION',
        quantity: -45,
        unitCost: 15.0,
        totalCost: 670.0,
        courseId: c1.id,
        referenceNumber: req1.requestNumber,
        createdById: officer.id,
        note: 'เบิกใช้ประกอบการสอน NUR1101 กลุ่ม A',
      },
    ],
  });

  // Sample 2: Completed Requisition for Course NUR2102 (Health Assessment)
  const req2 = await prisma.requisitionRequest.create({
    data: {
      requestNumber: 'REQ-25690902-002',
      userId: teacher.id,
      courseId: c2.id,
      purpose: 'ฝึกประเมินและทำแผลจำลอง (Wound Dressing Lab) กลุ่มเรียน B (30 คน)',
      dateNeeded: new Date('2026-09-03'),
      status: 'DISPENSED',
      approverId: approver.id,
      approvedAt: new Date('2026-09-02T16:00:00'),
      officerId: officer.id,
      dispensedAt: new Date('2026-09-03T09:00:00'),
      totalCost: 2360.0,
      items: {
        create: [
          { itemId: itemDressing.id, quantityRequested: 30, quantityDispensed: 30, unitCost: 35.0, totalCost: 1050.0 },
          { itemId: itemGloves.id, quantityRequested: 40, quantityDispensed: 40, unitCost: 22.0, totalCost: 880.0 },
          { itemId: itemAlcohol.id, quantityRequested: 8, quantityDispensed: 8, unitCost: 55.0, totalCost: 430.0 },
        ],
      },
    },
  });

  await prisma.stockTransaction.createMany({
    data: [
      {
        itemId: itemDressing.id,
        lotId: lotDrs1.id,
        type: 'OUT_REQUISITION',
        quantity: -30,
        unitCost: 35.0,
        totalCost: 1050.0,
        courseId: c2.id,
        referenceNumber: req2.requestNumber,
        createdById: officer.id,
        note: 'เบิกใช้ประกอบการสอน NUR2102 กลุ่ม B',
      },
      {
        itemId: itemGloves.id,
        lotId: lotGlv1.id,
        type: 'OUT_REQUISITION',
        quantity: -40,
        unitCost: 22.0,
        totalCost: 880.0,
        courseId: c2.id,
        referenceNumber: req2.requestNumber,
        createdById: officer.id,
        note: 'เบิกใช้ประกอบการสอน NUR2102 กลุ่ม B',
      },
    ],
  });

  // Sample 3: Pending Requisition waiting for Approver
  await prisma.requisitionRequest.create({
    data: {
      requestNumber: 'REQ-25690904-003',
      userId: student.id,
      courseId: c1.id,
      purpose: 'ฝึกปฏิบัติทบทวนทักษะฉีดยาและการเตรียมยา (Self-practice นอกเวลา)',
      dateNeeded: new Date('2026-09-05'),
      status: 'PENDING',
      totalCost: 450.0,
      items: {
        create: [
          { itemId: itemSyringe.id, quantityRequested: 20, quantityDispensed: 0, unitCost: 4.5, totalCost: 90.0 },
          { itemId: itemNss.id, quantityRequested: 5, quantityDispensed: 0, unitCost: 42.0, totalCost: 210.0 },
          { itemId: itemGloves.id, quantityRequested: 6, quantityDispensed: 0, unitCost: 22.0, totalCost: 150.0 },
        ],
      },
    },
  });

  console.log('Creating sample borrow requests...');
  // Sample Borrow 1: Currently BORROWED
  const cprAsset = await prisma.equipmentAsset.findFirst({ where: { assetCode: 'CPR-2567-001' } });
  if (cprAsset) {
    await prisma.equipmentAsset.update({
      where: { id: cprAsset.id },
      data: { status: 'BORROWED' },
    });

    await prisma.borrowRequest.create({
      data: {
        requestNumber: 'BRW-25690903-001',
        userId: teacher.id,
        courseId: c4.id,
        purpose: 'สอนการประเมินภาวะหัวใจหยุดเต้นและฝึก CPR ในชั้นเรียน ACLS',
        borrowDate: new Date('2026-09-03T13:00:00'),
        expectedReturnDate: new Date('2026-09-05T17:00:00'),
        status: 'BORROWED',
        approverId: approver.id,
        approvedAt: new Date('2026-09-03T10:00:00'),
        officerId: officer.id,
        checkedOutAt: new Date('2026-09-03T12:45:00'),
        items: {
          create: [
            { itemId: itemCpr.id, assetId: cprAsset.id, quantity: 1, isReturned: false },
          ],
        },
      },
    });
  }

  // Sample Borrow 2: PENDING Approval
  await prisma.borrowRequest.create({
    data: {
      requestNumber: 'BRW-25690904-002',
      userId: student.id,
      courseId: c2.id,
      purpose: 'ยืมหูฟัง Stethoscope และแบบจำลองแขนสำหรับฝึกฟังเสียงและคลำชีพจร',
      borrowDate: new Date('2569-09-05T09:00:00'),
      borrowDate: new Date('2026-09-05T09:00:00'),
      expectedReturnDate: new Date('2026-09-05T16:00:00'),
      status: 'PENDING',
      items: {
        create: [
          { itemId: itemSteth.id, quantity: 2, isReturned: false },
          { itemId: itemIvArm.id, quantity: 1, isReturned: false },
        ],
      },
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
