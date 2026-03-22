import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: testId } = await params;
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const action = (searchParams.get('action') || 'CHECK') as 'CHECK' | 'RESUME';

    if (!userId || !testId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const convex = getConvexClient();

    const result = await convex.mutation(api.tests.resumeSession, {
      testId: testId as Id<"tests">,
      userId: userId as Id<"users">,
      action,
    });

    if (!result.canResume) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Resume error:', error);
    return NextResponse.json(
      { error: error.message || 'resume_failed' },
      { status: 500 }
    );
  }
}
