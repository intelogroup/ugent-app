import { isContextType } from './context-vocab';
import type { HubIndex } from './rank';
import { findingTags, tagsInRegion, type Region } from './regions';

export interface BrowseRow {
  disease: string;
  /** qbank rows about this disease: how often USMLE tests it */
  yield: number;
}

const MAX_PRIMARY = 2; // only reached on an exact tie for the top count

/** The body site(s) a disease mainly lives in (organ system for findings with no site tag): the most frequent tag among its classic and pathognomonic
 *  findings (all findings when it has none), ignoring course/size/geography and the generic 'systemic' tag unless it
 *  is all there is. Only an exact tie for the top count gives two. A secondary tag does not pull it into a region. */
export function primaryTags(idx: HubIndex, disease: string): string[] {
  const all = [...(idx.diseases.get(disease)?.values() ?? [])].filter((f) => !isContextType(f.type));
  const strong = all.filter((f) => f.weight !== 'common');
  const counts = new Map<string, number>();
  for (const f of strong.length ? strong : all) for (const s of findingTags(f)) counts.set(s, (counts.get(s) || 0) + 1);
  if (counts.size > 1) { counts.delete('systemic'); counts.delete('sys:systemic'); }
  const top = Math.max(0, ...counts.values());
  return [...counts].filter(([, n]) => n === top).map(([s]) => s).sort().slice(0, MAX_PRIMARY);
}

/** Every disease whose primary tags overlap the region, most tested first (ties by name). */
export function diseasesForRegion(idx: HubIndex, region: Region, yieldByDisease: Record<string, number>): BrowseRow[] {
  const rows: BrowseRow[] = [];
  for (const disease of idx.diseases.keys()) {
    if (tagsInRegion(primaryTags(idx, disease), region)) rows.push({ disease, yield: yieldByDisease[disease] ?? 0 });
  }
  return rows.sort((a, b) => b.yield - a.yield || a.disease.localeCompare(b.disease));
}
