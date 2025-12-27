import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/messages/conversations
 *
 * List user's conversations
 * Query parameters:
 * - limit: number (default: 10)
 * - offset: number (default: 0)
 */

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Get all conversations for user (simulated via interactions)
    const userInteractions = await prisma.userInteraction.findMany({
      where: {
        userId,
        actionType: 'message_sent',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['entityId'], // Group by conversation
      skip: offset,
      take: limit,
    });

    // Format conversations
    const conversations = userInteractions.map((interaction) => {
      const metadata = interaction.metadata ? JSON.parse(interaction.metadata) : {};
      return {
        conversationId: interaction.entityId,
        participantId: metadata.recipientId || 'unknown',
        participantName: metadata.recipientName || 'Unknown',
        lastMessage: metadata.message || '',
        lastMessageAt: interaction.createdAt,
        unreadCount: 0, // Would need message tracking
      };
    });

    return NextResponse.json(
      {
        conversations,
        pagination: {
          limit,
          offset,
          returned: conversations.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
