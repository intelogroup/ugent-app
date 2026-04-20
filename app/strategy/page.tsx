"use client";

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

export default function StrategyHub() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const diseasePriority = useQuery(
    api.strategy.getDiseasePriorityList,
    currentUser?._id ? { userId: currentUser._id, limit: 30 } : "skip"
  );
  const systemFreqs = useQuery(api.research.getTopPatternsByCount, {
    type: "SYSTEM",
    limit: 10,
  });

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
            { step: "1", title: "Symptoms → Diagnosis", desc: "Recognize the disease from clinical clues" },
            { step: "2", title: "Diagnosis → Aspect", desc: "Know which dimension gets tested: genetics, mechanism, epidemiology" },
            { step: "3", title: "Frequency × Weakness", desc: "Study high-yield diseases where you score lowest" },
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
          {/* Disease Priority Table */}
          <div className="lg:col-span-2 card">
            <div className="p-4 border-b border-neutral-100">
              <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
                <AcademicCapIcon className="w-5 h-5 text-primary-600" />
                High-Yield Disease Priority
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Ranked by frequency × (1 − your success rate). Red = study first.
              </p>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-sm text-neutral-400">Loading...</div>
            ) : !diseasePriority || diseasePriority.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-400">
                No disease data yet. Ingest more questions in Research.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-100">
                      <th className="text-left py-2 px-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">#</th>
                      <th className="text-left py-2 px-4 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Disease</th>
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
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={systemFreqs.map((s) => ({ name: s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name, count: s.count }))}
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
    </DashboardLayout>
  );
}
