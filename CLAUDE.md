# Ugent — USMLE Study Platform

## Overview

Next.js 16 app (App Router) with Convex backend and WorkOS AuthKit authentication.
A data-driven USMLE Step 1 study platform that ingests, enriches, classifies medical questions and generates personalized study curricula.

## Stack

- **Frontend**: Next.js 16 (React 19), Tailwind CSS v4, Recharts, Heroicons
- **Backend**: Convex (currently disabled — free plan limit exceeded)
- **Auth**: WorkOS AuthKit (`@workos-inc/authkit-nextjs`)
- **Data**: Local JSONL files in `data/` — primary data source when Convex is down
- **Testing**: Jest + Vitest + Playwright

## Key Directories

```
convex/          — Convex backend (queries, mutations, schema, AI ingestion pipeline)
data/            — Question bank JSONL files (primary data source)
lib/curriculum/  — Curriculum generator (NEW — data-driven study plan engine)
app/curriculum/  — Curriculum page (interactive 19-week study timeline)
app/strategy/    — Strategy Hub (disease priority, clue training, graph explorer)
components/      — Shared UI (Sidebar, MobileNav, DashboardLayout)
lib/             — Shared utilities (navigation, hooks, stripe)
```

## Curriculum Generator Architecture (NEW)

Purpose: Generate a data-driven 20-week USMLE study plan from the question bank.

### File layout

```
lib/curriculum/types.ts      — Type definitions (TopicNode, DependencyGraph, Curriculum, StudyBlock/StudyDay/StudyWeek)
lib/curriculum/analyzer.ts   — Parses JSONL files, builds dependency graph, extracts disease frequencies by system
lib/curriculum/generator.ts  — Generates the 19-week curriculum with phased allocation
app/api/curriculum/route.ts  — API endpoint that wires analyzer → generator
app/curriculum/page.tsx      — Client-side interactive timeline UI (expandable weeks/days/blocks, check-off tracking)
lib/navigation.ts            — Sidebar/MobileNav links (Curriculum added between Strategy Hub and Leaderboard)
```

### Data pipeline

1. `analyzeQuestions()` reads `data/classified-questions.jsonl` + `data/medicospira-enriched.jsonl`
2. `getSystemDiseaseMap()` extracts disease-name → question-count per system from enriched data
3. `generateCurriculum()` takes the graph + frequency stats + disease map
4. Produces `Curriculum` object: 19 weeks, 4 phases, 342 blocks, with FA + Pathoma references

### Phase structure (137 days, 2.5h/day)

| Phase | Weeks | % | Content |
|-------|-------|---|---------|
| FOUNDATIONS | 1-6 (32%) | 90h | Physiology + basic principles by system |
| ORGAN_SYSTEMS | 7-14 (42%) | 120h | Disease pairs, data-driven allocation from enriched bank |
| INTEGRATION | 15-17 (16%) | 45h | Cross-system mixed blocks, discriminator drills |
| FINAL_REVIEW | 18-19 (11%) | 30h | NBME simulations, weak-area targeting |

### Organ systems phase is DATA-DRIVEN

The generator no longer hardcodes disease pairs. Instead:
1. Reads `systemDiseaseMap` from enriched JSONL (disease → question count per system)
2. `normalizeSystem()` maps 30+ raw enriched system names to standard FA chapter names
3. Allocates 8 weeks proportionally by system question count
4. Auto-pairs adjacent diseases (by frequency) within each system for daily study blocks
5. As new questions are enriched and classified, the curriculum auto-adapts on refresh

### System normalization

Enriched data uses varied system names. `normalizeSystem()` handles:
- Direct matches against `FIRST_AID_MAP` keys
- Mapping via `ENRICHED_TO_FA_SYSTEM` (Nervous System → Neurology, Immune System → Immunology, Digestive System → Gastrointestinal, etc.)
- Compound names split on `/`, `,`, ` & `, ` and ` — best-matching part wins

## Data Files

File | Role | Lines | When to update
-----|------|-------|----------------
`data/medicospira-questions.jsonl` | Parsed Q&A (text, options, explanation) | 841 | After scraping new questions
`data/medicospira-enriched.jsonl` | AI-enriched (diseaseName, system, discriminators, prerequisites) | 841 unique | After running enrichment pipeline on new questions
`data/classified-questions.jsonl` | Classified (subject, system, difficulty assigned) | 841 | After running classification pipeline
`data/medicospira-blobs.jsonl` | Raw scraped page blobs | 860 | Source material, rarely needed directly

**Curriculum visibility rule**: Only enriched and classified questions affect the curriculum. New raw questions are invisible until enriched.
**Current state**: All 841 parsed questions are enriched and classified — 100% curriculum-visible.
**Pipeline**: Enrich via `scripts/deepseek-enrich.mjs` (DeepSeek API, batch 5, resume-support), classify via `scripts/classify-local.py` (keyword-based, fast).

## Operation Principles

### When working on the curriculum system
1. The generator reads live JSONL files — no cached/static data
2. `DAY_MINUTES` = 150 (2.5h), `BLOCK_MINUTES` = 50 (3 blocks/day)
3. FA chapter pages and Pathoma video references are stored in `FIRST_AID_MAP` / `PATHOMA_MAP` in `analyzer.ts`
4. Study days are 6 per week, Sunday is rest day
5. Block check-off state persists in `localStorage` key `curriculum-completed-blocks`

### When adding new questions
1. Raw questions go to `medicospira-questions.jsonl` (requires: text, correctAnswer, options[], explanation, textHash)
2. Run enrichment pipeline to add `medicospira-enriched.jsonl` entries
3. Run classification pipeline to add `classified-questions.jsonl` entries
4. Curriculum auto-updates on next page load / API call

### Convex is down
The Convex deployment is disabled (free plan exceeded). All data operations use local JSONL files.
When Convex is restored:
- Migration path: `data/*.jsonl` → Convex `questions` table
- Restore `convex/ingest.ts` pipeline for new question ingestion
- Re-enable `convex/ai.ts` for enrichment pipeline

### UI patterns
- Uses Tailwind v4 with CSS theme variables in `globals.css`
- Design tokens: `--color-primary-600` (#2563EB), `--color-neutral-*` range
- Component classes: `.card`, `.stat-card`, `.btn-primary`, `.btn-secondary`
- Dashboard pages wrap in `<DashboardLayout>`
- Navigation links added via `lib/navigation.ts` (auto-propagates to Sidebar + MobileNav)
- No emojis unless explicitly requested

### TypeScript
- Some legacy files use `// @ts-nocheck` (Convex server modules)
- New curriculum code uses proper types, no `@ts-nocheck`
- Convex schema in `convex/schema.ts` defines the canonical data model for questions

### Top tested diseases (from current bank)
Pulmonary Embolism (3x), Tetralogy of Fallot (3x), Asthma (3x), TB (3x), Anaphylaxis (3x), Turner Syndrome (3x) — these reflect the current enriched bank and will shift as the bank grows.
