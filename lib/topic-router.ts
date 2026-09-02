import { readDataFile } from './data-source';
import { levenshtein } from './asr-correct';

// Deterministic specialty router — proto "Brain 1". Maps a spoken/typed
// utterance to a USMLE system in-process, sub-ms, no LLM. Signal comes from
// data we already enrich: enriched.diseaseName -> enriched.system.
//
// ponytail: two-tier match. Exact disease phrase wins; else stopworded token
// vote. Ceiling is bag-of-words on the token fallback — good enough to prefetch
// RAG while the user is still talking. Upgrade path if misroutes matter: fuzzy
// phrase match (reuse asr-correct's levenshtein) before the token vote.

export interface TopicRoute {
  system: string | null;
  confidence: 'phrase' | 'fuzzy' | 'token' | 'none';
}

// Generic words that appear across many diseases and add no routing signal.
// Fuzzy tier runs only on short (voice-query-length) utterances — see routeWith.
const FUZZY_MAX_WORDS = 6;

const STOP = new Set([
  'syndrome', 'disease', 'disorder', 'system', 'acute', 'chronic',
  'primary', 'secondary', 'deficiency', 'failure', 'infection',
]);

// The enriched data's `system` field is self-inconsistent — 197 raw labels where
// "Hematologic" / "Hematologic System", "Digestive System" / "Gastrointestinal",
// "Nervous System" / "Head and Neck" are the same specialty. Collapse to one
// canonical label at index build so the router never splits votes (or scores
// itself wrong) on a labeling artifact. Eval confirmed this lifts the ceiling
// ~83.6% -> ~86.1%. Canonical forms align with the qbank system vocab so the
// downstream bridge (clea-tools ENRICHED_SYSTEM_TO_QBANK) is near-identity.
const SYSTEM_ALIAS: Record<string, string> = {
  'nervous': 'Neurology', 'neurology': 'Neurology', 'head and neck': 'Neurology',
  'immune': 'Immunology', 'immunology': 'Immunology',
  'hematologic': 'Hematology', 'hematology': 'Hematology',
  'digestive': 'Gastrointestinal', 'gastrointestinal': 'Gastrointestinal',
  'hepatic': 'Gastrointestinal', 'hepatobiliary': 'Gastrointestinal',
  'urinary': 'Renal', 'renal': 'Renal',
  'endocrine/reproductive': 'Endocrine',
};

export function canonicalizeSystem(raw: string): string {
  let k = raw.toLowerCase().trim();
  if (SYSTEM_ALIAS[k]) return SYSTEM_ALIAS[k];
  k = k.replace(/\s+system$/, '').trim(); // "Endocrine System" -> "endocrine"
  if (SYSTEM_ALIAS[k]) return SYSTEM_ALIAS[k];
  k = k.split(/\s*[/,]\s*| and | & /)[0].trim(); // compound -> first segment
  // A compound's first segment can itself end in "System" ("Nervous System,
  // Cardiovascular" -> "nervous system"). The strip above ran only when the
  // WHOLE raw string ended in "system", so a bare aliased segment kept its
  // suffix and title-cased to a non-canonical label. Strip again post-split.
  k = k.replace(/\s+system$/, '').trim();
  if (SYSTEM_ALIAS[k]) return SYSTEM_ALIAS[k];
  return k.replace(/\b\w/g, (c) => c.toUpperCase()); // Title Case fallback
}

interface Index {
  phrase: Map<string, string>; // lowercase diseaseName -> system
  token: Map<string, Record<string, number>>; // token -> {system: votes}
}

let indexPromise: Promise<Index> | null = null;

async function buildIndex(): Promise<Index> {
  const lines = (await readDataFile('medicospira-enriched.jsonl')).trim().split('\n');
  const phrase = new Map<string, string>();
  const token = new Map<string, Record<string, number>>();

  for (const line of lines) {
    if (!line) continue;
    let e: { diseaseName?: string; system?: string };
    try {
      e = JSON.parse(line).enriched ?? {};
    } catch {
      continue;
    }
    const name = e.diseaseName?.toLowerCase();
    const system = e.system ? canonicalizeSystem(e.system) : undefined;
    if (!name || !system) continue;

    phrase.set(name, system);
    for (const w of name.split(/[^a-z]+/)) {
      if (w.length <= 3 || STOP.has(w)) continue;
      const bucket = token.get(w) ?? {};
      bucket[system] = (bucket[system] ?? 0) + 1;
      token.set(w, bucket);
    }
  }
  return { phrase, token };
}

/** Lazily build (and cache) the index, then route one utterance. */
export async function routeTopic(utterance: string): Promise<TopicRoute> {
  indexPromise ??= buildIndex();
  return routeWith(await indexPromise, utterance);
}

// Pure routing step — separated so tests can drive it with a fixed index.
export function routeWith(index: Index, utterance: string): TopicRoute {
  const utt = utterance.toLowerCase();
  const words = utt.split(/[^a-z]+/).filter((w) => w.length > 3);

  for (const [name, system] of index.phrase) {
    if (utt.includes(name)) return { system, confidence: 'phrase' };
  }

  // Fuzzy tier: catch a garbled/partial disease name the exact match missed.
  // ponytail: pruned scan — a phrase only competes if it shares a first char and
  // a within-±2 length with some utterance word, so this is nowhere near
  // O(words·phrases). Widen the prune (or drop to bigrams) only if real misroutes
  // show up in logs. Single-word phrases only; multi-word garble is rare and the
  // token vote already covers it.
  //
  // Gated to short utterances: fuzzy is for terse voice queries ("pheochromositoma"),
  // not free text. Eval (scripts/eval-topic-router.ts) showed it scoring 6.7% on
  // full vignettes — it fires on incidental words and misroutes. On anything longer
  // than a short query, skip it and let phrase+token decide.
  if (words.length <= FUZZY_MAX_WORDS) {
  let bestName: string | null = null;
  let bestDist = Infinity;
  for (const w of words) {
    for (const [name, system] of index.phrase) {
      if (name.includes(' ')) continue;
      if (name[0] !== w[0] || Math.abs(name.length - w.length) > 2) continue;
      const d = levenshtein(w, name);
      if (d < bestDist) { bestDist = d; bestName = system; }
    }
    // Accept a close hit early — dist ≤ 2, tightened to ratio for longer names.
    if (bestName && bestDist <= 2 && bestDist / Math.max(1, w.length) <= 0.34) {
      return { system: bestName, confidence: 'fuzzy' };
    }
    bestName = null; bestDist = Infinity;
  }
  }

  const scores: Record<string, number> = {};
  for (const w of utt.split(/[^a-z]+/)) {
    const bucket = index.token.get(w);
    if (!bucket) continue;
    for (const [s, c] of Object.entries(bucket)) scores[s] = (scores[s] ?? 0) + c;
  }
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return top ? { system: top[0], confidence: 'token' } : { system: null, confidence: 'none' };
}

// Test seam.
export const __test = { buildIndex, STOP };
