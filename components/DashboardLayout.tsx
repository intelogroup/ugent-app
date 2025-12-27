'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background-secondary">
      <Sidebar />
      <main className="ml-64 p-10">
        {children}
      </main>
    </div>
  );
}
