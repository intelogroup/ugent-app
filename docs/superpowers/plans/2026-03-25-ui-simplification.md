# UI Simplification & Mobile Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip all secondary accent colors down to one blue, flatten card styles, and make every page fully responsive on mobile with a scrollable top-tabs nav.

**Architecture:** Work outward from the design system — fix `globals.css` first (removes all secondary tokens), then update layout components (DashboardLayout + new MobileNav + Sidebar), then fix each page. Each task is independently deployable. No new dependencies required.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4 (CSS `@theme` tokens in `globals.css`), Heroicons, Convex, WorkOS AuthKit.

---

## File Map

| File | Change |
|---|---|
| `app/globals.css` | Remove secondary color tokens + accent bg tokens; remove card/btn shadows; simplify `.stat-card` |
| `components/MobileNav.tsx` | **New** — scrollable top-tabs nav, shown only on mobile |
| `components/DashboardLayout.tsx` | Add MobileNav, make sidebar `hidden md:flex`, fix `ml-64` → responsive margin |
| `components/Sidebar.tsx` | Add `hidden md:flex` to outer div |
| `app/dashboard/page.tsx` | Remove hero banner + AI banner; simplify stat cards (no icon boxes); hide charts on mobile; 2×2 grid on mobile |
| `app/tests/page.tsx` | Replace `secondary-green`/`secondary-blue` badge classes with neutral equivalents |
| `app/quiz/page.tsx` | Replace `secondary-yellow`, `secondary-pink`, `secondary-green`, `secondary-purple` with slate/blue equivalents |
| `app/leaderboard/page.tsx` | Replace `bg-primary-600` active button with `bg-neutral-900`; remove trophy-color badges |
| `app/settings/page.tsx` | Remove icon color (`text-primary-600`); tabs already responsive |
| `app/create-test/page.tsx` | Remove `ai-badge`; ensure form is single-column on mobile |

---

## Task 1: Strip the color system in globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Open the file**

```bash
# Read before editing
cat app/globals.css
```

- [ ] **Step 2: Replace the entire `@theme` block and component classes**

Replace the full content of `app/globals.css` with:

```css
@import "tailwindcss";

@theme {
  /* Primary — one blue accent */
  --color-primary-600: #2563EB;
  --color-primary-500: #3B82F6;
  --color-primary-50:  #EFF6FF;

  /* Neutral — cool slate */
  --color-neutral-900: #0F172A;
  --color-neutral-700: #334155;
  --color-neutral-500: #64748B;
  --color-neutral-300: #CBD5E1;
  --color-neutral-200: #E2E8F0;
  --color-neutral-100: #F1F5F9;

  /* Backgrounds */
  --color-background-primary:   #FFFFFF;
  --color-background-secondary: #F8FAFC;

  /* Typography */
  --font-size-xs:  12px;
  --font-size-sm:  14px;
  --font-size-base:16px;
  --font-size-lg:  18px;
  --font-size-xl:  20px;
  --font-size-2xl: 24px;
  --font-size-3xl: 30px;

  /* Radii */
  --radius-sm:  6px;
  --radius-md:  10px;
  --radius-lg:  14px;
  --radius-xl:  20px;
  --radius-pill:9999px;
}

body {
  background-color: var(--color-background-secondary);
  color: var(--color-neutral-900);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

h1 { font-size: var(--font-size-3xl); font-weight: 700; color: var(--color-neutral-900); }
h2 { font-size: var(--font-size-2xl); font-weight: 600; color: var(--color-neutral-900); }
h3 { font-size: var(--font-size-xl);  font-weight: 600; color: var(--color-neutral-700); }

.btn-primary {
  background-color: var(--color-primary-600);
  color: white;
  padding: 12px 24px;
  border-radius: var(--radius-lg);
  font-weight: 500;
  transition: background-color 0.2s;
}
.btn-primary:hover { background-color: #1d4ed8; }

.btn-secondary {
  background-color: white;
  color: var(--color-neutral-900);
  padding: 12px 24px;
  border-radius: var(--radius-lg);
  font-weight: 500;
  border: 1px solid var(--color-neutral-200);
  transition: border-color 0.2s;
}
.btn-secondary:hover { border-color: var(--color-neutral-300); }

.card {
  background-color: white;
  border-radius: var(--radius-xl);
  padding: 24px;
  border: 1px solid var(--color-neutral-200);
}

.stat-card {
  background-color: white;
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--color-neutral-200);
}
```

- [ ] **Step 3: Verify the app builds**

```bash
pnpm build 2>&1 | tail -20
```

Expected: no errors. Warnings about unused classes are OK.

- [ ] **Step 4: Start dev server and do a quick visual check**

```bash
pnpm dev
```

Open http://localhost:3000/dashboard. The dashboard should render without errors. Colors will look broken (secondary colors gone) — that's expected. We'll fix pages in subsequent tasks.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "style: strip secondary color tokens, flatten card/btn shadows"
```

---

## Task 2: Create MobileNav component

**Files:**
- Create: `components/MobileNav.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/MobileNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  PlusCircleIcon,
  ClipboardDocumentListIcon,
  TrophyIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  BeakerIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const tabs = [
  { name: 'Home',       href: '/dashboard',       icon: HomeIcon },
  { name: 'Quiz',       href: '/create-test',      icon: PlusCircleIcon },
  { name: 'Tests',      href: '/tests',            icon: ClipboardDocumentListIcon },
  { name: 'Research',   href: '/research/ingest',  icon: BeakerIcon },
  { name: 'Analytics',  href: '/analytics',        icon: ChartBarIcon },
  { name: 'Board',      href: '/leaderboard',      icon: TrophyIcon },
  { name: 'Notes',      href: '/notes',            icon: BookOpenIcon },
  { name: 'Settings',   href: '/settings',         icon: Cog6ToothIcon },
  { name: 'Pricing',    href: '/pricing',          icon: CreditCardIcon },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden sticky top-0 z-10 bg-white border-b border-neutral-200">
      {/* App header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
        <span className="text-base font-bold text-neutral-900">ugent</span>
      </div>
      {/* Scrollable tabs */}
      <div
        className="flex overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`.mobile-nav-scroll::-webkit-scrollbar { display: none; }`}</style>
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/MobileNav.tsx
git commit -m "feat: add MobileNav scrollable top-tabs for mobile"
```

---

## Task 3: Update DashboardLayout — responsive layout

**Files:**
- Modify: `components/DashboardLayout.tsx`

- [ ] **Step 1: Replace DashboardLayout**

The current file is:
```tsx
'use client';
import { ReactNode } from 'react';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background-secondary">
      <Sidebar />
      <main className="ml-64 p-10">
        {children}
      </main>
    </div>
  );
}
```

Replace with:

```tsx
'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background-secondary">
      {/* Sidebar: desktop only */}
      <Sidebar />
      {/* Top tabs nav: mobile only */}
      <MobileNav />
      {/* Main content: offset by sidebar on md+, no offset on mobile */}
      <main className="md:ml-64 px-4 py-6 md:p-10">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Update Sidebar to hide on mobile**

Open `components/Sidebar.tsx`. Find the outermost div:

```tsx
<div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-neutral-200 flex flex-col">
```

Change it to:

```tsx
<div className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-neutral-200 flex-col">
```

Note: replace `flex flex-col` with `flex-col` since `flex` is now provided by `md:flex`.

- [ ] **Step 3: Verify at mobile viewport**

In the running dev server, open http://localhost:3000/dashboard and resize browser to 375px wide. You should see:
- MobileNav with tabs at the top
- No sidebar
- Content with `px-4 py-6` padding

At 768px+ you should see:
- Sidebar on the left
- No MobileNav
- Content with `md:p-10` padding

- [ ] **Step 4: Commit**

```bash
git add components/DashboardLayout.tsx components/Sidebar.tsx
git commit -m "feat: responsive layout — sidebar desktop, top-tabs mobile"
```

---

## Task 4: Simplify Dashboard page

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Remove the hero/AI banner and simplify the header**

Find and replace the entire header + AI Insights Banner section. The current header looks like:

```tsx
{/* Header */}
<div className="flex justify...">
  <div>
    <h1 className="text-3xl font-bold text-neutral-900 mb-2">Welcome back, {userName}!</h1>
    <p className="text-neutral-600">Here's your AI-powered study insights for today</p>
  </div>
  <div className="flex flex-col items-center gap-2">
    <div className="relative w-20 h-20 rounded-full overflow-hidden bg-white p-1">
      <video ...>...</video>
    </div>
    <div className="ai-badge">...</div>
  </div>
</div>

{/* AI Insights Banner */}
<div className="bg-primary-600 rounded-2xl p-8 text-white relative overflow-hidden shadow-lg">
  ...
</div>
```

Replace both blocks with:

```tsx
{/* Header */}
<div className="mb-6">
  <h1 className="text-xl font-bold text-neutral-900">Good morning, {userName}</h1>
  <p className="text-sm text-neutral-500 mt-0.5">
    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
  </p>
</div>
```

- [ ] **Step 2: Replace the stat cards grid**

Find the stats grid section (starts with `{/* Stats Grid */}`). Replace the entire block with:

```tsx
{/* Stats Grid */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
  {/* Overall Score */}
  <div className="stat-card">
    <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Avg Score</p>
    <p className="text-2xl font-bold text-neutral-900">87%</p>
  </div>

  {/* Tests Completed */}
  <div className="stat-card">
    <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Tests Done</p>
    <p className="text-2xl font-bold text-neutral-900">24</p>
  </div>

  {/* Study Streak */}
  <div className="stat-card">
    <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Streak</p>
    <p className="text-2xl font-bold text-neutral-900">12 days</p>
  </div>

  {/* Questions Answered */}
  <div className="stat-card">
    <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Questions</p>
    <p className="text-2xl font-bold text-neutral-900">1,247</p>
  </div>
</div>
```

Note: these use hardcoded values as placeholders — the original stat cards also used hardcoded values. If they were data-driven, keep the same variable references.

- [ ] **Step 3: Add Quick Actions and hide charts on mobile**

Find the Quick Actions section and ensure it's present. Find the charts section (AreaChart/PieChart). Wrap it in a desktop-only container:

```tsx
{/* Charts — desktop only */}
<div className="hidden md:grid grid-cols-2 gap-6">
  {/* ... keep existing chart JSX unchanged ... */}
</div>
```

Add a mobile-only recent activity list right before the charts wrapper:

```tsx
{/* Recent Activity — mobile only */}
<div className="md:hidden card">
  <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-3">Recent</h3>
  <div className="divide-y divide-neutral-100">
    {performanceData.slice(-5).map((d) => (
      <div key={d.date} className="flex justify-between items-center py-2">
        <span className="text-sm text-neutral-700">{d.date}</span>
        <span className="text-sm font-semibold text-neutral-900">{d.score}%</span>
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 4: Remove unused imports**

After editing, remove any imports that are no longer used:
- `SparklesIcon` (used in ai-badge)
- `FireIcon` (used in streak icon box)
- `BoltIcon` (used in questions icon box)
- `LightBulbIcon` (used in AI banner)
- `LineChart`, `Line` from recharts if only AreaChart remains
- Keep: `AreaChart`, `Area`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`, `PieChart`, `Pie`, `Cell` (used in desktop charts)

Check for TypeScript errors:
```bash
pnpm tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Verify visually**

At 375px: see plain greeting, 2×2 stat grid, quick actions, recent activity list. No charts.
At 1024px: see greeting, 4-col stat grid, quick actions, charts side-by-side.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "style: simplify dashboard — remove hero banner, flat stat cards, mobile 2x2 grid"
```

---

## Task 5: Fix secondary colors in Tests page

**Files:**
- Modify: `app/tests/page.tsx`

- [ ] **Step 1: Replace secondary-color badge classes**

Search for `secondary-green` and `secondary-blue` in `app/tests/page.tsx`.

Replace the **Completed** badge:
```tsx
// Before
<span className="bg-secondary-green/10 text-secondary-green px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">

// After
<span className="bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
```

Replace the **In Progress** badge:
```tsx
// Before
<span className="bg-secondary-blue/10 text-secondary-blue px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">

// After
<span className="bg-primary-50 text-primary-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
```

- [ ] **Step 2: Check for any other secondary color references in this file**

```bash
grep -n "secondary-" app/tests/page.tsx
```

Fix any remaining matches using the same pattern: green → `neutral-100 text-neutral-700`, blue → `primary-50 text-primary-600`, yellow → `neutral-100 text-neutral-900`, pink → `neutral-100 text-neutral-700`.

- [ ] **Step 3: Verify visually at 375px**

Open http://localhost:3000/tests at 375px. Cards should stack single-column (already `space-y-3`). Badges should show in neutral/blue only.

- [ ] **Step 4: Commit**

```bash
git add app/tests/page.tsx
git commit -m "style: replace secondary color badges in tests page"
```

---

## Task 6: Fix secondary colors in Quiz page

**Files:**
- Modify: `app/quiz/page.tsx`

- [ ] **Step 1: Find all secondary color usages**

```bash
grep -n "secondary-" app/quiz/page.tsx
```

- [ ] **Step 2: Fix the flag button (secondary-yellow)**

Find:
```tsx
isFlagged ? 'bg-secondary-yellow text-neutral-900' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
```

Replace with:
```tsx
isFlagged ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
```

- [ ] **Step 3: Fix the answer result banner (secondary-green / secondary-pink)**

Find:
```tsx
currentAnswer?.isCorrect
  ? 'bg-secondary-green/10 border-2 border-secondary-green'
  : 'bg-secondary-pink/10 border-2 border-secondary-pink'
```

Replace with:
```tsx
currentAnswer?.isCorrect
  ? 'bg-neutral-50 border-2 border-neutral-300'
  : 'bg-neutral-50 border-2 border-neutral-300'
```

- [ ] **Step 4: Fix the AI Insight block (secondary-purple)**

Find:
```tsx
className="bg-gradient-to-r from-primary-500/10 to-secondary-purple/10 border border-primary-500/20 rounded-lg p-3 mt-3"
```

Replace with:
```tsx
className="bg-primary-50 border border-primary-600/20 rounded-lg p-3 mt-3"
```

- [ ] **Step 5: Fix XCircleIcon color (secondary-pink)**

Find:
```tsx
<XCircleIcon className="w-12 h-12 text-secondary-pink mx-auto mb-4" />
```

Replace with:
```tsx
<XCircleIcon className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
```

- [ ] **Step 6: Check for remaining secondary usages**

```bash
grep -n "secondary-" app/quiz/page.tsx
```

Should return 0 results. Fix any remaining.

- [ ] **Step 7: Commit**

```bash
git add app/quiz/page.tsx
git commit -m "style: replace secondary colors in quiz page"
```

---

## Task 7: Fix secondary colors in Leaderboard page

**Files:**
- Modify: `app/leaderboard/page.tsx`

- [ ] **Step 1: Find all secondary color and primary-600 button usages**

```bash
grep -n "secondary-\|bg-primary-600\|bg-primary-500" app/leaderboard/page.tsx
```

- [ ] **Step 2: Fix the timeframe filter buttons**

Find the active button class:
```tsx
timeframe === 'week'
  ? 'bg-primary-600 text-white'
  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
```

Replace `bg-primary-600` with `bg-neutral-900`:
```tsx
timeframe === 'week'
  ? 'bg-neutral-900 text-white'
  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
```

Apply the same change to the `month` and `all` buttons.

- [ ] **Step 3: Fix any secondary color badge or icon references**

For any trophy/medal color badges (gold, silver, bronze), replace with neutral:
```tsx
// Gold trophy color
// Before: text-secondary-yellow or text-amber-*
// After: text-neutral-500

// Any secondary-* badge backgrounds
// Before: bg-secondary-green/10 text-secondary-green
// After: bg-neutral-100 text-neutral-700
```

- [ ] **Step 4: Check remaining secondary usages**

```bash
grep -n "secondary-" app/leaderboard/page.tsx
```

Fix any remaining.

- [ ] **Step 5: Commit**

```bash
git add app/leaderboard/page.tsx
git commit -m "style: replace secondary colors in leaderboard page"
```

---

## Task 8: Fix Settings page

**Files:**
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: Remove icon accent color from header**

Find:
```tsx
<Cog6ToothIcon className="w-8 h-8 text-primary-600" />
```

Replace with:
```tsx
<Cog6ToothIcon className="w-8 h-8 text-neutral-400" />
```

- [ ] **Step 2: Fix tab active state**

Find the tabs `border-b` active class. It likely looks like:
```tsx
activeTab === tab.id
  ? 'border-primary-600 text-primary-600'
  : 'border-transparent text-neutral-500'
```

This is fine — keep `primary-600` for the active underline (it's our one allowed blue). No change needed.

- [ ] **Step 3: Check for secondary color usages**

```bash
grep -n "secondary-" app/settings/page.tsx
```

Fix any found.

- [ ] **Step 4: Make toggle switch use primary blue**

The toggle switch `peer-checked` state likely uses a neutral default. Find:
```tsx
<div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full ...
```

Add `peer-checked:bg-primary-600` if it's not already there:
```tsx
<div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all">
```

- [ ] **Step 5: Verify mobile at 375px**

The settings page uses `max-w-5xl mx-auto space-y-8` and the form fields use `w-full`. Should already be single-column. Confirm no horizontal overflow at 375px.

- [ ] **Step 6: Commit**

```bash
git add app/settings/page.tsx
git commit -m "style: clean up settings page colors"
```

---

## Task 9: Fix Create Test page

**Files:**
- Modify: `app/create-test/page.tsx`

- [ ] **Step 1: Remove ai-badge from header**

Find:
```tsx
<div className="ai-badge">
  <SparklesIcon className="w-4 h-4" />
  AI Active
</div>
```

Remove the entire `ai-badge` div (and remove `SparklesIcon` import if no longer used).

- [ ] **Step 2: Check secondary color usages**

```bash
grep -n "secondary-" app/create-test/page.tsx
```

Fix any found using the same substitution pattern as Tasks 5–7.

- [ ] **Step 3: Verify mobile layout at 375px**

The form uses `grid grid-cols-1 lg:grid-cols-3`. On mobile it should be single-column already. Open http://localhost:3000/create-test at 375px and confirm:
- No horizontal overflow
- Form fields are full-width
- Submit button is reachable

- [ ] **Step 4: Commit**

```bash
git add app/create-test/page.tsx
git commit -m "style: remove ai-badge and secondary colors from create-test page"
```

---

## Task 10: Final sweep and verification

**Files:** All modified files

- [ ] **Step 1: Grep for any remaining secondary color usages across all pages**

```bash
grep -rn "secondary-\|glass-effect\|text-gradient\|ai-badge\|bg-pink-\|bg-amber-\|bg-cyan-\|bg-violet-\|bg-emerald-" app/
```

Fix any results. Use this substitution guide:
- `secondary-green` → `neutral-700` (text) or `neutral-100` (bg)
- `secondary-yellow` → `neutral-900` (text) or `neutral-100` (bg)
- `secondary-pink` → `neutral-500` (text) or `neutral-50` (bg)
- `secondary-blue` → `primary-600` (text) or `primary-50` (bg)
- `secondary-purple` → `primary-600` (text) or `primary-50` (bg)

- [ ] **Step 2: Check TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep error
```

Fix any type errors before proceeding.

- [ ] **Step 3: Visual QA at 375px — hit every route**

With dev server running, resize to 375px and visit each route:

| Route | Check |
|---|---|
| `/dashboard` | Greeting, 2×2 grid, no charts, no horizontal scroll |
| `/create-test` | Single-column form, full-width inputs, submit reachable |
| `/tests` | Cards stack, badges are neutral/blue only |
| `/quiz?testId=...` | Question full-width, answer options stacked |
| `/leaderboard` | Filter buttons work, no secondary colors |
| `/settings` | Tabs scroll, form fields full-width |

- [ ] **Step 4: Visual QA at 1024px — desktop smoke test**

Resize to 1024px and confirm:
- Sidebar visible
- MobileNav hidden
- Dashboard shows 4-col stat grid and charts
- All pages have proper left margin (`md:ml-64`)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "style: UI simplification complete — minimal palette, mobile responsive"
```
