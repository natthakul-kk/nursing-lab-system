import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth-security';

// Map Thai or common role words to valid UserRole
function normalizeRole(roleInput?: string): string {
  if (!roleInput) return 'USER';
  const r = roleInput.trim().toUpperCase();
  if (r === 'ADMIN' || r.includes('ผู้ดูแล') || r.includes('แอดมิน')) return 'ADMIN';
  if (r === 'OFFICER' || r.includes('เจ้าหน้าที่') || r.includes('แล็บ')) return 'OFFICER';
  if (r === 'APPROVER' || r.includes('ผู้อนุมัติ') || r.includes('หัวหน้า')) return 'APPROVER';
  if (r === 'TEACHER' || r.includes('อาจารย์') || r.includes('ครู') || r.includes('ผู้สอน') || r.includes('ที่ปรึกษา')) return 'TEACHER';
  return 'USER';
}

// Robust extractor for Thai & English headers from Excel/CSV
function extractUserFromRow(row: Record<string, any>) {
  const map: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined || v === null) continue;
    const cleanKey = k.toString().trim().toLowerCase().replace(/[\s\-_/]/g, '');
    map[cleanKey] = typeof v === 'string' ? v.trim() : v;
    map[k.trim()] = typeof v === 'string' ? v.trim() : v;
  }

  // 1. Name
  const name =
    map['ชื่อนามสกุล'] ||
    map['ชื่อสกุล'] ||
    map['ชื่อ'] ||
    map['ชื่อจริง'] ||
    map['name'] ||
    map['fullname'] ||
    map['studentname'] ||
    row['ชื่อ-นามสกุล'] ||
    row['ชื่อ - สกุล'] ||
    row['ชื่อ นามสกุล'] ||
    row['ชื่อ'] ||
    row['name'] ||
    row['Name'] ||
    '';

  // 2. Email
  const email =
    map['อีเมล'] ||
    map['อีเมล์'] ||
    map['email'] ||
    map['mail'] ||
    map['emailaddress'] ||
    row['อีเมล'] ||
    row['อีเมล์'] ||
    row['email'] ||
    row['Email'] ||
    '';

  // 3. Student ID / ID
  const studentId =
    map['รหัสนิสิตบุคลากร'] ||
    map['รหัสนิสิต'] ||
    map['รหัสประจำตัว'] ||
    map['รหัสบุคลากร'] ||
    map['รหัสนักศึกษา'] ||
    map['รหัส'] ||
    map['studentid'] ||
    map['studentcode'] ||
    map['id'] ||
    row['รหัสนิสิต/บุคลากร'] ||
    row['รหัสนิสิต'] ||
    row['รหัสประจำตัว'] ||
    row['รหัส'] ||
    row['studentId'] ||
    row['StudentID'] ||
    row['ID'] ||
    '';

  // 4. Role
  const role =
    map['บทบาท'] ||
    map['ตำแหน่ง'] ||
    map['สิทธิ์'] ||
    map['สถานะ'] ||
    map['role'] ||
    row['บทบาท'] ||
    row['role'] ||
    row['Role'] ||
    '';

  // 5. Department
  const department =
    map['ภาควิชาคณะ'] ||
    map['ภาควิชา'] ||
    map['สาขาวิชา'] ||
    map['สาขา'] ||
    map['คณะ'] ||
    map['department'] ||
    row['ภาควิชา/คณะ'] ||
    row['ภาควิชา'] ||
    row['department'] ||
    row['Department'] ||
    '';

  // 6. Phone
  const phone =
    map['เบอร์โทร'] ||
    map['เบอร์โทรศัพท์'] ||
    map['โทรศัพท์'] ||
    map['เบอร์'] ||
    map['phone'] ||
    map['tel'] ||
    map['telephone'] ||
    map['mobile'] ||
    row['เบอร์โทร'] ||
    row['เบอร์โทรศัพท์'] ||
    row['phone'] ||
    row['Phone'] ||
    '';

  return {
    name: String(name || '').trim(),
    email: String(email || '').trim().toLowerCase(),
    studentId: String(studentId || '').trim(),
    role: String(role || '').trim(),
    department: String(department || '').trim(),
    phone: String(phone || '').trim(),
  };
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
    const defaultPassword = await hashPassword('123456');

    for (let i = 0; i < users.length; i++) {
      const raw = users[i];
      const rowNum = i + 1;

      if (!raw || typeof raw !== 'object') continue;

      const u = extractUserFromRow(raw);

      // Skip completely blank rows in Excel
      if (!u.name && !u.email && !u.studentId && !u.phone && !u.department) {
        continue;
      }

      if (!u.name) {
        errors.push(`แถวที่ ${rowNum}: กรุณาระบุชื่อ-นามสกุล`);
        continue;
      }

      // Generate or sanitize email
      let email = u.email;
      if (!email) {
        if (u.studentId) {
          email = `${u.studentId}@nu.ac.th`;
        } else {
          errors.push(`แถวที่ ${rowNum}: ไม่มีอีเมลหรือรหัสนิสิตสำหรับ [${u.name}]`);
          continue;
        }
      }

      const role = normalizeRole(u.role);
      const studentId = u.studentId || null;
      const department = u.department || 'คณะพยาบาลศาสตร์';
      const phone = u.phone || null;

      try {
        // Find existing user by email or studentId
        const existing = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: email, mode: 'insensitive' as const } },
              ...(studentId ? [{ studentId: { equals: studentId, mode: 'insensitive' as const } }] : []),
            ],
          },
        });

        if (existing) {
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              name: u.name,
              role,
              studentId: studentId || existing.studentId,
              department: department || existing.department,
              phone: phone || existing.phone,
              ...(email && email !== existing.email ? { email } : {}),
            },
          });
          updatedCount++;
        } else {
          await prisma.user.create({
            data: {
              name: u.name,
              email,
              password: defaultPassword,
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
      created: createdCount,
      createdCount,
      updated: updatedCount,
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
