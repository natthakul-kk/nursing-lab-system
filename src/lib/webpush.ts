import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

const vapidPublicKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BN_aQgkRN-BUuOhTA3ip10FBE72jnab57Ao6oa55pIzg4cfmefNmvAjWDup-dEMx8HYVZfFQyFvLrpCdLaQQaso';
const vapidPrivateKey =
  process.env.VAPID_PRIVATE_KEY || 'cv2UG6IaLDHvcVb1dGgBQFo0ucF8RgAIQY7WO4OFiWo';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@nurse.ac.th';

try {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} catch (err) {
  console.warn('[WebPush] Failed to set VAPID details:', err);
}

export interface PushNotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface PushPayload {
  title: string;
  message: string;
  linkUrl?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  actions?: PushNotificationAction[];
  data?: Record<string, any>;
}

/**
 * ส่ง Web Push Notification ไปยังทุกอุปกรณ์ที่ลงทะเบียนของ User
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    if (subscriptions.length === 0) return { success: true, count: 0 };

    const notificationPayload = JSON.stringify({
      title: payload.title,
      message: payload.message,
      linkUrl: payload.linkUrl || '/',
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-192x192.png',
      tag: payload.tag || `lab-notify-${Date.now()}`,
      actions: payload.actions || [],
      data: {
        url: payload.linkUrl || '/',
        ...payload.data,
      },
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, notificationPayload);
        } catch (error: any) {
          // หาก Token หมดอายุ หรือถูกยกเลิก (404 Not Found หรือ 410 Gone) ให้ลบออกจากระบบ
          if (error?.statusCode === 404 || error?.statusCode === 410) {
            console.log(`[WebPush] Subscription expired (${error.statusCode}), removing: ${sub.id}`);
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
          throw error;
        }
      })
    );

    const sentCount = results.filter((r) => r.status === 'fulfilled').length;
    return { success: true, count: sentCount, total: subscriptions.length };
  } catch (error: any) {
    console.error('[WebPush] Error sending push to user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ส่ง Web Push Notification ไปยังผู้ใช้หลายคนพร้อมกัน
 */
export async function sendPushToMultipleUsers(userIds: string[], payload: PushPayload) {
  if (!userIds || userIds.length === 0) return { success: true, count: 0 };

  const results = await Promise.allSettled(
    userIds.map((uid) => sendPushToUser(uid, payload))
  );

  const totalDelivered = results.reduce((sum, r) => {
    if (r.status === 'fulfilled' && r.value.count) {
      return sum + r.value.count;
    }
    return sum;
  }, 0);

  return { success: true, count: totalDelivered };
}
