import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/tests/create
 *
 * Creates a new test/quiz for the user
 * Supports: Manual selection, AI-adaptive, practice modes
 *
 * Request body:
 * {
 *   userId: string,
 *   subjects: string[], optional
 *   topics: string[], optional
 *   systems: string[], optional
 *   questionCount: number (1-100),
 *   testMode: 'TUTOR' | 'TIMED',
 *   questionMode: 'STANDARD' | 'CUSTOM' | 'PRACTICE',
 *   difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED',
 *   timeLimit: number, optional (minutes)
 *   useAI: boolean (default: false)
 * }
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[TEST CREATE] Received request to create test:', {
      timestamp: new Date().toISOString(),
    });

    const {
      userId,
      subjects = [],
      topics = [],
      systems = [],
      questionCount = 10,
      testMode = 'TUTOR',
      questionMode = 'STANDARD',
      difficulty = 'MIXED',
      timeLimit,
      useAI = false,
    } = body;

    console.log('[TEST CREATE] Request params:', {
      userId,
      subjects,
      topics,
      systems,
      questionCount,
      testMode,
      questionMode,
      difficulty,
      timeLimit,
      useAI,
    });

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    if (questionCount < 1 || questionCount > 100) {
      return NextResponse.json(
        { error: 'Question count must be between 1 and 100' },
        { status: 400 }
      );
    }

    if (subjects.length === 0 && topics.length === 0 && systems.length === 0) {
      return NextResponse.json(
        { error: 'At least one subject, topic, or system required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build question filter
    const questionFilter: any = {};

    if (difficulty !== 'MIXED') {
      questionFilter.difficulty = difficulty;
    }

    if (subjects.length > 0) {
      questionFilter.subjectId = { in: subjects };
    }

    if (topics.length > 0) {
      questionFilter.topicId = { in: topics };
    }

    if (systems.length > 0) {
      questionFilter.systemId = { in: systems };
    }

    // Fetch available questions
    const availableQuestions = await prisma.question.findMany({
      where: questionFilter,
      take: questionCount * 2, // Get more to randomize from
      include: { options: true },
    });

    if (availableQuestions.length < questionCount) {
      return NextResponse.json(
        {
          error: `Only ${availableQuestions.length} questions available matching criteria (need ${questionCount})`,
        },
        { status: 400 }
      );
    }

    // Randomize and select questions
    const selectedQuestions = availableQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, questionCount);

    // Create test record
    console.log('[TEST CREATE] Creating test record for user:', userId);
    const test = await prisma.test.create({
      data: {
        userId,
        title: `${testMode === 'TUTOR' ? 'Tutor' : 'Timed'} Test - ${new Date().toLocaleDateString()}`,
        mode: testMode as 'TUTOR' | 'TIMED',
        questionMode: questionMode as 'STANDARD' | 'CUSTOM' | 'PRACTICE',
        useAI,
        totalQuestions: selectedQuestions.length,
        timeLimit,
        selectedSubjects: subjects,
        selectedTopics: topics,
      },
    });
    console.log('[TEST CREATE] Successfully created test:', {
      id: test.id,
      title: test.title,
      totalQuestions: test.totalQuestions,
      mode: test.mode,
    });

    // Associate questions with test
    await Promise.all(
      selectedQuestions.map((question, index) =>
        prisma.testQuestion.create({
          data: {
            testId: test.id,
            questionId: question.id,
            displayOrder: index + 1,
          },
        })
      )
    );

    // Create test session for tracking
    console.log('[SESSION] Creating session for test:', test.id);
    console.log('[SESSION] User ID:', userId);

    const sessionCount = await prisma.testSession.count({
      where: { testId: test.id },
    });
    console.log('[SESSION] Existing session count for this test:', sessionCount);

    const sessionData = {
      userId,
      testId: test.id,
      sessionNumber: sessionCount + 1,
      startedAt: new Date(),
      deviceType: request.headers.get('user-agent')?.includes('Mobile')
        ? 'mobile'
        : 'desktop',
      browser: request.headers.get('user-agent') || '',
    };
    console.log('[SESSION] Creating session with data:', sessionData);

    const session = await prisma.testSession.create({
      data: sessionData,
    });
    console.log('[SESSION] Successfully created session:', {
      id: session.id,
      sessionNumber: session.sessionNumber,
      testId: session.testId,
      startedAt: session.startedAt,
    });

    // Track interaction
    await prisma.userInteraction.create({
      data: {
        userId,
        actionType: 'test_start',
        entityType: 'test',
        entityId: test.id,
        testId: test.id,
        metadata: JSON.stringify({
          subjects,
          topics,
          systems,
          questionCount: selectedQuestions.length,
          testMode,
          questionMode,
          difficulty,
          timeLimit,
          useAI,
        }),
        durationMs: 0,
        clientIP: request.headers.get('x-forwarded-for') || '',
        userAgent: request.headers.get('user-agent') || '',
      },
    });

    // Return test with questions (but not correct answers)
    return NextResponse.json(
      {
        success: true,
        test: {
          id: test.id,
          title: test.title,
          totalQuestions: selectedQuestions.length,
          timeLimit: test.timeLimit,
          mode: test.mode,
          startedAt: test.startedAt,
          questions: selectedQuestions.map((q) => ({
            id: q.id,
            text: q.text,
            difficulty: q.difficulty,
            options: q.options.map((opt) => ({
              id: opt.id,
              text: opt.text,
              displayOrder: opt.displayOrder,
              // Never send isCorrect to client
            })),
          })),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating test:', error);
    return NextResponse.json({ error: 'Failed to create test' }, { status: 500 });
  }
}
