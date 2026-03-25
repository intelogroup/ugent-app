# UI Simplification & Mobile Responsiveness — Design Spec

**Date:** 2026-03-25
**Status:** Approved

---

## Overview

Simplify the ugent-app UI by stripping secondary colors, flattening card styles, and making every page fully responsive on mobile. The goal is clarity and focus — the content (scores, tests, progress) should do the work, not decoration.

---

## Design Decisions

### 1. Color System

**Current problem:** Six accent colors (blue, cyan, amber, pink, violet, emerald) create visual noise and make it hard to know what to focus on.

**Decision:** One accent color only.

| Token | Value | Usage |
|---|---|---|
| `--color-accent` | `#2563eb` | Primary buttons, active nav state, links |
| `--color-accent-subtle` | `#eff6ff` | Active nav background tint |
| All other accent colors | **Removed** | cyan, amber, pink, violet, emerald — gone |

Neutrals (slate scale) remain unchanged: `#0f172a` text, `#64748b` secondary, `#94a3b8` muted, `#e2e8f0` borders, `#f1f5f9` subtle bg, `#f8fafc` page bg.

### 2. Card Style

**Current problem:** Cards have colored icon boxes, gradient hero banners, glass effects, and multiple shadow levels — adds visual weight without adding information.

**Decision:** Flat white cards with a single border.

- Background: `#ffffff`
- Border: `1px solid #e2e8f0`
- Border radius: `8px`
- Shadow: **none** (removed entirely)
- Hover: border darkens to `#cbd5e1` only
- No colored icon boxes, no gradient overlays, no glass effect

### 3. Dashboard Hero Banner

**Current problem:** The blue gradient hero banner with greeting text adds color without function.

**Decision:** Replace with a plain text greeting + date. No background, no gradient. Just:

```
Good morning           ← 18px, font-weight 700, #0f172a
Wednesday, March 25    ← 13px, #64748b
```

---

## Desktop Layout (≥768px)

No structural changes — sidebar + main content area stays. Simplifications only:

- **Sidebar:** white background, `border-right: 1px solid #e2e8f0`. Active nav item: `background: #eff6ff`, `color: #2563eb`, `font-weight: 600`. All other nav items: `color: #64748b`, no background.
- **Stat cards:** 4-column grid, flat white cards (see Card Style above).
- **Charts:** Keep Recharts. Strip colored fills — use blue (`#bfdbfe` inactive bars, `#2563eb` active/current bar). No multi-color pie charts; replace with a simple bar or line chart in blue only.
- **Quick action buttons:** Primary = blue filled. Secondary = white + slate border. No other button variants.

---

## Mobile Layout (<768px)

### Navigation

Replace the sidebar with **top scrollable tabs** pinned below the app header.

```
┌─────────────────────────────┐
│ ugent              [avatar] │  ← app header, white bg, border-bottom
├─────────────────────────────┤
│ Home  Quiz  Tests  Notes  › │  ← scrollable tabs, active = blue underline
├─────────────────────────────┤
│          page content       │
```

- Tabs: `overflow-x: auto`, `white-space: nowrap`, hide scrollbar
- Active tab: `color: #2563eb`, `border-bottom: 2px solid #2563eb`
- Inactive tab: `color: #64748b`
- Tab order: Home, Quiz, Tests, Notes, Leaderboard, Search, Settings (scrollable)
- The fixed sidebar is hidden (`hidden md:flex`) on mobile

### Stat Cards — 2×2 Grid

```
┌──────────┬──────────┐
│ AVG SCORE│ TESTS    │
│   87%    │   24     │
├──────────┼──────────┤
│ STREAK   │ RANK     │
│   7d     │   #3     │
└──────────┴──────────┘
```

- `grid-cols-2` always on mobile
- Each card: white bg, slate border, 8px radius, 12px padding
- Label: 10px, `#94a3b8`, uppercase tracking
- Value: 20px, `font-weight: 700`, `#0f172a`

### CTA Button

Full-width primary button below the stat grid:

```
┌─────────────────────────────┐
│         Start Quiz →        │  ← bg: #2563eb, text: white, full width, 44px height
└─────────────────────────────┘
```

### Charts on Mobile

- Charts are hidden on mobile (`hidden md:block`) — too small to be useful
- Replace with a simple text-based recent activity list (score + test name)

### Other Pages on Mobile

- **Quiz page:** single-column layout. Question text full width. Answer options stacked vertically, full width.
- **Tests list:** single-column cards. Remove the multi-column table layout.
- **Create Test:** single-column form. Labels above inputs (not inline).
- **Leaderboard:** single-column list. Remove rank columns on mobile, show rank as a leading number.
- **Settings:** single-column sections. Full-width form fields.

---

## Typography Adjustments

No new fonts. Just tighter hierarchy:

- Page title: `text-xl font-bold text-slate-900` (20px)
- Section heading: `text-sm font-semibold text-slate-900 uppercase tracking-wide` (12px)
- Body: `text-sm text-slate-700` (14px)
- Muted/labels: `text-xs text-slate-400` (12px)

---

## What's Removed

| Element | Replacement |
|---|---|
| Gradient hero banner | Plain text greeting |
| Colored icon boxes in stat cards | Label text only |
| Glass effect (`.glass-effect`) | Not used anywhere |
| `.text-gradient` utility | Not used |
| `.ai-badge` (blue bg pill) | Plain `text-slate-500` text if needed |
| Cyan, amber, pink, violet, emerald in CSS | Deleted from `globals.css` |
| Multi-color chart fills | Single blue color scale |
| Card box shadows | Removed |
| Hover elevation effect | Border color change only |

---

## Implementation Scope

Files that will change:
- `app/globals.css` — remove unused color tokens, simplify component utilities
- `components/Sidebar.tsx` — simplify active state styles, add `hidden md:flex`
- `components/DashboardLayout.tsx` — add mobile top-tabs nav component
- `app/dashboard/page.tsx` — remove hero banner, simplify stat cards, hide charts on mobile
- `app/quiz/page.tsx` — mobile single-column layout
- `app/tests/page.tsx` — mobile single-column list
- `app/create-test/page.tsx` — mobile single-column form
- `app/leaderboard/page.tsx` — mobile list layout
- `app/settings/page.tsx` — mobile single-column form

New component:
- `components/MobileNav.tsx` — scrollable top tabs, shown only on mobile

---

## Success Criteria

- No secondary accent colors visible anywhere in the app
- All pages usable on 375px viewport without horizontal scroll
- Mobile nav tabs work and scroll correctly
- Stat cards readable at 375px
- Desktop layout unchanged structurally
