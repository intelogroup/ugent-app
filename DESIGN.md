# DESIGN

Design system reference for `ugent-app`, extracted from `app/globals.css`. Source of truth is the CSS file — this doc explains the *why*, the CSS has the *values*.

## Origin

Defined during the 2026-03-25 UI simplification review (`docs/superpowers/plans/2026-03-25-ui-simplification.md`). Goal: one accent color, no secondary-color drift, WCAG AA text contrast.

## Color tokens

| Token | Value | Use |
|---|---|---|
| `--color-primary-600` | `#2563EB` | The one accent — buttons, links, active states |
| `--color-primary-500` | `#3B82F6` | Lighter accent variant |
| `--color-primary-50` | `#EFF6FF` | Accent-tinted backgrounds |
| `--color-neutral-900` | `#0F172A` | Primary text |
| `--color-neutral-700` | `#334155` | Secondary text (h3) |
| `--color-neutral-500` | `#596475` | Muted text — darkened from Tailwind's default `#64748B` for 4.6:1 contrast on white (WCAG AA) |
| `--color-neutral-300` | `#CBD5E1` | Borders (hover state) |
| `--color-neutral-200` | `#E2E8F0` | Borders (default) |
| `--color-neutral-100` | `#F1F5F9` | Subtle fills |
| `--color-background-primary` | `#FFFFFF` | Cards, surfaces |
| `--color-background-secondary` | `#F8FAFC` | Page background |

**Rule: one accent color.** Don't introduce a second brand color (green for success, purple for premium, etc). Feedback states are signaled by border weight/color shifts on neutrals, not by adding hues — see Component vocabulary below.

## Type scale

| Token | Size |
|---|---|
| `--font-size-xs` | 12px |
| `--font-size-sm` | 14px |
| `--font-size-base` | 16px |
| `--font-size-lg` | 18px |
| `--font-size-xl` | 20px |
| `--font-size-2xl` | 24px |
| `--font-size-3xl` | 30px |

Heading defaults (global, overridable by Tailwind classes): `h1` = 3xl/700/neutral-900, `h2` = 2xl/600/neutral-900, `h3` = xl/600/neutral-700.

Body font applied via `inter.className` in `app/layout.tsx` — don't set font-family in `globals.css`.

## Spacing / radii

| Token | Value |
|---|---|
| `--radius-sm` | 6px |
| `--radius-md` | 10px |
| `--radius-lg` | 14px — buttons, `.stat-card` |
| `--radius-xl` | 20px — `.card` |
| `--radius-pill` | 9999px — pills, orb elements |

No dedicated spacing scale — padding is set per-component (e.g. `.card` = 24px, `.stat-card` = 20px, buttons = 12px/24px). Match the nearest existing component rather than inventing a new value.

## Component vocabulary

| Class | Role |
|---|---|
| `.btn-primary` | Filled accent button, white text, darkens on hover (`#1d4ed8`) |
| `.btn-secondary` | White button, neutral-900 text, neutral-200 border that darkens to neutral-300 on hover |
| `.card` | White surface, `radius-xl`, neutral-200 border, 24px padding |
| `.stat-card` | Same as `.card` but `radius-lg` and 20px padding — used for dashboard stat tiles |
| `.no-scrollbar` | Utility — hides scrollbar cross-browser, keeps scroll functional |

Feedback/state signaling uses border weight and color shift on these same components (e.g. a warning state darkens the border rather than swapping in a red variant) — keeps the one-accent rule intact.

## Clea orb

`.clea-orb-*` classes (`app/globals.css:94-246`) are a self-contained animated placeholder avatar — radial-gradient sphere with blurred "current" blobs, a spinning ribbon highlight, and a breathing/glow animation loop. All colors in the orb derive from the primary blue scale plus white/slate, no new hues introduced. Respects `prefers-reduced-motion` by collapsing all animations to a single gentle opacity pulse.

Don't add new orb variants with different color families — if a new avatar state is needed, adjust opacity/blur/scale on the existing gradient stops, not new colors.

## Adding to this system

Before adding a new color, radius, or component class: check this table and `.card`/`.stat-card`/`.btn-*` first. A new `@theme` token needs a reason beyond "this one component wants a slightly different shade" — reuse an existing token unless there's a real semantic gap.
