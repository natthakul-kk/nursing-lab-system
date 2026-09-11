import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { records, countedBy, note } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'กรุณาระบุรายการที่ต้องการกระทบยอด' }, { status: 400 });
    }

    // Default system user for reconciliation audit
    const adminUser = await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'OFFICER'] } },
      select: { id: true, name: true },
    });

    const creatorId = adminUser?.id || 'system';
    const auditLogs: any[] = [];
    const updatedItems: any[] = [];

    // Process reconciliation in transaction
    await prisma.$transaction(async (tx) => {
      for (const rec of records) {
        const { itemId, physicalCount, systemCount, variance, reason } = rec;
        if (typeof variance !== 'number' || variance === 0) continue;

        const item = await tx.item.findUnique({
          where: { id: itemId },
          include: {
            stockLots: {
              where: { quantityRemaining: { gt: 0 } },
              orderBy: { expiryDate: 'asc' },
            },
            assets: true,
          },
        });

        if (!item) continue;

        if (item.type === 'CONSUMABLE') {
          if (variance < 0) {
            // Shortage: reduce from earliest lots
            let neededDeduction = Math.abs(variance);
            for (const lot of item.stockLots) {
              if (neededDeduction <= 0) break;
              const deduct = Math.min(lot.quantityRemaining, neededDeduction);
              await tx.stockLot.update({
                where: { id: lot.id },
                data: { quantityRemaining: lot.quantityRemaining - deduct },
              });
              neededDeduction -= deduct;
            }
          } else {
            // Surplus: add to latest active lot or create an adjustment lot
            if (item.stockLots.length > 0) {
              const latestLot = item.stockLots[item.stockLots.length - 1];
              await tx.stockLot.update({
                where: { id: latestLot.id },
                data: { quantityRemaining: latestLot.quantityRemaining + variance },
              });
            } else {
              await tx.stockLot.create({
                data: {
                  itemId: item.id,
                  lotNumber: `ADJ-${Date.now().toString().slice(-6)}`,
                  quantityInitial: variance,
                  quantityRemaining: variance,
                  unitCost: 0,
                  supplier: 'Cycle Count Adjustment',
                },
              });
            }
          }

          // Record Stock Transaction
          await tx.stockTransaction.create({
            data: {
              itemId: item.id,
              type: 'ADJUSTMENT',
              quantity: variance,
              unitCost: 0,
              totalCost: 0,
              createdById: creatorId,
              note: `[ตรวจนับสต็อก] นับได้ ${physicalCount} (เดิม ${systemCount}, ผลต่าง ${variance > 0 ? '+' : ''}${variance}) | สาเหตุ: ${reason || 'กระทบยอดประจำงวด'}`,
            },
          });
        }

        updatedItems.push({
          itemId: item.id,
          itemName: item.name,
          variance,
          physicalCount,
        });
      }
    });

    invalidateCache('items:');
    invalidateCache('dashboard:');

    return NextResponse.json({
      success: true,
      message: `กระทบยอดสต็อกสำเร็จทั้งหมด ${updatedItems.length} รายการ`,
      reconciledAt: new Date().toISOString(),
      updatedItems,
    });
  } catch (error: any) {
    console.error('Reconciliation error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการกระทบยอดสต็อก' },
      { status: 500 }
    );
  }
}