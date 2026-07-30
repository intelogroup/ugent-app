// Persists every voice turn so ASR corrections can be verified after the fact
// and the dictionary/aliases grown from real Whisper output. Client-side
// localStorage ring buffer — same no-DB pattern as `quiz-attempts` and
// `curriculum-completed-blocks` (Supabase-backed, no separate log DB).

const KEY = 'asr-turn-log';
const MAX = 500; // ponytail: ring buffer; bump if you need deeper history

export type AsrTurn = {
  t: number;         // epoch ms
  raw: string;       // Whisper output, before any cleaning
  corrected: string; // what actually reached the LLM ('' = dropped as noise)
};

export function logAsrTurn(raw: string, corrected: string): void {
  if (typeof window === 'undefined') return;
  try {
    const log: AsrTurn[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    log.push({ t: Date.now(), raw, corrected });
    if (log.length > MAX) log.splice(0, log.length - MAX);
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    // logging must never break the voice path
  }
  // Fire-and-forget to disk (data/asr-log.jsonl) — survives across browsers.
  try {
    fetch('/api/asr-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw, corrected }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore — localStorage copy already written
  }
}

export function getAsrLog(): AsrTurn[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

// Turns where correction changed the text — the candidates worth reviewing to
// add dictionary entries/aliases. Call from the console: `asrMisses()`.
export function getAsrCorrections(): AsrTurn[] {
  return getAsrLog().filter((x) => x.raw !== x.corrected);
}
