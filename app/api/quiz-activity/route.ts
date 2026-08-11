import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if ((body as Record<string, unknown>)?.attempt) {
    const { subject, system, total, correct, timeSpentSeconds } =
      (body as { attempt: Record<string, unknown> }).attempt

    const totalNum = Number(total)
    const correctNum = Number(correct)
    const timeNum = Number(timeSpentSeconds)

    if (!Number.isInteger(totalNum) || totalNum < 1 || totalNum > 500) {
      return NextResponse.json({ error: 'invalid total' }, { status: 400 })
    }
    if (!Number.isInteger(correctNum) || correctNum < 0 || correctNum > totalNum) {
      return NextResponse.json({ error: 'invalid correct' }, { status: 400 })
    }
    if (!Number.isFinite(timeNum) || timeNum < 0 || timeNum > 24 * 60 * 60) {
      return NextResponse.json({ error: 'invalid time' }, { status: 400 })
    }

    const { data: attempt, error } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        subject: subject || null,
        system: system || null,
        total_questions: totalNum,
        correct_answers: correctNum,
        time_spent_seconds: timeNum,
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
