import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_NOTIFICATION_TEMPLATES } from '@/lib/notification-templates';

/**
 * POST /api/settings/notifications/reset
 * คืนค่าเริ่มต้น (Reset to Default) ให้กับเทมเพลตที่ระบุ หรือทั้งหมด
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, userId } = body;

    // ตรวจสอบสิทธิ์ Admin (หากส่ง userId มา)
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user && user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์คืนค่าเริ่มต้น' }, { status: 403 });
      }
    }

    if (!id || id === 'ALL') {
      // คืนค่าทั้งหมด
      await Promise.all(
        DEFAULT_NOTIFICATION_TEMPLATES.map((t) =>
          prisma.notificationTemplate.upsert({
            where: { id: t.id },
            update: {
              title: t.title,
              message: t.message,
              isActive: true,
            },
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
      return NextResponse.json({ success: true, message: 'คืนค่าเริ่มต้นของทุกรายการเรียบร้อยแล้ว' });
    }

    // คืนค่าเฉพาะรายการที่ระบุ
    const defaultTpl = DEFAULT_NOTIFICATION_TEMPLATES.find((t) => t.id === id);
    if (!defaultTpl) {
      return NextResponse.json({ error: 'ไม่พบรายการเทมเพลตที่ระบุ' }, { status: 404 });
    }

    const resetItem = await prisma.notificationTemplate.upsert({
      where: { id },
      update: {
        title: defaultTpl.title,
        message: defaultTpl.message,
        isActive: true,
      },
      create: {
        id: defaultTpl.id,
        category: defaultTpl.category,
        name: defaultTpl.name,
        description: defaultTpl.description,
        title: defaultTpl.title,
        message: defaultTpl.message,
        variables: JSON.stringify(defaultTpl.variables),
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, template: resetItem });
  } catch (error: any) {
    console.error('[API] Failed to reset notification template:', error);
    return NextResponse.json({ error: error.message || 'ไม่สามารถคืนค่าเริ่มต้นได้' }, { status: 500 });
  }
}
