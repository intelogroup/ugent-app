import { NextResponse } from 'next/server';
import { readDataFile } from '@/lib/data-source';
import { applyCanon, type CanonMap } from '@/lib/hub/canon';
import { DISEASE_ALIAS, mergeDiseases, subtypeParents } from '@/lib/hub/diseases';
import { deriveParents } from '@/lib/hub/hierarchy';
import type { DiseaseFindings, Finding } from '@/lib/hub/types';

export const dynamic = 'force-dynamic';

export interface HubPayload {
  diseases: DiseaseFindings[];
  parents: Record<string, string>;
  /** subtype disease -> parent disease, both present */
  diseaseParents: Record<string, string>;
  /** disease -> qbank rows about it (how often USMLE tests it); aliases summed onto the canonical name */
  yield: Record<string, number>;
}

let cached: HubPayload | null = null;

async function build(): Promise<HubPayload> {
  const raw: DiseaseFindings[] = (await readDataFile('findings.jsonl'))
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  // course / size / geography findings (scripts/extract-context-findings.mjs): optional, merged by disease name
  try {
    const ctx = new Map<string, Finding[]>();
    for (const l of (await readDataFile('context-findings.jsonl')).split('\n').filter(Boolean)) {
      const r: DiseaseFindings = JSON.parse(l);
      ctx.set(r.disease, r.findings);
    }
    for (const d of raw) d.findings = [...d.findings, ...(ctx.get(d.disease) || [])];
  } catch { /* context file is optional */ }
  let canon: CanonMap = {};
  try { canon = JSON.parse(await readDataFile('finding-canon.json')); } catch { /* canon is optional: unmerged ids still work */ }
  // body sites per finding id (scripts/extract-finding-sites.ts): optional, untagged findings fall back to organ systems
  let sites: Record<string, string[]> = {};
  try { sites = JSON.parse(await readDataFile('finding-sites.json')); } catch { /* sites are optional */ }
  // sourceHashes are not used by the UI: drop them to keep the payload small
  const diseases = mergeDiseases(applyCanon(raw, canon))
    .filter((d) => d.findings.length)
    .map((d) => ({ ...d, findings: d.findings.map((f) => ({ ...f, sourceHashes: [], ...(sites[f.id]?.length ? { sites: sites[f.id] } : {}) })) }));
  const unique = new Map(diseases.flatMap((d) => d.findings).map((f) => [f.id, f]));
  let yieldByDisease: Record<string, number> = {};
  try {
    for (const [name, n] of Object.entries(JSON.parse(await readDataFile('disease-yield.json')) as Record<string, number>)) {
      const canonical = DISEASE_ALIAS[name] ?? name;
      yieldByDisease[canonical] = (yieldByDisease[canonical] || 0) + n;
    }
  } catch { yieldByDisease = {}; /* optional: without it the region list falls back to name order */ }
  return { diseases, yield: yieldByDisease, parents: deriveParents([...unique.values()]), diseaseParents: subtypeParents(diseases.map((d) => d.disease)) };
}

export async function GET() {
  try {
    cached ||= await build();
    return NextResponse.json(cached);
  } catch (err) {
    console.error('[hub] failed to load findings', err);
    return NextResponse.json({ error: 'findings data unavailable' }, { status: 500 });
  }
}
