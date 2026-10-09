import type { DiseaseFindings, Finding, FindingWeight } from './types';

/** raw finding id -> canonical id + label; built by scripts/canonicalize-findings.mjs into data/finding-canon.json */
export type CanonMap = Record<string, { id: string; label: string }>;

const STRENGTH: Record<FindingWeight, number> = { pathognomonic: 3, classic: 2, common: 1 };

/** Merges synonym findings (per disease and across diseases) onto their canonical id. Pure, does not mutate input. */
export function applyCanon(data: DiseaseFindings[], map: CanonMap): DiseaseFindings[] {
  return data.map((d) => {
    const merged = new Map<string, Finding>();
    for (const f of d.findings) {
      const c = map[f.id];
      const id = c?.id ?? f.id;
      const prev = merged.get(id);
      if (!prev) {
        merged.set(id, { ...f, id, label: c?.label ?? f.label, systems: [...f.systems], sourceHashes: [...f.sourceHashes] });
        continue;
      }
      if (STRENGTH[f.weight] > STRENGTH[prev.weight]) prev.weight = f.weight;
      prev.systems = [...new Set([...prev.systems, ...f.systems])];
      prev.sourceHashes = [...new Set([...prev.sourceHashes, ...f.sourceHashes])];
      if (f.source !== 'knowledge') prev.source = 'notes';
    }
    return { ...d, findings: [...merged.values()] };
  });
}
