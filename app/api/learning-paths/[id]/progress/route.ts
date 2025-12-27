import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/learning-paths/:id/progress
 * POST /api/learning-paths/:id/progress
 *
 * Track learning path progress
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pathId } = await params;
    const userId = request.headers.get('x-user-id');

    if (!userId || !pathId) {
      return NextResponse.json(
        { error: 'User ID and Path ID required' },
        { status: 400 }
      );
    }

    // Get learning path progress
    const progress = await prisma.progress.findUnique({
      where: { id: pathId },
    });

    if (!progress) {
      return NextResponse.json(
        {
          pathId,
          percentage: 0,
          topicsCompleted: 0,
          questionsAnswered: 0,
          startedAt: null,
          completedAt: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        pathId,
        percentage: progress.masteryLevel,
        topicsCompleted: 0, // Would need topic tracking
        questionsAnswered: progress.questionsAttempted,
        startedAt: progress.createdAt,
        completedAt: progress.masteryLevel >= 80 ? new Date() : null,
        status: progress.masteryLevel >= 80 ? 'completed' : 'in_progress',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching learning path progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pathId } = await params;
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const { percentage, topicId } = body;

    if (!userId || !pathId) {
      return NextResponse.json(
        { error: 'User ID and Path ID required' },
        { status: 400 }
      );
    }

    // Update or create progress record
    const progress = await prisma.progress.upsert({
      where: { id: pathId },
      update: {
        masteryLevel: percentage || undefined,
      },
      create: {
        id: pathId,
        userId,
        masteryLevel: percentage || 0,
        questionsAttempted: 0,
        correctAnswers: 0,
      },
    });

    // Track interaction
    await prisma.userInteraction.create({
      data: {
        userId,
        actionType: 'learning_path_progress',
        entityType: 'learning-path',
        entityId: pathId,
        metadata: JSON.stringify({
          percentage,
          topicId,
        }),
        clientIP: request.headers.get('x-forwarded-for') || '',
        userAgent: request.headers.get('user-agent') || '',
      },
    });

    return NextResponse.json(
      {
        success: true,
        progress: {
          pathId,
          percentage: progress.masteryLevel,
          status: progress.masteryLevel >= 80 ? 'completed' : 'in_progress',
          updatedAt: new Date(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating learning path progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}
