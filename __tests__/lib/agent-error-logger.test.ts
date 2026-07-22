import { existsSync, rmSync, readFileSync } from 'fs';
import path from 'path';
import { APICallError } from 'ai';
import { logAgentError, clientErrorMessage } from '@/lib/agent-error-logger';

const LOG_DIR = path.join(process.cwd(), 'data', '.clea-logs');
const LOG_FILE = path.join(LOG_DIR, 'agent-errors.jsonl');

describe('logAgentError', () => {
  const originalVercel = process.env.VERCEL;

  afterEach(() => {
    rmSync(LOG_DIR, { recursive: true, force: true });
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
  });

  it('writes a jsonl entry to disk outside Vercel', async () => {
    delete process.env.VERCEL;
    await logAgentError({ chatId: 'c1', route: 'test/route' }, new Error('boom'));
    expect(existsSync(LOG_FILE)).toBe(true);
    const lines = readFileSync(LOG_FILE, 'utf8').trim().split('\n');
    const entry = JSON.parse(lines[lines.length - 1]);
    expect(entry.chatId).toBe('c1');
    expect(entry.route).toBe('test/route');
    expect(entry.message).toBe('boom');
  });

  it('does not touch the filesystem when running on Vercel', async () => {
    process.env.VERCEL = '1';
    await logAgentError({ chatId: 'c2', route: 'test/route' }, new Error('boom'));
    expect(existsSync(LOG_FILE)).toBe(false);
  });
});

describe('clientErrorMessage', () => {
  function makeApiError(statusCode: number) {
    return new APICallError({
      message: 'provider error',
      url: 'https://example.test',
      requestBodyValues: {},
      statusCode,
    });
  }

  it('surfaces a billing-specific message for 402', () => {
    expect(clientErrorMessage(makeApiError(402))).toMatch(/billing/i);
  });

  it('surfaces a rate-limit message for 429', () => {
    expect(clientErrorMessage(makeApiError(429))).toMatch(/lot of requests/i);
  });

  it('falls back to a generic message for other errors', () => {
    expect(clientErrorMessage(new Error('anything else'))).toBe('Something went wrong on my end. Please try again.');
  });
});
