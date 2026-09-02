import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockData: Record<string, string> = {};
vi.mock('@/lib/data-source', () => ({
  readDataFile: vi.fn(async (filename: string) => mockData[filename] ?? ''),
}));

import { getDiseaseReference } from '@/lib/curriculum/disease-reference';
import type { SystemDiseaseGroup } from '@/lib/curriculum/disease-reference';

function line(name: string, overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    enriched: {
      diseaseName: name,
      // 'Metabolic' is NOT a REFERENCE_DISEASES key, so injected 0-count
      // reference diseases won't pollute count-sensitive assertions below.
      system: 'Metabolic',
      mechanism: 'Mechanism',
      topicType: 'DISEASE',
      keySymptoms: ['fever'],
      discriminators: [{ distractor: 'Not It' }],
      highLeverageClues: ['clue'],
      ...overrides,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(mockData)) delete mockData[k];
});

describe('assumption: getDiseaseReference aggregates correctly', () => {
  it('groups by system and applies SYSTEM_NORMALIZE', async () => {
    mockData['medicospira-enriched.jsonl'] = [
      line('Asthma', { system: 'Respiratory System' }), // -> Respiratory
      line('Heart Failure', { system: 'Cardiovascular' }),
    ].join('\n');

    const result = await getDiseaseReference();
    const systems = result.map((g) => g.system);
    expect(systems).toContain('Respiratory');
    expect(systems).toContain('Cardiovascular');
  });

  it('accumulates question count across rows with the same disease', async () => {
    mockData['medicospira-enriched.jsonl'] = [
      line('Asthma'), line('Asthma'), line('COPD'),
    ].join('\n');

    const result = await getDiseaseReference();
    const cardio = result.find((g) => g.system === 'Metabolic')!;
    const asthma = cardio.diseases.find((d) => d.diseaseName === 'Asthma')!;
    expect(asthma.questionCount).toBe(2);
  });

  it('sorts diseases alphabetically within a system', async () => {
    mockData['medicospira-enriched.jsonl'] = [
      line('Zebra Disease'), line('Alpha Disease'),
    ].join('\n');

    const cardio = (await getDiseaseReference()).find((g) => g.system === 'Metabolic')!;
    const names = cardio.diseases.map((d) => d.diseaseName);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('sorts top-level systems by totalQuestions descending', async () => {
    mockData['medicospira-enriched.jsonl'] = [
      line('A', { system: 'Metabolic' }),
      line('B', { system: 'Neoplasia' }),
      line('B2', { system: 'Neoplasia' }),
    ].join('\n');

    const result = await getDiseaseReference();
    expect(result[0].system).toBe('Neoplasia'); // 2 questions
    expect(result[1].system).toBe('Metabolic');
  });

  it('computes totalQuestions and totalDiseases from the disease list', async () => {
    mockData['medicospira-enriched.jsonl'] = [
      line('A'), line('A'), line('B'), line('C'),
    ].join('\n');

    const cardio = (await getDiseaseReference()).find((g) => g.system === 'Metabolic')!;
    expect(cardio.totalQuestions).toBe(4);
    expect(cardio.totalDiseases).toBe(3);
  });

  it('skips diseaseName "Unknown" and rows without a disease name', async () => {
    mockData['medicospira-enriched.jsonl'] = [
      line('Unknown'),
      JSON.stringify({ enriched: { system: 'Cardiovascular' } }), // no diseaseName
      line('Real Disease'),
    ].join('\n');

    const cardio = (await getDiseaseReference()).find((g) => g.system === 'Metabolic')!;
    const names = cardio.diseases.map((d) => d.diseaseName);
    expect(names).toEqual(['Real Disease']);
  });

  it('defaults missing system to General', async () => {
    mockData['medicospira-enriched.jsonl'] = [
      JSON.stringify({ enriched: { diseaseName: 'Mystery Disease' } }),
    ].join('\n');

    const result = await getDiseaseReference();
    expect(result.some((g) => g.system === 'General')).toBe(true);
  });

  it('injects reference-only diseases with questionCount 0', async () => {
    // 'Integumentary' is in REFERENCE_DISEASES — its listed diseases get injected
    mockData['medicospira-enriched.jsonl'] = [
      line('Eczema', { system: 'Integumentary' }),
    ].join('\n');

    const integ = (await getDiseaseReference()).find((g) => g.system === 'Integumentary')!;
    // At least one injected 0-count reference disease beyond the row-supplied Eczema
    const zero = integ.diseases.filter((d) => d.questionCount === 0);
    expect(zero.length).toBeGreaterThan(0);
    expect(integ.diseases.some((d) => d.diseaseName === 'Eczema' && d.questionCount === 1)).toBe(true);
  });

  it('caps discriminators at 10 per disease', async () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ distractor: `D${i}` }));
    mockData['medicospira-enriched.jsonl'] = [
      line('A', { discriminators: many }),
    ].join('\n');

    const cardio = (await getDiseaseReference()).find((g) => g.system === 'Metabolic')!;
    expect(cardio.diseases[0].discriminators.length).toBe(10);
  });

  it('ignores malformed JSON lines', async () => {
    mockData['medicospira-enriched.jsonl'] = [
      'not json',
      line('A'),
    ].join('\n');

    const cardio = (await getDiseaseReference()).find((g) => g.system === 'Metabolic')!;
    expect(cardio.diseases).toHaveLength(1);
  });
});
