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

| File | Role | Lines |
|------|------|-------|
| `medicospira-questions.jsonl` | Parsed Q&A | ~1962 |
| `medicospira-enriched.jsonl` | AI-enriched (disease, system, discriminators) | ~1976 |
| `classified-questions.jsonl` | Classified (subject, system, difficulty) | ~1962 |
| `medicospira-blobs.jsonl` | Raw page blobs | ~2134 |

**Rule**: Only enriched + classified questions affect the curriculum.
**Pipeline**: Enrich via `scripts/deepseek-enrich.mjs` (DeepSeek API), classify via `scripts/classify-local.py` (keyword-based).

### Vision Pipeline (image-based questions)

Some USMLE questions contain images (EKG, pathology slides, metabolic pathway diagrams, histology). These cannot be answered from text alone.

**Workflow:**
1. Inject `scripts/extract-vision.mjs` into page
2. Call `window.__extractWithVision()` → returns `{ question, choices, hasImages, imageSrcs }`
3. If `hasImages`:
   - Download image via `curl -sL '<src>' -o /tmp/qimg.jpg`
   - Send to **qwen2.5vl:3b** via Ollama API at `localhost:11434`
   - Model answers with structure IDs + clinical reasoning
4. If no images: text-based extraction as normal

**Key**: qwen2.5vl:3b (3.8B params, Q4_K_M) runs locally on Ollama. Already installed, warmed with 60m keep-alive. API: `POST /api/chat` with `{ model: 'qwen2.5vl:3b', messages: [{ role: 'user', content: '<prompt>', images: ['<base64>'] }] }`. Covers: anatomy diagrams, histology, pathology slides, EKGs, microbiology, cell biology.

## Operation Principles

1. Curriculum reads live JSONL — no cached data
2. Study days: 6/week (Sunday off), 3 blocks/day (50min each)
3. FA + Pathoma references in `analyzer.ts` (`FIRST_AID_MAP`, `PATHOMA_MAP`)
4. Block completion persists in `localStorage` key `curriculum-completed-blocks`
5. Navigation: edit `lib/navigation.ts` (auto-propagates to Sidebar + MobileNav)
6. Convex is down — all operations use local JSONL files
7. qwen2.5vl:3b in Ollama at localhost:11434 — keep warm with `keep_alive: '60m'`. Use for all vision question analysis.

## UI

- Tailwind v4 with CSS theme variables in `globals.css`
- `.card`, `.stat-card`, `.btn-primary`, `.btn-secondary`
- Dashboard pages wrap in `<DashboardLayout>`
- No emojis unless explicitly requested
