import { REGIONS, bodyRegions, findingInRegion, regionById } from '@/lib/hub/regions';
import systems from '@/lib/hub/systems.json';

describe('regions', () => {
  it('ids are unique and each region has systems', () => {
    expect(new Set(REGIONS.map((r) => r.id)).size).toBe(REGIONS.length);
    for (const r of REGIONS) expect(r.systems.length).toBeGreaterThan(0);
  });

  it('every organ system is reachable from at least one region', () => {
    const covered = new Set(REGIONS.flatMap((r) => r.systems));
    expect(systems.filter((s) => !covered.has(s))).toEqual([]);
  });

  it('only declares systems that exist in systems.json', () => {
    const known = new Set(systems);
    expect(REGIONS.flatMap((r) => r.systems).filter((s) => !known.has(s))).toEqual([]);
  });

  it('body dots sit inside the avatar viewBox and are split by view', () => {
    for (const view of ['front', 'back'] as const) {
      const dots = bodyRegions(view);
      expect(dots.length).toBeGreaterThan(0);
      for (const d of dots) {
        expect(d.cx).toBeGreaterThan(0); expect(d.cx).toBeLessThan(200);
        expect(d.cy).toBeGreaterThan(0); expect(d.cy).toBeLessThan(420);
      }
    }
    expect(bodyRegions('front').some((r) => r.id === 'wholebody')).toBe(false);
  });

  it('a finding is in a region when their system sets overlap (PSA under pelvis, not eye pressure)', () => {
    const pelvis = regionById('pelvis')!;
    expect(findingInRegion(['reproductive-male'], pelvis)).toBe(true);
    expect(findingInRegion(['eye'], pelvis)).toBe(false);
    expect(findingInRegion(['eye', 'reproductive-male'], pelvis)).toBe(true);
  });
});
