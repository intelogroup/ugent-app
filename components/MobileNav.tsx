'use client';

import { usePathname } from 'next/navigation';
import { Bars3Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { navigation } from '@/lib/navigation';


export default function MobileNav({ onMenuOpen = () => {}, onSearchOpen = () => {} }: { onMenuOpen?: () => void; onSearchOpen?: () => void }) {
  const pathname = usePathname();
  const currentPage = navigation.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white lg:hidden" role="navigation" aria-label="Main navigation">
      <div className="flex h-14 items-center justify-between px-4">
        <button type="button" onClick={onMenuOpen} aria-label="Open navigation" className="grid h-9 w-9 place-items-center rounded-lg text-neutral-600 hover:bg-neutral-100">
          <Bars3Icon className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold text-neutral-900">{currentPage?.shortName ?? 'Ugent'}</span>
        <button type="button" onClick={onSearchOpen} aria-label="Search" className="grid h-9 w-9 place-items-center rounded-lg text-neutral-600 hover:bg-neutral-100">
          <MagnifyingGlassIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
