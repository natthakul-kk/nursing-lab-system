import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import { formatTeacherName } from '@/lib/user-utils';

// GET: Fetch single course by ID
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลรายวิชา' }, { status: 404 });
    }

    return NextResponse.json(course);
  } catch (error) {
    console.error('Failed to fetch course:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายวิชา' }, { status: 500 });
  }
}

// PUT: Full update of course details
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const {
      code,
      name,
      semester,
      academicYear,
      instructorName,
      description,
      allocatedBudget,
      status,
    } = body;

    if (!code?.trim() || !name?.trim() || !instructorName?.trim()) {
      return NextResponse.json(
        { error: 'กรุณากรอกรหัสวิชา ชื่อวิชา และอาจารย์ผู้ประสานงานให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // Check code uniqueness excluding this course
    const existing = await prisma.course.findFirst({
      where: {
        code: code.trim(),
        NOT: { id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `รหัสวิชา "${code.trim()}" มีอยู่ในระบบแล้ว (${existing.name})` },
        { status: 400 }
      );
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        code: code.trim(),
        name: name.trim(),
        semester: semester ? String(semester) : '1',
        academicYear: academicYear ? String(academicYear) : '2569',
        instructorName: formatTeacherName(instructorName),
        description: description !== undefined ? description : null,
        allocatedBudget: Number(allocatedBudget) >= 0 ? Number(allocatedBudget) : 0,
        status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      },
    });

    invalidateCache('courses_');
    invalidateCache('dashboard:');

    return NextResponse.json({
      success: true,
      message: 'อัปเดตข้อมูลรายวิชาสำเร็จ',
      course: updated,
    });
  } catch (error: any) {
    console.error('Update course error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลรายวิชา' },
      { status: 500 }
    );
  }
}

// PATCH: Quick toggle open/close status (ACTIVE / INACTIVE)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
      return NextResponse.json(
        { error: 'สถานะไม่ถูกต้อง (ต้องเป็น ACTIVE หรือ INACTIVE)' },
        { status: 400 }
      );
    }

    const updated = await prisma.course.update({
      where: { id },
      data: { status },
    });

    invalidateCache('courses_');
    invalidateCache('dashboard:');

    const statusText = status === 'ACTIVE' ? 'เปิดการเรียนการสอน (ACTIVE)' : 'ปิดรายวิชาแล้ว (INACTIVE)';

    return NextResponse.json({
      success: true,
      message: `เปลี่ยนสถานะรายวิชาเป็น "${statusText}" เรียบร้อยแล้ว`,
      course: updated,
    });
  } catch (error: any) {
    console.error('Toggle course status error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะรายวิชา' },
      { status: 500 }
    );
  }
}

// DELETE: Safe deletion or soft-delete
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            requisitionRequests: true,
            borrowRequests: true,
            practiceBookings: true,
            roomBookings: true,
            stockTransactions: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลรายวิชา' }, { status: 404 });
    }

    const totalUsage =
      course._count.requisitionRequests +
      course._count.borrowRequests +
      course._count.practiceBookings +
      course._count.roomBookings +
      course._count.stockTransactions;

    if (totalUsage > 0) {
      await prisma.course.update({
        where: { id },
        data: { status: 'INACTIVE' },
      });

      invalidateCache('courses_');
      invalidateCache('dashboard:');

      return NextResponse.json({
        success: true,
        softDeleted: true,
        message: `รายวิชานี้มีประวัติการเบิก/ยืม/จองห้อง ${totalUsage} รายการ ระบบจึงเปลี่ยนสถานะเป็น "ปิดรายวิชา (INACTIVE)" เพื่อเก็บรักษาประวัติความถูกต้องทางบัญชีและสต็อก`,
      });
    }

    await prisma.course.delete({
      where: { id },
    });

    invalidateCache('courses_');
    invalidateCache('dashboard:');

    return NextResponse.json({
      success: true,
      message: 'ลบข้อมูลรายวิชาเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('Delete course error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการลบรายวิชา' },
      { status: 500 }
    );
  }
}
