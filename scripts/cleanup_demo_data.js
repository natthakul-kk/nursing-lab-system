const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log('--- STARTING DEMO DATA CLEANUP ---');

  // 1. Delete Demo Practice Booking Members & Bookings
  const demoBookings = await prisma.practiceBooking.findMany({
    where: { bookingNumber: { startsWith: 'PB-DEMO' } },
    select: { id: true }
  });
  if (demoBookings.length > 0) {
    const bIds = demoBookings.map(b => b.id);
    await prisma.practiceBookingMember.deleteMany({ where: { bookingId: { in: bIds } } });
    const delBookings = await prisma.practiceBooking.deleteMany({ where: { id: { in: bIds } } });
    console.log(`Deleted ${delBookings.count} demo practice bookings`);
  }

  // 2. Delete Demo Practice Slots
  const delSlots = await prisma.practiceSlot.deleteMany({
    where: { closeReason: { contains: '[DEMO]' } }
  });
  console.log(`Deleted ${delSlots.count} demo practice slots`);

  // 3. Delete Demo Practice Rooms if any
  const delRooms = await prisma.practiceRoom.deleteMany({
    where: { code: { startsWith: 'LAB-DEMO' } }
  });
  console.log(`Deleted ${delRooms.count} demo practice rooms`);

  // 4. Delete Demo Borrow Items & Requests
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

  // 5. Delete Demo Requisition Items & Requests
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

  // 6. Delete Demo Courses
  const delCourses = await prisma.course.deleteMany({
    where: { code: { startsWith: 'DEMO-' } }
  });
  console.log(`Deleted ${delCourses.count} demo courses`);

  console.log('--- CLEANUP COMPLETED: Master data intact ---');
  await prisma.$disconnect();
}

cleanup().catch(err => {
  console.error('Cleanup error:', err);
  prisma.$disconnect();
});
