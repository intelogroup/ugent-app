'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  HomeIcon,
  PlusCircleIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  TrophyIcon,
  BookOpenIcon,
  ArrowRightOnRectangleIcon,
  ChevronUpIcon,
  Cog6ToothIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import UgentLogo from './UgentLogo';
import { createClient } from '@/lib/supabase/client';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Create Test', href: '/create-test', icon: PlusCircleIcon },
  { name: 'My Tests', href: '/tests', icon: ClipboardDocumentListIcon },
  { name: 'AI Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Leaderboard', href: '/leaderboard', icon: TrophyIcon },
  { name: 'Study Notes', href: '/notes', icon: BookOpenIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  { name: 'Pricing', href: '/pricing', icon: CreditCardIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-neutral-200 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-neutral-200">
        <div className="flex items-start gap-3">
          <UgentLogo className="w-[50px] h-[50px] -mt-2" />
          <div className="flex flex-col">
            <h1 className="text-[8px] font-bold text-neutral-900 leading-none">Ugent</h1>
            <p className="text-[10px] text-neutral-500 leading-none mt-1 ml-0.5">Usmle Study Agent</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                ${isActive 
                  ? 'bg-primary-50 text-primary-600 font-medium' 
                  : 'text-neutral-700 hover:bg-neutral-100'
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile with Dropdown */}
      <div className="p-4 border-t border-neutral-200 relative">
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors w-full"
        >
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
            <img
              src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user_metadata?.name || user?.email?.split('@')[0] || 'Medical Student')}&background=ffffff&color=2563eb&size=200&bold=true`}
              alt={user?.user_metadata?.name || 'User'}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-neutral-900 truncate">
              {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-neutral-500">Medical Student</p>
          </div>
          <ChevronUpIcon
            className={`w-5 h-5 text-neutral-400 transition-transform duration-200 ${
              isUserMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isUserMenuOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
