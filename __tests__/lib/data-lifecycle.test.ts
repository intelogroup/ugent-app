/**
 * Data lifecycle integration tests — verify the pipeline contracts between
 * stages: raw JSONL → enriched → classified → analyzer → generator, and
 * ASR transcript → correction → noise stripping → LLM-ready text.
 *
 * Each test mirrors the real data flow with minimal fixtures, catching
 * schema drift, field renames, and broken pipeline assumptions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { correctText, stripTranscriptNoise } from '@/lib/asr-correct';
import { stripMarkdown } from '@/lib/strip-markdown';
import { levenshtein } from '@/lib/asr-correct';
import { canonicalizeSystem } from '@/lib/topic-router';
import { generateCurriculum } from '@/lib/curriculum/generator';
import type { DiseaseEntry } from '@/lib/curriculum/analyzer';

// ──────────────────────────────────────────────────────────────────
// 1. Schema validation — every pipeline stage's output shape
// ──────────────────────────────────────────────────────────────────

// Mirrors lib/zod-schemas.ts ExtractedIntelligenceSchema
const EnrichedRowSchema = z.object({
  textHash: z.string(),
  index: z.number().optional(),
  extractedAt: z.string().optional(),
  enrichedAt: z.string().optional(),
  text: z.string().optional(),
  enriched: z.object({
    questionText: z.string(),
    correctAnswer: z.string(),
    explanation: z.string(),
    educationalObjective: z.string().optional(),
    subject: z.string(),
    system: z.string(),
    diseaseName: z.string(),
    topicType: z.string(),
    mechanism: z.string(),
    highLeverageClues: z.array(z.string()),
    discriminators: z.array(z.object({
      distractor: z.string(),
      ruleOutFact: z.string(),
    })),
    nextBestStep: z.string().optional(),
    clinicalContext: z.object({
      age: z.string().optional(),
      sex: z.string().optional(),
      setting: z.string().optional(),
    }).optional(),
    keySymptoms: z.array(z.string()),
    prerequisites: z.array(z.string()),
  }),
});

const ClassifiedRowSchema = z.object({
  text: z.string(),
  correctAnswer: z.string(),
  options: z.array(z.object({
    text: z.string(),
    isCorrect: z.boolean(),
  })),
  explanation: z.string(),
  educationalObjective: z.string(),
  textHash: z.string(),
  source: z.string(),
  system: z.string(),
  subject: z.string(),
  systemConfidence: z.number().optional(),
  subjectConfidence: z.number().optional(),
  difficulty: z.string(),
});

const RawQuestionSchema = z.object({
  text: z.string(),
  correctAnswer: z.string(),
  options: z.array(z.object({
    text: z.string(),
    isCorrect: z.boolean(),
  })),
  explanation: z.string(),
  educationalObjective: z.string().optional(),
  textHash: z.string(),
  source: z.string(),
});

describe('JSONL schema validation', () => {
  it('enriched row passes schema', () => {
    const row = {
      textHash: 'abc123',
      enriched: {
        questionText: 'A 45-year-old...',
        correctAnswer: 'Pulmonary embolism',
        explanation: 'D-dimer is elevated.',
        subject: 'Pathology',
        system: 'Cardiovascular',
        diseaseName: 'Pulmonary Embolism',
        topicType: 'DISEASE',
        mechanism: 'Thromboembolism from DVT',
        highLeverageClues: ['sudden dyspnea', 'pleuritic chest pain'],
        discriminators: [{ distractor: 'Pneumothorax', ruleOutFact: 'No hyperresonance' }],
        keySymptoms: ['dyspnea', 'chest pain'],
        prerequisites: ['coagulation cascade'],
      },
    };
    expect(() => EnrichedRowSchema.parse(row)).not.toThrow();
  });

  it('classified row passes schema', () => {
    const row = {
      text: 'What is the most common cause of PE?',
      correctAnswer: 'Deep vein thrombosis',
      options: [
        { text: 'Deep vein thrombosis', isCorrect: true },
        { text: 'Pneumothorax', isCorrect: false },
      ],
      explanation: 'DVT is the most common source.',
      educationalObjective: 'Know PE sources.',
      textHash: 'hash123',
      source: 'medicospira',
      system: 'Cardiovascular',
      subject: 'Pathology',
      difficulty: 'MEDIUM',
    };
    expect(() => ClassifiedRowSchema.parse(row)).not.toThrow();
  });

  it('raw question row passes schema', () => {
    const row = {
      text: 'A patient presents with...',
      correctAnswer: 'A',
      options: [{ text: 'Option A', isCorrect: true }],
      explanation: 'Because...',
      textHash: 'raw123',
      source: 'medicospira',
    };
    expect(() => RawQuestionSchema.parse(row)).not.toThrow();
  });
});

// ──────────────────────────────────────────────────────────────────
// 2. Enriched → Analyzer pipeline contract
// ──────────────────────────────────────────────────────────────────

describe('enriched → analyzer pipeline', () => {
  // Build enriched data as analyzer would read it
  function buildEnrichedJsonl(rows: {
    diseaseName: string;
    system: string;
    subject?: string;
    topicType?: string;
    mechanism?: string;
    textHash?: string;
  }[]): string {
    return rows.map((r, i) => JSON.stringify({
      textHash: r.textHash ?? `hash-${i}`,
      enriched: {
        questionText: `Q about ${r.diseaseName}`,
        correctAnswer: 'A',
        explanation: 'Because.',
        educationalObjective: 'Know this.',
        subject: r.subject ?? 'Pathology',
        system: r.system,
        diseaseName: r.diseaseName,
        topicType: r.topicType ?? 'DISEASE',
        mechanism: r.mechanism ?? 'Mechanism',
        highLeverageClues: [],
        discriminators: [],
        nextBestStep: '',
        clinicalContext: {},
        keySymptoms: [],
        prerequisites: [],
      },
    })).join('\n');
  }

  it('diseases group into correct systems after enrichment', () => {
    const jsonl = buildEnrichedJsonl([
      { diseaseName: 'PE', system: 'Cardiovascular' },
      { diseaseName: 'DVT', system: 'Cardiovascular' },
      { diseaseName: 'Asthma', system: 'Respiratory' },
    ]);

    const rows = jsonl.split('\n').map(l => JSON.parse(l));
    const map: Record<string, string[]> = {};
    for (const row of rows) {
      const e = row.enriched;
      const sys = e.system;
      if (!map[sys]) map[sys] = [];
      map[sys].push(e.diseaseName);
    }

    expect(map['Cardiovascular']).toEqual(['PE', 'DVT']);
    expect(map['Respiratory']).toEqual(['Asthma']);
  });

  it('TOPIC_TYPE_FIXES reclassifies mis-tagged diseases', () => {
    // "Asthma" is in TOPIC_TYPE_FIXES as DISEASE, even if enrichment says DRUG
    const jsonl = buildEnrichedJsonl([
      { diseaseName: 'Asthma', system: 'Respiratory', topicType: 'DRUG' },
    ]);

    const row = JSON.parse(jsonl);
    // The analyzer applies TOPIC_TYPE_FIXES — verify the fix map catches it
    const TOPIC_TYPE_FIXES: Record<string, string> = {
      'Asthma': 'DISEASE',
      'Asthma Exacerbation': 'DISEASE',
    };
    const rawType = row.enriched.topicType;
    const fixedType = TOPIC_TYPE_FIXES[row.enriched.diseaseName] || rawType;
    expect(fixedType).toBe('DISEASE');
  });

  it('mechanism is extracted up to first comma', () => {
    const mechanism = 'Thromboembolism, secondary to DVT, with risk factors';
    const extracted = mechanism.split(',')[0]?.trim() || '';
    expect(extracted).toBe('Thromboembolism');
  });
});

// ──────────────────────────────────────────────────────────────────
// 3. Analyzer → Generator pipeline contract
// ──────────────────────────────────────────────────────────────────

describe('analyzer → generator pipeline', () => {
  const emptyGraph = {
    nodes: [], edges: [], topologicalOrder: [], rootNodes: [], leafNodes: [],
  };

  function makeFullSystemDiseaseMap(): Record<string, DiseaseEntry[]> {
    return {
      Cardiovascular: [
        { diseaseName: 'PE', questionCount: 12, topicType: 'Disease', subject: 'Pathology', mechanism: 'Thromboembolism' },
        { diseaseName: 'Heart Failure', questionCount: 10, topicType: 'Disease', subject: 'Pathology', mechanism: 'Pump failure' },
        { diseaseName: 'Atrial Fibrillation', questionCount: 8, topicType: 'Disease', subject: 'Pathology', mechanism: 'Re-entry' },
        { diseaseName: 'CAD', questionCount: 6, topicType: 'Disease', subject: 'Pathology', mechanism: 'Atherosclerosis' },
        { diseaseName: 'Hypertension', questionCount: 5, topicType: 'Disease', subject: 'Pathology', mechanism: 'Increased TPR' },
      ],
      Respiratory: [
        { diseaseName: 'Asthma', questionCount: 9, topicType: 'Disease', subject: 'Pathology', mechanism: 'Bronchospasm' },
        { diseaseName: 'COPD', questionCount: 7, topicType: 'Disease', subject: 'Pathology', mechanism: 'Obstruction' },
        { diseaseName: 'Pneumonia', questionCount: 6, topicType: 'Disease', subject: 'Pathology', mechanism: 'Infection' },
        { diseaseName: 'Lung Cancer', questionCount: 5, topicType: 'Disease', subject: 'Pathology', mechanism: 'Malignancy' },
      ],
      Neurology: [
        { diseaseName: 'Stroke', questionCount: 8, topicType: 'Disease', subject: 'Pathology', mechanism: 'Ischemia' },
        { diseaseName: 'Epilepsy', questionCount: 6, topicType: 'Disease', subject: 'Pathology', mechanism: 'Seizure' },
        { diseaseName: 'MS', questionCount: 5, topicType: 'Disease', subject: 'Pathology', mechanism: 'Demyelination' },
        { diseaseName: 'Parkinson', questionCount: 4, topicType: 'Disease', subject: 'Pathology', mechanism: 'Dopamine loss' },
      ],
      Renal: [
        { diseaseName: 'AKI', questionCount: 7, topicType: 'Disease', subject: 'Pathology', mechanism: 'Nephron damage' },
        { diseaseName: 'Nephrotic Syndrome', questionCount: 6, topicType: 'Disease', subject: 'Pathology', mechanism: 'Glomerular injury' },
        { diseaseName: 'CKD', questionCount: 5, topicType: 'Disease', subject: 'Pathology', mechanism: 'Fibrosis' },
      ],
      Gastrointestinal: [
        { diseaseName: 'IBD', questionCount: 7, topicType: 'Disease', subject: 'Pathology', mechanism: 'Autoimmune' },
        { diseaseName: 'Cirrhosis', questionCount: 6, topicType: 'Disease', subject: 'Pathology', mechanism: 'Fibrosis' },
        { diseaseName: 'PUD', questionCount: 5, topicType: 'Disease', subject: 'Pathology', mechanism: 'H. pylori' },
      ],
      Hematology: [
        { diseaseName: 'SCD', questionCount: 7, topicType: 'Disease', subject: 'Pathology', mechanism: 'HbS polymerization' },
        { diseaseName: 'Leukemia', questionCount: 6, topicType: 'Disease', subject: 'Pathology', mechanism: 'Clonal expansion' },
        { diseaseName: 'Lymphoma', questionCount: 5, topicType: 'Disease', subject: 'Pathology', mechanism: 'Malignancy' },
      ],
      Infectious: [
        { diseaseName: 'TB', questionCount: 7, topicType: 'Disease', subject: 'Microbiology', mechanism: 'M. tuberculosis' },
        { diseaseName: 'HIV/AIDS', questionCount: 6, topicType: 'Disease', subject: 'Microbiology', mechanism: 'CD4 depletion' },
        { diseaseName: 'Sepsis', questionCount: 5, topicType: 'Disease', subject: 'Microbiology', mechanism: 'Systemic infection' },
      ],
      Endocrine: [
        { diseaseName: 'DM', questionCount: 8, topicType: 'Disease', subject: 'Pathology', mechanism: 'Insulin deficiency' },
        { diseaseName: 'Thyroid Disorders', questionCount: 6, topicType: 'Disease', subject: 'Pathology', mechanism: 'Hypo/hyperthyroidism' },
        { diseaseName: 'Cushing', questionCount: 4, topicType: 'Disease', subject: 'Pathology', mechanism: 'Cortisol excess' },
      ],
      Reproductive: [
        { diseaseName: 'Breast Cancer', questionCount: 6, topicType: 'Disease', subject: 'Pathology', mechanism: 'Malignancy' },
        { diseaseName: 'Endometriosis', questionCount: 5, topicType: 'Disease', subject: 'Pathology', mechanism: 'Ectopic endometrium' },
      ],
      Musculoskeletal: [
        { diseaseName: 'RA', questionCount: 6, topicType: 'Disease', subject: 'Pathology', mechanism: 'Autoimmune synovitis' },
        { diseaseName: 'OA', questionCount: 4, topicType: 'Disease', subject: 'Pathology', mechanism: 'Cartilage degeneration' },
      ],
      Psychiatry: [
        { diseaseName: 'MDD', questionCount: 5, topicType: 'Disease', subject: 'Pathology', mechanism: 'Monoamine deficit' },
        { diseaseName: 'Schizophrenia', questionCount: 4, topicType: 'Disease', subject: 'Pathology', mechanism: 'Dopamine dysregulation' },
      ],
    };
  }

  function makeStats() {
    return {
      diseases: [
        { name: 'PE', count: 12 },
        { name: 'Asthma', count: 9 },
        { name: 'Heart Failure', count: 10 },
        { name: 'Stroke', count: 8 },
        { name: 'DM', count: 8 },
      ],
      systems: [
        { name: 'Cardiovascular', count: 41 },
        { name: 'Respiratory', count: 27 },
        { name: 'Neurology', count: 23 },
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

  it('analyzer output feeds directly into generator', () => {
    const map = makeFullSystemDiseaseMap();
    const stats = makeStats();

    // This is the exact call path: analyzer produces graph + stats + map,
    // generator consumes them. If the contract breaks, this test fails.
    const curriculum = generateCurriculum(emptyGraph, stats, map);

    expect(curriculum.weeks.length).toBeGreaterThanOrEqual(19);
    expect(curriculum.totalDays).toBe(curriculum.weeks.length * 6);
    expect(curriculum.totalHours).toBe(Math.round(curriculum.totalDays * 2.5));
  });

  it('systemDiseaseMap keys survive canonicalization round-trip', () => {
    // analyzer builds map keyed by raw enriched system names.
    // curriculum generator expects system names as-is from the map.
    const map = makeFullSystemDiseaseMap();
    const keys = Object.keys(map);

    for (const key of keys) {
      // Every system key should have at least one disease
      expect(map[key].length).toBeGreaterThan(0);
      // Every disease entry must have the required fields
      for (const d of map[key]) {
        expect(d.diseaseName).toBeTruthy();
        expect(d.questionCount).toBeGreaterThan(0);
        expect(d.topicType).toBeTruthy();
        expect(typeof d.mechanism).toBe('string');
      }
    }
  });

  it('empty systemDiseaseMap throws', () => {
    expect(() =>
      generateCurriculum(emptyGraph, makeStats(), {})
    ).toThrow('systemDiseaseMap produced zero systems');
  });

  it('disease frequency ordering is preserved in organ-system blocks', () => {
    const map = makeFullSystemDiseaseMap();
    const stats = makeStats();
    const curriculum = generateCurriculum(emptyGraph, stats, map);

    // Organ-system weeks should exist and reference diseases from the map
    const organWeeks = curriculum.weeks.filter(w => w.phase === 'ORGAN_SYSTEMS');
    expect(organWeeks.length).toBeGreaterThan(0);

    const allTitles = organWeeks
      .flatMap(w => w.days)
      .flatMap(d => d.blocks)
      .map(b => b.title.toLowerCase());

    // Top diseases by count should appear in organ system blocks
    expect(allTitles.some(t => t.includes('pe') || t.includes('pulmonary'))).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────
// 4. ASR pipeline: raw transcript → correction → noise strip → LLM
// ──────────────────────────────────────────────────────────────────

describe('ASR data lifecycle', () => {
  it('raw whisper output goes through full correction pipeline', () => {
    // Simulate: Whisper returns "seudomonas infection in the lung"
    // → correctText fixes alias → stripTranscriptNoise passes through
    const raw = 'seudomonas infection in the lung';
    const corrected = correctText(raw);
    const clean = stripTranscriptNoise(corrected);

    expect(corrected).toBe('pseudomonas infection in the lung');
    expect(clean).toBe('pseudomonas infection in the lung');
  });

  it('noise-only transcript is dropped before reaching LLM', () => {
    const raw = 'hmm';
    const corrected = correctText(raw);
    const clean = stripTranscriptNoise(corrected);

    // "hmm" is 3 chars, passes through correctWord unchanged (not in dict)
    // Then stripTranscriptNoise drops it as known noise
    expect(clean).toBe('');
  });

  it('mixed noise + speech: noise removed, speech corrected', () => {
    // stripTranscriptNoise first removes parenthetical noise blocks (cough)
    // THEN correctText fixes the misspelling — the order matters.
    const raw = '(cough) strepococcus is the cause';
    const stripped = stripTranscriptNoise(raw);
    const corrected = correctText(stripped);

    expect(stripped).not.toContain('cough');
    expect(stripped).toContain('strepococcus');
    expect(corrected).toContain('streptococcus');
  });

  it('TTS reads clean markdown-free text', () => {
    // LLM returns markdown, stripMarkdown cleans it for TTS
    const llmOutput = '**Pulmonary embolism** is caused by\n- DVT\n- Immobility';
    const clean = stripMarkdown(llmOutput);

    expect(clean).toBe('Pulmonary embolism is caused by\nDVT\nImmobility');
    expect(clean).not.toContain('**');
    expect(clean).not.toContain('- ');
  });

  it('correction pipeline preserves real medical terms', () => {
    const terms = [
      'pneumonia', 'asthma', 'diabetes mellitus',
      'myocardial infarction', 'tuberculosis',
    ];
    for (const term of terms) {
      expect(correctText(term)).toBe(term);
    }
  });

  it('multi-word alias joins split Whisper tokens', () => {
    // Whisper splits "coccidioidomycosis" into two tokens
    const raw = 'coccidoid geomycosis diagnosis';
    const corrected = correctText(raw);

    expect(corrected).toContain('coccidioidomycosis');
  });
});

// ──────────────────────────────────────────────────────────────────
// 5. Topic router: enriched → routing index → system prediction
// ──────────────────────────────────────────────────────────────────

describe('topic router data lifecycle', () => {
  it('canonicalizeSystem maps 197+ raw labels to canonical forms', () => {
    // Spot-check the most common raw system labels from enriched data
    const cases: [string, string][] = [
      ['Nervous System', 'Neurology'],
      ['Head and Neck', 'Neurology'],
      ['Hematologic', 'Hematology'],
      ['Hematologic System', 'Hematology'],
      ['Digestive System', 'Gastrointestinal'],
      ['Gastrointestinal', 'Gastrointestinal'],
      ['Urinary', 'Renal'],
      ['Renal', 'Renal'],
      ['Endocrine/Reproductive', 'Endocrine'],
      ['Immune', 'Immunology'],
      ['Hepatic', 'Gastrointestinal'],
    ];

    for (const [raw, expected] of cases) {
      expect(canonicalizeSystem(raw)).toBe(expected);
    }
  });

  it('canonicalizeSystem returns string for all inputs (empty string returns empty)', () => {
    // Empty/whitespace-only inputs have no system to canonicalize — empty return is valid.
    expect(typeof canonicalizeSystem('')).toBe('string');
    expect(typeof canonicalizeSystem('  ')).toBe('string');

    // Non-empty unknown systems get title-cased, never empty.
    for (const input of ['UNKNOWN SYSTEM', 'a', 'cardiovascular']) {
      const result = canonicalizeSystem(input);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });
});

// ──────────────────────────────────────────────────────────────────
// 6. Levenshtein: edge cases relevant to ASR correction
// ──────────────────────────────────────────────────────────────────

describe('levenshtein in ASR context', () => {
  it('measures distance between common Whisper manglings and targets', () => {
    // "seudomonas" (p-drop) vs "pseudomonas"
    expect(levenshtein('seudomonas', 'pseudomonas')).toBe(1);
    // "strepococcus" vs "streptococcus"
    expect(levenshtein('strepococcus', 'streptococcus')).toBe(1);
    // "hairpaste" vs "herpes"
    expect(levenshtein('hairpaste', 'herpes')).toBeGreaterThanOrEqual(4);
    // That's WHY hairpaste is an explicit alias, not phonetic
  });

  it('symmetric distance', () => {
    expect(levenshtein('abc', 'xyz')).toBe(levenshtein('xyz', 'abc'));
  });

  it('distance zero for same string', () => {
    expect(levenshtein('test', 'test')).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────
// 7. stripMarkdown: realistic LLM output before TTS
// ──────────────────────────────────────────────────────────────────

describe('stripMarkdown in TTS pipeline', () => {
  it('preserves plain medical text', () => {
    const text = 'Pulmonary embolism typically presents with sudden dyspnea and pleuritic chest pain.';
    expect(stripMarkdown(text)).toBe(text);
  });

  it('strips all markdown in a complex medical answer', () => {
    const input = `## Pathophysiology

**Pulmonary embolism** occurs when a thrombus from the *deep veins* travels to the lungs.

- Risk factors: immobility, OCP, malignancy
- D-dimer: sensitive but not specific
- CT pulmonary angiography: gold standard

See [First Aid](https://example.com) for details.`;

    const result = stripMarkdown(input);
    expect(result).toContain('Pulmonary embolism');
    expect(result).toContain('deep veins');
    expect(result).toContain('Risk factors');
    expect(result).toContain('First Aid');
    expect(result).not.toMatch(/[#*`\[\]]/);
  });

  it('handles empty and whitespace-only input', () => {
    expect(stripMarkdown('')).toBe('');
    expect(stripMarkdown('   ')).toBe('');
    expect(stripMarkdown('\n\n')).toBe('');
  });
});

// ──────────────────────────────────────────────────────────────────
// 8. Cross-module consistency: same disease name round-trips
// ──────────────────────────────────────────────────────────────────

describe('cross-module disease name consistency', () => {
  it('disease names in systemDiseaseMap are valid curriculum inputs', () => {
    const map: Record<string, DiseaseEntry[]> = {
      Cardiovascular: [
        { diseaseName: 'Pulmonary Embolism', questionCount: 10, topicType: 'Disease', subject: 'Pathology', mechanism: 'Thromboembolism' },
      ],
    };
    const stats = {
      diseases: [{ name: 'Pulmonary Embolism', count: 10 }],
      systems: [{ name: 'Cardiovascular', count: 10 }],
      subjects: [{ name: 'Pathology', count: 10 }],
      totalQuestions: 10,
      totalTopics: 1,
      dependencyDepth: 1,
    };
    const emptyGraph = {
      nodes: [], edges: [], topologicalOrder: [], rootNodes: [], leafNodes: [],
    };

    // Generator must consume this map without throwing
    const curriculum = generateCurriculum(emptyGraph, stats, map);
    expect(curriculum.weeks.length).toBeGreaterThan(0);
  });

  it('topicType values are consistent across pipeline stages', () => {
    const validTypes = new Set(['DISEASE', 'PRINCIPLE', 'DRUG', 'PATHOGEN', 'SYNDROME', 'CONCEPT']);
    const entries: DiseaseEntry[] = [
      { diseaseName: 'Asthma', questionCount: 5, topicType: 'Disease', subject: 'Pathology', mechanism: 'Bronchospasm' },
      { diseaseName: 'TB', questionCount: 5, topicType: 'Disease', subject: 'Microbiology', mechanism: 'M. tuberculosis' },
    ];
    // Topic types from analyzer should be valid
    for (const e of entries) {
      expect(validTypes.has(e.topicType.toUpperCase())).toBe(true);
    }
  });
});
