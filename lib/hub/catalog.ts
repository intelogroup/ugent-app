import { isContextType } from './context-vocab';
import { findingInRegion, type Region } from './regions';
import type { DiseaseFindings, FindingType } from './types';

export interface CatalogEntry {
  id: string;
  label: string;
  type: FindingType;
  systems: string[];
  /** number of conditions that have this finding directly */
  df: number;
}

export function buildCatalog(data: DiseaseFindings[]): CatalogEntry[] {
  const m = new Map<string, CatalogEntry>();
  for (const d of data) {
    for (const f of d.findings) {
      const e = m.get(f.id);
      if (!e) { m.set(f.id, { id: f.id, label: f.label, type: f.type, systems: [...f.systems], df: 1 }); continue; }
      e.df++;
      for (const s of f.systems) if (!e.systems.includes(s)) e.systems.push(s);
    }
  }
  return [...m.values()];
}

export interface CatalogFilter {
  region?: Region | null;
  type?: FindingType;
  query?: string;
}

/** Browse path: region and sector narrow the list (course/size/geography ignore the region: they describe the case, not a body part). Search path: a query looks across everything. */
export function filterCatalog(catalog: CatalogEntry[], { region, type, query }: CatalogFilter): CatalogEntry[] {
  const q = query?.trim().toLowerCase();
  const hit = q
    ? catalog.filter((c) => c.label.toLowerCase().includes(q))
    : catalog.filter((c) => (!type || c.type === type) && (!region || isContextType(c.type) || findingInRegion(c.systems, region)));
  return hit.sort((a, b) => b.df - a.df || a.label.localeCompare(b.label));
}
