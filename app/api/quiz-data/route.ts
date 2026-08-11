import { NextRequest, NextResponse } from 'next/server';
import { queryQuestions } from '@/lib/qbank';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');

  if (mode === 'filters') {
    const supabase = await createClient();

    const { count: total, error: countError } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });
    if (countError) throw countError;

    // PostgREST caps a single select at db.max_rows (1000) and the bank exceeds
    // it, so a bare select can't enumerate every subject/system. Walk range
    // windows (1000 rows each) until exhausted and union the values.
    const subjects = new Set<string>();
    const systems = new Set<string>();
    const windowSize = 1000;
    for (let start = 0; ; start += windowSize) {
      const { data: rows } = await supabase
        .from('questions')
        .select('subject, system')
        .range(start, start + windowSize - 1);
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
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  const { questions, matched } = await queryQuestions({ subject, system, difficulty, limit });
  return NextResponse.json({ questions, matched });
}
