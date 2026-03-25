import { NextRequest, NextResponse } from 'next/server';
import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

/**
 * GET /api/messages
 * POST /api/messages
 *
 * Retrieve messages and send new messages using Convex
 */

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const searchParams = request.nextUrl.searchParams;
    let threadId = searchParams.get('threadId') || searchParams.get('conversationId');
    const recipientId = searchParams.get('recipientId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // If no threadId but recipientId provided, find or create thread
    if (!threadId && recipientId) {
      const title = [userId, recipientId].sort().join('_');
      threadId = await fetchMutation(api.threads.findOrCreateThread, {
        userId,
        title,
      });
    }

    if (!threadId) {
      return NextResponse.json(
        { error: 'Thread ID or Conversation ID required' },
        { status: 400 }
      );
    }

    // Get messages from thread
    const messages = await fetchQuery(api.threads.getMessages, {
      threadId: threadId as Id<"threads">,
      limit,
      offset,
    });

    return NextResponse.json(
      {
        messages: messages.map((msg) => {
          return {
            id: msg._id,
            senderId: msg.role === 'user' ? userId : 'assistant',
            content: msg.content,
            timestamp: msg.createdAt,
            role: msg.role,
          };
        }),
        pagination: {
          limit,
          offset,
          returned: messages.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const { recipientId, content, text, conversationId, threadId } = body;

    const actualContent = text || content;
    let actualThreadId = threadId || conversationId;

    if (!userId || !actualContent) {
      return NextResponse.json(
        { error: 'User ID and content are required' },
        { status: 400 }
      );
    }

    // If no threadId but recipientId provided, find or create thread
    if (!actualThreadId && recipientId) {
      const title = [userId, recipientId].sort().join('_');
      actualThreadId = await fetchMutation(api.threads.findOrCreateThread, {
        userId,
        title,
      });
    }

    if (!actualThreadId) {
      return NextResponse.json(
        { error: 'Thread ID or Recipient ID required' },
        { status: 400 }
      );
    }

    // Send message via Convex
    const messageId = await fetchMutation(api.threads.sendMessage, {
      threadId: actualThreadId as Id<"threads">,
      text: actualContent,
      userId: userId,
      role: 'user',
    });

    return NextResponse.json(
      {
        success: true,
        messageId,
        message: {
          id: messageId,
          senderId: userId,
          content: actualContent,
          threadId: actualThreadId,
          timestamp: Date.now(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
