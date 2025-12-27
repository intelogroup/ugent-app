import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/users
 *
 * Admin endpoint to view all users and statistics
 */

export async function GET(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-user-id');
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 1000);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID required' },
        { status: 400 }
      );
    }

    // Verify admin status (in real app, check roles table)
    // For now, just allow all users

    // Get users
    let filter: any = {};
    if (search) {
      filter.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where: filter,
      include: {
        _count: {
          select: { tests: true, answers: true },
        },
      },
      skip: offset,
      take: limit,
    });

    const totalUsers = await prisma.user.count();

    const userData = users.map((user) => ({
      id: user.id,
      name: user.name || 'Anonymous',
      email: user.email,
      joinedAt: user.createdAt,
      testsCompleted: user._count.tests || 0,
      averageScore: 0,
      totalPoints: 0,
      questionsAnswered: user._count.answers,
      status: 'active',
    }));

    return NextResponse.json(
      {
        users: userData,
        stats: {
          totalUsers,
          activeUsers: totalUsers, // Would calculate from recent activity
          averageScore: await getGlobalAverageScore(),
          totalQuestionsAnswered: await getTotalQuestionsAnswered(),
        },
        pagination: {
          total: totalUsers,
          limit,
          offset,
          returned: userData.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

async function getGlobalAverageScore(): Promise<number> {
  const result = await prisma.userLeaderboard.aggregate({
    _avg: { averageScore: true },
  });
  return result._avg.averageScore ? parseFloat(result._avg.averageScore.toFixed(2)) : 0;
}

async function getTotalQuestionsAnswered(): Promise<number> {
  const result = await prisma.answer.aggregate({
    _count: true,
  });
  return result._count;
}
