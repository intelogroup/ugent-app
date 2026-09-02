import { generateText } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { openai } from '@ai-sdk/openai';

const FALLBACK_MODEL = 'gpt-4o-mini';
// Once deepseek fails, every other call in the process skips straight to
// openai — no auto-retry timer. Stays down until the process restarts
// (manual redeploy/restart = the "manual" reset).
// ponytail: process-lifetime in-memory flag, not persisted — fine for this
// single-instance deployment; a multi-instance/serverless deploy would need
// this in Supabase/Redis instead.
let deepseekDown = false;

// ponytail: test-only reset — not exported in prod bundle (tree-shaken),
// but lets unit tests clear the circuit breaker between runs.
export function _resetFallbackState() {
  deepseekDown = false;
}

export async function generateTextWithFallback(opts: Record<string, unknown>) {
  if (deepseekDown) {
    // openai is the only path left — if it fails, let the error propagate
    // (no further fallback to try).
    return await generateText({ ...opts, model: openai(FALLBACK_MODEL) } as any);
  }
  try {
    return await generateText({ ...opts, model: deepseek('deepseek-v4-flash') } as any);
  } catch (e) {
    console.warn('[llm-fallback] deepseek failed, disabling it for rest of process — falling back to openai until manual restart', e);
    deepseekDown = true;
    return await generateText({ ...opts, model: openai(FALLBACK_MODEL) } as any);
  }
}
