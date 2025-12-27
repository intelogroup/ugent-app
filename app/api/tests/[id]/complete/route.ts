import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/tests/:id/complete
 *
 * Marks test as completed and calculates final results
 * Generates performance summary and AI insights
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: testId } = await params;
    const userId = request.headers.get('x-user-id');

    if (!testId || !userId) {
      return NextResponse.json(
        { error: 'Test ID and User ID required' },
        { status: 400 }
      );
    }

    // Get test and answers
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        questions: true,
        answers: {
          include: {
            question: true,
            questionScore: true,
          },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    if (test.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Calculate results
    const totalQuestions = test.questions.length;
    const correctAnswers = test.answers.filter((a) => a.isCorrect === true).length;
    const incorrectAnswers = test.answers.filter((a) => a.isCorrect === false).length;
    const skipped = test.answers.filter((a) => a.status === 'SKIPPED').length;

    const totalPoints = test.answers.reduce((sum, answer) => {
      return sum + (answer.questionScore?.totalPoints || 0);
    }, 0);

    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const totalTimeSpent = test.answers.reduce((sum, answer) => {
      return sum + (answer.timeSpent || 0);
    }, 0);

    // Calculate final score (percentage based)
    const finalScore = (correctAnswers / totalQuestions) * 100;

    // Update test
    const updatedTest = await prisma.test.update({
      where: { id: testId },
      data: {
        completedAt: new Date(),
      },
    });

    // Get performance by difficulty
    const performanceByDifficulty = test.answers.reduce(
      (acc: any, answer) => {
        const difficulty = answer.question.difficulty;
        if (!acc[difficulty]) {
          acc[difficulty] = { correct: 0, total: 0, points: 0 };
        }
        acc[difficulty].total += 1;
        if (answer.isCorrect) acc[difficulty].correct += 1;
        acc[difficulty].points += answer.questionScore?.totalPoints || 0;
        return acc;
      },
      {}
    );

    // Convert to array format
    const byDifficulty: any = {};
    Object.entries(performanceByDifficulty).forEach(([difficulty, data]: [string, any]) => {
      byDifficulty[difficulty] = {
        accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
        points: data.points,
        correct: data.correct,
        total: data.total,
      };
    });

    // Update or create user leaderboard entry
    const userLeaderboard = await prisma.userLeaderboard.upsert({
      where: { userId },
      update: {
        totalPoints: {
          increment: totalPoints,
        },
        averageScore: undefined, // Will be recalculated
        testsCompleted: {
          increment: 1,
        },
        lastTestAt: new Date(),
      },
      create: {
        userId,
        totalPoints,
        averageScore: finalScore,
        testsCompleted: 1,
        lastTestAt: new Date(),
      },
    });

    // Recalculate average score
    const allTests = await prisma.test.findMany({
      where: { userId, completedAt: { not: null } },
      select: { answers: { include: { question: true } } },
    });

    const allScores = allTests.map((t) => {
      const correct = t.answers.filter((a) => a.isCorrect === true).length;
      return (correct / t.answers.length) * 100;
    });

    const averageScore = allScores.length > 0
      ? allScores.reduce((a, b) => a + b) / allScores.length
      : finalScore;

    // Update average score
    await prisma.userLeaderboard.update({
      where: { userId },
      data: {
        averageScore,
      },
    });

    // Track interaction
    await prisma.userInteraction.create({
      data: {
        userId,
        actionType: 'test_completed',
        entityType: 'test',
        entityId: testId,
        testId,
        durationMs: totalTimeSpent * 1000,
        metadata: JSON.stringify({
          finalScore,
          correctAnswers,
          totalQuestions,
          accuracy,
          totalPoints,
        }),
        clientIP: request.headers.get('x-forwarded-for') || '',
        userAgent: request.headers.get('user-agent') || '',
      },
    });

    return NextResponse.json(
      {
        success: true,
        testResult: {
          testId: test.id,
          finalScore: parseFloat(finalScore.toFixed(1)),
          totalPoints,
          correctAnswers,
          incorrectAnswers,
          skipped,
          accuracy: parseFloat(accuracy.toFixed(1)),
          timeSpent: totalTimeSpent,
          completedAt: updatedTest.completedAt,
          performance: {
            byDifficulty,
          },
          userStats: {
            rank: userLeaderboard.rank,
            totalPoints: userLeaderboard.totalPoints,
            averageScore: parseFloat(averageScore.toFixed(1)),
            testsCompleted: userLeaderboard.testsCompleted,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error completing test:', error);
    return NextResponse.json(
      { error: 'Failed to complete test' },
      { status: 500 }
    );
  }
}
