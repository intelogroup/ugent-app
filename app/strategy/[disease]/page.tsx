"use client";

import { use, useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import DiseaseProfileTabs from "@/components/strategy/DiseaseProfileTabs";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

const TOPIC_TYPE_COLORS: Record<string, string> = {
  DISEASE:   "bg-blue-50 text-blue-600 border-blue-200",
  PATHOGEN:  "bg-orange-50 text-orange-600 border-orange-200",
  PRINCIPLE: "bg-purple-50 text-purple-600 border-purple-200",
  DRUG:      "bg-teal-50 text-teal-600 border-teal-200",
  SYNDROME:  "bg-pink-50 text-pink-600 border-pink-200",
  CONCEPT:   "bg-neutral-100 text-neutral-500 border-neutral-200",
};

type Props = { params: Promise<{ disease: string }> };

export default function DiseaseMasteryPage({ params }: Props) {
  const { disease } = use(params);
  const diseaseName = decodeURIComponent(disease);

  const [profile, setProfile] = useState<any>(null);
  const [questionsData, setQuestionsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDisease() {
      try {
        const res = await fetch(`/api/strategy/${encodeURIComponent(diseaseName)}`);
        if (!res.ok) throw new Error("Failed to load disease profile");
        const data = await res.json();
        setProfile(data.profile);
        setQuestionsData(data.questions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDisease();
  }, [diseaseName]);

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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-neutral-900">{diseaseName}</h1>
              {profile?.topicType && (
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border ${TOPIC_TYPE_COLORS[profile.topicType] ?? TOPIC_TYPE_COLORS.CONCEPT}`}>
                  {profile.topicType}
                </span>
              )}
            </div>
            {profile && (
              <p className="text-sm text-neutral-500 mt-0.5">
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
