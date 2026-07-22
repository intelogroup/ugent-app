'use client';

import { ReactNode } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import CleaChat from './CleaChat';
import FloatingAvatar from './FloatingAvatar';
import { WatchProvider } from '@/lib/watch-context';
import { CleaAgentProvider } from '@/lib/clea-agent-context';
import { navigation } from '@/lib/navigation';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const filteredNavigation = navigation.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <WatchProvider>
      <CleaAgentProvider>
        <div className="flow-root min-h-screen overscroll-y-none bg-[radial-gradient(circle_at_12%_8%,rgba(14,116,144,0.10),transparent_28%),radial-gradient(circle_at_88%_4%,rgba(56,189,248,0.08),transparent_24%),#E8EDF2] lg:h-screen lg:overflow-hidden">
          {/* Sidebar: desktop only */}
          <Sidebar
            collapsed={sidebarCollapsed}
            mobileOpen={mobileNavOpen}
            onCollapsedChange={setSidebarCollapsed}
            onMobileClose={() => setMobileNavOpen(false)}
            onSearchOpen={() => setSearchOpen(true)}
          />
          {mobileNavOpen && (
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/20 lg:hidden"
            />
          )}
          {/* Top tabs nav: mobile only */}
          <MobileNav onMenuOpen={() => setMobileNavOpen(true)} onSearchOpen={() => setSearchOpen(true)} />
          <CleaChat />
          <FloatingAvatar />
          {/* Main content: offset by sidebar on md+, with a rounded desktop surface */}
          <main
            className={`min-h-[calc(100vh-3.5rem)] bg-white/72 backdrop-blur-xl transition-[margin] duration-200 lg:my-4 lg:mr-4 lg:h-[calc(100vh-2rem)] lg:min-h-0 lg:overflow-hidden lg:rounded-[28px] lg:border lg:border-white/70 lg:shadow-[0_24px_70px_rgba(51,65,85,0.10)] ${
              sidebarCollapsed ? 'lg:ml-[76px]' : 'lg:ml-[264px]'
            }`}
          >
            <div className="min-h-full px-4 py-5 sm:px-6 lg:h-full lg:overflow-y-auto lg:px-8 lg:py-7">
              {children}
            </div>
          </main>
          {searchOpen && (
            <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/20 px-4 pt-[12vh]" onClick={() => setSearchOpen(false)}>
              <div
                role="dialog"
                aria-label="Search navigation"
                className="w-full max-w-lg overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center gap-3 border-b border-neutral-200 px-4">
                  <MagnifyingGlassIcon className="h-5 w-5 text-neutral-400" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') setSearchOpen(false);
                      if (event.key === 'Enter' && filteredNavigation[0]) {
                        router.push(filteredNavigation[0].href);
                        setSearchOpen(false);
                        setSearchQuery('');
                      }
                    }}
                    placeholder="Search pages"
                    className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
                  />
                  <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-[10px] text-neutral-500">ESC</kbd>
                </div>
                <div className="max-h-72 overflow-y-auto p-2">
                  {filteredNavigation.length > 0 ? filteredNavigation.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                      className="flex items-center rounded-lg px-3 py-2.5 text-sm text-neutral-700 hover:bg-cyan-50 hover:text-[#0E7490]"
                    >
                      {item.name}
                    </Link>
                  )) : (
                    <p className="px-3 py-5 text-center text-sm text-neutral-500">No pages found</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CleaAgentProvider>
    </WatchProvider>
  );
}
