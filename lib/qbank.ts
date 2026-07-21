import fs from 'fs';
import path from 'path';

export interface ClassifiedQuestion {
  text: string;
  correctAnswer: string;
  options: { text: string; isCorrect: boolean }[];
  explanation: string;
  textHash: string;
  system: string;
  subject: string;
  difficulty: string;
}

export function loadQuestions(): ClassifiedQuestion[] {
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

export function queryQuestions(opts: {
  subject?: string;
  system?: string;
  difficulty?: string;
  limit?: number;
}) {
  const { subject, system, difficulty, limit = 20 } = opts;
  const questions = loadQuestions();

  let filtered = questions.filter((q) => q.options?.length);
  if (subject) filtered = filtered.filter((q) => q.subject === subject);
  if (system) filtered = filtered.filter((q) => q.system === system);
  if (difficulty) filtered = filtered.filter((q) => q.difficulty === difficulty);

  const selected = shuffle(filtered)
    .slice(0, limit)
    .map((q) => ({
      id: q.textHash,
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      subject: q.subject,
      system: q.system,
      difficulty: q.difficulty,
    }));

  return { questions: selected, matched: filtered.length };
}
