'use client';

import { inkEllipse, inkPath } from '@/lib/hub/ink';
import { bodyRegions, type BodyView } from '@/lib/hub/regions';
import s from './hub.module.css';

type Pt = [number, number];

// Left half of the outline, neck to crotch. The right half is the mirror image.
const LEFT: Pt[] = [
  [92, 62], [92, 74], [66, 82], [50, 92], [42, 116], [36, 150], [30, 190], [24, 226], [28, 236], [38, 232], [44, 200],
  [52, 156], [62, 122], [66, 160], [68, 200], [68, 244], [72, 300], [74, 334], [72, 392], [60, 408], [82, 412],
  [92, 396], [92, 336], [96, 282], [100, 262],
];
const RIGHT: Pt[] = LEFT.slice(0, -1).reverse().map(([x, y]) => [200 - x, y]);
const OUTLINE: Pt[] = [...LEFT, ...RIGHT];

const CLAVICLES: Pt[] = [[76, 90], [100, 94], [124, 90]];
const SPINE: Pt[] = [[100, 66], [100, 110], [100, 160], [100, 210], [100, 258]];
const SCAPULA_L: Pt[] = [[72, 102], [80, 128], [94, 124]];
const SCAPULA_R: Pt[] = SCAPULA_L.map(([x, y]) => [200 - x, y]);

interface Props {
  view: BodyView;
  region: string | null;
  onRegion: (id: string | null) => void;
}

export default function BodyAvatar({ view, region, onRegion }: Props) {
  const dots = bodyRegions(view);
  return (
    <svg className={s.bodySvg} viewBox="0 0 200 420" role="group" aria-label={`Body, ${view} view. Choose a region to list its findings.`}>
      <g className={s.stroke}>
        <path d={inkEllipse(100, 38, 19, 23, 'head-a', 0.9)} strokeWidth={2.2} />
        <path d={inkEllipse(100, 38, 19.5, 22.5, 'head-b', 1.3)} strokeWidth={1.1} opacity={0.55} />
        <path d={inkPath(OUTLINE, 'body-a', 0.9, false)} strokeWidth={2.2} />
        <path d={inkPath(OUTLINE, 'body-b', 1.4, false)} strokeWidth={1.1} opacity={0.55} />
        {view === 'front' ? (
          <path d={inkPath(CLAVICLES, 'clav', 0.6, false)} strokeWidth={1.4} opacity={0.8} />
        ) : (
          <>
            <path d={inkPath(SPINE, 'spine', 0.8, false)} strokeWidth={1.6} strokeDasharray="2 7" />
            <path d={inkPath(SCAPULA_L, 'sc-l', 0.6, false)} strokeWidth={1.4} opacity={0.8} />
            <path d={inkPath(SCAPULA_R, 'sc-r', 0.6, false)} strokeWidth={1.4} opacity={0.8} />
          </>
        )}
      </g>

      {dots.map((r) => {
        const on = region === r.id;
        const labelRight = r.cx < 70;
        return (
          <g
            key={r.id}
            className={s.dot}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            aria-label={`${r.label}: ${on ? 'showing its findings, activate to clear' : 'show its findings'}`}
            onClick={() => onRegion(on ? null : r.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRegion(on ? null : r.id); }
            }}
          >
            <circle className={s.dotHit} cx={r.cx} cy={r.cy} r={17} />
            <circle className={s.dotCore} cx={r.cx} cy={r.cy} r={5.5} />
            {on && <path className={`${s.ring} ${s.draw}`} pathLength={1} d={inkEllipse(r.cx, r.cy, 11, 11, `ring-${r.id}`, 0.8)} />}
            <text className={s.dotLabel} x={labelRight ? r.cx + 14 : r.cx - 14} y={r.cy - 12} textAnchor={labelRight ? 'start' : 'end'}>
              {r.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
