"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function ExtractionLiveFeed() {
  const extractionFeed = useQuery(api.research.getExtractionFeed, { limit: 10 });

  if (!extractionFeed) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h3 className="text-xl font-bold mb-4 text-slate-800">Extraction Live Feed</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-slate-100 h-24 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <h3 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2">
        <span className="flex h-3 w-3 rounded-full bg-green-500 animate-pulse"></span>
        Extraction Live Feed
      </h3>
      <div className="flex-grow overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
        {extractionFeed.map((item) => (
          <div key={item._id} className="p-4 bg-slate-50 rounded-lg border border-slate-100 transition-all hover:bg-slate-100">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-lg text-slate-900">{item.diseaseName}</h4>
              <span className="text-xs text-slate-400">
                {new Date(item._creationTime).toLocaleTimeString()}
              </span>
            </div>
            
            <div className="mb-3">
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Mechanism</span>
              <p className="text-sm text-slate-700 leading-relaxed mt-1">{item.mechanism}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">High-Leverage Clues</span>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(item.highLeverageClues ?? []).map((clue, idx) => (
                    <span key={idx} className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] rounded-full border border-amber-100">
                      {clue}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Discriminators</span>
                <ul className="mt-2 space-y-1">
                  {(item.discriminators ?? []).slice(0, 3).map((d, idx) => (
                    <li key={idx} className="text-[10px] text-slate-600 list-disc list-inside">
                      <span className="font-semibold">{d.distractor}:</span> {d.ruleOutFact}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {item.questionText && (
                <details className="mt-4">
                    <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">View Source Question</summary>
                    <p className="mt-2 text-[10px] text-slate-500 line-clamp-3 italic">&quot;{item.questionText}&quot;</p>
                </details>
            )}
          </div>
        ))}
        {extractionFeed.length === 0 && (
          <div className="flex items-center justify-center h-48 text-slate-400 italic">
            Waiting for ingestions to start...
          </div>
        )}
      </div>
    </div>
  );
}
