import { z } from 'zod';
import { tool, embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { readFileSync } from 'fs';
import path from 'path';
import { queryQuestions } from '@/lib/qbank';
import { analyzeQuestions, getSystemDiseaseMap } from '@/lib/curriculum/analyzer';
import { createClient } from '@/lib/supabase/server';
import type { QuizAttempt } from '@/lib/quizAttempts';


type TextPage = { page: number; text: string };

const EMBEDDING_MODEL = 'text-embedding-3-small';

function buildExcerpt(query: string, text: string): string {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lower = text.toLowerCase();
  // Anchor the excerpt on a literal query word if one appears on the page
  // (semantic hits are usually also lexically related); otherwise just take
  // the page opening — there's no "position" a pure embedding match gives us.
  const anchorWord = words.find((w) => lower.includes(w));
  const firstIdx = anchorWord ? lower.indexOf(anchorWord) : 0;
  const start = Math.max(0, firstIdx - 100);
  const end = anchorWord ? firstIdx + anchorWord.length + 200 : 300;
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

// ponytail: word-overlap scoring — used only when data/.embeddings/<book>
// hasn't been built yet (run `node scripts/build-book-embeddings.mjs`).
// Kept as the safety-net path, not the primary one.
function searchByWordOverlap(file: string, query: string, limit: number) {
  const lines = readFileSync(path.join(process.cwd(), 'data', file), 'utf8')
    .split('\n')
    .filter(Boolean);
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const pages = lines.map((line) => JSON.parse(line) as TextPage);

  const scored = pages.map(({ page, text }) => {
    const lower = text.toLowerCase();
    const matched = words.filter((w) => lower.includes(w));
    return { page, text, matched };
  });

  const maxScore = Math.max(0, ...scored.map((s) => s.matched.length));
  if (maxScore === 0) return [];

  const thresholds = [Math.ceil(words.length * 0.6), Math.ceil(words.length * 0.3), 1];
  const threshold = thresholds.find((t) => t <= maxScore) ?? 1;

  return scored
    .filter((s) => s.matched.length >= threshold)
    .sort((a, b) => b.matched.length - a.matched.length)
    .slice(0, limit)
    .map(({ page, text }) => ({ page, excerpt: buildExcerpt(query, text) }));
}

// Semantic search: embed the query, cosine-match via Postgres pgvector
// (`book_pages` table + `match_book_pages` RPC, migrated from the local
// data/.embeddings/*.json files). Fixes the word-overlap scorer's blind spot
// — a page whose content answers the question but doesn't share literal
// keywords with a verbose model-generated query (e.g. Legionella's
// hyponatremia link buried in a bug-list page that never says "SIADH").
async function searchByEmbedding(book: 'pathoma' | 'firstaid', query: string, limit: number) {
  if (!process.env.OPENAI_API_KEY) return null;

  const { embedding } = await embed({ model: openai.textEmbeddingModel(EMBEDDING_MODEL), value: query });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('match_book_pages', {
    p_book: book,
    query_embedding: embedding,
    match_count: limit,
  });
  if (error) throw error;
  if (!data || data.length === 0) return null;

  return data.map(({ page, text }: { page: number; text: string }) => ({
    page,
    excerpt: buildExcerpt(query, text),
  }));
}

async function searchTextFile(file: string, book: 'pathoma' | 'firstaid', query: string, limit: number) {
  try {
    const semanticHits = await searchByEmbedding(book, query, limit);
    if (semanticHits) return semanticHits;
  } catch (error) {
    // Supabase/OpenAI outage, bad key, or rate limit shouldn't take down the
    // whole tool call — degrade to local word-overlap rather than surfacing
    // an error to Clea.
    console.error('searchByEmbedding failed, falling back to word overlap', error);
  }
  return searchByWordOverlap(file, query, limit);
}

export const searchPathoma = tool({
  description:
    'Full-text search Pathoma (scanned textbook pages) for a topic or keyword, to explain USMLE Step 1 pathology concepts.',
  inputSchema: z.object({
    query: z.string().describe('Keyword or phrase to search for, e.g. "hyperplasia"'),
    limit: z.number().int().min(1).max(10).default(5),
  }),
  execute: async ({ query, limit }) => ({
    hits: await searchTextFile('pathoma_text.jsonl', 'pathoma', query, limit),
  }),
});

export const searchFirstAid = tool({
  description:
    'Full-text search First Aid for USMLE Step 1 (scanned textbook pages) for a topic or keyword.',
  inputSchema: z.object({
    query: z.string().describe('Keyword or phrase to search for, e.g. "Turner syndrome"'),
    limit: z.number().int().min(1).max(10).default(5),
  }),
  execute: async ({ query, limit }) => ({
    hits: await searchTextFile('firstaid_text.jsonl', 'firstaid', query, limit),
  }),
});

export const queryQbank = tool({
  description:
    'Look up USMLE quiz questions by subject, system, or difficulty to check what the student has practiced.',
  inputSchema: z.object({
    subject: z.string().optional().describe('e.g. "Cardiovascular", "Pharmacology"'),
    system: z.string().optional().describe('e.g. "Cardiovascular", "Renal"'),
    difficulty: z.string().optional().describe('e.g. "EASY", "MEDIUM", "HARD"'),
    limit: z.number().int().min(1).max(10).default(5),
  }),
  execute: async ({ subject, system, difficulty, limit }) => {
    const { questions, matched } = await queryQuestions({ subject, system, difficulty, limit });
    return {
      matched,
      sample: questions.map((q) => ({
        subject: q.subject,
        system: q.system,
        difficulty: q.difficulty,
        text: q.text.slice(0, 140),
      })),
    };
  },
});

// Factory instead of a shared tool instance: attempts must come from the
// current request's own user, not a module-level cache — a single mutable
// cache shared across concurrent requests would leak one student's stats
// into another student's session. Called fresh per-request in the chat route
// with that request's own server-loaded attempts closed over.
export function makeQueryMyAttempts(attempts: QuizAttempt[]) {
  return tool({
    description:
      'Returns the student\'s past quiz attempt history: sessions count, overall accuracy, per-subject breakdown, and recent trend. Use this to tailor study recommendations or give progress feedback.',
    inputSchema: z.object({}),
    execute: async () => {
      if (attempts.length === 0) return { note: 'No quiz sessions yet.', sessions: [], subjectBreakdown: [] };
      const total = attempts.length;
      const totalQ = attempts.reduce((s, a) => s + a.total, 0);
      const totalCorrect = attempts.reduce((s, a) => s + a.correct, 0);
      const overallPct = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;
      const last5 = attempts.slice(-5).reverse().map((a, i) => ({
        session: total - i,
        date: new Date(a.timestamp).toLocaleDateString(),
        subject: a.subject ?? 'mixed',
        system: a.system ?? 'any',
        score: `${a.correct}/${a.total} (${a.total > 0 ? Math.round((a.correct / a.total) * 100) : 0}%)`,
      }));
      const bySubject: Record<string, { total: number; correct: number }> = {};
      for (const a of attempts) {
        const key = a.subject ?? 'mixed';
        if (!bySubject[key]) bySubject[key] = { total: 0, correct: 0 };
        bySubject[key].total += a.total;
        bySubject[key].correct += a.correct;
      }
      const subjectBreakdown = Object.entries(bySubject)
        .map(([subject, v]) => ({
          subject,
          total: v.total,
          accuracy: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
        }))
        .sort((a, b) => b.accuracy - a.accuracy);
      return {
        sessions: total,
        totalQuestions: totalQ,
        overallAccuracy: overallPct,
        last5Sessions: last5,
        subjectBreakdown,
      };
    },
  });
}

export const queryCurriculum = tool({
  description:
    'Get weak-area / frequency stats across the USMLE curriculum, optionally scoped to a body system, to recommend what to study next.',
  inputSchema: z.object({
    system: z.string().optional().describe('Limit disease list to one system, e.g. "Neurology"'),
  }),
  execute: async ({ system }) => {
    const { frequencyStats } = await analyzeQuestions();
    const diseaseMap = await getSystemDiseaseMap();
    const diseases = system ? diseaseMap[system] ?? [] : Object.values(diseaseMap).flat();
    return {
      topSystemsByFrequency: frequencyStats.systems.slice(0, 8),
      topDiseases: diseases
        .sort((a, b) => b.questionCount - a.questionCount)
        .slice(0, 8)
        .map((d) => ({ name: d.diseaseName, count: d.questionCount, subject: d.subject })),
    };
  },
});
