import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: testId } = await params;
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const { reason, lastAnsweredQuestion, totalQuestions } = body;

    if (!userId || !testId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify test exists and belongs to user
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        answers: {
          select: {
            id: true,
            status: true,
            isCorrect: true,
          },
        },
      },
    });

    if (!test || test.userId !== userId) {
      return NextResponse.json(
        { error: 'test_not_found' },
        { status: 404 }
      );
    }

    // Mark remaining questions as UNANSWERED
    const lastAnswered = lastAnsweredQuestion || test.answeredCount;
    const totalQ = totalQuestions || test.totalQuestions;
    const unansweredCount = Math.max(0, totalQ - lastAnswered - test.skippedCount);

    // Update test status to COMPLETED
    const completedTest = await prisma.test.update({
      where: { id: testId },
      data: {
        status: 'COMPLETED',
        completionStatus: unansweredCount > 0 ? 'PARTIALLY_COMPLETED' : 'FULLY_COMPLETED',
        completedAt: new Date(),
        unansweredCount,
        abandonReason: reason as any || 'AUTO_TIMEOUT',
      },
    });

    // Calculate score based on answered questions
    const correctAnswers = test.answers.filter(a => a.isCorrect).length;
    const answeredQuestions = test.answeredCount;
    const skippedQuestions = test.skippedCount;

    let accuracy = 0;
    if (answeredQuestions > 0) {
      accuracy = (correctAnswers / answeredQuestions) * 100;
    }

    // Apply incomplete penalty if configured
    let finalScore = accuracy;
    const applyPenalty = test.applyIncompletePenalty;
    const penalty = applyPenalty ? (1 - test.incompletePenalty) * 100 : 0;

    if (applyPenalty && unansweredCount > 0) {
      finalScore = accuracy * test.incompletePenalty;
    }

    // Update score
    await prisma.test.update({
      where: { id: testId },
      data: {
        score: finalScore,
        totalCorrect: correctAnswers,
        totalSkipped: skippedQuestions,
        totalIncorrect: answeredQuestions - correctAnswers,
      },
    });

    // Update leaderboard
    const leaderboard = await prisma.userLeaderboard.findUnique({
      where: { userId },
    });

    if (leaderboard) {
      const newTotal = leaderboard.totalTests + 1;
      const newAverage = (leaderboard.averageScore * leaderboard.totalTests + finalScore) / newTotal;

      await prisma.userLeaderboard.update({
        where: { userId },
        data: {
          totalTests: newTotal,
          averageScore: newAverage,
          totalCorrectAnswers: leaderboard.totalCorrectAnswers + correctAnswers,
          totalQuestionsAnswered: leaderboard.totalQuestionsAnswered + answeredQuestions,
          overallSuccessRate: (leaderboard.totalCorrectAnswers + correctAnswers) / (leaderboard.totalQuestionsAnswered + answeredQuestions) * 100,
          lastActivityDate: new Date(),
        },
      });
    }

    // Create status event
    const lastSession = await prisma.testSession.findFirst({
      where: { testId, userId },
      orderBy: { createdAt: 'desc' },
    });

    if (lastSession) {
      await prisma.statusEvent.create({
        data: {
          sessionId: lastSession.id,
          eventType: 'COMPLETED',
          reason: reason || 'AUTO_COMPLETE',
          questionsAnswered: answeredQuestions,
          questionsSkipped: skippedQuestions,
          questionsUnanswered: unansweredCount,
        },
      });
    }

    const totalPoints = answeredQuestions * 20; // Base estimate

    return NextResponse.json(
      {
        success: true,
        testResult: {
          testId: completedTest.id,
          status: 'COMPLETED',
          completionStatus: completedTest.completionStatus,
          finalScore: finalScore,
          totalPoints,
          answered: answeredQuestions,
          skipped: skippedQuestions,
          unanswered: unansweredCount,
          accuracy: accuracy,
          unansweredHandling: {
            handling: test.scoreIncompleteAs,
            applied: true,
            description: `${unansweredCount} unanswered questions were not counted in score`,
            note: `Quiz incomplete - scored on ${answeredQuestions}/${totalQ} questions`,
          },
          penalty: {
            applied: applyPenalty && unansweredCount > 0,
            percentage: penalty,
            description: penalty > 0 ? `${penalty}% penalty applied` : 'No penalty applied',
          },
          completedAt: completedTest.completedAt?.toISOString(),
          incompletionReason: reason || 'AUTO_TIMEOUT',
          stats: {
            questionsAnswered: answeredQuestions,
            questionsSkipped: skippedQuestions,
            questionsUnanswered: unansweredCount,
            answeredPercentage: (answeredQuestions / totalQ) * 100,
            completionPercentage: ((answeredQuestions + skippedQuestions) / totalQ) * 100,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Auto-complete error:', error);
    return NextResponse.json(
      { error: 'auto_complete_failed' },
      { status: 500 }
    );
  }
}
