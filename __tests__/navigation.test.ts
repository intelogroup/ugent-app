import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { navigation } from '@/lib/navigation';

describe('navigation config', () => {
  it('uses unique href values', () => {
    const hrefs = navigation.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('includes the core dashboard entry', () => {
    expect(navigation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Dashboard',
          shortName: 'Home',
          href: '/dashboard',
        }),
      ])
    );
  });

  // Assumption pin: every nav href must resolve to a real app route. A
  // deleted page (the repo has a history of ~35 orphaned routes) leaves a
  // dead sidebar/topbar link that 404s until caught.
  it('every href resolves to an actual app route', () => {
    const cwd = process.cwd();
    const badPaths = navigation
      .map((item) => item.href)
      .filter((href) => {
        if (href === '/') return !existsSync(join(cwd, 'app', 'page.tsx'));
        return !existsSync(join(cwd, 'app', href.slice(1), 'page.tsx'));
      });
    expect(badPaths).toEqual([]);
  });
});
