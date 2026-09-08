import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { data, error } = await supabase.from('drill_card_state').select('*').eq('user_id', user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ state: data ?? null });
}

export async function POST(request: NextRequest) {
  let body: { lastQbankCardId?: unknown; lastConceptCardId?: unknown; lastSubtab?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: existing } = await supabase.from('drill_card_state').select('*').eq('user_id', user.id).maybeSingle();

  const next: { user_id: string; last_qbank_card_id: string | null; last_concept_card_id: string | null; last_subtab: string | null } = {
    user_id: user.id,
    last_qbank_card_id: typeof body.lastQbankCardId === 'string' ? body.lastQbankCardId : (existing?.last_qbank_card_id ?? null),
    last_concept_card_id: typeof body.lastConceptCardId === 'string' ? body.lastConceptCardId : (existing?.last_concept_card_id ?? null),
    last_subtab: body.lastSubtab === 'qbank' || body.lastSubtab === 'concepts' ? body.lastSubtab : (existing?.last_subtab ?? null),
  };

  const { error } = await supabase.from('drill_card_state').upsert({ ...next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
