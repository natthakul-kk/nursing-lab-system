import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyRoles, createNotification } from '@/lib/notifications';

export async function POST() {
  try {
    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let alertsGenerated = 0;

    // 1. Check Overdue Borrows (ครุภัณฑ์ที่ค้างส่งคืนเกินกำหนด)
    const overdueBorrows = await prisma.borrowRequest.findMany({
      where: {
        status: 'BORROWED',
        actualReturnDate: null,
        expectedReturnDate: { lt: now },
      },
      include: {
        user: { select: { id: true, name: true } },
        items: {
          include: {
            item: { select: { name: true } },
          },
        },
      },
    });

    for (const b of overdueBorrows) {
      // Check if alert already sent in the past 24 hours
      const recentAlert = await prisma.notification.findFirst({
        where: {
          userId: b.userId,
          entityId: b.id,
          type: 'DUE_REMINDER',
          createdAt: { gte: oneDayAgo },
        },
      });

      if (!recentAlert) {
        const itemNames = b.items.map((i) => i.item?.name).filter(Boolean).join(', ');
        // Notify student
        await createNotification({
          userId: b.userId,
          title: '⚠️ ครุภัณฑ์ค้างส่งคืนเกินกำหนด',
          message: `รายการยืมเลขที่ ${b.requestNumber} (${itemNames}) ครบกำหนดส่งคืนแล้ว กรุณานำส่งคืนที่ห้องแล็บโดยเร็ว`,
          type: 'DUE_REMINDER',
          priority: 'URGENT',
          linkUrl: '/borrow',
          entityType: 'BORROW',
          entityId: b.id,
        });

        // Notify officers
        await notifyRoles(['OFFICER', 'ADMIN'], {
          title: '🔴 ครุภัณฑ์ค้างส่งคืนเกินกำหนด',
          message: `นิสิต ${b.user?.name || 'ไม่ระบุชื่อ'} ค้างส่งคืนคำขอ ${b.requestNumber} (${itemNames}) เกินกำหนด`,
          type: 'DUE_REMINDER',
          priority: 'HIGH',
          linkUrl: '/borrow',
          entityType: 'BORROW',
          entityId: b.id,
        });

        alertsGenerated++;
      }
    }

    // 2. Check Expiring Lots (เวชภัณฑ์ใกล้หมดอายุภายใน 30 วัน)
    const expiringLots = await prisma.stockLot.findMany({
      where: {
        quantityRemaining: { gt: 0 },
        expiryDate: {
          gte: now,
          lte: thirtyDaysAhead,
        },
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            storageLocation: { select: { name: true, code: true } },
          },
        },
      },
      take: 10,
    });

    for (const lot of expiringLots) {
      const recentExpAlert = await prisma.notification.findFirst({
        where: {
          type: 'STOCK_ALERT',
          entityId: lot.id,
          createdAt: { gte: oneDayAgo },
        },
      });

      if (!recentExpAlert) {
        const expDateStr = lot.expiryDate ? lot.expiryDate.toISOString().split('T')[0] : '';
        const locStr = lot.item?.storageLocation ? ` (ตู้: ${lot.item.storageLocation.name})` : '';

        await notifyRoles(['OFFICER', 'ADMIN'], {
          title: '⏳ เวชภัณฑ์ใกล้หมดอายุ (ภายใน 30 วัน)',
          message: `${lot.item?.name} ล็อต ${lot.lotNumber} หมดอายุวันที่ ${expDateStr} เหลือ ${lot.quantityRemaining} หน่วย${locStr}`,
          type: 'STOCK_ALERT',
          priority: 'HIGH',
          linkUrl: '/inventory',
          entityType: 'ITEM',
          entityId: lot.id,
        });

        alertsGenerated++;
      }
    }

    return NextResponse.json({
      success: true,
      alertsGenerated,
      overdueCount: overdueBorrows.length,
      expiringLotsCount: expiringLots.length,
    });
  } catch (error: any) {
    console.error('System notification check error:', error);
    return NextResponse.json({ error: error.message || 'System check failed' }, { status: 500 });
  }
}
