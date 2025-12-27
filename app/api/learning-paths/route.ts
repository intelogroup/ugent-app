import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/learning-paths
 * POST /api/learning-paths
 *
 * Manage learning paths
 */

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // in_progress, completed, all
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Get all subjects as predefined learning paths
    const subjects = await prisma.subject.findMany({
      include: {
        _count: {
          select: { questions: true },
        },
      },
      skip: offset,
      take: limit,
    });

    // Get user's progress on each subject
    const userProgress = await prisma.progress.findMany({
      where: { userId },
    });

    const progressMap = new Map(userProgress.map((p) => [p.id, p]));

    const learningPaths = subjects.map((subject) => {
      const progress = progressMap.get(subject.id);
      const questionCount = subject._count.questions;

      return {
        id: subject.id,
        name: subject.name,
        description: `Master ${subject.name} medical topics`,
        totalQuestions: questionCount,
        difficulty: 'MIXED',
        progress: {
          completed: progress?.masteryLevel || 0,
          total: 100,
          percentage: progress?.masteryLevel || 0,
        },
        estimatedHours: Math.ceil(questionCount / 20), // ~20 min per question
        startedAt: progress?.firstAttemptAt,
        status: (progress?.masteryLevel || 0) >= 80 ? 'completed' : 'in_progress',
      };
    });

    return NextResponse.json(
      {
        paths: learningPaths,
        pagination: {
          total: await prisma.subject.count(),
          limit,
          offset,
          returned: learningPaths.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching learning paths:', error);
    return NextResponse.json(
      { error: 'Failed to fetch learning paths' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const { name, description, topics = [], estimatedHours } = body;

    if (!userId || !name) {
      return NextResponse.json(
        { error: 'User ID and path name are required' },
        { status: 400 }
      );
    }

    // Create custom learning path via study note
    const learningPath = await prisma.studyNote.create({
      data: {
        userId,
        title: name,
        content: description || `Custom learning path: ${name}`,
        tags: ['learning-path', ...topics],
        isPinned: true,
      },
    });

    // Track interaction
    await prisma.userInteraction.create({
      data: {
        userId,
        actionType: 'learning_path_created',
        entityType: 'learning-path',
        entityId: learningPath.id,
        metadata: JSON.stringify({
          name,
          topics,
          estimatedHours,
        }),
        clientIP: request.headers.get('x-forwarded-for') || '',
        userAgent: request.headers.get('user-agent') || '',
      },
    });

    return NextResponse.json(
      {
        success: true,
        path: {
          id: learningPath.id,
          name,
          description,
          topics,
          estimatedHours,
          progress: { percentage: 0 },
          status: 'in_progress',
          createdAt: learningPath.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating learning path:', error);
    return NextResponse.json(
      { error: 'Failed to create learning path' },
      { status: 500 }
    );
  }
}
