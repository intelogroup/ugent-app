import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: testId } = await params;
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const { sessionToken, currentQuestion, timeElapsed, answered, skipped } = body;

    if (!userId || !testId || !sessionToken) {
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

    // Verify session token
    if (test.sessionToken !== sessionToken) {
      return NextResponse.json(
        {
          error: 'invalid_session',
          reason: 'invalid_token',
        },
        { status: 400 }
      );
    }

    // Check if session is still valid (30 minute inactivity timeout)
    const inactivityMinutes = (Date.now() - test.lastActivityAt.getTime()) / 1000 / 60;
    if (inactivityMinutes > 30) {
      // Auto-pause due to inactivity
      await prisma.test.update({
        where: { id: testId },
        data: {
          status: 'PAUSED',
          pausedAt: new Date(),
          abandonReason: 'AUTO_TIMEOUT',
        },
      });

      return NextResponse.json(
        {
          sessionActive: false,
          error: 'session_expired',
          reason: 'inactivity_timeout',
        },
        { status: 410 }
      );
    }

    // Update lastActivityAt to keep session alive
    await prisma.test.update({
      where: { id: testId },
      data: {
        lastActivityAt: new Date(),
        answeredCount: answered || 0,
        skippedCount: skipped || 0,
      },
    });

    // Calculate time remaining
    const timeRemaining = test.timeLimit
      ? test.timeLimit * 60 - (timeElapsed || 0)
      : null;

    return NextResponse.json(
      {
        success: true,
        sessionActive: true,
        timeRemaining,
        shouldPause: false,
        maxInactivity: 30,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json(
      { error: 'heartbeat_failed' },
      { status: 500 }
    );
  }
}
