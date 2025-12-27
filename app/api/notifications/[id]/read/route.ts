import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/notifications/:id/read
 *
 * Marks a notification as read
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

    const notification = await prisma.userInteraction.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    if (notification.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // In a real implementation, would update a separate Notification table
    // For now, we'll update metadata to mark as read
    const metadata = notification.metadata ? JSON.parse(notification.metadata) : {};
    metadata.read = true;
    metadata.readAt = new Date();

    await prisma.userInteraction.update({
      where: { id: notificationId },
      data: {
        metadata: JSON.stringify(metadata),
      },
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
