"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

// ─── Types ────────────────────────────────────────────────────────────────────

type LeafNode = {
  diseaseName: string;
  count: number;
  successRate: number | null;
};

type TopicTypeNode = {
  topicType: string;
  count: number;
  diseases: LeafNode[];
};

type SystemNode = {
  system: string;
  total: number;
  topicTypes: TopicTypeNode[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TOPIC_TYPE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  DISEASE:   { bg: "bg-blue-50",    border: "border-blue-200",   text: "text-blue-700",   dot: "bg-blue-400" },
  PATHOGEN:  { bg: "bg-orange-50",  border: "border-orange-200", text: "text-orange-700", dot: "bg-orange-400" },
  SYNDROME:  { bg: "bg-pink-50",    border: "border-pink-200",   text: "text-pink-700",   dot: "bg-pink-400" },
  PRINCIPLE: { bg: "bg-purple-50",  border: "border-purple-200", text: "text-purple-700", dot: "bg-purple-400" },
  DRUG:      { bg: "bg-teal-50",    border: "border-teal-200",   text: "text-teal-700",   dot: "bg-teal-400" },
  CONCEPT:   { bg: "bg-neutral-50", border: "border-neutral-200",text: "text-neutral-600",dot: "bg-neutral-400" },
};

const SYSTEM_COLORS = [
  "bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200",
  "bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200",
  "bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-200",
  "bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200",
  "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200",
  "bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200",
  "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 hover:bg-fuchsia-200",
  "bg-lime-100 text-lime-800 border-lime-200 hover:bg-lime-200",
  "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",
  "bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200",
  "bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200",
  "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
  "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
  "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",
  "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
];

function successColor(rate: number | null): string {
  if (rate === null) return "bg-neutral-100 text-neutral-500 border-neutral-200";
  if (rate >= 75) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (rate >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

function successDot(rate: number | null): string {
  if (rate === null) return "bg-neutral-300";
  if (rate >= 75) return "bg-emerald-400";
  if (rate >= 50) return "bg-amber-400";
  return "bg-rose-400";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LeafList({ diseases }: { diseases: LeafNode[] }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-1.5 mt-2 max-h-[420px] overflow-y-auto pr-1">
      {diseases.map((d) => (
        <button
          key={d.diseaseName}
          onClick={() => router.push(`/strategy/${encodeURIComponent(d.diseaseName)}`)}
          className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-left text-xs font-medium transition-all hover:shadow-sm hover:-translate-y-px ${successColor(d.successRate)}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className={`flex-shrink-0 w-2 h-2 rounded-full ${successDot(d.successRate)}`} />
            <span className="truncate">{d.diseaseName}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] opacity-60">{d.count}q</span>
            {d.successRate !== null && (
              <span className="text-[10px] font-semibold">{d.successRate}%</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

function TopicTypeGrid({
  topicTypes,
  selectedTopicType,
  onSelect,
}: {
  topicTypes: TopicTypeNode[];
  selectedTopicType: string | null;
  onSelect: (t: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {topicTypes.map((tt) => {
        const colors = TOPIC_TYPE_COLORS[tt.topicType] ?? TOPIC_TYPE_COLORS.CONCEPT;
        const isActive = selectedTopicType === tt.topicType;
        return (
          <button
            key={tt.topicType}
            onClick={() => onSelect(isActive ? null : tt.topicType)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all hover:shadow-md hover:-translate-y-0.5 ${
              isActive
                ? `${colors.bg} ${colors.border} ${colors.text} shadow-md scale-105`
                : `bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300`
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${isActive ? colors.dot : "bg-neutral-300"}`} />
            <span>{tt.topicType}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/60" : "bg-neutral-100"}`}>
              {tt.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StrategyGraphExplorer({ userId }: { userId?: string }) {
  const data = useQuery(api.strategy.getStrategyGraphData, {
    userId: userId as any,
  });

  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [selectedTopicType, setSelectedTopicType] = useState<string | null>(null);

  const systemColorMap = useMemo(() => {
    if (!data) return {};
    const map: Record<string, string> = {};
    data.forEach((s, i) => {
      map[s.system] = SYSTEM_COLORS[i % SYSTEM_COLORS.length];
    });
    return map;
  }, [data]);

  const activeSystem = useMemo(
    () => data?.find((s) => s.system === selectedSystem) ?? null,
    [data, selectedSystem]
  );

  const activeTopicType = useMemo(
    () => activeSystem?.topicTypes.find((t) => t.topicType === selectedTopicType) ?? null,
    [activeSystem, selectedTopicType]
  );

  const handleSystemClick = (system: string) => {
    if (selectedSystem === system) {
      setSelectedSystem(null);
      setSelectedTopicType(null);
    } else {
      setSelectedSystem(system);
      setSelectedTopicType(null);
    }
  };

  const handleBack = () => {
    if (selectedTopicType) {
      setSelectedTopicType(null);
    } else {
      setSelectedSystem(null);
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-neutral-400">
        Loading graph...
      </div>
    );
  }

  // ── Level 1: System Constellation ──────────────────────────────────────────
  if (!selectedSystem) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs text-neutral-400">
            Select a system to explore its topics
          </p>
        </div>
        <div className="relative flex items-center justify-center">
          {/* Outer ring hint */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-neutral-100 pointer-events-none" style={{ margin: "10px" }} />
          <div className="flex flex-wrap gap-3 justify-center py-6 px-4">
            {data.map((s) => (
              <button
                key={s.system}
                onClick={() => handleSystemClick(s.system)}
                className={`relative flex flex-col items-center justify-center w-28 h-28 rounded-full border-2 font-semibold text-sm text-center transition-all hover:shadow-lg hover:scale-105 active:scale-95 ${systemColorMap[s.system]}`}
              >
                <span className="leading-tight px-2">{s.system}</span>
                <span className="text-[10px] mt-1 opacity-60">{s.total} topics</span>
              </button>
            ))}
          </div>
        </div>
        <p className="text-center text-[11px] text-neutral-300">
          {data.reduce((a, s) => a + s.total, 0)} total topics across {data.length} systems
        </p>
      </div>
    );
  }

  // ── Level 2 & 3: System Hub + Topic Type + Leaves ──────────────────────────
  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleBack}
          className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5 text-sm">
          <button
            onClick={() => { setSelectedSystem(null); setSelectedTopicType(null); }}
            className="text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            All Systems
          </button>
          <span className="text-neutral-300">/</span>
          <button
            onClick={() => setSelectedTopicType(null)}
            className={`font-semibold transition-colors ${selectedTopicType ? "text-neutral-500 hover:text-neutral-800" : "text-neutral-900"}`}
          >
            {selectedSystem}
          </button>
          {selectedTopicType && (
            <>
              <span className="text-neutral-300">/</span>
              <span className="font-semibold text-neutral-900">{selectedTopicType}</span>
            </>
          )}
        </div>
      </div>

      {/* System Header Badge */}
      <div className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 ${systemColorMap[selectedSystem]}`}>
        <span className="text-base font-bold">{selectedSystem}</span>
        <span className="text-xs opacity-70">{activeSystem?.total} topics</span>
      </div>

      {/* Topic Type Selector (Level 2) */}
      {activeSystem && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
            Topic Categories
          </p>
          <TopicTypeGrid
            topicTypes={activeSystem.topicTypes}
            selectedTopicType={selectedTopicType}
            onSelect={setSelectedTopicType}
          />
        </div>
      )}

      {/* Leaf Nodes (Level 3) */}
      {activeTopicType && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
              {activeTopicType.topicType} — {activeTopicType.count} topics
            </p>
            <div className="flex items-center gap-3 text-[10px] text-neutral-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>≥75%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>50-74%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block"/>below 50%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neutral-300 inline-block"/>not attempted</span>
            </div>
          </div>
          <LeafList diseases={activeTopicType.diseases} />
        </div>
      )}

      {/* Prompt if no topic type selected yet */}
      {!selectedTopicType && activeSystem && (
        <p className="text-xs text-neutral-400 italic">
          Select a category above to see the topics inside it
        </p>
      )}
    </div>
  );
}
