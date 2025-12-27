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
      include: {
        leaderboard: true,
      },
      take: limit,
    });

    const results = users.map((user) => ({
      id: user.id,
      name: user.name || 'Anonymous',
      email: user.email,
      image: user.image,
      rank: user.leaderboard[0]?.rank || 0,
      averageScore: user.leaderboard[0]?.averageScore || 0,
      testsCompleted: user.leaderboard[0]?.testsCompleted || 0,
    }));

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
