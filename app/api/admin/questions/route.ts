import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/questions
 *
 * Admin endpoint for question management
 */

export async function GET(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-user-id');
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // all, flagged, low-performance
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 1000);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID required' },
        { status: 400 }
      );
    }

    // Get questions with performance data
    let questions: any = [];

    if (status === 'flagged') {
      // Get flagged questions (would need flag tracking)
      questions = [];
    } else if (status === 'low-performance') {
      // Get questions with low success rates
      questions = await prisma.question.findMany({
        where: {
          AND: [
            { totalAttempts: { gt: 5 } },
          ],
        },
        include: {
          system: true,
          topic: true,
        },
        skip: offset,
        take: limit,
      });
    } else {
      // All questions
      questions = await prisma.question.findMany({
        include: {
          system: true,
          topic: true,
        },
        skip: offset,
        take: limit,
      });
    }

    const questionData = questions.map((q: any) => {
      const successRate = q.totalAttempts > 0 ? ((q.correctAttempts || 0) / q.totalAttempts) * 100 : 0;
      return {
        id: q.id,
        text: q.text.substring(0, 100) + '...',
        difficulty: q.difficulty,
        system: q.system?.name || 'Unknown',
        topic: q.topic?.name || 'Unknown',
        totalAttempts: q.totalAttempts || 0,
        correctAttempts: q.correctAttempts || 0,
        successRate: parseFloat(successRate.toFixed(1)),
        status: successRate < 40 ? 'low-performance' : 'normal',
        createdAt: q.createdAt,
      };
    });

    const totalQuestions = await prisma.question.count();

    return NextResponse.json(
      {
        questions: questionData,
        stats: {
          totalQuestions,
          flaggedCount: 0, // Would track flagged questions
          lowPerformanceCount: questionData.filter((q: any) => q.status === 'low-performance').length,
          averageSuccessRate: await getAverageSuccessRate(),
        },
        pagination: {
          total: totalQuestions,
          limit,
          offset,
          returned: questionData.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching admin questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

async function getAverageSuccessRate(): Promise<number> {
  const questions = await prisma.question.findMany({
    select: { totalAttempts: true, correctAttempts: true },
  });

  if (questions.length === 0) return 0;

  const totalAttempts = questions.reduce((sum, q) => sum + (q.totalAttempts || 0), 0);
  const totalCorrect = questions.reduce((sum, q) => sum + (q.correctAttempts || 0), 0);

  return totalAttempts > 0 ? parseFloat(((totalCorrect / totalAttempts) * 100).toFixed(1)) : 0;
}
