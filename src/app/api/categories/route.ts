import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

// GET: List all categories with item counts
export async function GET() {
  try {
    const cacheKey = 'categories:list';
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    setCached(cacheKey, categories, 60 * 1000); // 60s TTL
    return NextResponse.json(categories);
  } catch (error: any) {
    console.error('Failed to get categories:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST: Create a new category
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, code, type, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อหมวดหมู่' }, { status: 400 });
    }

    const categoryType = type === 'EQUIPMENT' ? 'EQUIPMENT' : 'CONSUMABLE';
    const categoryCode = code ? code.trim().toUpperCase() : null;

    // Check duplicate name
    const existingName = await prisma.category.findFirst({
      where: { name: name.trim() },
    });

    if (existingName) {
      return NextResponse.json({ error: 'ชื่อหมวดหมู่นี้มีอยู่ในระบบแล้ว' }, { status: 400 });
    }

    // Check duplicate code if provided
    if (categoryCode) {
      const existingCode = await prisma.category.findFirst({
        where: { code: categoryCode },
      });
      if (existingCode) {
        return NextResponse.json({ error: `รหัสหมวดหมู่ "${categoryCode}" มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น` }, { status: 400 });
      }
    }

    const created = await prisma.category.create({
      data: {
        name: name.trim(),
        code: categoryCode,
        type: categoryType,
        description: description?.trim() || null,
      },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    invalidateCache('categories:');
    return NextResponse.json({ success: true, category: created });
  } catch (error: any) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create category' }, { status: 500 });
  }
}
