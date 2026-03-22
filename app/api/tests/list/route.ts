import { NextRequest, NextResponse } from 'next/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const result = await fetchQuery(api.tests.listTests, {
      userId: userId as Id<"users">,
      status,
      limit,
      offset,
    });

    const formattedTests = result.tests.map((test: any) => ({
      id: test._id,
      title: test.title,
      status: test.status === 'COMPLETED' ? 'completed' : 'in_progress',
      score: test.score || 0,
      totalPoints: 0,
      accuracy: test.totalQuestions > 0 ? (test.totalCorrect / test.totalQuestions) * 100 : 0,
      totalQuestions: test.totalQuestions,
      correctAnswers: test.totalCorrect,
      mode: test.mode,
      createdAt: test.createdAt,
      startedAt: test.startedAt,
      completedAt: test.completedAt,
    }));

    return NextResponse.json(
      {
        tests: formattedTests,
        pagination: {
          total: result.total,
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
