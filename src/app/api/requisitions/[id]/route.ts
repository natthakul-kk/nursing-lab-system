import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, userId, reason } = body;

    const requisition = await prisma.requisitionRequest.findUnique({
      where: { id },
      include: {
        items: true,
        course: true,
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
      // Officer dispenses items and deducts stock FIFO
      let actualTotalCost = 0;

      for (const reqItem of requisition.items) {
        let remainingToDeduct = reqItem.quantityRequested;
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

          itemTotalCost += costForThisDeduction;
          remainingToDeduct -= deductFromThisLot;
        }

        const effectiveUnitCost =
          reqItem.quantityRequested > 0 ? itemTotalCost / reqItem.quantityRequested : 0;

        // Update requisition item with dispensed quantity and actual cost
        await prisma.requisitionItem.update({
          where: { id: reqItem.id },
          data: {
            quantityDispensed: reqItem.quantityRequested - remainingToDeduct,
            unitCost: effectiveUnitCost,
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
