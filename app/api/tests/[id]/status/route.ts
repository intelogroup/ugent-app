import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: testId } = await params;
    const userId = request.headers.get('x-user-id');

    if (!userId || !testId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify test exists and belongs to user
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!test || test.userId !== userId) {
      return NextResponse.json(
        { error: 'test_not_found' },
        { status: 404 }
      );
    }

    const lastSession = test.sessions[0];
    let recommendedAction = 'NONE';
    let activeSession = null;
    let completedSession = null;

    if (test.status === 'PAUSED' && lastSession?.canResume && lastSession.resumeDeadline && new Date() < lastSession.resumeDeadline) {
      recommendedAction = 'RESUME';
      activeSession = {
        canResume: true,
        lastActivityAt: test.lastActivityAt,
        pausedAt: test.pausedAt,
        resumeAttempt: lastSession.resumeAttempts || 0,
        maxResumeAttempts: lastSession.maxResumeAttempts || 3,
        resumeDeadline: lastSession.resumeDeadline.toISOString(),
        lastQuestion: 0,
        questionsAnswered: test.answeredCount,
        questionsSkipped: test.skippedCount,
      };
    } else if (test.status === 'COMPLETED') {
      recommendedAction = 'REVIEW';
      completedSession = {
        finalScore: test.score || 0,
        totalPoints: (test.totalCorrect * 20) || 0, // Rough estimate
        completionStatus: test.completionStatus,
        completedAt: test.completedAt?.toISOString(),
      };
    } else if (test.status === 'PAUSED' && (!lastSession?.resumeDeadline || new Date() > lastSession.resumeDeadline)) {
      recommendedAction = 'RESTART';
    }

    return NextResponse.json(
      {
        id: test.id,
        userId: test.userId,
        status: test.status,
        activeSession,
        completedSession,
        recommendedAction,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'status_check_failed' },
      { status: 500 }
    );
  }
}
