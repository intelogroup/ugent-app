// __tests__/components/MobileNav.test.tsx
import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import MobileNav from '@/components/MobileNav';
import { navigation } from '@/lib/navigation';

jest.mock('next/navigation', () => ({ usePathname: jest.fn() }));

describe('MobileNav', () => {
  it('renders all navigation items', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    render(<MobileNav />);
    navigation.forEach(item => {
      expect(screen.getByText(item.shortName)).toBeInTheDocument();
    });
  });

  it('sets aria-current="page" on active tab only', () => {
    (usePathname as jest.Mock).mockReturnValue('/tests');
    render(<MobileNav />);
    const activeLink = screen.getByText('Tests').closest('a');
    expect(activeLink).toHaveAttribute('aria-current', 'page');
    const inactiveLink = screen.getByText('Home').closest('a');
    expect(inactiveLink).not.toHaveAttribute('aria-current');
  });

  it('has role=navigation and aria-label', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    render(<MobileNav />);
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });
});
