import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { data, error } = await supabase
    .from('drill_card_feedback')
    .select('card_id, card_type, flagged, liked, mastered, comment, updated_at')
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(request: NextRequest) {
  let body: { cardId?: unknown; cardType?: unknown; flagged?: unknown; liked?: unknown; mastered?: unknown; comment?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const cardId = typeof body.cardId === 'string' ? body.cardId : null;
  if (!cardId) return NextResponse.json({ error: 'cardId is required' }, { status: 400 });
  const cardType = body.cardType === 'concept' ? 'concept' : 'qbank';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Fetch existing to merge partial updates (so POST can be partial: {cardId, flagged:true} alone)
  const { data: existing } = await supabase
    .from('drill_card_feedback')
    .select('flagged, liked, mastered, comment')
    .eq('user_id', user.id)
    .eq('card_id', cardId)
    .maybeSingle();

  const next = {
    user_id: user.id,
    card_id: cardId,
    card_type: cardType,
    flagged: typeof body.flagged === 'boolean' ? body.flagged : (existing?.flagged ?? false),
    liked: typeof body.liked === 'boolean' ? body.liked : (existing?.liked ?? false),
    mastered: typeof body.mastered === 'boolean' ? body.mastered : (existing?.mastered ?? false),
    comment: typeof body.comment === 'string' ? body.comment.slice(0, 2000) : (existing?.comment ?? ''),
    updated_at: new Date().toISOString(),
  };

  const isEmpty = !next.flagged && !next.liked && !next.mastered && !next.comment;
  if (isEmpty) {
    const { error } = await supabase.from('drill_card_feedback').delete().eq('user_id', user.id).eq('card_id', cardId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: true });
  }

  const { error } = await supabase
    .from('drill_card_feedback')
    .upsert(next, { onConflict: 'user_id,card_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  let body: { cardId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const cardId = typeof body.cardId === 'string' ? body.cardId : null;
  if (!cardId) return NextResponse.json({ error: 'cardId is required' }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { error } = await supabase.from('drill_card_feedback').delete().eq('user_id', user.id).eq('card_id', cardId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
