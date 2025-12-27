import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/insights
 *
 * Retrieves AI-generated insights for the user
 * Query parameters:
 * - type: performance|pattern|weakness|motivation|adaptive|ranking (optional)
 * - unread: true|false (default: false)
 * - limit: number (default: 5)
 */

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const unread = searchParams.get('unread') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 50);

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Build filter
    let filter: any = {
      userId,
      expiresAt: { gt: new Date() }, // Only non-expired insights
    };

    if (type && ['performance', 'pattern', 'weakness', 'motivation', 'adaptive', 'ranking'].includes(type)) {
      filter.type = type;
    }

    if (unread) {
      filter.isRead = false;
    }

    // Get insights
    const insights = await prisma.aIInsight.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Get unread count
    const unreadCount = await prisma.aIInsight.count({
      where: {
        userId,
        isRead: false,
        expiresAt: { gt: new Date() },
      },
    });

    const formattedInsights = insights.map((insight) => ({
      id: insight.id,
      type: insight.type,
      title: insight.title,
      content: insight.content,
      metadata: insight.metadata || {},
      isRead: insight.isRead,
      readAt: insight.readAt,
      createdAt: insight.createdAt,
      expiresAt: insight.expiresAt,
    }));

    return NextResponse.json(
      {
        insights: formattedInsights,
        unreadCount,
        pagination: {
          limit,
          returned: insights.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
