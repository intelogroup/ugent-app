"use client";

import { useEffect, useState } from "react";
import {
  AcademicCapIcon,
  CircleStackIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "@/components/DashboardLayout";
import StrategyGraphExplorer from "@/components/strategy/StrategyGraphExplorer";
import FlashcardsTab from "@/components/strategy/MemorizeTab";
import type { SubChapterNode } from "@/lib/curriculum/types";
import type { KnowledgeGraph } from "@/lib/strategy/knowledge-graph";

type StrategyView = "graph" | "flashcards";

type StrategyData = {
  knowledgeGraph: KnowledgeGraph;
  graphData: {
    system: string;
    total: number;
    topicTypes: {
      topicType: string;
      count: number;
      diseases: { diseaseName: string; count: number; successRate: number | null }[];
    }[];
  }[];
  firstAidMap?: Record<string, { chapter: string; pages: string; subChapters: SubChapterNode[] }>;
  pathomaMap?: Record<string, { chapter: string; subChapters: SubChapterNode[] }>;
  geneticsPairs: {
    topic: string;
    pairs: {
      a: string;
      b: string;
      c?: string;
      test: string;
      discriminator: string;
      [key: string]: unknown;
    }[];
  }[];
  questionBankClues: {
    id: string;
    diseaseName: string;
    topicType: string;
    system: string;
    clues: string[];
    discriminators: string[];
  }[];
};

export default function StrategyHub() {
  const [view, setView] = useState<StrategyView>("graph");
  const [strategyData, setStrategyData] = useState<StrategyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStrategy() {
      try {
        const res = await fetch("/api/strategy");
        if (!res.ok) throw new Error("Failed to load strategy data");
        setStrategyData(await res.json());
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    }

    fetchStrategy();
  }, []);

  return (
    <DashboardLayout>
      <div className="flex max-w-7xl mx-auto flex-col gap-6 lg:h-full">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Strategy Hub</h1>
            <p className="text-neutral-600">
              Explore relationships in your question bank and reinforce them with drill cards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-neutral-100/80 rounded-xl p-1 gap-1 border border-neutral-200">
              <button
                onClick={() => setView("graph")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  view === "graph"
                    ? "bg-white text-[#0E7490] shadow-xs font-semibold"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <CircleStackIcon className="w-3.5 h-3.5" />
                Explorer
              </button>
              <button
                onClick={() => setView("flashcards")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  view === "flashcards"
                    ? "bg-white text-[#0E7490] shadow-xs font-semibold"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <AcademicCapIcon className="w-3.5 h-3.5" />
                Drill Cards
              </button>
            </div>
          </div>
        </div>

        {view === "graph" && (
          isLoading ? (
            <div className="card p-8 text-center text-sm text-neutral-400">Loading explorer...</div>
          ) : error ? (
            <div className="card p-8 text-center text-sm text-rose-500">Error loading data: {error}</div>
          ) : (
            <div className="flex flex-1 flex-col lg:min-h-0">
              <StrategyGraphExplorer
                graphData={strategyData?.knowledgeGraph || { nodes: [], edges: [] }}
                questionBankClues={strategyData?.questionBankClues || []}
              />
            </div>
          )
        )}

        {view === "flashcards" && (
          isLoading ? (
            <div className="card p-8 text-center text-sm text-neutral-400">Loading flashcards...</div>
          ) : error ? (
            <div className="card p-8 text-center text-sm text-rose-500">Error loading data: {error}</div>
          ) : (
            <FlashcardsTab
              geneticsPairs={strategyData?.geneticsPairs || []}
              questionBankClues={strategyData?.questionBankClues || []}
            />
          )
        )}
      </div>
    </DashboardLayout>
  );
}
