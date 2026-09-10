import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

// GET: Fetch all Practice Kits with their items and stock availability
export async function GET(req: Request) {
  try {
    const cacheKey = 'kits:list';
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
    const kits = await prisma.practiceKit.findMany({
      where: { isActive: true },
      include: {
        items: {
          include: {
            item: {
              include: {
                category: true,
                assets: {
                  where: { status: 'AVAILABLE' },
                },
                stockLots: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate max available kits based on component stocks
    const kitsWithAvailability = kits.map((kit) => {
      let maxAvailable = Infinity;

      const components = kit.items.map((kitItem) => {
        let currentAvailableStock = 0;
        if (kitItem.item.type === 'EQUIPMENT') {
          currentAvailableStock = kitItem.item.assets.length;
        } else {
          currentAvailableStock = kitItem.item.stockLots.reduce(
            (sum, lot) => sum + lot.quantityRemaining,
            0
          );
        }

        const possibleSets = Math.floor(currentAvailableStock / kitItem.quantity);
        if (possibleSets < maxAvailable) {
          maxAvailable = possibleSets;
        }

        const openPackRemainder =
          kitItem.item.type === 'CONSUMABLE'
            ? kitItem.item.stockLots.reduce((sum, lot) => sum + (lot.openPackRemainder || 0), 0)
            : 0;

        return {
          id: kitItem.id,
          itemId: kitItem.itemId,
          name: kitItem.item.name,
          code: kitItem.item.code,
          type: kitItem.item.type,
          unit: kitItem.item.unit,
          usageUnit: kitItem.item.usageUnit,
          conversionRatio: kitItem.item.conversionRatio || 1,
          category: kitItem.item.category.name,
          quantityPerKit: kitItem.quantity,
          currentStock: currentAvailableStock,
          openPackRemainder,
          isSufficient: currentAvailableStock >= kitItem.quantity || openPackRemainder >= kitItem.quantity,
        };
      });

      return {
        id: kit.id,
        code: kit.code,
        name: kit.name,
        category: kit.category,
        description: kit.description,
        targetCourse: kit.targetCourse,
        imageUrl: kit.imageUrl,
        createdAt: kit.createdAt,
        maxAvailableKits: maxAvailable === Infinity ? 0 : Math.max(0, maxAvailable),
        components,
      };
    });

    setCached(cacheKey, kitsWithAvailability, 30 * 1000); // 30s TTL
    return NextResponse.json(kitsWithAvailability);
  } catch (error: any) {
    console.error('Fetch Kits Error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลชุดฝึกปฏิบัติการ' },
      { status: 500 }
    );
  }
}

// POST: Create a new Practice Kit
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, name, category, description, targetCourse, imageUrl, items } = body;

    const validItems = Array.isArray(items)
      ? items.filter((it: any) => it && it.itemId && typeof it.itemId === 'string' && it.itemId.trim() !== '')
      : [];

    if (!name || !name.trim() || validItems.length === 0) {
      return NextResponse.json(
        { error: 'กรุณาระบุชื่อชุดฝึกและเลือกส่วนประกอบอย่างน้อย 1 รายการ' },
        { status: 400 }
      );
    }

    let kitCode = code ? code.trim().toUpperCase() : '';
    if (!kitCode) {
      const count = await prisma.practiceKit.count();
      kitCode = 'KIT-' + String(count + 1).padStart(3, '0');
    }

    const newKit = await prisma.practiceKit.create({
      data: {
        code: kitCode,
        name: name.trim(),
        category: category || 'หัตถการพื้นฐาน',
        description: description || null,
        targetCourse: targetCourse || null,
        imageUrl: imageUrl || null,
        items: {
          create: validItems.map((it: any) => ({
            itemId: it.itemId.trim(),
            quantity: Math.max(1, Number(it.quantity) || 1),
          })),
        },
      },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    invalidateCache('kits:');
    return NextResponse.json(newKit, { status: 201 });
  } catch (error: any) {
    console.error('Create Kit Error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการสร้างชุดฝึกปฏิบัติการ' },
      { status: 500 }
    );
  }
}