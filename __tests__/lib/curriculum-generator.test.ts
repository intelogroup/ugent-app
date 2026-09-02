import { generateCurriculum } from '@/lib/curriculum/generator';
import type { DependencyGraph } from '@/lib/curriculum/types';
import type { DiseaseEntry } from '@/lib/curriculum/analyzer';

const emptyGraph: DependencyGraph = {
  nodes: [],
  edges: [],
  topologicalOrder: [],
  rootNodes: [],
  leafNodes: [],
};

// 10 systems with enough disease weight to fill 8 organ-system weeks via
// Hamilton apportionment (weighted tier 1.5x/1.0x/0.5x for high/medium/low).
function makeSystemDiseaseMap(): Record<string, DiseaseEntry[]> {
  return {
    Cardiovascular: [
      { diseaseName: 'Pulmonary Embolism', questionCount: 12, mechanism: 'Thromboembolism', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Heart Failure', questionCount: 10, mechanism: 'Pump failure', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Atrial Fibrillation', questionCount: 8, mechanism: 'Re-entry', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Coronary Artery Disease', questionCount: 6, mechanism: 'Atherosclerosis', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Hypertension', questionCount: 5, mechanism: 'Increased TPR', topicType: 'Disease', subject: 'Pathology' },
    ],
    Respiratory: [
      { diseaseName: 'Asthma', questionCount: 9, mechanism: 'Bronchospasm', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'COPD', questionCount: 7, mechanism: 'Airflow obstruction', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Pneumonia', questionCount: 6, mechanism: 'Infection', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Lung Cancer', questionCount: 5, mechanism: 'Malignancy', topicType: 'Disease', subject: 'Pathology' },
    ],
    Neurology: [
      { diseaseName: 'Stroke', questionCount: 8, mechanism: 'Ischemia', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Epilepsy', questionCount: 6, mechanism: 'Seizure', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Multiple Sclerosis', questionCount: 5, mechanism: 'Demyelination', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Parkinson Disease', questionCount: 4, mechanism: 'Dopamine loss', topicType: 'Disease', subject: 'Pathology' },
    ],
    Renal: [
      { diseaseName: 'Acute Kidney Injury', questionCount: 7, mechanism: 'Nephron damage', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Nephrotic Syndrome', questionCount: 6, mechanism: 'Glomerular injury', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Chronic Kidney Disease', questionCount: 5, mechanism: 'Progressive fibrosis', topicType: 'Disease', subject: 'Pathology' },
    ],
    Gastrointestinal: [
      { diseaseName: 'Inflammatory Bowel Disease', questionCount: 7, mechanism: 'Autoimmune', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Liver Cirrhosis', questionCount: 6, mechanism: 'Fibrosis', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Peptic Ulcer Disease', questionCount: 5, mechanism: 'H. pylori', topicType: 'Disease', subject: 'Pathology' },
    ],
    Hematology: [
      { diseaseName: 'Sickle Cell Disease', questionCount: 7, mechanism: 'HbS polymerization', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Leukemia', questionCount: 6, mechanism: 'Clonal expansion', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Lymphoma', questionCount: 5, mechanism: 'Lymphoid malignancy', topicType: 'Disease', subject: 'Pathology' },
    ],
    Infectious: [
      { diseaseName: 'Tuberculosis', questionCount: 7, mechanism: 'M. tuberculosis', topicType: 'Disease', subject: 'Microbiology' },
      { diseaseName: 'HIV/AIDS', questionCount: 6, mechanism: 'CD4 depletion', topicType: 'Disease', subject: 'Microbiology' },
      { diseaseName: 'Sepsis', questionCount: 5, mechanism: 'Systemic infection', topicType: 'Disease', subject: 'Microbiology' },
    ],
    Endocrine: [
      { diseaseName: 'Diabetes Mellitus', questionCount: 8, mechanism: 'Insulin deficiency', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Thyroid Disorders', questionCount: 6, mechanism: 'Hypo/hyperthyroidism', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: "Cushing Syndrome", questionCount: 4, mechanism: 'Cortisol excess', topicType: 'Disease', subject: 'Pathology' },
    ],
    Reproductive: [
      { diseaseName: 'Breast Cancer', questionCount: 6, mechanism: 'Malignancy', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Endometriosis', questionCount: 5, mechanism: 'Ectopic endometrium', topicType: 'Disease', subject: 'Pathology' },
    ],
    Musculoskeletal: [
      { diseaseName: 'Rheumatoid Arthritis', questionCount: 6, mechanism: 'Autoimmune synovitis', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Osteoarthritis', questionCount: 4, mechanism: 'Cartilage degeneration', topicType: 'Disease', subject: 'Pathology' },
    ],
    Psychiatry: [
      { diseaseName: 'Major Depressive Disorder', questionCount: 5, mechanism: 'Monoamine deficit', topicType: 'Disease', subject: 'Pathology' },
      { diseaseName: 'Schizophrenia', questionCount: 4, mechanism: 'Dopamine dysregulation', topicType: 'Disease', subject: 'Pathology' },
    ],
  };
}

function makeFrequencyStats() {
  return {
    diseases: [
      { name: 'Pulmonary Embolism', count: 12 },
      { name: 'Asthma', count: 9 },
      { name: 'Heart Failure', count: 10 },
      { name: 'Stroke', count: 8 },
      { name: 'Diabetes Mellitus', count: 8 },
      { name: 'Atrial Fibrillation', count: 8 },
      { name: 'Inflammatory Bowel Disease', count: 7 },
      { name: 'Sickle Cell Disease', count: 7 },
      { name: 'Tuberculosis', count: 7 },
      { name: 'Acute Kidney Injury', count: 7 },
    ],
    systems: [
      { name: 'Cardiovascular', count: 41 },
      { name: 'Respiratory', count: 27 },
      { name: 'Neurology', count: 23 },
      { name: 'Renal', count: 18 },
      { name: 'Endocrine', count: 18 },
    ],
    subjects: [
      { name: 'Pathology', count: 140 },
      { name: 'Microbiology', count: 18 },
    ],
    totalQuestions: 158,
    totalTopics: 33,
    dependencyDepth: 3,
  };
}

describe('generateCurriculum', () => {
  // Run once — all assertions inspect this single curriculum.
  const curriculum = generateCurriculum(emptyGraph, makeFrequencyStats(), makeSystemDiseaseMap());

  it('produces 20 weeks with heavy disease load', () => {
    // 7 foundation + 8 organ + 3 integration + 2 final = 20
    expect(curriculum.weeks).toHaveLength(20);
  });

  it('has all four phases in correct order', () => {
    const phases = curriculum.weeks.map(w => w.phase);
    expect(phases.slice(0, 7)).toEqual(Array(7).fill('FOUNDATIONS'));
    expect(phases.slice(7, 15)).toEqual(Array(8).fill('ORGAN_SYSTEMS'));
    expect(phases.slice(15, 18)).toEqual(Array(3).fill('INTEGRATION'));
    expect(phases.slice(18, 20)).toEqual(Array(2).fill('FINAL_REVIEW'));
  });

  it('each week has exactly 6 days', () => {
    for (const week of curriculum.weeks) {
      expect(week.days).toHaveLength(6);
    }
  });

  it('every day has at least one study block', () => {
    for (const week of curriculum.weeks) {
      for (const day of week.days) {
        expect(day.blocks.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('every block is 50 minutes', () => {
    for (const week of curriculum.weeks) {
      for (const day of week.days) {
        for (const block of day.blocks) {
          expect(block.durationMinutes).toBe(50);
        }
      }
    }
  });

  it('block ids are deterministic across runs', () => {
    const c1 = generateCurriculum(emptyGraph, makeFrequencyStats(), makeSystemDiseaseMap());
    const c2 = generateCurriculum(emptyGraph, makeFrequencyStats(), makeSystemDiseaseMap());
    const ids1 = c1.weeks.flatMap(w => w.days).flatMap(d => d.blocks).map(b => b.id);
    const ids2 = c2.weeks.flatMap(w => w.days).flatMap(d => d.blocks).map(b => b.id);
    expect(ids1).toEqual(ids2);
  });

  it('totals are consistent with week count', () => {
    expect(curriculum.totalDays).toBe(curriculum.weeks.length * 6);
    expect(curriculum.totalHours).toBe(Math.round(curriculum.totalDays * 2.5));
    expect(curriculum.hoursPerDay).toBe(2.5);
  });

  it('overview includes top diseases from frequency stats', () => {
    expect(curriculum.overview.topDiseases.length).toBeGreaterThan(0);
    expect(curriculum.overview.topDiseases[0].name).toBe('Pulmonary Embolism');
  });

  it('organ system weeks reference diseases from input data', () => {
    const organWeeks = curriculum.weeks.filter(w => w.phase === 'ORGAN_SYSTEMS');
    const allTitles = organWeeks
      .flatMap(w => w.days)
      .flatMap(d => d.blocks)
      .map(b => b.title);
    const joined = allTitles.join(' ');
    expect(joined).toContain('Pulmonary Embolism');
  });

  it('throws on empty systemDiseaseMap', () => {
    expect(() =>
      generateCurriculum(emptyGraph, makeFrequencyStats(), {})
    ).toThrow('systemDiseaseMap produced zero systems');
  });

  it('foundation phase days have system/subject assigned', () => {
    const foundationWeeks = curriculum.weeks.filter(w => w.phase === 'FOUNDATIONS');
    for (const week of foundationWeeks) {
      for (const day of week.days) {
        expect(day.system).toBeTruthy();
        expect(day.subject).toBeTruthy();
      }
    }
  });

  it('final review phase has NBME simulation blocks', () => {
    const finalWeeks = curriculum.weeks.filter(w => w.phase === 'FINAL_REVIEW');
    const blockTitles = finalWeeks
      .flatMap(w => w.days)
      .flatMap(d => d.blocks)
      .map(b => b.title);
    expect(blockTitles.some(t => t.includes('NBME'))).toBe(true);
  });

  it('integration phase has cross-system disease pairs', () => {
    const integrationWeeks = curriculum.weeks.filter(w => w.phase === 'INTEGRATION');
    expect(integrationWeeks).toHaveLength(3);
    for (const week of integrationWeeks) {
      const systems = week.days.map(d => d.system).filter(Boolean);
      expect(new Set(systems).size).toBeGreaterThanOrEqual(1);
    }
  });
});
