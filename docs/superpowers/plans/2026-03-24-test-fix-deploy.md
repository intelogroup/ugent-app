# Test, Fix & Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two TypeScript test errors, verify the build passes, commit all unstaged changes, push to remote, and promote the Vercel preview to production.

**Architecture:** Fix test types → verify build → commit all staged changes in one logical commit → push → vercel --prod.

**Tech Stack:** Next.js 14, Convex, WorkOS AuthKit, TypeScript, Vercel

---

## Repo State (as of 2026-03-24)

**Local = Remote** (0 commits ahead/behind origin/main).

**Unstaged (modified):**
- `app/api/messages/conversations/route.ts` — `thread: any` type annotation
- `app/api/messages/route.ts` — `msg: any` type annotation
- `app/create-test/page.tsx` — `s: any`, `topic: any` type annotations
- `app/research/ingest/page.tsx` — debounced per-blob dedup scan + individual ingestion per blob
- `components/research/PatternRadar.tsx` — `d: any`, `x: any` type annotations
- `convex/ai.ts` — **critical**: moved `// @ts-nocheck` to line 1 before `"use node"`
- `convex/ingest.ts` — added `getIngestionInternal`, `triggerBatchIfReady`, `purgeDuplicatePending`
- `convex/schema.ts` — added `by_textHash` index to ingestions table
- `lib/services/aiPatternService.ts` — type annotation fixes

**Untracked (new files to commit):**
- `scripts/benchmark-models.ts`
- `scripts/ingest-questions.ts`

**Known build errors:**
- `__tests__/auth/magic-link.test.ts:83,91` — `Request` not assignable to `NextRequest`

---

## File Map

| File | Action |
|------|--------|
| `__tests__/auth/magic-link.test.ts` | Fix: replace `new Request(...)` with `new NextRequest(...)` at lines 83 & 91 |
| All 9 modified files | Verify no regressions, commit |
| `scripts/benchmark-models.ts` | Include in commit |
| `scripts/ingest-questions.ts` | Include in commit |

---

### Task 1: Read and fix the test type error

**Files:**
- Modify: `__tests__/auth/magic-link.test.ts:1-100`

- [ ] **Step 1: Read the test file to understand the full context**

```bash
# Read lines 1-100 of the test file
# (use Read tool with offset=0 limit=100)
```

- [ ] **Step 2: Fix lines 83 and 91**

The error: `Argument of type 'Request' is not assignable to parameter of type 'NextRequest'`

The `NextRequest` class is from `next/server`. It wraps `Request` with additional properties (`cookies`, `nextUrl`, etc.). To fix:

Option A — import and use `NextRequest`:
```typescript
import { NextRequest } from "next/server";
// then replace:
new Request("http://localhost/api/...", { method: "POST", body: ... })
// with:
new NextRequest("http://localhost/api/...", { method: "POST", body: ... })
```

Option B — cast the existing `Request` objects:
```typescript
handler(new Request(...) as unknown as NextRequest)
```

**Prefer Option A** (cleaner, no unsafe cast).

- [ ] **Step 3: Verify the fix compiles**

```bash
cd /Users/kalinovdameus/Developer/ugent-app
npx tsc --noEmit 2>&1
```

Expected: **0 errors**

---

### Task 2: Verify the full build

**Files:** none modified

- [ ] **Step 1: Run TypeScript check**

```bash
cd /Users/kalinovdameus/Developer/ugent-app
npx tsc --noEmit 2>&1
```

Expected: `0 errors`

- [ ] **Step 2: Run Next.js build lint check (optional fast check)**

```bash
cd /Users/kalinovdameus/Developer/ugent-app
npx next build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully` (or review any new errors)

---

### Task 3: Commit all changes

**Files:** all 9 modified + 2 untracked scripts

- [ ] **Step 1: Stage all changed and new files**

```bash
cd /Users/kalinovdameus/Developer/ugent-app
git add \
  __tests__/auth/magic-link.test.ts \
  app/api/messages/conversations/route.ts \
  app/api/messages/route.ts \
  app/create-test/page.tsx \
  app/research/ingest/page.tsx \
  components/research/PatternRadar.tsx \
  convex/ai.ts \
  convex/ingest.ts \
  convex/schema.ts \
  lib/services/aiPatternService.ts \
  scripts/benchmark-models.ts \
  scripts/ingest-questions.ts
```

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix: resolve TS test error + harden ingest pipeline

- Fix NextRequest type in magic-link test (Request → NextRequest)
- Move // @ts-nocheck before "use node" in convex/ai.ts (Convex gotcha)
- Add by_textHash index to ingestions schema for dedup queries
- Per-blob ingestion flow: each question gets its own ingestion record
- Add getIngestionInternal internalQuery + triggerBatchIfReady mutation
- Add purgeDuplicatePending mutation for ops cleanup
- Debounced per-blob dedup scan on ingest page (shows dup indicators)
- Add type annotations to eliminate implicit any in map/filter callbacks
- Add scripts/ingest-questions.ts and scripts/benchmark-models.ts

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Verify commit succeeded**

```bash
git log --oneline -3
git status
```

Expected: working tree clean, new commit at HEAD

---

### Task 4: Push to remote

- [ ] **Step 1: Push**

```bash
git push origin main
```

Expected: `main -> main` with no errors

- [ ] **Step 2: Verify remote matches local**

```bash
git log --oneline origin/main..HEAD
```

Expected: empty output (in sync)

---

### Task 5: Deploy to production

- [ ] **Step 1: Promote Vercel preview to production**

```bash
cd /Users/kalinovdameus/Developer/ugent-app
vercel --prod
```

Expected: deployment URL for production `ugent-app.vercel.app`

- [ ] **Step 2: Smoke-test production**

Manually verify in browser:
- [ ] App loads (no 500/build errors)
- [ ] Auth flow works (WorkOS sign-in)
- [ ] `/research/ingest` page loads — dedup indicators show when pasting duplicate questions
- [ ] `/create-test` page loads — subject/topic selectors work

---

## Gotchas to Remember

1. **Convex `"use node"` files**: `// @ts-nocheck` MUST be line 1, `"use node"` line 2. Already fixed in `convex/ai.ts`.
2. **Convex `triggerBatchIfReady`**: passes only `ingestionId` to scheduler (not full `rawText`) to stay within Convex arg size limits.
3. **`zodToJsonSchema` broken on Zod 4.x**: using inline JSON schema in `convex/ai.ts`. Don't reintroduce `zodToJsonSchema`.
