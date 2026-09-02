import { describe, it, expect } from 'vitest';
import { SYSTEM_NORMALIZE } from '@/lib/curriculum/disease-reference';
import { canonicalizeSystem } from '@/lib/topic-router';

// Freestanding map: we cannot import the `System` type union at runtime, so the
// canonical FA system vocabulary lives here as the pinned list. Add a new
// canonical system deliberately (and update the list with it) — this test is
// the tripwire that forces a conscious decision instead of a silent new label.
const CANONICAL_SYSTEM_VOCAB = [
  'Cardiovascular',
  'Cell Biology',
  'Endocrine',
  'Ethics',
  'Gastrointestinal',
  'General',
  'Genetics',
  'Head and Neck',
  'Hematology & Oncology',
  'Hepatobiliary',
  'Immune System',
  'Infectious Disease',
  'Integumentary',
  'Lymphatic/Hematologic',
  'Metabolic',
  'Multisystem',
  'Musculoskeletal',
  'Neoplasia',
  'Neurology',
  'Pharmacology',
  'Psychiatry',
  'Public Health',
  'Renal',
  'Reproductive',
  'Respiratory',
];
const CANONICAL_SET = new Set(CANONICAL_SYSTEM_VOCAB);

describe('assumption: SYSTEM_NORMALIZE vocabulary stays canonical', () => {
  it('has a non-trivial map (197 raw labels collapsed)', () => {
    expect(Object.keys(SYSTEM_NORMALIZE).length).toBeGreaterThan(100);
  });

  it('every normalized value belongs to the canonical system vocabulary', () => {
    const values = Object.values(SYSTEM_NORMALIZE);
    const offenders = [...new Set(values.filter((v) => !CANONICAL_SET.has(v)))];
    expect(offenders).toEqual([]);
  });

  it('every value is actually produced by some raw key (no dead canonical label)', () => {
    // Each canonical label should be reachable — otherwise the strategy hub
    // renders a system that enriched data never produces.
    const produced = new Set(Object.values(SYSTEM_NORMALIZE));
    const unreachable = CANONICAL_SYSTEM_VOCAB.filter((c) => !produced.has(c));
    expect(unreachable).toEqual([]);
  });

  it('every key is a non-empty, non-whitespace raw label', () => {
    const keys = Object.keys(SYSTEM_NORMALIZE);
    const bad = keys.filter((k) => !k.trim() || k !== k.trim());
    expect(bad).toEqual([]);
  });
});

describe('assumption: canonicalizeSystem stays total (always returns a usable label)', () => {
  it('never returns empty for any SYSTEM_NORMALIZE key', () => {
    // The two modules intentionally use different canonical schemes
    // (router collapses to its own aliases; disease-reference to display
    // vocab), so router output is NOT required to match the display vocab.
    // The safety contract that DOES hold: canonicalizeSystem is total — it
    // never returns null/empty for a real key, so routing never breaks on a
    // partial match.
    const offenders: [string, string][] = [];
    for (const raw of Object.keys(SYSTEM_NORMALIZE)) {
      const routed = canonicalizeSystem(raw);
      if (!routed || routed.length === 0) offenders.push([raw, routed]);
    }
    expect(offenders).toEqual([]);
  });
});
