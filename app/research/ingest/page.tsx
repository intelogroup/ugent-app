"use client";

import { useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import PatternRadar from "@/components/research/PatternRadar";
import ExtractionLiveFeed from "@/components/research/ExtractionLiveFeed";
import DependencyExplorer from "@/components/research/DependencyExplorer";
import Sidebar from "@/components/Sidebar";
import DashboardLayout from "@/components/DashboardLayout";

export default function ResearchIngestPage() {
  const [rawText, setRawText] = useState("");
  const [isIngesting, setIsIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startIngestion = useMutation(api.ingest.startIngestion);
  const extractIntelligence = useAction(api.ai.extractIntelligence);
  const recentIngestions = useQuery(api.research.getRecentIngestions, { limit: 5 });

  const handleStartResearch = async () => {
    if (!rawText.trim()) return;

    setIsIngesting(true);
    setError(null);

    try {
      const questionBlobs = rawText
        .split("---NEXT-QUESTION---")
        .map((q) => q.trim())
        .filter((q) => q.length > 0);

      const totalCount = questionBlobs.length;

      // 1. Create ingestion record
      const ingestionId = await startIngestion({
        rawText,
        totalCount,
      });

      // 2. Trigger AI extraction (non-blocking)
      extractIntelligence({
        ingestionId,
        rawText,
      }).catch((err) => {
        console.error("AI Extraction failed:", err);
      });

      setRawText("");
    } catch (err: any) {
      setError(err.message || "Failed to start ingestion");
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Research Ingestion Dashboard</h1>
          <p className="text-slate-500">Stage 1: Bulk Medical Intelligence Extraction Pipeline</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Ingestion Form */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Bulk Question Ingestion</h2>
                <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">Delimiter: ---NEXT-QUESTION---</span>
              </div>
              
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste USMLE questions and explanations here... Separate with ---NEXT-QUESTION---"
                className="w-full h-64 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-sm font-mono bg-slate-50"
              />

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <button
                onClick={handleStartResearch}
                disabled={isIngesting || !rawText.trim()}
                className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
              >
                {isIngesting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Starting Research...
                  </>
                ) : (
                  "Start Extraction Engine"
                )}
              </button>
            </div>

            {/* Pattern Radar */}
            <PatternRadar />
            
            {/* Dependency Explorer */}
            <DependencyExplorer />
          </div>

          {/* Sidebar: Status & Live Feed */}
          <div className="lg:col-span-1 flex flex-col gap-8 h-full">
            {/* Progress Tracking */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <h2 className="text-xl font-bold text-slate-800">Recent Ingestions</h2>
              <div className="flex flex-col gap-4">
                {recentIngestions?.map((ingestion) => (
                  <div key={ingestion._id} className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-500 truncate max-w-[120px]">
                        {new Date(ingestion.createdAt).toLocaleDateString()}
                      </span>
                      <span className={`${
                        ingestion.status === 'completed' ? 'text-green-600' : 
                        ingestion.status === 'failed' ? 'text-rose-600' : 'text-indigo-600 animate-pulse'
                      } uppercase tracking-wider font-bold`}>
                        {ingestion.status}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          ingestion.status === 'completed' ? 'bg-green-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${(ingestion.processedCount / ingestion.totalCount) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{ingestion.processedCount} / {ingestion.totalCount} extracted</span>
                      <span>{Math.round((ingestion.processedCount / ingestion.totalCount) * 100)}%</span>
                    </div>
                  </div>
                ))}
                {!recentIngestions || recentIngestions.length === 0 && (
                  <p className="text-sm text-slate-400 italic py-4">No recent ingestions</p>
                )}
              </div>
            </div>

            {/* Live Feed */}
            <div className="flex-grow min-h-[500px]">
                <ExtractionLiveFeed />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
