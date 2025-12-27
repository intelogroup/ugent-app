import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/tests/list
 *
 * Lists all tests for the user (completed and in-progress)
 * Query parameters:
 * - status: completed|in_progress|all (default: all)
 * - limit: number (default: 10)
 * - offset: number (default: 0)
 * - sortBy: createdAt|score|accuracy (default: createdAt)
 */

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'createdAt';

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Build filter
    let filter: any = { userId };

    if (status === 'completed') {
      filter.completedAt = { not: null };
    } else if (status === 'in_progress') {
      filter.completedAt = null;
    }

    // Determine sort order
    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'score') {
      // This is more complex as we need to calculate scores
      orderBy = { completedAt: 'desc' };
    } else if (sortBy === 'accuracy') {
      orderBy = { completedAt: 'desc' };
    }

    // Get tests
    const tests = await prisma.test.findMany({
      where: filter,
      include: {
        questions: true,
        answers: {
          include: {
            questionScore: true,
          },
        },
      },
      orderBy,
      skip: offset,
      take: limit,
    });

    // Get total count
    const total = await prisma.test.count({ where: filter });

    // Format response
    const formattedTests = tests.map((test) => {
      const correctAnswers = test.answers.filter((a) => a.isCorrect === true).length;
      const totalQuestions = test.questions.length;
      const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
      const totalPoints = test.answers.reduce((sum, a) => sum + (a.questionScore?.totalPoints || 0), 0);
      const finalScore = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

      return {
        id: test.id,
        title: test.title,
        status: test.completedAt ? 'completed' : 'in_progress',
        score: parseFloat(finalScore.toFixed(1)),
        totalPoints,
        accuracy: parseFloat(accuracy.toFixed(1)),
        totalQuestions,
        correctAnswers,
        mode: test.mode,
        createdAt: test.createdAt,
        startedAt: test.startedAt,
        completedAt: test.completedAt,
      };
    });

    return NextResponse.json(
      {
        tests: formattedTests,
        pagination: {
          total,
          limit,
          offset,
          returned: formattedTests.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user tests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tests' },
      { status: 500 }
    );
  }
}
