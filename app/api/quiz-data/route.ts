import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { queryQuestions } from '@/lib/qbank';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');

  if (mode === 'filters') {
    // Bank-wide counts/subject/system lists are public aggregate info, not
    // user data — use a service-role client so the result (and this route's
    // CDN cache) doesn't depend on the requester's auth/RLS state. An
    // RLS-scoped client here previously let an anonymous request (bot, health
    // check) cache a blocked-by-RLS `total:0` for every real user for 5 min.
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const sourceFilter = searchParams.get('source');

    let baseQuery = supabase.from('questions').select('*', { count: 'exact', head: true }).neq('correct_answer', '');
    if (sourceFilter) baseQuery = baseQuery.eq('source', sourceFilter);
    const { count: total, error: countError } = await baseQuery;
    if (countError) throw countError;

    const subjects = new Set<string>();
    const systems = new Set<string>();
    const windowSize = 1000;
    for (let start = 0; ; start += windowSize) {
      let q = supabase.from('questions').select('subject, system').neq('correct_answer', '');
      if (sourceFilter) q = q.eq('source', sourceFilter);
      const { data: rows } = await q.range(start, start + windowSize - 1);
      const batch = rows ?? [];
      for (const row of batch) {
        if (row.subject) subjects.add(row.subject);
        if (row.system) systems.add(row.system);
      }
      if (batch.length < windowSize) break;
    }

    return NextResponse.json(
      {
        subjects: [...subjects].sort(),
        systems: [...systems].sort(),
        total: total ?? 0,
      },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=3600' } }
    );
  }

  const subject = searchParams.get('subject') || undefined;
  const system = searchParams.get('system') || undefined;
  const difficulty = searchParams.get('difficulty') || undefined;
  const source = searchParams.get('source') || undefined;
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  const { questions, matched } = await queryQuestions({ subject, system, difficulty, source, limit });
  return NextResponse.json({ questions, matched });
}
