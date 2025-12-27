import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/analytics/dashboard
 *
 * Comprehensive performance dashboard for user
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

    // Get user leaderboard data
    const userLeaderboard = await prisma.userLeaderboard.findUnique({
      where: { userId },
    });

    if (!userLeaderboard) {
      return NextResponse.json(
        {
          performance: {
            overallAccuracy: 0,
            averageScore: 0,
            estimatedReadiness: 0,
            globalRank: 0,
          },
          activity: {
            questionsThisWeek: 0,
            testsThisWeek: 0,
            studyTimeThisWeek: 0,
          },
          trends: {
            weeklyGrowth: 0,
            monthlyGrowth: 0,
            projectedExamDate: null,
          },
        },
        { status: 200 }
      );
    }

    // Get all user tests this week
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const testsThisWeek = await prisma.test.findMany({
      where: {
        userId,
        completedAt: { gte: sevenDaysAgo },
      },
      include: {
        answers: {
          include: { questionScore: true },
        },
      },
    });

    // Calculate activity metrics
    const questionsThisWeek = testsThisWeek.reduce((sum, test) => sum + test.answers.length, 0);
    const totalTimeThisWeek = testsThisWeek.reduce((sum, test) => {
      return sum + test.answers.reduce((s, a) => s + (a.timeSpent || 0), 0);
    }, 0);

    // Get all-time accuracy
    const allAnswers = await prisma.answer.findMany({
      where: { userId },
      include: { questionScore: true },
    });

    const correctAnswers = allAnswers.filter((a) => a.isCorrect === true).length;
    const overallAccuracy = allAnswers.length > 0 ? (correctAnswers / allAnswers.length) * 100 : 0;

    // Calculate growth metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const testsLastMonth = await prisma.test.findMany({
      where: {
        userId,
        completedAt: { gte: thirtyDaysAgo },
      },
      include: {
        answers: true,
      },
    });

    const testsFirstHalf = testsLastMonth.slice(0, Math.floor(testsLastMonth.length / 2));
    const testsSecondHalf = testsLastMonth.slice(Math.floor(testsLastMonth.length / 2));

    const scoreFirstHalf = calculateAverageScore(testsFirstHalf);
    const scoreSecondHalf = calculateAverageScore(testsSecondHalf);

    const monthlyGrowth = scoreFirstHalf > 0 ? ((scoreSecondHalf - scoreFirstHalf) / scoreFirstHalf) * 100 : 0;

    const testsLastWeek = testsThisWeek.slice(0, Math.floor(testsThisWeek.length / 2));
    const testsThisWeekSecondHalf = testsThisWeek.slice(Math.floor(testsThisWeek.length / 2));

    const scoreLastWeek = calculateAverageScore(testsLastWeek);
    const scoreThisWeekSecondHalf = calculateAverageScore(testsThisWeekSecondHalf);

    const weeklyGrowth = scoreLastWeek > 0 ? ((scoreThisWeekSecondHalf - scoreLastWeek) / scoreLastWeek) * 100 : 0;

    // Estimate readiness (0-100)
    const estimatedReadiness = Math.min(
      100,
      Math.round(
        overallAccuracy * 0.5 + // 50% accuracy
        (userLeaderboard.averageScore || 0) * 0.3 + // 30% average score
        Math.min(100, (userLeaderboard.totalTests / 100) * 100) * 0.2 // 20% test count
      )
    );

    // Get rank
    const usersAbove = await prisma.userLeaderboard.count({
      where: {
        OR: [
          { averageScore: { gt: userLeaderboard.averageScore } },
          {
            AND: [
              { averageScore: userLeaderboard.averageScore },
              { totalCorrectAnswers: { gt: 0 } },
            ],
          },
        ],
      },
    });

    const globalRank = usersAbove + 1;

    return NextResponse.json(
      {
        performance: {
          overallAccuracy: parseFloat(overallAccuracy.toFixed(1)),
          averageScore: parseFloat(userLeaderboard.averageScore.toFixed(1)),
          estimatedReadiness,
          globalRank,
        },
        activity: {
          questionsThisWeek,
          testsThisWeek: testsThisWeek.length,
          studyTimeThisWeek: Math.round(totalTimeThisWeek / 60), // in minutes
        },
        trends: {
          weeklyGrowth: parseFloat(weeklyGrowth.toFixed(1)),
          monthlyGrowth: parseFloat(monthlyGrowth.toFixed(1)),
          projectedExamDate: estimateExamDate(userLeaderboard.totalTests, estimatedReadiness),
        },
        breakdown: {
          difficulty: await getDifficultyBreakdown(userId),
          system: await getSystemBreakdown(userId),
          topTopics: await getTopTopics(userId, 5),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching analytics dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

function calculateAverageScore(tests: any[]): number {
  if (tests.length === 0) return 0;
  const scores = tests.map((t) => {
    const correct = t.answers.filter((a: any) => a.isCorrect === true).length;
    return (correct / t.answers.length) * 100;
  });
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function estimateExamDate(testsCompleted: number, readiness: number): string | null {
  // Simple estimation based on test count and readiness
  // More tests = sooner, higher readiness = sooner
  if (readiness < 60 || testsCompleted < 10) {
    return null; // Not ready to estimate
  }

  const weeksNeeded = Math.max(1, Math.ceil((100 - readiness) / 5));
  const examDate = new Date();
  examDate.setDate(examDate.getDate() + weeksNeeded * 7);
  return examDate.toISOString().split('T')[0];
}

async function getDifficultyBreakdown(userId: string) {
  const answers = await prisma.answer.findMany({
    where: { userId },
    include: { question: true },
  });

  const breakdown: any = {};
  answers.forEach((answer) => {
    const difficulty = answer.question.difficulty;
    if (!breakdown[difficulty]) {
      breakdown[difficulty] = { correct: 0, total: 0 };
    }
    breakdown[difficulty].total += 1;
    if (answer.isCorrect) breakdown[difficulty].correct += 1;
  });

  const result: any = {};
  Object.entries(breakdown).forEach(([difficulty, data]: [string, any]) => {
    result[difficulty] = parseFloat(((data.correct / data.total) * 100).toFixed(1));
  });

  return result;
}

async function getSystemBreakdown(userId: string) {
  const answers = await prisma.answer.findMany({
    where: { userId },
    include: { question: { include: { system: true } } },
  });

  const breakdown: any = {};
  answers.forEach((answer) => {
    if (answer.question.system) {
      const systemName = answer.question.system.name;
      if (!breakdown[systemName]) {
        breakdown[systemName] = { correct: 0, total: 0 };
      }
      breakdown[systemName].total += 1;
      if (answer.isCorrect) breakdown[systemName].correct += 1;
    }
  });

  const result: any = {};
  Object.entries(breakdown).forEach(([system, data]: [string, any]) => {
    result[system] = parseFloat(((data.correct / data.total) * 100).toFixed(1));
  });

  return result;
}

async function getTopTopics(userId: string, limit: number = 5) {
  const answers = await prisma.answer.findMany({
    where: { userId },
    include: { question: { include: { topic: true } } },
  });

  const breakdown: any = {};
  answers.forEach((answer) => {
    if (answer.question.topic) {
      const topicName = answer.question.topic.name;
      if (!breakdown[topicName]) {
        breakdown[topicName] = { correct: 0, total: 0 };
      }
      breakdown[topicName].total += 1;
      if (answer.isCorrect) breakdown[topicName].correct += 1;
    }
  });

  const topics = Object.entries(breakdown)
    .map(([topic, data]: [string, any]) => ({
      topic,
      accuracy: parseFloat(((data.correct / data.total) * 100).toFixed(1)),
      questionsAttempted: data.total,
    }))
    .sort((a, b) => b.questionsAttempted - a.questionsAttempted)
    .slice(0, limit);

  return topics;
}
