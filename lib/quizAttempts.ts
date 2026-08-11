export interface QuizAttempt {
  id?: string
  timestamp: number
  subject: string | null
  system: string | null
  total: number
  correct: number
  timeSpentSeconds: number
}

export async function getQuizAttempts(): Promise<QuizAttempt[]> {
  if (typeof window === 'undefined') return []

  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    // PostgREST caps a single select at db.max_rows (1000); walk range windows
    // so a heavy user's full history is counted (dashboard averages/focus
    // depend on the complete set, not a truncated slice).
    const all: any[] = []
    const windowSize = 1000
    for (let start = 0; ; start += windowSize) {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(start, start + windowSize - 1)
      if (error) {
        console.error('[quizAttempts] fetch failed', error)
        return []
      }
      const batch = data ?? []
      all.push(...batch)
      if (batch.length < windowSize) break
    }

    return all.map((row: any) => ({
      id: row.id,
      timestamp: new Date(row.created_at).getTime(),
      subject: row.subject,
      system: row.system,
      total: row.total_questions,
      correct: row.correct_answers,
      timeSpentSeconds: row.time_spent_seconds,
    }))
  } catch (e) {
    console.error('[quizAttempts] fetch threw', e)
    return []
  }
}
