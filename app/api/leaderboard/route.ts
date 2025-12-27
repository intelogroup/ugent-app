import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/leaderboard
 *
 * Retrieves global rankings with filtering options
 * Query parameters:
 * - timeframe: overall|weekly|monthly (default: overall)
 * - difficulty: all|EASY|MEDIUM|HARD (default: all)
 * - limit: number (default: 100, max: 1000)
 * - offset: number (default: 0)
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeframe = searchParams.get('timeframe') || 'overall';
    const difficulty = searchParams.get('difficulty') || 'all';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate timeframe
    if (!['overall', 'weekly', 'monthly'].includes(timeframe)) {
      return NextResponse.json(
        { error: 'Invalid timeframe' },
        { status: 400 }
      );
    }

    // Calculate date filter based on timeframe
    let dateFilter: any = {};
    if (timeframe === 'weekly') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      dateFilter = { gte: sevenDaysAgo };
    } else if (timeframe === 'monthly') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter = { gte: thirtyDaysAgo };
    }

    // Build query
    let testFilter: any = {};
    if (Object.keys(dateFilter).length > 0) {
      testFilter.completedAt = dateFilter;
    }

    if (difficulty !== 'all') {
      testFilter.questions = {
        some: {
          question: {
            difficulty,
          },
        },
      };
    }

    // Get leaderboard data
    const leaderboard = await prisma.userLeaderboard.findMany({
      orderBy: [{ averageScore: 'desc' }, { totalCorrectAnswers: 'desc' }],
      skip: offset,
      take: limit,
    });

    // Calculate total users for pagination
    const totalUsers = await prisma.userLeaderboard.count();

    // Fetch user data separately
    const userIds = leaderboard.map((entry) => entry.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
    });

    const userMap = new Map(users.map((user) => [user.id, user]));

    // Add rank to each user
    const leaderboardWithRank = leaderboard.map((entry, index) => {
      const user = userMap.get(entry.userId);
      return {
        rank: offset + index + 1,
        userId: entry.userId,
        userName: user?.name || 'Anonymous',
        userEmail: user?.email,
        avatar: user?.avatar,
        averageScore: parseFloat(entry.averageScore.toFixed(2)),
        totalCorrectAnswers: entry.totalCorrectAnswers,
        testsCompleted: entry.totalTests,
        streak: entry.streakDays || 0,
        percentile: calculatePercentile(offset + index + 1, totalUsers),
      };
    });

    // Calculate percentile ranks
    const leaderboardData = leaderboardWithRank.map((entry) => ({
      ...entry,
      percentile: calculatePercentile(entry.rank, totalUsers),
    }));

    return NextResponse.json(
      {
        leaderboard: leaderboardData,
        timeframe,
        difficulty,
        pagination: {
          total: totalUsers,
          limit,
          offset,
          returned: leaderboardData.length,
        },
        updatedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

function calculatePercentile(rank: number, total: number): number {
  if (total === 0) return 0;
  return parseFloat((((total - rank + 1) / total) * 100).toFixed(1));
}
