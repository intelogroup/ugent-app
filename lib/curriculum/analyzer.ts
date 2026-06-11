import fs from 'fs';
import path from 'path';
import type {
  TopicNode,
  DependencyGraph,
  EnrichedData,
  TopicType,
} from './types';

export const FIRST_AID_MAP: Record<string, { chapter: string; pages: string }> = {
  Neurology: { chapter: 'Neurology', pages: '458-499' },
  Respiratory: { chapter: 'Respiratory', pages: '558-577' },
  Gastrointestinal: { chapter: 'Gastrointestinal', pages: '327-363' },
  Cardiovascular: { chapter: 'Cardiovascular', pages: '256-297' },
  'Hematology & Oncology': { chapter: 'Hematology & Oncology', pages: '364-411' },
  Immunology: { chapter: 'Immunology', pages: '94-113' },
  'Infectious Disease': { chapter: 'Microbiology', pages: '114-183' },
  Endocrine: { chapter: 'Endocrine', pages: '298-326' },
  Integumentary: { chapter: 'Musculoskeletal, Skin, CT', pages: '412-457' },
  Renal: { chapter: 'Renal', pages: '500-527' },
  Reproductive: { chapter: 'Reproductive', pages: '528-557' },
  Musculoskeletal: { chapter: 'Musculoskeletal, Skin, CT', pages: '412-457' },
  Psychiatry: { chapter: 'Psychiatry', pages: '466-489' },
  Pediatrics: { chapter: 'Reproductive', pages: '557' },
  General: { chapter: 'General Principles', pages: '1-93' },
  Pharmacology: { chapter: 'Pharmacology', pages: '184-255' },
  Genetics: { chapter: 'General Principles', pages: '42-62' },
};

export const PATHOMA_MAP: Record<string, string> = {
  Neurology: 'Ch. 17 – CNS Pathology',
  Respiratory: 'Ch. 9 – Respiratory Tract Pathology',
  Gastrointestinal: 'Ch. 10 – GI Tract, Ch. 11 – Liver/Gallbladder/Pancreas',
  Cardiovascular: 'Ch. 7 – Vascular, Ch. 8 – Cardiac Pathology',
  'Hematology & Oncology': 'Ch. 3 – Neoplasia, Ch. 4-6 – Blood Disorders',
  Immunology: 'Ch. 2 – Inflammation & Wound Healing',
  'Infectious Disease': '(covered across all organ system chapters)',
  Endocrine: 'Ch. 15 – Endocrine Pathology',
  Integumentary: 'Ch. 19 – Skin Pathology',
  Renal: 'Ch. 12 – Kidney & Urinary Tract',
  Reproductive: 'Ch. 13 – Female Genital, Ch. 14 – Male Genital',
  Musculoskeletal: 'Ch. 18 – Musculoskeletal Pathology',
  Psychiatry: '(covered in FA Psychiatry, not Pathoma)',
  Pediatrics: '(covered across relevant organ chapters)',
  Genetics: 'Ch. 3 – Neoplasia (inheritance patterns, oncogenes, tumor suppressors)',
  General: 'Ch. 1 – Cell Injury & Death, Ch. 2 – Inflammation',
};

const SYSTEM_PHYSIOLOGY_ORDER: string[] = [
  'Genetics',
  'Cardiovascular',
  'Respiratory',
  'Renal',
  'Gastrointestinal',
  'Endocrine',
  'Neurology',
  'Musculoskeletal',
  'Reproductive',
  'Hematology & Oncology',
  'Integumentary',
  'Immunology',
  'Pharmacology',
  'Infectious Disease',
  'Psychiatry',
  'Pediatrics',
];

function normalizeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parsePrerequisites(prereqTexts: string[], _system: string): string[] {
  const ids: string[] = [];

  for (const text of prereqTexts) {
    const lower = text.toLowerCase();

    if (lower.includes('coagulation cascade') || lower.includes('hemostasis')) {
      ids.push('principle-coagulation-cascade');
    } else if (lower.includes('renin') || lower.includes('raas')) {
      ids.push('principle-raas');
    } else if (lower.includes('sympathetic') || lower.includes('adrenergic') || lower.includes('autonomic')) {
      ids.push('principle-autonomic-nervous-system');
    } else if (lower.includes('parasympathetic') || lower.includes('cholinergic')) {
      ids.push('principle-autonomic-nervous-system');
    } else if (lower.includes('hypersensitivity type')) {
      ids.push('principle-hypersensitivity');
    } else if (lower.includes('vitamin d') || lower.includes('calcium')) {
      ids.push('principle-calcium-phosphate-homeostasis');
    } else if (lower.includes('gnrh') || lower.includes('lh') || lower.includes('fsh') || lower.includes('hypothalamic-pituitary')) {
      ids.push('principle-hypothalamic-pituitary-axis');
    } else if (lower.includes('action potential') || lower.includes('depolarization')) {
      ids.push('principle-action-potential');
    } else if (lower.includes('virchow triad') || lower.includes('thrombo')) {
      ids.push('principle-thrombosis');
    } else if (lower.includes('glomerular') || lower.includes('gfr') || lower.includes('tubular')) {
      ids.push('principle-renal-physiology');
    } else if (lower.includes('ventilation') || lower.includes('perfusion') || lower.includes('gas exchange')) {
      ids.push('principle-respiratory-physiology');
    } else if (lower.includes('cardiac output') || lower.includes('starling') || lower.includes('cardiac cycle')) {
      ids.push('principle-cardiovascular-physiology');
    } else if (lower.includes('acid-base') || lower.includes('acid base')) {
      ids.push('principle-acid-base');
    } else if (lower.includes('inflammation') || lower.includes('cytokine')) {
      ids.push('principle-inflammation');
    } else if (lower.includes('complement')) {
      ids.push('principle-complement-system');
    } else if (lower.includes('immunoglobulin') || lower.includes('antibody')) {
      ids.push('principle-immunoglobulins');
    } else if (lower.includes('cell cycle') || lower.includes('apoptosis') || lower.includes('necrosis')) {
      ids.push('principle-cell-injury-death');
    } else if (lower.includes('phrenic nerve') || lower.includes('innervation')) {
      ids.push('principle-nerve-innervation');
    } else if (lower.includes('sensitivity') || lower.includes('specificity') || lower.includes('ppv') || lower.includes('npv')) {
      ids.push('principle-diagnostic-testing');
    } else if (lower.includes('case-control') || lower.includes('cohort') || lower.includes('study design')) {
      ids.push('principle-study-design');
    } else if (lower.includes('opioid') || lower.includes('mu receptor')) {
      ids.push('principle-opioid-pharmacology');
    } else if (lower.includes('pupillary') || lower.includes('pupil')) {
      ids.push('principle-pupillary-reflex');
    } else {
      ids.push(`concept-${normalizeId(text).slice(0, 60)}`);
    }
  }

  return [...new Set(ids)];
}

export function analyzeQuestions(): {
  graph: DependencyGraph;
  topicMap: Map<string, TopicNode>;
  allNodes: TopicNode[];
  frequencyStats: {
    diseases: { name: string; count: number }[];
    systems: { name: string; count: number }[];
    subjects: { name: string; count: number }[];
    topicTypes: { name: string; count: number }[];
    totalQuestions: number;
    totalTopics: number;
    dependencyDepth: number;
  };
  systemDiseaseMap: Record<string, DiseaseEntry[]>;
} {
  const questionHashes = new Set<string>();
  const topicMap = new Map<string, TopicNode>();
  const systemCount: Record<string, number> = {};
  const subjectCount: Record<string, number> = {};
  const typeCount: Record<string, number> = {};

  const nodes: TopicNode[] = [];
  const edges: { from: string; to: string }[] = [];

  function addNode(node: TopicNode) {
    if (!topicMap.has(node.id)) {
      topicMap.set(node.id, node);
      nodes.push(node);
    } else {
      const existing = topicMap.get(node.id)!;
      existing.questionCount += node.questionCount;
      existing.questionIds.push(...node.questionIds);
      existing.highLeverageClues.push(...node.highLeverageClues);
      existing.discriminators.push(...node.discriminators);
      if (node.subject && !existing.subject) {
        existing.subject = node.subject;
        existing.system = node.system;
      }
    }
  }

  // Load classified questions for subject/system frequency
  const classifiedPath = path.resolve(process.cwd(), 'data/classified-questions.jsonl');
  if (fs.existsSync(classifiedPath)) {
    const lines = fs.readFileSync(classifiedPath, 'utf-8').trim().split('\n');
    for (const line of lines) {
      try {
        const q = JSON.parse(line);
        const h = q.textHash;
        if (h) questionHashes.add(h);
        if (q.subject) subjectCount[q.subject] = (subjectCount[q.subject] || 0) + 1;
        if (q.system) systemCount[q.system] = (systemCount[q.system] || 0) + 1;
      } catch { /* skip malformed lines */ }
    }
  }

  // Load enriched questions for topic extraction
  const enrichedPath = path.resolve(process.cwd(), 'data/medicospira-enriched.jsonl');
  if (fs.existsSync(enrichedPath)) {
    const lines = fs.readFileSync(enrichedPath, 'utf-8').trim().split('\n');
    for (const line of lines) {
      try {
        const raw = JSON.parse(line);
        const e: EnrichedData = raw.enriched;
        const h = raw.textHash || e.questionText?.slice(0, 64);
        if (!e || !e.diseaseName) continue;

        const topicType: TopicType = e.topicType || 'DISEASE';
        const diseaseId = `disease-${normalizeId(e.diseaseName)}`;
        const subject = e.subject || '';
        const system = e.system || '';

        typeCount[topicType] = (typeCount[topicType] || 0) + 1;

        const prereqIds = parsePrerequisites(e.prerequisites || [], system);

        const node: TopicNode = {
          id: diseaseId,
          name: e.diseaseName,
          type: topicType,
          subject,
          system,
          questionCount: 1,
          prerequisites: prereqIds,
          dependsOn: prereqIds,
          questionIds: [h],
          discriminators: (e.discriminators || []).map(d => d.distractor),
          highLeverageClues: e.highLeverageClues || [],
        };

        addNode(node);

        for (const prereqId of prereqIds) {
          edges.push({ from: prereqId, to: diseaseId });
          if (!topicMap.has(prereqId)) {
            const conceptNode: TopicNode = {
              id: prereqId,
              name: prereqId.replace(/^principle-|^concept-/, '').replace(/-/g, ' '),
              type: 'PRINCIPLE',
              subject: 'Physiology',
              system,
              questionCount: 0,
              prerequisites: [],
              dependsOn: [],
              questionIds: [],
              discriminators: [],
              highLeverageClues: [],
            };
            addNode(conceptNode);
          }
        }
      } catch { /* skip */ }
    }
  }

  // Topological sort (Kahn's algorithm)
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    if (!inDegree.has(node.id)) inDegree.set(node.id, 0);
    if (!adj.has(node.id)) adj.set(node.id, []);
  }

  for (const edge of edges) {
    if (!adj.has(edge.from)) adj.set(edge.from, []);
    adj.get(edge.from)!.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    if (!inDegree.has(edge.from)) inDegree.set(edge.from, 0);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  let maxDepth = 0;
  const depth = new Map<string, number>();
  for (const id of queue) depth.set(id, 0);

  const topologicalOrder: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    topologicalOrder.push(current);
    const currentDepth = depth.get(current) || 0;
    maxDepth = Math.max(maxDepth, currentDepth);

    for (const neighbor of adj.get(current) || []) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      depth.set(neighbor, Math.max(depth.get(neighbor) || 0, currentDepth + 1));
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  // Sort nodes for display: by dependency depth, then by question count
  const sortedNodes = [...nodes].sort((a, b) => {
    const aDepth = depth.get(a.id) || 0;
    const bDepth = depth.get(b.id) || 0;
    if (aDepth !== bDepth) return aDepth - bDepth;
    return b.questionCount - a.questionCount;
  });

  const rootNodes = topologicalOrder.filter(id => (depth.get(id) || 0) === 0);
  const leafNodes = topologicalOrder.filter(id => !adj.has(id) || adj.get(id)!.length === 0);

  const graph: DependencyGraph = {
    nodes: sortedNodes,
    edges,
    topologicalOrder,
    rootNodes,
    leafNodes,
  };

  const frequencyStats = {
    diseases: Object.entries(
      sortedNodes
        .filter(n => n.type === 'DISEASE')
        .reduce((acc, n) => {
          acc[n.name] = (acc[n.name] || 0) + n.questionCount;
          return acc;
        }, {} as Record<string, number>)
    )
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    systems: Object.entries(systemCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    subjects: Object.entries(subjectCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    topicTypes: Object.entries(typeCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    totalQuestions: questionHashes.size,
    totalTopics: nodes.length,
    dependencyDepth: maxDepth,
  };

  return { graph, topicMap, allNodes: nodes, frequencyStats, systemDiseaseMap: getSystemDiseaseMap() };
}

export interface DiseaseEntry {
  diseaseName: string;
  questionCount: number;
  topicType: string;
  subject: string;
  mechanism: string;
}

export function getSystemDiseaseMap(): Record<string, DiseaseEntry[]> {
  const map: Record<string, DiseaseEntry[]> = {};

  const enrichedPath = path.resolve(process.cwd(), 'data/medicospira-enriched.jsonl');
  if (!fs.existsSync(enrichedPath)) return map;

  const lines = fs.readFileSync(enrichedPath, 'utf-8').trim().split('\n');
  for (const line of lines) {
    try {
      const raw = JSON.parse(line);
      const e = raw.enriched;
      if (!e || !e.diseaseName || e.diseaseName === 'Unknown') continue;

      const system = e.system || 'General';
      const disease = e.diseaseName;
      const topicType = e.topicType || 'DISEASE';

      if (!map[system]) map[system] = [];

      const existing = map[system].find(d => d.diseaseName === disease);
      if (existing) {
        existing.questionCount++;
      } else {
        map[system].push({
          diseaseName: disease,
          questionCount: 1,
          topicType,
          subject: e.subject || '',
          mechanism: e.mechanism?.split(',')[0]?.trim() || '',
        });
      }
    } catch { /* skip */ }
  }

  // Sort diseases within each system by frequency (descending)
  for (const sys of Object.keys(map)) {
    map[sys].sort((a, b) => b.questionCount - a.questionCount);
  }

  return map;
}
