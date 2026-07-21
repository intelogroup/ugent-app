# Clea Agent Orchestrator + Local Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route all Clea traffic (chat bubble, floating avatar, Live orb) through one shared conversation and one orchestrator code path, with conversation history persisted locally to JSON files as a stopgap until Convex/Supabase is wired.

**Architecture:** A new `CleaAgentProvider` (React context) owns a single `@ai-sdk/react` `useChat` instance, a persisted chat id, and the one shared mic toggle. `CleaChat.tsx` and `FloatingAvatar.tsx` both consume it instead of each doing their own `fetch` + SSE parsing. `app/api/clea-chat/route.ts` gains a `GET` (load history) alongside its rewritten `POST` (append + stream + persist), backed by a new file-based `lib/clea-chat-store.ts`.

**Tech Stack:** Next.js App Router, `ai@7.0.31`, `@ai-sdk/react` (new dependency, pinned `4.0.34`), `@ai-sdk/deepseek`, Jest + React Testing Library.

## Global Constraints

- One shared conversation across all 3 surfaces, not per-surface history (spec: Explicit Decisions).
- Flat tools only (`queryQbank`, `queryCurriculum`) — no specialist subagent delegation this pass (spec: Non-Goals).
- Persistence is local JSON files under `data/.clea-chats/`, one file per chat id, full-array-per-write (not JSONL) — explicit stopgap for Convex/Supabase (spec: Architecture).
- No auth scoping of chat history — single implicit chat id per browser via `localStorage` (spec: Non-Goals).
- No changes to `CleaLiveOrb.tsx` visuals, TTS/lipsync pipeline internals, or the `WatchContext`/`ActivitySnapshot` shape (spec: Non-Goals).
- `CleaAgentProvider` nests inside `WatchProvider`, inside `components/DashboardLayout.tsx`, wrapping `<CleaChat />` + `<FloatingAvatar />` (spec: Architecture — provider nesting).
- Only one `useContinuousMic` call remains (owned by `CleaAgentProvider`), exposed as a shared `micActive`/`toggleMic` — prevents duplicate transcription across surfaces (spec: Architecture — shared mic toggle).
- Welcome message is seeded client-side when loaded history is empty, not persisted into the chat file (spec: Architecture — on-mount load).

---

### Task 1: Install `@ai-sdk/react`

**Files:**
- Modify: `package.json`, `package-lock.json` (or equivalent lockfile)

**Interfaces:**
- Produces: `@ai-sdk/react` package available for import (`useChat` hook) in later tasks.

- [ ] **Step 1: Install the exact pinned version**

Run: `npm install @ai-sdk/react@4.0.34`

- [ ] **Step 2: Verify it resolves against the installed `ai` version**

Run: `node -e "console.log(require('@ai-sdk/react/package.json').dependencies.ai, require('ai/package.json').version)"`
Expected: both print `7.0.31` (or `^7.0.31` / `7.0.31` — matching major.minor.patch)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @ai-sdk/react for shared Clea useChat instance"
```

---

### Task 2: `lib/clea-chat-store.ts` — local JSON persistence

**Files:**
- Create: `lib/clea-chat-store.ts`
- Test: `__tests__/lib/clea-chat-store.test.ts`

**Interfaces:**
- Produces:
  - `loadChat(id: string): Promise<UIMessage[]>` — returns `[]` if the file doesn't exist.
  - `saveChat(args: { chatId: string; messages: UIMessage[] }): Promise<void>`.
  - Both throw `Error('Invalid chat id')` synchronously (before any file I/O) if `id` fails validation.
- Consumes: `UIMessage` type from `ai`.

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/lib/clea-chat-store.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/lib/clea-chat-store.test.ts`
Expected: FAIL — `Cannot find module '@/lib/clea-chat-store'`

- [ ] **Step 3: Write the implementation**

```typescript
// lib/clea-chat-store.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/lib/clea-chat-store.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Add the store directory to `.gitignore`**

Check `.gitignore` for a `data/.clea-chats` or similar local-scratch-data entry; if absent, append:

```
data/.clea-chats/
```

- [ ] **Step 6: Commit**

```bash
git add lib/clea-chat-store.ts __tests__/lib/clea-chat-store.test.ts .gitignore
git commit -m "feat: add local JSON file store for Clea chat persistence"
```

---

### Task 3: Rewrite `app/api/clea-chat/route.ts` — GET (load) + POST (append/stream/persist)

**Files:**
- Modify: `app/api/clea-chat/route.ts` (full rewrite of body, same file)

**Interfaces:**
- Consumes: `loadChat`, `saveChat` from `lib/clea-chat-store.ts` (Task 2); `queryQbank`, `queryCurriculum` from `lib/clea-tools.ts` (unchanged); `ActivitySnapshot` from `lib/watch-context.tsx` (unchanged).
- Produces:
  - `GET /api/clea-chat?id=<chatId>` → `200` with JSON body `UIMessage[]` (the loaded history, `[]` if none), or `400` with `{ error: 'id is required' }` if `id` query param missing.
  - `POST /api/clea-chat` body `{ id: string; message: UIMessage; activity: ActivitySnapshot | null }` → same streaming response contract as before (`createUIMessageStreamResponse`), now backed by loaded+validated+persisted history instead of a single message.

- [ ] **Step 1: Write the failing route tests**

Check whether route-level tests already exist for this file (`grep -rl "clea-chat" __tests__`) — if none, add one. Uses `node-mocks-http`-free approach: call the exported handlers directly with a `Request`/`NextRequest` built inline (matches how Next.js route handlers are tested elsewhere in this repo — check `__tests__/quiz-watch.test.tsx` sibling patterns for API route test conventions first; if this repo has no existing API-route test convention, use the inline `Request` approach below, which needs no extra libraries).

```typescript
// __tests__/api/clea-chat.test.ts
import { rmSync } from 'fs';
import path from 'path';
import { GET, POST } from '@/app/api/clea-chat/route';
import { saveChat } from '@/lib/clea-chat-store';

const STORE_DIR = path.join(process.cwd(), 'data', '.clea-chats');

describe('GET /api/clea-chat', () => {
  afterEach(() => {
    rmSync(STORE_DIR, { recursive: true, force: true });
  });

  it('returns [] for a chat id with no saved history', async () => {
    const req = new Request('http://localhost/api/clea-chat?id=fresh-chat');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns 400 when id is missing', async () => {
    const req = new Request('http://localhost/api/clea-chat');
    const res = await GET(req as any);
    expect(res.status).toBe(400);
  });

  it('returns previously saved history', async () => {
    const messages = [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }];
    await saveChat({ chatId: 'has-history', messages: messages as any });
    const req = new Request('http://localhost/api/clea-chat?id=has-history');
    const res = await GET(req as any);
    expect(await res.json()).toEqual(messages);
  });
});

describe('POST /api/clea-chat', () => {
  afterEach(() => {
    rmSync(STORE_DIR, { recursive: true, force: true });
  });

  it('returns 400 when message is missing', async () => {
    const req = new Request('http://localhost/api/clea-chat', {
      method: 'POST',
      body: JSON.stringify({ id: 'chat-x', activity: null }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
```

Note: `DEEPSEEK_API_KEY` must be set (or mocked) in the test environment for any POST test that reaches `streamText` — the 400-for-missing-message test above returns before that check is relevant, so it needs no key. Do not add a happy-path streaming POST test here; that requires mocking the DeepSeek provider, which is out of scope for this task (existing route had no such test either — confirm with `grep -rl "clea-chat" __tests__` before writing this task's tests, and skip duplicating any that already exist).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/api/clea-chat.test.ts`
Expected: FAIL — `route.ts` has no exported `GET`, and `POST` doesn't yet validate `message` presence against the new body shape (or fails for a different reason if the old route already 400s on missing `message` — check the actual failure message and confirm it's "no GET export" driving the first two failures).

- [ ] **Step 3: Write the implementation**

```typescript
// app/api/clea-chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  stepCountIs,
  toUIMessageStream,
  validateUIMessages,
  TypeValidationError,
  type UIMessage,
} from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import type { ActivitySnapshot } from '@/lib/watch-context';
import { queryQbank, queryCurriculum } from '@/lib/clea-tools';
import { loadChat, saveChat } from '@/lib/clea-chat-store';

const tools = { queryQbank, queryCurriculum };

function buildSystemPrompt(activity: ActivitySnapshot | null): string {
  const base =
    "You are Clea, a friendly and concise USMLE Step 1 study assistant for the Ugent platform. Keep answers short and focused.";
  if (!activity) return base;
  const subjectLabel = activity.subject ? ` (${activity.subject}${activity.system ? `, ${activity.system}` : ''})` : '';
  return `${base} The student is currently on quiz question ${activity.questionNumber} of ${activity.totalQuestions}${subjectLabel}, difficulty: ${activity.difficulty}. They have answered ${activity.totalAnsweredSoFar} questions so far, ${activity.correctSoFar} correctly. Use this context to tailor your answer when relevant.`;
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }
  const messages = await loadChat(id);
  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ error: 'DEEPSEEK_API_KEY not configured' }, { status: 500 });
  }

  const { id, message, activity } = (await request.json()) as {
    id: string;
    message: UIMessage;
    activity: ActivitySnapshot | null;
  };

  if (!id || !message) {
    return NextResponse.json({ error: 'id and message are required' }, { status: 400 });
  }

  const previousMessages = await loadChat(id);

  let validatedMessages: UIMessage[];
  try {
    validatedMessages = await validateUIMessages({
      messages: [...previousMessages, message],
      tools,
    });
  } catch (error) {
    if (error instanceof TypeValidationError) {
      console.error('clea-chat history validation failed, starting fresh', error);
      validatedMessages = [message];
    } else {
      throw error;
    }
  }

  const result = streamText({
    model: deepseek('deepseek-chat'),
    system: buildSystemPrompt(activity),
    messages: convertToModelMessages(validatedMessages),
    tools,
    stopWhen: stepCountIs(4),
    onError: ({ error }) => {
      console.error('clea-chat streamText error', error);
    },
  });

  result.consumeStream();

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: validatedMessages,
      onEnd: ({ messages }) => {
        void saveChat({ chatId: id, messages });
      },
    }),
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/api/clea-chat.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/clea-chat/route.ts __tests__/api/clea-chat.test.ts
git commit -m "feat: add GET history load + persisted history to clea-chat route"
```

---

### Task 4: `lib/clea-agent-context.tsx` — shared provider

**Files:**
- Create: `lib/clea-agent-context.tsx`
- Test: `__tests__/lib/clea-agent-context.test.tsx`

**Interfaces:**
- Consumes: `useChat` from `@ai-sdk/react` (Task 1); `DefaultChatTransport`, `generateId` from `ai`; `useWatch` from `lib/watch-context.tsx` (unchanged); `useContinuousMic` from `lib/use-continuous-mic.ts` (unchanged).
- Produces:
  - `CleaAgentProvider({ children }: { children: ReactNode })` — component.
  - `useCleaAgent(): { messages: UIMessage[]; sendMessage: (msg: { text: string }) => void; status: 'submitted' | 'streaming' | 'ready' | 'error'; error: Error | undefined; micActive: boolean; toggleMic: () => void }`.

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/lib/clea-agent-context.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CleaAgentProvider, useCleaAgent } from '@/lib/clea-agent-context';

// The provider issues a GET on mount to restore history — mock fetch so
// tests don't hit a real server, and so we can assert both surfaces see
// the same messages after a mocked POST/stream round-trip.
beforeEach(() => {
  window.localStorage.clear();
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/clea-chat') && (!('method' in (arguments[1] ?? {})))) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    return new Response(JSON.stringify([]), { status: 200 });
  }) as any;
});

function SurfaceA() {
  const { messages } = useCleaAgent();
  return <p data-testid="surface-a-count">{messages.length}</p>;
}

function SurfaceB() {
  const { messages } = useCleaAgent();
  return <p data-testid="surface-b-count">{messages.length}</p>;
}

describe('CleaAgentProvider / useCleaAgent', () => {
  it('seeds a welcome message when loaded history is empty', async () => {
    render(
      <CleaAgentProvider>
        <SurfaceA />
      </CleaAgentProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('surface-a-count')).toHaveTextContent('1');
    });
  });

  it('two consumers under one provider share the same messages array', async () => {
    render(
      <CleaAgentProvider>
        <SurfaceA />
        <SurfaceB />
      </CleaAgentProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('surface-a-count')).toHaveTextContent('1');
      expect(screen.getByTestId('surface-b-count')).toHaveTextContent('1');
    });
  });

  it('persists a chat id to localStorage on first mount', async () => {
    render(
      <CleaAgentProvider>
        <SurfaceA />
      </CleaAgentProvider>
    );
    await waitFor(() => {
      expect(window.localStorage.getItem('clea-chat-id')).toBeTruthy();
    });
  });

  it('toggleMic flips a shared micActive flag', async () => {
    function MicConsumer() {
      const { micActive, toggleMic } = useCleaAgent();
      return (
        <div>
          <p data-testid="mic-state">{String(micActive)}</p>
          <button onClick={toggleMic}>toggle mic</button>
        </div>
      );
    }
    render(
      <CleaAgentProvider>
        <MicConsumer />
      </CleaAgentProvider>
    );
    expect(screen.getByTestId('mic-state')).toHaveTextContent('false');
    fireEvent.click(screen.getByText('toggle mic'));
    expect(screen.getByTestId('mic-state')).toHaveTextContent('true');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/clea-agent-context.test.tsx`
Expected: FAIL — `Cannot find module '@/lib/clea-agent-context'`

- [ ] **Step 3: Write the implementation**

```tsx
// lib/clea-agent-context.tsx
'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, generateId, type UIMessage } from 'ai';
import { useWatch } from '@/lib/watch-context';
import { useContinuousMic } from '@/lib/use-continuous-mic';

const CHAT_ID_KEY = 'clea-chat-id';

const WELCOME_MESSAGE: UIMessage = {
  id: 'welcome',
  role: 'assistant',
  parts: [
    {
      type: 'text',
      text: "Hi, I'm Clea, your Ugent study assistant. My full tutoring abilities are coming soon. You can try the chat interface now.",
    },
  ],
};

type CleaAgentValue = ReturnType<typeof useChat> & {
  micActive: boolean;
  toggleMic: () => void;
};

const CleaAgentContext = createContext<CleaAgentValue | null>(null);

export function CleaAgentProvider({ children }: { children: ReactNode }) {
  const { activity } = useWatch();
  const activityRef = useRef(activity);
  activityRef.current = activity;

  const [chatId] = useState(() => {
    if (typeof window === 'undefined') return generateId();
    const existing = window.localStorage.getItem(CHAT_ID_KEY);
    if (existing) return existing;
    const created = generateId();
    window.localStorage.setItem(CHAT_ID_KEY, created);
    return created;
  });

  const chat = useChat({
    id: chatId,
    transport: new DefaultChatTransport({
      api: '/api/clea-chat',
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: { id, message: messages[messages.length - 1], activity: activityRef.current },
      }),
    }),
  });

  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;

    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/clea-chat?id=${encodeURIComponent(chatId)}`);
      const loaded: UIMessage[] = res.ok ? await res.json() : [];
      if (cancelled) return;
      chat.setMessages(loaded.length > 0 ? loaded : [WELCOME_MESSAGE]);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const [micActive, setMicActive] = useState(false);
  const toggleMic = () => setMicActive((active) => !active);

  useContinuousMic(micActive, (text) => {
    chat.sendMessage({ text });
  });

  return (
    <CleaAgentContext.Provider value={{ ...chat, micActive, toggleMic }}>
      {children}
    </CleaAgentContext.Provider>
  );
}

export function useCleaAgent(): CleaAgentValue {
  const value = useContext(CleaAgentContext);
  if (!value) {
    throw new Error('useCleaAgent must be used within a CleaAgentProvider');
  }
  return value;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/clea-agent-context.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/clea-agent-context.tsx __tests__/lib/clea-agent-context.test.tsx
git commit -m "feat: add CleaAgentProvider — shared useChat, chat id, and mic toggle"
```

---

### Task 5: Wire `CleaAgentProvider` into `DashboardLayout.tsx`

**Files:**
- Modify: `components/DashboardLayout.tsx`

**Interfaces:**
- Consumes: `CleaAgentProvider` from `lib/clea-agent-context.tsx` (Task 4).

- [ ] **Step 1: Add the provider inside `WatchProvider`, wrapping `CleaChat` and `FloatingAvatar`**

```tsx
// components/DashboardLayout.tsx
'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import CleaChat from './CleaChat';
import FloatingAvatar from './FloatingAvatar';
import { WatchProvider } from '@/lib/watch-context';
import { CleaAgentProvider } from '@/lib/clea-agent-context';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <WatchProvider>
      <CleaAgentProvider>
        <div className="min-h-screen bg-background-secondary">
          {/* Sidebar: desktop only */}
          <Sidebar />
          {/* Top tabs nav: mobile only */}
          <MobileNav />
          <CleaChat />
          <FloatingAvatar />
          {/* Main content: offset by sidebar on md+, no offset on mobile */}
          <main className="md:ml-64 px-4 py-6 md:p-10">
            {children}
          </main>
        </div>
      </CleaAgentProvider>
    </WatchProvider>
  );
}
```

- [ ] **Step 2: Run the full test suite to confirm nothing else broke**

Run: `npx jest`
Expected: All existing suites still pass (CleaChat and FloatingAvatar aren't migrated yet in this task, so they still use their old standalone logic — this task only adds the provider around them, it doesn't yet change what they consume. Confirm no test imports/renders `DashboardLayout` in a way that now requires `CleaAgentProvider`'s `fetch` mock; if one does, add a `global.fetch` mock to that test matching Task 4's pattern.)

- [ ] **Step 3: Commit**

```bash
git add components/DashboardLayout.tsx
git commit -m "feat: mount CleaAgentProvider in DashboardLayout"
```

---

### Task 6: Migrate `CleaChat.tsx` to `useCleaAgent()`

**Files:**
- Modify: `components/CleaChat.tsx` (full rewrite of internals, JSX structure largely unchanged)

**Interfaces:**
- Consumes: `useCleaAgent()` from `lib/clea-agent-context.tsx` (Task 4) — `messages`, `sendMessage`, `status`, `micActive`, `toggleMic`.

- [ ] **Step 1: Replace state and handlers**

Remove: `useState<Message[]>`, `WELCOME_MESSAGE`, `nextMessageId`, `sendText`, `isMicActive` state, `toggleMicrophone`, the `consumeCleaStream` import, and the `useContinuousMic` call (now owned by the provider).

Replace the top of the component:

```tsx
// components/CleaChat.tsx (relevant excerpt — keep existing imports for icons, CleaLiveOrb, drag handling, etc.)
'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  BoltIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  EyeSlashIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import CleaLiveOrb from './CleaLiveOrb';
import { useWatch } from '@/lib/watch-context';
import { useCleaAgent } from '@/lib/clea-agent-context';

type CleaMode = 'closed' | 'chat' | 'live';

export default function CleaChat() {
  const { watchEnabled, toggleWatch, activity } = useWatch();
  const { messages, sendMessage, status, micActive, toggleMic } = useCleaAgent();
  const [mode, setMode] = useState<CleaMode>('closed');
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
```

- [ ] **Step 2: Replace `sendMessage`/form submit wiring**

```tsx
  const sendMessage_ = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    sendMessage({ text });
  };
```

(Keep the function name distinct from the destructured `sendMessage` from the hook — name the form handler `handleSend` instead of shadowing. Rename the `<form onSubmit={sendMessage_}>` reference to `handleSend` throughout for clarity.)

- [ ] **Step 3: Replace the close/live/mic handlers to use the shared `micActive`/`toggleMic`**

```tsx
  const closeClea = () => {
    setMode('closed');
  };

  const startLive = () => {
    setMode('live');
    if (!micActive) toggleMic();
  };
```

- [ ] **Step 4: Replace the message rendering loop to walk `.parts`**

```tsx
          <div className="flex-1 space-y-3 overflow-y-auto bg-neutral-50 p-4" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'rounded-br-md bg-primary-600 text-white'
                    : 'rounded-bl-md border border-neutral-200 bg-white text-neutral-700'
                }`}>
                  {message.parts
                    .filter((part) => part.type === 'text')
                    .map((part, index) => <span key={index}>{(part as { text: string }).text}</span>)}
                </p>
              </div>
            ))}
            {status === 'submitted' && (
              <div className="flex justify-start">
                <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700">
                  Clea is thinking…
                </p>
              </div>
            )}
          </div>
```

- [ ] **Step 5: Update the mic button and submit-disabled logic**

```tsx
  const microphoneButton = (compact = false) => (
    <button
      type="button"
      onClick={toggleMic}
      aria-label={micActive ? 'Stop visual microphone' : 'Start visual microphone'}
      aria-pressed={micActive}
      className={`${compact ? 'h-9 w-9' : 'h-11 w-11'} flex items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
        micActive
          ? 'border-primary-500 bg-primary-600 text-white shadow-md'
          : 'border-neutral-200 bg-white text-neutral-600 hover:border-primary-300 hover:text-primary-600'
      }`}
    >
      <MicrophoneIcon className="h-4 w-4" />
    </button>
  );
```

Update the input's `placeholder` to `micActive ? 'Listening...' : 'Ask Clea...'`, and the standalone "Listening..." pill (closed-mode) to check `micActive` instead of `isMicActive`.

- [ ] **Step 6: Update the Escape-key handler to stop mic on close**

```tsx
  useEffect(() => {
    if (mode === 'closed') return;
    if (mode === 'chat') inputRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMode('closed');
        if (micActive) toggleMic();
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
```

- [ ] **Step 7: Manually verify in the browser**

Run: `npm run dev`, open a dashboard page, open the Clea chat bubble, send a message, confirm streaming reply appears; reload the page and confirm the prior message and the reply are still shown (persistence); open the FloatingAvatar's mic and confirm it does not also fire a duplicate message in the chat bubble transcript when the chat bubble's mic is off.

- [ ] **Step 8: Commit**

```bash
git add components/CleaChat.tsx
git commit -m "feat: migrate CleaChat to shared useCleaAgent, drop local stream parsing"
```

---

### Task 7: Migrate `FloatingAvatar.tsx` to `useCleaAgent()`, speak new assistant replies

**Files:**
- Modify: `components/FloatingAvatar.tsx`

**Interfaces:**
- Consumes: `useCleaAgent()` from `lib/clea-agent-context.tsx` (Task 4) — `messages`, `micActive`, `toggleMic`.
- Produces: no new exports; internal behavior change only (speaks the latest assistant message once streaming finishes, guarded so page-load history restore doesn't trigger speech).

**Design note:** `FloatingAvatar` no longer sends its own message on mic input (the mic is now owned entirely by `CleaAgentProvider` — see Task 4's `useContinuousMic` call). Instead, it watches the shared `messages` array and speaks the most recent assistant message once it's no longer streaming, so a reply Clea gives anywhere (chat bubble or avatar mic) gets spoken through the avatar. A `hasHydratedRef` (set after the initial load-from-server completes, mirrored via a `status` transition) and a `lastSpokenIdRef` prevent replaying old history through TTS on mount.

- [ ] **Step 1: Remove the component's own mic state and its own `/api/clea-chat` fetch**

Remove: `const [micOn, setMicOn] = useState(false);` and the `useContinuousMic(micOn, async (userText) => { ... })` block that calls `fetch('/api/clea-chat')` + `consumeCleaStream`. Remove the `consumeCleaStream` import.

- [ ] **Step 2: Add the shared agent hook and a speak-on-new-assistant-message effect**

```tsx
// components/FloatingAvatar.tsx (add near the top, alongside other imports)
import { useCleaAgent } from '@/lib/clea-agent-context';
```

```tsx
// inside the component, replacing the removed mic block:
  const { messages, status, micActive, toggleMic } = useCleaAgent();
  const lastSpokenIdRef = useRef<string | null>(null);
  const hasSeenInitialMessagesRef = useRef(false);

  useEffect(() => {
    // Skip the very first non-empty messages snapshot — that's history
    // restored from disk on mount, not a fresh reply to speak aloud.
    if (!hasSeenInitialMessagesRef.current) {
      if (messages.length > 0) {
        hasSeenInitialMessagesRef.current = true;
        lastSpokenIdRef.current = messages[messages.length - 1]?.id ?? null;
      }
      return;
    }

    if (status !== 'ready') return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || last.id === lastSpokenIdRef.current) return;

    lastSpokenIdRef.current = last.id;
    const text = last.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as { text: string }).text)
      .join('');
    if (text.trim()) void speak(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, status]);
```

- [ ] **Step 3: Update the mic button to use the shared `micActive`/`toggleMic`**

```tsx
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleMic();
          }}
          aria-label={micActive ? 'Stop listening' : 'Start listening'}
          aria-pressed={micActive}
          className={`absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full text-white transition disabled:opacity-50 ${
            micActive ? 'bg-primary-600' : 'bg-black/50 hover:bg-black/70'
          }`}
        >
          <MicrophoneIcon className="h-3.5 w-3.5" />
        </button>
```

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev`. Open the FloatingAvatar, click its mic button, speak a question — confirm it appears as a user message (check via the CleaChat bubble open at the same time) and the avatar speaks the reply. Reload the page with an existing chat history — confirm the avatar does **not** speak old history on load, only new replies after that.

- [ ] **Step 5: Commit**

```bash
git add components/FloatingAvatar.tsx
git commit -m "feat: migrate FloatingAvatar to shared useCleaAgent, speak new replies only"
```

---

### Task 8: Delete `lib/clea-stream.ts`

**Files:**
- Delete: `lib/clea-stream.ts`

**Interfaces:**
- Consumes: none (this task only runs after Tasks 6 and 7 have removed the last two importers).

- [ ] **Step 1: Confirm no remaining importers**

Run: `grep -rl "clea-stream" --include="*.ts" --include="*.tsx" app lib components`
Expected: no output (empty)

- [ ] **Step 2: Delete the file**

```bash
git rm lib/clea-stream.ts
```

- [ ] **Step 3: Run the full test suite**

Run: `npx jest`
Expected: all suites pass, no import errors

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove dead lib/clea-stream.ts after useChat migration"
```

---

### Task 9: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx jest`
Expected: all tests pass, including `__tests__/quiz-watch.test.tsx` and `__tests__/lib/watch-context.test.tsx` (unaffected by this work per the spec's non-goals).

- [ ] **Step 2: Type-check**

Run: `rm -rf .next && npx tsc --noEmit`
Expected: no errors (the `rm -rf .next` avoids stale `.next/dev/types/validator.ts` phantom errors per this repo's known gotcha — see `CLAUDE.md` Learnings).

- [ ] **Step 3: Manual end-to-end smoke test**

Run: `npm run dev`. On a dashboard page:
1. Open CleaChat, send "What's a common cause of chest pain?" — confirm streamed reply.
2. Reload the page — confirm the same conversation (including the reply) is still shown.
3. Open FloatingAvatar — confirm it shows the same conversation history is available (via shared state) and that using its mic adds to the same thread visible in CleaChat.
4. Turn on CleaChat's mic and FloatingAvatar's mic in the same session — confirm only one mic is actually active at a time (shared `micActive`), not two independent recognizers.

- [ ] **Step 4: No commit needed** — this task is verification-only; if any step fails, fix in the relevant earlier task's files and re-commit there.
