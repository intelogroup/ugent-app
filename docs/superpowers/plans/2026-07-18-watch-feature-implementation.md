# Watch Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Watch feature per `docs/superpowers/specs/2026-07-18-watch-feature-design.md` — a shared context that lets the quiz page publish a live "what the user is doing" snapshot, an eye-icon toggle + "Watching: …" label in `CleaChat`, and a contextualized (still-canned) placeholder reply — with an automated test suite covering all of it.

**Architecture:** A single React context (`lib/watch-context.tsx`) with a `watchEnabled` flag (persisted to `localStorage['clea-watch-enabled']`) and an in-memory `activity` snapshot. `WatchProvider` wraps `DashboardLayout`'s children. The quiz page (producer) publishes/clears snapshots via a `useEffect`; `CleaChat` (consumer) reads them for the label and reply text. Two pure helper functions (`buildQuizSnapshot`, `buildWatchReply`) carry the actual logic so it's unit-testable without rendering the full page tree.

**Tech Stack:** Next.js 16 App Router, React 19, Jest + `@testing-library/react` (existing suite, run via `npm test`), TypeScript.

## Global Constraints

- `activity.subject` / `activity.system` must be read from the **current question** (`questions[currentIndex].subject`/`.system`), never from the route-level `?subject=`/`?system=` filter params — they can diverge on mixed-subject quizzes (spec correction #2).
- No real LLM call — the placeholder reply stays a hardcoded string, only string-interpolated with `activity` when present.
- No proactive commentary — Watch only changes what's available when the user sends a chat message themselves.
- `watchEnabled` persists across reloads (localStorage); `activity` does not (in-memory only, cleared on unmount/navigate-away/watch-off).
- Follow existing test conventions: RTL + `fireEvent`, tests live under `__tests__/`, run via `npm test`.

---

### Task 1: Watch context module

**Files:**
- Create: `lib/watch-context.tsx`
- Test: `__tests__/lib/watch-context.test.tsx`

**Interfaces:**
- Produces (used by Tasks 2–4):
  - `export type ActivitySnapshot = { page: 'quiz'; questionNumber: number; totalQuestions: number; subject: string | null; system: string | null; difficulty: string; isAnswered: boolean; correctSoFar: number; totalAnsweredSoFar: number }`
  - `export function WatchProvider({ children }: { children: React.ReactNode }): JSX.Element`
  - `export function useWatch(): { watchEnabled: boolean; toggleWatch: () => void; activity: ActivitySnapshot | null; setActivity: (a: ActivitySnapshot | null) => void }`
  - `export function buildQuizSnapshot(question: { subject: string; system: string; difficulty: string }, questionNumber: number, totalQuestions: number, isAnswered: boolean, correctSoFar: number, totalAnsweredSoFar: number): ActivitySnapshot`
  - `export function buildWatchReply(baseReply: string, activity: ActivitySnapshot | null): string`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/watch-context.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { useEffect } from 'react';
import { WatchProvider, useWatch, buildQuizSnapshot, buildWatchReply, ActivitySnapshot } from '@/lib/watch-context';

function Consumer() {
  const { watchEnabled, toggleWatch, activity, setActivity } = useWatch();
  return (
    <div>
      <p data-testid="enabled">{String(watchEnabled)}</p>
      <p data-testid="activity">{activity ? `${activity.questionNumber}/${activity.totalQuestions}` : 'none'}</p>
      <button onClick={toggleWatch}>toggle</button>
      <button
        onClick={() =>
          setActivity({
            page: 'quiz',
            questionNumber: 3,
            totalQuestions: 20,
            subject: 'Cardiovascular',
            system: 'Cardiovascular',
            difficulty: 'medium',
            isAnswered: false,
            correctSoFar: 1,
            totalAnsweredSoFar: 2,
          })
        }
      >
        publish
      </button>
    </div>
  );
}

describe('WatchProvider / useWatch', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to disabled with no activity', () => {
    render(
      <WatchProvider>
        <Consumer />
      </WatchProvider>
    );
    expect(screen.getByTestId('enabled')).toHaveTextContent('false');
    expect(screen.getByTestId('activity')).toHaveTextContent('none');
  });

  it('toggles watchEnabled and persists it to localStorage', () => {
    render(
      <WatchProvider>
        <Consumer />
      </WatchProvider>
    );
    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('enabled')).toHaveTextContent('true');
    expect(window.localStorage.getItem('clea-watch-enabled')).toBe('true');
  });

  it('hydrates watchEnabled from localStorage on mount', () => {
    window.localStorage.setItem('clea-watch-enabled', 'true');
    render(
      <WatchProvider>
        <Consumer />
      </WatchProvider>
    );
    expect(screen.getByTestId('enabled')).toHaveTextContent('true');
  });

  it('shares published activity with consumers', () => {
    render(
      <WatchProvider>
        <Consumer />
      </WatchProvider>
    );
    fireEvent.click(screen.getByText('publish'));
    expect(screen.getByTestId('activity')).toHaveTextContent('3/20');
  });

  it('useWatch works without a provider (safe no-op defaults)', () => {
    render(<Consumer />);
    expect(screen.getByTestId('enabled')).toHaveTextContent('false');
    expect(screen.getByTestId('activity')).toHaveTextContent('none');
    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('enabled')).toHaveTextContent('false');
  });
});

describe('buildQuizSnapshot', () => {
  it('builds a snapshot from question fields and counters', () => {
    const snapshot = buildQuizSnapshot(
      { subject: 'Cardiovascular', system: 'Cardiovascular', difficulty: 'medium' },
      3,
      20,
      false,
      1,
      2
    );
    expect(snapshot).toEqual<ActivitySnapshot>({
      page: 'quiz',
      questionNumber: 3,
      totalQuestions: 20,
      subject: 'Cardiovascular',
      system: 'Cardiovascular',
      difficulty: 'medium',
      isAnswered: false,
      correctSoFar: 1,
      totalAnsweredSoFar: 2,
    });
  });
});

describe('buildWatchReply', () => {
  const base = 'Clea is in placeholder mode for now.';

  it('returns the base reply unchanged when there is no activity', () => {
    expect(buildWatchReply(base, null)).toBe(base);
  });

  it('appends question context when activity is present', () => {
    const activity: ActivitySnapshot = {
      page: 'quiz',
      questionNumber: 3,
      totalQuestions: 20,
      subject: 'Cardiovascular',
      system: 'Cardiovascular',
      difficulty: 'medium',
      isAnswered: false,
      correctSoFar: 1,
      totalAnsweredSoFar: 2,
    };
    const result = buildWatchReply(base, activity);
    expect(result).toContain(base);
    expect(result).toContain('question 3 of 20');
    expect(result).toContain('Cardiovascular');
  });

  it('omits the parenthetical when subject is null', () => {
    const activity: ActivitySnapshot = {
      page: 'quiz',
      questionNumber: 1,
      totalQuestions: 5,
      subject: null,
      system: null,
      difficulty: 'easy',
      isAnswered: false,
      correctSoFar: 0,
      totalAnsweredSoFar: 0,
    };
    expect(buildWatchReply(base, activity)).not.toContain('()');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/lib/watch-context.test.tsx`
Expected: FAIL — `Cannot find module '@/lib/watch-context'`

- [ ] **Step 3: Write the implementation**

Create `lib/watch-context.tsx`:

```tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

const STORAGE_KEY = 'clea-watch-enabled';

export type ActivitySnapshot = {
  page: 'quiz';
  questionNumber: number;
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
  setActivity: (activity: ActivitySnapshot | null) => void;
};

const WatchContext = createContext<WatchContextValue>({
  watchEnabled: false,
  toggleWatch: () => {},
  activity: null,
  setActivity: () => {},
});

export function WatchProvider({ children }: { children: ReactNode }) {
  const [watchEnabled, setWatchEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  });
  const [activity, setActivity] = useState<ActivitySnapshot | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(watchEnabled));
  }, [watchEnabled]);

  const toggleWatch = () => setWatchEnabled((enabled) => !enabled);

  return (
    <WatchContext.Provider value={{ watchEnabled, toggleWatch, activity, setActivity }}>
      {children}
    </WatchContext.Provider>
  );
}

export function useWatch() {
  return useContext(WatchContext);
}

export function buildQuizSnapshot(
  question: { subject: string; system: string; difficulty: string },
  questionNumber: number,
  totalQuestions: number,
  isAnswered: boolean,
  correctSoFar: number,
  totalAnsweredSoFar: number
): ActivitySnapshot {
  return {
    page: 'quiz',
    questionNumber,
    totalQuestions,
    subject: question.subject,
    system: question.system,
    difficulty: question.difficulty,
    isAnswered,
    correctSoFar,
    totalAnsweredSoFar,
  };
}

export function buildWatchReply(baseReply: string, activity: ActivitySnapshot | null): string {
  if (!activity) return baseReply;
  const subjectLabel = activity.subject ? ` (${activity.subject})` : '';
  return `${baseReply} I can see you're on question ${activity.questionNumber} of ${activity.totalQuestions}${subjectLabel} — once my full tutoring is live, I'll use that directly.`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- __tests__/lib/watch-context.test.tsx`
Expected: PASS — 9 tests

- [ ] **Step 5: Commit**

```bash
git add lib/watch-context.tsx __tests__/lib/watch-context.test.tsx
git commit -m "feat: add Watch context (state, persistence, snapshot/reply helpers)"
```

---

### Task 2: Wire WatchProvider into DashboardLayout

**Files:**
- Modify: `components/DashboardLayout.tsx`

**Interfaces:**
- Consumes: `WatchProvider` from `@/lib/watch-context` (Task 1)

- [ ] **Step 1: Wrap the layout in WatchProvider**

In `components/DashboardLayout.tsx`, add the import and wrap the existing return value:

```tsx
'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import CleaChat from './CleaChat';
import FloatingAvatar from './FloatingAvatar';
import { WatchProvider } from '@/lib/watch-context';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <WatchProvider>
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
    </WatchProvider>
  );
}
```

No dedicated test for this step — it's a mechanical wrap with no branching logic; it's exercised implicitly by every page that renders `DashboardLayout` (all of Task 3 and 4's tests supply their own `WatchProvider` directly since they test the inner components in isolation).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add components/DashboardLayout.tsx
git commit -m "feat: wrap DashboardLayout in WatchProvider"
```

---

### Task 3: CleaChat Watch toggle, label, and contextualized reply

**Files:**
- Modify: `components/CleaChat.tsx`
- Test: `__tests__/components/CleaChat.test.tsx` (extend existing file — do not remove existing tests)

**Interfaces:**
- Consumes: `useWatch`, `buildWatchReply` from `@/lib/watch-context` (Task 1)

- [ ] **Step 1: Write the failing tests**

In `__tests__/components/CleaChat.test.tsx`, change the top imports from:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import CleaChat from '@/components/CleaChat';
```

to:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import CleaChat from '@/components/CleaChat';
import { WatchProvider, useWatch, ActivitySnapshot } from '@/lib/watch-context';
```

Then append this block after the existing `describe('CleaChat', ...)` block (after its closing `});` on line 61), keeping every existing test in that first block untouched:

```tsx

function ActivityInjector({ activity }: { activity: ActivitySnapshot }) {
  const { setActivity } = useWatch();
  useEffect(() => setActivity(activity), [activity, setActivity]);
  return null;
}

const sampleActivity: ActivitySnapshot = {
  page: 'quiz',
  questionNumber: 3,
  totalQuestions: 20,
  subject: 'Cardiovascular',
  system: 'Cardiovascular',
  difficulty: 'medium',
  isAnswered: false,
  correctSoFar: 1,
  totalAnsweredSoFar: 2,
};

describe('CleaChat + Watch', () => {
  it('toggles Watch on and off from the chat header', () => {
    render(
      <WatchProvider>
        <CleaChat />
      </WatchProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open Clea study assistant' }));

    const watchToggle = screen.getByRole('button', { name: 'Turn on Watch' });
    expect(watchToggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(watchToggle);
    expect(screen.getByRole('button', { name: 'Turn off Watch' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows a Watching label when activity is published', () => {
    render(
      <WatchProvider>
        <ActivityInjector activity={sampleActivity} />
        <CleaChat />
      </WatchProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open Clea study assistant' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turn on Watch' }));

    expect(screen.getByText(/Watching: Q3\/20/)).toBeInTheDocument();
    expect(screen.getByText(/Cardiovascular/)).toBeInTheDocument();
  });

  it('contextualizes the placeholder reply when watching', () => {
    render(
      <WatchProvider>
        <ActivityInjector activity={sampleActivity} />
        <CleaChat />
      </WatchProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open Clea study assistant' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turn on Watch' }));

    const input = screen.getByLabelText('Message Clea');
    fireEvent.change(input, { target: { value: 'What should I focus on?' } });
    fireEvent.submit(input.closest('form')!);

    expect(screen.getByText(/question 3 of 20/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm test -- __tests__/components/CleaChat.test.tsx`
Expected: the 4 pre-existing tests PASS, the 3 new tests FAIL (no "Turn on Watch" button exists yet)

- [ ] **Step 3: Implement the toggle, label, and reply wiring**

In `components/CleaChat.tsx`, add `EyeIcon` and `EyeSlashIcon` to the existing heroicons import:

```tsx
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
import { useWatch, buildWatchReply } from '@/lib/watch-context';
```

Inside `export default function CleaChat() {`, add right after the existing `useState`/`useRef` declarations:

```tsx
  const { watchEnabled, toggleWatch, activity } = useWatch();
```

Replace the `sendMessage` function's reply line:

```tsx
    const reply = 'Clea is in placeholder mode for now. Soon I will use your Ugent study material to help answer this.';
```

with:

```tsx
    const reply = buildWatchReply(
      'Clea is in placeholder mode for now. Soon I will use your Ugent study material to help answer this.',
      activity
    );
```

Replace the header's name/subtitle block:

```tsx
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Clea</h2>
                <p className="text-xs text-neutral-500">Study Assistant</p>
              </div>
```

with:

```tsx
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Clea</h2>
                <p className="text-xs text-neutral-500">Study Assistant</p>
                {watchEnabled && activity && (
                  <p className="text-xs font-medium text-primary-600">
                    Watching: Q{activity.questionNumber}/{activity.totalQuestions}
                    {activity.subject ? ` · ${activity.subject}` : ''}
                  </p>
                )}
              </div>
```

Add the Watch toggle button as the first child of the header's button row (right before the existing Live button):

```tsx
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleWatch}
                aria-label={watchEnabled ? 'Turn off Watch' : 'Turn on Watch'}
                aria-pressed={watchEnabled}
                className={`flex items-center justify-center rounded-full p-1.5 transition focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  watchEnabled
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600'
                }`}
              >
                {watchEnabled ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={startLive}
                aria-label="Start Clea Live"
```

(everything from the existing Live button onward stays unchanged — only the new toggle `<button>` is inserted before it)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- __tests__/components/CleaChat.test.tsx`
Expected: PASS — all 7 tests (4 existing + 3 new)

- [ ] **Step 5: Commit**

```bash
git add components/CleaChat.tsx __tests__/components/CleaChat.test.tsx
git commit -m "feat: add Watch toggle, watching label, and contextualized reply to CleaChat"
```

---

### Task 4: Quiz page activity publishing

**Files:**
- Modify: `app/quiz/page.tsx`
- Test: `__tests__/quiz-watch.test.tsx`

**Interfaces:**
- Consumes: `useWatch`, `buildQuizSnapshot` from `@/lib/watch-context` (Task 1)

- [ ] **Step 1: Write the failing tests**

Create `__tests__/quiz-watch.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WatchProvider, useWatch } from '@/lib/watch-context';
import { QuizContent } from '@/app/quiz/page';

jest.mock('@/components/DashboardLayout', () => ({
  __esModule: true,
  default: ({ children }: any) => children,
}));

const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams('subject=Cardiovascular&limit=2');

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

const sampleQuestions = [
  {
    id: 'q1',
    text: 'What is the most common cause of X?',
    options: [
      { text: 'Option One', isCorrect: false },
      { text: 'Option Two', isCorrect: true },
    ],
    correctAnswer: 'Option Two',
    explanation: 'Because Option Two.',
    subject: 'Cardiovascular',
    system: 'Cardiovascular',
    difficulty: 'medium',
  },
  {
    id: 'q2',
    text: 'What is the most common cause of Y?',
    options: [
      { text: 'Choice One', isCorrect: true },
      { text: 'Choice Two', isCorrect: false },
    ],
    correctAnswer: 'Choice One',
    explanation: 'Because Choice One.',
    subject: 'Cardiovascular',
    system: 'Cardiovascular',
    difficulty: 'easy',
  },
];

function ActivityReadout() {
  const { activity, toggleWatch } = useWatch();
  return (
    <div>
      <button onClick={toggleWatch}>toggle-watch</button>
      <p data-testid="watch-activity">
        {activity ? `${activity.questionNumber}/${activity.totalQuestions}:${activity.correctSoFar}` : 'none'}
      </p>
    </div>
  );
}

describe('Quiz page Watch integration', () => {
  beforeEach(() => {
    mockPush.mockClear();
    window.localStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ questions: sampleQuestions }),
    }) as jest.Mock;
  });

  it('does not publish activity while Watch is off', async () => {
    render(
      <WatchProvider>
        <ActivityReadout />
        <QuizContent />
      </WatchProvider>
    );
    await screen.findByText('What is the most common cause of X?');
    expect(screen.getByTestId('watch-activity')).toHaveTextContent('none');
  });

  it('publishes the current question snapshot while Watch is on, and updates it as the quiz progresses', async () => {
    render(
      <WatchProvider>
        <ActivityReadout />
        <QuizContent />
      </WatchProvider>
    );
    fireEvent.click(screen.getByText('toggle-watch'));

    await screen.findByText('What is the most common cause of X?');
    expect(screen.getByTestId('watch-activity')).toHaveTextContent('1/2:0');

    fireEvent.click(screen.getByText('Option Two'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Answer' }));
    expect(screen.getByTestId('watch-activity')).toHaveTextContent('1/2:1');

    fireEvent.click(screen.getByRole('button', { name: /Next Question/ }));
    await waitFor(() => expect(screen.getByTestId('watch-activity')).toHaveTextContent('2/2:1'));
  });

  it('clears activity when Watch is turned off mid-quiz', async () => {
    render(
      <WatchProvider>
        <ActivityReadout />
        <QuizContent />
      </WatchProvider>
    );
    fireEvent.click(screen.getByText('toggle-watch'));
    await screen.findByText('What is the most common cause of X?');
    expect(screen.getByTestId('watch-activity')).not.toHaveTextContent('none');

    fireEvent.click(screen.getByText('toggle-watch'));
    expect(screen.getByTestId('watch-activity')).toHaveTextContent('none');
  });

  it('clears activity on unmount (e.g. leaving the quiz)', async () => {
    const { unmount } = render(
      <WatchProvider>
        <ActivityReadout />
        <QuizContent />
      </WatchProvider>
    );
    fireEvent.click(screen.getByText('toggle-watch'));
    await screen.findByText('What is the most common cause of X?');
    expect(screen.getByTestId('watch-activity')).not.toHaveTextContent('none');

    unmount();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/quiz-watch.test.tsx`
Expected: FAIL — `QuizContent` is not exported from `@/app/quiz/page`

- [ ] **Step 3: Export QuizContent and wire the publishing effect**

In `app/quiz/page.tsx`, change the function declaration from:

```tsx
function QuizContent() {
```

to:

```tsx
export function QuizContent() {
```

Add the import at the top, alongside the existing heroicons import:

```tsx
import { useWatch, buildQuizSnapshot } from '@/lib/watch-context';
```

Inside `QuizContent`, right after the existing `const currentQuestion = questions?.[currentIndex];` / `const isLastQuestion = ...` lines, add:

```tsx
  const { watchEnabled, setActivity } = useWatch();

  useEffect(() => {
    if (!watchEnabled || !questions || !currentQuestion) return;
    setActivity(
      buildQuizSnapshot(
        currentQuestion,
        currentIndex + 1,
        questions.length,
        isSubmitted,
        correctCount,
        currentIndex + (isSubmitted ? 1 : 0)
      )
    );
    return () => setActivity(null);
  }, [watchEnabled, questions, currentQuestion, currentIndex, isSubmitted, correctCount, setActivity]);
```

This single effect covers both publishing (spec step 2) and clearing (spec step 4): React runs the previous run's cleanup — `setActivity(null)` — before every re-run, and the final cleanup on unmount handles "left the page."

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- __tests__/quiz-watch.test.tsx`
Expected: PASS — 4 tests

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites PASS (existing suite + the 3 new/extended Watch files)

- [ ] **Step 6: Commit**

```bash
git add app/quiz/page.tsx __tests__/quiz-watch.test.tsx
git commit -m "feat: publish quiz activity snapshots to Watch context"
```

---

## Manual verification (after all tasks)

1. `npm run dev`, open `/dashboard`, click the Clea pill to open chat.
2. Click the eye icon — it should switch from "Turn on Watch" (crossed-eye) to "Turn off Watch" (open-eye), no "Watching: …" label yet (not on a quiz).
3. Start a quiz (`/quiz?subject=...`), open Clea chat — the "Watching: Q1/N · Subject" label should appear under "Study Assistant".
4. Answer a question and submit — the label's question number should stay the same until you click Next; send a chat message — the placeholder reply should mention the current question number and subject.
5. Click Next Question — label updates to Q2/N.
6. Navigate back to `/dashboard` — label disappears, next chat reply reverts to the generic placeholder.
7. Reload `/dashboard` — Watch toggle stays on (persisted), no stale label.
