import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex-client';

/**
 * POST /api/tests/:id/complete
 *
 * Marks test as completed and calculates final results
 * Generates performance summary and AI insights
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: testId } = await params;
    const userId = request.headers.get('x-user-id');
    const body = await request.json().catch(() => ({}));
    const { durationMs } = body;

    if (!testId || !userId) {
      return NextResponse.json(
        { error: 'Test ID and User ID required' },
        { status: 400 }
      );
    }

    const convex = getConvexClient();

    const result = await convex.mutation(api.tests.completeSession, {
      testId: testId as Id<"tests">,
      userId: userId as Id<"users">,
      durationMs: durationMs || 0,
      clientIP: request.headers.get('x-forwarded-for') || '',
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error completing test:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete test' },
      { status: 500 }
    );
  }
}
