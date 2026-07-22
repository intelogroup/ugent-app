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

const chatStore = new Map<string, any[]>();

jest.mock('@/lib/clea-chat-store', () => ({
  loadChat: async (id: string) => chatStore.get(id) ?? [],
  saveChat: async ({ chatId, messages }: { chatId: string; messages: any[] }) => {
    chatStore.set(chatId, messages);
  },
  loadSummary: async () => null,
  saveSummary: async () => {},
  deleteChat: async (id: string) => {
    chatStore.delete(id);
  },
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({ order: async () => ({ data: [] }) }),
    }),
  }),
}));

import { GET, POST } from '@/app/api/clea-chat/route';
import { saveChat } from '@/lib/clea-chat-store';

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
  beforeEach(() => {
    chatStore.clear();
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
    chatStore.clear();
  });

  afterEach(() => {
    process.env.DEEPSEEK_API_KEY = originalKey;
  });

  it('returns 400 when message is missing', async () => {
    const res = await POST(fakePostRequest({ id: 'chat-x', activity: null }));
    expect(res.status).toBe(400);
  });

  it('returns 500 when DEEPSEEK_API_KEY is not configured', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const res = await POST(fakePostRequest({ id: 'chat-x', message: { id: 'm1', role: 'user', parts: [] }, activity: null }));
    expect(res.status).toBe(500);
  });
});
