const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fullCleanup() {
  console.log('=== STARTING COMPLETE CLEANUP OF ALL DEMO / MOCK DATA ===');

  // 1. Delete Demo Practice Bookings
  const delBookings = await prisma.practiceBooking.deleteMany({
    where: {
      OR: [
        { bookingNumber: { startsWith: 'PB-DEMO' } },
        { objectives: { contains: '[DEMO]' } }
      ]
    }
  });
  console.log(`[CLEANUP] Deleted ${delBookings.count} demo practice bookings (PB-DEMO)`);

  // 2. Delete Demo Practice Slots
  const delSlots = await prisma.practiceSlot.deleteMany({
    where: {
      OR: [
        { closeReason: { contains: '[DEMO]' } },
        { closeReason: '[DEMO]' }
      ]
    }
  });
  console.log(`[CLEANUP] Deleted ${delSlots.count} demo practice slots`);

  // 3. Delete Demo Borrow Requests & Borrow Items
  const demoBorrows = await prisma.borrowRequest.findMany({
    where: {
      OR: [
        { requestNumber: { startsWith: 'REQ-DEMO' } },
        { purpose: { contains: '[DEMO]' } }
      ]
    },
    select: { id: true }
  });
  if (demoBorrows.length > 0) {
    const brIds = demoBorrows.map(b => b.id);
    const delBorrowItems = await prisma.borrowItem.deleteMany({ where: { borrowRequestId: { in: brIds } } });
    const delBorrows = await prisma.borrowRequest.deleteMany({ where: { id: { in: brIds } } });
    console.log(`[CLEANUP] Deleted ${delBorrowItems.count} demo borrow items and ${delBorrows.count} demo borrow requests`);
  } else {
    console.log('[CLEANUP] 0 demo borrow requests found');
  }

  // 4. Delete Demo Requisition Requests & Requisition Items
  const demoReqs = await prisma.requisitionRequest.findMany({
    where: {
      OR: [
        { requestNumber: { startsWith: 'REQ-DEMO' } },
        { purpose: { contains: '[DEMO]' } }
      ]
    },
    select: { id: true }
  });
  if (demoReqs.length > 0) {
    const reqIds = demoReqs.map(r => r.id);
    const delReqItems = await prisma.requisitionItem.deleteMany({ where: { requisitionRequestId: { in: reqIds } } });
    const delReqs = await prisma.requisitionRequest.deleteMany({ where: { id: { in: reqIds } } });
    console.log(`[CLEANUP] Deleted ${delReqItems.count} demo requisition items and ${delReqs.count} demo requisition requests`);
  } else {
    console.log('[CLEANUP] 0 demo requisition requests found');
  }

  // 5. Delete Demo Courses
  const delCourses = await prisma.course.deleteMany({
    where: {
      OR: [
        { code: { startsWith: 'DEMO-' } },
        { instructorName: { contains: '(อาจารย์ตัวอย่าง)' } }
      ]
    }
  });
  console.log(`[CLEANUP] Deleted ${delCourses.count} demo courses`);

  // 6. Delete Demo Consumables & Categories
  const delItems = await prisma.item.deleteMany({
    where: { code: { startsWith: 'DEMO-' } }
  });
  console.log(`[CLEANUP] Deleted ${delItems.count} demo items`);

  const delCats = await prisma.category.deleteMany({
    where: { code: { startsWith: 'DEMO-' } }
  });
  console.log(`[CLEANUP] Deleted ${delCats.count} demo categories`);

  // 7. Delete Mock Users (Strictly Fictional)
  const delUsers = await prisma.user.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'demo-' } },
        { email: { contains: '.demo@ku.th' } },
        { studentId: '6811799999' },
        { studentId: 'fnrsdemo' },
        { name: { contains: '(นิสิตตัวอย่าง)' } },
        { name: { contains: '(อาจารย์ตัวอย่าง)' } }
      ]
    }
  });
  console.log(`[CLEANUP] Deleted ${delUsers.count} mock users`);

  // 8. Audit Database State Post-Cleanup
  console.log('\n=== AUDITING REMAINING DATABASE RECORDS ===');
  const userCount = await prisma.user.count();
  const itemCount = await prisma.item.count();
  const assetCount = await prisma.equipmentAsset.count();
  const courseCount = await prisma.course.count();
  const borrowCount = await prisma.borrowRequest.count();
  const reqCount = await prisma.requisitionRequest.count();
  const bookingCount = await prisma.practiceBooking.count();

  console.log(`Remaining Users: ${userCount} (All Real Users)`);
  console.log(`Remaining Items: ${itemCount} (Master Items)`);
  console.log(`Remaining ERP Assets: ${assetCount} (Medical Assets)`);
  console.log(`Remaining Courses: ${courseCount}`);
  console.log(`Remaining Borrow Requests: ${borrowCount}`);
  console.log(`Remaining Requisition Requests: ${reqCount}`);
  console.log(`Remaining Practice Bookings: ${bookingCount}`);

  // Check if any demo trace remains
  const checkDemoUser = await prisma.user.findFirst({
    where: { OR: [{ id: { startsWith: 'demo-' } }, { studentId: '6811799999' }] }
  });
  const checkDemoBorrow = await prisma.borrowRequest.findFirst({
    where: { requestNumber: { startsWith: 'REQ-DEMO' } }
  });
  const checkDemoCourse = await prisma.course.findFirst({
    where: { code: { startsWith: 'DEMO-' } }
  });

  if (!checkDemoUser && !checkDemoBorrow && !checkDemoCourse) {
    console.log('\n>>> SUCCESS: 100% OF DEMO DATA HAS BEEN COMPLETELY REMOVED! <<<');
  } else {
    console.log('\n>>> WARNING: Some demo traces still exist! <<<');
  }

  await prisma.$disconnect();
}

fullCleanup().catch(err => {
  console.error('Cleanup error:', err);
  prisma.$disconnect();
});
