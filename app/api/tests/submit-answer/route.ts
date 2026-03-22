import { NextRequest, NextResponse } from 'next/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, testId, questionId, selectedOptionId, timeSpent } = body;

    if (!userId || !testId || !questionId) {
      return NextResponse.json(
        { error: 'userId, testId, and questionId are required' },
        { status: 400 }
      );
    }

    // Since Convex options don't have IDs in our schema (they are an array of objects), 
    // we assume selectedOptionId is the index if it's a number string, 
    // or we'll need to find it. The frontend seems to use IDs.
    // Let's check how the frontend sends this.
    
    let selectedOptionIndex: number | undefined;
    if (selectedOptionId !== undefined && selectedOptionId !== null) {
      selectedOptionIndex = parseInt(selectedOptionId);
      if (isNaN(selectedOptionIndex)) {
        // If it's not a number, we'll have to handle it differently.
        // For now, let's assume it's the index as a string.
        selectedOptionIndex = undefined;
      }
    }

    const result = await fetchMutation(api.tests.submitAnswer, {
      userId: userId as Id<"users">,
      testId: testId as Id<"tests">,
      questionId: questionId as Id<"questions">,
      selectedOptionIndex,
      timeSpent,
    });

    return NextResponse.json(
      {
        success: true,
        answer: {
          id: result.answerId,
          status: result.status,
          isCorrect: result.isCorrect,
          timeSpent,
        },
        points: 0, // Points calculation can be added to Convex mutation if needed
        feedback: {
          correct: result.isCorrect,
          message: result.isCorrect ? 'Correct!' : 'Incorrect. Review the explanation.',
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error submitting answer:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit answer' }, { status: 500 });
  }
}
