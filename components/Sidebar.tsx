'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import {
  HomeIcon,
  PlusCircleIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  TrophyIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CommandLineIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import UgentLogo from './UgentLogo';
import Avatar from './Avatar';

const primaryLinks = [
  { name: 'Overview', href: '/dashboard', icon: HomeIcon },
  { name: 'Create Test', href: '/create-test', icon: PlusCircleIcon },
  { name: 'My Tests', href: '/tests', icon: ClipboardDocumentListIcon },
  { name: 'Curriculum', href: '/curriculum', icon: CalendarDaysIcon },
];

const insightLinks = [
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Strategy Hub', href: '/strategy', icon: AcademicCapIcon },
  { name: 'Disease Reference', href: '/diseases', icon: DocumentTextIcon },
  { name: 'Leaderboard', href: '/leaderboard', icon: TrophyIcon },
];

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onMobileClose: () => void;
  onSearchOpen: () => void;
};

export default function Sidebar({ collapsed, mobileOpen, onCollapsedChange, onMobileClose, onSearchOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#E8EDF2] py-5 transition-[width,padding,transform] duration-200 lg:z-30 ${
        collapsed ? 'w-[76px] px-3' : 'w-[264px] px-4'
      } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
    >
      <div className="flex items-center justify-between pb-5">
        <Link href="/dashboard" className={`flex items-center gap-2.5 ${collapsed ? 'mx-auto' : ''}`} aria-label="Ugent dashboard">
          <UgentLogo className="h-7 w-7" />
          {!collapsed && <span className="text-[28px] font-extrabold leading-none tracking-[-0.03em] text-[#111318]">ugent</span>}
        </Link>
        <button
          type="button"
          aria-label={mobileOpen ? 'Close navigation' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => (mobileOpen ? onMobileClose() : onCollapsedChange(!collapsed))}
          className={`grid h-7 w-7 place-items-center rounded-md border border-[#E0E3EA] bg-white text-[#8B91A1] shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${collapsed ? 'mx-auto' : ''}`}
        >
          {mobileOpen ? <ChevronLeftIcon className="h-3.5 w-3.5" /> : collapsed ? <ChevronRightIcon className="h-3.5 w-3.5" /> : <CommandLineIcon className="h-3.5 w-3.5" />}
        </button>
      </div>

      <label className={`relative block ${collapsed ? 'hidden' : ''}`}>
        <span className="sr-only">Search</span>
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA0AE]" />
        <input
          type="search"
          placeholder="Search"
          readOnly
          onClick={onSearchOpen}
          className="h-10 w-full rounded-lg border border-[#E4E6EC] bg-white px-9 text-sm font-medium text-[#20232B] outline-none transition placeholder:text-[#8F96A6] focus:border-[#C9CEDA] focus:ring-2 focus:ring-[#0E7490]/10"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          <kbd className="rounded-md border border-[#E1E4EA] bg-[#F7F8FA] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[#9AA0AE]">
            ⌘
          </kbd>
          <kbd className="rounded-md border border-[#E1E4EA] bg-[#F7F8FA] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[#9AA0AE]">
            K
          </kbd>
        </span>
      </label>

      <nav className="mt-6 flex-1 overflow-y-auto pr-0.5 no-scrollbar" aria-label="Main navigation">
        {!collapsed && <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9AA0AE]">Study</p>}
        <div className="space-y-1">
          {primaryLinks.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${collapsed ? 'justify-center px-0' : ''} ${
                  active
                    ? 'border border-[#E3E5EC] bg-white text-[#171A21] shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
                    : 'text-[#5E6472] hover:bg-white/80 hover:text-[#252934]'
                }`}
              >
                <item.icon className={`h-4.5 w-4.5 ${active ? 'text-[#0E7490]' : 'text-[#8C93A3]'}`} />
                {!collapsed && <span className="min-w-0 flex-1 truncate">{item.name}</span>}
              </Link>
            );
          })}
        </div>

        <div className="mt-7">
          {!collapsed && <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9AA0AE]">Insights</p>}
          <div className="space-y-1">
            {insightLinks.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${collapsed ? 'justify-center px-0' : ''} ${
                    active
                      ? 'border border-[#E3E5EC] bg-white text-[#171A21] shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
                      : 'text-[#5E6472] hover:bg-white/80 hover:text-[#252934]'
                  }`}
                >
                  <item.icon className={`h-4.5 w-4.5 ${active ? 'text-[#0E7490]' : 'text-[#8C93A3]'}`} />
                  {!collapsed && <span className="min-w-0 flex-1 truncate">{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </div>

        <div className={`mt-7 border-t border-[#E6E8EF] pt-4 ${collapsed ? 'border-transparent' : ''}`}>
          <Link
            href="/settings"
            aria-current={isActive('/settings') ? 'page' : undefined}
            className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${collapsed ? 'justify-center px-0' : ''} ${
              isActive('/settings')
                ? 'border border-[#E3E5EC] bg-white text-[#171A21] shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
                : 'text-[#5E6472] hover:bg-white/80 hover:text-[#252934]'
            }`}
          >
            <Cog6ToothIcon className={`h-4.5 w-4.5 ${isActive('/settings') ? 'text-[#0E7490]' : 'text-[#8C93A3]'}`} />
            {!collapsed && <span className="min-w-0 flex-1 truncate">Settings</span>}
          </Link>
        </div>
      </nav>

      <div className="pt-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={`flex h-14 w-full items-center gap-3 rounded-xl border border-[#E3E5EC] bg-white px-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:bg-[#FBFCFD] ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <div className="relative">
              <Avatar
                size="sm"
                user={user ? { id: user.id, firstName: user.email?.split('@')[0] ?? null, profilePictureUrl: user.user_metadata?.avatar_url ?? null } : null}
              />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#16A34A]" />
            </div>
            {!collapsed && <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-4 text-[#171A21]">{user?.email?.split('@')[0] ?? 'Student'}</p>
              <p className="truncate text-[12px] font-medium leading-4 text-[#7D8492]">{user?.email ?? ''}</p>
            </div>}
            {!collapsed && <ChevronUpIcon
              className={`h-4 w-4 text-[#A0A6B4] transition-transform duration-200 ${
                isUserMenuOpen ? 'rotate-180' : ''
              }`}
            />}
          </button>

          {isUserMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-xl border border-[#E3E5EC] bg-white shadow-lg">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-[#DC2626] hover:bg-red-50"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
