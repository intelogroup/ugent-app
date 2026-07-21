import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

type TestResult = { name: string; status: 'PASS' | 'FAIL'; error?: string }
const results: TestResult[] = []

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    results.push({ name, status: 'PASS' })
    console.log(`  PASS  ${name}`)
  } catch (e: any) {
    results.push({ name, status: 'FAIL', error: e.message })
    console.log(`  FAIL  ${name}: ${e.message}`)
  }
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY required')
    process.exit(1)
  }

  console.log('\n=== Supabase Integration Tests ===\n')

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })

  await test('quiz_attempts table exists', async () => {
    const { error } = await anon.from('quiz_attempts').select('id').limit(1)
    if (error?.code === '42P01') throw new Error('quiz_attempts does not exist')
  })

  await test('quiz_answers table exists', async () => {
    const { error } = await anon.from('quiz_answers').select('id').limit(1)
    if (error?.code === '42P01') throw new Error('quiz_answers does not exist')
  })

  await test('quiz_attempts has expected schema columns', async () => {
    const { error } = await anon.from('quiz_attempts').select('id,user_id,subject,system,total_questions,correct_answers,time_spent_seconds,created_at').limit(0)
    if (error && error.code === '42501') {
      // RLS blocks anon reads — schema is still valid (columns exist)
      return
    }
    if (error?.code === '42703') throw new Error(`missing column: ${error.message}`)
  })

  await test('RLS blocks anon insert on quiz_attempts', async () => {
    const { error } = await anon.from('quiz_attempts').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      total_questions: 1,
      correct_answers: 1,
      time_spent_seconds: 10,
    } as any)
    if (!error) throw new Error('anon insert should be rejected')
    if (error.code !== '42501') throw new Error(`expected 42501, got ${error.code}`)
  })

  await test('RLS blocks anon insert on quiz_answers', async () => {
    const { error } = await anon.from('quiz_answers').insert({
      attempt_id: '00000000-0000-0000-0000-000000000000',
      question_id: 'q1',
      question_text: 'test',
      correct_answer: 'a',
    } as any)
    if (!error) throw new Error('anon insert should be rejected')
    if (error.code !== '42501') throw new Error(`expected 42501, got ${error.code}`)
  })

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
