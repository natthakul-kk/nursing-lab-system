const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('--- STARTING DEMO DATA SEEDING (STRICTLY MOCK NAMES) ---');

  // 1. Run cleanup first
  await prisma.practiceBooking.deleteMany({
    where: { bookingNumber: { startsWith: 'PB-DEMO' } }
  });

  const demoBorrows = await prisma.borrowRequest.findMany({
    where: { requestNumber: { startsWith: 'REQ-DEMO' } },
    select: { id: true }
  });
  if (demoBorrows.length > 0) {
    const brIds = demoBorrows.map(b => b.id);
    await prisma.borrowItem.deleteMany({ where: { borrowRequestId: { in: brIds } } });
    await prisma.borrowRequest.deleteMany({ where: { id: { in: brIds } } });
  }

  const demoReqs = await prisma.requisitionRequest.findMany({
    where: { requestNumber: { startsWith: 'REQ-DEMO' } },
    select: { id: true }
  });
  if (demoReqs.length > 0) {
    const reqIds = demoReqs.map(r => r.id);
    await prisma.requisitionItem.deleteMany({ where: { requisitionRequestId: { in: reqIds } } });
    await prisma.requisitionRequest.deleteMany({ where: { id: { in: reqIds } } });
  }

  await prisma.practiceSlot.deleteMany({ where: { closeReason: { contains: '[DEMO]' } } });
  await prisma.course.deleteMany({ where: { code: { startsWith: 'DEMO-' } } });
  await prisma.item.deleteMany({ where: { code: { startsWith: 'DEMO-' } } });
  await prisma.category.deleteMany({ where: { code: { startsWith: 'DEMO-' } } });
  await prisma.user.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'demo-' } },
        { email: { contains: '.demo@ku.th' } },
        { studentId: '6811799999' }
      ]
    }
  });

  // 2. Create Explicit Mock Users (Fictional Actors)
  const student = await prisma.user.create({
    data: {
      id: 'demo-student-001',
      name: 'นางสาวสมหญิง ใจดี (นิสิตตัวอย่าง)',
      email: 'somying.demo@ku.th',
      studentId: '6811799999',
      department: 'นิสิตชั้นปีที่ 2 คณะพยาบาลศาสตร์',
      role: 'USER',
      status: 'ACTIVE'
    }
  });

  const teacher = await prisma.user.create({
    data: {
      id: 'demo-teacher-001',
      name: 'ผศ.ดร.พยาบาล อารีรัตน์ (อาจารย์ตัวอย่าง)',
      email: 'nursing.demo@ku.th',
      studentId: 'fnrsdemo',
      department: 'ภาควิชาการพยาบาลพื้นฐาน, อาจารย์',
      role: 'TEACHER',
      status: 'ACTIVE'
    }
  });

  console.log(`Created Mock Student: ${student.name} (${student.id})`);
  console.log(`Created Mock Teacher: ${teacher.name} (${teacher.id})`);

  // 3. Create Demo Consumables Category & Items
  const conCat = await prisma.category.create({
    data: {
      code: 'DEMO-CON',
      name: 'เวชภัณฑ์และวัสดุสิ้นเปลืองทางการพยาบาล',
      type: 'CONSUMABLE',
      description: 'หมวดหมู่เวชภัณฑ์สิ้นเปลืองสำหรับการฝึกหัตถการ'
    }
  });

  const con1 = await prisma.item.create({
    data: {
      code: 'DEMO-CON-001',
      name: 'ถุงมือตรวจโรคปราศจากเชื้อ เบอร์ 7 (Sterile Gloves)',
      type: 'CONSUMABLE',
      categoryId: conCat.id,
      unit: 'คู่',
      usageUnit: 'คู่',
      conversionRatio: 1,
      minStockAlert: 50,
      brand: 'TopGlove',
      model: 'Powder-Free Surgical',
      description: 'ถุงมือยางสเตอร์ไรด์ชนิดไม่มีแป้ง สำหรับหัตถการปลอดเชื้อ'
    }
  });

  const con2 = await prisma.item.create({
    data: {
      code: 'DEMO-CON-002',
      name: 'ผ้าก๊อซพับปลอดเชื้อ 4x4 นิ้ว (Gauze Pack 10)',
      type: 'CONSUMABLE',
      categoryId: conCat.id,
      unit: 'ซอง',
      usageUnit: 'แผ่น',
      conversionRatio: 10,
      minStockAlert: 30,
      brand: 'ThaiGauze',
      model: '100% Pure Cotton USP',
      description: 'ผ้าก๊อซซับของเหลวและทำแผล ปราศจากเชื้อ'
    }
  });

  const con3 = await prisma.item.create({
    data: {
      code: 'DEMO-CON-003',
      name: 'กระบอกฉีดยา Syringe 10 ml พร้อมเข็ม',
      type: 'CONSUMABLE',
      categoryId: conCat.id,
      unit: 'ชุด',
      usageUnit: 'ชุด',
      conversionRatio: 1,
      minStockAlert: 40,
      brand: 'Terumo',
      model: 'Luer Lock 10ml',
      description: 'กระบอกฉีดยาพลาสติกปลอดเชื้อ สำหรับดูดและจ่ายยา'
    }
  });

  // 4. Create Demo Courses with Fictional Instructor Names
  const c1 = await prisma.course.create({
    data: {
      code: 'DEMO-NUR1201',
      name: 'การพยาบาลพื้นฐาน (Fundamental of Nursing)',
      semester: '1',
      academicYear: '2569',
      instructorName: 'อาจารย์ ดร.วิชาการ เชี่ยวชาญ (อาจารย์ตัวอย่าง)',
      description: 'วิชาฝึกปฏิบัติการทักษะพื้นฐานทางการพยาบาลและการดูแลผู้ป่วยเบื้องต้น',
      allocatedBudget: 65000
    }
  });

  const c2 = await prisma.course.create({
    data: {
      code: 'DEMO-NUR2201',
      name: 'การพยาบาลผู้ใหญ่และผู้สูงอายุ 1 (Adult Nursing I)',
      semester: '1',
      academicYear: '2569',
      instructorName: teacher.name,
      description: 'วิชาฝึกปฏิบัติการดูแลผู้ป่วยโรคเรื้อรังและภาวะเฉียบพลัน',
      allocatedBudget: 90000
    }
  });

  // 5. Find Real Equipment Items (for reference only, unedited)
  const eqItems = await prisma.item.findMany({
    where: { type: 'EQUIPMENT' },
    take: 4
  });

  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(16, 30, 0, 0);

  const dueIn2Days = new Date(now.getTime() + 2 * 24 * 3600 * 1000);
  dueIn2Days.setHours(16, 30, 0, 0);

  const dueIn5Days = new Date(now.getTime() + 5 * 24 * 3600 * 1000);
  dueIn5Days.setHours(16, 30, 0, 0);

  const past10Days = new Date(now.getTime() - 10 * 24 * 3600 * 1000);
  const past7Days = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  // 6. Create Borrow Requests for Mock Student
  // 6.1 DUE TODAY (Orange Alert Badge)
  const br1 = await prisma.borrowRequest.create({
    data: {
      requestNumber: 'REQ-DEMO-2609-0001',
      userId: student.id,
      courseId: c1.id,
      purpose: 'ฝึกทักษะการทำแผลปลอดเชื้อและตัดไหม ณ ห้อง Lab 1 [DEMO]',
      borrowDate: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
      expectedReturnDate: todayEnd,
      status: 'BORROWED',
      advisorName: teacher.name,
      instructorAcknowledged: true,
      approverId: teacher.id,
      approvedAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000)
    }
  });
  if (eqItems[0]) {
    await prisma.borrowItem.create({
      data: { borrowRequestId: br1.id, itemId: eqItems[0].id, quantity: 1 }
    });
  }

  // 6.2 DUE IN 2 DAYS (Yellow Alert Badge)
  const br2 = await prisma.borrowRequest.create({
    data: {
      requestNumber: 'REQ-DEMO-2609-0002',
      userId: student.id,
      courseId: c2.id,
      purpose: 'ฝึกวัดสัญญาณชีพและการตรวจร่างกายผู้ป่วย ณ ห้อง Lab 2 [DEMO]',
      borrowDate: new Date(now.getTime() - 1 * 24 * 3600 * 1000),
      expectedReturnDate: dueIn2Days,
      status: 'BORROWED',
      advisorName: teacher.name,
      instructorAcknowledged: true,
      approverId: teacher.id,
      approvedAt: new Date(now.getTime() - 1 * 24 * 3600 * 1000)
    }
  });
  if (eqItems[1]) {
    await prisma.borrowItem.create({
      data: { borrowRequestId: br2.id, itemId: eqItems[1].id, quantity: 2 }
    });
  }

  // 6.3 APPROVED (Blue Normal Badge)
  const br3 = await prisma.borrowRequest.create({
    data: {
      requestNumber: 'REQ-DEMO-2609-0003',
      userId: student.id,
      courseId: c1.id,
      purpose: 'ฝึกตรวจระบบประสาทและอวัยวะพิเศษ [DEMO]',
      borrowDate: new Date(now.getTime() + 1 * 24 * 3600 * 1000),
      expectedReturnDate: dueIn5Days,
      status: 'APPROVED',
      advisorName: teacher.name,
      instructorAcknowledged: true,
      approverId: teacher.id,
      approvedAt: now
    }
  });
  if (eqItems[2]) {
    await prisma.borrowItem.create({
      data: { borrowRequestId: br3.id, itemId: eqItems[2].id, quantity: 1 }
    });
  }

  // 6.4 PENDING (Awaiting Teacher Approval - shows in /approvals!)
  const br4 = await prisma.borrowRequest.create({
    data: {
      requestNumber: 'REQ-DEMO-2609-0004',
      userId: student.id,
      courseId: c2.id,
      purpose: 'ฝึกการช่วยฟื้นคืนชีพขั้นพื้นฐาน (CPR & Defibrillation) เตรียมสอบ OSCE [DEMO]',
      borrowDate: new Date(now.getTime() + 2 * 24 * 3600 * 1000),
      expectedReturnDate: new Date(now.getTime() + 4 * 24 * 3600 * 1000),
      status: 'PENDING',
      advisorName: teacher.name,
      instructorAcknowledged: false
    }
  });
  if (eqItems[0]) {
    await prisma.borrowItem.create({
      data: { borrowRequestId: br4.id, itemId: eqItems[0].id, quantity: 1 }
    });
  }

  // 6.5 RETURNED COMPLETE (Green Badge)
  const br5 = await prisma.borrowRequest.create({
    data: {
      requestNumber: 'REQ-DEMO-2609-0005',
      userId: student.id,
      courseId: c1.id,
      purpose: 'ฝึกการให้สารน้ำทางหลอดเลือดดำ (IV Infusion) [DEMO]',
      borrowDate: past10Days,
      expectedReturnDate: past7Days,
      actualReturnDate: past7Days,
      status: 'RETURNED_COMPLETE',
      advisorName: teacher.name,
      instructorAcknowledged: true,
      approverId: teacher.id,
      returnNote: 'ส่งคืนครบถ้วน อุปกรณ์อยู่ในสภาพสมบูรณ์เรียบร้อย'
    }
  });
  if (eqItems[1]) {
    await prisma.borrowItem.create({
      data: { borrowRequestId: br5.id, itemId: eqItems[1].id, quantity: 1, isReturned: true }
    });
  }

  // 7. Create Requisitions for Mock Student
  // 7.1 Pending Requisition (for Teacher approval)
  const rq1 = await prisma.requisitionRequest.create({
    data: {
      requestNumber: 'REQ-DEMO-MAT-01',
      userId: student.id,
      courseId: c2.id,
      purpose: 'ขอเบิกเวชภัณฑ์สำหรับฝึกหัตถการใส่สายสวนปัสสาวะ [DEMO]',
      dateNeeded: dueIn2Days,
      status: 'PENDING',
      advisorName: teacher.name,
      totalCost: 1450
    }
  });
  await prisma.requisitionItem.create({
    data: {
      requisitionRequestId: rq1.id,
      itemId: con1.id,
      quantityRequested: 10,
      unitCost: 45,
      totalCost: 450
    }
  });
  await prisma.requisitionItem.create({
    data: {
      requisitionRequestId: rq1.id,
      itemId: con2.id,
      quantityRequested: 20,
      unitCost: 50,
      totalCost: 1000
    }
  });

  // 7.2 Dispensed Requisition (shows in Courses Cost Tracking)
  const rq2 = await prisma.requisitionRequest.create({
    data: {
      requestNumber: 'REQ-DEMO-MAT-02',
      userId: student.id,
      courseId: c1.id,
      purpose: 'เบิกวัสดุฝึกปฏิบัติการปฐมพยาบาลและการทำแผล ประจำสัปดาห์ที่ 3 [DEMO]',
      dateNeeded: past10Days,
      status: 'DISPENSED',
      advisorName: 'อาจารย์ ดร.วิชาการ เชี่ยวชาญ (อาจารย์ตัวอย่าง)',
      approverId: teacher.id,
      dispensedAt: past7Days,
      totalCost: 5200
    }
  });
  await prisma.requisitionItem.create({
    data: {
      requisitionRequestId: rq2.id,
      itemId: con2.id,
      quantityRequested: 50,
      quantityDispensed: 50,
      unitCost: 35,
      totalCost: 1750
    }
  });
  await prisma.requisitionItem.create({
    data: {
      requisitionRequestId: rq2.id,
      itemId: con3.id,
      quantityRequested: 30,
      quantityDispensed: 30,
      unitCost: 25,
      totalCost: 750
    }
  });

  // 8. Practice Rooms & Slots
  let rooms = await prisma.practiceRoom.findMany();
  if (rooms.length === 0) {
    const r1 = await prisma.practiceRoom.create({
      data: {
        code: 'LAB-SIM-01',
        name: 'ห้องปฏิบัติการทักษะพื้นฐานทางการพยาบาล 1 (Skill Lab 1)',
        location: 'อาคาร 2 ชั้น 3 ห้อง 2301',
        capacity: 12
      }
    });
    const r2 = await prisma.practiceRoom.create({
      data: {
        code: 'LAB-SIM-02',
        name: 'ห้องปฏิบัติการการพยาบาลผู้ใหญ่และภาวะวิกฤต (Adult & ICU Lab)',
        location: 'อาคาร 2 ชั้น 3 ห้อง 2302',
        capacity: 10
      }
    });
    const r3 = await prisma.practiceRoom.create({
      data: {
        code: 'LAB-SIM-03',
        name: 'ห้องปฏิบัติการมารดา ทารก และการผดุงครรภ์ (Maternal & Child Lab)',
        location: 'อาคาร 2 ชั้น 3 ห้อง 2303',
        capacity: 8
      }
    });
    rooms = [r1, r2, r3];
  }

  // Create slots for today and tomorrow
  const todayDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const slotTodayMorning = await prisma.practiceSlot.create({
    data: {
      roomId: rooms[0].id,
      date: todayDateObj,
      startTime: '09:00',
      endTime: '12:00',
      maxCapacity: 6,
      isOpen: true,
      closeReason: '[DEMO]',
      availableSkills: 'การทำแผลปลอดเชื้อ, การวัดสัญญาณชีพ, การดูดเสมหะ'
    }
  });

  const slotTodayAfternoon = await prisma.practiceSlot.create({
    data: {
      roomId: rooms[1]?.id || rooms[0].id,
      date: todayDateObj,
      startTime: '13:00',
      endTime: '16:00',
      maxCapacity: 6,
      isOpen: true,
      closeReason: '[DEMO]',
      availableSkills: 'การช่วยฟื้นคืนชีพขั้นสูง CPR, การใช้เครื่อง Defibrillator'
    }
  });

  const tomorrowDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const slotTomorrowAfternoon = await prisma.practiceSlot.create({
    data: {
      roomId: rooms[2]?.id || rooms[0].id,
      date: tomorrowDateObj,
      startTime: '13:00',
      endTime: '16:00',
      maxCapacity: 6,
      isOpen: true,
      closeReason: '[DEMO]',
      availableSkills: 'การทำคลอดปกติ, การตรวจทารกแรกเกิด'
    }
  });

  // 9. Create Approved Practice Booking for Mock Student with QR Pass!
  const booking = await prisma.practiceBooking.create({
    data: {
      bookingNumber: 'PB-DEMO-2609-0001',
      userId: student.id,
      slotId: slotTodayAfternoon.id,
      skillTopic: 'การฝึกทักษะการทำแผลปลอดเชื้อ (Dressing) และการสวนปัสสาวะ (Foley)',
      objectives: 'ฝึกซ้อมเพื่อเตรียมสอบประเมินสมรรถนะทางคลินิก (OSCE Exam) ร่วมกับเพื่อนในกลุ่ม [DEMO]',
      advisorName: teacher.name,
      courseId: c2.id,
      status: 'APPROVED',
      approverId: teacher.id,
      approvedAt: now,
      additionalEquipment: 'หุ่นฝึกสวนปัสสาวะหญิง, ถุงมือเบอร์ 6.5, ผ้าก๊อซแพ็ค 10',
      notes: 'สมาชิกกลุ่ม: 1. นางสาวสมหญิง ใจดี (หัวหน้ากลุ่ม) 2. นายรักเรียน ขยันยิ่ง 3. นางสาวกานดา สดใส'
    }
  });

  console.log(`Created Practice Booking: ${booking.bookingNumber} with QR Token: ${booking.qrCodeToken}`);
  console.log('--- DEMO DATA SEEDED WITH STRICTLY MOCK/FICTIONAL NAMES ---');
  await prisma.$disconnect();
}

seed().catch(err => {
  console.error('Seed error:', err);
  prisma.$disconnect();
});
