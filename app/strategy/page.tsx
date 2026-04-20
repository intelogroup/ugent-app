"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import DashboardLayout from "@/components/DashboardLayout";
import DiseasePriorityRow from "@/components/strategy/DiseasePriorityRow";
import Link from "next/link";
import { AcademicCapIcon, BeakerIcon } from "@heroicons/react/24/outline";
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
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined);

  const currentUser = useQuery(api.users.getCurrentUser);
  const diseasePriority = useQuery(
    api.strategy.getDiseasePriorityList,
    currentUser !== undefined
      ? {
          userId: currentUser?._id ?? undefined,
          limit: 30,
          topicTypeFilter: activeFilter,
        }
      : "skip"
  );
  const systemFreqs = useQuery(api.research.getTopPatternsByCount, {
    type: "SYSTEM",
    limit: 20,
  });
  const topicTypeFreqs = useQuery(api.research.getTopPatternsByCount, {
    type: "TOPIC_TYPE",
    limit: 10,
  });
  const confusableTopics = useQuery(api.strategy.getMostConfusableTopics, { limit: 8 });

  const isLoading = currentUser === undefined || diseasePriority === undefined;

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
          <Link
            href="/strategy/clue-training"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <BeakerIcon className="w-4 h-4" />
            Clue Training
          </Link>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: "1", title: "Identify the Focal Concept", desc: "Each question tests one thing: a disease, pathogen, drug, physiological principle, or concept" },
            { step: "2", title: "Know What Aspect Is Tested", desc: "Same topic, different dimension: mechanism, epidemiology, treatment, genetics" },
            { step: "3", title: "Frequency × Your Weakness", desc: "Study high-yield topics where you score lowest — that's your fastest grade lift" },
          ].map((item) => (
            <div key={item.step} className="card p-4 flex gap-3 items-start">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-sm font-bold flex items-center justify-center">
                {item.step}
              </span>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            ) : !diseasePriority || diseasePriority.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-400">
                {activeFilter
                  ? `No ${activeFilter.toLowerCase()} topics yet. Ingest more questions or run the backfill script.`
                  : "No topic data yet. Ingest questions in Research."}
              </div>
            ) : (
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
                    {diseasePriority.map((d, i) => (
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
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Topic Type Breakdown */}
            {topicTypeFreqs && topicTypeFreqs.length > 0 && (
              <div className="card p-4">
                <h2 className="text-sm font-semibold text-neutral-900 mb-3">Question Types</h2>
                <div className="space-y-2">
                  {topicTypeFreqs.map((t) => (
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
                  Based on {topicTypeFreqs.reduce((s, t) => s + t.count, 0)} classified questions. Most questions classified before schema update show no type yet.
                </p>
              </div>
            )}

            {/* Most Confusable Topics */}
            {confusableTopics && confusableTopics.length > 0 && (
              <div className="card p-4">
                <h2 className="text-sm font-semibold text-neutral-900 mb-1">Most Confusable</h2>
                <p className="text-[11px] text-neutral-400 mb-3">Topics with the most wrong-answer distractors extracted</p>
                <div className="space-y-2">
                  {confusableTopics.map((t) => (
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
                      data={systemFreqs.map((s) => ({ name: s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name, count: s.count }))}
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
        </div>
      </div>
    </DashboardLayout>
  );
}
