// Eval harness for lib/topic-router. Replays real enriched questions and scores
// routing several ways. Run: npx tsx scripts/eval-topic-router.ts
//
// Modes:
//   1. diseaseName as utterance      — routing ceiling (exact-name input)
//   2. short templated query         — realistic voice-query shape ("what causes X")
//   3. questionText (full vignette)   — hardest, bag-of-words on long text
// Each scored twice: RAW (exact label match) and CANON (label duplicates
// collapsed, so "Hematologic" == "Hematologic System"), isolating router logic
// from the enriched data's self-inconsistent system vocab. Also reports macro-F1,
// per-tier accuracy, latency, an ablation (phrase-only vs full), and top confusions.
import { readFileSync } from 'fs';
import path from 'path';
import { routeWith, __test, canonicalizeSystem } from '../lib/topic-router';

interface Row { diseaseName: string; system: string; questionText: string }

function loadRows(): Row[] {
  const raw = readFileSync(path.join(process.cwd(), 'data', 'medicospira-enriched.jsonl'), 'utf8');
  const rows: Row[] = [];
  for (const line of raw.trim().split('\n')) {
    if (!line) continue;
    try {
      const e = JSON.parse(line).enriched ?? {};
      if (e.diseaseName && e.system && e.questionText) {
        rows.push({ diseaseName: e.diseaseName, system: e.system, questionText: e.questionText });
      }
    } catch { /* skip malformed */ }
  }
  return rows;
}

// Router output is already canonical (canonicalizeSystem runs at index build);
// apply the same function to ground truth so RAW vs CANON isolates any residual
// label mismatch. Router predictions are passed through unchanged (idempotent).
function canon(sys: string | null): string | null {
  return sys ? canonicalizeSystem(sys) : sys;
}

const TEMPLATES = ['what causes', 'tell me about', 'explain', 'how does', 'workup for'];
function shortQuery(r: Row, i: number): string {
  return `${TEMPLATES[i % TEMPLATES.length]} ${r.diseaseName}`;
}

interface Tally {
  total: number;
  correctRaw: number;
  correctCanon: number;
  byTier: Record<string, { n: number; correct: number }>;
  confusions: Map<string, number>;
  totalMs: number;
  // macro-F1 accumulators (canon space)
  tp: Map<string, number>; fp: Map<string, number>; fn: Map<string, number>;
}

type Index = Awaited<ReturnType<typeof __test.buildIndex>>;

function evalUtterances(index: Index, rows: Row[], pick: (r: Row, i: number) => string, phraseOnly = false): Tally {
  const t: Tally = {
    total: 0, correctRaw: 0, correctCanon: 0, byTier: {}, confusions: new Map(),
    totalMs: 0, tp: new Map(), fp: new Map(), fn: new Map(),
  };
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  rows.forEach((r, i) => {
    const utt = pick(r, i);
    const start = performance.now();
    let route = routeWith(index, utt);
    if (phraseOnly && route.confidence !== 'phrase') route = { system: null, confidence: 'none' };
    t.totalMs += performance.now() - start;
    t.total++;
    const tier = t.byTier[route.confidence] ??= { n: 0, correct: 0 };
    tier.n++;
    if (route.system === r.system) t.correctRaw++;
    const pc = canon(route.system), tc = canon(r.system)!;
    if (pc === tc) { t.correctCanon++; tier.correct++; bump(t.tp, tc); }
    else {
      if (pc) { bump(t.fp, pc); t.confusions.set(`${tc} -> ${pc}`, (t.confusions.get(`${tc} -> ${pc}`) ?? 0) + 1); }
      bump(t.fn, tc);
    }
  });
  return t;
}

function macroF1(t: Tally): number {
  const systems = new Set([...t.tp.keys(), ...t.fp.keys(), ...t.fn.keys()]);
  let sum = 0, n = 0;
  for (const s of systems) {
    const tp = t.tp.get(s) ?? 0, fp = t.fp.get(s) ?? 0, fn = t.fn.get(s) ?? 0;
    const prec = tp + fp ? tp / (tp + fp) : 0;
    const rec = tp + fn ? tp / (tp + fn) : 0;
    sum += prec + rec ? (2 * prec * rec) / (prec + rec) : 0;
    n++;
  }
  return n ? sum / n : 0;
}

function report(label: string, t: Tally) {
  const pct = (a: number, b: number) => (b ? ((a / b) * 100).toFixed(1) : '0.0');
  console.log(`\n=== ${label} ===`);
  console.log(`accuracy RAW:   ${pct(t.correctRaw, t.total)}%  (${t.correctRaw}/${t.total})`);
  console.log(`accuracy CANON: ${pct(t.correctCanon, t.total)}%  (${t.correctCanon}/${t.total})`);
  console.log(`macro-F1 (canon): ${macroF1(t).toFixed(3)}`);
  console.log(`avg latency: ${(t.totalMs / t.total).toFixed(3)} ms/route`);
  console.log('by confidence tier (canon acc):');
  for (const [tier, s] of Object.entries(t.byTier).sort((a, b) => b[1].n - a[1].n)) {
    console.log(`  ${tier.padEnd(6)} n=${String(s.n).padStart(5)}  acc=${pct(s.correct, s.n)}%  (share ${pct(s.n, t.total)}%)`);
  }
  const top = [...t.confusions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (top.length) {
    console.log('top confusions (canon, true -> predicted):');
    for (const [k, n] of top) console.log(`  ${String(n).padStart(4)}  ${k}`);
  }
}

async function main() {
  const rows = loadRows();
  const index = await __test.buildIndex();
  console.log(`rows: ${rows.length} | phrase index: ${index.phrase.size} | token index: ${index.token.size}`);
  report('1. diseaseName as utterance (ceiling)', evalUtterances(index, rows, (r) => r.diseaseName));
  report('2. short templated query (realistic voice)', evalUtterances(index, rows, shortQuery));
  report('3. questionText (full vignette, hardest)', evalUtterances(index, rows, (r) => r.questionText));
  report('4. ablation: phrase-only on short query', evalUtterances(index, rows, shortQuery, true));
}

main();
