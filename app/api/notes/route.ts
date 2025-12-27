import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/notes
 * POST /api/notes
 *
 * Manage user study notes
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

    // Build filter
    let filter: any = { userId };

    if (search) {
      filter.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isPinned !== null) {
      filter.isPinned = isPinned === 'true';
    }

    // Get notes
    const notes = await prisma.studyNote.findMany({
      where: filter,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip: offset,
      take: limit,
    });

    const total = await prisma.studyNote.count({ where: filter });

    return NextResponse.json(
      {
        notes: notes.map((note) => ({
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags || [],
          isPinned: note.isPinned,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        })),
        pagination: {
          total,
          limit,
          offset,
          returned: notes.length,
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

    // Create note
    const note = await prisma.studyNote.create({
      data: {
        userId,
        title,
        content,
        tags: tags || [],
        questionId,
        systemId,
        isPinned: false,
      },
    });

    return NextResponse.json(
      {
        success: true,
        note: {
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags || [],
          isPinned: note.isPinned,
          createdAt: note.createdAt,
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
