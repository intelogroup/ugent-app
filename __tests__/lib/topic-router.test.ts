import { routeTopic, routeWith, __test } from '@/lib/topic-router';

describe('routeTopic (real enriched data)', () => {
  it('routes disease phrases to the correct system', async () => {
    expect((await routeTopic('tell me about nephrotic syndrome')).system).toBe('Renal');
    expect((await routeTopic('explain pheochromocytoma')).system).toBe('Endocrine');
    expect((await routeTopic('how does asthma present')).system).toBe('Respiratory');
  });

  it('reports phrase-level confidence when a full disease name matches', async () => {
    const r = await routeTopic('what causes turner syndrome');
    expect(r.confidence).toBe('phrase');
    expect(r.system).toBe('Reproductive');
  });

  it('returns none for utterances with no medical signal', async () => {
    expect((await routeTopic('hello how are you today')).system).toBeNull();
  });
});

describe('routeWith (pure step)', () => {
  const index = {
    phrase: new Map([['nephrotic syndrome', 'Renal']]),
    token: new Map([['pheochromocytoma', { 'Endocrine System': 1 }]]),
  };

  it('prefers an exact phrase over token votes', () => {
    // "syndrome" is a stopword; only the phrase should fire.
    expect(routeWith(index, 'the nephrotic syndrome workup')).toEqual({
      system: 'Renal',
      confidence: 'phrase',
    });
  });

  it('falls back to token vote when no phrase matches', () => {
    expect(routeWith(index, 'suspect pheochromocytoma here')).toEqual({
      system: 'Endocrine System',
      confidence: 'token',
    });
  });

  it('fuzzy-matches a mildly garbled single-word disease name', () => {
    const fuzzyIndex = {
      phrase: new Map([['pheochromocytoma', 'Endocrine System']]),
      token: new Map<string, Record<string, number>>(),
    };
    // dist 1 to "pheochromocytoma" — exact includes() misses, fuzzy catches.
    expect(routeWith(fuzzyIndex, 'suspect pheochromocytom here')).toEqual({
      system: 'Endocrine System',
      confidence: 'fuzzy',
    });
  });

  it('does not fuzzy-match unrelated words', () => {
    const fuzzyIndex = {
      phrase: new Map([['pheochromocytoma', 'Endocrine System']]),
      token: new Map<string, Record<string, number>>(),
    };
    expect(routeWith(fuzzyIndex, 'hello how are you today')).toEqual({
      system: null,
      confidence: 'none',
    });
  });
});

describe('routeWith (edge cases)', () => {
  const index = {
    phrase: new Map([
      ['asthma', 'Respiratory System'],
      ['nephrotic syndrome', 'Renal'],
      ['pheochromocytoma', 'Endocrine System'],
    ]),
    token: new Map<string, Record<string, number>>([
      ['glomerulonephritis', { 'Renal': 3 }],
      ['cardiomyopathy', { 'Cardiovascular': 2 }],
    ]),
  };

  it('handles empty and whitespace-only input', () => {
    expect(routeWith(index, '')).toEqual({ system: null, confidence: 'none' });
    expect(routeWith(index, '   ')).toEqual({ system: null, confidence: 'none' });
  });

  it('ignores punctuation and casing around a phrase', () => {
    expect(routeWith(index, 'ASTHMA?!').system).toBe('Respiratory System');
    expect(routeWith(index, '...pheochromocytoma...').system).toBe('Endocrine System');
  });

  it('returns none when only stopwords/short words are present', () => {
    // "the", "and", "a" are ≤3 chars or stopwords — no signal.
    expect(routeWith(index, 'the syndrome and a disease')).toEqual({
      system: null,
      confidence: 'none',
    });
  });

  it('does not crash on numbers, symbols, or single letters', () => {
    expect(routeWith(index, '42 mg/dL @ 3am — b').system).toBeNull();
  });

  it('does not fuzzy-match a too-far garble (beyond dist 2 / ratio gate)', () => {
    // "pheo" is dist-heavy vs "pheochromocytoma"; short word, ratio gate rejects.
    expect(routeWith(index, 'the pheo thing').confidence).not.toBe('fuzzy');
  });

  it('does not fuzzy-snap a short valid word onto a longer phrase', () => {
    // "asthmatic" vs "asthma": length gap 3 (>2), pruned out — must not fuzzy.
    const r = routeWith(index, 'asthmatic patient');
    expect(r.confidence).not.toBe('fuzzy');
  });

  it('exact phrase still wins even when a token also matches', () => {
    // both "asthma" (phrase) and "glomerulonephritis" (token) present → phrase.
    expect(routeWith(index, 'asthma with glomerulonephritis')).toEqual({
      system: 'Respiratory System',
      confidence: 'phrase',
    });
  });

  it('token vote picks the highest-scoring system across multiple hits', () => {
    const multi = {
      phrase: new Map<string, string>(),
      token: new Map<string, Record<string, number>>([
        ['renaltoken', { 'Renal': 5 }],
        ['cardtoken', { 'Cardiovascular': 1 }],
      ]),
    };
    expect(routeWith(multi, 'renaltoken and cardtoken').system).toBe('Renal');
  });

  it('is case-insensitive on token matches', () => {
    expect(routeWith(index, 'CARDIOMYOPATHY findings').system).toBe('Cardiovascular');
  });
});

describe('routeWith (fuzzy gating + tie-breaks)', () => {
  const fuzzy = {
    phrase: new Map([['pheochromocytoma', 'Endocrine System']]),
    token: new Map<string, Record<string, number>>(),
  };

  it('fires fuzzy at the word-count boundary (<= 6 words)', () => {
    // 6 filtered (>3-char) words incl. one dist-1 garble → fuzzy still runs.
    const u = 'aaaa bbbb cccc dddd eeee pheochromocytom';
    expect(routeWith(fuzzy, u)).toEqual({ system: 'Endocrine System', confidence: 'fuzzy' });
  });

  it('skips fuzzy past the boundary (> 6 words)', () => {
    // 7 filtered words — fuzzy is gated off, no token match → none.
    const u = 'aaaa bbbb cccc dddd eeee ffff pheochromocytom';
    expect(routeWith(fuzzy, u)).toEqual({ system: null, confidence: 'none' });
  });

  it('picks the nearest phrase when several are in fuzzy range', () => {
    const multi = {
      phrase: new Map([
        ['cardiomyopathy', 'Cardiovascular'],
        ['cardiomyopathi', 'WRONG'], // dist 1 to the query too, but farther-ranked
      ]),
      token: new Map<string, Record<string, number>>(),
    };
    // exact-ish "cardiomyopathy" (dist 0) must win over the dist-1 decoy.
    expect(routeWith(multi, 'cardiomyopathy').system).toBe('Cardiovascular');
  });

  it('token tie is broken by first-appearing token in the utterance', () => {
    const tie = {
      phrase: new Map<string, string>(),
      token: new Map<string, Record<string, number>>([
        ['alpha', { 'FirstSystem': 1 }],
        ['beta', { 'SecondSystem': 1 }],
      ]),
    };
    // equal votes → the system whose token appears first in the utterance wins.
    // Deterministic (score map is built in utterance order, sort is stable).
    expect(routeWith(tie, 'alpha beta').system).toBe('FirstSystem');
    expect(routeWith(tie, 'beta alpha').system).toBe('SecondSystem');
  });

  it('exact-phrase match is substring-based (documents current behavior)', () => {
    // "asthma" is found inside "asthmatic" via includes(). Intentional: catches
    // inflected forms. If this ever needs word-boundary matching, change here.
    const sub = {
      phrase: new Map([['asthma', 'Respiratory System']]),
      token: new Map<string, Record<string, number>>(),
    };
    expect(routeWith(sub, 'asthmatic patient').confidence).toBe('phrase');
  });
});

describe('routeWith (data-driven regression guard)', () => {
  it('routes a sample of real disease names to a system at high phrase accuracy', async () => {
    const index = await __test.buildIndex();
    const names = [...index.phrase.entries()];
    // deterministic stride sample across the whole index, ~150 names.
    const step = Math.max(1, Math.floor(names.length / 150));
    let n = 0, phraseHits = 0, systemHits = 0;
    for (let i = 0; i < names.length; i += step) {
      const [name, expectedSystem] = names[i];
      const r = routeWith(index, name);
      n++;
      if (r.confidence === 'phrase') phraseHits++;
      if (r.system === expectedSystem) systemHits++;
    }
    // Every real disease name should route via the phrase tier...
    expect(phraseHits / n).toBeGreaterThan(0.98);
    // ...and land its own system the vast majority of the time (residual gap is
    // genuine multi-system disease ambiguity in the enriched data, ~86% ceiling).
    expect(systemHits / n).toBeGreaterThan(0.8);
  });
});
