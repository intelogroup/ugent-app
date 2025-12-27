import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      actionType,
      entityType,
      entityId,
      testId,
      questionId,
      answerId,
      metadata,
      durationMs,
    } = body;

    if (!userId || !actionType || !entityType) {
      return NextResponse.json(
        { error: 'userId, actionType, and entityType are required' },
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

    // Create interaction record
    const interaction = await prisma.userInteraction.create({
      data: {
        userId,
        actionType,
        entityType,
        entityId,
        testId: testId || null,
        questionId: questionId || null,
        answerId: answerId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        durationMs,
        clientIP: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    return NextResponse.json({ interaction }, { status: 201 });
  } catch (error) {
    console.error('Error tracking interaction:', error);
    return NextResponse.json({ error: 'Failed to track interaction' }, { status: 500 });
  }
}
