'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import CleaChat from './CleaChat';
import FloatingAvatar from './FloatingAvatar';
import { WatchProvider } from '@/lib/watch-context';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <WatchProvider>
      <div className="min-h-screen bg-background-secondary">
        {/* Sidebar: desktop only */}
        <Sidebar />
        {/* Top tabs nav: mobile only */}
        <MobileNav />
        <CleaChat />
        <FloatingAvatar />
        {/* Main content: offset by sidebar on md+, no offset on mobile */}
        <main className="md:ml-64 px-4 py-6 md:p-10">
          {children}
        </main>
      </div>
    </WatchProvider>
  );
}
