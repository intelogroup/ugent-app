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
});
