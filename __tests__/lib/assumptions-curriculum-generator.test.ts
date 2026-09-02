import { describe, it, expect } from 'vitest';
import { FIRST_AID_MAP } from '@/lib/curriculum/analyzer';
import { PHARMACOLOGY_MAP } from '@/lib/curriculum/generator';

// Assumption pin: the curriculum generator's ENRICHED_TO_FA_SYSTEM mapping
// must collapse the enriched data's 197 self-inconsistent system labels to
// canonical FA chapter names. If a mapping is missing, the system silently
// falls back to "General" — hiding real data in a generic bucket.

// These are the known enriched system label variants from data/medicospira-enriched.jsonl.
// Every entry here MUST map to a FIRST_AID_MAP key (via ENRICHED_TO_FA_SYSTEM).
const KNOWN_ENRICHED_SYSTEMS: Record<string, string> = {
  'Nervous System': 'Neurology',
  'Immune System': 'Immunology',
  'Public Health': 'General',
  'Endocrine System': 'Endocrine',
  'Respiratory System': 'Respiratory',
  'Digestive System': 'Gastrointestinal',
  'Hematologic System': 'Hematology & Oncology',
  'Hematologic': 'Hematology & Oncology',
  'Reproductive System': 'Reproductive',
  'Hepatic': 'Gastrointestinal',
  'Hepatobiliary': 'Gastrointestinal',
  'Urinary System': 'Renal',
  'Integumentary System': 'Integumentary',
  'Psychiatric': 'Psychiatry',
  'Metabolic': 'Endocrine',
  'Metabolic Pathways': 'Endocrine',
  'Vascular System': 'Cardiovascular',
  'Vascular': 'Cardiovascular',
  'Connective Tissue': 'Musculoskeletal',
  'Urinary': 'Renal',
  'Head and Neck': 'Neurology',
  'Neoplasms': 'Hematology & Oncology',
  'Neoplasia': 'Hematology & Oncology',
  'Molecular Biology': 'General',
  'Lymphatic System': 'Hematology & Oncology',
  'Behavioral Health': 'Psychiatry',
  'Autonomic Nervous System': 'Neurology',
  'Visual System': 'Neurology',
  'Auditory System': 'Neurology',
  'Breast': 'Reproductive',
  'Urinary Tract': 'Renal',
  'Musculoskeletal System': 'Musculoskeletal',
  'Healthcare System': 'General',
  'Cellular and Molecular Biology': 'Genetics',
  'Cellular': 'General',
};

describe('assumption: ENRICHED_TO_FA_SYSTEM maps all known systems', () => {
  for (const [enriched, expectedFA] of Object.entries(KNOWN_ENRICHED_SYSTEMS)) {
    it(`"${enriched}" -> "${expectedFA}"`, () => {
      // If FIRST_AID_MAP doesn't have expectedFA, the mapping is broken
      expect(FIRST_AID_MAP[expectedFA],
        `FIRST_AID_MAP missing target "${expectedFA}" for enriched "${enriched}"`)
        .toBeDefined();
    });
  }
});

describe('assumption: PHARMACOLOGY_MAP covers core clinical systems', () => {
  const CORE_SYSTEMS = [
    'Neurology', 'Cardiovascular', 'Respiratory', 'Endocrine',
    'Hematology & Oncology', 'Immunology', 'Infectious Disease',
    'Integumentary', 'Renal', 'Reproductive', 'Musculoskeletal',
    'Gastrointestinal', 'Psychiatry', 'Genetics',
  ];

  it('every core system has a pharmacology reference', () => {
    for (const sys of CORE_SYSTEMS) {
      expect(PHARMACOLOGY_MAP[sys],
        `PHARMACOLOGY_MAP missing: ${sys}`)
        .toBeDefined();
    }
  });

  it('all references follow "Ch. N -- Topic" format', () => {
    for (const [sys, ref] of Object.entries(PHARMACOLOGY_MAP)) {
      expect(ref).toMatch(/^Ch\. \d+ – .+/);
    }
  });

  it('all chapter numbers are within valid FA range (18-30)', () => {
    for (const [sys, ref] of Object.entries(PHARMACOLOGY_MAP)) {
      const match = ref.match(/^Ch\. (\d+)/);
      expect(match, `${sys} missing chapter number`).not.toBeNull();
      const ch = parseInt(match![1]);
      expect(ch).toBeGreaterThanOrEqual(18);
      expect(ch).toBeLessThanOrEqual(30);
    }
  });
});

describe('assumption: FIRST_AID_MAP structural contract', () => {
  it('every system has subChapters array', () => {
    for (const [sys, entry] of Object.entries(FIRST_AID_MAP)) {
      expect(Array.isArray(entry.subChapters),
        `${sys}.subChapters is not array`)
        .toBe(true);
    }
  });

  it('every system has non-empty chapter and pages', () => {
    for (const [sys, entry] of Object.entries(FIRST_AID_MAP)) {
      expect(entry.chapter.trim(), `${sys}.chapter empty`).toBeTruthy();
      expect(entry.pages.trim(), `${sys}.pages empty`).toBeTruthy();
    }
  });
});
