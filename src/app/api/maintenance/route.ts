import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List all maintenance records
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // UNDER_REPAIR, COMPLETED, or all

    const where: any = {};
    if (status) where.status = status;

    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: {
        asset: {
          include: {
            item: true,
          },
        },
        handledBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { sentDate: 'desc' },
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('Failed to get maintenance logs:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch logs' }, { status: 500 });
  }
}

// POST: Create a new repair ticket OR Complete repair and return to stock
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, assetId, logId, issue, repairShop, repairCost, technicianNote, userId } = body;

    // 1. Action: SEND_REPAIR (ส่งซ่อม / แจ้งชำรุด)
    if (action === 'SEND_REPAIR') {
      if (!assetId || !issue) {
        return NextResponse.json({ error: 'กรุณาระบุรหัสอุปกรณ์และอาการชำรุด' }, { status: 400 });
      }

      // Update asset status to MAINTENANCE
      await prisma.equipmentAsset.update({
        where: { id: assetId },
        data: {
          status: 'MAINTENANCE',
          condition: 'DAMAGED',
          note: `ส่งซ่อม: ${issue}`,
        },
      });

      // Create maintenance log entry
      const log = await prisma.maintenanceLog.create({
        data: {
          assetId,
          issue,
          repairShop: repairShop || 'ศูนย์ซ่อมบำรุงพัสดุ / ช่างประจำคณะ',
          repairCost: Number(repairCost) || 0,
          status: 'UNDER_REPAIR',
          handledById: userId || null,
          technicianNote: technicianNote || null,
        },
        include: {
          asset: { include: { item: true } },
        },
      });

      return NextResponse.json({ success: true, log }, { status: 201 });
    }

    // 2. Action: COMPLETE_REPAIR (ซ่อมเสร็จแล้ว -> คืนเข้าสต็อกพร้อมใช้)
    if (action === 'COMPLETE_REPAIR') {
      if (!assetId) {
        return NextResponse.json({ error: 'ไม่พบรหัสอุปกรณ์' }, { status: 400 });
      }

      // Mark the asset as AVAILABLE and GOOD
      const updatedAsset = await prisma.equipmentAsset.update({
        where: { id: assetId },
        data: {
          status: 'AVAILABLE',
          condition: 'GOOD',
          note: `ซ่อมเสร็จสมบูรณ์เมื่อ ${new Date().toLocaleDateString('th-TH')}: ${technicianNote || 'พร้อมใช้งาน'}`,
        },
        include: { item: true },
      });

      // If specific logId provided, close that log. Otherwise close any active log for this asset.
      if (logId) {
        await prisma.maintenanceLog.update({
          where: { id: logId },
          data: {
            status: 'COMPLETED',
            completedDate: new Date(),
            repairCost: repairCost !== undefined ? Number(repairCost) : undefined,
            repairShop: repairShop || undefined,
            technicianNote: technicianNote || 'ซ่อมแซมเสร็จสมบูรณ์ นำส่งคืนคลังพร้อมใช้',
          },
        });
      } else {
        await prisma.maintenanceLog.updateMany({
          where: { assetId, status: 'UNDER_REPAIR' },
          data: {
            status: 'COMPLETED',
            completedDate: new Date(),
            technicianNote: technicianNote || 'ซ่อมแซมเสร็จสมบูรณ์ นำส่งคืนคลังพร้อมใช้',
          },
        });
      }

      return NextResponse.json({ success: true, asset: updatedAsset });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Maintenance API error:', error);
    return NextResponse.json({ error: error.message || 'Maintenance action failed' }, { status: 500 });
  }
}
