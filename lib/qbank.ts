import { createClient } from './supabase/server';

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

function fromRow(row: any): ClassifiedQuestion {
  return {
    text: row.text,
    correctAnswer: row.correct_answer,
    options: row.options,
    explanation: row.explanation,
    textHash: row.id,
    system: row.system,
    subject: row.subject,
    difficulty: row.difficulty,
  };
}

export async function loadQuestions(): Promise<ClassifiedQuestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('questions').select('*');
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function queryQuestions(opts: {
  subject?: string;
  system?: string;
  difficulty?: string;
  limit?: number;
}) {
  const { subject, system, difficulty, limit = 20 } = opts;
  const supabase = await createClient();

  let query = supabase.from('questions').select('*', { count: 'exact' });
  if (subject) query = query.eq('subject', subject);
  if (system) query = query.eq('system', system);
  if (difficulty) query = query.eq('difficulty', difficulty);

  const { data, count, error } = await query;
  if (error) throw error;

  const matched = data ?? [];
  const selected = shuffle(matched)
    .slice(0, limit)
    .map((row) => {
      const q = fromRow(row);
      return {
        id: q.textHash,
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        subject: q.subject,
        system: q.system,
        difficulty: q.difficulty,
      };
    });

  return { questions: selected, matched: count ?? matched.length };
}
