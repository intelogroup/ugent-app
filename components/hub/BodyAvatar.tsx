'use client';

import { BODY_ART } from '@/components/hub/body/body-art.generated';
import { DRAWN } from '@/components/hub/body/organs';
import { bodyDots, disabledFor, dotAt, regionById, type Sex } from '@/lib/hub/regions';
import s from './hub.module.css';

const PAD_X = 24; // room for the arms' dots and the hover labels
const DOT_R = 1.25;

interface Props {
  sex: Sex;
  region: string | null;
  onRegion: (id: string | null) => void;
}

export default function BodyAvatar({ sex, region, onRegion }: Props) {
  const art = BODY_ART[sex];
  const [w, h] = art.viewBox;
  const lit = new Set(region ? regionById(region)?.organs ?? [] : []);
  return (
    <svg className={s.bodySvg} viewBox={`${-PAD_X} -2 ${w + PAD_X * 2} ${h + 4}`} role="group" aria-label={`${sex === 'male' ? 'Male' : 'Female'} body. Choose a region to list its findings.`}>
      <g className={s.bodyLine} dangerouslySetInnerHTML={{ __html: art.outline }} />
      {Object.entries(art.organs).map(([key, o]) => (
        <g key={key} className={s.organ} data-lit={lit.has(key)} dangerouslySetInnerHTML={{ __html: o.markup }} />
      ))}
      {Object.entries(DRAWN).filter(([, o]) => !o.sex || o.sex === sex).map(([key, o]) => (
        <path key={key} className={o.line ? s.organLine : s.organ} data-lit={lit.has(key.replace(/-f$/, ''))} d={o.d} />
      ))}

      {[...bodyDots].sort((a, b) => Number(disabledFor(b, sex)) - Number(disabledFor(a, sex))).map((r) => { // faint dots first, so they sit under live ones
        const on = region === r.id;
        const off = disabledFor(r, sex);
        const [x, y] = dotAt(r, sex);
        const labelLeft = x < w / 2 - 1;
        return (
          <g
            key={r.id}
            className={s.dot}
            role="button"
            tabIndex={off ? -1 : 0}
            aria-pressed={on}
            aria-disabled={off}
            data-disabled={off}
            aria-label={off ? `${r.label}: not on the ${sex} body` : `${r.label}: ${on ? 'showing its findings, activate to clear' : 'show its findings'}`}
            onClick={() => { if (!off) onRegion(on ? null : r.id); }}
            onKeyDown={(e) => {
              if (!off && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onRegion(on ? null : r.id); }
            }}
          >
            <circle className={s.dotHit} cx={x} cy={y} r={2.8} />
            <circle className={s.dotCore} cx={x} cy={y} r={on ? 2.2 : DOT_R} />
            <text className={s.dotLabel} x={labelLeft ? x - 3.6 : x + 3.6} y={y + 0.9} textAnchor={labelLeft ? 'end' : 'start'}>
              {r.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
