'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { BookOpenIcon } from '@heroicons/react/24/solid';

export default function Notes() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-20">
          <BookOpenIcon className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Study Notes</h1>
          <p className="text-neutral-600">Create and organize your personal study notes</p>
          <button className="btn-primary mt-8">
            Create New Note
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
