import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Public Asset Details by code (No login required)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const decodedCode = decodeURIComponent(code).trim();

    if (!decodedCode) {
      return NextResponse.json({ error: 'ไม่พบรหัสอุปกรณ์' }, { status: 400 });
    }

    // Lookup asset by assetCode, or govAssetCode, or ID
    const asset = await prisma.equipmentAsset.findFirst({
      where: {
        OR: [
          { assetCode: { equals: decodedCode, mode: 'insensitive' } },
          { govAssetCode: { equals: decodedCode, mode: 'insensitive' } },
          { id: decodedCode },
        ],
      },
      include: {
        item: {
          include: {
            category: true,
          },
        },
        maintenanceLogs: {
          orderBy: { sentDate: 'desc' },
          take: 3,
        },
        borrowItems: {
          include: {
            borrowRequest: {
              include: {
                user: {
                  select: { name: true, department: true, studentId: true },
                },
                course: {
                  select: { code: true, name: true },
                },
              },
            },
          },
          orderBy: { id: 'desc' },
          take: 1,
        },
      },
    });

    if (!asset) {
      return NextResponse.json(
        { error: `ไม่พบข้อมูลครุภัณฑ์รหัส "${decodedCode}" ในระบบ` },
        { status: 404 }
      );
    }

    // Active borrow details if status is BORROWED
    let activeBorrow = null;
    if (asset.status === 'BORROWED' && asset.borrowItems.length > 0) {
      const latestBorrowReq = asset.borrowItems[0]?.borrowRequest;
      if (latestBorrowReq && latestBorrowReq.status === 'BORROWED') {
        activeBorrow = {
          borrowerName: latestBorrowReq.user?.name,
          borrowerStudentId: latestBorrowReq.user?.studentId,
          department: latestBorrowReq.user?.department,
          borrowDate: latestBorrowReq.borrowDate,
          expectedReturnDate: latestBorrowReq.expectedReturnDate,
          purpose: latestBorrowReq.purpose,
          course: latestBorrowReq.course ? `[${latestBorrowReq.course.code}] ${latestBorrowReq.course.name}` : null,
        };
      }
    }

    // Active maintenance if status is MAINTENANCE
    let activeMaintenance = null;
    if (asset.status === 'MAINTENANCE') {
      const activeLog = asset.maintenanceLogs.find((l) => l.status === 'UNDER_REPAIR') || asset.maintenanceLogs[0];
      if (activeLog) {
        activeMaintenance = {
          issue: activeLog.issue,
          sentDate: activeLog.sentDate,
          repairShop: activeLog.repairShop,
          technicianNote: activeLog.technicianNote,
        };
      }
    }

    return NextResponse.json({
      id: asset.id,
      assetCode: asset.assetCode,
      govAssetCode: asset.govAssetCode,
      sequenceNumber: asset.sequenceNumber,
      serialNumber: asset.serialNumber,
      location: asset.location || asset.item.location || 'ห้องปฏิบัติการพยาบาล',
      status: asset.status,
      condition: asset.condition,
      cost: asset.cost,
      receivedDate: asset.receivedDate,
      imageUrl: asset.imageUrl || asset.item.imageUrl,
      note: asset.note,
      item: {
        id: asset.item.id,
        code: asset.item.code,
        name: asset.item.name,
        category: asset.item.category?.name || 'ทั่วไป',
        description: asset.item.description,
        unit: asset.item.unit,
      },
      activeBorrow,
      activeMaintenance,
    });
  } catch (error: any) {
    console.error('Public Asset Lookup Error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลครุภัณฑ์' },
      { status: 500 }
    );
  }
}
