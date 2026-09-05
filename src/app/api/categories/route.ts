import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List all categories with item counts
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { name: 'asc' },
    });
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
    const { name, type, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อหมวดหมู่' }, { status: 400 });
    }

    const categoryType = type === 'EQUIPMENT' ? 'EQUIPMENT' : 'CONSUMABLE';

    // Check duplicate name
    const existing = await prisma.category.findFirst({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json({ error: 'ชื่อหมวดหมู่นี้มีอยู่ในระบบแล้ว' }, { status: 400 });
    }

    const created = await prisma.category.create({
      data: {
        name: name.trim(),
        type: categoryType,
        description: description?.trim() || null,
      },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    return NextResponse.json({ success: true, category: created });
  } catch (error: any) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create category' }, { status: 500 });
  }
}
