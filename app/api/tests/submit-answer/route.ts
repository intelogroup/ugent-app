import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/tests/submit-answer
 *
 * Submits an answer to a question during a test
 * Calculates points with multipliers and updates metrics
 *
 * Request body:
 * {
 *   userId: string,
 *   testId: string,
 *   questionId: string,
 *   selectedOptionId: string (optional for skip),
 *   timeSpent: number (seconds)
 * }
 */

// Base points by difficulty
const BASE_POINTS = {
  EASY: 10,
  MEDIUM: 20,
  HARD: 30,
};

function calculateTimeBonus(timeSpent: number, timeLimit: number): number {
  if (!timeSpent || !timeLimit) return 1.0;

  const percentageOfTime = timeSpent / (timeLimit * 60); // Convert limit to seconds

  if (percentageOfTime <= 0.3) return 1.5; // 50% bonus for speed
  if (percentageOfTime <= 0.7) return 1.25; // 25% bonus for moderate speed
  return 1.0; // No bonus for slow answers
}

async function calculateStreakMultiplier(userId: string): Promise<number> {
  // Get consecutive correct answers for today
  const todayAnswers = await prisma.answer.findMany({
    where: {
      userId,
      isCorrect: true,
      answeredAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
    orderBy: { answeredAt: 'asc' },
  });

  const streak = todayAnswers.length;

  if (streak >= 16) return 2.0; // Cap at 2.0x
  if (streak >= 8) return 1.5;
  if (streak >= 4) return 1.2;
  return 1.0;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, testId, questionId, selectedOptionId, timeSpent } = body;

    // Validate required fields
    if (!userId || !testId || !questionId) {
      return NextResponse.json(
        { error: 'userId, testId, and questionId are required' },
        { status: 400 }
      );
    }

    // Verify user and test exist
    const [user, test, question] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.test.findUnique({ where: { id: testId } }),
      prisma.question.findUnique({ where: { id: questionId } }),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Verify user owns the test
    if (test.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Determine if answer is correct
    let isCorrect = false;
    let status = 'NOT_ANSWERED';

    if (selectedOptionId) {
      const option = await prisma.answerOption.findUnique({
        where: { id: selectedOptionId },
      });

      if (option && option.questionId === questionId) {
        isCorrect = option.isCorrect;
        status = isCorrect ? 'CORRECT' : 'INCORRECT';
      }
    } else {
      status = 'SKIPPED';
    }

    // Create or update answer
    let answer = await prisma.answer.findUnique({
      where: { testId_questionId: { testId, questionId } },
    });

    if (answer) {
      answer = await prisma.answer.update({
        where: { id: answer.id },
        data: {
          selectedOptionId: selectedOptionId || null,
          status: status as any,
          isCorrect: selectedOptionId ? isCorrect : null,
          timeSpent,
          answeredAt: new Date(),
        },
      });
    } else {
      answer = await prisma.answer.create({
        data: {
          userId,
          testId,
          questionId,
          selectedOptionId: selectedOptionId || null,
          status: status as any,
          isCorrect: selectedOptionId ? isCorrect : null,
          timeSpent,
          answeredAt: selectedOptionId ? new Date() : null,
        },
      });
    }

    // Calculate points (only for correct answers)
    let questionScore = null;
    if (isCorrect) {
      const basePoints = BASE_POINTS[question.difficulty as keyof typeof BASE_POINTS] || 10;
      const timeBonus = calculateTimeBonus(timeSpent || 0, test.timeLimit || 120);
      const streakMultiplier = await calculateStreakMultiplier(userId);
      const totalPoints = Math.round(basePoints * timeBonus * streakMultiplier);

      // Create or update question score
      questionScore = await prisma.questionScore.upsert({
        where: { answerId: answer.id },
        update: {
          totalPoints,
        },
        create: {
          answerId: answer.id,
          basePoints,
          difficulty: question.difficulty,
          timeBonus,
          streakMultiplier,
          totalPoints,
        },
      });
    }

    // Track interaction
    await prisma.userInteraction.create({
      data: {
        userId,
        actionType: 'answer_submitted',
        entityType: 'answer',
        entityId: answer.id,
        testId,
        questionId,
        answerId: answer.id,
        durationMs: timeSpent ? timeSpent * 1000 : undefined,
        metadata: JSON.stringify({
          isCorrect,
          selectedOptionId,
          status,
          points: questionScore?.totalPoints || 0,
        }),
        clientIP: request.headers.get('x-forwarded-for') || '',
        userAgent: request.headers.get('user-agent') || '',
      },
    });

    // Update question metrics
    await prisma.question.update({
      where: { id: questionId },
      data: {
        totalAttempts: { increment: 1 },
        correctAttempts: isCorrect ? { increment: 1 } : undefined,
      },
    });

    return NextResponse.json(
      {
        success: true,
        answer: {
          id: answer.id,
          status,
          isCorrect,
          timeSpent,
        },
        points: questionScore?.totalPoints || 0,
        feedback: {
          correct: isCorrect,
          message: isCorrect ? 'Correct!' : 'Incorrect. Review the explanation.',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 });
  }
}
