import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json()

  if (body.attempt) {
    const { subject, system, total, correct, timeSpentSeconds } = body.attempt

    const { data: attempt, error } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        subject: subject || null,
        system: system || null,
        total_questions: total,
        correct_answers: correct,
        time_spent_seconds: timeSpentSeconds,
      })
      .select('id')
      .single()

    if (error) {
      console.error('quiz-activity insert error:', error)
      return NextResponse.json({ error: 'insert failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: attempt.id })
  }

  return NextResponse.json({ ok: true })
}
