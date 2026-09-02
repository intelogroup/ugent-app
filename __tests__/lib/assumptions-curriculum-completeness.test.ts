import { describe, it, expect } from 'vitest';
import { generateCurriculum } from '@/lib/curriculum/generator';
import type { DependencyGraph, StudyDay, StudyBlock } from '@/lib/curriculum/types';
import type { DiseaseEntry } from '@/lib/curriculum/analyzer';

const emptyGraph: DependencyGraph = {
  nodes: [], edges: [], topologicalOrder: [], rootNodes: [], leafNodes: [],
};

// Minimal but real system-weighted map so organ weeks actually get allocated.
function minimalMap(): Record<string, DiseaseEntry[]> {
  return {
    Cardiovascular: [
      { diseaseName: 'Pulmonary Embolism', questionCount: 40, mechanism: 'Thromboembolism', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Heart Failure', questionCount: 30, mechanism: 'Pump failure', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Atrial Fibrillation', questionCount: 20, mechanism: 'Re-entry', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'CAD', questionCount: 15, mechanism: 'Atherosclerosis', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'HTN', questionCount: 10, mechanism: 'Increased TPR', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Aortic Stenosis', questionCount: 6, mechanism: 'Valve calcification', topicType: 'Disease', subject: 'Pathology' },
    ],
    Respiratory: [
      { diseaseName: 'Asthma', questionCount: 25, mechanism: 'Bronchospasm', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'COPD', questionCount: 20, mechanism: 'Airflow obstruction', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Pneumonia', questionCount: 15, mechanism: 'Infection', topicType: 'Disease', subject: 'Pathology' },
    ],
    Renal: [
      { diseaseName: 'AKI', questionCount: 12, mechanism: 'Nephron damage', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Nephrotic Syndrome', questionCount: 8, mechanism: 'Glomerular injury', topicType: 'Disease', subject: 'Pathology' },
    ],
  };
}

const curriculum = generateCurriculum(emptyGraph, {
  diseases: [],
  systems: [],
  subjects: [],
  totalQuestions: 0,
  totalTopics: 0,
  dependencyDepth: 0,
}, minimalMap());

function allDays(): StudyDay[] {
  return curriculum.weeks.flatMap((w) => w.days);
}

function allBlocks(): StudyBlock[] {
  return allDays().flatMap((d) => d.blocks);
}

describe('assumption: generated curriculum is structurally complete', () => {
  it('fixed phases are exact (7 foundation / 3 integration / 2 final)', () => {
    const counts = curriculum.weeks.reduce<Record<string, number>>((m, w) => {
      m[w.phase] = (m[w.phase] ?? 0) + 1;
      return m;
    }, {});
    expect(counts.FOUNDATIONS).toBe(7);
    expect(counts.INTEGRATION).toBe(3);
    expect(counts.FINAL_REVIEW).toBe(2);
  });

  it('organ weeks respect the 8-week budget cap (data-dependent, never exceeds)', () => {
    const organ = curriculum.weeks.filter((w) => w.phase === 'ORGAN_SYSTEMS');
    // Fewer than 8 is fine (not enough disease pairs to fill); more than 8 is a bug.
    expect(organ.length).toBeGreaterThanOrEqual(1);
    expect(organ.length).toBeLessThanOrEqual(8);
  });

  it('every day has exactly 3 or 4 study blocks', () => {
    for (const day of allDays()) {
      expect([3, 4]).toContain(day.blocks.length);
    }
  });

  it('every day totalMinutes equals the sum of its block durations', () => {
    for (const day of allDays()) {
      const sum = day.blocks.reduce((s, b) => s + b.durationMinutes, 0);
      expect(day.totalMinutes).toBe(sum);
    }
  });

  it('every READING block carries a non-empty First Aid reference', () => {
    for (const b of allBlocks().filter((x) => x.type === 'READING')) {
      expect(b.resources?.firstAid).toBeTruthy();
    }
  });

  it('every VIDEO block carries a non-empty Pathoma reference', () => {
    for (const b of allBlocks().filter((x) => x.type === 'VIDEO')) {
      expect(b.resources?.pathoma).toBeTruthy();
    }
  });

  it('every block has a unique id across the whole curriculum', () => {
    const ids = allBlocks().map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('block ids are deterministically stable (same input -> same ids)', () => {
    const c2 = generateCurriculum(emptyGraph, {
      diseases: [], systems: [], subjects: [],
      totalQuestions: 0, totalTopics: 0, dependencyDepth: 0,
    }, minimalMap());
    const ids1 = allBlocks().map((b) => b.id);
    const ids2 = c2.weeks.flatMap((w) => w.days).flatMap((d) => d.blocks).map((b) => b.id);
    expect(ids1).toEqual(ids2);
  });
});
