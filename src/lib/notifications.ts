import { prisma } from '@/lib/prisma';
import { sendPushToUser, PushPayload } from '@/lib/webpush';
import { canUserApprove, ApprovalScopeType } from '@/lib/approval-scope';
import { getRenderedNotification } from '@/lib/notification-templates';

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
  templateId?: string;
  variables?: Record<string, string | number | undefined | null>;
}

/**
 * ส่ง Web Push Notification ไปยังเครื่องของผู้ใช้ควบคู่กับการบันทึกลงฐานข้อมูล
 */
async function dispatchPushForNotification(params: CreateNotificationParams) {
  try {
    let approvalEndpoint: string | undefined;
    let actions: { action: string; title: string }[] = [
      { action: 'view', title: '🔍 ดูรายละเอียด' },
    ];

    if (params.type === 'APPROVAL' && params.entityType && params.entityId) {
      if (params.entityType === 'BORROW') {
        approvalEndpoint = `/api/borrow/${params.entityId}`;
      } else if (params.entityType === 'REQUISITION') {
        approvalEndpoint = `/api/requisitions/${params.entityId}`;
      } else if (params.entityType === 'PRACTICE') {
        approvalEndpoint = `/api/practice/bookings/${params.entityId}`;
      } else if (params.entityType === 'BOOKING') {
        approvalEndpoint = `/api/room-bookings/${params.entityId}`;
      }

      if (approvalEndpoint) {
        actions = [
          { action: 'approve', title: '✅ อนุมัติทันที' },
          { action: 'view', title: '🔍 ดูรายละเอียด' },
        ];
      }
    }

    const targetUrl =
      params.type === 'APPROVAL' && params.entityType && params.entityId
        ? `/approvals?id=${params.entityId}&type=${params.entityType}`
        : (params.linkUrl || '/');

    const payload: PushPayload = {
      title: params.title,
      message: params.message,
      linkUrl: targetUrl,
      tag: params.entityId ? `lab-${params.entityType}-${params.entityId}` : `lab-${Date.now()}`,
      actions,
      data: {
        url: targetUrl,
        ...(approvalEndpoint ? { approvalEndpoint, approvalBody: { action: 'APPROVE' } } : {}),
      },
    };

    await sendPushToUser(params.userId, payload);
  } catch (err) {
    console.warn('[WebPush] Error dispatching push:', err);
  }
}

/**
 * สร้างการแจ้งเตือนให้กับผู้ใช้คนเดียว พร้อมส่ง Web Push
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    let finalTitle = params.title;
    let finalMessage = params.message;

    if (params.templateId) {
      const { title, message, isActive } = await getRenderedNotification(
        params.templateId,
        params.variables || {},
        { title: params.title, message: params.message }
      );
      if (!isActive) return null;
      finalTitle = title;
      finalMessage = message;
    }

    const record = await prisma.notification.create({
      data: {
        userId: params.userId,
        title: finalTitle,
        message: finalMessage,
        type: params.type,
        priority: params.priority || 'NORMAL',
        linkUrl: params.linkUrl || null,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
      },
    });

    // ส่ง Web Push ในพื้นหลังโดยไม่บล็อกการตอบกลับ
    dispatchPushForNotification({ ...params, title: finalTitle, message: finalMessage }).catch(() => {});

    return record;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

/**
 * สร้างการแจ้งเตือนให้กับกลุ่มผู้ใช้หลายคน พร้อมส่ง Web Push
 */
export async function createMultipleNotifications(notifications: CreateNotificationParams[]) {
  try {
    if (notifications.length === 0) return;
    const result = await prisma.notification.createMany({
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

    // ส่ง Web Push ไปยังทุกผู้รับในพื้นหลัง
    for (const notif of notifications) {
      dispatchPushForNotification(notif).catch(() => {});
    }

    return result;
  } catch (error) {
    console.error('Failed to create multiple notifications:', error);
    return null;
  }
}

/**
 * แจ้งเตือนไปยังกลุ่มบทบาท (เช่น 'ADMIN', 'OFFICER', 'APPROVER')
 * สามารถระบุ scope เพื่อกรองเฉพาะผู้อนุมัติที่มีสิทธิ์ในหมวดนั้นได้
 */
export async function notifyRoles(
  roles: string[],
  params: Omit<CreateNotificationParams, 'userId'>,
  scope?: ApprovalScopeType
) {
  try {
    let finalTitle = params.title;
    let finalMessage = params.message;

    if (params.templateId) {
      const { title, message, isActive } = await getRenderedNotification(
        params.templateId,
        params.variables || {},
        { title: params.title, message: params.message }
      );
      if (!isActive) return null;
      finalTitle = title;
      finalMessage = message;
    }

    const users = await prisma.user.findMany({
      where: {
        role: { in: roles },
        status: 'ACTIVE',
      },
      select: { id: true, role: true, approvalScopes: true },
    });

    // กรองเฉพาะผู้ใช้ที่มีสิทธิ์อนุมัติตรงตามขอบเขตงาน
    const targetUsers = scope
      ? users.filter((u) => canUserApprove(u, scope))
      : users;

    const notifs = targetUsers.map((u) => ({
      ...params,
      title: finalTitle,
      message: finalMessage,
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

/**
 * สร้างการแจ้งเตือนโดยใช้ข้อความจาก Notification Template
 */
export async function createTemplatedNotification(params: {
  templateId: string;
  userId: string;
  variables: Record<string, string | number | undefined | null>;
  type: CreateNotificationParams['type'];
  priority?: CreateNotificationParams['priority'];
  linkUrl?: string;
  entityType?: CreateNotificationParams['entityType'];
  entityId?: string;
  fallback?: { title: string; message: string };
}) {
  const { title, message, isActive } = await getRenderedNotification(
    params.templateId,
    params.variables,
    params.fallback
  );

  if (!isActive) return null;

  return await createNotification({
    userId: params.userId,
    title,
    message,
    type: params.type,
    priority: params.priority,
    linkUrl: params.linkUrl,
    entityType: params.entityType,
    entityId: params.entityId,
  });
}

/**
 * ส่งแจ้งเตือนไปยังกลุ่มบทบาทโดยใช้ข้อความจาก Notification Template
 */
export async function notifyRolesWithTemplate(
  roles: string[],
  params: {
    templateId: string;
    variables: Record<string, string | number | undefined | null>;
    type: CreateNotificationParams['type'];
    priority?: CreateNotificationParams['priority'];
    linkUrl?: string;
    entityType?: CreateNotificationParams['entityType'];
    entityId?: string;
    fallback?: { title: string; message: string };
  },
  scope?: ApprovalScopeType
) {
  const { title, message, isActive } = await getRenderedNotification(
    params.templateId,
    params.variables,
    params.fallback
  );

  if (!isActive) return null;

  return await notifyRoles(
    roles,
    {
      title,
      message,
      type: params.type,
      priority: params.priority,
      linkUrl: params.linkUrl,
      entityType: params.entityType,
      entityId: params.entityId,
    },
    scope
  );
}

/**
 * ส่งแจ้งเตือนไปยังอาจารย์โดยใช้ข้อความจาก Notification Template
 */
export async function notifyAdvisorWithTemplate(
  advisorName: string | null | undefined,
  params: {
    templateId: string;
    variables: Record<string, string | number | undefined | null>;
    type: CreateNotificationParams['type'];
    priority?: CreateNotificationParams['priority'];
    linkUrl?: string;
    entityType?: CreateNotificationParams['entityType'];
    entityId?: string;
    fallback?: { title: string; message: string };
  }
) {
  const { title, message, isActive } = await getRenderedNotification(
    params.templateId,
    params.variables,
    params.fallback
  );

  if (!isActive) return null;

  return await notifyAdvisorByName(advisorName, {
    title,
    message,
    type: params.type,
    priority: params.priority,
    linkUrl: params.linkUrl,
    entityType: params.entityType,
    entityId: params.entityId,
  });
}

