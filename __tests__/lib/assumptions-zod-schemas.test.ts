import { describe, it, expect } from 'vitest';
import {
  ExtractedIntelligenceSchema,
  DiscriminatorSchema,
  ClinicalContextSchema,
} from '@/lib/zod-schemas';

// Assumption pin: every required field in the enrichment schema is enforced.
// A missing field or wrong type must fail parse, not silently produce undefined.

function validIntelligence() {
  return {
    questionText: 'A 45-year-old...',
    correctAnswer: 'Pulmonary embolism',
    options: [
      { text: 'Pulmonary embolism', isCorrect: true },
      { text: 'Pneumothorax', isCorrect: false },
    ],
    explanation: 'D-dimer is elevated.',
    educationalObjective: 'Know PE.',
    subject: 'Pathology',
    system: 'Cardiovascular',
    diseaseName: 'Pulmonary Embolism',
    mechanism: 'Thromboembolism',
    highLeverageClues: ['sudden dyspnea'],
    discriminators: [{ distractor: 'Pneumothorax', ruleOutFact: 'No hyperresonance' }],
    clinicalContext: { age: '45-year-old', gender: 'male' },
    keySymptoms: ['dyspnea'],
    prerequisites: ['coagulation cascade'],
  };
}

describe('assumption: Zod schemas enforce enrichment contract', () => {
  it('valid enrichment data passes', () => {
    expect(() => ExtractedIntelligenceSchema.parse(validIntelligence())).not.toThrow();
  });

  it('missing required field (diseaseName) fails', () => {
    const data = validIntelligence();
    delete (data as any).diseaseName;
    expect(() => ExtractedIntelligenceSchema.parse(data)).toThrow();
  });

  it('wrong type (discriminators as strings) fails', () => {
    const data = validIntelligence();
    (data as any).discriminators = ['Pneumothorax'];
    expect(() => ExtractedIntelligenceSchema.parse(data)).toThrow();
  });

  it('empty array for required array field passes (zero discriminators is valid)', () => {
    const data = validIntelligence();
    data.discriminators = [];
    data.highLeverageClues = [];
    data.keySymptoms = [];
    data.prerequisites = [];
    expect(() => ExtractedIntelligenceSchema.parse(data)).not.toThrow();
  });

  it('optional fields can be omitted', () => {
    const data = validIntelligence();
    delete (data as any).nextBestStep;
    delete (data as any).tableData;
    delete (data.clinicalContext).age;
    expect(() => ExtractedIntelligenceSchema.parse(data)).not.toThrow();
  });
});

describe('assumption: DiscriminatorSchema contract', () => {
  it('valid discriminator passes', () => {
    expect(() => DiscriminatorSchema.parse({
      distractor: 'Pneumothorax',
      ruleOutFact: 'No hyperresonance',
    })).not.toThrow();
  });

  it('missing ruleOutFact fails', () => {
    expect(() => DiscriminatorSchema.parse({
      distractor: 'Pneumothorax',
    })).toThrow();
  });
});

describe('assumption: ClinicalContextSchema contract', () => {
  it('all fields optional — empty object passes', () => {
    expect(() => ClinicalContextSchema.parse({})).not.toThrow();
  });

  it('valid context passes', () => {
    expect(() => ClinicalContextSchema.parse({
      age: '65-year-old',
      gender: 'female',
      physiologyState: 'Postmenopausal',
      onsetPattern: 'Acute',
    })).not.toThrow();
  });
});
