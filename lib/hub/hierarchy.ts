import type { Finding } from './types';

const STOP = new Set(['of', 'the', 'a', 'an', 'in', 'on', 'with', 'and', 'positive', 'present', 'finding', 'findings']);
const stem = (t: string) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t);
const MAX_TOKENS = 8; // subset enumeration is 2^n; longer labels get no parent

// ponytail: same stop/stem rules as scripts/canonicalize-findings.mjs (.mjs cannot import TS); keep in sync
const tokens = (label: string): string[] =>
  [...new Set(label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter((t) => t && !STOP.has(t)).map(stem))].sort();

const direction = (s: string): number => {
  const up = /\b(elevated|increased|high|raised|hyper\w*)\b/i.test(s);
  const down = /\b(low|decreased|reduced|hypo\w*|absent)\b/i.test(s);
  return up === down ? 0 : up ? 1 : -1;
};

/**
 * child id -> parent id. A parent is the existing finding of the same type and direction whose content tokens are the
 * largest strict subset of the child's ("Lower abdominal pain" -> "Abdominal pain", not "Pain"). Deterministic, no LLM.
 */
export function deriveParents(findings: Finding[]): Record<string, string> {
  const byKey = new Map<string, Finding>();
  for (const f of findings) {
    const key = `${f.type}|${tokens(f.label).join(' ')}`;
    if (!byKey.has(key) || f.id < byKey.get(key)!.id) byKey.set(key, f);
  }
  const out: Record<string, string> = {};
  for (const f of byKey.values()) {
    const t = tokens(f.label);
    if (t.length < 2 || t.length > MAX_TOKENS) continue;
    let best: Finding | null = null;
    let bestSize = 0;
    for (let mask = 1; mask < (1 << t.length) - 1; mask++) {
      const sub = t.filter((_, i) => mask & (1 << i));
      const cand = byKey.get(`${f.type}|${sub.join(' ')}`);
      if (!cand || cand.id === f.id || direction(cand.label) !== direction(f.label)) continue;
      if (sub.length > bestSize || (sub.length === bestSize && best && cand.id < best.id)) { best = cand; bestSize = sub.length; }
    }
    if (best) out[f.id] = best.id;
  }
  return out;
}
