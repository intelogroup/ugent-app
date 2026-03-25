'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background-secondary">
      {/* Sidebar: desktop only */}
      <Sidebar />
      {/* Top tabs nav: mobile only */}
      <MobileNav />
      {/* Main content: offset by sidebar on md+, no offset on mobile */}
      <main className="md:ml-64 px-4 py-6 md:p-10">
        {children}
      </main>
    </div>
  );
}
