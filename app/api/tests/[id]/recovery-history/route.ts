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
    });

    if (!test || test.userId !== userId) {
      return NextResponse.json(
        { error: 'test_not_found' },
        { status: 404 }
      );
    }

    // Get all sessions for this test
    const sessions = await prisma.testSession.findMany({
      where: { testId, userId },
      include: {
        statusEvents: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Format sessions data
    const formattedSessions = sessions.map((session) => ({
      sessionNumber: session.sessionNumber,
      startedAt: session.startedAt.toISOString(),
      pausedAt: session.pausedAt?.toISOString() || null,
      resumedAt: session.resumedAt?.toISOString() || null,
      endedAt: session.endedAt?.toISOString() || null,
      disconnectCount: session.disconnectCount,
      lastQuestion: 0,
      questionsAnswered: session.questionsAnswered,
      reason: session.statusEvents.find(e => e.eventType === 'PAUSED')?.reason,
      completionStatus: session.endedAt ? 'COMPLETED' : 'INCOMPLETE',
      questionsUnanswered: 0,
    }));

    // Format events data
    const allEvents = sessions.flatMap((session) =>
      session.statusEvents.map((event) => ({
        timestamp: event.createdAt.toISOString(),
        type: event.eventType,
        question: event.questionIndex || 0,
        reason: event.reason,
        sessionNumber: session.sessionNumber,
        attemptNumber: event.attemptNumber,
      }))
    );

    return NextResponse.json(
      {
        testId: test.id,
        totalAttempts: sessions.length,
        sessions: formattedSessions,
        events: allEvents,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Recovery history error:', error);
    return NextResponse.json(
      { error: 'recovery_history_failed' },
      { status: 500 }
    );
  }
}
