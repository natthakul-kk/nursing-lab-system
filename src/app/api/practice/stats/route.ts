import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);

    const [
      activeNowCount,
      activeNowList,
      pendingCount,
      completedBookings,
      recentBookings,
      userBookings,
    ] = await Promise.all([
      prisma.practiceBooking.count({
        where: { status: 'CHECKED_IN' },
      }),
      prisma.practiceBooking.findMany({
        where: { status: 'CHECKED_IN' },
        include: {
          user: true,
          slot: { include: { room: true } },
        },
        orderBy: { checkInTime: 'desc' },
      }),
      prisma.practiceBooking.count({
        where: { status: 'PENDING' },
      }),
      prisma.practiceBooking.findMany({
        where: { status: 'COMPLETED' },
        select: {
          actualMinutes: true,
          skillTopic: true,
        },
      }),
      prisma.practiceBooking.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          slot: { include: { room: true } },
        },
      }),
      userId
        ? prisma.practiceBooking.findMany({
            where: { userId },
            include: {
              slot: { include: { room: true } },
            },
            orderBy: { createdAt: 'desc' },
          })
        : null,
    ]);

    // Calculate total minutes
    const totalMinutes = completedBookings.reduce(
      (sum, b) => sum + (b.actualMinutes || 0),
      0
    );

    // Calculate skill topic distribution
    const skillCounts: Record<string, number> = {};
    for (const b of completedBookings) {
      if (b.skillTopic) {
        skillCounts[b.skillTopic] = (skillCounts[b.skillTopic] || 0) + 1;
      }
    }
    const popularSkills = Object.entries(skillCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // User personal stats (if userId provided)
    let userStats = null;
    if (userBookings) {
      const userCompleted = userBookings.filter((b) => b.status === 'COMPLETED');
      const userTotalMinutes = userCompleted.reduce(
        (sum, b) => sum + (b.actualMinutes || 0),
        0
      );
      const upcoming = userBookings.filter(
        (b) => b.status === 'APPROVED' || b.status === 'CHECKED_IN' || b.status === 'PENDING'
      );

      userStats = {
        totalSessions: userCompleted.length,
        totalMinutes: userTotalMinutes,
        totalHours: (userTotalMinutes / 60).toFixed(1),
        upcomingCount: upcoming.length,
        upcomingBookings: upcoming.slice(0, 3),
      };
    }

    return NextResponse.json({
      activeNow: activeNowCount,
      activeNowList,
      pendingApprovals: pendingCount,
      totalCompletedSessions: completedBookings.length,
      totalPracticeMinutes: totalMinutes,
      totalPracticeHours: (totalMinutes / 60).toFixed(1),
      popularSkills,
      recentBookings,
      userStats,
    });
  } catch (error: any) {
    console.error('Error fetching practice stats:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch stats' }, { status: 500 });
  }
}
