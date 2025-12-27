'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';

export default function Search() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-20">
          <MagnifyingGlassIcon className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Search Questions</h1>
          <p className="text-neutral-600">Find specific questions by topic, keyword, or subject</p>
          <div className="mt-8">
            <input
              type="text"
              placeholder="Search for questions..."
              className="w-full max-w-2xl px-6 py-4 border-2 border-neutral-200 rounded-lg focus:border-primary-500 focus:outline-none text-lg"
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
