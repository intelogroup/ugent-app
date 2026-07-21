import { existsSync, mkdirSync } from 'fs';
import { appendFile } from 'fs/promises';
import path from 'path';
import { APICallError } from 'ai';

const LOG_DIR = path.join(process.cwd(), 'data', '.clea-logs');
const LOG_FILE = path.join(LOG_DIR, 'agent-errors.jsonl');

// ponytail: append-only jsonl, no rotation/pruning — errors are rare enough
// that this won't grow large before someone notices and fixes the cause.
export async function logAgentError(context: { chatId: string; route: string }, error: unknown) {
  const entry = {
    time: new Date().toISOString(),
    chatId: context.chatId,
    route: context.route,
    message: error instanceof Error ? error.message : String(error),
    statusCode: error instanceof APICallError ? error.statusCode : undefined,
    isRetryable: error instanceof APICallError ? error.isRetryable : undefined,
    responseBody: error instanceof APICallError ? error.responseBody : undefined,
  };

  console.error('agent error', entry);

  // ponytail: Vercel's FS is read-only outside /tmp, and console output is
  // already captured as function logs there — local jsonl is dev-only.
  if (process.env.VERCEL) return;

  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
  await appendFile(LOG_FILE, `${JSON.stringify(entry)}\n`);
}

// Message shown to the user in the chat UI — never leak raw provider errors,
// but surface actionable ones (billing) instead of a generic dead end.
export function clientErrorMessage(error: unknown): string {
  if (error instanceof APICallError && error.statusCode === 402) {
    return 'Clea is temporarily unavailable (AI provider billing issue). Please try again later.';
  }
  if (error instanceof APICallError && error.statusCode === 429) {
    return 'Clea is getting a lot of requests right now. Please try again in a moment.';
  }
  return 'Something went wrong on my end. Please try again.';
}
