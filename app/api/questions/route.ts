import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const difficulty = searchParams.get('difficulty');
    const systemId = searchParams.get('systemId');
    const topicId = searchParams.get('topicId');
    const subjectId = searchParams.get('subjectId');

    const where: any = {};

    if (difficulty) where.difficulty = difficulty;
    if (systemId) where.systemId = systemId;
    if (topicId) where.topicId = topicId;
    if (subjectId) where.subjectId = subjectId;

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: {
          options: {
            orderBy: { displayOrder: 'asc' },
          },
          system: {
            select: { id: true, name: true },
          },
          topic: {
            select: { id: true, name: true },
          },
          subject: {
            select: { id: true, name: true },
          },
        },
        skip: offset,
        take: limit,
      }),
      prisma.question.count({ where }),
    ]);

    return NextResponse.json({
      questions,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, explanation, difficulty, systemId, topicId, subjectId, options } = body;

    if (!text) {
      return NextResponse.json({ error: 'Question text is required' }, { status: 400 });
    }

    if (!options || options.length < 2) {
      return NextResponse.json({ error: 'At least 2 answer options are required' }, { status: 400 });
    }

    const question = await prisma.question.create({
      data: {
        text,
        explanation: explanation || null,
        difficulty: difficulty || 'MEDIUM',
        systemId: systemId || null,
        topicId: topicId || null,
        subjectId: subjectId || null,
        options: {
          createMany: {
            data: options.map((opt: any, idx: number) => ({
              text: opt.text,
              isCorrect: opt.isCorrect || false,
              displayOrder: idx,
            })),
          },
        },
      },
      include: {
        options: true,
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}
