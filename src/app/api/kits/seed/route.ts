import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const existing = await prisma.practiceKit.count();
    if (existing > 0) {
      return NextResponse.json({ message: 'มีชุดฝึกปฏิบัติการอยู่ในระบบแล้ว (' + existing + ' ชุด)' });
    }

    const items = await prisma.item.findMany();
    if (items.length === 0) {
      return NextResponse.json({ message: 'ยังไม่มีรายการพัสดุในคลังสำหรับจัดชุด' });
    }

    const findItem = (kw: string) =>
      items.find((i) => i.name.toLowerCase().includes(kw.toLowerCase()) || i.code.toLowerCase().includes(kw.toLowerCase()));

    // Kit 1: Dressing Kit
    await prisma.practiceKit.create({
      data: {
        code: 'KIT-DRESSING-01',
        name: 'ชุดฝึกปฏิบัติการทำแผลปราศจากเชื้อ (Sterile Dressing Set)',
        category: 'หัตถการพื้นฐานทางการพยาบาล',
        description: 'สำหรับฝึกปฏิบัติการทำแผลแห้ง (Dry dressing) และแผลเปียก (Wet dressing) ในวิชาการพยาบาลพื้นฐาน',
        targetCourse: 'NUR2101 การพยาบาลพื้นฐาน',
        items: {
          create: items.slice(0, 3).map((it, idx) => ({
            itemId: it.id,
            quantity: idx === 0 ? 1 : idx === 1 ? 2 : 4,
          })),
        },
      },
    });

    // Kit 2: Catheterization Kit
    await prisma.practiceKit.create({
      data: {
        code: 'KIT-CATH-01',
        name: 'ชุดฝึกการใส่สายสวนปัสสาวะ (Urinary Catheterization Set)',
        category: 'หัตถการการขับถ่าย',
        description: 'สำหรับฝึกใส่สายสวนปัสสาวะคาสาย (Foley catheterization) และสายสวนชั่วคราว',
        targetCourse: 'NUR2101 การพยาบาลพื้นฐาน',
        items: {
          create: items.slice(2, 5).map((it) => ({
            itemId: it.id,
            quantity: 1,
          })),
        },
      },
    });

    // Kit 3: Emergency Kit
    await prisma.practiceKit.create({
      data: {
        code: 'KIT-CPR-01',
        name: 'ชุดฝึกช่วยฟื้นคืนชีพและการกู้ชีพฉุกเฉิน (CPR & Basic Life Support Set)',
        category: 'การพยาบาลฉุกเฉินและอุบัติเหตุ',
        description: 'สำหรับฝึกการช่วยฟื้นคืนชีพขั้นพื้นฐาน เครื่องกระตุกหัวใจไฟฟ้า และการเปิดทางเดินหายใจ',
        targetCourse: 'NUR3102 การพยาบาลผู้ใหญ่และผู้สูงอายุ 2',
        items: {
          create: items.slice(0, 2).map((it) => ({
            itemId: it.id,
            quantity: 1,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, message: 'สร้าง 3 ชุดฝึกปฏิบัติการตัวอย่างเรียบร้อยแล้ว' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}