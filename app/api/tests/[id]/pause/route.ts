import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex-client';

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

    const convex = getConvexClient();

    const result = await convex.mutation(api.tests.pauseSession, {
      testId: testId as Id<"tests">,
      userId: userId as Id<"users">,
      reason,
      currentQuestion,
      questionsAnswered,
      questionsSkipped,
      deviceType: request.headers.get('user-agent')?.includes('mobile') ? 'mobile' : 'desktop',
      browser: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Pause error:', error);
    return NextResponse.json(
      { error: error.message || 'pause_failed' },
      { status: 500 }
    );
  }
}
