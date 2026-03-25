"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import PatternRadar from "@/components/research/PatternRadar";
import ExtractionLiveFeed from "@/components/research/ExtractionLiveFeed";
import DependencyExplorer from "@/components/research/DependencyExplorer";
import DashboardLayout from "@/components/DashboardLayout";

async function hashBlob(blob: string): Promise<string> {
  const normalized = blob.toLowerCase().replace(/\s+/g, " ").trim();
  const data = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type BlobStatus = {
  preview: string;
  hash: string;
  isDuplicate: boolean | null; // null = checking
};

export default function ResearchIngestPage() {
  const [rawText, setRawText] = useState("");
  const [isIngesting, setIsIngesting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ queued: number; skipped: number } | null>(null);
  const [blobStatuses, setBlobStatuses] = useState<BlobStatus[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const convex = useConvex();
  const startIngestion = useMutation(api.ingest.startIngestion);
  const triggerBatchIfReady = useMutation(api.ingest.triggerBatchIfReady);
  const recentIngestions = useQuery(api.research.getRecentIngestions, { limit: 5 });

  // Debounced dedup scan on text change
  const scanForDuplicates = useCallback(async (text: string) => {
    const blobs = text
      .split("---NEXT-QUESTION---")
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    if (blobs.length === 0) {
      setBlobStatuses([]);
      return;
    }

    // Seed with null (checking state)
    const initial: BlobStatus[] = await Promise.all(
      blobs.map(async (blob) => ({
        preview: blob.slice(0, 80).replace(/\n/g, " "),
        hash: await hashBlob(blob),
        isDuplicate: null,
      }))
    );
    setBlobStatuses(initial);
    setIsChecking(true);

    // Check each hash against DB
    const checked = await Promise.all(
      initial.map(async (item) => {
        const isDuplicate = await convex.query(api.ingest.isQuestionDuplicate, {
          textHash: item.hash,
        });
        return { ...item, isDuplicate };
      })
    );
    setBlobStatuses(checked);
    setIsChecking(false);
  }, [convex]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!rawText.trim()) {
      setBlobStatuses([]);
      setIsChecking(false);
      return;
    }
    debounceRef.current = setTimeout(() => scanForDuplicates(rawText), 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [rawText, scanForDuplicates]);

  const newCount = blobStatuses.filter((b) => b.isDuplicate === false).length;
  const dupCount = blobStatuses.filter((b) => b.isDuplicate === true).length;
  const allDuplicates = blobStatuses.length > 0 && newCount === 0 && !isChecking;

  const handleStartResearch = async () => {
    if (!rawText.trim() || allDuplicates) return;

    setIsIngesting(true);
    setError(null);
    setLastResult(null);

    try {
      let queued = 0;
      let skipped = 0;

      for (const item of blobStatuses) {
        if (item.isDuplicate) { skipped++; continue; }
        const blob = rawText
          .split("---NEXT-QUESTION---")
          .map((q) => q.trim())
          .filter((q) => q.length > 0)[blobStatuses.indexOf(item)];
        const id = await startIngestion({ rawText: blob, totalCount: 1, textHash: item.hash });
        if (!id) { skipped++; continue; }
        queued++;
      }

      await triggerBatchIfReady({});
      setLastResult({ queued, skipped });
      setRawText("");
      setBlobStatuses([]);
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

              {/* Live dedup preview */}
              {blobStatuses.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {isChecking ? "Scanning…" : `${blobStatuses.length} question${blobStatuses.length > 1 ? "s" : ""} detected`}
                  </p>
                  {blobStatuses.map((item, i) => (
                    <div
                      key={item.hash + i}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${
                        item.isDuplicate === null
                          ? "bg-slate-50 border-slate-100 text-slate-400"
                          : item.isDuplicate
                          ? "bg-amber-50 border-amber-100 text-amber-700"
                          : "bg-emerald-50 border-emerald-100 text-emerald-700"
                      }`}
                    >
                      <span className={`shrink-0 font-bold uppercase tracking-widest text-[10px] px-1.5 py-0.5 rounded ${
                        item.isDuplicate === null
                          ? "bg-slate-200 text-slate-500"
                          : item.isDuplicate
                          ? "bg-amber-200 text-amber-800"
                          : "bg-emerald-200 text-emerald-800"
                      }`}>
                        {item.isDuplicate === null ? "…" : item.isDuplicate ? "DUPLICATE" : "NEW"}
                      </span>
                      <span className="truncate opacity-70">{item.preview}</span>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-lg">
                  {error}
                </div>
              )}

              {lastResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-lg flex gap-4">
                  <span>✓ <strong>{lastResult.queued}</strong> queued</span>
                  {lastResult.skipped > 0 && (
                    <span className="text-slate-500">{lastResult.skipped} duplicate{lastResult.skipped > 1 ? "s" : ""} blocked</span>
                  )}
                </div>
              )}

              <button
                onClick={handleStartResearch}
                disabled={isIngesting || isChecking || !rawText.trim() || allDuplicates}
                className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
              >
                {isIngesting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Queueing…
                  </>
                ) : isChecking ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Scanning for duplicates…
                  </>
                ) : allDuplicates ? (
                  `All ${dupCount} already ingested — nothing to queue`
                ) : newCount > 0 ? (
                  `Queue ${newCount} new question${newCount > 1 ? "s" : ""}${dupCount > 0 ? ` (${dupCount} duplicate${dupCount > 1 ? "s" : ""} blocked)` : ""}`
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <h2 className="text-xl font-bold text-slate-800">Recent Ingestions</h2>
              <div className="flex flex-col gap-4">
                {recentIngestions?.map((ingestion: any) => (
                  <div key={ingestion._id} className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-500 truncate max-w-[120px]">
                        {new Date(ingestion.createdAt).toLocaleDateString()}
                      </span>
                      <span className={`${
                        ingestion.status === "completed" ? "text-green-600" :
                        ingestion.status === "skipped" ? "text-orange-500" :
                        ingestion.status === "failed" ? "text-rose-600" :
                        ingestion.status === "pending" ? "text-blue-500" :
                        "text-indigo-600 animate-pulse"
                      } uppercase tracking-wider font-bold`}>
                        {ingestion.status === "pending" ? "waiting for batch" : ingestion.status}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          ingestion.status === "completed" ? "bg-green-500" :
                          ingestion.status === "skipped" ? "bg-orange-400" :
                          ingestion.status === "pending" ? "bg-blue-400" :
                          "bg-indigo-500"
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
                {(!recentIngestions || recentIngestions.length === 0) && (
                  <p className="text-sm text-slate-400 italic py-4">No recent ingestions</p>
                )}
              </div>
            </div>

            <div className="flex-grow min-h-[500px]">
              <ExtractionLiveFeed />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
