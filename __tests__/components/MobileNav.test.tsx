// __tests__/components/MobileNav.test.tsx
import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import MobileNav from '@/components/MobileNav';

jest.mock('next/navigation', () => ({ usePathname: jest.fn() }));

describe('MobileNav', () => {
  it('renders the current page title', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    render(<MobileNav />);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('opens navigation from the menu button', () => {
    const onMenuOpen = jest.fn();
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    render(<MobileNav onMenuOpen={onMenuOpen} />);
    screen.getByRole('button', { name: 'Open navigation' }).click();
    expect(onMenuOpen).toHaveBeenCalledTimes(1);
  });

  it('opens search from the search button', () => {
    const onSearchOpen = jest.fn();
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    render(<MobileNav onSearchOpen={onSearchOpen} />);
    screen.getByRole('button', { name: 'Search' }).click();
    expect(onSearchOpen).toHaveBeenCalledTimes(1);
  });

  it('has role=navigation and aria-label', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    render(<MobileNav />);
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });
});
