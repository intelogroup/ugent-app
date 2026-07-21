import { NextRequest, NextResponse } from 'next/server';
import { loadQuestions, queryQuestions } from '@/lib/qbank';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');

  if (mode === 'filters') {
    const questions = loadQuestions();
    const subjects = Array.from(new Set(questions.map((q) => q.subject))).sort();
    const systems = Array.from(new Set(questions.map((q) => q.system))).sort();
    return NextResponse.json({ subjects, systems, total: questions.length });
  }

  const subject = searchParams.get('subject') || undefined;
  const system = searchParams.get('system') || undefined;
  const difficulty = searchParams.get('difficulty') || undefined;
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  const { questions, matched } = queryQuestions({ subject, system, difficulty, limit });
  return NextResponse.json({ questions, matched });
}
