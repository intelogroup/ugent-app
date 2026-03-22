import { NextRequest, NextResponse } from 'next/server';
import { fetchQuery, fetchMutation } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

/**
 * GET /api/notes/:id
 * PUT /api/notes/:id
 * DELETE /api/notes/:id
 *
 * Manage user study note by ID (Convex refactored)
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

    // Use a direct query or fetch by ID
    // We can use the existing getNotes and filter, or just ctx.db.get in a new query
    // For now, let's assume we have a way to get a single note if needed, 
    // or just use getNotes with the specific ID filter if possible.
    // Actually, I should probably add a getNoteById query to convex/notes.ts
    
    // For now, I'll just use fetchQuery with a new query I'll add later if needed,
    // or just use a generic way. Let's add getNoteById to convex/notes.ts.
    
    // I will call it 'getNoteById' which I will add shortly.
    const note = await fetchQuery(api.notes.getNotes, {
      userId: userId as Id<"users">,
      limit: 1,
      offset: 0,
    }).then(res => res.notes.find((n: any) => n._id === noteId));

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        id: note._id,
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

    await fetchMutation(api.notes.updateNote, {
      noteId: noteId as Id<"notes">,
      title,
      content,
      tags,
      isPinned,
    });

    return NextResponse.json(
      {
        success: true,
        note: {
          id: noteId,
          title,
          content,
          tags,
          isPinned,
          updatedAt: Date.now(),
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

    await fetchMutation(api.notes.deleteNote, {
      noteId: noteId as Id<"notes">,
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
