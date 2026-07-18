# Clea Agent Orchestrator + Local Persistence — Design

## Problem

Clea currently has no single orchestrator. `app/api/clea-chat/route.ts` is the only
place a model is called (`streamText` + DeepSeek + `queryQbank`/`queryCurriculum`
tools), but three UI surfaces each call it independently with duplicated,
hand-rolled fetch + SSE-parsing logic:

- `components/CleaChat.tsx` (chat bubble) — `useState<Message[]>` + `sendText` +
  `lib/clea-stream.ts#consumeCleaStream`
- `components/FloatingAvatar.tsx` (lipsync avatar) — same route, same
  `consumeCleaStream`, feeds result into TTS/lipsync pipeline
- `components/CleaLiveOrb.tsx` (Live mode visual) — no direct call; presentational,
  reads `agentStatus` from `WatchContext`. The real request is driven by
  `CleaChat.tsx`'s `sendText` while in Live mode.

There is no conversation persistence (every request sends a single message, no
history), no shared state across surfaces (switching from bubble to avatar loses
context), and no production DB yet (Convex disabled, Supabase not wired for this
feature) — so this pass persists locally.

## Goals

1. All Clea traffic (chat bubble, avatar, Live orb) routes through one shared
   conversation via one orchestrator code path — no raw per-component `fetch` +
   stream parsing.
2. Conversation history persists locally (survives reload/browser restart) via a
   JSON file per chat under `data/.clea-chats/`, until a real DB (Convex/Supabase)
   replaces it.
3. Tool set stays flat (`queryQbank`, `queryCurriculum`) — no specialist subagent
   delegation layer in this pass.
4. Delete the duplicated stream-parsing code (`lib/clea-stream.ts`) once both
   consumers migrate.

## Non-Goals

- No production DB migration (Convex/Supabase) — JSON file store is an explicit
  stopgap, swappable later behind the same `loadChat`/`saveChat` interface.
- No specialist subagents / delegation — flat tools only.
- No changes to `CleaLiveOrb.tsx` visuals, TTS/lipsync pipeline internals, or the
  `WatchContext` activity-snapshot shape.
- No multi-user/auth scoping of chat history — single implicit chat id per
  browser (localStorage), matching current no-auth-gate behavior of the widget.

## Architecture

### New: `lib/clea-agent-context.tsx`

`CleaAgentProvider` + `useCleaAgent()`. Wraps one `@ai-sdk/react` `useChat`
instance:

- `id`: generated once via `generateId()` (from `ai`), persisted in
  `localStorage` under `clea-chat-id`. Same id reused across reloads so history
  resumes.
- On mount, `GET /api/clea-chat?id=<id>` to fetch prior history, then
  `setMessages(loaded)` before the user sends anything new — this is what
  actually makes the reload-persistence goal visible in the UI. If the loaded
  history is empty (new chat id, nothing sent yet), `setMessages` seeds a
  single static welcome message (moved from `CleaChat.tsx`'s current
  `WELCOME_MESSAGE` constant) instead of leaving the list empty — preserves
  today's first-open greeting without persisting it into the chat file.
- `transport`: `DefaultChatTransport` pointed at `/api/clea-chat`, with
  `prepareSendMessagesRequest` sending only `{ id, message: lastMessage }`
  (last-message-only pattern — server holds the rest), and dynamic `body`
  merging in `activity` read from `useWatch()`.
- Exposes `messages`, `sendMessage`, `status`, `error`, `stop` — same shape
  `useChat` gives natively, re-exported through the hook.

Provider nesting: `WatchProvider` already wraps `<CleaChat />` + `<FloatingAvatar />`
directly inside `components/DashboardLayout.tsx` (both mount unconditionally,
simultaneously, on every dashboard page). `CleaAgentProvider` is added inside
`DashboardLayout.tsx`, nested inside `WatchProvider`, wrapping those same two
components — not a separate top-level layout layer.

Shared mic toggle: `CleaChat.tsx` and `FloatingAvatar.tsx` each currently run
their own independent `useContinuousMic` call with their own local mic-on
state (`isMicActive` / `micOn`). Both mount together, and with a shared
conversation both mic loops would call the same `sendMessage` — turning both
mics on (e.g. Live mode auto-arms the avatar's mic while the chat mic is still
on from before) would transcribe the same speech twice into one visible
thread. To avoid this, `isMicActive` moves into `CleaAgentProvider` as a single
shared boolean (`micActive`, `setMicActive`/`toggleMic`) exposed via
`useCleaAgent()`. Only one `useContinuousMic` call remains, owned by the
provider; `CleaChat.tsx` and `FloatingAvatar.tsx` both read `micActive` (for
their mic-button UI state) and call `toggleMic()` instead of managing their own
mic state.

### Rewrite: `app/api/clea-chat/route.ts`

- Add `GET` handler: `?id=<chatId>` → `loadChat(id)` → `NextResponse.json(messages)`.
  Used by `CleaAgentProvider` on mount to restore history for the persisted
  `localStorage` id, so a reload actually shows prior messages instead of an
  empty list (closes the gap in the data-flow section below — a persisted id
  with no load-on-mount would silently drop the very feature this pass exists
  to add).
- `POST` request body: `{ id: string, message: UIMessage, activity: ActivitySnapshot | null }`.
- Load prior history via `loadChat(id)`, append `message`.
- `validateUIMessages({ messages, tools: { queryQbank, queryCurriculum } })` —
  on `TypeValidationError`, log and fall back to `[]` (drop corrupted/stale
  history rather than 500).
- `convertToModelMessages(validatedMessages)` into unchanged `streamText` call
  (same model, same system prompt via `buildSystemPrompt(activity)`, same tools,
  same `stopWhen: stepCountIs(4)`).
- `result.consumeStream()` (no await) so the turn persists even if the client
  disconnects mid-stream.
- Response: `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream, originalMessages: validatedMessages, onEnd: ({ messages }) => saveChat({ chatId: id, messages }) }) })`.

### New: `lib/clea-chat-store.ts`

- `loadChat(id: string): Promise<UIMessage[]>` — returns `[]` if file doesn't
  exist yet.
- `saveChat({ chatId, messages }): Promise<void>` — writes full `UIMessage[]` as
  JSON, pretty-printed, to `data/.clea-chats/<id>.json`.
- Id validation: `/^[A-Za-z0-9_-]+$/` regex check, plus resolved-path
  containment check (path must stay inside `data/.clea-chats/`) — same pattern
  as the AI SDK's reference persistence example, needed here because `id`
  arrives from client-controlled request body.
- `data/.clea-chats/` created on first write if missing (`mkdirSync recursive`).
- One file per chat, not append-only JSONL — `onEnd` always hands back the full
  message array, so a plain JSON array is the honest format (not line-delimited).

### Component changes

- **`CleaChat.tsx`**: remove `useState<Message[]>`, `sendText`, `nextMessageId`,
  `WELCOME_MESSAGE` constant, `consumeCleaStream` import, and its own
  `isMicActive` state. Use `useCleaAgent()` for `messages`, `sendMessage`,
  `status`, `micActive`, `toggleMic`. Render loop switches from `message.text`
  to walking `message.parts`, rendering `part.type === 'text'` segments
  (tool-call/result parts not rendered yet — no UI need this pass). Mic button
  calls `toggleMic()`; mic transcripts flow through the provider's single
  `useContinuousMic` call, not a component-local one.
- **`FloatingAvatar.tsx`**: replace its own `fetch('/api/clea-chat')` +
  `consumeCleaStream` block and its own `micOn` state with `useCleaAgent()`
  (`sendMessage`, `messages`, `micActive`, `toggleMic`); feed the final
  assistant message's joined text parts into the existing `stripMarkdown` →
  TTS → lipsync flow, unchanged from that point on.
- **`CleaLiveOrb.tsx`**: no changes.
- **Delete** `lib/clea-stream.ts` once both call sites migrate.

## Data Flow

1. User sends input from any surface (typed message, mic transcript, or Live
   mode) → shared `sendMessage` (from `useCleaAgent()`).
2. Transport POSTs `{ id, message, activity }` to `/api/clea-chat`.
3. Route loads history for `id`, appends, validates, converts, streams from
   DeepSeek with tools available.
4. Stream response updates the one shared `messages` state → all three
   components re-render from the same source.
5. `onEnd` persists the full updated history to
   `data/.clea-chats/<id>.json`.
6. Next page load: `CleaAgentProvider` reads the same `id` from `localStorage`
   and calls `GET /api/clea-chat?id=<id>` to restore history into `useChat`
   via `setMessages` before rendering the conversation.

## Error Handling

- `validateUIMessages` failure → empty-history fallback (see above), logged
  server-side, not surfaced as a hard error to the user (conversation just
  starts fresh).
- Missing `DEEPSEEK_API_KEY` → unchanged existing 500 JSON response.
- Client-side: `useChat`'s built-in `error` / `status === 'error'` states
  replace the old manual try/catch message-swap in `CleaChat.tsx`.
- Store: invalid/path-escaping chat id throws before any file I/O.

## Testing

- `__tests__/lib/clea-chat-store.test.ts`: create/load/save round-trip, id
  regex rejection, path-traversal rejection (`../../etc/passwd`-style id).
- `__tests__/lib/clea-agent-context.test.tsx`: two components under one
  `CleaAgentProvider` observe the same `messages` array after one sends
  (proves the "shared conversation across surfaces" requirement).
- Existing `__tests__/quiz-watch.test.tsx` / `__tests__/lib/watch-context.test.tsx`
  unaffected — no changes to `WatchContext` shape.

## Explicit Decisions (from design dialogue)

- One shared conversation across all 3 surfaces (not per-surface history).
- Flat tools only — no specialist subagent delegation this pass.
- Persist across reloads via local JSON file store, not session-only memory.
- JSON store is an explicit stopgap for Convex/Supabase, same load/save
  interface so swapping later is a backend change only.
