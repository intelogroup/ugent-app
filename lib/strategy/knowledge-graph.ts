import type { TopicType } from '@/lib/curriculum/types';

export type KnowledgeGraphNodeType = TopicType | 'SYSTEM';

export type KnowledgeGraphNode = {
  id: string;
  label: string;
  type: KnowledgeGraphNodeType;
  questionCount: number;
  systems: string[];
  clues: string[];
  discriminators: string[];
};

export type KnowledgeGraphEdgeType =
  | 'BELONGS_TO'
  | 'PREREQUISITE_FOR'
  | 'SHARES_CONCEPT';

export type KnowledgeGraphEdge = {
  id: string;
  source: string;
  target: string;
  type: KnowledgeGraphEdgeType;
  weight: number;
  directed: boolean;
};

export type KnowledgeGraph = {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
};

export function systemNodeId(system: string): string {
  return `system:${system.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}
