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

    if (!testId || !userId) {
      return NextResponse.json(
        { error: 'Test ID and User ID required' },
        { status: 400 }
      );
    }

    const test = await fetchQuery(api.tests.getTestById, {
      testId: testId as Id<"tests">,
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    if (test.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const responseData = {
      test: {
        id: test._id,
        title: test.title,
        mode: test.mode,
        questionMode: test.questionMode,
        totalQuestions: test.totalQuestions,
        answered: test.answeredCount,
        correct: test.totalCorrect,
        incorrect: test.totalIncorrect,
        skipped: test.totalSkipped,
        remaining: test.unansweredCount,
        currentScore: test.score || 0,
        timeLimit: test.timeLimit,
        startedAt: test.startedAt,
        completedAt: test.completedAt,
        questions: test.questions.map((q: any) => ({
          id: q._id,
          text: q.text,
          difficulty: q.difficulty,
          displayOrder: q.displayOrder,
          options: q.options.map((opt: any, index: number) => ({
            id: index.toString(),
            text: opt.text,
            displayOrder: index + 1,
          })),
        })),
        answers: test.answers.map((answer: any) => ({
          questionId: answer.questionId,
          status: answer.status,
          selectedOptionId: answer.selectedOptionIndex?.toString(),
          timeSpent: answer.timeSpent,
          isCorrect: test.completedAt ? answer.isCorrect : undefined,
          points: 0, // Points calculation can be added to Convex if needed
        })),
      },
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error('Error fetching test details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test details' },
      { status: 500 }
    );
  }
}
