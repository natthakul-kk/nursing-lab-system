const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'OFFICER'] } },
    select: { id: true, name: true }
  });

  const recordedById = adminUser?.id || null;
  const recordedName = adminUser?.name || 'เจ้าหน้าที่ห้องปฏิบัติการ';

  // 4 Target Dates (UTC midnight)
  const targetDates = [
    { dateStr: '2026-08-04', thaiLabel: '4 สิงหาคม 2569' },
    { dateStr: '2026-08-05', thaiLabel: '5 สิงหาคม 2569' },
    { dateStr: '2026-08-11', thaiLabel: '11 สิงหาคม 2569' },
    { dateStr: '2026-08-18', thaiLabel: '18 สิงหาคม 2569' },
  ];

  // 8 Target Rooms based on user's prompt
  const roomConfigs = [
    { code: 'LAB-01-1', label: 'ห้อง พฐ 1/3', openTime: '12:30', closeTime: '16:30', hours: 4.0 },
    { code: 'LAB-01-2', label: 'ห้อง พฐ 2/3 (1/2)', openTime: '12:30', closeTime: '16:30', hours: 4.0 },
    { code: 'LAB-CS', label: 'ห้องเก็บวัสดุสิ้นเปลือง', openTime: '12:30', closeTime: '16:30', hours: 4.0 },
    { code: 'LAB-03', label: 'ห้องสุขภาพจิต', openTime: '12:30', closeTime: '17:00', hours: 4.5 },
    { code: 'LAB-06', label: 'ห้องผู้ใหญ่', openTime: '12:30', closeTime: '16:30', hours: 4.0 },
    { code: 'LAB-SIM-MAN', label: 'ห้อง SIM MAN', openTime: '12:30', closeTime: '16:30', hours: 4.0 },
    { code: 'LAB-SIM-MOM', label: 'ห้อง SIM MOM', openTime: '12:30', closeTime: '16:30', hours: 4.0 },
    { code: 'LAB-4', label: 'ห้องเด็ก', openTime: '12:30', closeTime: '16:30', hours: 4.0 },
  ];

  const dbRooms = await prisma.practiceRoom.findMany({
    where: { code: { in: roomConfigs.map(r => r.code) } },
    select: { id: true, code: true, name: true }
  });

  const roomMap = new Map(dbRooms.map(r => [r.code, r]));

  console.log(`Matched ${dbRooms.length} rooms in database.`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (const tDate of targetDates) {
    const [y, m, d] = tDate.dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));

    for (const rConfig of roomConfigs) {
      const room = roomMap.get(rConfig.code);
      if (!room) {
        console.warn(`Room code ${rConfig.code} not found!`);
        continue;
      }

      const sessionsJson = JSON.stringify([
        {
          openTime: rConfig.openTime,
          closeTime: rConfig.closeTime,
          hours: rConfig.hours,
          temperature: 24.0,
          purpose: 'การเรียนการสอนรายวิชา'
        }
      ]);

      const log = await prisma.acOperationLog.upsert({
        where: {
          roomId_date: {
            roomId: room.id,
            date: dateObj
          }
        },
        update: {
          openTime: rConfig.openTime,
          closeTime: rConfig.closeTime,
          usageHours: rConfig.hours,
          temperature: 24.0,
          purpose: 'การเรียนการสอนรายวิชา',
          sessionsJson,
          recordedById,
          recordedName,
          note: 'การเรียนการสอนตามตารางวิชา'
        },
        create: {
          roomId: room.id,
          date: dateObj,
          openTime: rConfig.openTime,
          closeTime: rConfig.closeTime,
          usageHours: rConfig.hours,
          temperature: 24.0,
          purpose: 'การเรียนการสอนรายวิชา',
          sessionsJson,
          recordedById,
          recordedName,
          note: 'การเรียนการสอนตามตารางวิชา'
        }
      });

      console.log(`[OK] ${tDate.dateStr} | ${room.code} (${room.name}) | ${rConfig.openTime}-${rConfig.closeTime} (${rConfig.hours} hrs)`);
      insertedCount++;
    }
  }

  console.log(`\nSuccessfully processed ${insertedCount} AC logs for August 2026.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
