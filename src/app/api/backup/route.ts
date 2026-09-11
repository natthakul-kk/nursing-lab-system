import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const download = searchParams.get('download') !== 'false';

    const [
      users,
      categories,
      items,
      equipmentAssets,
      stockLots,
      practiceKits,
      courses,
      borrowRequests,
      requisitionRequests,
      practiceBookings,
      maintenanceLogs,
      stockTransactions,
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          studentId: true,
          phone: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.category.findMany(),
      prisma.item.findMany({
        include: {
          category: { select: { id: true, code: true, name: true } },
        },
      }),
      prisma.equipmentAsset.findMany({
        include: {
          item: { select: { id: true, code: true, name: true } },
        },
      }),
      prisma.stockLot.findMany({
        include: {
          item: { select: { id: true, code: true, name: true } },
        },
      }),
      prisma.practiceKit.findMany({
        include: {
          items: true,
        },
      }),
      prisma.course.findMany(),
      prisma.borrowRequest.findMany({
        include: {
          items: true,
          user: { select: { id: true, name: true, studentId: true } },
          course: { select: { id: true, code: true, name: true } },
        },
      }),
      prisma.requisitionRequest.findMany({
        include: {
          items: true,
          user: { select: { id: true, name: true, studentId: true } },
          course: { select: { id: true, code: true, name: true } },
        },
      }),
      prisma.practiceBooking.findMany({
        include: {
          slot: { include: { room: true } },
          course: { select: { id: true, code: true, name: true } },
          user: { select: { id: true, name: true, studentId: true } },
        },
      }),
      prisma.maintenanceLog.findMany({
        include: {
          asset: { select: { id: true, assetCode: true } },
        },
      }),
      prisma.stockTransaction.findMany({
        take: 2000,
        orderBy: { createdAt: 'desc' },
        include: {
          item: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `nursing_lab_backup_${timestamp}.json`;

    const snapshotData = {
      system: 'Nursing Lab Management System (ระบบห้องปฏิบัติการพยาบาล)',
      exportedAt: new Date().toISOString(),
      summary: {
        totalUsers: users.length,
        totalCategories: categories.length,
        totalItems: items.length,
        totalEquipmentAssets: equipmentAssets.length,
        totalStockLots: stockLots.length,
        totalPracticeKits: practiceKits.length,
        totalCourses: courses.length,
        totalBorrowRequests: borrowRequests.length,
        totalRequisitions: requisitionRequests.length,
        totalBookings: practiceBookings.length,
        totalMaintenanceLogs: maintenanceLogs.length,
        totalStockTransactions: stockTransactions.length,
      },
      data: {
        users,
        categories,
        items,
        equipmentAssets,
        stockLots,
        practiceKits,
        courses,
        borrowRequests,
        requisitionRequests,
        practiceBookings,
        maintenanceLogs,
        stockTransactions,
      },
    };

    if (download) {
      return new NextResponse(JSON.stringify(snapshotData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json(snapshotData);
  } catch (error: any) {
    console.error('Backup API error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการสำรองข้อมูล' },
      { status: 500 }
    );
  }
}