import { existsSync, mkdirSync } from 'fs';
import { readFile, unlink, writeFile } from 'fs/promises';
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

export type ChatSummary = {
  text: string;
  // Count of messages (from the start of the full history) already folded
  // into `text` — lets the caller re-summarize only the newly aged-out
  // messages instead of redoing the whole conversation each time.
  upTo: number;
};

function getSummaryFile(id: string): string {
  return getChatFile(id).replace(/\.json$/, '.summary.json');
}

export async function loadSummary(id: string): Promise<ChatSummary | null> {
  const file = getSummaryFile(id);
  if (!existsSync(file)) return null;
  const raw = await readFile(file, 'utf8');
  return JSON.parse(raw) as ChatSummary;
}

export async function deleteChat(id: string): Promise<void> {
  const file = getChatFile(id);
  const summaryFile = getSummaryFile(id);
  await unlink(file).catch(() => {});
  await unlink(summaryFile).catch(() => {});
}

export async function saveSummary(id: string, summary: ChatSummary): Promise<void> {
  const file = getSummaryFile(id);
  if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true });
  await writeFile(file, JSON.stringify(summary, null, 2));
}
