import { createClient } from './supabase/server';

// Small local stopword list — a full-sentence ILIKE almost never matches a
// conversational query verbatim ("what bacterias thrive with
// hemochromatosis?" won't appear as a substring in any question row), so
// tokenize into per-word ILIKE clauses instead. Capped at 6 words to keep
// the .or() filter string bounded.
const QBANK_STOPWORDS = new Set(['a', 'an', 'the', 'to', 'of', 'in', 'on', 'over', 'under', 'is', 'are', 'was', 'were',
  'and', 'or', 'but', 'with', 'without', 'for', 'from', 'by', 'at', 'as', 'this', 'that', 'these', 'those',
  'its', 'it', 'his', 'her', 'their', 'one', 'what', 'which', 'who', 'do', 'does', 'did', 'not']);

export function tokenizeSearchText(searchText: string): string[] {
  return searchText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
    .filter((w) => w && !QBANK_STOPWORDS.has(w))
    .slice(0, 6);
}

export interface ClassifiedQuestion {
  text: string;
  correctAnswer: string;
  options: { text: string; isCorrect: boolean }[];
  explanation: string;
  textHash: string;
  system: string;
  subject: string;
  difficulty: string;
  source: string;
  images: { url: string; caption?: string; type?: string }[];
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
    source: row.source ?? 'medicospira',
    images: row.images ?? [],
  };
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
  source?: string;
  query?: string;
  limit?: number;
}) {
  const { subject, system, difficulty, source, query: searchText, limit = 20 } = opts;
  const supabase = await createClient();

  // Subject/system arrive as comma-joined values when multiple are selected —
  // .in() handles both the single- and multi-value case.
  function applyFilters(query: any) {
    if (subject) query = query.in('subject', subject.split(','));
    if (system) query = query.in('system', system.split(','));
    if (difficulty) query = query.eq('difficulty', difficulty);
    if (source) query = query.eq('source', source);
    // Some scraped rows never got an answer key filled in (empty correct_answer,
    // no option flagged isCorrect) — unanswerable, so exclude from the pool.
    query = query.neq('correct_answer', '');
    return query;
  }

  // Content search (e.g. "trigeminal neuralgia multiple sclerosis") wants the
  // actual matches, not a random sample — ILIKE across text+explanation over
  // the filtered set, ordered by relevance not a random offset.
  if (searchText) {
    const words = tokenizeSearchText(searchText);
    const orFilter = words.length > 0
      ? words.map((w) => `text.ilike.%${w}%,explanation.ilike.%${w}%`).join(',')
      : `text.ilike.%${searchText}%,explanation.ilike.%${searchText}%`;
    let contentQuery = applyFilters(
      supabase.from('questions').select('*').or(orFilter)
    );
    const { data, error } = await contentQuery.limit(limit);
    if (error) throw error;

    const matched = data ?? [];
    const selected = matched.map((row: any) => {
      const q = fromRow(row);
      return {
        id: q.textHash,
        text: q.text,
        options: q.options,
        explanation: q.explanation,
        subject: q.subject,
        system: q.system,
        difficulty: q.difficulty,
        images: q.images,
      };
    });
    return { questions: selected, matched: matched.length };
  }

  // PostgREST enforces a server-side db.max_rows cap (1000 here) on every
  // request, so pulling the whole matched set to shuffle it in memory
  // silently truncates once matches exceed that cap. We only need `limit`
  // (<=20) rows anyway, so fetch a single page at a random offset instead —
  // gives a random-position sample without ever exceeding the cap.
  let headQuery = applyFilters(
    supabase.from('questions').select('*', { count: 'exact', head: true })
  );
  const { count: headCount, error: headError } = await headQuery;
  if (headError) throw headError;

  const count = headCount ?? 0;
  const maxOffset = Math.max(0, count - limit);
  const offset = Math.floor(Math.random() * (maxOffset + 1));

  let query = applyFilters(supabase.from('questions').select('*'));
  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;

  const matched = data ?? [];
  const selected = shuffle(matched)
    .slice(0, limit)
    .map((row: any) => {
      const q = fromRow(row);
      return {
        id: q.textHash,
        text: q.text,
        options: q.options,
        explanation: q.explanation,
        subject: q.subject,
        system: q.system,
        difficulty: q.difficulty,
        images: q.images,
      };
    });

  return { questions: selected, matched: count ?? matched.length };
}
