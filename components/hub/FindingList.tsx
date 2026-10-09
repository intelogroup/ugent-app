'use client';

import { useState } from 'react';
import type { CatalogEntry } from '@/lib/hub/catalog';
import type { Pick } from '@/lib/hub/types';
import s from './hub.module.css';

const PAGE = 60;

// How few conditions share a finding: 3 strokes = very specific, 1 = widespread.
const strokes = (df: number) => (df <= 2 ? 3 : df <= 6 ? 2 : 1);

function Tally({ df }: { df: number }) {
  const n = strokes(df);
  return (
    <svg className={s.tally} viewBox="0 0 20 14" role="img" aria-label={`In ${df} ${df === 1 ? 'condition' : 'conditions'}`}>
      <title>{`In ${df} ${df === 1 ? 'condition' : 'conditions'}`}</title>
      <g className={s.stroke} strokeWidth={1.8}>
        {Array.from({ length: n }, (_, i) => <path key={i} d={`M${3 + i * 6} 12L${5 + i * 6} 2`} />)}
      </g>
    </svg>
  );
}

function Mark({ state }: { state?: Pick['state'] }) {
  return (
    <svg className={s.mark} viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity={state ? 0 : 0.45} />
      {state === 'present' && <path className={s.stroke} d="M3 9.5L7.5 14L15.5 3.5" strokeWidth={2.2} />}
      {state === 'absent' && <path d="M3.5 3.5L14.5 14.5M14.5 3.5L3.5 14.5" stroke="var(--red)" strokeWidth="2.2" strokeLinecap="round" />}
    </svg>
  );
}

interface Props {
  entries: CatalogEntry[];
  picks: Pick[];
  query: string;
  heading: string;
  onQuery: (q: string) => void;
  onPick: (id: string) => void;
}

export default function FindingList({ entries, picks, query, heading, onQuery, onPick }: Props) {
  const [limit, setLimit] = useState(PAGE);
  const state = new Map(picks.map((p) => [p.id, p.state]));
  const visible = entries.slice(0, limit);
  return (
    <div>
      <input
        className={s.search}
        type="search"
        value={query}
        onChange={(e) => { onQuery(e.target.value); setLimit(PAGE); }}
        placeholder="Search any finding"
        aria-label="Search any finding across all regions and types"
      />
      <p className={s.listHead} aria-live="polite">{heading}</p>
      {entries.length === 0 ? (
        <p className={s.emptyList}>No findings here. Try another sector or clear the region.</p>
      ) : (
        <ul className={s.list}>
          {visible.map((e) => {
            const st = state.get(e.id);
            return (
              <li key={e.id}>
                <button className={s.item} data-state={st ?? 'none'} onClick={() => onPick(e.id)} aria-label={`${e.label}, ${st ?? 'not picked'}. Click to cycle present, absent, cleared.`}>
                  <Mark state={st} />
                  <span className={s.itemLabel}>{e.label}</span>
                  <Tally df={e.df} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {entries.length > limit && (
        <button className={s.more} onClick={() => setLimit((l) => l + PAGE)}>Show {Math.min(PAGE, entries.length - limit)} more</button>
      )}
    </div>
  );
}
