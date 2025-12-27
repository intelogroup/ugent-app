import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/messages
 * POST /api/messages
 *
 * Retrieve messages and send new messages
 */

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('conversationId');
    const recipientId = searchParams.get('recipientId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    if (!conversationId && !recipientId) {
      return NextResponse.json(
        { error: 'Conversation ID or Recipient ID required' },
        { status: 400 }
      );
    }

    // Get messages from conversation
    let entityId = conversationId;
    if (!conversationId && recipientId) {
      // Generate conversation ID from user IDs
      entityId = [userId, recipientId].sort().join('_');
    }

    const messages = await prisma.userInteraction.findMany({
      where: {
        OR: [
          {
            userId,
            actionType: 'message_sent',
            entityId,
          },
          {
            actionType: 'message_received',
            entityId,
            metadata: { contains: userId },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
      skip: offset,
      take: limit,
    });

    return NextResponse.json(
      {
        messages: messages.map((msg) => {
          const metadata = msg.metadata ? JSON.parse(msg.metadata) : {};
          return {
            id: msg.id,
            senderId: msg.userId,
            recipientId: metadata.recipientId,
            content: metadata.message || '',
            timestamp: msg.createdAt,
            read: metadata.read || false,
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
    const { recipientId, content, conversationId } = body;

    if (!userId || !recipientId || !content) {
      return NextResponse.json(
        { error: 'User ID, recipient ID, and content are required' },
        { status: 400 }
      );
    }

    // Generate conversation ID
    const convId = conversationId || [userId, recipientId].sort().join('_');

    // Create message record
    const message = await prisma.userInteraction.create({
      data: {
        userId,
        actionType: 'message_sent',
        entityType: 'message',
        entityId: convId,
        metadata: JSON.stringify({
          recipientId,
          message: content,
          conversationId: convId,
        }),
        clientIP: request.headers.get('x-forwarded-for') || '',
        userAgent: request.headers.get('user-agent') || '',
      },
    });

    // Create notification for recipient
    await prisma.userInteraction.create({
      data: {
        userId: recipientId,
        actionType: 'message_received',
        entityType: 'message',
        entityId: convId,
        metadata: JSON.stringify({
          senderId: userId,
          message: content,
          conversationId: convId,
        }),
        clientIP: request.headers.get('x-forwarded-for') || '',
        userAgent: request.headers.get('user-agent') || '',
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: {
          id: message.id,
          senderId: userId,
          recipientId,
          content,
          conversationId: convId,
          timestamp: message.createdAt,
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
