import { existsSync, rmSync } from 'fs';
import path from 'path';
import type { UIMessage } from 'ai';
import { loadChat, saveChat } from '@/lib/clea-chat-store';

const STORE_DIR = path.join(process.cwd(), 'data', '.clea-chats');

function sampleMessages(): UIMessage[] {
  return [
    { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hi' }] } as UIMessage,
  ];
}

describe('clea-chat-store', () => {
  afterEach(() => {
    rmSync(STORE_DIR, { recursive: true, force: true });
  });

  it('loadChat returns [] when no file exists yet', async () => {
    const messages = await loadChat('brand-new-chat-id');
    expect(messages).toEqual([]);
  });

  it('saveChat then loadChat round-trips the full message array', async () => {
    const chatId = 'test-chat-1';
    await saveChat({ chatId, messages: sampleMessages() });
    const loaded = await loadChat(chatId);
    expect(loaded).toEqual(sampleMessages());
    expect(existsSync(path.join(STORE_DIR, `${chatId}.json`))).toBe(true);
  });

  it('rejects ids with path-separator characters', async () => {
    await expect(loadChat('../../etc/passwd')).rejects.toThrow('Invalid chat id');
    await expect(saveChat({ chatId: '../evil', messages: [] })).rejects.toThrow('Invalid chat id');
  });

  it('rejects ids with disallowed characters', async () => {
    await expect(loadChat('has spaces')).rejects.toThrow('Invalid chat id');
    await expect(loadChat('semi;colon')).rejects.toThrow('Invalid chat id');
  });

  it('accepts alphanumeric, dash, and underscore ids', async () => {
    await expect(loadChat('abc-123_XYZ')).resolves.toEqual([]);
  });
});
