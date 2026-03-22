"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo } from "react";

export default function DependencyExplorer() {
  const dependencies = useQuery(api.research.getKnowledgeDependencies, { limit: 20 });

  const graph = useMemo(() => {
    if (!dependencies) return { nodes: [], links: [] };

    const nodesMap = new Map();
    const links = [];

    dependencies.forEach((d) => {
      if (!nodesMap.has(d.from)) {
        nodesMap.set(d.from, { id: d.from, type: "prerequisite" });
      }
      if (!nodesMap.has(d.to)) {
        nodesMap.set(d.to, { id: d.to, type: "disease" });
      }
      links.push({
        source: d.from,
        target: d.to,
        strength: d.strength,
      });
    });

    const nodes = Array.from(nodesMap.values());
    
    // Assign simple positions (circular)
    const centerX = 200;
    const centerY = 200;
    const radius = 150;
    
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      node.x = centerX + radius * Math.cos(angle);
      node.y = centerY + radius * Math.sin(angle);
    });

    return { nodes, links };
  }, [dependencies]);

  if (!dependencies) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 h-[450px]">
        <h3 className="text-xl font-bold mb-4 text-slate-800">Knowledge Dependencies</h3>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[450px] relative overflow-hidden">
      <h3 className="text-xl font-bold mb-2 text-slate-800">Dependency Explorer</h3>
      <p className="text-xs text-slate-400 mb-4">Mapping prerequisites to diseases (Top 20 links)</p>
      
      <div className="w-full h-full flex items-center justify-center">
        <svg viewBox="0 0 400 400" className="w-full h-full max-h-[350px]">
          {/* Links */}
          {graph.links.map((link, i) => {
            const sourceNode = graph.nodes.find(n => n.id === link.source);
            const targetNode = graph.nodes.find(n => n.id === link.target);
            if (!sourceNode || !targetNode) return null;
            
            return (
              <line
                key={i}
                x1={sourceNode.x}
                y1={sourceNode.y}
                x2={targetNode.x}
                y2={targetNode.y}
                stroke="#CBD5E1"
                strokeWidth={Math.min(link.strength, 5)}
                strokeOpacity={0.6}
              />
            );
          })}
          
          {/* Nodes */}
          {graph.nodes.map((node, i) => (
            <g key={i}>
              <circle
                cx={node.x}
                cy={node.y}
                r={node.type === "disease" ? 8 : 6}
                fill={node.type === "disease" ? "#818CF8" : "#FBBF24"}
                className="transition-all duration-300 hover:scale-125 cursor-pointer"
              />
              <text
                x={node.x}
                y={node.y - 12}
                textAnchor="middle"
                fontSize="8"
                className="fill-slate-600 font-medium pointer-events-none select-none"
              >
                {node.id}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="absolute bottom-4 right-4 flex gap-4 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-400"></div>
          <span>Prerequisite</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
          <span>Disease</span>
        </div>
      </div>
    </div>
  );
}
