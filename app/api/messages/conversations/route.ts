import { NextRequest, NextResponse } from 'next/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';

/**
 * GET /api/messages/conversations
 *
 * List user's conversations (threads) using Convex
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

    // Get threads from Convex
    const { threads, total } = await fetchQuery(api.threads.getThreads, {
      userId,
      limit,
      offset,
    });

    // Format conversations to match frontend expectation
    const conversations = threads.map((thread) => {
      return {
        conversationId: thread._id,
        threadId: thread._id,
        participantId: 'assistant', // Default for thread-based model
        participantName: thread.title || 'Support Chat',
        lastMessage: thread.lastMessage || '',
        lastMessageAt: thread.updatedAt,
        unreadCount: 0,
      };
    });

    return NextResponse.json(
      {
        conversations,
        threads, // Include raw threads as well
        pagination: {
          limit,
          offset,
          total,
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
