import { NextRequest, NextResponse } from 'next/server';
import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const subjectId = searchParams.get('subjectId') as Id<"subjects"> | null;
    const topicId = searchParams.get('topicId') as Id<"topics"> | null;
    const systemId = searchParams.get('systemId') as Id<"systems"> | null;
    const difficulty = searchParams.get('difficulty') as "EASY" | "MEDIUM" | "HARD" | null;

    const questions = await fetchQuery(api.questions.getQuestions, {
      limit,
      subjectId: subjectId || undefined,
      topicId: topicId || undefined,
      systemId: systemId || undefined,
      difficulty: difficulty || undefined,
    });

    return NextResponse.json({ questions });
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

    const correctAnswer = options.find((opt: any) => opt.isCorrect)?.text || options[0].text;

    const question = await fetchMutation(api.questions.createQuestion, {
      text,
      explanation: explanation || "",
      difficulty: (difficulty as "EASY" | "MEDIUM" | "HARD") || 'MEDIUM',
      systemId: (systemId as Id<"systems">) || undefined,
      topicId: (topicId as Id<"topics">) || undefined,
      subjectId: (subjectId as Id<"subjects">) || undefined,
      options: options.map((opt: any) => ({
        text: opt.text,
        isCorrect: opt.isCorrect || false,
      })),
      correctAnswer,
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}
