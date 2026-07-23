"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import {
  ArrowPathIcon,
  ArrowLeftIcon,
  ArrowsPointingOutIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import type {
  KnowledgeGraph,
  KnowledgeGraphEdgeType,
  KnowledgeGraphNode,
  KnowledgeGraphNodeType,
} from "@/lib/strategy/knowledge-graph";

type SigmaInstance = import("sigma").default;
type RelationFilter = KnowledgeGraphEdgeType | "ALL";
type NodeFilter = Exclude<KnowledgeGraphNodeType, "SYSTEM"> | "ALL";

const NODE_STYLES: Record<KnowledgeGraphNodeType, { color: string; label: string }> = {
  SYSTEM: { color: "#0E7490", label: "System" },
  DISEASE: { color: "#2563EB", label: "Disease" },
  PRINCIPLE: { color: "#7C3AED", label: "Principle" },
  DRUG: { color: "#D97706", label: "Drug" },
  PATHOGEN: { color: "#DC2626", label: "Pathogen" },
  SYNDROME: { color: "#DB2777", label: "Syndrome" },
  CONCEPT: { color: "#64748B", label: "Concept" },
};

const SYSTEM_COLORS = [
  "#0E7490", "#2563EB", "#7C3AED", "#C026D3", "#DB2777", "#E11D48",
  "#EA580C", "#D97706", "#65A30D", "#059669", "#0891B2", "#4F46E5",
  "#9333EA", "#BE185D", "#B91C1C", "#C2410C", "#A16207", "#15803D",
  "#0F766E", "#0369A1", "#1D4ED8", "#6D28D9", "#A21CAF", "#9F1239",
];

const PRIMARY_CHILD_LIMIT = 16;
const EXPAND_LIMIT = 32;

const RELATION_LABELS: Record<RelationFilter, string> = {
  ALL: "All relationships",
  BELONGS_TO: "System membership",
  PREREQUISITE_FOR: "Prerequisites",
  SHARES_CONCEPT: "Related system (shared topics)",
};

type QuestionBankClue = {
  id: string;
  diseaseName: string;
  topicType: string;
  system: string;
  clues: string[];
  discriminators: string[];
};

function edgeMatchesRelationFilter(edgeType: KnowledgeGraphEdgeType, relationFilter: RelationFilter): boolean {
  return relationFilter === "ALL" || edgeType === relationFilter;
}

function hashNumber(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

function nodeSize(node: KnowledgeGraphNode, maxSystemQuestions: number): number {
  if (node.type === "SYSTEM") {
    const relativeVolume = Math.pow(node.questionCount / Math.max(maxSystemQuestions, 1), 0.6);
    return 10 + relativeVolume * 24;
  }
  return 5 + Math.min(Math.log2(node.questionCount + 1) * 1.4, 7);
}

function formatRelationship(type: KnowledgeGraphEdgeType): string {
  return RELATION_LABELS[type].replace(/s$/, "");
}

export default function StrategyGraphExplorer({ graphData, questionBankClues = [] }: { graphData: KnowledgeGraph; questionBankClues?: QuestionBankClue[] }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<SigmaInstance | null>(null);
  const draggedPositionsRef = useRef(new Map<string, { x: number; y: number }>());

  const nodeById = useMemo(
    () => new Map(graphData.nodes.map((node) => [node.id, node])),
    [graphData.nodes],
  );
  const systemIds = useMemo(
    () => graphData.nodes.filter((node) => node.type === "SYSTEM").map((node) => node.id),
    [graphData.nodes],
  );
  const maxSystemQuestions = useMemo(
    () => Math.max(...graphData.nodes.filter((node) => node.type === "SYSTEM").map((node) => node.questionCount), 1),
    [graphData.nodes],
  );
  const systemColorMap = useMemo(
    () => new Map(systemIds.map((id, index) => [id, SYSTEM_COLORS[index % SYSTEM_COLORS.length]])),
    [systemIds],
  );
  const colorForNode = useCallback(
    (node: KnowledgeGraphNode) => node.type === "SYSTEM"
      ? systemColorMap.get(node.id) ?? NODE_STYLES.SYSTEM.color
      : NODE_STYLES[node.type].color,
    [systemColorMap],
  );

  const [visibleNodeIds, setVisibleNodeIds] = useState<Set<string>>(() => new Set(systemIds));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusedSystemId, setFocusedSystemId] = useState<string | null>(null);
  const [relationFilter, setRelationFilter] = useState<RelationFilter>("ALL");
  const [nodeFilter, setNodeFilter] = useState<NodeFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAllClues, setShowAllClues] = useState(false);

  type HistorySnapshot = { label: string; visibleNodeIds: Set<string>; focusedSystemId: string | null };
  const [navigationHistory, setNavigationHistory] = useState<HistorySnapshot[]>([]);
  const expandedByRef = useRef(new Map<string, string[]>());

  const questionBankCluesById = useMemo(
    () => new Map(questionBankClues.map((entry) => [entry.id, entry])),
    [questionBankClues],
  );

  useEffect(() => {
    setVisibleNodeIds(new Set(systemIds));
    setSelectedNodeId(null);
    setFocusedSystemId(null);
    setNavigationHistory([]);
    expandedByRef.current.clear();
  }, [systemIds]);

  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null;

  useEffect(() => {
    setShowAllClues(false);
  }, [selectedNodeId]);

  const incidentEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return graphData.edges.filter(
      (edge) => edge.source === selectedNodeId || edge.target === selectedNodeId,
    );
  }, [graphData.edges, selectedNodeId]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length < 2) return [];
    return graphData.nodes
      .filter((node) => node.label.toLowerCase().includes(query))
      .sort((a, b) => {
        const aStarts = a.label.toLowerCase().startsWith(query) ? 1 : 0;
        const bStarts = b.label.toLowerCase().startsWith(query) ? 1 : 0;
        return bStarts - aStarts || b.questionCount - a.questionCount;
      })
      .slice(0, 8);
  }, [graphData.nodes, searchQuery]);

  // Fix #8: know when focusSystem's PRIMARY_CHILD_LIMIT clipped real content, so the UI can offer to load the rest
  const focusedSystemChildren = useMemo(() => {
    if (!focusedSystemId) return [];
    return graphData.edges
      .filter((edge) => edge.type === "BELONGS_TO" && edge.target === focusedSystemId)
      .map((edge) => nodeById.get(edge.source))
      .filter((candidate): candidate is KnowledgeGraphNode => Boolean(candidate))
      .filter((candidate) => nodeFilter === "ALL" || candidate.type === nodeFilter)
      .sort((a, b) => b.questionCount - a.questionCount);
  }, [focusedSystemId, graphData.edges, nodeById, nodeFilter]);

  const hiddenSystemChildrenCount = useMemo(() => {
    if (!focusedSystemId) return 0;
    return focusedSystemChildren.filter((child) => !visibleNodeIds.has(child.id)).length;
  }, [focusedSystemChildren, focusedSystemId, visibleNodeIds]);

  const loadMoreSystemChildren = useCallback(() => {
    setVisibleNodeIds((current) => {
      const next = new Set(current);
      focusedSystemChildren
        .filter((child) => !current.has(child.id))
        .slice(0, PRIMARY_CHILD_LIMIT)
        .forEach((child) => next.add(child.id));
      return next;
    });
  }, [focusedSystemChildren]);

  const focusedCategoryCounts = useMemo(() => {
    const counts = new Map<Exclude<KnowledgeGraphNodeType, "SYSTEM">, number>();
    if (!focusedSystemId) return counts;

    graphData.edges
      .filter((edge) => edge.type === "BELONGS_TO" && edge.target === focusedSystemId)
      .forEach((edge) => {
        const child = nodeById.get(edge.source);
        if (!child || child.type === "SYSTEM") return;
        counts.set(child.type, (counts.get(child.type) ?? 0) + 1);
      });

    return counts;
  }, [focusedSystemId, graphData.edges, nodeById]);

  const pushHistory = useCallback((label: string) => {
    setNavigationHistory((current) => [...current, { label, visibleNodeIds, focusedSystemId }]);
  }, [visibleNodeIds, focusedSystemId]);

  const focusSystem = useCallback((systemId: string, category: NodeFilter = nodeFilter, recordHistory = true) => {
    const systemNode = nodeById.get(systemId);
    if (recordHistory) pushHistory(systemNode?.label ?? "System view");

    const matchingChildren = graphData.edges
      .filter((edge) => edge.type === "BELONGS_TO" && edge.target === systemId)
      .map((edge) => nodeById.get(edge.source))
      .filter((candidate): candidate is KnowledgeGraphNode => Boolean(candidate))
      .filter((candidate) => category === "ALL" || candidate.type === category)
      .sort((a, b) => b.questionCount - a.questionCount);
    const primaryChildren = category === "ALL" ? matchingChildren.slice(0, PRIMARY_CHILD_LIMIT) : matchingChildren;

    setFocusedSystemId(systemId);
    setVisibleNodeIds(new Set([systemId, ...primaryChildren.map((child) => child.id)]));
    expandedByRef.current.clear();
  }, [graphData.edges, nodeById, nodeFilter, pushHistory]);

  const expandNode = useCallback((nodeId: string) => {
    const node = nodeById.get(nodeId);
    if (!node) return;

    if (node.type === "SYSTEM") {
      focusSystem(nodeId);
      return;
    }

    const connected = graphData.edges
      .filter((edge) => edge.source === nodeId || edge.target === nodeId)
      .filter((edge) => edgeMatchesRelationFilter(edge.type, relationFilter))
      .map((edge) => nodeById.get(edge.source === nodeId ? edge.target : edge.source))
      .filter((candidate): candidate is KnowledgeGraphNode => Boolean(candidate))
      .filter((candidate) => candidate.type !== "SYSTEM" || candidate.id === focusedSystemId)
      .filter((candidate) => nodeFilter === "ALL" || candidate.type === "SYSTEM" || candidate.type === nodeFilter)
      .sort((a, b) => b.questionCount - a.questionCount);

    setVisibleNodeIds((current) => {
      const added = connected
        .filter((candidate) => !current.has(candidate.id))
        .slice(0, EXPAND_LIMIT);
      if (added.length === 0) return current;
      const next = new Set(current);
      next.add(nodeId);
      added.forEach((candidate) => next.add(candidate.id));
      expandedByRef.current.set(nodeId, added.map((candidate) => candidate.id));
      return next;
    });
  }, [focusSystem, focusedSystemId, graphData.edges, nodeById, nodeFilter, relationFilter]);

  // Fix #4: remove exactly the nodes a given expand call introduced, unless another visible node still depends on them
  const collapseNode = useCallback((nodeId: string) => {
    const introduced = expandedByRef.current.get(nodeId);
    if (!introduced || introduced.length === 0) return;

    setVisibleNodeIds((current) => {
      const next = new Set(current);
      for (const candidateId of introduced) {
        const stillNeeded = graphData.edges.some((edge) => {
          if (edge.source !== candidateId && edge.target !== candidateId) return false;
          const otherId = edge.source === candidateId ? edge.target : edge.source;
          return otherId !== nodeId && next.has(otherId) && otherId !== candidateId;
        });
        if (!stillNeeded) next.delete(candidateId);
      }
      return next;
    });
    expandedByRef.current.delete(nodeId);
    setSelectedNodeId((current) => (current && introduced.includes(current) ? null : current));
  }, [graphData.edges]);

  const revealNode = useCallback((node: KnowledgeGraphNode) => {
    const memberships = node.type === "SYSTEM" ? [] : graphData.edges
      .filter((edge) => edge.type === "BELONGS_TO" && edge.source === node.id)
      .map((edge) => edge.target);

    pushHistory(`Search: ${node.label}`);

    if (node.type !== "SYSTEM" && memberships[0]) {
      setFocusedSystemId(memberships[0]);
      setVisibleNodeIds(new Set([memberships[0], node.id]));
      expandedByRef.current.clear();
    }
    setSelectedNodeId(node.id);
    expandNode(node.id);
    setSearchQuery("");
    setSearchOpen(false);
  }, [expandNode, graphData.edges, pushHistory]);

  const restoreHistory = useCallback((index: number) => {
    setNavigationHistory((current) => {
      const snapshot = current[index];
      if (!snapshot) return current;
      setVisibleNodeIds(snapshot.visibleNodeIds);
      setFocusedSystemId(snapshot.focusedSystemId);
      setSelectedNodeId(null);
      expandedByRef.current.clear();
      return current.slice(0, index);
    });
  }, []);

  const resetScene = useCallback(() => {
    setVisibleNodeIds(new Set(systemIds));
    setSelectedNodeId(null);
    setFocusedSystemId(null);
    setRelationFilter("ALL");
    setNodeFilter("ALL");
    setSearchQuery("");
    setNavigationHistory([]);
    expandedByRef.current.clear();
    draggedPositionsRef.current.clear();
  }, [systemIds]);

  const renderedNodeIds = useMemo(() => {
    if (nodeFilter === "ALL") return visibleNodeIds;
    return new Set(
      [...visibleNodeIds].filter((id) => {
        const node = nodeById.get(id);
        return node?.type === "SYSTEM" || node?.type === nodeFilter;
      }),
    );
  }, [nodeById, nodeFilter, visibleNodeIds]);

  // Fix #1: clear a selection that has fallen out of the rendered set (e.g. after a filter change or a collapse)
  useEffect(() => {
    if (selectedNodeId && !renderedNodeIds.has(selectedNodeId)) setSelectedNodeId(null);
  }, [selectedNodeId, renderedNodeIds]);

  useEffect(() => {
    if (!containerRef.current || renderedNodeIds.size === 0) return;

    let cancelled = false;
    let renderer: SigmaInstance | null = null;

    async function renderGraph() {
      const [{ default: Sigma }, { EdgeArrowProgram }] = await Promise.all([
        import("sigma"),
        import("sigma/rendering"),
      ]);
      if (cancelled || !containerRef.current) return;

      const compactCanvas = containerRef.current.clientWidth < 640;
      const displayGraph = new Graph({ type: "mixed", multi: true });
      const visibleSystems = systemIds.filter((id) => renderedNodeIds.has(id));
      const systemPosition = new Map<string, { x: number; y: number }>();

      const systemsByVolume = [...visibleSystems].sort((a, b) => (
        (nodeById.get(b)?.questionCount ?? 0) - (nodeById.get(a)?.questionCount ?? 0)
      ));
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));

      systemsByVolume.forEach((id, index) => {
        if (index === 0) {
          systemPosition.set(id, { x: 0, y: 0 });
          return;
        }

        const rank = index / Math.max(systemsByVolume.length - 1, 1);
        const radius = 4.5 + Math.pow(rank, 0.72) * 20;
        const angle = index * goldenAngle - Math.PI / 2;
        systemPosition.set(id, {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        });
      });

      for (const id of renderedNodeIds) {
        const node = nodeById.get(id);
        if (!node) continue;
        const parentSystemId = graphData.edges.find(
          (edge) => edge.type === "BELONGS_TO" && edge.source === id && renderedNodeIds.has(edge.target),
        )?.target;
        const parentPosition = parentSystemId ? systemPosition.get(parentSystemId) : undefined;
        const hash = hashNumber(id);
        const angle = (hash % 360) * Math.PI / 180;
        const distance = 3 + (hash % 7);
        const position = node.type === "SYSTEM"
          ? systemPosition.get(id) ?? { x: 0, y: 0 }
          : {
              x: (parentPosition?.x ?? 0) + Math.cos(angle) * distance,
              y: (parentPosition?.y ?? 0) + Math.sin(angle) * distance,
            };

        displayGraph.addNode(id, {
          x: position.x,
          y: position.y,
          size: nodeSize(node, maxSystemQuestions),
          label: node.label,
          color: colorForNode(node),
          kind: node.type,
          questionCount: node.questionCount,
        });
      }

      for (const edge of graphData.edges) {
        if (!renderedNodeIds.has(edge.source) || !renderedNodeIds.has(edge.target)) continue;
        if (!edgeMatchesRelationFilter(edge.type, relationFilter)) continue;
        if (!displayGraph.hasNode(edge.source) || !displayGraph.hasNode(edge.target)) continue;

        const attributes = {
          relation: edge.type,
          weight: edge.weight,
          size: edge.type === "SHARES_CONCEPT"
            ? Math.min(0.7 + Math.log2(edge.weight + 1) * 0.45, 3)
            : edge.type === "PREREQUISITE_FOR" ? 1.4 : 0.75,
          color: edge.type === "PREREQUISITE_FOR" ? "#94A3B8" : "#CBD5E1",
          type: edge.directed ? "arrow" : "line",
        };

        if (edge.directed) {
          displayGraph.addDirectedEdgeWithKey(edge.id, edge.source, edge.target, attributes);
        } else {
          displayGraph.addUndirectedEdgeWithKey(edge.id, edge.source, edge.target, attributes);
        }
      }

      if (displayGraph.order > visibleSystems.length) {
        forceAtlas2.assign(displayGraph, {
          iterations: displayGraph.order > 120 ? 60 : 100,
          settings: {
            ...forceAtlas2.inferSettings(displayGraph),
            adjustSizes: true,
            gravity: 0.8,
            scalingRatio: 5,
            slowDown: 8,
          },
        });
      }

      draggedPositionsRef.current.forEach((position, id) => {
        if (displayGraph.hasNode(id)) displayGraph.mergeNodeAttributes(id, position);
      });

      const neighborIds = new Set<string>();
      if (selectedNodeId && displayGraph.hasNode(selectedNodeId)) {
        displayGraph.neighbors(selectedNodeId).forEach((id) => neighborIds.add(id));
      }

      renderer = new Sigma(displayGraph, containerRef.current, {
        allowInvalidContainer: false,
        defaultNodeColor: "#64748B",
        defaultEdgeColor: "#CBD5E1",
        edgeProgramClasses: { arrow: EdgeArrowProgram },
        labelColor: { color: "#334155" },
        labelFont: "Inter, ui-sans-serif, system-ui, sans-serif",
        labelSize: compactCanvas ? 10 : 12,
        labelWeight: "600",
        renderEdgeLabels: false,
        stagePadding: compactCanvas ? 64 : 54,
        minCameraRatio: 0.08,
        maxCameraRatio: 8,
        nodeReducer: (id, data) => {
          if (!selectedNodeId) {
            return compactCanvas ? { ...data, label: "" } : data;
          }
          const active = id === selectedNodeId;
          const neighbor = neighborIds.has(id);
          return {
            ...data,
            color: active || neighbor ? data.color : "#DCE3EA",
            size: active ? data.size * 1.25 : data.size,
            highlighted: active,
            label: active || (!compactCanvas && (neighbor || data.kind === "SYSTEM")) ? data.label : "",
            zIndex: active ? 3 : neighbor ? 2 : 1,
          };
        },
        edgeReducer: (id, data) => {
          if (!selectedNodeId) return data;
          const [source, target] = displayGraph.extremities(id);
          const active = source === selectedNodeId || target === selectedNodeId;
          return {
            ...data,
            color: active ? "#06B6D4" : "#E6EBF0",
            size: active ? Math.max(data.size ?? 1, 1.8) : 0.45,
            zIndex: active ? 2 : 1,
          };
        },
      });

      renderer.on("clickNode", ({ node }) => {
        setSelectedNodeId(node);
        expandNode(node);
      });
      renderer.on("clickStage", () => setSelectedNodeId(null));

      let draggedNode: string | null = null;
      let dragMoved = false;
      const mouseCaptor = renderer.getMouseCaptor();

      renderer.on("enterNode", ({ node }) => {
        if (displayGraph.getNodeAttribute(node, "kind") !== "SYSTEM" && containerRef.current) {
          containerRef.current.style.cursor = "grab";
        }
      });
      renderer.on("leaveNode", () => {
        if (!draggedNode && containerRef.current) containerRef.current.style.cursor = "default";
      });
      renderer.on("downNode", ({ node, event }) => {
        if (displayGraph.getNodeAttribute(node, "kind") === "SYSTEM") return;
        draggedNode = node;
        dragMoved = false;
        if (containerRef.current) containerRef.current.style.cursor = "grabbing";
        event.preventSigmaDefault();
      });
      mouseCaptor.on("mousemovebody", (event) => {
        if (!draggedNode || !renderer) return;
        const position = renderer.viewportToGraph(event);
        displayGraph.mergeNodeAttributes(draggedNode, position);
        draggedPositionsRef.current.set(draggedNode, position);
        dragMoved = true;
        event.preventSigmaDefault();
        event.original.preventDefault();
        renderer.refresh({ skipIndexation: true });
      });
      mouseCaptor.on("mouseup", () => {
        if (!draggedNode) return;
        draggedNode = null;
        if (containerRef.current) containerRef.current.style.cursor = dragMoved ? "default" : "grab";
      });
      rendererRef.current = renderer;
    }

    renderGraph();

    return () => {
      cancelled = true;
      renderer?.kill();
      if (rendererRef.current === renderer) rendererRef.current = null;
    };
  }, [colorForNode, expandNode, graphData.edges, maxSystemQuestions, nodeById, relationFilter, renderedNodeIds, selectedNodeId, systemIds]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white lg:min-h-0">
      <div className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1 lg:max-w-sm">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
            placeholder="Search systems, diseases, drugs..."
            className="h-9 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm text-neutral-800 outline-none transition focus:border-cyan-700/40 focus:bg-white focus:ring-2 focus:ring-cyan-700/10"
          />
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-11 z-30 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-xl">
              {searchResults.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => revealNode(node)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-neutral-50"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorForNode(node) }} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800">{node.label}</span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase text-neutral-400">{NODE_STYLES[node.type].label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter node type"
            value={nodeFilter}
            onChange={(event) => {
              const category = event.target.value as NodeFilter;
              setNodeFilter(category);
              if (focusedSystemId) focusSystem(focusedSystemId, category, false);
            }}
            className="h-9 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-medium text-neutral-600 outline-none focus:border-cyan-700/40"
          >
            <option value="ALL">All categories</option>
            {Object.entries(NODE_STYLES).filter(([type]) => type !== "SYSTEM").map(([type, style]) => (
              <option key={type} value={type} disabled={Boolean(focusedSystemId) && !focusedCategoryCounts.has(type as Exclude<KnowledgeGraphNodeType, "SYSTEM">)}>
                {style.label}{focusedSystemId ? ` (${focusedCategoryCounts.get(type as Exclude<KnowledgeGraphNodeType, "SYSTEM">) ?? 0})` : ""}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter relationship"
            value={relationFilter}
            onChange={(event) => setRelationFilter(event.target.value as RelationFilter)}
            className="h-9 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-medium text-neutral-600 outline-none focus:border-cyan-700/40"
          >
            {Object.entries(RELATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <div className="flex h-9 items-center overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <button type="button" title="Zoom out" aria-label="Zoom out" onClick={() => rendererRef.current?.getCamera().animatedUnzoom()} className="grid h-full w-9 place-items-center text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800">
              <MinusIcon className="h-4 w-4" />
            </button>
            <button type="button" title="Zoom in" aria-label="Zoom in" onClick={() => rendererRef.current?.getCamera().animatedZoom()} className="grid h-full w-9 place-items-center border-l border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800">
              <PlusIcon className="h-4 w-4" />
            </button>
            <button type="button" title="Fit graph" aria-label="Fit graph" onClick={() => rendererRef.current?.getCamera().animatedReset()} className="grid h-full w-9 place-items-center border-l border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800">
              <ArrowsPointingOutIcon className="h-4 w-4" />
            </button>
            <button type="button" title="Reset scene" aria-label="Reset scene" onClick={resetScene} className="grid h-full w-9 place-items-center border-l border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800">
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid flex-1 xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative min-h-[560px] bg-[#F8FAFC] xl:min-h-0">
          <div ref={containerRef} className="absolute inset-0" aria-label="Interactive medical knowledge graph" />
          {(focusedSystemId || navigationHistory.length > 0) && (
            <div className="absolute left-4 top-4 z-20 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={resetScene}
                className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-semibold text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 hover:text-neutral-900"
              >
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                All systems
              </button>
              {navigationHistory.map((snapshot, index) => (
                <button
                  key={`${snapshot.label}-${index}`}
                  type="button"
                  onClick={() => restoreHistory(index)}
                  className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-neutral-200 bg-white/90 px-2.5 text-xs font-medium text-neutral-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-neutral-50 hover:text-neutral-800"
                  title={`Back to ${snapshot.label}`}
                >
                  <ChevronRightIcon className="h-3 w-3 text-neutral-300" />
                  {snapshot.label}
                </button>
              ))}
            </div>
          )}
          {focusedSystemId && hiddenSystemChildrenCount > 0 && (
            <button
              type="button"
              onClick={loadMoreSystemChildren}
              className="absolute bottom-4 right-4 z-20 flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-semibold text-[#0E7490] shadow-sm transition-colors hover:bg-cyan-50"
            >
              +{hiddenSystemChildrenCount} more, click to load
            </button>
          )}
          <div className="pointer-events-none absolute bottom-4 left-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-neutral-200/80 bg-white/90 px-3 py-2 text-[10px] font-medium text-neutral-500 shadow-sm backdrop-blur-sm">
            {Object.entries(NODE_STYLES).slice(0, 6).map(([type, style]) => (
              <span key={type} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: style.color }} />
                {style.label}
              </span>
            ))}
          </div>
          <div className="pointer-events-none absolute right-4 top-4 rounded-md bg-white/85 px-2.5 py-1.5 text-[11px] font-medium text-neutral-500 shadow-sm backdrop-blur-sm">
            {renderedNodeIds.size} of {graphData.nodes.length} nodes
          </div>
        </div>

        <aside className="border-t border-neutral-200 bg-white p-5 xl:overflow-y-auto xl:border-l xl:border-t-0" aria-label="Node inspector">
          {selectedNode ? (
            <div className="space-y-5">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorForNode(selectedNode) }} />
                  <span className="text-[11px] font-semibold uppercase text-neutral-400">{NODE_STYLES[selectedNode.type].label}</span>
                </div>
                <h2 className="text-lg! font-semibold leading-snug text-neutral-900">{selectedNode.label}</h2>
                <p className="mt-1 text-xs text-neutral-400">{selectedNode.questionCount.toLocaleString()} associated questions</p>
              </div>

              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200">
                <div className="bg-white p-3">
                  <p className="text-[10px] font-medium uppercase text-neutral-400">Connections</p>
                  <p className="mt-1 text-lg font-semibold text-neutral-900">{incidentEdges.length}</p>
                </div>
                <div className="bg-white p-3">
                  <p className="text-[10px] font-medium uppercase text-neutral-400">Systems</p>
                  <p className="mt-1 text-lg font-semibold text-neutral-900">{selectedNode.systems.length}</p>
                </div>
              </div>

              {selectedNode.systems.length > 0 && (
                <div>
                  <h3 className="text-xs! font-semibold text-neutral-700">Connected systems</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedNode.systems.map((system) => (
                      <span key={system} className="rounded-md bg-cyan-50 px-2 py-1 text-[11px] font-medium text-cyan-800">{system}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.clues.length > 0 && (() => {
                const fullClues = questionBankCluesById.get(selectedNode.id)?.clues ?? selectedNode.clues;
                const cluesToShow = showAllClues ? fullClues : fullClues.slice(0, 3);
                return (
                  <div>
                    <h3 className="text-xs! font-semibold text-neutral-700">High-leverage clues</h3>
                    <ul className="mt-2 space-y-2">
                      {cluesToShow.map((clue) => (
                        <li key={clue} className="border-l-2 border-cyan-600/40 pl-2.5 text-xs leading-5 text-neutral-500">{clue}</li>
                      ))}
                    </ul>
                    {fullClues.length > 3 && (
                      <button type="button" onClick={() => setShowAllClues((current) => !current)} className="mt-1.5 text-[11px] font-semibold text-[#0E7490] hover:underline">
                        {showAllClues ? "Show fewer" : `Show all ${fullClues.length}`}
                      </button>
                    )}
                  </div>
                );
              })()}

              {(questionBankCluesById.get(selectedNode.id)?.discriminators ?? selectedNode.discriminators).length > 0 && (
                <div>
                  <h3 className="text-xs! font-semibold text-neutral-700">How to tell it apart</h3>
                  <ul className="mt-2 space-y-2">
                    {(questionBankCluesById.get(selectedNode.id)?.discriminators ?? selectedNode.discriminators).map((discriminator) => (
                      <li key={discriminator} className="border-l-2 border-rose-500/40 pl-2.5 text-xs leading-5 text-neutral-500">{discriminator}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-2 pt-1">
                {selectedNode.type !== "SYSTEM" && (
                  <button type="button" onClick={() => expandNode(selectedNode.id)} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0E7490] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#155E75]">
                    Expand connections
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                )}
                {selectedNode.type !== "SYSTEM" && selectedNode.type !== "PRINCIPLE" && (
                  <button type="button" onClick={() => router.push(`/strategy/${encodeURIComponent(selectedNode.label)}`)} className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50">
                    Open study page
                  </button>
                )}
                {selectedNode.type !== "SYSTEM" && expandedByRef.current.has(selectedNode.id) && (
                  <button type="button" onClick={() => collapseNode(selectedNode.id)} className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-800">
                    Collapse connections
                  </button>
                )}
              </div>

              {incidentEdges.length > 0 && (
                <div>
                  <h3 className="text-xs! font-semibold text-neutral-700">Relationship summary</h3>
                  <div className="mt-2 space-y-2">
                    {[...new Set(incidentEdges.map((edge) => edge.type))].map((type) => (
                      <div key={type} className="flex items-center justify-between text-xs text-neutral-500">
                        <span>{formatRelationship(type)}</span>
                        <span className="font-semibold text-neutral-700">{incidentEdges.filter((edge) => edge.type === type).length}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-52 flex-col items-center justify-center text-center xl:min-h-full">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-cyan-50 text-[#0E7490]">
                <MagnifyingGlassIcon className="h-5 w-5" />
              </div>
              <h2 className="mt-3 text-sm! font-semibold text-neutral-800">Select a node</h2>
              <p className="mt-1 max-w-[220px] text-xs leading-5 text-neutral-400">Inspect its evidence and connections, then expand its neighborhood.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
