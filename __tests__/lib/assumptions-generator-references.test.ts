import { describe, it, expect } from 'vitest';
import { FIRST_AID_MAP, PATHOMA_MAP } from '@/lib/curriculum/analyzer';
import { PHARMACOLOGY_MAP } from '@/lib/curriculum/generator';

// Assumption pin: every canonical system in the curriculum must have a
// reference in FIRST_AID_MAP and PATHOMA_MAP (for block resource assignment),
// and PHARMACOLOGY_MAP (for pharmacology blocks). Missing references cause
// blocks to fall back to generic defaults, silently losing specificity.

const CURRICULUM_SYSTEMS = [
  'Neurology', 'Cardiovascular', 'Respiratory', 'Gastrointestinal',
  'Renal', 'Endocrine', 'Hematology & Oncology', 'Immunology',
  'Infectious Disease', 'Reproductive', 'Musculoskeletal', 'Integumentary',
  'Psychiatry', 'Genetics', 'General', 'Pharmacology',
  'Pediatrics', 'Ophthalmology', 'ENT', 'Biostatistics & Epidemiology',
  'Social Sciences',
];

describe('assumption: FIRST_AID_MAP covers all curriculum systems', () => {
  it('every curriculum system has a FA entry', () => {
    for (const sys of CURRICULUM_SYSTEMS) {
      expect(FIRST_AID_MAP[sys], `FIRST_AID_MAP missing: ${sys}`).toBeDefined();
    }
  });

  it('every entry has non-empty chapter and pages', () => {
    for (const [sys, entry] of Object.entries(FIRST_AID_MAP)) {
      expect(entry.chapter.trim(), `${sys}.chapter empty`).toBeTruthy();
      expect(entry.pages.trim(), `${sys}.pages empty`).toBeTruthy();
    }
  });

  it('every entry has subChapters array', () => {
    for (const [sys, entry] of Object.entries(FIRST_AID_MAP)) {
      expect(Array.isArray(entry.subChapters), `${sys}.subChapters not array`).toBe(true);
    }
  });
});

// Pharmacology not covered by Pathoma — Pathoma is pathology-focused.
const PATHOMA_SYSTEMS = CURRICULUM_SYSTEMS.filter((s) => s !== 'Pharmacology');

describe('assumption: PATHOMA_MAP covers all curriculum systems', () => {
  it('every non-pharmacology system has a Pathoma entry', () => {
    for (const sys of PATHOMA_SYSTEMS) {
      expect(PATHOMA_MAP[sys], `PATHOMA_MAP missing: ${sys}`).toBeDefined();
    }
  });

  it('every entry has non-empty chapter', () => {
    for (const [sys, entry] of Object.entries(PATHOMA_MAP)) {
      expect(entry.chapter.trim(), `${sys}.chapter empty`).toBeTruthy();
    }
  });
});

describe('assumption: PHARMACOLOGY_MAP covers core systems', () => {
  const CORE_PHARMA_SYSTEMS = [
    'Neurology', 'Cardiovascular', 'Respiratory', 'Endocrine',
    'Hematology & Oncology', 'Immunology', 'Infectious Disease',
    'Integumentary', 'Renal', 'Reproductive', 'Musculoskeletal',
    'Gastrointestinal', 'Psychiatry',
  ];

  it('every core system has a pharmacology reference', () => {
    for (const sys of CORE_PHARMA_SYSTEMS) {
      expect(PHARMACOLOGY_MAP[sys], `PHARMACOLOGY_MAP missing: ${sys}`).toBeDefined();
      expect(PHARMACOLOGY_MAP[sys].trim(), `${sys} pharmacology empty`).toBeTruthy();
    }
  });

  it('all references follow "Ch. N – Topic" format', () => {
    for (const [sys, ref] of Object.entries(PHARMACOLOGY_MAP)) {
      expect(ref).toMatch(/^Ch\. \d+ – .+/);
    }
  });
});
