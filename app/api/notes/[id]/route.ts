import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/notes/:id
 * PUT /api/notes/:id
 * DELETE /api/notes/:id
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: noteId } = await params;
    const userId = request.headers.get('x-user-id');

    if (!userId || !noteId) {
      return NextResponse.json(
        { error: 'User ID and Note ID required' },
        { status: 400 }
      );
    }

    const note = await prisma.studyNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    if (note.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        id: note.id,
        title: note.title,
        content: note.content,
        tags: note.tags || [],
        isPinned: note.isPinned,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching note:', error);
    return NextResponse.json(
      { error: 'Failed to fetch note' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: noteId } = await params;
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const { title, content, tags, isPinned } = body;

    if (!userId || !noteId) {
      return NextResponse.json(
        { error: 'User ID and Note ID required' },
        { status: 400 }
      );
    }

    const note = await prisma.studyNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    if (note.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const updatedNote = await prisma.studyNote.update({
      where: { id: noteId },
      data: {
        title: title || note.title,
        content: content || note.content,
        tags: tags !== undefined ? tags : note.tags,
        isPinned: isPinned !== undefined ? isPinned : note.isPinned,
      },
    });

    return NextResponse.json(
      {
        success: true,
        note: {
          id: updatedNote.id,
          title: updatedNote.title,
          content: updatedNote.content,
          tags: updatedNote.tags || [],
          isPinned: updatedNote.isPinned,
          updatedAt: updatedNote.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: noteId } = await params;
    const userId = request.headers.get('x-user-id');

    if (!userId || !noteId) {
      return NextResponse.json(
        { error: 'User ID and Note ID required' },
        { status: 400 }
      );
    }

    const note = await prisma.studyNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    if (note.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await prisma.studyNote.delete({
      where: { id: noteId },
    });

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
