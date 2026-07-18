# Watch — design spec

Date: 2026-07-18
Status: approved

## Purpose

Let the user opt Clea into seeing what they're doing on the quiz page in real
time — current question, subject/system, whether it's answered, running
score — so a future real Clea response can be grounded in it. This spec
covers the context-capture plumbing and UI only; it does not wire up a real
LLM call (Clea's chat reply stays a canned placeholder, now interpolated
with the captured context when available).

## Non-goals

- No screen/video capture, no DOM scraping, no vision APIs. Context comes
  entirely from existing React state the quiz page already has.
- No real AI reply generation. `CleaChat`'s reply stays a hardcoded string;
  Watch only makes that string context-aware via interpolation.
- No proactive commentary — Clea never speaks unprompted. Watch only changes
  what's available when the user opens chat and sends a message.
- No pages besides `app/quiz/page.tsx` publish activity in this pass
  (Curriculum, Strategy Hub, etc. are out of scope).
- No cross-tab sync. Watch state and activity are per-tab (in-memory
  context); only the on/off preference persists (localStorage).

## Architecture

A single React context, `lib/watch-context.tsx`, holds:

```ts
type ActivitySnapshot = {
  page: 'quiz';
  questionNumber: number;   // 1-indexed
  totalQuestions: number;
  subject: string | null;
  system: string | null;
  difficulty: string;
  isAnswered: boolean;
  correctSoFar: number;
  totalAnsweredSoFar: number;
};

type WatchContextValue = {
  watchEnabled: boolean;
  toggleWatch: () => void;
  activity: ActivitySnapshot | null;
  setActivity: (a: ActivitySnapshot | null) => void;
};
```

`WatchProvider` wraps the children rendered inside `DashboardLayout`
(alongside `Sidebar`, `CleaChat`, `FloatingAvatar`), so any dashboard page
(producer) and `CleaChat` (consumer) share it via a `useWatch()` hook — no
prop drilling.

`watchEnabled` persists to `localStorage['clea-watch-enabled']` (default
`false`, mirroring the existing `curriculum-completed-blocks` /
`quiz-attempts` localStorage pattern already used in this codebase).
`activity` is in-memory only — it should reflect "what's happening right
now," not survive a reload.

## Data flow

1. User clicks the eye-icon toggle in `CleaChat`'s header (next to the
   existing Live/Close buttons). This flips `watchEnabled` and persists it.
2. On `app/quiz/page.tsx`, a `useEffect` depending on
   `[watchEnabled, currentIndex, selectedIndex, isSubmitted, correctCount]`
   calls `setActivity({...})` with a freshly built snapshot whenever
   `watchEnabled` is true. When `watchEnabled` is false the effect body is a
   no-op (it does not clear an existing snapshot by itself — see step 4).
3. On mount, if `watchEnabled` is already true (e.g. user enabled Watch on a
   previous quiz and it's still on), the first render's effect run publishes
   the snapshot immediately — no extra wiring needed since the effect deps
   already cover initial state.
4. On unmount, or whenever `watchEnabled` flips to `false`, the quiz page
   calls `setActivity(null)` — the same cleanup path handles both "left the
   page" and "user turned Watch off while on the page."
5. `CleaChat` reads `{ watchEnabled, activity }`. When `activity` is
   present, it renders a small line under "Study Assistant":
   `Watching: Q{questionNumber}/{totalQuestions} · {subject}`.
6. Sending a chat message still returns the existing hardcoded placeholder
   reply, but the string is now built via a small helper:
   - No `activity`: unchanged existing copy.
   - With `activity`: append a second sentence, e.g. *"I can see you're on
     question {questionNumber} of {totalQuestions} ({subject}) — once my
     full tutoring is live, I'll use that directly."*
   This is plain string interpolation in `CleaChat`, not a network call.

## Components touched

- **New** `lib/watch-context.tsx` — `WatchProvider`, `useWatch()`,
  `ActivitySnapshot` type.
- **Edit** `components/DashboardLayout.tsx` — wrap children in
  `WatchProvider`.
- **Edit** `components/CleaChat.tsx` — eye-icon toggle button (using
  `EyeIcon`/`EyeSlashIcon` from `@heroicons/react/24/outline`, matching the
  existing icon set already imported there), "Watching: …" label, and the
  contextualized placeholder reply.
- **Edit** `app/quiz/page.tsx` — publish/clear the activity snapshot.

## Edge cases

- Watch off the entire session: quiz page's effect never publishes,
  `CleaChat` never shows the label, placeholder reply is unchanged. Zero
  behavioral difference from today.
- User turns Watch on mid-quiz: next state change (or the toggle itself,
  since `watchEnabled` is an effect dependency) publishes a snapshot
  immediately.
- User navigates away from the quiz (or finishes it and is routed to
  results) with Watch still on: unmount cleanup clears `activity`, so
  `CleaChat`'s label disappears and the placeholder reverts to its generic
  form until the user is back on a page that publishes.
- Quiz page unmounted before `questions` finishes loading (still `null`):
  the publishing effect guards on `questions` being loaded, so no
  snapshot with garbage/placeholder values is ever published.

## Testing

- Manual: toggle Watch on, step through a few quiz questions, confirm the
  "Watching: …" label updates each time; submit an answer and confirm
  `correctSoFar`/`isAnswered` reflect it; send a chat message and confirm
  the reply mentions the current question; navigate to `/dashboard` and
  confirm the label disappears and the placeholder reverts.
- Manual: toggle Watch off mid-quiz, confirm the label disappears
  immediately and the next chat reply is generic again.
- Manual: reload the page with Watch previously left on, confirm the
  toggle stays on (localStorage) but no stale "Watching: …" label appears
  until the quiz page actually publishes a fresh snapshot.
