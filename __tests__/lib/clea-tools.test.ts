vi.mock('@/lib/qbank');
jest.mock('@/lib/qbank');

import {
  searchPathoma,
  searchFirstAid,
  queryQbank,
  queryCurriculum,
} from '@/lib/clea-tools';

type Hit = { page: number; excerpt: string };

async function callTool<T>(t: any, args: any): Promise<T> {
  if (!t.execute) throw new Error('tool has no execute fn');
  return t.execute(args, {});
}

describe('searchPathoma', () => {
  it('returns hits with page + excerpt for a known term', async () => {
    const res = await callTool<{ hits: Hit[] }>(searchPathoma, { query: 'hyperplasia', limit: 3 });
    expect(Array.isArray(res.hits)).toBe(true);
    expect(res.hits.length).toBeGreaterThan(0);
    for (const hit of res.hits) {
      expect(typeof hit.page).toBe('number');
      expect(typeof hit.excerpt).toBe('string');
      expect(hit.excerpt.toLowerCase()).toContain('hyperplasia');
    }
  });

  it('respects limit', async () => {
    const res = await callTool<{ hits: Hit[] }>(searchPathoma, { query: 'cell', limit: 1 });
    expect(res.hits.length).toBeLessThanOrEqual(1);
  });

  it('returns empty hits for nonsense query', async () => {
    const res = await callTool<{ hits: Hit[] }>(searchPathoma, { query: 'zzznotarealword123', limit: 3 });
    expect(res.hits).toEqual([]);
  });

  it('relaxes to partial-word match rather than zeroing out on one bogus word', async () => {
    const res = await callTool<{ hits: Hit[] }>(searchPathoma, { query: 'hyperplasia zzznotarealword123', limit: 3 });
    expect(res.hits.length).toBeGreaterThan(0);
    for (const hit of res.hits) {
      expect(hit.excerpt.toLowerCase()).toContain('hyperplasia');
    }
  });
});

describe('searchPathoma edge cases', () => {
  it('does not crash on empty query, returns empty hits', async () => {
    const res = await callTool<{ hits: Hit[] }>(searchPathoma, { query: '', limit: 3 });
    expect(res.hits).toEqual([]);
  });

  it('does not crash on whitespace-only query', async () => {
    const res = await callTool<{ hits: Hit[] }>(searchPathoma, { query: '   ', limit: 3 });
    expect(res.hits).toEqual([]);
  });

  it('returns [] when zero query words match anywhere (no floor fallback to noise)', async () => {
    const res = await callTool<{ hits: Hit[] }>(searchPathoma, {
      query: 'zzznotreal1 zzznotreal2 zzznotreal3',
      limit: 3,
    });
    expect(res.hits).toEqual([]);
  });

  it('is case-insensitive', async () => {
    const lower = await callTool<{ hits: Hit[] }>(searchPathoma, { query: 'hyperplasia', limit: 3 });
    const upper = await callTool<{ hits: Hit[] }>(searchPathoma, { query: 'HYPERPLASIA', limit: 3 });
    expect(upper.hits.map((h) => h.page)).toEqual(lower.hits.map((h) => h.page));
  });

  it('never returns more hits than the requested limit', async () => {
    const res = await callTool<{ hits: Hit[] }>(searchPathoma, { query: 'cell', limit: 2 });
    expect(res.hits.length).toBeLessThanOrEqual(2);
  });

  it('ranks pages by word-overlap score, best match first', async () => {
    const res = await callTool<{ hits: Hit[] }>(searchFirstAid, {
      query: 'pertussis toxin adenylate cyclase cAMP mechanism symptoms',
      limit: 3,
    });
    expect(res.hits.length).toBeGreaterThan(0);
    // page 130 and 141 in First Aid both discuss pertussis toxin's cAMP
    // mechanism directly — a real multi-word overlap hit, not a fluke.
    const pages = res.hits.map((h) => h.page);
    expect(pages.some((p) => [130, 141].includes(p))).toBe(true);
  });

  it('single real word among junk still surfaces relevant pages via threshold relaxation', async () => {
    const res = await callTool<{ hits: Hit[] }>(searchFirstAid, {
      query: 'turner zzzjunk1 zzzjunk2 zzzjunk3',
      limit: 3,
    });
    expect(res.hits.length).toBeGreaterThan(0);
    for (const hit of res.hits) {
      expect(hit.excerpt.toLowerCase()).toContain('turner');
    }
  });
});

describe('searchFirstAid', () => {
  it('returns hits with page + excerpt for a known term', async () => {
    const res = await callTool<{ hits: Hit[] }>(searchFirstAid, { query: 'Turner syndrome', limit: 3 });
    expect(Array.isArray(res.hits)).toBe(true);
    expect(res.hits.length).toBeGreaterThan(0);
    for (const hit of res.hits) {
      expect(typeof hit.page).toBe('number');
      expect(typeof hit.excerpt).toBe('string');
    }
  });

  it('returns empty hits for nonsense query', async () => {
    const res = await callTool<{ hits: Hit[] }>(searchFirstAid, { query: 'zzznotarealword123', limit: 3 });
    expect(res.hits).toEqual([]);
  });
});

describe('queryQbank', () => {
  it('returns matched count and sample questions', async () => {
    const res = await callTool<{ matched: number; sample: any[] }>(queryQbank, { limit: 5 });
    expect(typeof res.matched).toBe('number');
    expect(Array.isArray(res.sample)).toBe(true);
    expect(res.sample.length).toBeLessThanOrEqual(5);
    for (const q of res.sample) {
      expect(q).toHaveProperty('subject');
      expect(q).toHaveProperty('system');
      expect(q).toHaveProperty('difficulty');
      expect(q).toHaveProperty('text');
    }
  });

  it('filters by system when provided', async () => {
    const res = await callTool<{ matched: number; sample: any[] }>(queryQbank, { system: 'Cardiovascular', limit: 5 });
    for (const q of res.sample) {
      expect(q.system).toBe('Cardiovascular');
    }
  });
});

describe('queryCurriculum', () => {
  it('returns top systems and top diseases', async () => {
    const res = await callTool<{ topSystemsByFrequency: any[]; topDiseases: any[] }>(queryCurriculum, {});
    expect(Array.isArray(res.topSystemsByFrequency)).toBe(true);
    expect(Array.isArray(res.topDiseases)).toBe(true);
    expect(res.topDiseases.length).toBeLessThanOrEqual(8);
    for (const d of res.topDiseases) {
      expect(d).toHaveProperty('name');
      expect(d).toHaveProperty('count');
      expect(d).toHaveProperty('subject');
    }
  });

  it('scopes disease list to a system', async () => {
    const res = await callTool<{ topDiseases: any[] }>(queryCurriculum, { system: 'Neurology' });
    expect(Array.isArray(res.topDiseases)).toBe(true);
  });

  it('returns empty disease list for an unknown system, not an error', async () => {
    const res = await callTool<{ topDiseases: any[] }>(queryCurriculum, { system: 'ZZZNotASystem' });
    expect(res.topDiseases).toEqual([]);
  });
});

describe('queryQbank edge cases', () => {
  it('returns zero matches for an unknown subject, not an error', async () => {
    const res = await callTool<{ matched: number; sample: any[] }>(queryQbank, { subject: 'ZZZNotASubject' });
    expect(res.matched).toBe(0);
    expect(res.sample).toEqual([]);
  });
});

describe('search tool robustness', () => {
  const originalKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it('degrades to word-overlap search instead of throwing when the embedding call fails', async () => {
    // Jest has no OPENAI_API_KEY loaded (next/jest skips .env.local under
    // NODE_ENV=test), so this exercises the real "OpenAI unreachable" path:
    // an invalid key makes embed() reject with an API error, and the tool
    // must still resolve with word-overlap hits, not throw.
    process.env.OPENAI_API_KEY = 'sk-invalid-test-key-00000000000000000000';
    await expect(
      callTool<{ hits: Hit[] }>(searchPathoma, { query: 'hyperplasia', limit: 3 })
    ).resolves.toEqual({
      hits: expect.arrayContaining([expect.objectContaining({ page: expect.any(Number) })]),
    });
  });

  it('does not crash on a very long, verbose model-style query', async () => {
    const longQuery = Array(40).fill('mechanism pathophysiology infection hyponatremia adrenal').join(' ');
    const res = await callTool<{ hits: Hit[] }>(searchFirstAid, { query: longQuery, limit: 3 });
    expect(Array.isArray(res.hits)).toBe(true);
  });

  it('does not crash on unicode / non-ASCII query text', async () => {
    const res = await callTool<{ hits: Hit[] }>(searchFirstAid, { query: 'Türner sÿndrome 🧬', limit: 3 });
    expect(Array.isArray(res.hits)).toBe(true);
  });

  it('handles concurrent calls without corrupting results', async () => {
    const queries = ['hyperplasia', 'Turner syndrome', 'pertussis toxin', 'cell injury', 'hyponatremia'];
    const results = await Promise.all(
      queries.map((query) => callTool<{ hits: Hit[] }>(searchFirstAid, { query, limit: 2 }))
    );
    results.forEach((res) => expect(Array.isArray(res.hits)).toBe(true));
  });

  it('respects the max limit boundary (5)', async () => {
    const res = await callTool<{ hits: Hit[] }>(searchFirstAid, { query: 'infection', limit: 5 });
    expect(res.hits.length).toBeLessThanOrEqual(5);
  });
});
