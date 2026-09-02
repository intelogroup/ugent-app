import { describe, it, expect } from 'vitest';
import { navigation } from '@/lib/navigation';

// Assumption pin: every nav entry must have a unique href, non-empty name,
// valid icon component, and shortName ≤ 10 chars (used in MobileNav pill buttons).

describe('assumption: navigation config contract', () => {
  it('every entry has a unique href', () => {
    const hrefs = navigation.map(n => n.href);
    const unique = new Set(hrefs);
    expect(unique.size).toBe(hrefs.length);
  });

  it('every entry has non-empty name and shortName', () => {
    for (const nav of navigation) {
      expect(nav.name.trim(), `${nav.href} empty name`).toBeTruthy();
      expect(nav.shortName.trim(), `${nav.href} empty shortName`).toBeTruthy();
    }
  });

  it('every entry has a valid icon component (object or function)', () => {
    for (const nav of navigation) {
      const t = typeof nav.icon;
      expect(t === 'function' || t === 'object', `${nav.href} icon is ${t}, not component`).toBe(true);
    }
  });

  it('shortNames are short enough for mobile pill buttons (<= 10 chars)', () => {
    for (const nav of navigation) {
      expect(nav.shortName.length, `${nav.shortName} too long for mobile`).toBeLessThanOrEqual(10);
    }
  });

  it('every href starts with /', () => {
    for (const nav of navigation) {
      expect(nav.href.startsWith('/'), `${nav.href} missing leading slash`).toBe(true);
    }
  });

  it('Dashboard is first (default route)', () => {
    expect(navigation[0].href).toBe('/dashboard');
  });

  it('Settings is last (conventional position)', () => {
    expect(navigation[navigation.length - 1].href).toBe('/settings');
  });

  it('total nav items matches expected count (9)', () => {
    expect(navigation.length).toBe(9);
  });
});
