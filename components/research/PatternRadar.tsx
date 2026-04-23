"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export default function PatternRadar() {
  const [isReady, setIsReady] = useState(false);
  const topDiseases = useQuery(api.research.getTopPatternsByCount, {
    type: "DISEASE",
    limit: 6,
  });
  const topClues = useQuery(api.research.getTopPatternsByCount, {
    type: "CLUE",
    limit: 6,
  });

  const data = topDiseases?.map((d) => ({
    subject: d.name,
    count: d.count,
    fullMark: Math.max(...(topDiseases.map(x => x.count) || [100])),
  })) || [];

  const clueData = topClues?.map((c) => ({
    subject: c.name,
    count: c.count,
    fullMark: Math.max(...(topClues.map(x => x.count) || [100])),
  })) || [];

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsReady(true));
    return () => {
      cancelAnimationFrame(frame);
      setIsReady(false);
    };
  }, []);

  const chartFallback = (
    <div className="flex h-[280px] items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400">
      Loading chart…
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="min-w-0 min-h-[360px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-bold mb-4 text-slate-800">Top Diseases</h3>
        {isReady ? (
          <div className="h-[280px] min-w-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" fontSize={10} />
                <PolarRadiusAxis />
                <Radar
                  name="Disease Frequency"
                  dataKey="count"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          chartFallback
        )}
      </div>

      <div className="min-w-0 min-h-[360px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-bold mb-4 text-slate-800">Top Clues</h3>
        {isReady ? (
          <div className="h-[280px] min-w-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={clueData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" fontSize={10} />
                <PolarRadiusAxis />
                <Radar
                  name="Clue Frequency"
                  dataKey="count"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          chartFallback
        )}
      </div>
    </div>
  );
}
