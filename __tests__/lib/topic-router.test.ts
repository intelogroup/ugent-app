import { describe, it, expect } from 'vitest';
import { canonicalizeSystem, routeWith } from '@/lib/topic-router';

describe('canonicalizeSystem', () => {
  it('canonicalizes known aliases', () => {
    expect(canonicalizeSystem('Nervous System')).toBe('Neurology');
    expect(canonicalizeSystem('nervous')).toBe('Neurology');
    expect(canonicalizeSystem('Head and Neck')).toBe('Neurology');
    expect(canonicalizeSystem('Digestive System')).toBe('Gastrointestinal');
    expect(canonicalizeSystem('Hepatobiliary')).toBe('Gastrointestinal');
    expect(canonicalizeSystem('Urinary')).toBe('Renal');
    expect(canonicalizeSystem('Endocrine/Reproductive')).toBe('Endocrine');
  });

  it('strips " System" suffix then aliases', () => {
    expect(canonicalizeSystem('Hematologic System')).toBe('Hematology');
    expect(canonicalizeSystem('Immune System')).toBe('Immunology');
  });

  it('splits compound names on "/" and takes first segment', () => {
    expect(canonicalizeSystem('Hematologic / Oncology')).toBe('Hematology');
  });

  it('collapses a compound segment that itself ends in " System"', () => {
    // Regression: "Nervous System, Cardiovascular" split on "," -> "nervous
    // system", which must then strip " system" to hit the alias -> Neurology.
    expect(canonicalizeSystem('Nervous System, Cardiovascular')).toBe('Neurology');
    expect(canonicalizeSystem('Immune System, Respiratory System')).toBe('Immunology');
  });

  it('title-cases unknown systems as fallback', () => {
    expect(canonicalizeSystem('cardiovascular')).toBe('Cardiovascular');
    expect(canonicalizeSystem('respiratory')).toBe('Respiratory');
  });

  it('handles whitespace trimming', () => {
    expect(canonicalizeSystem('  Renal  ')).toBe('Renal');
  });
});

function makeIndex() {
  const phrase = new Map<string, string>([
    ['pulmonary embolism', 'Cardiovascular'],
    ['asthma', 'Respiratory'],
    ['sickle cell disease', 'Hematology'],
    ['diabetes mellitus', 'Endocrine'],
  ]);

  const token = new Map<string, Record<string, number>>([
    ['pulmonary', { Cardiovascular: 12 }],
    ['embolism', { Cardiovascular: 12 }],
    ['asthma', { Respiratory: 9 }],
    ['sickle', { Hematology: 7 }],
    ['cell', { Hematology: 7 }],
    ['diabetes', { Endocrine: 8 }],
  ]);

  return { phrase, token };
}

describe('routeWith', () => {
  const index = makeIndex();

  it('returns phrase match with exact disease name', () => {
    const result = routeWith(index, 'Tell me about pulmonary embolism');
    expect(result.system).toBe('Cardiovascular');
    expect(result.confidence).toBe('phrase');
  });

  it('returns phrase match for single-word disease', () => {
    const result = routeWith(index, 'What is asthma?');
    expect(result.system).toBe('Respiratory');
    expect(result.confidence).toBe('phrase');
  });

  it('falls back to token vote when no phrase matches', () => {
    // "pulmonary emboli" doesn't match "pulmonary embolism" exactly,
    // but token "pulmonary" votes Cardiovascular
    const result = routeWith(index, 'pulmonary emboli symptoms');
    expect(result.system).toBe('Cardiovascular');
    expect(result.confidence).toBe('token');
  });

  it('returns none for completely unknown utterance', () => {
    const result = routeWith(index, 'hello there');
    expect(result.system).toBeNull();
    expect(result.confidence).toBe('none');
  });

  it('token vote picks highest-scoring system', () => {
    const phrase = new Map<string, string>();
    const token = new Map<string, Record<string, number>>([
      ['heart', { Cardiovascular: 5 }],
      ['failure', { Cardiovascular: 3, Renal: 2 }],
    ]);
    const result = routeWith({ phrase, token }, 'heart failure');
    expect(result.system).toBe('Cardiovascular');
    expect(result.confidence).toBe('token');
  });

  it('fuzzy match catches garbled short utterances', () => {
    // Build index with a single-word phrase that fuzzy can match
    const phrase = new Map<string, string>([
      ['asthma', 'Respiratory'],
    ]);
    const token = new Map<string, Record<string, number>>();

    // "asthm" is 1 edit from "asthma" — within fuzzy threshold
    const result = routeWith({ phrase, token }, 'asthm');
    expect(result.system).toBe('Respiratory');
    expect(result.confidence).toBe('fuzzy');
  });

  it('fuzzy tier skipped for long utterances (> 6 words)', () => {
    const phrase = new Map<string, string>([
      ['asthma', 'Respiratory'],
    ]);
    const token = new Map<string, Record<string, number>>();

    // After filtering words <=3 chars ("is" dropped), 7 remain — above FUZZY_MAX_WORDS=6
    const result = routeWith({ phrase, token }, 'what is asthm that causes breathing problems today');
    expect(result.confidence).not.toBe('fuzzy');
  });
});
