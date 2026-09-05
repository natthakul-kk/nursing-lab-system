import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Map Thai or common role words to valid UserRole
function normalizeRole(roleInput?: string): string {
  if (!roleInput) return 'USER';
  const r = roleInput.trim().toUpperCase();
  if (r === 'ADMIN' || r.includes('ผู้ดูแล') || r.includes('แอดมิน')) return 'ADMIN';
  if (r === 'OFFICER' || r.includes('เจ้าหน้าที่') || r.includes('แล็บ')) return 'OFFICER';
  if (r === 'APPROVER' || r.includes('อาจารย์') || r.includes('ผู้อนุมัติ') || r.includes('หัวหน้า')) return 'APPROVER';
  return 'USER';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { users } = body;

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ใช้งานที่ต้องการนำเข้า' }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const rowNum = i + 1;

      if (!u.name || !u.name.trim()) {
        errors.push(`แถวที่ ${rowNum}: กรุณาระบุชื่อ-นามสกุล`);
        continue;
      }

      // Generate or sanitize email
      let email = u.email ? String(u.email).trim().toLowerCase() : '';
      if (!email) {
        if (u.studentId) {
          email = `${String(u.studentId).trim()}@nu.ac.th`;
        } else {
          errors.push(`แถวที่ ${rowNum}: ไม่มีอีเมลหรือรหัสนิสิตสำหรับ [${u.name}]`);
          continue;
        }
      }

      const role = normalizeRole(u.role);
      const studentId = u.studentId ? String(u.studentId).trim() : null;
      const department = u.department ? String(u.department).trim() : 'คณะพยาบาลศาสตร์';
      const phone = u.phone ? String(u.phone).trim() : null;

      try {
        const existing = await prisma.user.findUnique({
          where: { email },
        });

        if (existing) {
          await prisma.user.update({
            where: { email },
            data: {
              name: u.name.trim(),
              role,
              studentId: studentId || existing.studentId,
              department: department || existing.department,
              phone: phone || existing.phone,
            },
          });
          updatedCount++;
        } else {
          await prisma.user.create({
            data: {
              name: u.name.trim(),
              email,
              role,
              studentId,
              department,
              phone,
            },
          });
          createdCount++;
        }
      } catch (err: any) {
        errors.push(`แถวที่ ${rowNum} (${u.name}): ${err.message || 'บันทึกล้มเหลว'}`);
      }
    }

    return NextResponse.json({
      success: true,
      total: users.length,
      createdCount,
      updatedCount,
      errors,
      message: `นำเข้าผู้ใช้งานเรียบร้อยแล้ว: เพิ่มใหม่ ${createdCount} คน, อัปเดตข้อมูล ${updatedCount} คน`,
    });
  } catch (error: any) {
    console.error('Bulk user import error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการประมวลผลการนำเข้าผู้ใช้' },
      { status: 500 }
    );
  }
}
