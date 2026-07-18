/**
 * @jest-environment node
 */
// The ai SDK's streaming internals need TransformStream/ReadableStream,
// which Node provides natively but jsdom (this repo's default test
// environment) does not.

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => ({
      status: init?.status || 200,
      json: async () => body,
    }),
  },
}));

import { rmSync } from 'fs';
import path from 'path';
import { GET, POST } from '@/app/api/clea-chat/route';
import { saveChat } from '@/lib/clea-chat-store';

const STORE_DIR = path.join(process.cwd(), 'data', '.clea-chats');

function fakeGetRequest(url: string) {
  const [, query = ''] = url.split('?');
  return {
    nextUrl: { searchParams: new URLSearchParams(query) },
  } as any;
}

function fakePostRequest(body: unknown) {
  return {
    json: async () => body,
  } as any;
}

describe('GET /api/clea-chat', () => {
  afterEach(() => {
    rmSync(STORE_DIR, { recursive: true, force: true });
  });

  it('returns [] for a chat id with no saved history', async () => {
    const res = await GET(fakeGetRequest('http://localhost/api/clea-chat?id=fresh-chat'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns 400 when id is missing', async () => {
    const res = await GET(fakeGetRequest('http://localhost/api/clea-chat'));
    expect(res.status).toBe(400);
  });

  it('returns previously saved history', async () => {
    const messages = [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }];
    await saveChat({ chatId: 'has-history', messages: messages as any });
    const res = await GET(fakeGetRequest('http://localhost/api/clea-chat?id=has-history'));
    expect(await res.json()).toEqual(messages);
  });
});

describe('POST /api/clea-chat', () => {
  const originalKey = process.env.DEEPSEEK_API_KEY;

  beforeEach(() => {
    process.env.DEEPSEEK_API_KEY = 'test-key';
  });

  afterEach(() => {
    process.env.DEEPSEEK_API_KEY = originalKey;
    rmSync(STORE_DIR, { recursive: true, force: true });
  });

  it('returns 400 when message is missing', async () => {
    const res = await POST(fakePostRequest({ id: 'chat-x', activity: null }));
    expect(res.status).toBe(400);
  });
});
