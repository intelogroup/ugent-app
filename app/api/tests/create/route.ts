import { NextRequest, NextResponse } from 'next/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const result = await fetchMutation(api.tests.createTest, {
      userId: userId as Id<"users">,
      subjects,
      topics,
      systems,
      questionCount,
      mode: testMode as 'TUTOR' | 'TIMED',
      questionMode: questionMode as 'STANDARD' | 'CUSTOM' | 'PRACTICE',
      difficulty: difficulty as 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED',
      timeLimit,
      useAI,
      title: `${testMode === 'TUTOR' ? 'Tutor' : 'Timed'} Test - ${new Date().toLocaleDateString()}`,
    });

    return NextResponse.json(
      {
        success: true,
        test: {
          id: result.testId,
          title: `${testMode === 'TUTOR' ? 'Tutor' : 'Timed'} Test - ${new Date().toLocaleDateString()}`,
          totalQuestions: result.questions.length,
          timeLimit,
          mode: testMode,
          questions: result.questions.map((q: any) => ({
            id: q._id,
            text: q.text,
            difficulty: q.difficulty,
            options: q.options.map((opt: any, index: number) => ({
              id: index.toString(), // Using index as ID for now since Convex options don't have IDs
              text: opt.text,
              displayOrder: index + 1,
            })),
          })),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating test:', error);
    return NextResponse.json({ error: error.message || 'Failed to create test' }, { status: 500 });
  }
}
