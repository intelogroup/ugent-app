"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import DashboardLayout from "@/components/DashboardLayout";
import DiseaseProfileTabs from "@/components/strategy/DiseaseProfileTabs";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

type Props = { params: Promise<{ disease: string }> };

export default function DiseaseMasteryPage({ params }: Props) {
  const { disease } = use(params);
  const diseaseName = decodeURIComponent(disease);

  const profile = useQuery(api.strategy.getDiseaseProfile, { diseaseName });
  const questionsData = useQuery(api.strategy.getQuestionsForDisease, { diseaseName });

  const isLoading = profile === undefined || questionsData === undefined;

  const difficultyColor = (d?: string) => {
    if (d === "HARD") return "bg-rose-100 text-rose-700";
    if (d === "MEDIUM") return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/strategy"
            className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{diseaseName}</h1>
            {profile && (
              <p className="text-sm text-neutral-500">
                {profile.questionCount} question{profile.questionCount !== 1 ? "s" : ""} in bank
              </p>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="card p-8 text-center text-sm text-neutral-400">Loading...</div>
        )}

        {!isLoading && !profile && (
          <div className="card p-8 text-center text-sm text-neutral-400">
            No data found for this disease.
          </div>
        )}

        {!isLoading && profile && (
          <>
            <div className="card p-5">
              <DiseaseProfileTabs profile={profile} />
            </div>

            {questionsData && questionsData.length > 0 && (
              <div className="card">
                <div className="p-4 border-b border-neutral-100">
                  <h2 className="text-base font-semibold text-neutral-900">Questions in Bank</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Each question tests a different aspect</p>
                </div>
                <div className="divide-y divide-neutral-100">
                  {questionsData.map(({ pattern, question }, i) => (
                    <div key={i} className="p-4 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {question.difficulty && (
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${difficultyColor(question.difficulty)}`}>
                            {question.difficulty}
                          </span>
                        )}
                        {question.successRate != null && (
                          <span className="text-xs text-neutral-400">
                            {Math.round(question.successRate)}% success rate
                          </span>
                        )}
                      </div>
                      {pattern.mechanism && pattern.mechanism !== "Pending further analysis" && (
                        <p className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded inline-block">
                          Tests: {pattern.mechanism}
                        </p>
                      )}
                      <p className="text-sm text-neutral-700 line-clamp-3">{question.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
