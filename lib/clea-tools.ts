import { z } from 'zod';
import { tool, embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { readFileSync } from 'fs';
import path from 'path';
import { queryQuestions } from '@/lib/qbank';
import { analyzeQuestions, getSystemDiseaseMap } from '@/lib/curriculum/analyzer';
import { generateCurriculum } from '@/lib/curriculum/generator';
import { createClient } from '@/lib/supabase/server';
import type { QuizAttempt } from '@/lib/quizAttempts';
import { levenshtein } from '@/lib/asr-correct';
import commonEnglishWords from '@/lib/common-english.json';

const COMMON_ENGLISH = new Set(commonEnglishWords as string[]);


type TextPage = { page: number; text: string };

const EMBEDDING_MODEL = 'text-embedding-3-small';
// ponytail: fixed cutoff, tune from eval data if false-refusals/false-groundings show up.
const SIMILARITY_THRESHOLD = 0.4;

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
// Common words that clear a naive "shared word" bar on almost any two
// English passages — counting these as a match is what let an unrelated
// (e.g. culinary) query pull back real-looking medical excerpts.
const STOPWORDS = new Set(['a', 'an', 'the', 'to', 'of', 'in', 'on', 'over', 'under', 'is', 'are', 'was', 'were',
  'and', 'or', 'but', 'with', 'without', 'for', 'from', 'by', 'at', 'as', 'this', 'that', 'these', 'those',
  'its', 'it', 'his', 'her', 'their', 'one', 'low', 'high', 'due', 'per', 'into', 'onto', 'not']);

// Substring matching let short words match inside unrelated longer words
// ("car" inside "cardiac"/"carcinoma") — whole-word boundary check instead.
const wordReCache = new Map<string, RegExp>();
function containsWord(lower: string, w: string): boolean {
  let re = wordReCache.get(w);
  if (!re) {
    re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    wordReCache.set(w, re);
  }
  return re.test(lower);
}

function readPages(file: string): TextPage[] {
  return readFileSync(path.join(process.cwd(), 'data', file), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as TextPage);
}

// Junk tokens in a noisy/ASR-garbled query (e.g. "debu", "kIt's", "best.eep")
// dilute the embedding's semantic signal enough to drop cosine similarity
// below threshold even when the real question inside the noise is on-topic.
// Word-overlap already ignores words with zero page hits; reuse that same
// "does this word appear anywhere in the book" signal to build a cleaned
// query for the embedding leg too, instead of embedding the raw sentence.
function cleanQueryForBook(pages: TextPage[], query: string): string {
  const words = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w && !STOPWORDS.has(w));
  if (words.length === 0) return query;
  const lowerPages = pages.map(({ text }) => text.toLowerCase());
  const meaningful = words.filter((w) => lowerPages.some((lower) => containsWord(lower, w)));
  return meaningful.length > 0 ? meaningful.join(' ') : query;
}

function searchByWordOverlap(file: string, query: string, limit: number) {
  // Strip punctuation so trailing "?"/"!" don't get glued onto the word ("wvf?").
  const words = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w && !STOPWORDS.has(w));
  const pages = readPages(file);

  // Count how many pages contain each word — words that appear in 0 pages
  // are junk (garbled ASR, gibberish, misspellings) and shouldn't inflate
  // thresholds. Only meaningful words count toward the overlap requirement.
  const wordPageCount = new Map<string, number>();
  for (const { text } of pages) {
    const lower = text.toLowerCase();
    for (const w of words) {
      if (containsWord(lower, w)) wordPageCount.set(w, (wordPageCount.get(w) ?? 0) + 1);
    }
  }
  const meaningfulWords = words.filter((w) => (wordPageCount.get(w) ?? 0) > 0);

  // Long/technical words (medical acronyms like "adamts13", "vwf") with zero
  // exact hits are the classic ASR-mangled-typo case ("adamsts13", "wvf" —
  // transposed letters). Fuzzy-match these against real page tokens instead
  // of dropping them outright; short/common words skip this since Levenshtein
  // over a whole corpus is too permissive for 3-4 letter words.
  const fuzzyWords = words.filter((w) => w.length > 5 && (wordPageCount.get(w) ?? 0) === 0);
  const pageFuzzyMatches = new Map<number, Set<string>>(); // page index -> matched fuzzy words
  if (fuzzyWords.length > 0) {
    const pageTokenCache = pages.map(({ text }) => new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []));
    for (const w of fuzzyWords) {
      let pageCount = 0;
      pageTokenCache.forEach((tokens, idx) => {
        for (const t of tokens) {
          if (t.length > 5 && Math.abs(t.length - w.length) <= 2 && levenshtein(w, t) <= 2) {
            pageCount++;
            if (!pageFuzzyMatches.has(idx)) pageFuzzyMatches.set(idx, new Set());
            pageFuzzyMatches.get(idx)!.add(w);
            break;
          }
        }
      });
      if (pageCount > 0) {
        wordPageCount.set(w, pageCount);
        meaningfulWords.push(w);
      }
    }
  }
  if (meaningfulWords.length === 0) return [];

  const scored = pages.map(({ page, text }, idx) => {
    const lower = text.toLowerCase();
    const fuzzyHere = pageFuzzyMatches.get(idx);
    const matched = meaningfulWords.filter((w) => containsWord(lower, w) || fuzzyHere?.has(w));
    return { page, text, matched };
  });

  const maxScore = Math.max(0, ...scored.map((s) => s.matched.length));
  // Floor of 3 — 1-2 shared content words is still coincidence-prone over an
  // 800-page corpus (verified: an unrelated culinary query matched a renal
  // page on just "original"+"volume"), same false-grounding failure mode as
  // the embedding path's low-similarity hits.
  const thresholds = [Math.ceil(meaningfulWords.length * 0.6), Math.ceil(meaningfulWords.length * 0.3), 3];
  const threshold = thresholds.find((t) => t <= maxScore) ?? 3;

  // Rare/distinctive terms (e.g. "ADAMTS13", "Schilling") appear on only a
  // handful of pages corpus-wide — a match on one of these is not coincidence
  // the way a generic word match is, so it clears the bar on its own even
  // when a verbose/full-sentence query dilutes the overall word count below
  // `threshold`. Fixes rare proper-noun/acronym queries getting dropped by
  // the ratio-based threshold above.
  // Gated on NOT being in the general-English dictionary — an off-topic query
  // ("chocolate chip cookies") is corpus-rare for the same structural reason
  // (this is a medical book), so raw page-count rarity alone would false-
  // ground on any off-topic word that happens to also appear coincidentally
  // (verified: matched a Pathoma page on "chocolate"/"chip"/"cookies" before
  // this gate — the exact false-grounding failure mode the floor-3 threshold
  // above was already built to prevent).
  const RARE_PAGE_COUNT = 3;
  const rareWords = new Set(
    meaningfulWords.filter((w) => w.length > 3 && !COMMON_ENGLISH.has(w) && (wordPageCount.get(w) ?? 0) <= RARE_PAGE_COUNT)
  );

  return scored
    .filter((s) => s.matched.length >= threshold || s.matched.some((w) => rareWords.has(w)))
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

  const tEmbed = performance.now();
  const { embedding } = await embed({ model: openai.textEmbeddingModel(EMBEDDING_MODEL), value: query });
  console.log(`[clea-tools] stage=embed book=${book} ms=${(performance.now() - tEmbed).toFixed(0)}`);

  const supabase = await createClient();
  const tRpc = performance.now();
  const { data, error } = await supabase.rpc('match_book_pages', {
    p_book: book,
    query_embedding: embedding,
    match_count: limit,
  });
  console.log(`[clea-tools] stage=match_book_pages book=${book} ms=${(performance.now() - tRpc).toFixed(0)}`);
  if (error) throw error;
  if (!data || data.length === 0) return null;

  // Cosine top-k always returns *something*, even for a query with nothing
  // relevant in the book — off-topic queries were observed pulling back
  // real-looking excerpts at similarity <0.4 (see migration comment above),
  // which defeats the grounding-refusal rule downstream since the caller
  // only checks "did we get hits", not "were the hits actually relevant".
  const relevant = data.filter((row: { similarity: number }) => row.similarity >= SIMILARITY_THRESHOLD);
  if (relevant.length === 0) return null;

  return relevant.map(({ page, text }: { page: number; text: string }) => ({
    page,
    excerpt: buildExcerpt(query, text),
  }));
}

async function searchTextFile(file: string, book: 'pathoma' | 'firstaid', query: string, limit: number) {
  try {
    const cleanedQuery = cleanQueryForBook(readPages(file), query);
    const semanticHits = await searchByEmbedding(book, cleanedQuery, limit);
    if (semanticHits) return semanticHits;
    console.log(`[clea-tools] stage=fallback book=${book} reason=no-hits-above-threshold query="${query}"`);
  } catch (error) {
    // Supabase/OpenAI outage, bad key, or rate limit shouldn't take down the
    // whole tool call — degrade to local word-overlap rather than surfacing
    // an error to Clea.
    console.log(`[clea-tools] stage=fallback book=${book} reason=embed-error query="${query}"`);
    console.error('searchByEmbedding failed, falling back to word overlap', error);
  }
  const overlapHits = searchByWordOverlap(file, query, limit);
  console.log(`[clea-tools] stage=word-overlap-result book=${book} hits=${overlapHits.length} pages=${overlapHits.map((h) => h.page).join(',')}`);
  return overlapHits;
}

// Server-side prefetch used by the chat route to inject grounding excerpts
// into the system prompt directly, instead of forcing the model to spend a
// full sequential tool-call round trip just to satisfy the "always search
// before answering" instruction. searchPathoma/searchFirstAid stay available
// as tools too, for a follow-up search with a model-refined query.
// ponytail: when books return little content, fall back to qbank search on
// same query — the ILIKE across question text+explanation catches facts
export async function searchBooks(query: string, limit = 4): Promise<string> {
  const [pathoma, firstAid] = await Promise.all([
    searchTextFile('pathoma_text.jsonl', 'pathoma', query, limit).catch(() => []),
    searchTextFile('firstaid_text.jsonl', 'firstaid', query, limit).catch(() => []),
  ]);
  const lines: string[] = [];
  if (pathoma.length) lines.push(`Pathoma:\n${pathoma.map((h: { page: number; excerpt: string }) => `(p.${h.page}) ${h.excerpt}`).join('\n')}`);
  if (firstAid.length) lines.push(`First Aid:\n${firstAid.map((h: { page: number; excerpt: string }) => `(p.${h.page}) ${h.excerpt}`).join('\n')}`);
  try {
    const { questions } = await queryQuestions({ query, limit: 3 });
    if (questions.length) {
      lines.push(`Qbank:\n${questions.map((q: { text: string; explanation: string }) => `Q: ${q.text.slice(0, 200)}\nExplanation: ${q.explanation.slice(0, 300)}`).join('\n---\n')}`);
    }
  } catch (e) {
    console.error('qbank search failed', e);
  }
  return lines.join('\n\n');
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

const PUBMED_MIN_YEAR = 2020;

// PubMed only indexes journal-vetted content (unlike bioRxiv/medRxiv), so
// "Journal Article"[pt] + excluding "Preprint"[pt] is the lazy proxy for
// peer-reviewed here — there's no dedicated peer-review flag in E-utilities.
async function searchPubMedImpl(query: string, limit: number) {
  const term = `${query} AND ${PUBMED_MIN_YEAR}:3000[pdat] AND Journal Article[pt] NOT Preprint[pt]`;
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=${limit}&term=${encodeURIComponent(term)}`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`PubMed esearch failed: ${searchRes.status}`);
  const searchJson = await searchRes.json();
  const ids: string[] = searchJson.esearchresult?.idlist ?? [];
  if (ids.length === 0) return { count: 0, results: [] };

  const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`;
  const summaryRes = await fetch(summaryUrl);
  if (!summaryRes.ok) throw new Error(`PubMed esummary failed: ${summaryRes.status}`);
  const summaryJson = await summaryRes.json();

  const results = ids.map((id) => {
    const doc = summaryJson.result?.[id];
    if (!doc) return null;
    const doi = doc.articleids?.find((a: { idtype: string }) => a.idtype === 'doi')?.value;
    return {
      pmid: id,
      title: doc.title,
      journal: doc.fulljournalname,
      pubdate: doc.pubdate,
      doi,
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
    };
  }).filter(Boolean);

  return { count: Number(searchJson.esearchresult?.count ?? results.length), results };
}

export const searchPubMed = tool({
  description:
    `Search PubMed for peer-reviewed medical literature published ${PUBMED_MIN_YEAR} or later, to cite external evidence beyond Pathoma/First Aid/qbank. Excludes preprints.`,
  inputSchema: z.object({
    query: z.string().describe('Search terms, e.g. "trigeminal neuralgia multiple sclerosis"'),
    limit: z.number().int().min(1).max(10).default(5),
  }),
  execute: ({ query, limit }) => searchPubMedImpl(query, limit),
});

async function runQbankQuery(
  { subject, system, difficulty, query, limit }:
    { subject?: string; system?: string; difficulty?: string; query?: string; limit: number }
) {
  const { questions, matched } = await queryQuestions({ subject, system, difficulty, query, limit });
  return {
    matched,
    sample: questions.map((q: { subject: string; system: string; difficulty: string; text: string; explanation: string }) => ({
      subject: q.subject,
      system: q.system,
      difficulty: q.difficulty,
      text: query ? q.text : q.text.slice(0, 140),
      // Only surface the explanation for a content search — it's where facts
      // like "TN can be caused by an MS plaque" live, buried past char 140 of
      // the vignette; the metadata-browse path doesn't need it.
      ...(query ? { explanation: q.explanation } : {}),
    })),
  };
}

const QBANK_INPUT = z.object({
  subject: z.string().optional().describe('e.g. "Cardiovascular", "Pharmacology"'),
  system: z.string().optional().describe('e.g. "Cardiovascular", "Renal"'),
  difficulty: z.string().optional().describe('e.g. "EASY", "MEDIUM", "HARD"'),
  query: z.string().optional().describe('Keyword or phrase to search for in question text/explanation, e.g. "trigeminal neuralgia multiple sclerosis"'),
  limit: z.number().int().min(1).max(10).default(5),
});

export const queryQbank = tool({
  description:
    'Look up USMLE quiz questions by subject/system/difficulty, or full-text search question+explanation content with `query` to find facts buried in an explanation.',
  inputSchema: QBANK_INPUT,
  execute: runQbankQuery,
});

// Bridges topic-router's canonical system labels (see canonicalizeSystem) -> the
// qbank `questions.system` vocab. Router output is already canonicalized, so this
// is near-identity — only Hematology and Neurology differ. An unmapped predicted
// system is intentionally absent so the factory leaves `system` undefined rather
// than eq-filtering to zero rows.
const ENRICHED_SYSTEM_TO_QBANK: Record<string, string> = {
  'Neurology': 'Neurology',
  'Cardiovascular': 'Cardiovascular',
  'Endocrine': 'Endocrine',
  'Respiratory': 'Respiratory',
  'Renal': 'Renal',
  'Gastrointestinal': 'Gastrointestinal',
  'Hematology': 'Hematology & Oncology',
  'Immunology': 'Immunology',
  'Infectious Disease': 'Infectious Disease',
  'Musculoskeletal': 'Musculoskeletal',
  'Reproductive': 'Reproductive',
  'Integumentary': 'Integumentary',
};

// Factory variant: defaults `system` to the router-predicted specialty when the
// model omits it, so tool calls come pre-narrowed. Falls back to the plain tool's
// behavior when the prediction can't be mapped to a qbank system.
export function makeQueryQbank(predictedSystem: string | null) {
  const mapped = predictedSystem ? ENRICHED_SYSTEM_TO_QBANK[predictedSystem] : undefined;
  if (!mapped) return queryQbank;
  return tool({
    description: queryQbank.description,
    inputSchema: QBANK_INPUT,
    execute: ({ subject, system, difficulty, query, limit }) =>
      runQbankQuery({ subject, system: system ?? mapped, difficulty, query, limit }),
  });
}

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

export function makeQueryCurriculumProgress(completedBlockIds: string[]) {
  const completed = new Set(completedBlockIds);
  return tool({
    description:
      "Returns the student's personal curriculum progress: percent of study blocks completed, current phase/week, and the next few uncompleted blocks to study. Use this to answer questions like 'what's my progress' or 'what should I study next'.",
    inputSchema: z.object({}),
    execute: async () => {
      const { graph, frequencyStats, systemDiseaseMap } = await analyzeQuestions();
      const curriculum = generateCurriculum(graph, frequencyStats, systemDiseaseMap);

      const allBlocks = curriculum.weeks.flatMap((w) =>
        w.days.flatMap((d) => d.blocks.map((b) => ({ block: b, week: w, day: d }))),
      );
      const totalBlocks = allBlocks.length;
      const completedCount = allBlocks.filter(({ block }) => completed.has(block.id)).length;
      const percentComplete = totalBlocks > 0 ? Math.round((completedCount / totalBlocks) * 100) : 0;

      const nextUncompleted = allBlocks
        .filter(({ block }) => !completed.has(block.id))
        .slice(0, 5)
        .map(({ block, week, day }) => ({
          title: block.title,
          type: block.type,
          topic: block.topic,
          week: week.weekNumber,
          phase: week.phaseLabel,
          date: day.date,
        }));

      const currentWeek = curriculum.weeks.find((w) =>
        w.days.some((d) => d.blocks.some((b) => !completed.has(b.id))),
      ) ?? curriculum.weeks[0];

      return {
        totalBlocks,
        completedBlocks: completedCount,
        percentComplete,
        currentPhase: currentWeek?.phaseLabel ?? null,
        currentWeek: currentWeek?.weekNumber ?? null,
        nextUncompleted,
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
