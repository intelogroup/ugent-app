'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRightIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import DashboardLayout from '@/components/DashboardLayout';
import type { SystemDiseaseGroup } from '@/lib/curriculum/disease-reference';

const INITIAL_VISIBLE_DISEASES = 60;

export default function DiseaseReferencePage() {
  const [data, setData] = useState<SystemDiseaseGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSystem, setSelectedSystem] = useState('');
  const [expandedDiseases, setExpandedDiseases] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_DISEASES);

  useEffect(() => {
    fetch('/api/disease-reference')
      .then(response => response.json())
      .then(json => {
        if (json.error) throw new Error(json.error);
        setData(json);
        setSelectedSystem(json[0]?.system ?? '');
      })
      .catch(cause => setError(cause.message))
      .finally(() => setLoading(false));
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = useMemo(() => data
    .map(system => ({
      ...system,
      diseases: system.diseases.filter(disease =>
        disease.diseaseName.toLowerCase().includes(normalizedSearch) ||
        disease.keySymptoms.some(symptom => symptom.toLowerCase().includes(normalizedSearch)) ||
        disease.discriminators.some(discriminator => discriminator.toLowerCase().includes(normalizedSearch)) ||
        disease.mechanism.toLowerCase().includes(normalizedSearch)
      ),
    }))
    .filter(system => system.diseases.length > 0), [data, normalizedSearch]);

  const activeSystem = filtered.some(system => system.system === selectedSystem)
    ? selectedSystem
    : filtered[0]?.system ?? '';
  const activeGroup = filtered.find(system => system.system === activeSystem);
  const activeQuestionCount = activeGroup?.diseases.reduce((sum, disease) => sum + disease.questionCount, 0) ?? 0;
  const totalDiseases = data.reduce((sum, system) => sum + system.diseases.length, 0);
  const totalQuestions = data.reduce((sum, system) => sum + system.totalQuestions, 0);
  const matchingDiseases = filtered.reduce((sum, system) => sum + system.diseases.length, 0);

  const selectSystem = (system: string) => {
    setSelectedSystem(system);
    setVisibleCount(INITIAL_VISIBLE_DISEASES);
    setExpandedDiseases(new Set());
  };

  const updateSearch = (value: string) => {
    setSearch(value);
    setVisibleCount(INITIAL_VISIBLE_DISEASES);
    setExpandedDiseases(new Set());
  };

  const toggleDisease = (key: string) => {
    setExpandedDiseases(previous => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#0E7490]/25 border-t-[#0E7490]" />
            <p className="text-sm text-neutral-500">Loading disease reference</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <p className="mb-4 text-sm text-red-600">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="workspace-page">
        <header className="workspace-header">
          <div>
            <p className="workspace-eyebrow">Clinical reference</p>
            <h1 className="workspace-title">Disease reference</h1>
            <p className="workspace-subtitle">Find the mechanism, defining findings, and discriminating clues without leaving your study flow.</p>
          </div>
          <div className="flex gap-2 text-xs font-semibold text-neutral-600">
            <span className="rounded-full border border-white/80 bg-white/55 px-3 py-1.5 shadow-sm backdrop-blur-md">{totalDiseases.toLocaleString()} topics</span>
            <span className="hidden rounded-full border border-white/80 bg-white/55 px-3 py-1.5 shadow-sm backdrop-blur-md sm:block">{totalQuestions.toLocaleString()} questions</span>
          </div>
        </header>

        <div className="glass-panel mb-4 rounded-2xl p-2">
          <label className="relative block">
            <span className="sr-only">Search disease reference</span>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              placeholder="Search diseases, symptoms, mechanisms, or discriminators"
              value={search}
              onChange={event => updateSearch(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/80 bg-white/55 pl-9 pr-10 text-sm text-neutral-800 shadow-sm outline-none transition-[background-color,border-color,box-shadow] duration-150 placeholder:text-neutral-400 focus:border-[#0E7490]/30 focus:bg-white/85 focus:shadow-[0_0_0_3px_rgba(14,116,144,0.08)]"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => updateSearch('')}
                className="pressable absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-neutral-400 hover:bg-white hover:text-neutral-700"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </label>
        </div>

        <div className="mb-4 lg:hidden">
          <label htmlFor="disease-system" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">System</label>
          <select
            id="disease-system"
            value={activeSystem}
            onChange={event => selectSystem(event.target.value)}
            className="glass-panel h-11 w-full rounded-xl px-3 text-sm font-semibold text-neutral-800 outline-none"
          >
            {filtered.map(system => (
              <option key={system.system} value={system.system}>{system.system} · {system.diseases.length}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 lg:grid-cols-[248px_minmax(0,1fr)]">
          <aside className="glass-panel hidden self-start overflow-hidden rounded-[22px] lg:block">
            <div className="border-b border-white/80 px-4 py-3.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">Systems</p>
              <p className="mt-1 text-xs text-neutral-500">{filtered.length} with matches</p>
            </div>
            <nav aria-label="Disease systems" className="max-h-[calc(100vh-230px)] overflow-y-auto p-1.5 no-scrollbar">
              {filtered.map(system => {
                const isActive = system.system === activeSystem;
                return (
                  <button
                    key={system.system}
                    type="button"
                    onClick={() => selectSystem(system.system)}
                    className={`pressable flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left ${isActive ? 'bg-white/85 text-neutral-900 shadow-sm' : 'text-neutral-600 hover:bg-white/50 hover:text-neutral-900'}`}
                  >
                    <span className="min-w-0 truncate text-xs font-semibold">{system.system}</span>
                    <span className={`text-[11px] font-semibold ${isActive ? 'text-[#0E7490]' : 'text-neutral-400'}`}>{system.diseases.length}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="glass-panel min-w-0 overflow-hidden rounded-[22px]">
            {activeGroup ? (
              <>
                <div className="flex items-end justify-between gap-4 border-b border-white/80 px-4 py-4 sm:px-5">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold tracking-tight text-neutral-900">{activeGroup.system}</h2>
                    <p className="mt-1 text-xs text-neutral-500">
                      {activeGroup.diseases.length} {normalizedSearch ? 'matching ' : ''}topics · {activeQuestionCount.toLocaleString()} questions
                    </p>
                  </div>
                  {normalizedSearch && <span className="whitespace-nowrap text-xs font-semibold text-[#0E7490]">{matchingDiseases} total matches</span>}
                </div>

                <div className="divide-y divide-white/80">
                  {activeGroup.diseases.slice(0, visibleCount).map(disease => {
                    const key = `${activeGroup.system}::${disease.diseaseName}`;
                    const isExpanded = expandedDiseases.has(key);
                    return (
                      <article key={key}>
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => toggleDisease(key)}
                          className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-white/45 sm:px-5"
                        >
                          <ChevronRightIcon className={`h-3.5 w-3.5 flex-shrink-0 text-neutral-400 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`} />
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800">{disease.diseaseName}</span>
                          {disease.topicType !== 'DISEASE' && (
                            <span className="hidden rounded-md bg-cyan-50/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#0E7490] sm:block">{disease.topicType}</span>
                          )}
                          <span className="min-w-7 rounded-md bg-white/65 px-1.5 py-0.5 text-center text-[11px] font-semibold text-neutral-400">{disease.questionCount}×</span>
                        </button>

                        {isExpanded && (
                          <div className="glass-quiet mx-3 mb-3 rounded-xl p-4 sm:mx-5">
                            {disease.mechanism && (
                              <div className="mb-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">Mechanism</p>
                                <p className="mt-1.5 text-xs leading-5 text-neutral-700">{disease.mechanism}</p>
                              </div>
                            )}
                            <div className="grid gap-4 md:grid-cols-3">
                              <FindingGroup label="Key findings" items={disease.keySymptoms} tone="cyan" />
                              <FindingGroup label="Discriminators" items={disease.discriminators} tone="amber" />
                              <FindingGroup label="High-yield clues" items={disease.highLeverageClues} tone="emerald" />
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

                {activeGroup.diseases.length > visibleCount && (
                  <div className="border-t border-white/80 p-3 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount(count => count + INITIAL_VISIBLE_DISEASES)}
                      className="btn-secondary"
                    >
                      Show {Math.min(INITIAL_VISIBLE_DISEASES, activeGroup.diseases.length - visibleCount)} more
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex min-h-72 flex-col items-center justify-center px-5 text-center">
                <p className="text-sm font-semibold text-neutral-800">No matching topics</p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-neutral-500">Try a disease name, finding, or broader mechanism.</p>
                <button type="button" onClick={() => updateSearch('')} className="btn-secondary mt-5">Clear search</button>
              </div>
            )}
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}

function FindingGroup({ label, items, tone }: { label: string; items: string[]; tone: 'cyan' | 'amber' | 'emerald' }) {
  if (items.length === 0) return null;

  const toneClasses = {
    cyan: 'border-cyan-100/80 bg-cyan-50/65 text-cyan-800',
    amber: 'border-amber-100/80 bg-amber-50/65 text-amber-800',
    emerald: 'border-emerald-100/80 bg-emerald-50/65 text-emerald-800',
  }[tone];

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item, index) => (
          <span key={`${item}-${index}`} className={`rounded-lg border px-2 py-1 text-[11px] leading-4 ${toneClasses}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}
