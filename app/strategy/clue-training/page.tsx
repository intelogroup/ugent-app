"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import DashboardLayout from "@/components/DashboardLayout";
import ClueCard from "@/components/strategy/ClueCard";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ClueTrainingPage() {
  const feed = useQuery(api.research.getExtractionFeed, { limit: 50 });
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const cards = useMemo(() => {
    if (!feed) return [];
    return shuffle(
      feed.filter(
        (p) =>
          p.mechanism !== "Pending further analysis" &&
          p.keySymptoms.length > 0
      )
    );
  }, [feed]);

  const current = cards[index];
  const total = cards.length;
  const questionText = useQuery(
    api.questions.getQuestionTextById,
    revealed && current?.questionId ? { id: current.questionId } : "skip"
  );

  const goNext = () => {
    setRevealed(false);
    setIndex((i) => Math.min(i + 1, total - 1));
  };

  const goPrev = () => {
    setRevealed(false);
    setIndex((i) => Math.max(i - 1, 0));
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/strategy"
            className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Clue Training</h1>
            <p className="text-sm text-neutral-500">See symptoms → identify disease → check mechanism tested</p>
          </div>
        </div>

        {feed === undefined && (
          <div className="card p-8 text-center text-sm text-neutral-400">Loading...</div>
        )}

        {feed !== undefined && total === 0 && (
          <div className="card p-8 text-center text-sm text-neutral-400">
            No training cards available. Ingest more questions with extracted patterns.
          </div>
        )}

        {feed !== undefined && total > 0 && current && (
          <>
            <div className="flex items-center justify-between text-sm text-neutral-400">
              <span>{index + 1} / {total}</span>
              <div className="w-48 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all"
                  style={{ width: `${((index + 1) / total) * 100}%` }}
                />
              </div>
            </div>

            <ClueCard
              pattern={{
                diseaseName: current.diseaseName,
                mechanism: current.mechanism,
                keySymptoms: current.keySymptoms,
                clinicalContext: current.clinicalContext,
                questionText: questionText?.text,
              }}
              isRevealed={revealed}
              onReveal={() => setRevealed(true)}
            />

            <div className="flex justify-between">
              <button
                onClick={goPrev}
                disabled={index === 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={goNext}
                disabled={index === total - 1}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Next
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
