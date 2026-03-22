import { NextRequest, NextResponse } from 'next/server';
import { fetchQuery, fetchMutation } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

/**
 * GET /api/notifications
 * POST /api/notifications
 *
 * Manage user notifications (Convex refactored)
 */

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const result = await fetchQuery(api.notifications.getNotifications, {
      userId: userId as Id<"users">,
      limit,
      offset,
    });

    return NextResponse.json(
      {
        notifications: result.notifications.map((notif: any) => ({
          id: notif._id,
          type: notif.type,
          title: notif.title,
          content: notif.content,
          read: notif.isRead,
          createdAt: notif.createdAt,
        })),
        unreadCount: result.unreadCount,
        pagination: {
          total: result.total,
          limit,
          offset,
          returned: result.notifications.length,
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

    const notificationId = await fetchMutation(api.notifications.createNotification, {
      userId: userId as Id<"users">,
      type,
      title,
      content: content || '',
      relatedUserId,
      relatedEntityId,
      relatedEntityType,
    });

    return NextResponse.json(
      {
        success: true,
        notification: {
          id: notificationId,
          type,
          title,
          content,
          createdAt: Date.now(),
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

/**
 * PATCH /api/notifications/[id] logic is usually handled in a separate route file, 
 * but since we are refactoring, let's see if there is one.
 * The requirement mentions markNotificationRead.
 */
