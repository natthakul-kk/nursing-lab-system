import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let config = await prisma.practiceConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      config = await prisma.practiceConfig.create({
        data: {
          id: 'default',
          maxAdvanceDays: 7,
          minAdvanceHours: 12,
          checkInEarlyMinutes: 30,
          checkOutEarlyMinutes: 15,
          rulesNotice: '1. แต่งกายด้วยชุดฝึกปฏิบัติการพยาบาลถูกระเบียบ\n2. สแกน QR Code เช็คอินเมื่อมาถึง และเช็คเอาท์เมื่อฝึกเสร็จ\n3. ห้ามนำอาหารและเครื่องดื่มเข้าห้องปฏิบัติการ\n4. ตรวจนับอุปกรณ์และจัดเก็บเข้าที่เดิมก่อนออกจากห้องแล็บทุกครั้ง',
        },
      });
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Error fetching practice config:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch config' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { maxAdvanceDays, minAdvanceHours, checkInEarlyMinutes, checkOutEarlyMinutes, rulesNotice } = body;

    const dataToUpdate: any = {};
    if (maxAdvanceDays !== undefined) dataToUpdate.maxAdvanceDays = Math.max(1, Number(maxAdvanceDays));
    if (minAdvanceHours !== undefined) dataToUpdate.minAdvanceHours = Math.max(0, Number(minAdvanceHours));
    if (checkInEarlyMinutes !== undefined) dataToUpdate.checkInEarlyMinutes = Math.max(0, Number(checkInEarlyMinutes));
    if (checkOutEarlyMinutes !== undefined) dataToUpdate.checkOutEarlyMinutes = Math.max(0, Number(checkOutEarlyMinutes));
    if (rulesNotice !== undefined) dataToUpdate.rulesNotice = rulesNotice;

    const updated = await prisma.practiceConfig.upsert({
      where: { id: 'default' },
      update: dataToUpdate,
      create: {
        id: 'default',
        maxAdvanceDays: Number(maxAdvanceDays) || 7,
        minAdvanceHours: Number(minAdvanceHours) || 12,
        checkInEarlyMinutes: Number(checkInEarlyMinutes) !== undefined ? Number(checkInEarlyMinutes) : 30,
        checkOutEarlyMinutes: Number(checkOutEarlyMinutes) !== undefined ? Number(checkOutEarlyMinutes) : 15,
        rulesNotice: rulesNotice || '',
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating practice config:', error);
    return NextResponse.json({ error: error.message || 'Failed to update config' }, { status: 500 });
  }
}
