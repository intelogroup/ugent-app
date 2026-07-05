"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import DiseasePriorityRow from "@/components/strategy/DiseasePriorityRow";
import StrategyGraphExplorer from "@/components/strategy/StrategyGraphExplorer";
import MemorizeTab from "@/components/strategy/MemorizeTab";
import Link from "next/link";
import { AcademicCapIcon, BeakerIcon, TableCellsIcon, CircleStackIcon } from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const TOPIC_TYPE_FILTERS = [
  { value: undefined, label: "All" },
  { value: "DISEASE", label: "Disease" },
  { value: "PATHOGEN", label: "Pathogen" },
  { value: "PRINCIPLE", label: "Principle" },
  { value: "DRUG", label: "Drug" },
  { value: "SYNDROME", label: "Syndrome" },
  { value: "CONCEPT", label: "Concept" },
] as const;

const TYPE_COLORS: Record<string, string> = {
  DISEASE: "bg-blue-100 text-blue-700",
  PATHOGEN: "bg-orange-100 text-orange-700",
  PRINCIPLE: "bg-purple-100 text-purple-700",
  DRUG: "bg-teal-100 text-teal-700",
  SYNDROME: "bg-pink-100 text-pink-700",
  CONCEPT: "bg-neutral-100 text-neutral-600",
};

export default function StrategyHub() {
  const [view, setView] = useState<"table" | "graph" | "memorize">("table");
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined);
  const [displayLimit, setDisplayLimit] = useState(30);

  const [strategyData, setStrategyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStrategy() {
      try {
        const res = await fetch("/api/strategy");
        if (!res.ok) throw new Error("Failed to load strategy data");
        const json = await res.json();
        setStrategyData(json);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    }
    fetchStrategy();
  }, []);

  const filteredPriority = useMemo(() => {
    if (!strategyData?.diseasePriority) return [];
    let list = strategyData.diseasePriority;
    if (activeFilter) {
      list = list.filter((d: any) => d.topicType === activeFilter);
    }
    return list.slice(0, displayLimit);
  }, [strategyData, activeFilter, displayLimit]);
  const systemFreqs = strategyData?.systemFreqs || [];
  const topicTypeFreqs = strategyData?.topicTypeFreqs || [];
  const confusableTopics = strategyData?.confusableTopics || [];
  const graphData = strategyData?.graphData || [];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Strategy Hub</h1>
            <p className="text-neutral-600">
              Reverse-engineered study priority based on your question bank
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center bg-neutral-100 rounded-lg p-1 gap-1">
              <button
                onClick={() => setView("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  view === "table"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                <TableCellsIcon className="w-3.5 h-3.5" />
                Priority
              </button>
              <button
                onClick={() => setView("graph")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  view === "graph"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                <CircleStackIcon className="w-3.5 h-3.5" />
                Explorer
              </button>
              <button
                onClick={() => setView("memorize")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  view === "memorize"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                <AcademicCapIcon className="w-3.5 h-3.5" />
                Memorize
              </button>
            </div>
            <Link
              href="/strategy/clue-training"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <BeakerIcon className="w-4 h-4" />
              Clue Training
            </Link>
          </div>
        </div>

        <div className="h-4"></div>

        {/* Graph Explorer View */}
        {view === "graph" && (
          <div className="card p-6">
            <StrategyGraphExplorer
              data={graphData}
              firstAidMap={strategyData?.firstAidMap}
              pathomaMap={strategyData?.pathomaMap}
            />
          </div>
        )}

        {/* Memorize View */}
        {view === "memorize" && (
          isLoading ? (
            <div className="card p-8 text-center text-sm text-neutral-400">Loading study cards...</div>
          ) : error ? (
            <div className="card p-8 text-center text-sm text-rose-500">Error loading data: {error}</div>
          ) : (
            <MemorizeTab
              geneticsPairs={strategyData?.geneticsPairs || []}
              questionBankClues={strategyData?.questionBankClues || []}
            />
          )
        )}

        {view === "table" && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Topic Priority Table */}
          <div className="lg:col-span-2 card">
            <div className="p-4 border-b border-neutral-100">
              <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
                <AcademicCapIcon className="w-5 h-5 text-primary-600" />
                High-Yield Topic Priority
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Ranked by frequency × (1 − your success rate). Red = study first.
              </p>
            </div>

            {/* Filter tabs */}
            <div className="px-4 pt-3 pb-0 flex gap-1.5 flex-wrap">
              {TOPIC_TYPE_FILTERS.map((f) => (
                <button
                  key={f.label}
                  onClick={() => setActiveFilter(f.value)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                    activeFilter === f.value
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-sm text-neutral-400">Loading...</div>
            ) : error ? (
              <div className="p-8 text-center text-sm text-rose-500">Error: {error}</div>
            ) : !filteredPriority || filteredPriority.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-400">
                {activeFilter
                  ? `No ${activeFilter.toLowerCase()} topics yet. Ingest more questions or run the backfill script.`
                  : "No topic data yet. Ingest questions in Research."}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-100">
                        <th className="text-left py-2 px-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">#</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Topic</th>
                        <th className="text-center py-2 px-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Freq</th>
                        <th className="text-center py-2 px-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Your %</th>
                        <th className="text-center py-2 px-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPriority.map((d: any, i: number) => (
                        <DiseasePriorityRow
                          key={d.diseaseName}
                          rank={i + 1}
                          diseaseName={d.diseaseName}
                          topicType={d.topicType}
                          topClue={d.topClue}
                          frequency={d.frequency}
                          userSuccessRate={d.userSuccessRate}
                          priorityScore={d.priorityScore}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* See More Button */}
                {strategyData?.diseasePriority?.filter((d: any) => !activeFilter || d.topicType === activeFilter).length >= displayLimit && (
                  <div className="p-4 border-t border-neutral-100 flex justify-center">
                    <button
                      onClick={() => setDisplayLimit((prev) => prev + 100)}
                      className="text-sm font-semibold text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-6 py-2 rounded-lg transition-colors"
                    >
                      See More (+100)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Topic Type Breakdown */}
            {topicTypeFreqs && topicTypeFreqs.length > 0 && (
              <div className="card p-4">
                <h2 className="text-sm font-semibold text-neutral-900 mb-3">Question Types</h2>
                <div className="space-y-2">
                  {topicTypeFreqs.map((t: any) => (
                    <div key={t.name} className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 text-[11px] font-semibold rounded ${TYPE_COLORS[t.name] ?? "bg-neutral-100 text-neutral-600"}`}>
                        {t.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-1.5 rounded-full bg-primary-200"
                          style={{
                            width: `${Math.round((t.count / (topicTypeFreqs[0]?.count || 1)) * 80)}px`,
                          }}
                        />
                        <span className="text-xs text-neutral-500 w-6 text-right">{t.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-neutral-400 mt-3">
                  Based on {topicTypeFreqs.reduce((s: number, t: any) => s + t.count, 0)} classified questions. Most questions classified before schema update show no type yet.
                </p>
              </div>
            )}

            {/* Most Confusable Topics */}
            {confusableTopics && confusableTopics.length > 0 && (
              <div className="card p-4">
                <h2 className="text-sm font-semibold text-neutral-900 mb-1">Most Confusable</h2>
                <p className="text-[11px] text-neutral-400 mb-3">Topics with the most wrong-answer distractors extracted</p>
                <div className="space-y-2">
                  {confusableTopics.map((t: any) => (
                    <div key={t.diseaseName} className="flex items-center justify-between gap-2">
                      <Link
                        href={`/strategy/${encodeURIComponent(t.diseaseName)}`}
                        className="text-xs text-primary-700 hover:underline truncate"
                      >
                        {t.diseaseName}
                      </Link>
                      <span className="flex-shrink-0 text-[11px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                        {t.discriminatorCount} traps
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Priority Chart */}
            <div className="card">
              <div className="p-4 border-b border-neutral-100">
                <h2 className="text-base font-semibold text-neutral-900">System Frequency</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Organ systems by question count</p>
              </div>
              <div className="p-4">
                {!systemFreqs || systemFreqs.length === 0 ? (
                  <p className="text-sm text-neutral-400 text-center py-4">No data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(260, (systemFreqs?.length ?? 10) * 28)}>
                    <BarChart
                      data={systemFreqs.map((s: any) => ({ name: s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name, count: s.count }))}
                      layout="vertical"
                      margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>}
      </div>
    </DashboardLayout>
  );
}
