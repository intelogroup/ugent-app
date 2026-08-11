import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ count: null }, { status: 503 });
  }

  try {
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw error;

    return NextResponse.json(
      { count: data.total },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=3600' } }
    );
  } catch (error) {
    console.error('user-count failed:', error);
    return NextResponse.json({ count: null }, { status: 500 });
  }
}
