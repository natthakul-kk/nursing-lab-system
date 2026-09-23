import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const vapidPublicKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BN_aQgkRN-BUuOhTA3ip10FBE72jnab57Ao6oa55pIzg4cfmefNmvAjWDup-dEMx8HYVZfFQyFvLrpCdLaQQaso';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let isSubscribed = false;
    let subscriptionCount = 0;

    if (userId) {
      const subs = await prisma.pushSubscription.findMany({
        where: { userId, isActive: true },
      });
      isSubscribed = subs.length > 0;
      subscriptionCount = subs.length;
    }

    return NextResponse.json({
      publicKey: vapidPublicKey,
      isSubscribed,
      subscriptionCount,
    });
  } catch (error: any) {
    console.error('Error getting push subscription status:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, subscription, userAgent } = body;

    if (!userId || !subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'ข้อมูล Subscription หรือ userId ไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys?.p256dh || '';
    const auth = subscription.keys?.auth || '';

    if (!p256dh || !auth) {
      return NextResponse.json(
        { error: 'Subscription keys ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // Upsert subscription for this device endpoint
    const saved = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId,
        p256dh,
        auth,
        userAgent: userAgent || null,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        endpoint,
        p256dh,
        auth,
        userAgent: userAgent || null,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'ลงทะเบียนรับการแจ้งเตือนสำเร็จแล้ว',
      subscriptionId: saved.id,
    });
  } catch (error: any) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { endpoint, userId } = body;

    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint },
      });
    } else if (userId) {
      await prisma.pushSubscription.deleteMany({
        where: { userId },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'ยกเลิกการลงทะเบียนรับการแจ้งเตือนเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('Error deleting push subscription:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
