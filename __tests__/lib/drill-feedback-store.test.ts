import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncFeedback, syncState } from '@/lib/drill-feedback-store';

describe('drill-feedback-store', () => {
  let fetchMock: ReturnType<typeof vi.spyOn>;
  let calls: { url: string; init: RequestInit }[];

  beforeEach(() => {
    calls = [];
    fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('syncFeedback posts cardId + cardType + patch', () => {
    syncFeedback({ cardId: 'disease-x', flagged: true });
    expect(calls).toHaveLength(1);
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.cardId).toBe('disease-x');
    expect(body.cardType).toBe('qbank');
    expect(body.flagged).toBe(true);
    // Only patch fields are forwarded; the API route merges server-side.
    expect(body.liked).toBeUndefined();
    expect(body.mastered).toBeUndefined();
    expect(body.comment).toBeUndefined();
  });

  it('syncFeedback infers concept cardType for concept- prefixed ids', () => {
    syncFeedback({ cardId: 'concept-genetics-0', liked: true });
    expect(JSON.parse(calls[0].init.body as string).cardType).toBe('concept');
  });

  it('syncFeedback swallows fetch failures (never throws)', () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    expect(() => syncFeedback({ cardId: 'disease-x', mastered: true })).not.toThrow();
  });

  it('syncFeedback is a no-op when cardId is missing', () => {
    syncFeedback({ cardId: '' } as any);
    expect(calls).toHaveLength(0);
  });

  it('syncState posts last position fields', () => {
    syncState({ lastQbankCardId: 'disease-y', lastSubtab: 'qbank' });
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.lastQbankCardId).toBe('disease-y');
    expect(body.lastSubtab).toBe('qbank');
  });
});