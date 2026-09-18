import { prisma } from '@/lib/prisma';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type:
    | 'APPROVAL'
    | 'REJECTION'
    | 'STOCK_ALERT'
    | 'DUE_REMINDER'
    | 'INSTRUCTOR_ACK'
    | 'REQUEST_SUBMITTED'
    | 'STATUS_UPDATE'
    | 'MAINTENANCE'
    | 'SYSTEM';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  linkUrl?: string;
  entityType?: 'BORROW' | 'REQUISITION' | 'ITEM' | 'STORAGE' | 'BOOKING' | 'PRACTICE';
  entityId?: string;
}

/**
 * สร้างการแจ้งเตือนให้กับผู้ใช้คนเดียว
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        priority: params.priority || 'NORMAL',
        linkUrl: params.linkUrl || null,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

/**
 * สร้างการแจ้งเตือนให้กับกลุ่มผู้ใช้หลายคน
 */
export async function createMultipleNotifications(notifications: CreateNotificationParams[]) {
  try {
    if (notifications.length === 0) return;
    return await prisma.notification.createMany({
      data: notifications.map((n) => ({
        userId: n.userId,
        title: n.title,
        message: n.message,
        type: n.type,
        priority: n.priority || 'NORMAL',
        linkUrl: n.linkUrl || null,
        entityType: n.entityType || null,
        entityId: n.entityId || null,
      })),
    });
  } catch (error) {
    console.error('Failed to create multiple notifications:', error);
    return null;
  }
}

/**
 * แจ้งเตือนไปยังกลุ่มบทบาท (เช่น 'ADMIN', 'OFFICER')
 */
export async function notifyRoles(
  roles: string[],
  params: Omit<CreateNotificationParams, 'userId'>
) {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: { in: roles },
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    const notifs = users.map((u) => ({
      ...params,
      userId: u.id,
    }));

    return await createMultipleNotifications(notifs);
  } catch (error) {
    console.error('Failed to notify roles:', error);
    return null;
  }
}

/**
 * แจ้งเตือนไปยังอาจารย์ตามชื่อ (ค้นหาจากฐานข้อมูล User)
 */
export async function notifyAdvisorByName(
  advisorName: string | null | undefined,
  params: Omit<CreateNotificationParams, 'userId'>
) {
  if (!advisorName) return null;
  try {
    const cleanName = advisorName.replace(/^(อาจารย์|ผศ\.|รศ\.|ดร\.|ศ\.|นาย|นาง|นางสาว|อ\.)\s*/, '').trim();
    if (!cleanName) return null;

    const teacher = await prisma.user.findFirst({
      where: {
        status: 'ACTIVE',
        role: { in: ['TEACHER', 'APPROVER', 'ADMIN', 'OFFICER'] },
        name: { contains: cleanName, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (teacher) {
      return await createNotification({
        ...params,
        userId: teacher.id,
      });
    }
  } catch (error) {
    console.error('Failed to notify advisor by name:', error);
  }
  return null;
}
