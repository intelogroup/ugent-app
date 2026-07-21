import { NextRequest, NextResponse } from 'next/server';
import { appendFile, readFile } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const LOG_PATH = path.join(process.cwd(), 'data', 'asr-log.jsonl');

// Append one voice turn to data/asr-log.jsonl so raw Whisper output and what
// reached the LLM survive across sessions/devices (localStorage is per-browser).
export async function POST(request: NextRequest) {
  const { raw, corrected } = await request.json();
  if (typeof raw !== 'string' || typeof corrected !== 'string') {
    return NextResponse.json({ error: 'raw and corrected must be strings' }, { status: 400 });
  }
  await appendFile(LOG_PATH, JSON.stringify({ t: Date.now(), raw, corrected }) + '\n');
  return NextResponse.json({ ok: true });
}

// Dump the full log for review (GET /api/asr-log).
export async function GET() {
  try {
    const text = await readFile(LOG_PATH, 'utf8');
    const turns = text.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
    return NextResponse.json({ turns, count: turns.length });
  } catch {
    return NextResponse.json({ turns: [], count: 0 });
  }
}
