const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'OFFICER'] } },
    select: { id: true, name: true }
  });

  const recordedById = adminUser?.id || null;
  const recordedName = adminUser?.name || 'ผู้ดูแลระบบกลาง (Admin)';

  const logsToInsert = [
    // 22 กันยายน 2569
    {
      dateStr: '2026-09-22',
      roomCode: 'LAB-07',
      openTime: '08:30',
      closeTime: '16:30',
      hours: 8.0,
      temperature: 24.0,
      purpose: 'การเรียนการสอนรายวิชา',
      note: 'อ.จิฬาวัจน์'
    },
    // 23 กันยายน 2569
    {
      dateStr: '2026-09-23',
      roomCode: 'LAB-03',
      openTime: '08:30',
      closeTime: '13:30',
      hours: 5.0,
      temperature: 24.0,
      purpose: 'การเรียนการสอนรายวิชา',
      note: 'อ.ชญาภรณ์'
    },
    {
      dateStr: '2026-09-23',
      roomCode: 'LAB-06',
      openTime: '08:30',
      closeTime: '16:30',
      hours: 8.0,
      temperature: 24.0,
      purpose: 'การเรียนการสอนรายวิชา',
      note: 'อ.มญช์พาณี'
    },
    {
      dateStr: '2026-09-23',
      roomCode: 'LAB-4',
      openTime: '08:30',
      closeTime: '16:30',
      hours: 8.0,
      temperature: 24.0,
      purpose: 'การเรียนการสอนรายวิชา',
      note: 'อ.อดิศา'
    }
  ];

  console.log(`Starting to seed ${logsToInsert.length} AC logs for September 2026...`);

  for (const item of logsToInsert) {
    const room = await prisma.practiceRoom.findFirst({
      where: { code: item.roomCode },
      select: { id: true, code: true, name: true }
    });

    if (!room) {
      console.error(`Room with code ${item.roomCode} not found!`);
      continue;
    }

    const [y, m, d] = item.dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));

    const sessionsJson = JSON.stringify([
      {
        openTime: item.openTime,
        closeTime: item.closeTime,
        hours: item.hours,
        temperature: item.temperature,
        purpose: item.purpose
      }
    ]);

    const result = await prisma.acOperationLog.upsert({
      where: {
        roomId_date: {
          roomId: room.id,
          date: dateObj
        }
      },
      update: {
        openTime: item.openTime,
        closeTime: item.closeTime,
        usageHours: item.hours,
        temperature: item.temperature,
        purpose: item.purpose,
        sessionsJson,
        recordedById,
        recordedName,
        note: item.note
      },
      create: {
        roomId: room.id,
        date: dateObj,
        openTime: item.openTime,
        closeTime: item.closeTime,
        usageHours: item.hours,
        temperature: item.temperature,
        purpose: item.purpose,
        sessionsJson,
        recordedById,
        recordedName,
        note: item.note
      }
    });

    console.log(`[SAVED] ${item.dateStr} | ${room.code} (${room.name}) | ${item.openTime}-${item.closeTime} (${item.hours}h) | note: ${item.note}`);
  }

  console.log('Seeding completed successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
