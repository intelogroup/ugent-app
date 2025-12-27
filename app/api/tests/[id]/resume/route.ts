import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: testId } = await params;
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get('sessionToken');
    const action = searchParams.get('action') || 'CHECK';

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
        answers: {
          select: {
            id: true,
            questionId: true,
            selectedOptionId: true,
            status: true,
          },
        },
      },
    });

    if (!test || test.userId !== userId) {
      return NextResponse.json(
        { error: 'test_not_found' },
        { status: 404 }
      );
    }

    // Check if quiz can be resumed
    if (test.status !== 'PAUSED') {
      return NextResponse.json(
        {
          canResume: false,
          reason: test.status === 'COMPLETED' ? 'test_completed' : 'not_paused',
          message: 'This quiz cannot be resumed.',
          recommendedAction: 'REVIEW',
        },
        { status: 400 }
      );
    }

    // Check resume deadline
    const lastSession = await prisma.testSession.findFirst({
      where: { testId, userId },
      orderBy: { createdAt: 'desc' },
    });

    if (lastSession?.resumeDeadline && new Date() > lastSession.resumeDeadline) {
      return NextResponse.json(
        {
          canResume: false,
          reason: 'resume_deadline_expired',
          message: 'The resume deadline has passed. You can start a new quiz instead.',
          recommendedAction: 'RESTART',
        },
        { status: 400 }
      );
    }

    // Check max resume attempts
    if (lastSession && lastSession.resumeAttempts >= lastSession.maxResumeAttempts) {
      return NextResponse.json(
        {
          canResume: false,
          reason: 'max_attempts_exceeded',
          message: 'Maximum resume attempts exceeded.',
          recommendedAction: 'RESTART',
        },
        { status: 400 }
      );
    }

    // If action is RESUME, proceed with resumption
    if (action === 'RESUME') {
      // Generate new session token
      const newSessionToken = randomBytes(32).toString('hex');

      // Update test with new session token
      const resumedTest = await prisma.test.update({
        where: { id: testId },
        data: {
          status: 'RESUMED',
          sessionToken: newSessionToken,
          resumedAt: new Date(),
          attemptNumber: (test.attemptNumber || 1) + 1,
          lastActivityAt: new Date(),
        },
      });

      // Update session
      if (lastSession) {
        await prisma.testSession.update({
          where: { id: lastSession.id },
          data: {
            resumedAt: new Date(),
            resumeAttempts: lastSession.resumeAttempts + 1,
          },
        });

        // Create status event
        await prisma.statusEvent.create({
          data: {
            sessionId: lastSession.id,
            eventType: 'RESUMED',
            attemptNumber: lastSession.resumeAttempts + 1,
          },
        });
      }

      return NextResponse.json(
        {
          canResume: true,
          test: {
            id: resumedTest.id,
            status: resumedTest.status,
            lastActivityAt: resumedTest.lastActivityAt,
            questionsAnswered: resumedTest.answeredCount,
            questionsSkipped: resumedTest.skippedCount,
            currentQuestion: 0,
            resumeAttempt: lastSession?.resumeAttempts || 1,
            maxResumeAttempts: lastSession?.maxResumeAttempts || 3,
            sessionToken: newSessionToken,
            resumeDeadline: lastSession?.resumeDeadline?.toISOString(),
            timeRemaining: test.timeLimit
              ? test.timeLimit * 60 - ((Date.now() - (test.startedAt?.getTime() || Date.now())) / 1000)
              : null,
          },
          questions: test.answers.map((answer, index) => ({
            index,
            id: answer.questionId,
            userAnswer: answer.selectedOptionId,
            status: answer.status,
          })),
        },
        { status: 200 }
      );
    }

    // Action is CHECK - just return status
    return NextResponse.json(
      {
        canResume: true,
        reason: 'quiz_paused',
        test: {
          id: test.id,
          status: test.status,
          lastActivityAt: test.lastActivityAt,
          questionsAnswered: test.answeredCount,
          questionsSkipped: test.skippedCount,
          currentQuestion: 0,
          resumeAttempt: lastSession?.resumeAttempts || 0,
          maxResumeAttempts: lastSession?.maxResumeAttempts || 3,
          resumeDeadline: lastSession?.resumeDeadline?.toISOString(),
          timeRemaining: test.timeLimit
            ? test.timeLimit * 60 - ((Date.now() - (test.startedAt?.getTime() || Date.now())) / 1000)
            : null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Resume error:', error);
    return NextResponse.json(
      { error: 'resume_failed' },
      { status: 500 }
    );
  }
}
