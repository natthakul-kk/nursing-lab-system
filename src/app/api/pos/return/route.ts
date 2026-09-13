import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assetCode, condition = 'GOOD', note, operatorId } = body;

    if (!assetCode || !assetCode.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสครุภัณฑ์ที่ต้องการส่งคืน' }, { status: 400 });
    }

    const code = assetCode.trim();

    // ค้นหาชิ้นอุปกรณ์
    const asset = await prisma.equipmentAsset.findFirst({
      where: {
        OR: [
          { assetCode: code },
          { govAssetCode: code },
          { id: code },
        ],
      },
      include: {
        item: true,
        borrowItems: {
          where: { isReturned: false },
          include: {
            borrowRequest: {
              include: { user: true, course: true },
            },
          },
          orderBy: { borrowRequest: { createdAt: 'desc' } },
          take: 1,
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: `ไม่พบอุปกรณ์รหัส "${code}" ในระบบ` }, { status: 404 });
    }

    const activeBorrowItem = asset.borrowItems[0];
    if (!activeBorrowItem) {
      return NextResponse.json(
        { error: `อุปกรณ์ "${asset.assetCode}" (${asset.item.name}) ไม่ได้อยู่ในสถานะถูกยืม หรือถูกส่งคืนแล้ว` },
        { status: 400 }
      );
    }

    const borrowRequest = activeBorrowItem.borrowRequest;
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // 1. อัปเดตรายการยืมชิ้นนี้ว่าคืนแล้ว
      await tx.borrowItem.update({
        where: { id: activeBorrowItem.id },
        data: {
          isReturned: true,
          returnCondition: condition,
        },
      });

      // 2. อัปเดตสถานะของตัวครุภัณฑ์
      if (condition === 'DAMAGED') {
        await tx.equipmentAsset.update({
          where: { id: asset.id },
          data: {
            status: 'MAINTENANCE',
            condition: 'DAMAGED',
          },
        });

        // สร้างประวัติส่งซ่อมบำรุงอัตโนมัติ
        await tx.maintenanceLog.create({
          data: {
            assetId: asset.id,
            issue: note || `ส่งซ่อมจากการใช้งานในวิชา ${borrowRequest.course?.code || 'ทั่วไป'} (คืนผ่านจุดบริการ POS)`,
            sentDate: now,
            status: 'UNDER_REPAIR',
            handledById: operatorId || null,
          },
        });
      } else {
        await tx.equipmentAsset.update({
          where: { id: asset.id },
          data: {
            status: 'AVAILABLE',
            condition: 'GOOD',
          },
        });
      }

      // 3. ตรวจสอบว่าในใบยืมนี้คืนครบทุกชิ้นหรือยัง
      const remainingItems = await tx.borrowItem.count({
        where: {
          borrowRequestId: borrowRequest.id,
          isReturned: false,
        },
      });

      if (remainingItems === 0) {
        await tx.borrowRequest.update({
          where: { id: borrowRequest.id },
          data: {
            status: condition === 'DAMAGED' ? 'RETURNED_WITH_ISSUE' : 'RETURNED_COMPLETE',
            actualReturnDate: now,
            returnNote: note || null,
          },
        });
      }
    });

    invalidateCache('borrow:list');
    invalidateCache('items:list');
    invalidateCache('dashboard:stats');

    return NextResponse.json({
      success: true,
      returnReceipt: {
        returnNumber: `RET-${asset.assetCode}-${Date.now().toString().slice(-4)}`,
        returnedAt: now.toISOString(),
        asset: {
          id: asset.id,
          assetCode: asset.assetCode,
          name: asset.item.name,
          unit: asset.item.unit,
        },
        borrower: {
          id: borrowRequest.user.id,
          name: borrowRequest.user.name,
          studentId: borrowRequest.user.studentId,
        },
        course: borrowRequest.course
          ? { id: borrowRequest.course.id, code: borrowRequest.course.code, name: borrowRequest.course.name }
          : null,
        condition,
        note: note || 'รับคืนเรียบร้อย สภาพปกติ',
      },
    });
  } catch (err: any) {
    console.error('POS Return Error:', err);
    return NextResponse.json(
      { error: err.message || 'เกิดข้อผิดพลาดในการบันทึกการส่งคืน' },
      { status: 500 }
    );
  }
}
