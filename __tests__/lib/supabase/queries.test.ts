import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockOrder = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

const mockSupabaseQuery = (returnValue: any) => {
  mockOrder.mockResolvedValue(returnValue)
  mockSelect.mockReturnValue({ order: mockOrder })
  mockFrom.mockReturnValue({ select: mockSelect })
}

import { getQuizAttempts } from '@/lib/quizAttempts'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('window', {})
})

describe('getQuizAttempts', () => {
  it('returns empty array when data is null', async () => {
    mockSupabaseQuery({ data: null, error: null })
    expect(await getQuizAttempts()).toEqual([])
  })

  it('returns empty array on error', async () => {
    mockSupabaseQuery({ data: null, error: new Error('db down') })
    expect(await getQuizAttempts()).toEqual([])
  })

  it('returns mapped attempts on success', async () => {
    mockSupabaseQuery({
      data: [
        {
          id: 'abc-123',
          created_at: '2026-07-21T12:00:00Z',
          subject: 'Pathology',
          system: 'Cardiovascular',
          total_questions: 10,
          correct_answers: 7,
          time_spent_seconds: 300,
        },
        {
          id: 'def-456',
          created_at: '2026-07-20T10:00:00Z',
          subject: null,
          system: null,
          total_questions: 5,
          correct_answers: 5,
          time_spent_seconds: 120,
        },
      ],
      error: null,
    })

    const result = await getQuizAttempts()
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: 'abc-123',
      timestamp: new Date('2026-07-21T12:00:00Z').getTime(),
      subject: 'Pathology',
      system: 'Cardiovascular',
      total: 10,
      correct: 7,
      timeSpentSeconds: 300,
    })
    expect(result[1].subject).toBeNull()
    expect(result[1].total).toBe(5)
  })

  it('queries quiz_attempts ordered by created_at desc', async () => {
    mockSupabaseQuery({ data: [], error: null })
    await getQuizAttempts()

    expect(mockFrom).toHaveBeenCalledWith('quiz_attempts')
    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('returns empty array on exception', async () => {
    mockFrom.mockImplementation(() => { throw new Error('unexpected') })
    expect(await getQuizAttempts()).toEqual([])
  })
})
