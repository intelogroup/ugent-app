import type { UIMessage } from 'ai';

const store = new Map<string, any>();
let currentUser: { id: string } | null = { id: 'user-1' };

function makeQuery(table: string) {
  const q: any = {
    _filters: {} as Record<string, unknown>,
    select() {
      return q;
    },
    eq(col: string, val: unknown) {
      q._filters[col] = val;
      return q;
    },
    maybeSingle: async () => ({ data: store.get(q._filters.id) ?? null }),
    upsert: async (payload: any) => {
      const existing = store.get(payload.id) ?? {};
      store.set(payload.id, { ...existing, ...payload });
      return { data: null, error: null };
    },
    delete: () => ({
      eq: async (_col: string, id: string) => {
        store.delete(id);
        return { data: null, error: null };
      },
    }),
  };
  return q;
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => makeQuery(table),
    auth: { getUser: async () => ({ data: { user: currentUser } }) },
  }),
}));

import { loadChat, saveChat } from '@/lib/clea-chat-store';

function sampleMessages(): UIMessage[] {
  return [
    { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hi' }] } as UIMessage,
  ];
}

describe('clea-chat-store', () => {
  beforeEach(() => {
    store.clear();
    currentUser = { id: 'user-1' };
  });

  it('loadChat returns [] when no row exists yet', async () => {
    const messages = await loadChat('brand-new-chat-id');
    expect(messages).toEqual([]);
  });

  it('saveChat then loadChat round-trips the full message array', async () => {
    const chatId = 'test-chat-1';
    await saveChat({ chatId, messages: sampleMessages() });
    const loaded = await loadChat(chatId);
    expect(loaded).toEqual(sampleMessages());
  });

  it('saveChat is a no-op when there is no authenticated user', async () => {
    currentUser = null;
    await saveChat({ chatId: 'anon-chat', messages: sampleMessages() });
    expect(await loadChat('anon-chat')).toEqual([]);
  });
});
