'use client';

import { useMemo } from 'react';
import { inkEllipse } from '@/lib/hub/ink';
import { diseasesForRegion } from '@/lib/hub/browse';
import { differentiators, leaders, type HubIndex } from '@/lib/hub/rank';
import type { Region } from '@/lib/hub/regions';
import type { Finding, Pick, Ranked } from '@/lib/hub/types';
import s from './hub.module.css';

const TOP = 10;
const SHOW_DEAD = 3; // struck-out diseases worth showing: they teach why a classic finding matters
const WEIGHT_ORDER = { pathognomonic: 0, classic: 1, common: 2 } as const;

interface Props {
  idx: HubIndex;
  diseaseParents: Record<string, string>;
  /** body dot currently selected; with no findings picked the sheet lists that region's diseases */
  region: Region | null;
  yieldByDisease: Record<string, number>;
  picks: Pick[];
  ranked: Ranked[];
  inPlay: Ranked[];
  next: Finding | null;
  expanded: string | null;
  labelOf: (id: string) => string;
  onExpand: (disease: string | null) => void;
  onPick: (id: string) => void;
}

function Circled({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <span className={s.diffLabel}>
      <svg className={s.diffCircle} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <path className={s.draw} pathLength={1} d={inkEllipse(50, 20, 48, 17, `circ-${id}`, 1.4)} />
      </svg>
      {children}
    </span>
  );
}

export default function DxSheet({ idx, diseaseParents, region, yieldByDisease, picks, ranked, inPlay, next, expanded, labelOf, onExpand, onPick }: Props) {
  const present = picks.filter((p) => p.state === 'present');
  const live = new Set(inPlay.map((r) => r.disease));
  // "a form of X" note when the parent disease is also on the sheet, so a tie reads as umbrella vs subtype, not two equals
  const browse = useMemo(
    () => (region && present.length === 0 ? diseasesForRegion(idx, region, yieldByDisease) : []),
    [idx, region, yieldByDisease, present.length],
  );
  const onSheet = new Set(browse.length ? browse.map((b) => b.disease) : ranked.map((r) => r.disease));
  const formOf = (d: string) => (diseaseParents[d] && onSheet.has(diseaseParents[d]) ? diseaseParents[d] : null);
  const split = inPlay.length >= 2 && inPlay.length <= 3;
  const tops = useMemo(() => leaders(idx, ranked, picks), [idx, ranked, picks]);
  const topNames = useMemo(() => new Set(tops.map((t) => t.disease)), [tops]);
  const tie = tops.length > 1;
  const tieSplit = useMemo(() => (tie ? differentiators(idx, tops.map((t) => t.disease)).slice(0, 3) : []), [idx, tops, tie]);
  // the list is what is still in play (minus the leader), then a few struck-out ones; weaker matches collapse into a count
  const rows = useMemo(() => {
    const dead = ranked.filter((r) => r.contradicted).slice(0, SHOW_DEAD);
    return [...inPlay.filter((r) => !topNames.has(r.disease)).slice(0, TOP), ...dead];
  }, [ranked, inPlay, topNames]);
  const hidden = ranked.length - inPlay.length - ranked.filter((r) => r.contradicted).length;
  const diffs = useMemo(() => (split ? differentiators(idx, inPlay.map((r) => r.disease)).slice(0, 4) : []), [idx, inPlay, split]);
  const detail = useMemo(() => {
    if (!expanded) return null;
    const fs = idx.diseases.get(expanded);
    if (!fs) return null;
    const clues = [...fs.values()].filter((f) => f.weight !== 'common').sort((a, b) => WEIGHT_ORDER[a.weight] - WEIGHT_ORDER[b.weight] || a.label.localeCompare(b.label)).slice(0, 8);
    const rivals = inPlay.map((r) => r.disease).filter((d) => d !== expanded).slice(0, 2);
    const vs = rivals.length ? differentiators(idx, [expanded, ...rivals]).filter((d) => d.has.includes(expanded)).slice(0, 4) : [];
    return { clues, vs, rivals };
  }, [expanded, idx, inPlay]);

  const detailBlock = detail && (
    <div className={s.detail}>
      <p className={s.detailTitle}>Clues</p>
      {detail.clues.length ? (
        <ul className={s.detailList}>{detail.clues.map((f) => <li key={f.id}>{f.label}</li>)}</ul>
      ) : <p>No strong clues recorded yet.</p>}
      {detail.vs.length > 0 && (
        <>
          <p className={`${s.detailTitle} ${s.sep}`}>Has, unlike {detail.rivals.join(' and ')}</p>
          <ul className={s.detailList}>{detail.vs.map((f) => <li key={f.id}>{f.label}</li>)}</ul>
        </>
      )}
    </div>
  );

  return (
    <div className={s.sheet}>
      <h2 className={s.sheetHead}>Differential</h2>
      {present.length === 0 && region ? (
        <p className={s.summary} aria-live="polite">{browse.length} conditions for {region.label.toLowerCase()}, most tested first. Pick findings to narrow them.</p>
      ) : present.length === 0 ? (
        <p className={s.empty}>Pick findings from the wheel. The list narrows as you add specific ones. It covers {idx.diseases.size} conditions so far, not the whole of medicine.</p>
      ) : ranked.length === 0 ? (
        <p className={s.empty}>None of the {idx.diseases.size} conditions covered so far has these findings together.</p>
      ) : (
        <p className={s.summary} aria-live="polite">{inPlay.length} in play of {ranked.length} that match</p>
      )}

      {tops.length > 0 && (
        <div className={s.verdict} aria-live="polite">
          <p className={s.verdictTag}>{tie ? 'Tied for most likely' : 'Most likely'}</p>
          {tops.map((t) => (
            <div key={t.disease}>
              <button className={s.verdictName} aria-expanded={expanded === t.disease} onClick={() => onExpand(expanded === t.disease ? null : t.disease)}>{t.disease}</button>
              {formOf(t.disease) && <p className={s.verdictWhy}>A form of {formOf(t.disease)}.</p>}
              {expanded === t.disease && detailBlock}
              <p className={s.verdictWhy}>Pathognomonic: {t.proof.join(', ')}. Matches {t.matched} of {present.length} findings.</p>
            </div>
          ))}
          {tie && tieSplit.length > 0 && !(split && diffs.length > 0) && (
            <p className={s.verdictSplit}>
              To separate them, add:{' '}
              {tieSplit.map((d, i) => (
                <span key={d.id}>{i > 0 && ', '}<button onClick={() => onPick(d.id)}>{d.label}</button></span>
              ))}
            </p>
          )}
        </div>
      )}

      {split && diffs.length > 0 && (
        <div className={s.diff}>
          <h3 className={s.diffTitle}>What separates these</h3>
          <ul className={s.rows}>
            {diffs.map((d) => (
              <li key={d.id}>
                <button className={s.diffItem} onClick={() => onPick(d.id)} aria-label={`${d.label}: in ${d.has.join(' and ')}, not in ${d.lacks.join(' and ')}. Click to add as a finding.`}>
                  <Circled id={d.id}>{d.label}</Circled>
                  <span className={s.diffWho}>in {d.has.join(', ')}. Not in {d.lacks.join(', ')}.</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!split && next && inPlay.length > 3 && (
        <p className={s.askNext}>Ask next: <button onClick={() => onPick(next.id)}>{next.label}</button></p>
      )}


      {browse.length > 0 && (
        <ul className={s.rows}>
          {browse.map((b) => (
            <li key={b.disease} className={s.row} data-live="true">
              <button className={s.rowBtn} aria-expanded={expanded === b.disease} onClick={() => onExpand(expanded === b.disease ? null : b.disease)}>
                <span className={s.rowName}>{b.disease}</span>
                {b.yield > 0 && <span className={s.rowScore} title="Questions about this in the bank">{b.yield} q</span>}
              </button>
              {formOf(b.disease) && <p className={s.formNote}>A form of {formOf(b.disease)}.</p>}
              {expanded === b.disease && detailBlock}
            </li>
          ))}
        </ul>
      )}

      <ul className={s.rows}>
        {rows.map((r) => {
          const open = expanded === r.disease;
          const deadBy = r.contradicted ? picks.filter((p) => p.state === 'absent' && idx.diseases.get(r.disease)?.has(p.id)).map((p) => labelOf(p.id)) : [];
          return (
            <li key={r.disease} className={s.row} data-live={live.has(r.disease)} data-dead={r.contradicted}>
              <button className={s.rowBtn} aria-expanded={open} onClick={() => onExpand(open ? null : r.disease)}>
                <span className={s.rowName}>{r.disease}</span>
                <span className={s.rowScore}>{r.matched} of {present.length}</span>
              </button>
              {formOf(r.disease) && <p className={s.formNote}>A form of {formOf(r.disease)}.</p>}
              {deadBy.length > 0 && <p className={s.deadNote}>Usually has {deadBy.join(', ')}, which you marked absent.</p>}
              {open && detailBlock}
            </li>
          );
        })}
      </ul>
      {hidden > 0 && <p className={s.hiddenNote}>{hidden} weaker {hidden === 1 ? 'match is' : 'matches are'} hidden. Add findings to firm this up.</p>}
    </div>
  );
}
