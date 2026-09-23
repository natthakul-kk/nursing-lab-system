import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_NOTIFICATION_TEMPLATES } from '@/lib/notification-templates';

/**
 * GET /api/settings/notifications
 * ดึงรายการเทมเพลตข้อความแจ้งเตือนทั้งหมด
 * หากยังไม่มีข้อมูลในระบบ จะทำการบันทึกค่าเริ่มต้น (Seed) ให้โดยอัตโนมัติ
 */
export async function GET() {
  try {
    let dbTemplates = await prisma.notificationTemplate.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // หากยังไม่มีข้อมูลใน DB ให้ Seed ค่าเริ่มต้นทั้งหมด
    if (dbTemplates.length === 0) {
      await Promise.all(
        DEFAULT_NOTIFICATION_TEMPLATES.map((t) =>
          prisma.notificationTemplate.upsert({
            where: { id: t.id },
            update: {},
            create: {
              id: t.id,
              category: t.category,
              name: t.name,
              description: t.description,
              title: t.title,
              message: t.message,
              variables: JSON.stringify(t.variables),
              isActive: true,
            },
          })
        )
      );

      dbTemplates = await prisma.notificationTemplate.findMany({
        orderBy: { createdAt: 'asc' },
      });
    }

    // รวมข้อมูล default เพื่อส่ง defaultTitle & defaultMessage กลับไปให้หน้าบ้านใช้เทียบหรือรีเซ็ต
    const merged = dbTemplates.map((item) => {
      const def = DEFAULT_NOTIFICATION_TEMPLATES.find((d) => d.id === item.id);
      let parsedVariables: { name: string; label: string }[] = [];
      try {
        if (item.variables) {
          parsedVariables = JSON.parse(item.variables);
        }
      } catch {}

      return {
        ...item,
        defaultTitle: def?.title || item.title,
        defaultMessage: def?.message || item.message,
        variablesList: parsedVariables.length > 0 ? parsedVariables : def?.variables || [],
      };
    });

    return NextResponse.json(merged);
  } catch (error: any) {
    console.error('[API] Failed to get notification templates:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PUT /api/settings/notifications
 * อัปเดตข้อความหัวข้อ เนื้อหา หรือสถานะเปิด/ปิดของเทมเพลต
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, title, message, isActive, userId } = body;

    if (!id || !title || !message) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลหัวข้อและเนื้อหาให้ครบถ้วน' }, { status: 400 });
    }

    // ตรวจสอบสิทธิ์ Admin (หากส่ง userId มา)
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user && user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์แก้ไข' }, { status: 403 });
      }
    }

    const updated = await prisma.notificationTemplate.update({
      where: { id },
      data: {
        title: title.trim(),
        message: message.trim(),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (error: any) {
    console.error('[API] Failed to update notification template:', error);
    return NextResponse.json({ error: error.message || 'ไม่สามารถบันทึกข้อมูลได้' }, { status: 500 });
  }
}
