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
    const { reason, currentQuestion, questionsAnswered, questionsSkipped } = body;

    if (!userId || !testId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify test exists and belongs to user
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: { sessions: true },
    });

    if (!test || test.userId !== userId) {
      return NextResponse.json(
        { error: 'test_not_found' },
        { status: 404 }
      );
    }

    // Calculate resume deadline (15 minutes from now)
    const resumeDeadline = new Date();
    resumeDeadline.setMinutes(resumeDeadline.getMinutes() + 15);

    // Update test status to PAUSED
    const updatedTest = await prisma.test.update({
      where: { id: testId },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
        abandonReason: reason as any || 'USER_QUIT',
        answeredCount: questionsAnswered || test.answeredCount,
        skippedCount: questionsSkipped || test.skippedCount,
      },
    });

    // Create or update session
    const sessionNumber = test.sessions.length + 1;
    const resumeWindowMinutes = 15;

    await prisma.testSession.create({
      data: {
        userId,
        testId,
        sessionNumber,
        startedAt: test.startedAt || new Date(),
        pausedAt: new Date(),
        canResume: true,
        resumeDeadline,
        maxResumeAttempts: 3,
        deviceType: request.headers.get('user-agent')?.includes('mobile') ? 'mobile' : 'desktop',
        browser: request.headers.get('user-agent') || undefined,
      },
    });

    // Create status event
    await prisma.statusEvent.create({
      data: {
        sessionId: (await prisma.testSession.findFirst({
          where: { testId, userId },
          orderBy: { createdAt: 'desc' },
        }))!.id,
        eventType: 'PAUSED',
        reason: reason || 'USER_ACTION',
        questionIndex: currentQuestion || 0,
        questionsAnswered: questionsAnswered || 0,
        questionsSkipped: questionsSkipped || 0,
      },
    });

    return NextResponse.json(
      {
        success: true,
        test: {
          id: updatedTest.id,
          status: updatedTest.status,
          lastActivityAt: updatedTest.lastActivityAt,
          pausedAt: updatedTest.pausedAt,
          questionsAnswered: updatedTest.answeredCount,
          questionsSkipped: updatedTest.skippedCount,
          currentQuestion: currentQuestion || 0,
          resumeWindow: resumeWindowMinutes,
          resumeDeadline: resumeDeadline.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Pause error:', error);
    return NextResponse.json(
      { error: 'pause_failed' },
      { status: 500 }
    );
  }
}
