'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  CommandLineIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import UgentLogo from './UgentLogo';
import Avatar from './Avatar';
import AvatarPicker from './AvatarPicker';

const primaryLinks = [
  { name: 'Overview', href: '/dashboard', icon: HomeIcon },
  { name: 'My Tests', href: '/tests', icon: ClipboardDocumentListIcon, count: '6' },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
];

const workspaceLinks = [
  { name: 'Create Test', href: '/create-test', icon: Squares2X2Icon, count: '6', accent: 'bg-[#0E7490]' },
  { name: 'Strategy Hub', href: '/strategy', icon: AcademicCapIcon, count: '4', accent: 'bg-[#F59E0B]' },
  { name: 'Curriculum', href: '/curriculum', icon: CalendarDaysIcon, count: '19', accent: 'bg-[#10B981]' },
  { name: 'Disease Ref', href: '/diseases', icon: DocumentTextIcon, count: '8', accent: 'bg-[#8B5CF6]' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-[292px] flex-col border-r border-[#E6E8EF] bg-[#F7F8FA] px-4 py-5">
      <div className="flex items-center justify-between pb-5">
        <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="Ugent dashboard">
          <UgentLogo className="h-7 w-7" />
          <span className="text-[28px] font-extrabold leading-none tracking-[-0.03em] text-[#111318]">
            ugent
          </span>
        </Link>
        <button
          type="button"
          aria-label="Collapse sidebar"
          className="grid h-7 w-7 place-items-center rounded-md border border-[#E0E3EA] bg-white text-[#8B91A1] shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
        >
          <CommandLineIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <label className="relative block">
        <span className="sr-only">Search</span>
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA0AE]" />
        <input
          type="search"
          placeholder="Search"
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
        <div className="space-y-1">
          {primaryLinks.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
                  active
                    ? 'border border-[#E3E5EC] bg-white text-[#171A21] shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
                    : 'text-[#5E6472] hover:bg-white/80 hover:text-[#252934]'
                }`}
              >
                <item.icon className={`h-4.5 w-4.5 ${active ? 'text-[#0E7490]' : 'text-[#8C93A3]'}`} />
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                {item.count ? (
                  <span className="rounded-md border border-[#E2E5EC] bg-[#F8F9FB] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[#8B91A1]">
                    {item.count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>

        <div className="mt-3">
          <div className="flex h-9 items-center gap-3 px-3 text-sm font-semibold text-[#5E6472]">
            <Squares2X2Icon className="h-4.5 w-4.5 text-[#8C93A3]" />
            <span className="flex-1">Workspace</span>
            <ChevronDownIcon className="h-3.5 w-3.5 text-[#A0A6B4]" />
          </div>
          <div className="ml-4 space-y-1 border-l border-[#E5E7ED] pl-3">
            {workspaceLinks.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
                    active
                      ? 'border border-[#E3E5EC] bg-white text-[#171A21] shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
                      : 'text-[#5E6472] hover:bg-white/80 hover:text-[#252934]'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${item.accent}`} />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="rounded-md border border-[#E2E5EC] bg-[#F8F9FB] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[#8B91A1]">
                    {item.count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <Link
          href="/leaderboard"
          aria-current={isActive('/leaderboard') ? 'page' : undefined}
          className={`mt-3 flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
            isActive('/leaderboard')
              ? 'border border-[#E3E5EC] bg-white text-[#171A21] shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
              : 'text-[#5E6472] hover:bg-white/80 hover:text-[#252934]'
          }`}
        >
          <ChatBubbleLeftRightIcon className={`h-4.5 w-4.5 ${isActive('/leaderboard') ? 'text-[#0E7490]' : 'text-[#8C93A3]'}`} />
          <span className="min-w-0 flex-1 truncate">Leaderboard</span>
          <span className="rounded-md border border-[#E2E5EC] bg-[#F8F9FB] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[#8B91A1]">
            6
          </span>
        </Link>

        <div className="mt-5">
          <div className="flex h-8 items-center justify-between px-3 text-[12px] font-semibold text-[#7C8393]">
            <span>Favourite list</span>
            <ChevronDownIcon className="h-3.5 w-3.5 text-[#A0A6B4]" />
          </div>
          <Link
            href="/settings"
            aria-current={isActive('/settings') ? 'page' : undefined}
            className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
              isActive('/settings')
                ? 'border border-[#E3E5EC] bg-white text-[#171A21] shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
                : 'text-[#5E6472] hover:bg-white/80 hover:text-[#252934]'
            }`}
          >
            <span className="grid h-5 w-5 place-items-center rounded-md bg-white shadow-[inset_0_0_0_1px_#E2E5EC]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
            </span>
            <span className="min-w-0 flex-1 truncate">Settings</span>
            <Cog6ToothIcon className="h-4 w-4 text-[#A0A6B4]" />
          </Link>
        </div>
      </nav>

      <div className="space-y-2.5 pt-4">
        <div className="rounded-xl border border-[#E3E5EC] bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#171A21]">Standard plan</h2>
            <button type="button" aria-label="Dismiss plan card" className="text-[#A1A7B4]">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-[12px] font-medium leading-4 text-[#626978]">
            Increased productivity and organization.
          </p>
          <div className="mt-3 flex items-center justify-between text-[12px] font-bold text-[#20232B]">
            <span>Responses collected</span>
            <span>
              70 <span className="font-semibold text-[#8B91A1]">/100</span>
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EEF0F4]">
            <div className="h-full w-[70%] rounded-full bg-gradient-to-r from-[#16A34A] via-[#F59E0B] to-[#DC2626]" />
          </div>
          <button
            type="button"
            className="mt-3 h-8 w-full rounded-lg border border-[#E2E5EC] bg-white text-[12px] font-bold text-[#2A2E38] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:bg-[#F9FAFB]"
          >
            Upgrade pro
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex h-14 w-full items-center gap-3 rounded-xl border border-[#E3E5EC] bg-white px-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:bg-[#FBFCFD]"
          >
            <div className="relative">
              <Avatar size="sm" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#DC2626]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-4 text-[#171A21]">Kamil Mitek</p>
              <p className="truncate text-[12px] font-medium leading-4 text-[#7D8492]">kamil@creativea.co</p>
            </div>
            <ChevronUpIcon
              className={`h-4 w-4 text-[#A0A6B4] transition-transform duration-200 ${
                isUserMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isUserMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-xl border border-[#E3E5EC] bg-white shadow-lg">
              <AvatarPicker />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
