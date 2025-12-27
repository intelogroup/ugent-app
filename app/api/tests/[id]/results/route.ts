import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/tests/:id/results
 *
 * Retrieves completed test results with detailed breakdowns
 * Only available after test is completed
 */

export async function GET(
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

    // Get test details
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        questions: {
          include: {
            question: true,
          },
        },
        answers: {
          include: {
            question: true,
            selectedOption: true,
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

    if (!test.completedAt) {
      return NextResponse.json(
        { error: 'Test is not completed' },
        { status: 400 }
      );
    }

    // Calculate summary statistics
    const totalQuestions = test.questions.length;
    const correctAnswers = test.answers.filter((a) => a.isCorrect === true).length;
    const incorrectAnswers = test.answers.filter((a) => a.isCorrect === false).length;
    const skipped = test.answers.filter((a) => a.status === 'SKIPPED').length;

    const totalPoints = test.answers.reduce((sum, answer) => {
      return sum + (answer.questionScore?.totalPoints || 0);
    }, 0);

    const accuracy = (correctAnswers / totalQuestions) * 100;
    const finalScore = (correctAnswers / totalQuestions) * 100;
    const totalTimeSpent = test.answers.reduce((sum, answer) => {
      return sum + (answer.timeSpent || 0);
    }, 0);

    // Performance by difficulty
    const byDifficulty: any = {};
    test.answers.forEach((answer) => {
      const difficulty = answer.question.difficulty;
      if (!byDifficulty[difficulty]) {
        byDifficulty[difficulty] = {
          correct: 0,
          total: 0,
          points: 0,
        };
      }
      byDifficulty[difficulty].total += 1;
      if (answer.isCorrect) byDifficulty[difficulty].correct += 1;
      byDifficulty[difficulty].points += answer.questionScore?.totalPoints || 0;
    });

    // Convert to proper format
    const difficultyStats: any = {};
    Object.entries(byDifficulty).forEach(([difficulty, data]: [string, any]) => {
      difficultyStats[difficulty] = {
        accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
        points: data.points,
        correct: data.correct,
        total: data.total,
      };
    });

    // Detailed question results
    const questions = test.answers.map((answer) => {
      return {
        questionId: answer.questionId,
        questionText: answer.question.text,
        difficulty: answer.question.difficulty,
        status: answer.status,
        correct: answer.isCorrect,
        pointsEarned: answer.questionScore?.totalPoints || 0,
        timeSpent: answer.timeSpent,
        userAnswer: answer.selectedOption?.text || 'Skipped',
        multipliers: answer.questionScore ? {
          basePoints: answer.questionScore.basePoints,
          timeBonus: parseFloat(answer.questionScore.timeBonus.toFixed(2)),
          streakMultiplier: parseFloat(answer.questionScore.streakMultiplier.toFixed(2)),
        } : null,
      };
    });

    return NextResponse.json(
      {
        test: {
          id: test.id,
          title: test.title,
          mode: test.mode,
          completedAt: test.completedAt,
        },
        summary: {
          finalScore: parseFloat(finalScore.toFixed(1)),
          totalPoints,
          correctAnswers,
          incorrectAnswers,
          skipped,
          accuracy: parseFloat(accuracy.toFixed(1)),
          timeSpent: totalTimeSpent,
          averageTimePerQuestion: Math.round(totalTimeSpent / totalQuestions),
        },
        byDifficulty: difficultyStats,
        questions: questions.slice(0, 100), // Return first 100 for pagination
        pagination: {
          total: questions.length,
          returned: questions.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching test results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test results' },
      { status: 500 }
    );
  }
}

// Helper function to get correct option
async function getCorrectOption(questionId: string) {
  const option = await prisma.answerOption.findFirst({
    where: {
      questionId,
      isCorrect: true,
    },
  });
  return option;
}
