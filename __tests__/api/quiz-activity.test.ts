import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

import { POST } from '@/app/api/quiz-activity/route'

function fakeRequest(body: unknown) {
  return { json: async () => body } as any
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/quiz-activity', () => {
  it('returns 401 when no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await POST(fakeRequest({ attempt: null }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('unauthorized')
  })

  it('inserts attempt and returns id on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle.mockResolvedValue({ data: { id: 'attempt-1' }, error: null })
    mockSelect.mockReturnValue({ single: mockSingle })
    mockInsert.mockReturnValue({ select: mockSelect })
    mockFrom.mockReturnValue({ insert: mockInsert })

    const res = await POST(fakeRequest({
      attempt: {
        subject: 'Pathology',
        system: 'Cardiovascular',
        total: 10,
        correct: 7,
        timeSpentSeconds: 300,
      },
    }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true, id: 'attempt-1' })

    expect(mockFrom).toHaveBeenCalledWith('quiz_attempts')
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-1',
      subject: 'Pathology',
      system: 'Cardiovascular',
      total_questions: 10,
      correct_answers: 7,
      time_spent_seconds: 300,
    })
  })

  it('returns 500 on insert error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle.mockResolvedValue({ data: null, error: new Error('insert failed') })
    mockSelect.mockReturnValue({ single: mockSingle })
    mockInsert.mockReturnValue({ select: mockSelect })
    mockFrom.mockReturnValue({ insert: mockInsert })

    const res = await POST(fakeRequest({
      attempt: { subject: null, system: null, total: 1, correct: 1, timeSpentSeconds: 10 },
    }))

    expect(res.status).toBe(500)
  })

  it('handles null subject/system in attempt', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle.mockResolvedValue({ data: { id: 'attempt-2' }, error: null })
    mockSelect.mockReturnValue({ single: mockSingle })
    mockInsert.mockReturnValue({ select: mockSelect })
    mockFrom.mockReturnValue({ insert: mockInsert })

    const res = await POST(fakeRequest({
      attempt: { subject: null, system: null, total: 5, correct: 3, timeSpentSeconds: 120 },
    }))

    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-1',
      subject: null,
      system: null,
      total_questions: 5,
      correct_answers: 3,
      time_spent_seconds: 120,
    })
  })
})
