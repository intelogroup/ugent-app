'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import type { Curriculum, StudyWeek } from '@/lib/curriculum/types';

const PHASE_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  FOUNDATIONS: { color: 'text-[#0E7490]', bg: 'bg-[#ECFEFF]', border: 'border-[#0E7490]/30', label: 'Foundations' },
  ORGAN_SYSTEMS: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Organ Systems' },
  INTEGRATION: { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Integration' },
  FINAL_REVIEW: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Final Review' },
};

function formatTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export default function CurriculumPage() {
  const [data, setData] = useState<Curriculum | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [completedBlocks, setCompletedBlocks] = useState<Set<string>>(new Set());
  const [activePhase, setActivePhase] = useState<string>('FOUNDATIONS');
  const [sortAlpha, setSortAlpha] = useState(true);

  useEffect(() => {
    fetch('/api/curriculum-progress')
      .then(r => r.json())
      .then(json => {
        if (Array.isArray(json.blockIds)) setCompletedBlocks(new Set(json.blockIds));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/curriculum')
      .then(r => r.json())
      .then(json => {
        if (json.error) throw new Error(json.error);
        setData(json.curriculum);
        if (json.curriculum?.weeks?.length > 0) {
          setExpandedWeeks(new Set([json.curriculum.weeks[0].weekNumber]));
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleWeek = (weekNum: number) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekNum)) next.delete(weekNum);
      else next.add(weekNum);
      return next;
    });
  };

  const toggleDay = (dayKey: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayKey)) next.delete(dayKey);
      else next.add(dayKey);
      return next;
    });
  };

  const toggleBlock = (blockId: string) => {
    const nowCompleting = !completedBlocks.has(blockId);
    setCompletedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
    fetch('/api/curriculum-progress', {
      method: nowCompleting ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockId }),
    }).catch(() => {});
  };

  const toggleAllDaysInWeek = (week: StudyWeek) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      const allExpanded = week.days.every(d => next.has(`${d.date}-${week.weekNumber}`));
      for (const d of week.days) {
        const key = `${d.date}-${week.weekNumber}`;
        if (allExpanded) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  };

  const getWeekProgress = (week: StudyWeek) => {
    let total = 0;
    let done = 0;
    for (const d of week.days) {
      for (const b of d.blocks) {
        total++;
        if (completedBlocks.has(b.id)) done++;
      }
    }
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  };

  const getOverallProgress = () => {
    if (!data) return 0;
    let total = 0;
    let done = 0;
    for (const w of data.weeks) {
      for (const d of w.days) {
        for (const b of d.blocks) {
          total++;
          if (completedBlocks.has(b.id)) done++;
        }
      }
    }
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  const scrollToPhase = (phase: string) => {
    setActivePhase(phase);
    const el = document.getElementById(`phase-${phase}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-600/25 border-t-primary-600" />
          <span className="ml-3 text-sm text-neutral-500">Building your curriculum</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-red-600 mb-4">{error || 'Failed to load curriculum'}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
        </div>
      </DashboardLayout>
    );
  }

  const phases = ['FOUNDATIONS', 'ORGAN_SYSTEMS', 'INTEGRATION', 'FINAL_REVIEW'] as const;
  const overallProgress = getOverallProgress();

  return (
    <DashboardLayout>
      <div className="workspace-page max-w-[1040px]">
        <header className="workspace-header">
          <div>
            <p className="workspace-eyebrow">Study plan</p>
            <h1 className="workspace-title">Curriculum</h1>
            <p className="workspace-subtitle">{data.startDate} to {data.examDate} · {data.totalDays} days · {data.totalHours} planned hours</p>
          </div>
          <p className="rounded-full border border-white/80 bg-white/55 px-3 py-1.5 text-xs font-semibold text-neutral-600 shadow-sm backdrop-blur-md">6 study days / week</p>
        </header>

        <section className="glass-panel mb-5 overflow-hidden rounded-[22px]">
          <div className="p-5">
            <div className="mb-2.5 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-neutral-800">Overall progress</span>
              <span className="text-2xl font-bold tracking-tight text-neutral-900">{overallProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200/70">
            <div
              className="h-full rounded-full bg-primary-600 transition-[width] duration-200"
              style={{ width: `${overallProgress}%` }}
            />
            </div>
            <p className="mt-2 text-xs text-neutral-500">Exam date: {data.examDate}</p>
          </div>
          <dl className="grid grid-cols-2 border-t border-white/80 sm:grid-cols-4">
            {[
              ['Questions', data.overview.totalQuestions],
              ['Topics', data.overview.totalTopics],
              ['Weeks', data.weeks.length],
              ['Prerequisite layers', data.overview.dependencyDepth],
            ].map(([label, value], index) => (
              <div key={label} className={`px-5 py-3.5 ${index % 2 ? 'border-l border-white/80' : ''} ${index > 1 ? 'border-t border-white/80 sm:border-t-0' : ''} ${index > 0 ? 'sm:border-l sm:border-white/80' : ''}`}>
                <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">{label}</dt>
                <dd className="mt-0.5 text-lg font-bold tracking-tight text-neutral-900">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <nav aria-label="Curriculum phases" className="glass-panel mb-5 flex gap-1 overflow-x-auto rounded-2xl p-1.5 no-scrollbar">
          {phases.map(phase => {
            const cfg = PHASE_CONFIG[phase];
            const phaseWeeks = data.weeks.filter(w => w.phase === phase);
            const phaseBlockCount = phaseWeeks.reduce((s, w) => s + w.days.reduce((sd, d) => sd + d.blocks.length, 0), 0);
            const phaseDone = phaseWeeks.reduce((s, w) =>
              s + w.days.reduce((sd, d) =>
                sd + d.blocks.filter(b => completedBlocks.has(b.id)).length, 0
              ), 0
            );
            const phasePct = phaseBlockCount > 0 ? Math.round((phaseDone / phaseBlockCount) * 100) : 0;

            return (
              <button
                key={phase}
                onClick={() => scrollToPhase(phase)}
                className={`pressable flex-shrink-0 rounded-xl border px-3.5 py-2 text-left text-xs font-semibold ${
                  activePhase === phase
                    ? `${cfg.bg} ${cfg.color} border-white/80 shadow-sm`
                    : 'border-transparent text-neutral-500 hover:bg-white/55 hover:text-neutral-800'
                }`}
              >
                <span>{cfg.label}</span>
                <span className="ml-2 opacity-60">{phasePct}%</span>
              </button>
            );
          })}
        </nav>

        <details className="glass-panel group mb-6 rounded-2xl px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-neutral-700 marker:text-neutral-400">High-yield conditions <span className="ml-1 text-xs font-normal text-neutral-400">({data.overview.topDiseases.length})</span></summary>
          <div className="mb-2 mt-3 flex items-center gap-2">
            <button
              onClick={() => setSortAlpha(d => !d)}
              className="pressable rounded-lg border border-white/80 bg-white/55 px-2.5 py-1 text-xs font-semibold text-primary-600 hover:bg-white"
            >
              Sort: {sortAlpha ? 'A-Z' : 'Frequency'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...data.overview.topDiseases]
              .sort((a, b) => sortAlpha ? a.name.localeCompare(b.name) : b.count - a.count)
              .map(d => (
              <span key={d.name} className="rounded-lg border border-white/70 bg-white/45 px-2 py-1 text-xs text-neutral-600">
                {d.name} ({d.count}x)
              </span>
            ))}
          </div>
        </details>

        {/* === TIMELINE === */}
        {phases.map(phase => {
          const phaseWeeks = data.weeks.filter(w => w.phase === phase);
          if (phaseWeeks.length === 0) return null;
          const cfg = PHASE_CONFIG[phase];

          return (
            <section key={phase} id={`phase-${phase}`} className="mb-7 scroll-mt-4">
              <div className="mb-3 flex items-baseline justify-between px-1">
                <h2 className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</h2>
                <span className="text-xs text-neutral-400">{phaseWeeks.length} {phaseWeeks.length === 1 ? 'week' : 'weeks'}</span>
              </div>

              {phaseWeeks.map(week => {
                const isExpanded = expandedWeeks.has(week.weekNumber);
                const progress = getWeekProgress(week);
                const allDaysExpanded = week.days.every(d => expandedDays.has(`${d.date}-${week.weekNumber}`));

                return (
                  <article key={week.weekNumber} className={`glass-panel mb-2 overflow-hidden rounded-2xl border-l-2 ${cfg.border}`}>
                    {/* Week header */}
                    <button
                      onClick={() => toggleWeek(week.weekNumber)}
                      className="pressable w-full px-4 py-3 text-left hover:bg-white/45"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <span aria-hidden="true" className={`text-lg leading-none text-neutral-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                            ›
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-neutral-900">
                              Week {week.weekNumber}: {week.phaseLabel}
                            </p>
                            <p className="mt-0.5 text-[11px] text-neutral-500">
                              {week.startDate} – {week.endDate} · {formatTime(week.totalMinutes)} · {week.days.length} days
                            </p>
                          </div>
                        </div>
                        <div className="ml-3 flex flex-shrink-0 items-center gap-2.5">
                          <span className="text-xs font-semibold text-neutral-500">{progress.pct}%</span>
                          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-neutral-200/70">
                            <div className="h-full rounded-full bg-primary-600" style={{ width: `${progress.pct}%` }} />
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Expanded week content */}
                    {isExpanded && (
                      <div className="border-t border-white/80 px-3 py-2.5 sm:px-4">
                        <div className="mb-1 flex justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleAllDaysInWeek(week); }}
                            className="pressable rounded-md px-2 py-1 text-[11px] font-semibold text-primary-600 hover:bg-white/60"
                          >
                            {allDaysExpanded ? 'Collapse all days' : 'Expand all days'}
                          </button>
                        </div>

                        {week.days.map((day) => {
                          const dayKey = `${day.date}-${week.weekNumber}`;
                          const isDayExpanded = expandedDays.has(dayKey);
                          const dayDone = day.blocks.filter(b => completedBlocks.has(b.id)).length;

                          return (
                            <div key={dayKey} className="last:mb-0">
                              {/* Day header */}
                              <button
                                onClick={() => toggleDay(dayKey)}
                                className="pressable flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-white/45"
                              >
                                <span aria-hidden="true" className={`text-base leading-none text-neutral-400 transition-transform duration-200 ${isDayExpanded ? 'rotate-90' : ''}`}>›</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-neutral-700">
                                    {day.dayOfWeek}, {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </p>
                                  <p className="mt-0.5 truncate text-[11px] text-neutral-400">{day.subject} · {day.system}</p>
                                </div>
                                <div className="flex flex-shrink-0 items-center gap-2 text-[11px] text-neutral-400">
                                  <span>{dayDone}/{day.blocks.length}</span>
                                  <span>{formatTime(day.totalMinutes)}</span>
                                </div>
                              </button>

                              {/* Day blocks */}
                              {isDayExpanded && (
                                <div className="ml-6 mt-0.5 space-y-1 sm:ml-8">
                                  {day.blocks.map(block => {
                                    const isDone = completedBlocks.has(block.id);
                                    return (
                                      <div
                                        key={block.id}
                                        className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
                                          isDone ? 'border-white/70 bg-neutral-100/60 opacity-65' : 'border-white/75 bg-white/40 hover:bg-white/70'
                                        }`}
                                      >
                                        <button
                                          onClick={() => toggleBlock(block.id)}
                                          aria-label={isDone ? `Mark ${block.title} incomplete` : `Mark ${block.title} complete`}
                                          className={`pressable mt-0.5 flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded-[6px] border ${
                                            isDone
                                              ? 'bg-primary-600 border-primary-600 text-white'
                                              : 'border-neutral-300 hover:border-primary-600'
                                          }`}
                                        >
                                          {isDone && (
                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                          )}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                                              block.type === 'READING' ? 'bg-blue-50 text-blue-600' :
                                              block.type === 'VIDEO' ? 'bg-emerald-50 text-emerald-600' :
                                              block.type === 'QUESTIONS' ? 'bg-amber-50 text-amber-600' :
                                              'bg-purple-50 text-purple-600'
                                            }`}>{block.type}</span>
                                            <span className="truncate text-xs font-semibold text-neutral-700">{block.title}</span>
                                          </div>
                                          <p className="mt-0.5 text-[11px] leading-4 text-neutral-500">{block.description}</p>
                                          {block.topic && (
                                            <p className="mt-0.5 text-[11px] text-neutral-400">Topics: {block.topic}</p>
                                          )}
                                          {block.resources.firstAid && (
                                            <p className="mt-0.5 text-[11px] text-primary-600">
                                              FA: {block.resources.firstAid}
                                            </p>
                                          )}
                                          {block.resources.pathoma && (
                                            <p className="mt-0.5 text-[11px] text-primary-600">
                                              Pathoma: {block.resources.pathoma}
                                            </p>
                                          )}
                                        </div>

                                        <span className="flex-shrink-0 text-[11px] text-neutral-400">{block.durationMinutes}m</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
