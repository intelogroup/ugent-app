import { NextRequest, NextResponse } from 'next/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

/**
 * POST /api/notifications/:id/read
 *
 * Marks a notification as read (Convex refactored)
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params;
    const userId = request.headers.get('x-user-id');

    if (!userId || !notificationId) {
      return NextResponse.json(
        { error: 'User ID and Notification ID required' },
        { status: 400 }
      );
    }

    await fetchMutation(api.notifications.markNotificationRead, {
      notificationId: notificationId as Id<"notifications">,
    });

    return NextResponse.json(
      {
        success: true,
        notification: {
          id: notificationId,
          read: true,
          readAt: new Date(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}
