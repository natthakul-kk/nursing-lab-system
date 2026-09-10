const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log('--- STARTING DEMO DATA CLEANUP ---');

  // 1. Delete Demo Practice Bookings
  const delBookings = await prisma.practiceBooking.deleteMany({
    where: { bookingNumber: { startsWith: 'PB-DEMO' } }
  });
  console.log(`Deleted ${delBookings.count} demo practice bookings`);

  // 2. Delete Demo Practice Slots
  const delSlots = await prisma.practiceSlot.deleteMany({
    where: { closeReason: { contains: '[DEMO]' } }
  });
  console.log(`Deleted ${delSlots.count} demo practice slots`);

  // 3. Delete Demo Borrow Items & Requests
  const demoBorrows = await prisma.borrowRequest.findMany({
    where: { requestNumber: { startsWith: 'REQ-DEMO' } },
    select: { id: true }
  });
  if (demoBorrows.length > 0) {
    const brIds = demoBorrows.map(b => b.id);
    await prisma.borrowItem.deleteMany({ where: { borrowRequestId: { in: brIds } } });
    const delBorrows = await prisma.borrowRequest.deleteMany({ where: { id: { in: brIds } } });
    console.log(`Deleted ${delBorrows.count} demo borrow requests`);
  }

  // 4. Delete Demo Requisition Items & Requests
  const demoReqs = await prisma.requisitionRequest.findMany({
    where: { requestNumber: { startsWith: 'REQ-DEMO' } },
    select: { id: true }
  });
  if (demoReqs.length > 0) {
    const reqIds = demoReqs.map(r => r.id);
    await prisma.requisitionItem.deleteMany({ where: { requisitionRequestId: { in: reqIds } } });
    const delReqs = await prisma.requisitionRequest.deleteMany({ where: { id: { in: reqIds } } });
    console.log(`Deleted ${delReqs.count} demo requisition requests`);
  }

  // 5. Delete Demo Courses
  const delCourses = await prisma.course.deleteMany({
    where: { code: { startsWith: 'DEMO-' } }
  });
  console.log(`Deleted ${delCourses.count} demo courses`);

  // 6. Delete Demo Consumables & Category
  const delItems = await prisma.item.deleteMany({
    where: { code: { startsWith: 'DEMO-' } }
  });
  console.log(`Deleted ${delItems.count} demo items`);

  const delCats = await prisma.category.deleteMany({
    where: { code: { startsWith: 'DEMO-' } }
  });
  console.log(`Deleted ${delCats.count} demo categories`);

  // 7. Delete Mock Users
  const delUsers = await prisma.user.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'demo-' } },
        { email: { contains: '.demo@ku.th' } },
        { studentId: '6811799999' }
      ]
    }
  });
  console.log(`Deleted ${delUsers.count} mock users`);

  console.log('--- CLEANUP COMPLETED: Master data intact ---');
  await prisma.$disconnect();
}

cleanup().catch(err => {
  console.error('Cleanup error:', err);
  prisma.$disconnect();
});
