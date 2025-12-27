import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/leaderboard/me
 *
 * Gets current user's rank and nearby competitors
 */

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Get user's leaderboard entry
    const userEntry = await prisma.userLeaderboard.findUnique({
      where: { userId },
    });

    // Get user info separately
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
      },
    });

    if (!userEntry) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate user's rank
    const usersAbove = await prisma.userLeaderboard.count({
      where: {
        OR: [
          { averageScore: { gt: userEntry.averageScore } },
          {
            AND: [
              { averageScore: userEntry.averageScore },
              { totalCorrectAnswers: { gt: userEntry.totalCorrectAnswers } },
            ],
          },
        ],
      },
    });

    const userRank = usersAbove + 1;
    const totalUsers = await prisma.userLeaderboard.count();
    const percentile = calculatePercentile(userRank, totalUsers);

    // Get nearby competitors (5 above, 5 below)
    const nearbyCompetitors = await prisma.userLeaderboard.findMany({
      where: {
        NOT: { userId },
      },
      orderBy: [{ averageScore: 'desc' }, { totalCorrectAnswers: 'desc' }],
      take: 10,
    });

    // Get user names for competitors
    const competitorUserIds = nearbyCompetitors.map(c => c.userId);
    const competitorUsers = await prisma.user.findMany({
      where: { id: { in: competitorUserIds } },
      select: { id: true, name: true },
    });
    const userMap = Object.fromEntries(competitorUsers.map(u => [u.id, u.name]));

    // Map ranks to competitors
    const competitorsWithRanks = nearbyCompetitors.map((competitor, index) => {
      const competitorRank = index + 1;
      return {
        rank: competitorRank,
        userName: userMap[competitor.userId] || 'Anonymous',
        averageScore: parseFloat(competitor.averageScore.toFixed(2)),
        totalPoints: competitor.totalCorrectAnswers * 20,
        difference: parseFloat((competitor.averageScore - userEntry.averageScore).toFixed(2)),
      };
    });

    // Get next rank target
    const nextRankUser = await prisma.userLeaderboard.findFirst({
      where: {
        OR: [
          { averageScore: { gt: userEntry.averageScore } },
          {
            AND: [
              { averageScore: userEntry.averageScore },
              { totalCorrectAnswers: { gt: userEntry.totalCorrectAnswers } },
            ],
          },
        ],
      },
      orderBy: [{ averageScore: 'asc' }, { totalCorrectAnswers: 'asc' }],
    });

    const pointsToNextRank = nextRankUser
      ? Math.ceil((nextRankUser.totalCorrectAnswers - userEntry.totalCorrectAnswers) * 20 / 10) * 10
      : 0;

    return NextResponse.json(
      {
        userRank: {
          rank: userRank,
          userId,
          userName: user?.name || 'Anonymous',
          averageScore: parseFloat(userEntry.averageScore.toFixed(2)),
          totalPoints: userEntry.totalCorrectAnswers * 20,
          testsCompleted: userEntry.totalTests,
          currentStreak: userEntry.streakDays || 0,
          percentile,
          pointsToNextRank: Math.max(0, pointsToNextRank),
        },
        nearbyCompetitors: competitorsWithRanks.slice(0, 10),
        stats: {
          totalUsers,
          averageScore: await calculateGlobalAverageScore(),
          averageTestsCompleted: await calculateAverageTestsCompleted(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user rank:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user rank' },
      { status: 500 }
    );
  }
}

function calculatePercentile(rank: number, total: number): number {
  if (total === 0) return 0;
  return parseFloat((((total - rank + 1) / total) * 100).toFixed(1));
}

async function calculateGlobalAverageScore(): Promise<number> {
  const result = await prisma.userLeaderboard.aggregate({
    _avg: {
      averageScore: true,
    },
  });
  return result._avg.averageScore ? parseFloat(result._avg.averageScore.toFixed(2)) : 0;
}

async function calculateAverageTestsCompleted(): Promise<number> {
  const result = await prisma.userLeaderboard.aggregate({
    _avg: {
      totalTests: true,
    },
  });
  return result._avg.totalTests ? Math.round(result._avg.totalTests) : 0;
}
