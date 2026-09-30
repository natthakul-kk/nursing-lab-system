import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper: Calculate hours between two "HH:mm" strings
function calculateHours(openTime?: string | null, closeTime?: string | null): number {
  if (!openTime || !closeTime) return 0;
  try {
    const [h1, m1] = openTime.split(':').map(Number);
    const [h2, m2] = closeTime.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
    const minutes1 = h1 * 60 + m1;
    const minutes2 = h2 * 60 + m2;
    if (minutes2 <= minutes1) return 0;
    const diff = (minutes2 - minutes1) / 60;
    return Math.round(diff * 10) / 10;
  } catch {
    return 0;
  }
}

// GET: Retrieve AC Operation Logs for a given month and year
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const roomIdsParam = searchParams.get('roomIds');

    // Calculate start and end date of the month (UTC)
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const daysInMonth = new Date(year, month, 0).getDate();

    // Fetch rooms
    let roomFilter: any = { isActive: true };
    if (roomIdsParam) {
      const ids = roomIdsParam.split(',').filter(Boolean);
      if (ids.length > 0) {
        roomFilter = { id: { in: ids } };
      }
    }

    const rooms = await prisma.practiceRoom.findMany({
      where: roomFilter,
      select: { id: true, code: true, name: true, location: true },
      orderBy: { code: 'asc' },
    });

    // Fetch existing logs
    const logs = await prisma.acOperationLog.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        roomId: { in: rooms.map((r) => r.id) },
      },
      include: {
        recordedBy: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Organize logs map: dateStr (YYYY-MM-DD) -> roomId -> log
    const logsMap: Record<string, Record<string, any>> = {};
    logs.forEach((log) => {
      const dateStr = log.date.toISOString().split('T')[0];
      if (!logsMap[dateStr]) logsMap[dateStr] = {};
      logsMap[dateStr][log.roomId] = log;
    });

    return NextResponse.json({
      success: true,
      month,
      year,
      yearBE: year + 543,
      daysInMonth,
      rooms,
      logsMap,
      rawLogsCount: logs.length,
    });
  } catch (error: any) {
    console.error('Error fetching AC logs:', error);
    return NextResponse.json(
      { error: error.message || 'ไม่สามารถโหลดข้อมูลการเปิด-ปิดแอร์ได้' },
      { status: 500 }
    );
  }
}

// POST: Save or Update AC Operation Log(s)
// Restricted to OFFICER and ADMIN
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { logs, userId } = body;

    // Verify creator / user
    let currentUser: any = null;
    if (userId) {
      currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, role: true },
      });
    }

    // Role check: Only OFFICER and ADMIN
    if (currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'OFFICER') {
      return NextResponse.json(
        { error: 'เฉพาะเจ้าหน้าที่และผู้ดูแลระบบเท่านั้นที่มีสิทธิ์บันทึกการเปิด-ปิดแอร์' },
        { status: 403 }
      );
    }

    if (!Array.isArray(logs) || logs.length === 0) {
      return NextResponse.json({ error: 'กรุณาระบุข้อมูลบันทึกการเปิด-ปิดแอร์' }, { status: 400 });
    }

    const results: any[] = [];

    await prisma.$transaction(async (tx) => {
      for (const entry of logs) {
        const {
          roomId,
          dateStr, // "YYYY-MM-DD"
          openTime,
          closeTime,
          temperature,
          purpose,
          sessions, // optional array: [{ openTime, closeTime, hours, temperature, purpose }]
          note,
        } = entry;

        if (!roomId || !dateStr) continue;

        // Parse date to UTC midnight
        const [y, m, d] = dateStr.split('-').map(Number);
        const recordDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));

        let totalHours = 0;
        let finalSessionsJson: string | null = null;

        if (Array.isArray(sessions) && sessions.length > 0) {
          // Calculate sum of hours across all sessions
          totalHours = sessions.reduce((acc: number, s: any) => {
            const h = s.hours != null ? Number(s.hours) : calculateHours(s.openTime, s.closeTime);
            return acc + h;
          }, 0);
          totalHours = Math.round(totalHours * 10) / 10;
          finalSessionsJson = JSON.stringify(sessions);
        } else {
          totalHours = calculateHours(openTime, closeTime);
          if (openTime && closeTime) {
            finalSessionsJson = JSON.stringify([
              {
                openTime,
                closeTime,
                hours: totalHours,
                temperature: temperature || 22.0,
                purpose: purpose || 'เปิดเพื่อรักษาอุปกรณ์',
              },
            ]);
          }
        }

        const upserted = await tx.acOperationLog.upsert({
          where: {
            roomId_date: {
              roomId,
              date: recordDate,
            },
          },
          update: {
            openTime: openTime || null,
            closeTime: closeTime || null,
            usageHours: totalHours,
            temperature: temperature != null ? Number(temperature) : 22.0,
            purpose: purpose || 'เปิดเพื่อรักษาอุปกรณ์',
            sessionsJson: finalSessionsJson,
            recordedById: currentUser?.id || null,
            recordedName: currentUser?.name || 'เจ้าหน้าที่ห้องปฏิบัติการ',
            note: note || null,
          },
          create: {
            roomId,
            date: recordDate,
            openTime: openTime || null,
            closeTime: closeTime || null,
            usageHours: totalHours,
            temperature: temperature != null ? Number(temperature) : 22.0,
            purpose: purpose || 'เปิดเพื่อรักษาอุปกรณ์',
            sessionsJson: finalSessionsJson,
            recordedById: currentUser?.id || null,
            recordedName: currentUser?.name || 'เจ้าหน้าที่ห้องปฏิบัติการ',
            note: note || null,
          },
        });

        results.push(upserted);
      }
    });

    return NextResponse.json({
      success: true,
      message: `บันทึกข้อมูลการเปิด-ปิดเครื่องปรับอากาศสำเร็จ ${results.length} รายการ`,
      count: results.length,
    });
  } catch (error: any) {
    console.error('Error saving AC log:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลเครื่องปรับอากาศ' },
      { status: 500 }
    );
  }
}
