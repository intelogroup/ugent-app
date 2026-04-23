"use client";

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 min-h-[360px]">
        <h3 className="text-lg font-bold mb-4 text-slate-800">Top Diseases</h3>
        <div className="h-[280px] w-full">
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
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 min-h-[360px]">
        <h3 className="text-lg font-bold mb-4 text-slate-800">Top Clues</h3>
        <div className="h-[280px] w-full">
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
      </div>
    </div>
  );
}
