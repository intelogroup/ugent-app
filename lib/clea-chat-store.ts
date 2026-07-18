import { existsSync, mkdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { UIMessage } from 'ai';

const CHAT_ID_REGEX = /^[A-Za-z0-9_-]+$/;
const STORE_DIR = path.join(process.cwd(), 'data', '.clea-chats');

function getChatFile(id: string): string {
  if (!CHAT_ID_REGEX.test(id)) {
    throw new Error('Invalid chat id');
  }

  const chatFile = path.resolve(STORE_DIR, `${id}.json`);

  // Defense in depth: keep the resolved file inside the chat directory,
  // in case a future regex change (or a bug in it) admits something like `..`.
  if (!chatFile.startsWith(`${STORE_DIR}${path.sep}`)) {
    throw new Error('Invalid chat id');
  }

  return chatFile;
}

export async function loadChat(id: string): Promise<UIMessage[]> {
  const file = getChatFile(id);
  if (!existsSync(file)) return [];
  const raw = await readFile(file, 'utf8');
  return JSON.parse(raw) as UIMessage[];
}

export async function saveChat({
  chatId,
  messages,
}: {
  chatId: string;
  messages: UIMessage[];
}): Promise<void> {
  const file = getChatFile(chatId);
  if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true });
  await writeFile(file, JSON.stringify(messages, null, 2));
}
