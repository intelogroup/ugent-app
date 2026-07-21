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

    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data) return []

    return data.map((row: any) => ({
      id: row.id,
      timestamp: new Date(row.created_at).getTime(),
      subject: row.subject,
      system: row.system,
      total: row.total_questions,
      correct: row.correct_answers,
      timeSpentSeconds: row.time_spent_seconds,
    }))
  } catch {
    return []
  }
}

export function getCompletedCurriculumBlocks(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('curriculum-completed-blocks') || '[]')
  } catch {
    return []
  }
}
