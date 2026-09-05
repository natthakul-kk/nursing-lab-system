import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const existing = await prisma.practiceKit.count();
    if (existing > 0) {
      return NextResponse.json({ message: `มีชุดฝึกปฏิบัติการอยู่ในระบบแล้ว (${existing} ชุด)` });
    }

    const items = await prisma.item.findMany();
    if (items.length === 0) {
      return NextResponse.json({ message: 'ยังไม่มีรายการพัสดุในคลังสำหรับจัดชุด' });
    }

    const byCode: Record<string, string> = {};
    items.forEach((i) => { byCode[i.code] = i.id; });

    // Kit 1: IV Therapy
    const ivItems = [
      { code: 'EQ-MNK-002', qty: 1 },
      { code: 'RP-CON-IV-002-5', qty: 1 },
      { code: 'RP-CON-PPE-002-5', qty: 1 },
      { code: 'CON-IV-001', qty: 1 },
      { code: 'CON-IV-003', qty: 2 },
      { code: 'CON-IV-004', qty: 1 },
      { code: 'CON-WD-002', qty: 1 },
    ].filter((x) => byCode[x.code]);

    await prisma.practiceKit.create({
      data: {
        code: 'KIT-IV-01',
        name: 'ชุดฝึกเปิดเส้นให้สารน้ำทางหลอดเลือดดำ (IV Therapy Practice Kit)',
        category: 'หัตถการให้สารน้ำและยา',
        description: 'ชุดฝึกปฏิบัติการเปิดเส้นแทงน้ำเกลือ บรรจุแขนฝึกเจาะเลือด ถุงมือแบ่งซอง สาย IV Set และเข็มแทงพร้อมใช้งาน',
        targetCourse: 'NUR2101 การพยาบาลพื้นฐาน',
        items: {
          create: ivItems.map((x) => ({
            itemId: byCode[x.code],
            quantity: x.qty,
          })),
        },
      },
    });

    // Kit 2: Dressing Kit
    const dressingItems = [
      { code: 'CON-WD-001', qty: 1 },
      { code: 'RP-CON-PPE-001-10', qty: 1 },
      { code: 'CON-WD-002', qty: 1 },
    ].filter((x) => byCode[x.code]);

    await prisma.practiceKit.create({
      data: {
        code: 'KIT-DRESSING-01',
        name: 'ชุดฝึกปฏิบัติการทำแผลปราศจากเชื้อ (Sterile Dressing Set)',
        category: 'หัตถการพื้นฐานทางการพยาบาล',
        description: 'สำหรับฝึกปฏิบัติการทำแผลแห้ง (Dry dressing) และแผลเปียก (Wet dressing) พร้อมชุดทำแผลและถุงมือปลอดเชื้อแบ่งซอง',
        targetCourse: 'NUR2101 การพยาบาลพื้นฐาน',
        items: {
          create: dressingItems.map((x) => ({
            itemId: byCode[x.code],
            quantity: x.qty,
          })),
        },
      },
    });

    // Kit 3: Emergency Kit
    const cprItems = [
      { code: 'EQ-MNK-001', qty: 1 },
      { code: 'EQ-AED-001', qty: 1 },
      { code: 'EQ-MED-001', qty: 1 },
    ].filter((x) => byCode[x.code]);

    await prisma.practiceKit.create({
      data: {
        code: 'KIT-CPR-01',
        name: 'ชุดฝึกช่วยฟื้นคืนชีพและการกู้ชีพฉุกเฉิน (CPR & Basic Life Support Set)',
        category: 'การพยาบาลฉุกเฉินและอุบัติเหตุ',
        description: 'สำหรับฝึกการช่วยฟื้นคืนชีพขั้นพื้นฐาน เครื่องกระตุกหัวใจไฟฟ้า AED และการประเมินสัญญาณชีพ',
        targetCourse: 'NUR3102 การพยาบาลผู้ใหญ่และผู้สูงอายุ 2',
        items: {
          create: cprItems.map((x) => ({
            itemId: byCode[x.code],
            quantity: x.qty,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, message: 'สร้างชุดฝึกปฏิบัติการตัวอย่างเรียบร้อยแล้ว' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
