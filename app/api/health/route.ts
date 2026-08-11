import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, boolean> = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };

  const ok = Object.values(checks).every(Boolean);
  return NextResponse.json(
    {
      ok,
      status: ok ? 'healthy' : 'degraded',
      checks,
      env: process.env.VERCEL ? 'production' : 'development',
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
