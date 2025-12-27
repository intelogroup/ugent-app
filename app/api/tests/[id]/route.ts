import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/tests/:id
 *
 * Retrieves test details and progress information
 * Returns test metadata, progress, and current answers
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: testId } = await params;
    const userId = request.headers.get('x-user-id'); // Assume user ID passed in headers

    console.log('[TEST GET] Fetching test details:', {
      testId,
      userId,
      timestamp: new Date().toISOString(),
    });

    if (!testId || !userId) {
      console.log('[TEST GET] Missing required parameters');
      return NextResponse.json(
        { error: 'Test ID and User ID required' },
        { status: 400 }
      );
    }

    // Get test details
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        questions: {
          include: {
            question: {
              include: { options: true },
            },
          },
        },
        answers: {
          include: {
            questionScore: true,
          },
        },
      },
    });

    if (!test) {
      console.log('[TEST GET] Test not found:', testId);
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    console.log('[TEST GET] Found test:', {
      id: test.id,
      userId: test.userId,
      totalQuestions: test.questions.length,
      totalAnswers: test.answers.length,
    });

    // Verify user owns the test
    if (test.userId !== userId) {
      console.log('[TEST GET] Unauthorized access attempt:', {
        testUserId: test.userId,
        requestUserId: userId,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Calculate progress
    const totalQuestions = test.questions.length;
    const answeredQuestions = test.answers.filter((a) => a.status !== 'NOT_ANSWERED').length;
    const correctAnswers = test.answers.filter((a) => a.isCorrect === true).length;
    const incorrectAnswers = test.answers.filter((a) => a.isCorrect === false).length;
    const skipped = test.answers.filter((a) => a.status === 'SKIPPED').length;

    // Calculate current score
    const currentScore = test.answers.reduce((sum, answer) => {
      return sum + (answer.questionScore?.totalPoints || 0);
    }, 0);

    console.log('[TEST GET] Calculated progress:', {
      totalQuestions,
      answeredQuestions,
      correctAnswers,
      incorrectAnswers,
      skipped,
      currentScore,
    });

    const responseData = {
      test: {
        id: test.id,
        title: test.title,
        mode: test.mode,
        questionMode: test.questionMode,
        totalQuestions,
        answered: answeredQuestions,
        correct: correctAnswers,
        incorrect: incorrectAnswers,
        skipped,
        remaining: totalQuestions - answeredQuestions,
        currentScore,
        timeLimit: test.timeLimit,
        startedAt: test.startedAt,
        completedAt: test.completedAt,
        questions: test.questions,
        // Current answers (without revealing correct answers)
        answers: test.answers.map((answer) => ({
          questionId: answer.questionId,
          status: answer.status,
          selectedOptionId: answer.selectedOptionId,
          timeSpent: answer.timeSpent,
          isCorrect: test.completedAt ? answer.isCorrect : undefined, // Only show after test complete
          points: answer.questionScore?.totalPoints || 0,
        })),
      },
    };

    console.log('[TEST GET] Returning response with questions count:', test.questions.length);

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error('Error fetching test details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test details' },
      { status: 500 }
    );
  }
}
