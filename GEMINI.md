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
