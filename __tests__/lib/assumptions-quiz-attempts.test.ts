import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client — dynamic import inside getQuizAttempts.
// The chain is from() -> select() -> order() -> range() -> {data, error}.
const mockRange = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          range: mockRange,
        })),
      })),
    })),
  })),
}));

import { getQuizAttempts } from '@/lib/quizAttempts';

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'abc-123',
    created_at: '2026-01-15T10:30:00Z',
    subject: 'Pathology',
    system: 'Cardiovascular',
    total_questions: 10,
    correct_answers: 7,
    time_spent_seconds: 300,
    ...overrides,
  };
}

// Assumption pin: getQuizAttempts must map Supabase row fields to the
// QuizAttempt interface. Column renames (created_at -> timestamp,
// total_questions -> total, correct_answers -> correct, etc.) must match.

describe('assumption: quizAttempts field mapping contract', () => {
  it('maps Supabase row fields to QuizAttempt interface', async () => {
    mockRange.mockResolvedValueOnce({ data: [makeRow()], error: null });

    const attempts = await getQuizAttempts();
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toEqual({
      id: 'abc-123',
      timestamp: new Date('2026-01-15T10:30:00Z').getTime(),
      subject: 'Pathology',
      system: 'Cardiovascular',
      total: 10,
      correct: 7,
      timeSpentSeconds: 300,
    });
  });

  it('returns empty array on Supabase error', async () => {
    mockRange.mockResolvedValueOnce({
      data: null,
      error: { message: 'relation "quiz_attempts" does not exist' },
    });

    const attempts = await getQuizAttempts();
    expect(attempts).toEqual([]);
  });

  it('paginates when batch is full (1000 rows)', async () => {
    const batch1 = Array.from({ length: 1000 }, (_, i) => makeRow({ id: `id-${i}` }));
    const batch2 = [makeRow({ id: 'id-1000' })];

    mockRange
      .mockResolvedValueOnce({ data: batch1, error: null })
      .mockResolvedValueOnce({ data: batch2, error: null });

    const attempts = await getQuizAttempts();
    expect(attempts.length).toBe(1001);
    expect(mockRange).toHaveBeenCalledTimes(2);
  });

  it('handles null subject/system fields', async () => {
    mockRange.mockResolvedValueOnce({
      data: [makeRow({ subject: null, system: null })],
      error: null,
    });

    const attempts = await getQuizAttempts();
    expect(attempts[0].subject).toBeNull();
    expect(attempts[0].system).toBeNull();
  });
});
