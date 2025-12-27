import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/analytics
 *
 * Admin analytics dashboard
 */

export async function GET(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-user-id');

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID required' },
        { status: 400 }
      );
    }

    // Get platform statistics
    const [
      totalUsers,
      totalTests,
      totalAnswers,
      totalQuestions,
      totalSystems,
      totalTopics,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.test.count(),
      prisma.answer.count(),
      prisma.question.count(),
      prisma.system.count(),
      prisma.topic.count(),
    ]);

    // Get recent activity
    const recentTests = await prisma.test.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 7)),
        },
      },
    });

    const completedTests = await prisma.test.count({
      where: {
        completedAt: { not: null },
      },
    });

    // Get average scores
    const leaderboardData = await prisma.userLeaderboard.aggregate({
      _avg: { averageScore: true },
      _max: { averageScore: true },
      _min: { averageScore: true },
    });

    // Get performance by difficulty
    const questions = await prisma.question.findMany({
      select: { difficulty: true, totalAttempts: true, correctAttempts: true },
    });

    const performanceByDifficulty: any = {};
    questions.forEach((q) => {
      if (!performanceByDifficulty[q.difficulty]) {
        performanceByDifficulty[q.difficulty] = { attempts: 0, correct: 0 };
      }
      performanceByDifficulty[q.difficulty].attempts += q.totalAttempts || 0;
      performanceByDifficulty[q.difficulty].correct += q.correctAttempts || 0;
    });

    const difficultyStats: any = {};
    Object.entries(performanceByDifficulty).forEach(([difficulty, data]: [string, any]) => {
      difficultyStats[difficulty] = parseFloat(
        ((data.correct / (data.attempts || 1)) * 100).toFixed(1)
      );
    });

    return NextResponse.json(
      {
        platformStats: {
          totalUsers,
          totalTests,
          completedTests,
          totalAnswers,
          totalQuestions,
          totalSystems,
          totalTopics,
          testCompletionRate: totalTests > 0 ? parseFloat(((completedTests / totalTests) * 100).toFixed(1)) : 0,
        },
        activityStats: {
          testsThisWeek: recentTests,
          activeUsers: totalUsers, // Would calculate from interactions
          averageTestsPerUser: totalUsers > 0 ? parseFloat((totalTests / totalUsers).toFixed(2)) : 0,
        },
        performanceStats: {
          globalAverageScore: leaderboardData._avg.averageScore
            ? parseFloat(leaderboardData._avg.averageScore.toFixed(1))
            : 0,
          highestScore: leaderboardData._max.averageScore,
          lowestScore: leaderboardData._min.averageScore,
          byDifficulty: difficultyStats,
        },
        contentStats: {
          questionsPerSystem: totalQuestions / Math.max(totalSystems, 1),
          topicsPerSystem: totalTopics / Math.max(totalSystems, 1),
          averageQuestionAttempts: totalQuestions > 0
            ? parseFloat((totalAnswers / totalQuestions).toFixed(1))
            : 0,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
