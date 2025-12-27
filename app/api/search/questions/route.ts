import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/search/questions
 *
 * Full-text search for questions
 * Query parameters:
 * - q: search term (required)
 * - difficulty: EASY|MEDIUM|HARD|MIXED
 * - system: system ID
 * - topic: topic ID
 * - limit: number (default: 20)
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q');
    const difficulty = searchParams.get('difficulty');
    const systemId = searchParams.get('system');
    const topicId = searchParams.get('topic');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    if (!q) {
      return NextResponse.json(
        { error: 'Search query required' },
        { status: 400 }
      );
    }

    // Build filter
    let filter: any = {
      OR: [
        { text: { contains: q, mode: 'insensitive' } },
        { explanation: { contains: q, mode: 'insensitive' } },
      ],
    };

    if (difficulty && difficulty !== 'MIXED') {
      filter.difficulty = difficulty;
    }

    if (systemId) {
      filter.systemId = systemId;
    }

    if (topicId) {
      filter.topicId = topicId;
    }

    // Get user for accuracy tracking
    const userId = request.headers.get('x-user-id');

    // Search questions
    const questions = await prisma.question.findMany({
      where: filter,
      include: {
        system: true,
        topic: true,
      },
      take: limit,
    });

    // Get user accuracy for each question if authenticated
    let results = questions.map((q) => ({
      id: q.id,
      text: q.text,
      difficulty: q.difficulty,
      system: q.system?.name || 'Unknown',
      topic: q.topic?.name || 'Unknown',
      attempts: q.totalAttempts || 0,
      yourAccuracy: 0,
    }));

    if (userId) {
      // Get user's accuracy for these questions
      const userAnswers = await prisma.answer.findMany({
        where: {
          userId,
          questionId: { in: questions.map((q) => q.id) },
        },
      });

      const accuracyMap = new Map<string, number>();
      questions.forEach((q) => {
        const answers = userAnswers.filter((a) => a.questionId === q.id);
        if (answers.length > 0) {
          const correct = answers.filter((a) => a.isCorrect).length;
          accuracyMap.set(q.id, (correct / answers.length) * 100);
        }
      });

      results = results.map((r) => ({
        ...r,
        yourAccuracy: Math.round(accuracyMap.get(r.id) || 0),
      }));
    }

    return NextResponse.json(
      {
        results,
        total: results.length,
        query: q,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error searching questions:', error);
    return NextResponse.json(
      { error: 'Failed to search questions' },
      { status: 500 }
    );
  }
}
