import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('curriculum_progress').select('block_id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blockIds: (data || []).map((r) => r.block_id) });
}

export async function POST(request: NextRequest) {
  const { blockId } = (await request.json()) as { blockId: string };
  if (!blockId) return NextResponse.json({ error: 'blockId is required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { error } = await supabase
    .from('curriculum_progress')
    .upsert({ user_id: user.id, block_id: blockId }, { onConflict: 'user_id,block_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { blockId } = (await request.json()) as { blockId: string };
  if (!blockId) return NextResponse.json({ error: 'blockId is required' }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from('curriculum_progress').delete().eq('block_id', blockId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
