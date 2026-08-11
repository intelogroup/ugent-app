# Roadmap — Own Question Bank + Images to Production

Status: draft. Source: strategy review 2026-08-05.

## Prerequisite work shipped (2026-08-06)
Ship-readiness batch landed before this roadmap's pillars, not part of P1-P3:
- Quiz correctness: `lib/quiz-lifecycle.ts` pure scoring (back-nav re-answer can't double-count), server-side attempt validation in `app/api/quiz-activity`, no silent attempt loss, filter enumeration past PostgREST's 1000-row cap.
- Dashboard reads real data: curriculum blocks from `curriculum_progress` (DB), live block-total denominator, real per-system focus panel, time-ordered trend.
- CI/CD: `.github/workflows/ci.yml` (tsc + jest + vitest + Playwright e2e); `analyzeQuestions()` memoized per process.
- Trust/legal: real user count on landing (`/api/user-count`, hides <50), `/terms` + `/privacy`, consent banner.
- Security: `correctAnswer` stripped from quiz payloads (bank exfiltration to full server-side grading + RLS column lockdown deferred to P1 — see P3).
- Note: the 1000-row `questions` enumeration fix and the quiz-data RLS path are prerequisites P3 formalizes into the image-bearing schema work.

## North star
Ship an original, image-capable USMLE question bank to production (quiz + curriculum)
that we own the IP for — replacing scraped medicospira content as the prod source.

## Ground truth (current state)
- Prod quiz is text-only: `questions` table has no image column, `lib/qbank.ts` /
  `app/quiz/page.tsx` render no images.
- Images die at scrape: `scripts/medicospira-loop.mjs` logs `imageSrcs` then drops them.
- Bank = scraped medicospira content, one-way upsert via `scripts/migrate-questions-to-supabase.mjs`.
- No authoring/write path exists. Curriculum counts read `classified-questions.jsonl`
  directly (`lib/curriculum/analyzer.ts`), so bank changes ripple into the 19-week schedule.

## Pillars

### P1 — Content: LLM-authored original bank
- Author per-system from existing `FIRST_AID_MAP`/`PATHOMA_MAP` topic lists.
- Generate directly in enriched-question shape (vignette, options, explanation,
  diseaseName, mechanism, discriminators, highLeverageClues) — reuse `deepseek-enrich.mjs` schema.
- Gates: textHash dedupe, independent answer-verification pass (blind answer → reject mismatch),
  USMLE-style blueprint check.
- Mark `source: 'original'` vs `'medicospira'`. Prod runs on original only; scraped stays as dev seed.

### P2 — Images: hybrid, spec-first
Core rule: author an `imageSpec` (what to draw, key findings, caption, license);
rendering is tooling. The authored spec is the IP.

| Image type | Source |
|---|---|
| EKG/rhythm strips, PV loops, lab curves, graphs | Programmatic (matplotlib/ecg-lib) — accurate by construction |
| Anatomy/pathology schematics | AI image-gen (DALL-E/Gemini/Flux) from spec + review |
| Cell/organ diagrams | Curated open-license: Servier (CC-BY), bioicons |
| Photo-real histology/microbiology | Decision point: curated slides > AI-gen artifacts |

- Auto-review rendered images with local `qwen2.5vl:3b` (Ollama) against the spec before merge.
- Attach `images: [{url, caption, license}]` per question; curated sources keep attribution.

### P3 — Delivery to prod
- Schema: add `images JSONB` to `questions` (matches `options JSONB` pattern, single fetch).
- Serving: `fromRow`/`ClassifiedQuestion` + `/api/quiz-data` pass images; Supabase Storage
  bucket with RLS mirroring the questions read policy; signed URLs for private bucket.
- UI: render image block under stem (+ in options when embedded) in `app/quiz/page.tsx`.
- Curriculum: keep `classified-questions.jsonl` as single source of truth for analyzer + migrate.

## Phases
1. **A — Define**: image taxonomy, `imageSpec` template, tool pick per tier, source marking.
2. **B — Pilot (Cardiovascular)**: author ~100 questions end-to-end with images, ship to prod
   quiz, verify UI + curriculum counts stable.
3. **C — Scale**: remaining systems in curriculum-proportional order; retire medicospira from prod.
4. **D — Measure**: calibrate authored difficulty via existing `quiz_attempts` telemetry.

## Don'ts
- Don't salvage `data/temp/` (822 scraped screenshots — junk + copyright).
- Don't hotlink medicospira image URLs.
- Don't render images without a spec.

## Done criteria
- `questions` rows carry `images JSONB`, served by `/api/quiz-data` and rendered in quiz UI.
- Prod bank is 100% `source='original'`; scraped rows retired or filtered out.
- Curriculum schedule unchanged in shape after the swap (counts stable per system).
