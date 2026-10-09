import { REGIONS, bodyDots, disabledFor, dotAt, findingInRegion, regionById } from '@/lib/hub/regions';
import { SITES } from '@/lib/hub/sites';
import systems from '@/lib/hub/systems.json';

describe('regions', () => {
  it('ids are unique and each region lists a site', () => {
    expect(new Set(REGIONS.map((r) => r.id)).size).toBe(REGIONS.length);
    for (const r of REGIONS) expect(r.sites.length).toBeGreaterThan(0);
  });

  it('every body site and every organ system is reachable from some region', () => {
    const sites = new Set(REGIONS.flatMap((r) => r.sites));
    const covered = new Set(REGIONS.flatMap((r) => r.systems));
    expect(SITES.filter((s) => !sites.has(s))).toEqual([]);
    expect(systems.filter((s) => !covered.has(s))).toEqual([]);
  });

  it('only declares sites and systems that exist', () => {
    const known = new Set(systems);
    expect(REGIONS.flatMap((r) => r.systems).filter((s) => !known.has(s))).toEqual([]);
    expect(REGIONS.flatMap((r) => r.sites).filter((s) => !(SITES as readonly string[]).includes(s))).toEqual([]);
  });

  it('dots sit inside the body art and live dots never crowd each other, on either body', () => {
    for (const sex of ['male', 'female'] as const) {
      const pts = bodyDots.filter((r) => !disabledFor(r, sex)).map((r) => ({ id: r.id, p: dotAt(r, sex) }));
      for (const { p } of pts) {
        expect(p[0]).toBeGreaterThan(0); expect(p[0]).toBeLessThan(106);
        expect(p[1]).toBeGreaterThan(0); expect(p[1]).toBeLessThan(195);
      }
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].p[0] - pts[j].p[0], pts[i].p[1] - pts[j].p[1]);
        expect({ pair: `${pts[i].id}/${pts[j].id}`, ok: d >= 4.4 }).toEqual({ pair: `${pts[i].id}/${pts[j].id}`, ok: true });
      }
    }
    expect(bodyDots.some((r) => r.id === 'wholebody')).toBe(false);
  });

  it('sex-specific dots are disabled on the other body and live on their own', () => {
    expect(disabledFor(regionById('cervix')!, 'male')).toBe(true);
    expect(disabledFor(regionById('cervix')!, 'female')).toBe(false);
    expect(disabledFor(regionById('prostate')!, 'female')).toBe(true);
    expect(disabledFor(regionById('prostate')!, 'male')).toBe(false);
    expect(disabledFor(regionById('knee')!, 'male')).toBe(false);
  });

  it('sites decide when tagged: a knee finding is not in heart, even if its system is cardiovascular', () => {
    const f = { systems: ['cardiovascular'], sites: ['knee'] };
    expect(findingInRegion(f, regionById('knee')!)).toBe(true);
    expect(findingInRegion(f, regionById('heart')!)).toBe(false);
  });

  it('untagged findings fall back to organ systems (PSA under prostate, not eye pressure)', () => {
    const prostate = regionById('prostate')!;
    expect(findingInRegion({ systems: ['reproductive-male'] }, prostate)).toBe(true);
    expect(findingInRegion({ systems: ['eye'] }, prostate)).toBe(false);
    expect(findingInRegion({ systems: ['eye'], sites: [] }, regionById('eye')!)).toBe(true);
  });

  it('left and right lung dots share the unsided lung list', () => {
    const f = { systems: ['respiratory'], sites: ['lung'] };
    expect(findingInRegion(f, regionById('lung-left')!)).toBe(true);
    expect(findingInRegion(f, regionById('lung-right')!)).toBe(true);
    expect(findingInRegion({ systems: [], sites: ['lung-right'] }, regionById('lung-left')!)).toBe(false);
  });
});
