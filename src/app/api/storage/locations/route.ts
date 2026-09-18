import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const where: any = {};
    if (roomId) where.roomId = roomId;
    if (type && type !== 'ALL') where.type = type;
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { roomName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const locations = await prisma.storageLocation.findMany({
      where,
      include: {
        room: {
          select: {
            id: true,
            code: true,
            name: true,
            location: true,
            qrCodeToken: true,
          },
        },
        _count: {
          select: {
            items: true,
            assets: true,
          },
        },
        items: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            unit: true,
            minStockAlert: true,
            stockLots: {
              where: { quantityRemaining: { gt: 0 } },
              select: { quantityRemaining: true },
            },
            _count: {
              select: { assets: true },
            },
            category: { select: { id: true, name: true } },
          },
          take: 12,
        },
        assets: {
          select: {
            id: true,
            assetCode: true,
            status: true,
            item: { select: { id: true, name: true } },
          },
          take: 12,
        },
      },
      orderBy: [
        { building: 'asc' },
        { floor: 'asc' },
        { code: 'asc' },
      ],
    });

    const formatted = locations.map((loc: any) => ({
      ...loc,
      items: loc.items.map((item: any) => {
        const totalQty =
          item.type === 'CONSUMABLE'
            ? item.stockLots.reduce((acc: number, l: any) => acc + l.quantityRemaining, 0)
            : item._count?.assets || 0;
        return {
          id: item.id,
          code: item.code,
          name: item.name,
          type: item.type,
          unit: item.unit,
          totalQuantity: totalQty,
          minQuantity: item.minStockAlert,
          category: item.category,
        };
      }),
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Error fetching storage locations:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch storage locations' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, name, type, roomId, roomName, floor, building, description, status } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'กรุณากรอกรหัสและชื่อตู้/จุดจัดเก็บ' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    const existing = await prisma.storageLocation.findUnique({
      where: { code: cleanCode },
    });
    if (existing) {
      return NextResponse.json({ error: `รหัสตู้/จุดจัดเก็บ ${cleanCode} มีอยู่ในระบบแล้ว` }, { status: 400 });
    }

    let finalRoomName = roomName;
    let finalFloor = floor || 'ชั้น 3';
    let finalBuilding = building || 'อาคารวิทยบริการ';

    if (roomId) {
      const room = await prisma.practiceRoom.findUnique({
        where: { id: roomId },
      });
      if (room) {
        finalRoomName = room.name;
        if (room.location && room.location.includes('ชั้น')) {
          const match = room.location.match(/ชั้น\s*\d+/);
          if (match) finalFloor = match[0];
        }
      }
    }

    const qrToken = 'CAB-' + crypto.randomBytes(6).toString('hex').toUpperCase();

    const location = await prisma.storageLocation.create({
      data: {
        code: cleanCode,
        name: name.trim(),
        type: type || 'CABINET',
        roomId: roomId || null,
        roomName: finalRoomName || null,
        floor: finalFloor,
        building: finalBuilding,
        description: description?.trim() || null,
        status: status || 'ACTIVE',
        qrCodeToken: qrToken,
      },
      include: {
        room: true,
        _count: {
          select: { items: true, assets: true },
        },
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error: any) {
    console.error('Error creating storage location:', error);
    return NextResponse.json({ error: error.message || 'Failed to create storage location' }, { status: 500 });
  }
}
