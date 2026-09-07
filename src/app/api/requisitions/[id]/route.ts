import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, userId, reason, itemAdjustments } = body;

    const requisition = await prisma.requisitionRequest.findUnique({
      where: { id },
      include: {
        items: true,
        course: true,
        borrowRequest: true,
        user: true,
      },
    });

    if (!requisition) {
      return NextResponse.json({ error: 'ไม่พบรายการคำขอเบิก' }, { status: 404 });
    }

    if (action === 'ACKNOWLEDGE') {
      const updated = await prisma.requisitionRequest.update({
        where: { id },
        data: {
          instructorAcknowledged: true,
          acknowledgedAt: new Date(),
          advisorName: body.advisorName || requisition.advisorName,
        },
      });

      // Synchronize with linked borrow request if unified
      if (requisition.borrowRequest) {
        await prisma.borrowRequest.update({
          where: { id: requisition.borrowRequest.id },
          data: {
            instructorAcknowledged: true,
            acknowledgedAt: new Date(),
            advisorName: body.advisorName || requisition.advisorName,
          },
        }).catch((e) => console.error('Failed to sync linked borrow acknowledge:', e));
      }

      return NextResponse.json(updated);
    }

    if (action === 'APPROVE') {
      const updated = await prisma.requisitionRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approverId: userId,
          approvedAt: new Date(),
        },
      });

      // Synchronize with linked borrow request if unified
      if (requisition.borrowRequest) {
        await prisma.borrowRequest.update({
          where: { id: requisition.borrowRequest.id },
          data: {
            status: 'APPROVED',
            approverId: userId,
            approvedAt: new Date(),
          },
        }).catch((e) => console.error('Failed to sync linked borrow approve:', e));
      }

      return NextResponse.json(updated);
    }

    if (action === 'REJECT') {
      const updated = await prisma.requisitionRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approverId: userId,
          rejectionReason: reason || 'ไม่อนุมัติ',
        },
      });

      // Synchronize with linked borrow request if unified
      if (requisition.borrowRequest) {
        await prisma.borrowRequest.update({
          where: { id: requisition.borrowRequest.id },
          data: {
            status: 'REJECTED',
            approverId: userId,
            rejectionReason: reason || 'ไม่อนุมัติ',
          },
        }).catch((e) => console.error('Failed to sync linked borrow reject:', e));
      }

      return NextResponse.json(updated);
    }
    if (action === 'UPDATE_DATES') {
      const { dateNeeded } = body;
      const dataToUpdate: any = {};
      if (dateNeeded) dataToUpdate.dateNeeded = new Date(dateNeeded);

      const updated = await prisma.requisitionRequest.update({
        where: { id },
        data: dataToUpdate,
      });
      return NextResponse.json(updated);
    }

    if (action === 'DISPENSE') {
      // Officer dispenses items and deducts stock FIFO with adjustments
      let actualTotalCost = 0;

      for (const reqItem of requisition.items) {
        const adj = Array.isArray(itemAdjustments)
          ? itemAdjustments.find((a: any) => a.id === reqItem.id)
          : null;

        const isAllowed = adj ? adj.allowed !== false : true;
        if (!isAllowed) {
          await prisma.requisitionItem.update({
            where: { id: reqItem.id },
            data: {
              quantityDispensed: 0,
              unitCost: 0,
              totalCost: 0,
            },
          });
          continue;
        }

        let remainingToDeduct =
          adj && adj.quantity !== undefined
            ? Math.max(0, Number(adj.quantity))
            : reqItem.quantityRequested;

        const requestedTarget = remainingToDeduct;
        let itemTotalCost = 0;

        // Fetch lots FIFO: sorted by expiryDate ascending
        const availableLots = await prisma.stockLot.findMany({
          where: {
            itemId: reqItem.itemId,
            quantityRemaining: { gt: 0 },
          },
          orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
        });

        for (const lot of availableLots) {
          if (remainingToDeduct <= 0) break;

          const deductFromThisLot = Math.min(lot.quantityRemaining, remainingToDeduct);
          const costForThisDeduction = deductFromThisLot * lot.unitCost;

          // Update lot
          await prisma.stockLot.update({
            where: { id: lot.id },
            data: {
              quantityRemaining: lot.quantityRemaining - deductFromThisLot,
            },
          });

          // Create stock transaction
          await prisma.stockTransaction.create({
            data: {
              itemId: reqItem.itemId,
              lotId: lot.id,
              type: 'OUT_REQUISITION',
              quantity: -deductFromThisLot,
              unitCost: lot.unitCost,
              totalCost: costForThisDeduction,
              courseId: requisition.courseId,
              referenceNumber: requisition.requestNumber,
              createdById: userId,
              note: `จ่ายตามคำขอ ${requisition.requestNumber} (วิชา ${requisition.course?.code || ''})`,
            },
          });

          // Update individual RepackPackItems in sequential order (1..N) if this lot belongs to a repack sub-lot
          const availablePacks = await prisma.repackPackItem.findMany({
            where: {
              repackRecord: { subLotNumber: lot.lotNumber },
              status: 'AVAILABLE',
            },
            orderBy: { packNumber: 'asc' },
            take: deductFromThisLot,
          });

          if (availablePacks.length > 0) {
            await prisma.repackPackItem.updateMany({
              where: { id: { in: availablePacks.map((p) => p.id) } },
              data: {
                status: 'DISPENSED',
                dispensedTo: requisition.user ? `${requisition.user.name} (${requisition.requestNumber})` : requisition.requestNumber,
                dispensedAt: new Date(),
              },
            });
          }

          itemTotalCost += costForThisDeduction;
          remainingToDeduct -= deductFromThisLot;
        }

        const actualDispensed = requestedTarget - remainingToDeduct;

        // Update requisition item with dispensed quantity and actual cost
        await prisma.requisitionItem.update({
          where: { id: reqItem.id },
          data: {
            quantityDispensed: actualDispensed,
            unitCost: actualDispensed > 0 ? itemTotalCost / actualDispensed : 0,
            totalCost: itemTotalCost,
          },
        });

        actualTotalCost += itemTotalCost;
      }

      const updated = await prisma.requisitionRequest.update({
        where: { id },
        data: {
          status: 'DISPENSED',
          officerId: userId,
          dispensedAt: new Date(),
          totalCost: actualTotalCost,
        },
        include: {
          items: { include: { item: true } },
          course: true,
        },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Requisition dispense error:', error);
    return NextResponse.json({ error: error.message || 'Dispense failed' }, { status: 500 });
  }
}
