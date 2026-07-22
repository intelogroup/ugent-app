'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navigation } from '@/lib/navigation';


export default function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden sticky top-0 z-10 bg-white border-b border-neutral-200" role="navigation" aria-label="Main navigation">
      {/* App header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
        <span className="text-base font-bold text-neutral-900">ugent</span>
      </div>
      {/* Scrollable tabs — scrollbar hidden via .no-scrollbar class in globals.css */}
      <div className="flex overflow-x-auto no-scrollbar">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-[#0E7490] text-[#0E7490] font-semibold'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {item.shortName}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
