# Ugent — USMLE Study Platform

## Overview

Next.js 16 app (App Router) with Convex backend and WorkOS AuthKit authentication.

## Stack

- **Frontend**: Next.js 16 (React 19), Tailwind CSS v4, Recharts, Heroicons
- **Backend**: Convex (currently disabled — free plan limit exceeded)
- **Auth**: WorkOS AuthKit
- **Data**: Local JSONL files in `data/`
- **Testing**: Jest + Vitest + Playwright

## Key Directories

```
convex/          backend (queries, mutations, schema, AI ingestion)
data/            question bank JSONL files
lib/curriculum/  curriculum generator engine
app/curriculum/  curriculum page (study timeline UI)
app/strategy/    strategy hub
components/      shared UI
lib/             shared utilities
```

## Curriculum Generator

- `lib/curriculum/types.ts` — types
- `lib/curriculum/analyzer.ts` — parses JSONL, builds dependency graph, extracts disease frequencies
- `lib/curriculum/generator.ts` — data-driven 19-week schedule (FOUNDATIONS → ORGAN_SYSTEMS → INTEGRATION → FINAL_REVIEW)
- `app/api/curriculum/route.ts` — GET /api/curriculum
- `app/curriculum/page.tsx` — interactive timeline, expandable weeks/days/blocks, localStorage check-off

### Phase breakdown (137 days, 2.5h/day, exam Oct 10 2026)

| Phase | Weeks | Content |
|-------|-------|---------|
| FOUNDATIONS | 1-6 | Physiology + basic principles |
| ORGAN_SYSTEMS | 7-14 | Disease pairs (data-driven from enriched bank) |
| INTEGRATION | 15-17 | Cross-system + discriminator drills |
| FINAL_REVIEW | 18-19 | NBME simulations |

### Organ systems is data-driven
- Reads `systemDiseaseMap` from enriched JSONL
- Normalizes 30+ raw system names → standard FA chapters
- Allocates 8 weeks proportionally by question count
- Auto-pairs adjacent diseases by frequency
- Curriculum adapts on refresh when new questions are enriched

## Data Files

| File | Role |
|------|------|
| `medicospira-questions.jsonl` | Parsed Q&A |
| `medicospira-enriched.jsonl` | AI-enriched (disease, system, discriminators) |
| `classified-questions.jsonl` | Classified (subject, system, difficulty) |
| `medicospira-blobs.jsonl` | Raw page blobs |

**Rule**: Only enriched + classified questions affect the curriculum.

## Operation Principles

1. Curriculum reads live JSONL — no cached data
2. Study days: 6/week (Sunday off), 3 blocks/day (50min each)
3. FA + Pathoma references in `analyzer.ts` (`FIRST_AID_MAP`, `PATHOMA_MAP`)
4. Block completion persists in `localStorage` key `curriculum-completed-blocks`
5. Navigation: edit `lib/navigation.ts` (auto-propagates to Sidebar + MobileNav)
6. Convex is down — all operations use local JSONL files

## UI

- Tailwind v4 with CSS theme variables in `globals.css`
- `.card`, `.stat-card`, `.btn-primary`, `.btn-secondary`
- Dashboard pages wrap in `<DashboardLayout>`
- No emojis unless explicitly requested

## Context-Mode Sandbox Routing
- **Think in Code**: Program analysis, search, or comparison tasks by running Node.js scripts via `mcp__context-mode__ctx_execute` instead of reading large raw files into the context window.
- **Tool Offloading**:
  - For large command outputs or batch tasks, use `mcp__context-mode__ctx_batch_execute`.
  - For URL fetching, use `mcp__context-mode__ctx_fetch_and_index`.
  - Use `mcp__context-mode__ctx_search` to query FTS5 indexed content.
- **File Reads**: To analyze or explore a file without modifying it, use `mcp__context-mode__ctx_execute_file`.

## Caveman Mode (Conciseness)
- **Rules**: Drop pleasantries, filler words, and articles. Respond terse like smart caveman. Pattern: `[thing] [action] [reason]. [next step].` Code block and files remain unchanged.

## Ponytail (YAGNI & Simplicity)
- **Ladder**: 1) Necessity? (YAGNI), 2) Reuse code?, 3) Stdlib?, 4) Native feature?, 5) Existing dep?, 6) One line?, 7) Write min code.
- **Rules**: Deletion > addition. No unrequested abstractions. Boring > clever. Shortest correct diff wins. Fix root cause, not symptom. Question complex requests.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

<!-- forge-learnings:start -->
## Learnings (auto-maintained by /um — human edits go ABOVE this block)
- Convex is fully disconnected from the live app (2026-07-08), not just "disabled" — no `convex/react`/`convex/nextjs` imports remain under `app/`. `convex/` dir kept only as a future migration reference.
- Billing/Stripe removed entirely (no `/pricing`, no `app/api/stripe/*`, no `lib/stripe.ts`) — do not assume payments exist.
- Quiz-taking runs on `data/classified-questions.jsonl` via `app/api/quiz-data/route.ts` + localStorage key `quiz-attempts` (mirrors curriculum's `curriculum-completed-blocks` pattern) — no DB.
- Before deleting an `app/api/*` route, confirm zero callers with `grep -rl '/api/x' app --include='*.tsx'` (excluding `app/api` itself) — ~35 routes were fully orphaned dead code from a removed Prisma backend.
- After deleting routes, `rm -rf .next` before trusting `tsc --noEmit` — stale `.next/dev/types/validator.ts` reports phantom missing-module errors for deleted routes.
<!-- forge-learnings:end -->
