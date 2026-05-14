"use client";

import { useState, useMemo, useCallback } from "react";
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

const TOPIC_TYPE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; shadow: string }> = {
  DISEASE:   { bg: "bg-blue-50",    border: "border-blue-200",   text: "text-blue-700",   dot: "bg-blue-400",   shadow: "shadow-blue-100" },
  PATHOGEN:  { bg: "bg-orange-50",  border: "border-orange-200", text: "text-orange-700", dot: "bg-orange-400", shadow: "shadow-orange-100" },
  SYNDROME:  { bg: "bg-pink-50",    border: "border-pink-200",   text: "text-pink-700",   dot: "bg-pink-400",   shadow: "shadow-pink-100" },
  PRINCIPLE: { bg: "bg-purple-50",  border: "border-purple-200", text: "text-purple-700", dot: "bg-purple-400", shadow: "shadow-purple-100" },
  DRUG:      { bg: "bg-teal-50",    border: "border-teal-200",   text: "text-teal-700",   dot: "bg-teal-400",   shadow: "shadow-teal-100" },
  CONCEPT:   { bg: "bg-neutral-50", border: "border-neutral-200",text: "text-neutral-600",dot: "bg-neutral-400", shadow: "shadow-neutral-100" },
};

const SYSTEM_COLORS = [
  "bg-indigo-50 text-indigo-800 border-indigo-100 hover:bg-indigo-100",
  "bg-sky-50 text-sky-800 border-sky-100 hover:bg-sky-100",
  "bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100",
  "bg-violet-50 text-violet-800 border-violet-100 hover:bg-violet-100",
  "bg-rose-50 text-rose-800 border-rose-100 hover:bg-rose-100",
  "bg-amber-50 text-amber-800 border-amber-100 hover:bg-amber-100",
  "bg-cyan-50 text-cyan-800 border-cyan-100 hover:bg-cyan-100",
  "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-100 hover:bg-fuchsia-100",
  "bg-lime-50 text-lime-800 border-lime-100 hover:bg-lime-100",
  "bg-orange-50 text-orange-800 border-orange-100 hover:bg-orange-100",
  "bg-pink-50 text-pink-800 border-pink-100 hover:bg-pink-100",
  "bg-teal-50 text-teal-800 border-teal-100 hover:bg-teal-100",
  "bg-blue-50 text-blue-800 border-blue-100 hover:bg-blue-100",
  "bg-red-50 text-red-800 border-red-100 hover:bg-red-100",
  "bg-purple-50 text-purple-800 border-purple-100 hover:bg-purple-100",
  "bg-green-50 text-green-800 border-green-100 hover:bg-green-100",
];

function successColor(rate: number | null): string {
  if (rate === null) return "bg-white text-neutral-500 border-neutral-200";
  if (rate >= 75) return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (rate >= 50) return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-rose-50 text-rose-800 border-rose-200";
}

function successDot(rate: number | null): string {
  if (rate === null) return "bg-neutral-300";
  if (rate >= 75) return "bg-emerald-400";
  if (rate >= 50) return "bg-amber-400";
  return "bg-rose-400";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StrategyGraphExplorer({ userId }: { userId?: string }) {
  const router = useRouter();
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

  // Level 1 collision-packed layout
  const CONTAINER_R = 320;
  const computeSize = useCallback((total: number): number => {
    if (!data) return 100;
    const maxTotal = Math.max(...data.map((s) => s.total));
    const minS = 85;
    const maxS = 150;
    const t = Math.log10(1 + (total / maxTotal) * 9);
    return minS + t * (maxS - minS);
  }, [data]);

  const placements = useMemo(() => {
    if (!data) return new Map<string, { x: number; y: number }>();
    const GOLDEN_ANGLE = 137.508 * (Math.PI / 180);
    const PADDING = 6;
    const sorted = [...data].sort((a, b) => b.total - a.total);

    const sizes = new Map<string, number>();
    for (const s of data) sizes.set(s.system, computeSize(s.total));

    // Initial positions: golden spiral
    const pos = new Map<string, { x: number; y: number }>();
    sorted.forEach((s, i) => {
      const angle = i * GOLDEN_ANGLE;
      const dist = Math.sqrt(i + 0.5) * (CONTAINER_R * 0.22);
      pos.set(s.system, { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
    });

    // Relaxation: push overlapping pairs apart, clamp to container
    for (let iter = 0; iter < 150; iter++) {
      const damp = 1 - iter / 150;
      let moved = 0;
      for (const [sys1, p1] of pos) {
        const r1 = sizes.get(sys1)! / 2;
        let fx = 0;
        let fy = 0;
        for (const [sys2, p2] of pos) {
          if (sys1 === sys2) continue;
          const r2 = sizes.get(sys2)! / 2;
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.hypot(dx, dy);
          const minDist = r1 + r2 + PADDING;
          if (dist < minDist && dist > 0.01) {
            const force = (minDist - dist) * 0.55 * damp + 0.3 * damp;
            fx += (dx / dist) * Math.min(force, 8);
            fy += (dy / dist) * Math.min(force, 8);
          }
        }
        if (Math.abs(fx) > 0.01 || Math.abs(fy) > 0.01) {
          p1.x += fx;
          p1.y += fy;
          moved++;
        }
        const edgeMax = CONTAINER_R - r1 - PADDING;
        const cDist = Math.hypot(p1.x, p1.y);
        if (cDist > edgeMax && cDist > 0.01) {
          const ratio = edgeMax / cDist;
          p1.x *= ratio;
          p1.y *= ratio;
        }
      }
      if (moved === 0 && iter > 30) break;
    }

    // Final separation pass: hard push for remaining overlaps
    for (let pass = 0; pass < 50; pass++) {
      let anyOverlap = false;
      for (const [sys1, p1] of pos) {
        for (const [sys2, p2] of pos) {
          if (sys1 >= sys2) continue;
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          const min = sizes.get(sys1)! / 2 + sizes.get(sys2)! / 2 + PADDING;
          if (dist < min && dist > 0.01) {
            anyOverlap = true;
            const push = (min - dist) * 0.5 / dist;
            const dx = (p1.x - p2.x) * push;
            const dy = (p1.y - p2.y) * push;
            p1.x += dx; p1.y += dy;
            p2.x -= dx; p2.y -= dy;
          }
        }
      }
      for (const [sys, p] of pos) {
        const edgeMax = CONTAINER_R - sizes.get(sys)! / 2 - PADDING;
        const d = Math.hypot(p.x, p.y);
        if (d > edgeMax && d > 0.01) {
          const r = edgeMax / d;
          p.x *= r; p.y *= r;
        }
      }
      if (!anyOverlap) break;
    }

    const result = new Map<string, { x: number; y: number }>();
    for (const s of data) {
      const p = pos.get(s.system);
      result.set(s.system, { x: p?.x ?? 0, y: p?.y ?? 0 });
    }
    return result;
  }, [data, computeSize]);

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
      <div className="flex items-center justify-center py-12">
        <div
          className="relative rounded-full border-4 border-neutral-100 bg-neutral-50/30 shadow-inner flex items-center justify-center"
          style={{ width: CONTAINER_R * 2, height: CONTAINER_R * 2 }}
        >
          {data.map((s) => {
            const pos = placements.get(s.system);
            if (!pos) return null;
            const size = computeSize(s.total);
            return (
              <button
                key={s.system}
                onClick={() => handleSystemClick(s.system)}
                style={{
                  width: size,
                  height: size,
                  transform: `translate(${pos.x}px, ${pos.y}px)`,
                }}
                className={`absolute flex flex-col items-center justify-center rounded-full border-2 text-center shadow-sm transition-all hover:shadow-xl hover:scale-110 active:scale-95 z-10 ${systemColorMap[s.system]}`}
              >
                <span
                  className="font-black leading-tight px-3 uppercase tracking-tighter"
                  style={{ fontSize: Math.max(10, size * 0.08) }}
                >
                  {s.system}
                </span>
                <span className="text-[10px] font-bold mt-1 opacity-60">
                  {s.total}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Level 2 & 3: System Hub + Topic Type + Leaves ──────────────────────────
  return (
    <div className="space-y-8 min-h-[500px]">
      {/* Breadcrumb / Back */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-900 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        <span>Back to {selectedTopicType ? selectedSystem : "All Systems"}</span>
      </button>

      <div className="flex flex-col lg:flex-row gap-12 items-start justify-center">
        {/* Level 2: The Hub (System + Surrounding Types) */}
        <div className="relative flex-shrink-0 flex items-center justify-center w-[300px] h-[300px]">
          {/* Central System Circle */}
          <div className={`flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 shadow-lg text-center z-10 ${systemColorMap[selectedSystem]}`}>
            <span className="text-base font-black leading-tight px-4 uppercase tracking-tighter">
              {selectedSystem}
            </span>
          </div>

          {/* Topic Type Circles (Surrounding the central one) */}
          {activeSystem?.topicTypes.map((tt, i) => {
            const colors = TOPIC_TYPE_COLORS[tt.topicType] ?? TOPIC_TYPE_COLORS.CONCEPT;
            const isActive = selectedTopicType === tt.topicType;
            
            // Calculate position in circle
            const angle = (i / activeSystem.topicTypes.length) * 2 * Math.PI - Math.PI / 2;
            const radius = 100;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <button
                key={tt.topicType}
                onClick={() => setSelectedTopicType(isActive ? null : tt.topicType)}
                style={{ transform: `translate(${x}px, ${y}px)` }}
                className={`absolute flex flex-col items-center justify-center w-20 h-20 rounded-full border-2 text-center transition-all hover:scale-110 shadow-sm ${
                  isActive
                    ? `${colors.bg} ${colors.border} ${colors.text} ${colors.shadow} ring-4 ring-white`
                    : "bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200"
                }`}
              >
                <span className="text-[10px] font-bold leading-none">{tt.topicType}</span>
                <span className="text-[9px] opacity-60 mt-1">{tt.count}</span>
              </button>
            );
          })}
        </div>

        {/* Level 3: The List (Connected to Active Type) */}
        {activeTopicType && (
          <div className="flex-1 w-full max-w-md animate-in slide-in-from-right-4 duration-300">
            <div className="bg-neutral-50/50 rounded-3xl border border-neutral-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-neutral-900">
                  {activeTopicType.topicType}
                </h3>
                <span className="text-xs text-neutral-400">{activeTopicType.count} results</span>
              </div>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <style jsx>{`
                  .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e5e5e5;
                    border-radius: 10px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #d4d4d4;
                  }
                `}</style>
                {activeTopicType.diseases.map((d) => (
                  <button
                    key={d.diseaseName}
                    onClick={() => router.push(`/strategy/${encodeURIComponent(d.diseaseName)}`)}
                    className={`group w-full flex items-center justify-between gap-4 p-3 rounded-xl border transition-all hover:translate-x-1 ${successColor(d.successRate)}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${successDot(d.successRate)}`} />
                      <span className="text-sm font-bold truncate">{d.diseaseName}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-black italic">DRIL-DOWN →</span>
                    </div>
                    {d.successRate !== null && (
                      <span className="text-xs font-black flex-shrink-0">{d.successRate}%</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Level 3 Placeholder */}
        {!activeTopicType && (
          <div className="flex-1 hidden lg:flex items-center justify-center text-neutral-300 italic text-sm border-2 border-dashed border-neutral-100 rounded-3xl h-[300px]">
            Select a category circle to view topics
          </div>
        )}
      </div>
    </div>
  );
}
