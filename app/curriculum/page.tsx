'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import type { Curriculum, StudyWeek, StudyBlock } from '@/lib/curriculum/types';

const PHASE_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  FOUNDATIONS: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Foundations' },
  ORGAN_SYSTEMS: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Organ Systems' },
  INTEGRATION: { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Integration' },
  FINAL_REVIEW: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Final Review' },
};

const BLOCK_ICONS: Record<StudyBlock['type'], string> = {
  READING: '📖',
  VIDEO: '🎬',
  QUESTIONS: '✏️',
  REVIEW: '🔄',
  PHARMACOLOGY: '💊',
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
  const [completedBlocks, setCompletedBlocks] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('curriculum-completed-blocks');
        if (saved) return new Set(JSON.parse(saved));
      } catch {}
    }
    return new Set();
  });
  const [activePhase, setActivePhase] = useState<string>('FOUNDATIONS');
  const [sortAlpha, setSortAlpha] = useState(true);

  useEffect(() => {
    localStorage.setItem('curriculum-completed-blocks', JSON.stringify([...completedBlocks]));
  }, [completedBlocks]);

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
    setCompletedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
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
          <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
          <span className="ml-3 text-neutral-500">Generating your study curriculum...</span>
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
      <div className="max-w-5xl mx-auto">
        {/* === HEADER === */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Study Curriculum</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Step 1 prep plan: {data.startDate} → {data.examDate} ({data.totalDays} days, {data.totalHours}h total)
          </p>
        </div>

        {/* === PROGRESS BAR === */}
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-neutral-700">Overall Progress</span>
            <span className="text-sm font-bold text-neutral-900">{overallProgress}%</span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-3">
            <div
              className="bg-primary-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            {data.examDate} exam date | {formatTime(data.totalHours * 60)} planned
          </p>
        </div>

        {/* === OVERVIEW STATS === */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="stat-card">
            <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Questions</p>
            <p className="text-2xl font-bold text-neutral-900">{data.overview.totalQuestions}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Topics</p>
            <p className="text-2xl font-bold text-neutral-900">{data.overview.totalTopics}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Weeks</p>
            <p className="text-2xl font-bold text-neutral-900">{data.weeks.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Prereq Depth</p>
            <p className="text-2xl font-bold text-neutral-900">{data.overview.dependencyDepth} layers</p>
          </div>
        </div>

        {/* === PHASE NAVIGATION === */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
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
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  activePhase === phase
                    ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                    : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300'
                }`}
              >
                <span className="block">{cfg.label}</span>
                <span className="block text-xs opacity-70">{phasePct}% done</span>
              </button>
            );
          })}
        </div>

        {/* === TOP DISEASES REFERENCE === */}
        <details className="card p-4 mb-8">
          <summary className="text-sm font-semibold text-neutral-700 cursor-pointer">Top Tested Diseases in Your Databank</summary>
          <div className="mt-3 flex items-center gap-2 mb-2">
            <button
              onClick={() => setSortAlpha(d => !d)}
              className="text-xs text-primary-600 hover:text-primary-500 font-medium border border-primary-200 rounded px-2 py-0.5"
            >
              Sort: {sortAlpha ? 'A-Z' : 'Frequency'}
            </button>
            <span className="text-xs text-neutral-400">{data.overview.topDiseases.length} conditions</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...data.overview.topDiseases]
              .sort((a, b) => sortAlpha ? a.name.localeCompare(b.name) : b.count - a.count)
              .map(d => (
              <span key={d.name} className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded">
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
            <div key={phase} id={`phase-${phase}`} className="mb-10">
              <h2 className={`text-lg font-bold mb-4 ${cfg.color}`}>
                {cfg.label} ({phaseWeeks.length} weeks)
              </h2>

              {phaseWeeks.map(week => {
                const isExpanded = expandedWeeks.has(week.weekNumber);
                const progress = getWeekProgress(week);
                const allDaysExpanded = week.days.every(d => expandedDays.has(`${d.date}-${week.weekNumber}`));

                return (
                  <div key={week.weekNumber} className={`card mb-3 overflow-hidden border-l-4 ${cfg.border}`}>
                    {/* Week header */}
                    <button
                      onClick={() => toggleWeek(week.weekNumber)}
                      className="w-full p-4 text-left hover:bg-neutral-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`text-lg ${isExpanded ? 'rotate-90' : ''} transition-transform text-neutral-400`}>
                            ▶
                          </span>
                          <div className="min-w-0">
                            <p className="text-base font-semibold text-neutral-900 truncate">
                              Week {week.weekNumber}: {week.phaseLabel}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {week.startDate} → {week.endDate} | {formatTime(week.totalMinutes)} | {week.days.length} study days
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-sm font-medium text-neutral-500">{progress.pct}%</span>
                          <div className="w-16 bg-neutral-200 rounded-full h-1.5">
                            <div className="bg-primary-600 h-1.5 rounded-full" style={{ width: `${progress.pct}%` }} />
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Expanded week content */}
                    {isExpanded && (
                      <div className="border-t border-neutral-100 px-4 py-3">
                        <div className="flex justify-end mb-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleAllDaysInWeek(week); }}
                            className="text-xs text-primary-600 hover:text-primary-500 font-medium"
                          >
                            {allDaysExpanded ? 'Collapse all days' : 'Expand all days'}
                          </button>
                        </div>

                        {week.days.map((day) => {
                          const dayKey = `${day.date}-${week.weekNumber}`;
                          const isDayExpanded = expandedDays.has(dayKey);
                          const dayDone = day.blocks.filter(b => completedBlocks.has(b.id)).length;

                          return (
                            <div key={dayKey} className="mb-2 last:mb-0">
                              {/* Day header */}
                              <button
                                onClick={() => toggleDay(dayKey)}
                                className="w-full flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-neutral-50 text-left"
                              >
                                <span className={`text-xs ${isDayExpanded ? 'rotate-90' : ''} transition-transform text-neutral-400`}>▶</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-neutral-700">
                                    {day.dayOfWeek}, {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </p>
                                  <p className="text-xs text-neutral-400">{day.subject} | {day.system}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-xs text-neutral-400">{dayDone}/{day.blocks.length}</span>
                                  <span className="text-xs text-neutral-400">{formatTime(day.totalMinutes)}</span>
                                </div>
                              </button>

                              {/* Day blocks */}
                              {isDayExpanded && (
                                <div className="ml-8 mt-1 space-y-1">
                                  {day.blocks.map(block => {
                                    const isDone = completedBlocks.has(block.id);
                                    return (
                                      <div
                                        key={block.id}
                                        className={`flex items-start gap-3 py-2 px-3 rounded-lg border transition-colors ${
                                          isDone ? 'bg-neutral-100 border-neutral-200 opacity-70' : 'bg-white border-neutral-100 hover:border-neutral-200'
                                        }`}
                                      >
                                        <button
                                          onClick={() => toggleBlock(block.id)}
                                          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                            isDone
                                              ? 'bg-primary-600 border-primary-600 text-white'
                                              : 'border-neutral-300 hover:border-primary-600'
                                          }`}
                                        >
                                          {isDone && (
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                          )}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm">{BLOCK_ICONS[block.type]}</span>
                                            <span className={`text-xs font-medium uppercase px-1.5 py-0.5 rounded ${
                                              block.type === 'READING' ? 'bg-blue-50 text-blue-600' :
                                              block.type === 'VIDEO' ? 'bg-emerald-50 text-emerald-600' :
                                              block.type === 'QUESTIONS' ? 'bg-amber-50 text-amber-600' :
                                              'bg-purple-50 text-purple-600'
                                            }`}>{block.type}</span>
                                            <span className="text-sm font-medium text-neutral-700 truncate">{block.title}</span>
                                          </div>
                                          <p className="text-xs text-neutral-500 mt-0.5 ml-7">{block.description}</p>
                                          {block.topic && (
                                            <p className="text-xs text-neutral-400 ml-7 mt-0.5 italic">Topics: {block.topic}</p>
                                          )}
                                          {block.resources.firstAid && (
                                            <p className="text-xs text-primary-600 ml-7 mt-0.5">
                                              FA: {block.resources.firstAid}
                                            </p>
                                          )}
                                          {block.resources.pathoma && (
                                            <p className="text-xs text-primary-600 ml-7 mt-0.5">
                                              Pathoma: {block.resources.pathoma}
                                            </p>
                                          )}
                                        </div>

                                        <span className="text-xs text-neutral-400 flex-shrink-0">{block.durationMinutes}min</span>
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
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
