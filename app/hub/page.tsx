'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BodyAvatar from '@/components/hub/BodyAvatar';
import DxSheet from '@/components/hub/DxSheet';
import FindingList from '@/components/hub/FindingList';
import PatternWheel, { SECTORS } from '@/components/hub/PatternWheel';
import s from '@/components/hub/hub.module.css';
import type { HubPayload } from '@/app/api/hub/route';
import { buildCatalog, filterCatalog } from '@/lib/hub/catalog';
import { buildIndex, nextBestFinding, rank, remaining } from '@/lib/hub/rank';
import { regionById, type BodyView } from '@/lib/hub/regions';
import type { FindingType, Pick } from '@/lib/hub/types';

const EMPTY_COUNTS: Record<FindingType, number> = { symptom: 0, sign: 0, lab: 0, imaging: 0, path: 0, course: 0, size: 0, geography: 0 };

export default function HubPage() {
  const [data, setData] = useState<HubPayload | null>(null);
  const [error, setError] = useState(false);
  const [view, setView] = useState<BodyView>('front');
  const [regionId, setRegionId] = useState<string | null>(null);
  const [sector, setSector] = useState<FindingType>('symptom');
  const [query, setQuery] = useState('');
  const [picks, setPicks] = useState<Pick[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<'findings' | 'dx'>('findings');

  const load = useCallback(() => {
    setError(false);
    fetch('/api/hub')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setData)
      .catch(() => setError(true));
  }, []);
  useEffect(load, [load]);

  const catalog = useMemo(() => (data ? buildCatalog(data.diseases) : []), [data]);
  const labels = useMemo(() => new Map(catalog.map((c) => [c.id, c.label])), [catalog]);
  const idx = useMemo(() => (data ? buildIndex(data.diseases, data.parents) : null), [data]);

  const region = regionId ? regionById(regionId) ?? null : null;
  const entries = useMemo(() => filterCatalog(catalog, { region, type: sector, query }), [catalog, region, sector, query]);
  const counts = useMemo(() => {
    const c = { ...EMPTY_COUNTS };
    const base = filterCatalog(catalog, { region });
    for (const e of base) c[e.type]++;
    return c;
  }, [catalog, region]);

  const ranked = useMemo(() => (idx ? rank(idx, picks) : []), [idx, picks]);
  const inPlay = useMemo(() => remaining(ranked, picks.filter((p) => p.state === 'present').length), [ranked, picks]);
  const next = useMemo(() => (idx ? nextBestFinding(idx, ranked, picks) : null), [idx, ranked, picks]);

  // none -> present -> absent -> cleared
  const togglePick = useCallback((id: string) => {
    setPicks((cur) => {
      const p = cur.find((x) => x.id === id);
      if (!p) return [...cur, { id, state: 'present' }];
      if (p.state === 'present') return cur.map((x) => (x.id === id ? { id, state: 'absent' } : x));
      return cur.filter((x) => x.id !== id);
    });
  }, []);

  const labelOf = useCallback((id: string) => labels.get(id) ?? id, [labels]);
  const heading = query.trim()
    ? `${entries.length} matching, across everything`
    : `${entries.length} ${SECTORS.find((x) => x.type === sector)!.label.toLowerCase()}${region ? ` for ${region.label.toLowerCase()}` : ', all regions'}`;

  return (
    <DashboardLayout>
      <div className={s.root}>
        <div className={s.top}>
          <h1 className={s.title}>Body hub</h1>
          <p className={s.note}>Pick findings, mark what is absent, and watch the differential narrow.</p>
          <div className={s.topActions}>
            <button className={s.link} aria-pressed={view === 'front'} onClick={() => setView('front')}>Front</button>
            <button className={s.link} aria-pressed={view === 'back'} onClick={() => setView('back')}>Back</button>
            <button className={s.link} disabled={picks.length === 0} onClick={() => { setPicks([]); setExpanded(null); }}>Clear case</button>
          </div>
        </div>

        {error ? (
          <p className={s.err}>The findings data did not load. <button className={s.link} onClick={load}>Try again</button></p>
        ) : !idx ? (
          <p className={s.err} aria-live="polite">Loading findings.</p>
        ) : (
          <>
            <div className={s.tabs} role="tablist">
              <button className={s.tab} role="tab" aria-selected={tab === 'findings'} onClick={() => setTab('findings')}>Findings{picks.length ? ` (${picks.length})` : ''}</button>
              <button className={s.tab} role="tab" aria-selected={tab === 'dx'} onClick={() => setTab('dx')}>Diagnoses{ranked.length ? ` (${inPlay.length})` : ''}</button>
            </div>
            <div className={s.grid}>
              <section className={s.findingsCol} data-active={tab === 'findings'} aria-label="Findings">
                <PatternWheel sector={sector} counts={counts} picks={picks} labelOf={labelOf} onSector={(t) => { setSector(t); setQuery(''); }} onPick={togglePick} />
                <FindingList entries={entries} picks={picks} query={query} heading={heading} onQuery={setQuery} onPick={togglePick} />
              </section>

              <div className={s.bodyCol}>
                <BodyAvatar view={view} region={regionId} onRegion={(id) => { setRegionId(id); setQuery(''); }} />
                <button className={s.whole} aria-pressed={regionId === 'wholebody'} onClick={() => { setRegionId(regionId === 'wholebody' ? null : 'wholebody'); setQuery(''); }}>
                  Whole body
                </button>
              </div>

              <section className={s.dxCol} data-active={tab === 'dx'} aria-label="Diagnoses">
                <DxSheet idx={idx} picks={picks} ranked={ranked} inPlay={inPlay} next={next} expanded={expanded} labelOf={labelOf} onExpand={setExpanded} onPick={togglePick} />
              </section>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
