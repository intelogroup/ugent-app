import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQueryQuestions = vi.fn();
vi.mock('@/lib/qbank', () => ({
  queryQuestions: (...args: unknown[]) => mockQueryQuestions(...args),
}));

import { makeQueryQbank, queryQbank } from '@/lib/clea-tools';

// Assumption pin: the topic-router -> qbank system bridge (ENRICHED_SYSTEM_TO_QBANK)
// must NEVER zero-filter. An unmapped prediction or a null one falls back to the
// base unscoped tool; a mapped one narrows tool calls to that exact system.
describe('assumption: qbank system bridge never zero-filters', () => {
  beforeEach(() => {
    mockQueryQuestions.mockReset();
    mockQueryQuestions.mockResolvedValue({ questions: [], matched: 0 });
  });

  it('null prediction returns the base (unscoped) tool', () => {
    expect(makeQueryQbank(null)).toBe(queryQbank);
  });

  it('unmapped prediction returns the base tool, not a zero-row filter', () => {
    // 'Psychiatry' is not in the bridge — a naive eq-filter would return 0 rows.
    // The contract: fall back to unscoped rather than silently empty.
    expect(makeQueryQbank('Psychiatry')).toBe(queryQbank);
    expect(makeQueryQbank('General')).toBe(queryQbank);
  });

  it('mapped prediction returns a NEW narrowed tool, distinct from base', () => {
    const narrowed = makeQueryQbank('Cardiovascular');
    expect(narrowed).not.toBe(queryQbank);
    expect(narrowed.execute).not.toBe(queryQbank.execute);
  });

  it('mapped prediction narrows executed calls to that qbank system', async () => {
    const narrowed = makeQueryQbank('Cardiovascular') as any;
    await narrowed.execute({ limit: 5 }, {});
    expect(mockQueryQuestions).toHaveBeenCalledWith(
      expect.objectContaining({ system: 'Cardiovascular' })
    );
  });

  it('mapped prediction still respects an explicit system from the caller', async () => {
    const narrowed = makeQueryQbank('Cardiovascular') as any;
    await narrowed.execute({ limit: 5, system: 'Renal' }, {});
    expect(mockQueryQuestions).toHaveBeenCalledWith(
      expect.objectContaining({ system: 'Renal' })
    );
  });
});
