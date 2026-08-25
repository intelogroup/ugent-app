'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/solid';

interface Filters {
  subjects: string[];
  systems: string[];
  total: number;
}

export default function CreateTest() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(20);

  useEffect(() => {
    fetch('/api/quiz-data?mode=filters')
      .then((res) => res.json())
      .then(setFilters);
  }, []);

  const toggleSubject = (name: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const toggleSystem = (name: string) => {
    setSelectedSystems((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedSubjects.length) params.set('subject', selectedSubjects.join(','));
    if (selectedSystems.length) params.set('system', selectedSystems.join(','));
    params.set('limit', String(questionCount));
    router.push(`/quiz?${params.toString()}`);
  };

  if (!filters) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#0E7490]/25 border-t-[#0E7490]" />
            <p className="text-sm text-neutral-500">Loading question bank</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <form onSubmit={handleCreateTest} className="workspace-page">
        <header className="workspace-header">
          <div>
            <p className="workspace-eyebrow">Question bank</p>
            <h1 className="workspace-title">Build a test</h1>
            <p className="workspace-subtitle">Choose any subjects and systems, or leave both open for a mixed set from {filters.total.toLocaleString()} questions.</p>
          </div>
          <p className="rounded-full border border-white/80 bg-white/55 px-3 py-1.5 text-xs font-semibold text-neutral-600 shadow-sm backdrop-blur-md">
            {selectedSubjects.length + selectedSystems.length} filters selected
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="glass-panel overflow-hidden rounded-[22px]">
            <section className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-neutral-900">Subject</h2>
                  <p className="mt-0.5 text-xs text-neutral-500">Discipline or foundational science</p>
                </div>
                {selectedSubjects.length > 0 && <button type="button" onClick={() => setSelectedSubjects([])} className="pressable rounded-md px-2 py-1 text-xs font-semibold text-[#0E7490] hover:bg-white/70">Clear</button>}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {filters.subjects.map((subject) => {
                    const isSelected = selectedSubjects.includes(subject);
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleSubject(subject)}
                        className={`pressable group flex min-h-11 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold ${
                          isSelected ? 'border-[#0E7490]/40 bg-cyan-50/80 text-[#155E75] shadow-[0_5px_18px_rgba(14,116,144,0.08)]' : 'border-white/80 bg-white/45 text-neutral-700 hover:border-neutral-200 hover:bg-white/80'
                        }`}
                      >
                          <span className={`grid h-4 w-4 flex-shrink-0 place-items-center rounded-[5px] border ${isSelected ? 'border-[#0E7490] bg-[#0E7490]' : 'border-neutral-300 bg-white/60 group-hover:border-neutral-400'}`}>
                            {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                          </span>
                          <span>{subject}</span>
                      </button>
                    );
                  })}
                </div>
            </section>

            <section className="border-t border-white/80 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-neutral-900">Organ system</h2>
                  <p className="mt-0.5 text-xs text-neutral-500">Clinical system focus</p>
                </div>
                {selectedSystems.length > 0 && <button type="button" onClick={() => setSelectedSystems([])} className="pressable rounded-md px-2 py-1 text-xs font-semibold text-[#0E7490] hover:bg-white/70">Clear</button>}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {filters.systems.map((system) => {
                    const isSelected = selectedSystems.includes(system);
                    return (
                      <button
                        key={system}
                        type="button"
                        onClick={() => toggleSystem(system)}
                        className={`pressable group flex min-h-11 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold ${
                          isSelected ? 'border-[#0E7490]/40 bg-cyan-50/80 text-[#155E75] shadow-[0_5px_18px_rgba(14,116,144,0.08)]' : 'border-white/80 bg-white/45 text-neutral-700 hover:border-neutral-200 hover:bg-white/80'
                        }`}
                      >
                          <span className={`grid h-4 w-4 flex-shrink-0 place-items-center rounded-[5px] border ${isSelected ? 'border-[#0E7490] bg-[#0E7490]' : 'border-neutral-300 bg-white/60 group-hover:border-neutral-400'}`}>
                            {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                          </span>
                          <span>{system}</span>
                      </button>
                    );
                  })}
                </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-0 lg:self-start">
            <div className="glass-panel rounded-[22px] p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">Test setup</p>
              <div className="mt-5">
                <label htmlFor="question-count" className="mb-2 block text-xs font-semibold text-neutral-600">Questions</label>
                <div className="flex h-11 items-center rounded-xl border border-white/80 bg-white/55 p-1 shadow-sm">
                  <button type="button" aria-label="Remove one question" onClick={() => setQuestionCount((count) => Math.max(1, count - 1))} className="pressable grid h-9 w-9 place-items-center rounded-lg text-neutral-500 hover:bg-white">
                    <MinusIcon className="h-3.5 w-3.5" />
                  </button>
                  <input
                    id="question-count"
                    type="number"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="min-w-0 flex-1 bg-transparent text-center text-sm font-bold text-neutral-900 outline-none"
                  />
                  <button type="button" aria-label="Add one question" onClick={() => setQuestionCount((count) => Math.min(100, count + 1))} className="pressable grid h-9 w-9 place-items-center rounded-lg text-neutral-500 hover:bg-white">
                    <PlusIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <dl className="my-5 space-y-3 border-y border-white/80 py-4 text-xs">
                <div className="flex items-start justify-between gap-3"><dt className="text-neutral-500">Subject</dt><dd className="max-w-[170px] text-right font-semibold text-neutral-800">{selectedSubjects.length === 0 ? 'Mixed' : selectedSubjects.length === 1 ? selectedSubjects[0] : `${selectedSubjects.length} selected`}</dd></div>
                <div className="flex items-start justify-between gap-3"><dt className="text-neutral-500">System</dt><dd className="max-w-[170px] text-right font-semibold text-neutral-800">{selectedSystems.length === 0 ? 'Mixed' : selectedSystems.length === 1 ? selectedSystems[0] : `${selectedSystems.length} selected`}</dd></div>
                <div className="flex items-center justify-between"><dt className="text-neutral-500">Estimated time</dt><dd className="font-semibold text-neutral-800">{Math.max(1, Math.round(questionCount * 1.5))} min</dd></div>
              </dl>
              <button
                type="submit"
                className="btn-primary flex w-full items-center justify-center py-3 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:shadow-none"
              >
                Start {questionCount}-question test
              </button>
            </div>
          </aside>
        </div>
      </form>
    </DashboardLayout>
  );
}
