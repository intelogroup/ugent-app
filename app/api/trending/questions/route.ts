import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/trending/questions
 *
 * Gets most attempted questions this week
 * Query parameters:
 * - period: week|month|all (default: week)
 * - limit: number (default: 20)
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'week';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    // Calculate date filter
    let dateFilter: any = {};
    if (period === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      dateFilter = { gte: sevenDaysAgo };
    } else if (period === 'month') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter = { gte: thirtyDaysAgo };
    }

    // Get trending questions based on attempts
    const questions = await prisma.question.findMany({
      where: Object.keys(dateFilter).length > 0
        ? {
            answers: {
              some: {
                answeredAt: dateFilter,
              },
            },
          }
        : {},
      include: {
        system: true,
        topic: true,
        _count: {
          select: { answers: true },
        },
      },
      orderBy: {
        totalAttempts: 'desc',
      },
      take: limit,
    });

    const results = questions.map((q) => ({
      id: q.id,
      text: q.text,
      difficulty: q.difficulty,
      system: q.system?.name || 'Unknown',
      topic: q.topic?.name || 'Unknown',
      attempts: q.totalAttempts || 0,
      successRate: q.totalAttempts > 0 ? ((q.correctAttempts || 0) / q.totalAttempts) * 100 : 0,
    }));

    return NextResponse.json(
      {
        results,
        period,
        total: results.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching trending questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending questions' },
      { status: 500 }
    );
  }
}
