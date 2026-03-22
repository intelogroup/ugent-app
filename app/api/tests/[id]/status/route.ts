import { NextRequest, NextResponse } from 'next/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

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

    const test = await fetchQuery(api.tests.getTestById, {
      testId: testId as Id<"tests">,
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

    if (test.status === 'PAUSED' && lastSession?.canResume) {
      recommendedAction = 'RESUME';
      activeSession = {
        canResume: true,
        lastActivityAt: test.lastActivityAt,
        pausedAt: test.pausedAt,
        resumeAttempt: lastSession.resumeAttempts || 0,
        maxResumeAttempts: lastSession.maxResumeAttempts || 5,
        resumeDeadline: lastSession.resumeDeadline ? new Date(lastSession.resumeDeadline).toISOString() : null,
        lastQuestion: 0,
        questionsAnswered: test.answeredCount,
        questionsSkipped: test.totalSkipped,
      };
    } else if (test.status === 'COMPLETED') {
      recommendedAction = 'REVIEW';
      completedSession = {
        finalScore: test.score || 0,
        totalPoints: (test.totalCorrect * 20) || 0,
        completedAt: test.completedAt ? new Date(test.completedAt).toISOString() : null,
      };
    }

    return NextResponse.json(
      {
        id: test._id,
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
