import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get test statistics
    const tests = await prisma.test.findMany({
      where: { userId },
      select: {
        id: true,
        totalCorrect: true,
        totalIncorrect: true,
        totalSkipped: true,
        totalQuestions: true,
        score: true,
        completedAt: true,
        mode: true,
      },
    });

    // Calculate metrics
    const totalTests = tests.length;
    const completedTests = tests.filter((t) => t.completedAt).length;
    const totalQuestionsAnswered = tests.reduce((sum, t) => sum + t.totalCorrect + t.totalIncorrect, 0);
    const totalCorrectAnswers = tests.reduce((sum, t) => sum + t.totalCorrect, 0);
    const overallSuccessRate = totalQuestionsAnswered > 0 ? (totalCorrectAnswers / totalQuestionsAnswered) * 100 : 0;
    const averageScore = completedTests > 0 ? tests.reduce((sum, t) => sum + (t.score || 0), 0) / completedTests : 0;

    // Get progress by system
    const progress = await prisma.progress.findMany({
      where: { userId },
      include: {
        system: true,
        topic: true,
        subject: true,
      },
    });

    // Get recent interactions
    const recentInteractions = await prisma.userInteraction.findMany({
      where: { userId },
      select: {
        id: true,
        actionType: true,
        entityType: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Get interaction heatmap (by hour of day)
    const interactionsByHour = await prisma.userInteraction.groupBy({
      by: [],
      where: { userId },
      _count: { id: true },
    });

    // Get most reviewed questions
    const mostReviewedQuestions = await prisma.answer.groupBy({
      by: ['questionId'],
      where: { userId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      statistics: {
        totalTests,
        completedTests,
        totalQuestionsAnswered,
        totalCorrectAnswers,
        overallSuccessRate: Math.round(overallSuccessRate * 100) / 100,
        averageScore: Math.round(averageScore * 100) / 100,
      },
      progress,
      recentInteractions,
      mostReviewedQuestions,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
