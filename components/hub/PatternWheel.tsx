'use client';

import type { FindingType, Pick } from '@/lib/hub/types';
import s from './hub.module.css';

export const SECTORS: { type: FindingType; label: string }[] = [
  { type: 'symptom', label: 'Symptoms' },
  { type: 'sign', label: 'Signs' },
  { type: 'lab', label: 'Labs' },
  { type: 'imaging', label: 'Imaging' },
  { type: 'path', label: 'Path' },
  { type: 'course', label: 'Course' },
  { type: 'size', label: 'Size' },
  { type: 'geography', label: 'Geography' },
];

const STEP = 360 / SECTORS.length;
const C = 160, R_OUT = 150, R_IN = 98;
const pt = (r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};
const sectorPath = (i: number) => {
  const a0 = -90 + i * STEP, a1 = a0 + STEP;
  const [x0, y0] = pt(R_OUT, a0), [x1, y1] = pt(R_OUT, a1), [x2, y2] = pt(R_IN, a1), [x3, y3] = pt(R_IN, a0);
  return `M${x0} ${y0}A${R_OUT} ${R_OUT} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${R_IN} ${R_IN} 0 0 0 ${x3} ${y3}Z`;
};

const MAX_WRITTEN = 6;

interface Props {
  sector: FindingType;
  counts: Record<FindingType, number>;
  picks: Pick[];
  labelOf: (id: string) => string;
  onSector: (t: FindingType) => void;
  onPick: (id: string) => void;
}

export default function PatternWheel({ sector, counts, picks, labelOf, onSector, onPick }: Props) {
  const shown = picks.slice(-MAX_WRITTEN);
  return (
    <div className={s.wheelWrap}>
      <svg className={s.wheelSvg} viewBox="0 0 320 320" role="group" aria-label="Pattern wheel: choose what kind of finding to list">
        <g className={s.stroke}>
          <circle cx={C} cy={C} r={R_OUT} strokeWidth={1.5} />
          <circle cx={C} cy={C} r={R_IN} strokeWidth={1.5} />
          {SECTORS.map((_, i) => {
            const [x1, y1] = pt(R_IN, -90 + i * STEP);
            const [x2, y2] = pt(R_OUT, -90 + i * STEP);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={1.5} />;
          })}
        </g>
        {SECTORS.map((sec, i) => {
          const [lx, ly] = pt((R_IN + R_OUT) / 2, -90 + i * STEP + STEP / 2);
          return (
            <g key={sec.type}>
              <path
                className={s.sector}
                d={sectorPath(i)}
                role="button"
                tabIndex={0}
                aria-pressed={sector === sec.type}
                aria-label={`${sec.label}, ${counts[sec.type]} findings`}
                onClick={() => onSector(sec.type)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSector(sec.type); } }}
              />
              <text className={s.sectorLabel} x={lx} y={ly} textAnchor="middle" dominantBaseline="central">{sec.label}</text>
              <text className={s.sectorCount} x={lx} y={ly + 17} textAnchor="middle">{counts[sec.type]}</text>
            </g>
          );
        })}
      </svg>
      <div className={s.picks} aria-label="Your case">
        {picks.length === 0 && <span className={s.pickEmpty}>Your case. Pick findings below.</span>}
        {picks.length > MAX_WRITTEN && <span className={s.pickMore}>+{picks.length - MAX_WRITTEN} earlier</span>}
        {shown.map((p) => (
          <button
            key={`${p.id}-${p.state}`}
            className={s.pick}
            data-state={p.state}
            onClick={() => onPick(p.id)}
            title={p.state === 'present' ? 'Present. Click to mark absent.' : 'Absent. Click to remove.'}
          >
            {p.state === 'absent' ? 'no ' : ''}{labelOf(p.id)}
          </button>
        ))}
      </div>
    </div>
  );
}
