import { NextRequest, NextResponse } from 'next/server';
import { fetchQuery, fetchMutation } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

/**
 * GET /api/notes
 * POST /api/notes
 *
 * Manage user study notes (Convex refactored)
 */

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const isPinned = searchParams.get('isPinned');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const result = await fetchQuery(api.notes.getNotes, {
      userId: userId as Id<"users">,
      limit,
      offset,
      search: search || undefined,
      isPinned: isPinned !== null ? isPinned === 'true' : undefined,
    });

    return NextResponse.json(
      {
        notes: result.notes.map((note: any) => ({
          id: note._id,
          title: note.title,
          content: note.content,
          tags: note.tags || [],
          isPinned: note.isPinned,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        })),
        pagination: {
          total: result.total,
          limit,
          offset,
          returned: result.notes.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const { title, content, tags = [], questionId, systemId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const noteId = await fetchMutation(api.notes.createNote, {
      userId: userId as Id<"users">,
      title,
      content,
      tags: tags || [],
      questionId: questionId as Id<"questions"> | undefined,
      systemId: systemId as Id<"systems"> | undefined,
    });

    return NextResponse.json(
      {
        success: true,
        note: {
          id: noteId,
          title,
          content,
          tags: tags || [],
          isPinned: false,
          createdAt: Date.now(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}
