import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/search/users
 *
 * Find users by name or email
 * Query parameters:
 * - q: search term (required)
 * - limit: number (default: 10)
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    if (!q) {
      return NextResponse.json(
        { error: 'Search query required' },
        { status: 400 }
      );
    }

    // Get authenticated user ID
    const userId = request.headers.get('x-user-id');

    // Search users
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
        NOT: {
          id: userId || 'none', // Exclude self
        },
      },
      take: limit,
    });

    // Fetch leaderboard data separately
    const userIds = users.map((u) => u.id);
    const leaderboardData = await prisma.userLeaderboard.findMany({
      where: { userId: { in: userIds } },
    });

    const leaderboardMap = new Map(
      leaderboardData.map((lb) => [lb.userId, lb])
    );

    const results = users.map((user) => {
      const leaderboard = leaderboardMap.get(user.id);
      return {
        id: user.id,
        name: user.name || 'Anonymous',
        email: user.email,
        avatar: user.avatar,
        rank: leaderboard?.rank || 0,
        averageScore: leaderboard?.averageScore || 0,
        testsCompleted: leaderboard?.totalTests || 0,
      };
    });

    return NextResponse.json(
      {
        results,
        total: results.length,
        query: q,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}
