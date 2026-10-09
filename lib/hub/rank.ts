import type { DiseaseFindings, Finding, FindingWeight, Pick, Ranked } from './types';

export interface HubIndex {
  diseases: Map<string, Map<string, Finding>>; // disease -> finding id -> finding
  idf: Map<string, number>;
  findings: Map<string, Finding>;
  descendants: Map<string, Set<string>>; // finding id -> all subtype ids below it (from deriveParents)
}

const WEIGHT: Record<FindingWeight, number> = { pathognomonic: 3, classic: 1.5, common: 0.5 };
// Credit for matching a picked general finding through a disease's subtype ("Dyspnea" picked, disease has "PND").
const DESCENDANT_FACTOR = 0.7;
const ABSENT_PENALTY = 1.2; // multiplier on the matching present-weight when an absent pick hits a disease finding
// Diseases scoring below this fraction of the leader are not "still in play" (drives the narrowed set).
// It tightens with every present pick, so a longer case gives a shorter list.
export const REMAINING_CUTOFF = 0.35;
const CUTOFF_STEP = 0.1;
const CUTOFF_MAX = 0.65;
export const cutoffFor = (nPresent: number) => Math.min(CUTOFF_MAX, REMAINING_CUTOFF + CUTOFF_STEP * Math.max(0, nPresent - 1));

export function buildIndex(data: DiseaseFindings[], parents: Record<string, string> = {}): HubIndex {
  const diseases = new Map<string, Map<string, Finding>>();
  const findings = new Map<string, Finding>();
  const descendants = new Map<string, Set<string>>();
  const ancestors = (id: string): string[] => {
    const out: string[] = [];
    for (let p = parents[id], guard = 0; p && guard < 10; p = parents[p], guard++) out.push(p);
    return out;
  };
  for (const d of data) {
    const m = new Map<string, Finding>();
    for (const f of d.findings) {
      m.set(f.id, f);
      if (!findings.has(f.id)) findings.set(f.id, f);
    }
    diseases.set(d.disease, m);
  }
  for (const id of findings.keys()) {
    for (const a of ancestors(id)) (descendants.get(a) || descendants.set(a, new Set()).get(a)!).add(id);
  }
  // specificity counts a disease for a finding and for every ancestor of its findings
  const df = new Map<string, number>();
  for (const m of diseases.values()) {
    const ids = new Set<string>();
    for (const id of m.keys()) { ids.add(id); ancestors(id).forEach((a) => ids.add(a)); }
    for (const id of ids) df.set(id, (df.get(id) || 0) + 1);
  }
  const n = diseases.size;
  const idf = new Map<string, number>();
  for (const [id, c] of df) idf.set(id, Math.log(1 + n / c));
  return { diseases, idf, findings, descendants };
}

const value = (idx: HubIndex, f: Finding) => (idx.idf.get(f.id) || 0) * WEIGHT[f.weight];

/** Strongest subtype of `id` that the disease has, if any. */
function bestDescendant(idx: HubIndex, fs: Map<string, Finding>, id: string): Finding | null {
  let best: Finding | null = null;
  for (const d of idx.descendants.get(id) || []) {
    const f = fs.get(d);
    if (f && (!best || WEIGHT[f.weight] > WEIGHT[best.weight])) best = f;
  }
  return best;
}

/** Ranked, not filtered: nothing disappears except when there is no present pick. Contradicted diseases sort last. */
export function rank(idx: HubIndex, picks: Pick[]): Ranked[] {
  const present = picks.filter((p) => p.state === 'present');
  if (!present.length) return [];
  const absent = picks.filter((p) => p.state === 'absent');
  const out: Ranked[] = [];
  for (const [disease, fs] of idx.diseases) {
    let score = 0;
    let matched = 0;
    for (const p of present) {
      const f = fs.get(p.id);
      if (f) { score += value(idx, f); matched++; continue; }
      const sub = bestDescendant(idx, fs, p.id);
      const parent = idx.findings.get(p.id);
      if (sub && parent) { score += value(idx, parent) * DESCENDANT_FACTOR; matched++; } // at the parent's own (lower) weight
    }
    if (!matched) continue;
    let contradicted = false;
    for (const p of absent) {
      const f = fs.get(p.id);
      if (f) {
        score -= value(idx, f) * ABSENT_PENALTY;
        if (f.weight !== 'common') contradicted = true;
        continue;
      }
      const sub = bestDescendant(idx, fs, p.id);
      if (!sub) continue;
      score -= (idx.idf.get(p.id) || 0) * WEIGHT[sub.weight] * DESCENDANT_FACTOR * ABSENT_PENALTY;
      if (sub.weight !== 'common') contradicted = true;
    }
    out.push({ disease, score, matched, contradicted });
  }
  return out.sort((a, b) =>
    Number(a.contradicted) - Number(b.contradicted) || b.score - a.score || a.disease.localeCompare(b.disease));
}

/** Non-contradicted diseases still within the cutoff of the leader (`nPresent` = present picks so far). */
export function remaining(ranked: Ranked[], nPresent = 1): Ranked[] {
  const live = ranked.filter((r) => !r.contradicted);
  if (!live.length) return [];
  const top = live[0].score;
  return live.filter((r) => r.score >= top * cutoffFor(nPresent));
}

// Rivals scoring at least this fraction of the top disease are close enough to need separating.
export const RIVAL_BAND = 0.5;
export const MAX_CO_LEADERS = 3;

export type Leader = Ranked & { proof: string[] };

/** The diagnosis (or 2 to 3 tied diagnoses) the findings commit to; empty when they commit to none.
 *  Needs a directly picked pathognomonic finding. One leader when every close rival lacks a proof pick and has
 *  none of its own. Close rivals that share the proof are co-leaders (up to 3) until a separating finding is
 *  added. Shared non-pathognomonic findings alone never crown anyone. */
export function leaders(idx: HubIndex, ranked: Ranked[], picks: Pick[]): Leader[] {
  const live = ranked.filter((r) => !r.contradicted);
  const top = live[0];
  if (!top) return [];
  const present = picks.filter((p) => p.state === 'present');
  const has = (m: Map<string, Finding>, id: string) => m.has(id) || !!bestDescendant(idx, m, id);
  const proofOf = (d: string) => {
    const fs = idx.diseases.get(d)!;
    return present.filter((p) => fs.get(p.id)?.weight === 'pathognomonic').map((p) => p.id);
  };
  const mk = (r: Ranked): Leader => ({ ...r, proof: proofOf(r.disease).map((id) => idx.findings.get(id)!.label) });
  const topProof = proofOf(top.disease);
  if (!topProof.length) return [];
  const close = live.slice(1).filter((r) => r.score >= top.score * RIVAL_BAND);
  const solo = close.every((r) => {
    const rf = idx.diseases.get(r.disease)!;
    return topProof.some((id) => !has(rf, id)) && !proofOf(r.disease).some((id) => !topProof.includes(id));
  });
  if (solo) return [mk(top)];
  const group = [top, ...close].filter((r) => proofOf(r.disease).length);
  return group.length >= 2 && group.length <= MAX_CO_LEADERS ? group.map(mk) : [];
}

/** Finding (not yet picked) that best halves the top-K set, weighted by specificity. */
export function nextBestFinding(idx: HubIndex, ranked: Ranked[], picks: Pick[], k = 10): Finding | null {
  const pool = remaining(ranked, picks.filter((p) => p.state === 'present').length).slice(0, k);
  if (pool.length < 2) return null;
  const picked = new Set(picks.map((p) => p.id));
  const counts = new Map<string, number>();
  for (const r of pool) {
    for (const id of idx.diseases.get(r.disease)!.keys()) {
      if (!picked.has(id)) counts.set(id, (counts.get(id) || 0) + 1);
    }
  }
  let best: { id: string; s: number } | null = null;
  for (const [id, c] of counts) {
    if (c === pool.length) continue;
    const s = Math.min(c, pool.length - c) * (idx.idf.get(id) || 0);
    if (!best || s > best.s || (s === best.s && id < best.id)) best = { id, s };
  }
  return best ? idx.findings.get(best.id)! : null;
}

export interface Differentiator {
  id: string;
  label: string;
  type: Finding['type'];
  has: string[];
  lacks: string[];
}

/** Findings present in some of the given diseases but not all, most specific first. */
export function differentiators(idx: HubIndex, diseases: string[]): Differentiator[] {
  const sets = diseases.map((d) => ({ d, fs: idx.diseases.get(d)! }));
  const ids = new Set<string>();
  for (const { fs } of sets) for (const id of fs.keys()) ids.add(id);
  const out: Differentiator[] = [];
  for (const id of ids) {
    const has = sets.filter((s) => s.fs.has(id)).map((s) => s.d);
    if (has.length === sets.length) continue;
    const f = idx.findings.get(id)!;
    out.push({ id, label: f.label, type: f.type, has, lacks: diseases.filter((d) => !has.includes(d)) });
  }
  const weight = (x: Differentiator) => (idx.idf.get(x.id) || 0) * WEIGHT[idx.findings.get(x.id)!.weight];
  return out.sort((a, b) => weight(b) - weight(a) || a.id.localeCompare(b.id));
}
