import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock readDataFile before importing analyzer — analyzer calls it at module
// scope to build the systemDiseaseMap via getSystemDiseaseMap.
const mockData: Record<string, string> = {};

vi.mock('@/lib/data-source', () => ({
  readDataFile: vi.fn(async (filename: string) => {
    return mockData[filename] ?? '';
  }),
}));

import { getSystemDiseaseMap } from '@/lib/curriculum/analyzer';

// Helper: build a JSONL line the way the enrichment pipeline emits it.
function enrichedLine(overrides: {
  diseaseName: string;
  system?: string;
  subject?: string;
  topicType?: string;
  mechanism?: string;
  textHash?: string;
}): string {
  return JSON.stringify({
    textHash: overrides.textHash ?? `hash-${overrides.diseaseName}`,
    enriched: {
      questionText: `About ${overrides.diseaseName}`,
      correctAnswer: 'A',
      explanation: 'Because.',
      educationalObjective: 'Know this.',
      subject: overrides.subject ?? 'Pathology',
      system: overrides.system ?? 'Cardiovascular',
      diseaseName: overrides.diseaseName,
      topicType: overrides.topicType ?? 'DISEASE',
      mechanism: overrides.mechanism ?? 'Some mechanism',
      highLeverageClues: [],
      discriminators: [],
      nextBestStep: '',
      clinicalContext: {},
      keySymptoms: [],
      prerequisites: [],
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(mockData)) delete mockData[key];
});

describe('getSystemDiseaseMap', () => {
  it('groups diseases by system', async () => {
    mockData['medicospira-enriched.jsonl'] = [
      enrichedLine({ diseaseName: 'Asthma', system: 'Respiratory' }),
      enrichedLine({ diseaseName: 'COPD', system: 'Respiratory' }),
      enrichedLine({ diseaseName: 'Heart Failure', system: 'Cardiovascular' }),
    ].join('\n');

    const map = await getSystemDiseaseMap();
    expect(Object.keys(map)).toContain('Respiratory');
    expect(Object.keys(map)).toContain('Cardiovascular');
    expect(map['Respiratory']).toHaveLength(2);
    expect(map['Cardiovascular']).toHaveLength(1);
  });

  it('sorts diseases within each system by question count descending', async () => {
    mockData['medicospira-enriched.jsonl'] = [
      enrichedLine({ diseaseName: 'Rare disease', system: 'Cardiovascular', textHash: 'h1' }),
      enrichedLine({ diseaseName: 'Common disease', system: 'Cardiovascular', textHash: 'h2' }),
      enrichedLine({ diseaseName: 'Common disease', system: 'Cardiovascular', textHash: 'h3' }),
    ].join('\n');

    const map = await getSystemDiseaseMap();
    expect(map['Cardiovascular'][0].diseaseName).toBe('Common disease');
    expect(map['Cardiovascular'][0].questionCount).toBe(2);
    expect(map['Cardiovascular'][1].diseaseName).toBe('Rare disease');
    expect(map['Cardiovascular'][1].questionCount).toBe(1);
  });

  it('skips entries with diseaseName "Unknown"', async () => {
    mockData['medicospira-enriched.jsonl'] = [
      enrichedLine({ diseaseName: 'Unknown', system: 'Cardiovascular' }),
      enrichedLine({ diseaseName: 'Asthma', system: 'Respiratory' }),
    ].join('\n');

    const map = await getSystemDiseaseMap();
    expect(Object.keys(map)).not.toContain('Cardiovascular');
    expect(map['Respiratory']).toHaveLength(1);
  });

  it('skips malformed JSON lines', async () => {
    mockData['medicospira-enriched.jsonl'] = [
      'not valid json',
      enrichedLine({ diseaseName: 'Asthma', system: 'Respiratory' }),
    ].join('\n');

    const map = await getSystemDiseaseMap();
    expect(map['Respiratory']).toHaveLength(1);
  });

  it('applies TOPIC_TYPE_FIXES to reclassify diseases tagged as DRUG', async () => {
    // "Asthma" is in TOPIC_TYPE_FIXES as DISEASE — even if enriched data says DRUG
    mockData['medicospira-enriched.jsonl'] = [
      enrichedLine({
        diseaseName: 'Asthma',
        system: 'Respiratory',
        topicType: 'DRUG',  // enrichment misclassified
      }),
    ].join('\n');

    const map = await getSystemDiseaseMap();
    expect(map['Respiratory'][0].topicType).toBe('DISEASE');
  });

  it('extracts first mechanism segment before comma', async () => {
    mockData['medicospira-enriched.jsonl'] = [
      enrichedLine({
        diseaseName: 'Test Disease',
        mechanism: 'Primary mechanism, secondary detail, tertiary',
      }),
    ].join('\n');

    const map = await getSystemDiseaseMap();
    expect(map['Cardiovascular'][0].mechanism).toBe('Primary mechanism');
  });

  it('defaults system to General when missing', async () => {
    mockData['medicospira-enriched.jsonl'] = [
      JSON.stringify({
        textHash: 'h1',
        enriched: {
          diseaseName: 'Mystery Disease',
          // no system field
        },
      }),
    ].join('\n');

    const map = await getSystemDiseaseMap();
    expect(map['General']).toHaveLength(1);
  });

  it('returns empty map for empty input', async () => {
    mockData['medicospira-enriched.jsonl'] = '';
    const map = await getSystemDiseaseMap();
    expect(Object.keys(map)).toHaveLength(0);
  });

  it('handles diseases across many systems', async () => {
    mockData['medicospira-enriched.jsonl'] = [
      enrichedLine({ diseaseName: 'D1', system: 'Neurology' }),
      enrichedLine({ diseaseName: 'D2', system: 'Endocrine' }),
      enrichedLine({ diseaseName: 'D3', system: 'Hematology' }),
      enrichedLine({ diseaseName: 'D4', system: 'Renal' }),
      enrichedLine({ diseaseName: 'D5', system: 'Gastrointestinal' }),
    ].join('\n');

    const map = await getSystemDiseaseMap();
    expect(Object.keys(map).length).toBe(5);
    for (const sys of Object.values(map)) {
      expect(sys).toHaveLength(1);
    }
  });
});
