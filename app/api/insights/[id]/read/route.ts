import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/insights/:id/read
 *
 * Marks an insight as read
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: insightId } = await params;
    const userId = request.headers.get('x-user-id');

    if (!insightId || !userId) {
      return NextResponse.json(
        { error: 'Insight ID and User ID required' },
        { status: 400 }
      );
    }

    // Get insight
    const insight = await prisma.aIInsight.findUnique({
      where: { id: insightId },
    });

    if (!insight) {
      return NextResponse.json(
        { error: 'Insight not found' },
        { status: 404 }
      );
    }

    // Verify user owns the insight
    if (insight.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Mark as read
    const updatedInsight = await prisma.aIInsight.update({
      where: { id: insightId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        insight: {
          id: updatedInsight.id,
          isRead: updatedInsight.isRead,
          readAt: updatedInsight.readAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error marking insight as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark insight as read' },
      { status: 500 }
    );
  }
}
