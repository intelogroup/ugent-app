# USMLE Pareto Ingestion Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-leverage research ingestion pipeline to extract structured medical intelligence (discriminators, pathophysiology, clues) from 3,000 USMLE questions using Pure Convex.

**Architecture:** A "Triple-Pass" distillation action powered by GPT-5, storing structured patterns in Convex document tables. A real-time research dashboard provides streaming feedback and instant pattern radar.

**Tech Stack:** Convex (Database/Backend), Next.js 16 (Frontend), Zod (AI reliability), OpenAI (GPT-5).

---

### Task 1: Convex Schema Initialization

**Files:**
- Create: `convex/schema.ts`

- [ ] **Step 1: Define the data model with performance indexes.**
Define `ingestions`, `questions`, `extracted_patterns`, `pattern_frequencies`, and `knowledge_dependencies`.
  - `questions.ingestionId`: Make **optional** (`v.optional(v.id("ingestions"))`). Add index on `["ingestionId"]`.
  - `ingestions`: Add `status`, `processedCount` (number), `totalCount` (number), and `error` (string).
  - `pattern_frequencies`: Add index on `["type", "name"]`.
  - `knowledge_dependencies`: Add index on `["from", "to"]`.

- [ ] **Step 2: Push schema to Convex.**
Run: `npx convex dev --once`
Expected: Schema pushed successfully with indexes.

- [ ] **Step 3: Commit.**
```bash
git add convex/schema.ts
git commit -m "feat(convex): initialize research schema with progress tracking and indexes"
```

### Task 2: local Migration Script (Prisma to Convex)

**Files:**
- Create: `scripts/migrate-prisma-to-convex.ts`
- Create: `convex/questions.ts`

- [ ] **Step 1: Create `convex/questions.ts` with a `bulkImport` mutation.**
Accept an array of question objects (without `ingestionId`) and insert them.

- [ ] **Step 2: Write the local migration script.**
Expand scope to read both `prisma/seed-*.ts` AND root `questions-batch-*.ts` files. Use `ts-node` to stream to Convex.

- [ ] **Step 3: Run migration and verify row counts.**
Run: `npx ts-node scripts/migrate-prisma-to-convex.ts`
Expected: All legacy seeds (Prisma + Batch files) imported.

- [ ] **Step 4: Commit.**
```bash
git add scripts/migrate-prisma-to-convex.ts convex/questions.ts
git commit -m "feat(migration): script for prisma and batch file transfer"
```

### Task 3: "Triple-Pass" AI Extraction Action

**Files:**
- Create: `convex/ai.ts`
- Create: `lib/zod-schemas.ts`
- Modify: `convex/ingest.ts` (for persistence and aggregation mutations)

- [ ] **Step 1: Define Zod schemas in `lib/zod-schemas.ts`.**
Ensure schemas match the `extracted_patterns` design. Include `physiologyState` in Demographics.

- [ ] **Step 2: Implement the `saveExtractedIntelligence` mutation in `convex/ingest.ts`.**
This mutation must:
  1.  **Save Question**: Insert/update base question data.
  2.  **Save Pattern**: Insert into `extracted_patterns`.
  3.  **Aggregate**: Atomically increment counts in `pattern_frequencies` and update `knowledge_dependencies`.
  4.  **Progress**: Increment `processedCount` in the `ingestions` record.

- [ ] **Step 3: Implement the `ai:extractIntelligence` action in `convex/ai.ts`.**
  - **Model**: Use `gpt-4o` for distillation.
  - **Timeout Strategy**: Split `rawText` by `---NEXT-QUESTION---`. If more than 5 questions, use `ctx.scheduler.runAction` to queue individual extractions to avoid the 30s Action timeout.
  - **Status**: Update ingestion status to `processing` (start) and `completed/failed` (end).

- [ ] **Step 4: Test with a sample bulk blob.**
Verify that 5+ questions are processed reliably via the background scheduler.

- [ ] **Step 5: Commit.**
```bash
git add lib/zod-schemas.ts convex/ai.ts convex/ingest.ts
git commit -m "feat(ai): gpt-5 extraction with task scheduling and atomic aggregation"
```

### Task 4: Research Ingestion Dashboard

**Files:**
- Create: `app/research/ingest/page.tsx`
- Create: `components/research/PatternRadar.tsx`
- Create: `components/research/ExtractionLiveFeed.tsx`
- Create: `components/research/DependencyExplorer.tsx`

- [ ] **Step 1: Build the Ingestion UI.**
Create a page at `/research/ingest` with a large text area and a "Start Research" button.

- [ ] **Step 2: Implement real-time status tracking.**
Subscribe to the `ingestions` table using `useQuery` to show processing progress.

- [ ] **Step 3: Build the Pattern Radar and Dependency Explorer.**
Use `recharts` for the radar and a simple SVG-based or library-based node graph for the `DependencyExplorer`.

- [ ] **Step 4: Commit.**
```bash
git add app/research/ingest/page.tsx components/research/...
git commit -m "feat(ui): research ingestion dashboard with dependency explorer"
```

### Task 5: Legacy Removal & Cleanup

- [ ] **Step 1: Delete Prisma files.**
Run: `rm -rf prisma/ lib/prisma.ts`

- [ ] **Step 2: Clean `package.json`.**
Remove `@prisma/client` and `prisma` dependencies. Remove `postinstall` script.

- [ ] **Step 3: Verify build.**
Run: `npm run build`
Expected: PASS (ensure no lingering Prisma imports in the app).

- [ ] **Step 4: Commit.**
```bash
git add package.json
git commit -m "chore: remove prisma/postgres legacy files"
```
