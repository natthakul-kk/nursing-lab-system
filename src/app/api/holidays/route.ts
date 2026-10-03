import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Retrieve holidays (all or filtered by year/month)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    let whereClause: any = {};
    if (year && month) {
      const monthPadded = String(month).padStart(2, '0');
      whereClause.dateStr = { startsWith: `${year}-${monthPadded}` };
    } else if (year) {
      whereClause.dateStr = { startsWith: `${year}-` };
    }

    const holidays = await prisma.customHoliday.findMany({
      where: whereClause,
      orderBy: { dateStr: 'asc' },
    });

    const holidaysMap: Record<string, string> = {};
    holidays.forEach((h) => {
      holidaysMap[h.dateStr] = h.name;
    });

    return NextResponse.json({
      success: true,
      holidays,
      holidaysMap,
    });
  } catch (error: any) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add or update a custom holiday
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { dateStr, name, description, createdById } = body;

    if (!dateStr || !name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุวันที่และชื่อวันหยุด' },
        { status: 400 }
      );
    }

    const holiday = await prisma.customHoliday.upsert({
      where: { dateStr },
      update: {
        name: name.trim(),
        description: description?.trim() || null,
      },
      create: {
        dateStr,
        name: name.trim(),
        description: description?.trim() || null,
        createdById: createdById || null,
      },
    });

    return NextResponse.json({
      success: true,
      holiday,
      message: `บันทึกวันหยุดพิเศษ "${holiday.name}" เรียบร้อยแล้ว`,
    });
  } catch (error: any) {
    console.error('Error creating holiday:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a custom holiday
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('dateStr');

    if (!dateStr) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุวันที่ที่ต้องการลบวันหยุด' },
        { status: 400 }
      );
    }

    await prisma.customHoliday.deleteMany({
      where: { dateStr },
    });

    return NextResponse.json({
      success: true,
      message: `ยกเลิกวันหยุดพิเศษของวันที่ ${dateStr} เรียบร้อยแล้ว`,
    });
  } catch (error: any) {
    console.error('Error deleting holiday:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
