import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

interface ClassifiedQuestion {
  text: string;
  correctAnswer: string;
  options: { text: string; isCorrect: boolean }[];
  explanation: string;
  textHash: string;
  system: string;
  subject: string;
  difficulty: string;
}

function loadQuestions(): ClassifiedQuestion[] {
  const filePath = path.join(process.cwd(), 'data', 'classified-questions.jsonl');
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ClassifiedQuestion);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');

  const questions = loadQuestions();

  if (mode === 'filters') {
    const subjects = Array.from(new Set(questions.map((q) => q.subject))).sort();
    const systems = Array.from(new Set(questions.map((q) => q.system))).sort();
    return NextResponse.json({ subjects, systems, total: questions.length });
  }

  const subject = searchParams.get('subject');
  const system = searchParams.get('system');
  const difficulty = searchParams.get('difficulty');
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  let filtered = questions;
  if (subject) filtered = filtered.filter((q) => q.subject === subject);
  if (system) filtered = filtered.filter((q) => q.system === system);
  if (difficulty) filtered = filtered.filter((q) => q.difficulty === difficulty);

  const selected = shuffle(filtered).slice(0, limit).map((q) => ({
    id: q.textHash,
    text: q.text,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    subject: q.subject,
    system: q.system,
    difficulty: q.difficulty,
  }));

  return NextResponse.json({ questions: selected, matched: filtered.length });
}
