import { inkPath, inkEllipse } from '@/lib/hub/ink';

const PTS: [number, number][] = [[0, 0], [40, 10], [80, 0], [80, 60], [0, 60]];

describe('ink', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    expect(inkPath(PTS, 'a', 1, true)).toBe(inkPath(PTS, 'a', 1, true));
    expect(inkPath(PTS, 'a', 1, true)).not.toBe(inkPath(PTS, 'b', 1, true));
  });

  it('emits a smooth path: M then cubic segments, closed paths end in Z', () => {
    const d = inkPath(PTS, 's', 1, true);
    expect(d.startsWith('M')).toBe(true);
    expect(d).toContain('C');
    expect(d.trim().endsWith('Z')).toBe(true);
    expect(inkPath(PTS, 's', 1, false).trim().endsWith('Z')).toBe(false);
  });

  it('zero amplitude starts exactly on the first point; jitter stays within amp', () => {
    expect(inkPath(PTS, 'x', 0, false).startsWith('M0 0C')).toBe(true);
    const m = /^M(-?[\d.]+) (-?[\d.]+)/.exec(inkPath(PTS, 'x', 1.5, false))!;
    expect(Math.abs(Number(m[1]))).toBeLessThanOrEqual(1.6);
    expect(Math.abs(Number(m[2]))).toBeLessThanOrEqual(1.6);
  });

  it('draws an ellipse as a closed path', () => {
    const d = inkEllipse(50, 50, 30, 20, 'e', 1);
    expect(d.startsWith('M')).toBe(true);
    expect(d.trim().endsWith('Z')).toBe(true);
  });
});
