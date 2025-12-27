import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/notifications
 * POST /api/notifications
 *
 * Manage user notifications
 */

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const searchParams = request.nextUrl.searchParams;
    const isRead = searchParams.get('isRead');
    const type = searchParams.get('type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Build filter
    let filter: any = { userId };

    if (isRead !== null) {
      filter.read = isRead === 'true';
    }

    if (type) {
      filter.type = type;
    }

    // Get notifications
    const notifications = await prisma.userInteraction.findMany({
      where: {
        userId,
        actionType: { startsWith: 'notification_' },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const unreadCount = await prisma.userInteraction.count({
      where: {
        userId,
        actionType: { startsWith: 'notification_' },
      },
    });

    return NextResponse.json(
      {
        notifications: notifications.map((notif) => ({
          id: notif.id,
          type: notif.actionType.replace('notification_', ''),
          title: notif.metadata ? JSON.parse(notif.metadata).title : 'Notification',
          content: notif.metadata ? JSON.parse(notif.metadata).content : '',
          read: false, // Would need notification table to track read status
          createdAt: notif.createdAt,
        })),
        unreadCount,
        pagination: {
          total: unreadCount,
          limit,
          offset,
          returned: notifications.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const { type, title, content, relatedUserId, relatedEntityId, relatedEntityType } = body;

    if (!userId || !type || !title) {
      return NextResponse.json(
        { error: 'User ID, type, and title are required' },
        { status: 400 }
      );
    }

    // Create notification via interaction
    const notification = await prisma.userInteraction.create({
      data: {
        userId,
        actionType: `notification_${type}`,
        entityType: relatedEntityType || 'notification',
        entityId: relatedEntityId || '',
        metadata: JSON.stringify({
          title,
          content,
          relatedUserId,
        }),
        clientIP: request.headers.get('x-forwarded-for') || '',
        userAgent: request.headers.get('user-agent') || '',
      },
    });

    return NextResponse.json(
      {
        success: true,
        notification: {
          id: notification.id,
          type,
          title,
          content,
          createdAt: notification.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}
