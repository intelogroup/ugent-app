# TODOS

## DESIGN.md — Document the design system

**What:** Create a `DESIGN.md` at the repo root documenting the design system defined in `globals.css` — color tokens, type scale, spacing/radii, component vocabulary (`.card`, `.stat-card`, `.btn-primary`, `.btn-secondary`), and the design decisions made during the 2026-03-25 UI simplification review.

**Why:** The design system currently lives only in `globals.css`. Future contributors will guess at it and re-introduce secondary colors or inconsistent patterns. A `DESIGN.md` makes it explicit and auditable.

**Pros:** Future design reviews have a reference. Design decisions are traceable. Prevents color system drift.

**Cons:** One more file to maintain alongside `globals.css`.

**Context:** See the UI simplification plan (`docs/superpowers/plans/2026-03-25-ui-simplification.md`) for the decisions made: one blue accent (`#2563EB`), slate neutrals, WCAG AA-corrected `neutral-500` (`#596475`), border-weight-based feedback signals.

**Depends on:** `docs/superpowers/plans/2026-03-25-ui-simplification.md` ships first.

---

## Connect `performanceData` to real Convex data

**What:** `app/dashboard/page.tsx` line 17-26 has `// Mock data - replace with real API calls`. The stat cards (87%, 24 tests, 12-day streak, 1,247 questions) and `performanceData` chart array are all hardcoded mock values.

**Why:** Every USMLE student sees the same fake stats (87%, 12-day streak) regardless of their actual progress. The dashboard is aspirational UX but shows inaccurate data to real users.

**Pros:** Dashboard becomes accurate and motivating. The empty state added in the UI simplification plan (Task 4, Step 3) becomes meaningful — real new users see "No tests yet" instead of hardcoded data.

**Cons:** Requires defining which Convex tables store test results, scores, streaks, and question counts. May need new Convex queries. This is non-trivial scope.

**Context:** The Convex schema likely already has test result data from the ingest pipeline (see commit `3b50272` — pre-flight dedup + live duplicate UI blocking). Check `convex/schema.ts` for relevant tables.

**Depends on:** Knowing the Convex test result schema. `performanceData` needs to return `[{ date: string, score: number }]` per day for the last 7 days.

---

## Fix `@ts-nocheck` in `convex/ingest.ts`

**What:** Remove the `// @ts-nocheck` directive at line 1 of `convex/ingest.ts` and fix any resulting TypeScript errors that it was suppressing.

**Why:** ESLint blocks edits to the file on every save (`@typescript-eslint/ban-ts-comment`). It's a speed bump on every future change to the ingestion pipeline.

**Depends on:** Time to audit what TS errors `@ts-nocheck` was hiding and fix them properly.
