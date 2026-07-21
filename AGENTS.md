# Ugent — USMLE Study Platform

## Overview
Next.js 16 (App Router), Convex backend (disabled), Supabase Auth (@supabase/ssr).

## Stack
- Frontend: Next.js 16 (React 19), Tailwind v4, Recharts, Heroicons
- Backend: Convex disabled (free plan limit) — local JSONL in `data/` is real source
- Auth: Supabase Auth (@supabase/ssr)
- Testing: Jest + Vitest + Playwright

## Key Directories
```
convex/          backend (kept as migration reference only, not live)
data/            question bank JSONL files
lib/curriculum/  curriculum generator engine
app/curriculum/  curriculum page (study timeline UI)
app/strategy/    strategy hub
components/      shared UI
lib/             shared utilities
```

## Curriculum Generator
`lib/curriculum/analyzer.ts` parses JSONL, builds dependency graph + disease frequency map. `lib/curriculum/generator.ts` builds data-driven 19-week schedule (FOUNDATIONS → ORGAN_SYSTEMS → INTEGRATION → FINAL_REVIEW), weeks 1-6/7-14/15-17/18-19. `app/api/curriculum/route.ts` wires it; `app/curriculum/page.tsx` is the timeline UI. ORGAN_SYSTEMS phase allocates weeks proportionally from enriched-bank question counts, auto-pairs diseases by frequency — no hardcoding. Curriculum reads live JSONL, no cache. Block check-off persists in `localStorage` key `curriculum-completed-blocks`.

## Data Files
`medicospira-questions.jsonl` (parsed Q&A) → enrich (`scripts/deepseek-enrich.mjs`, DeepSeek API) → `medicospira-enriched.jsonl` → classify (`scripts/classify-local.py`, keyword-based) → `classified-questions.jsonl`. Only enriched + classified questions affect the curriculum. `medicospira-blobs.jsonl` = raw scraped blobs, rarely needed.

### Vision pipeline (image-based questions)
Inject `scripts/extract-vision.mjs`, call `window.__extractWithVision()` → `{question, choices, hasImages, imageSrcs}`. If images: download via curl, send to **qwen2.5vl:3b** on Ollama (`localhost:11434`, keep warm `keep_alive:'60m'`), `POST /api/chat` with `{model, messages:[{role:'user', content, images:[base64]}]}`. Covers EKGs, histology, pathology slides, anatomy diagrams.

## Operation Principles
- Study days: 6/week (Sunday off), 3 blocks/day (50min)
- FA + Pathoma refs in `analyzer.ts` (`FIRST_AID_MAP`, `PATHOMA_MAP`)
- Navigation: edit `lib/navigation.ts` (auto-propagates to Sidebar + MobileNav)
- Convex is down — all operations use local JSONL

## UI
Tailwind v4 theme vars in `globals.css`; component classes `.card`, `.stat-card`, `.btn-primary`, `.btn-secondary`. Dashboard pages wrap in `<DashboardLayout>`. No emojis unless requested.

## Voice / ASR pipeline
Mic: `useWhisperMic` (WebGPU+VAD) or `useContinuousMic` (SpeechRecognition fallback), both feed `onTranscript` in `lib/clea-agent-context.tsx`. Transcription order (`app/api/whisper-transcribe/route.ts`): OpenAI `gpt-4o-mini-transcribe` (primary, `language=en` forced) → local whisper.cpp (`scripts/local-whisper-server.py`, :8766) → in-browser Whisper (`lib/whisper-pipeline.ts`). Correction layer `lib/asr-correct.ts`: `stripTranscriptNoise` (drops noise + non-Latin hallucinations) then `correctText` (soundex+Levenshtein vs `lib/asr-dictionary.json`, plus `ALIASES`/`MULTI_ALIASES`/`ENGLISH_STOPLIST`). Every turn logs to `data/asr-log.jsonl`. Full dev-server restart kills HMR — refresh browser tab manually.

## Avatar / TTS / Lipsync Pipeline
Three warm servers, started manually (not auto-launched):
| Server | Port | Role |
|--------|------|------|
| Kokoro TTS | :8767 | primary audio gen |
| Piper TTS | :8768 | Kokoro fallback |
| Wav2Lip | :8765 | lipsync video frames (PyTorch MPS) |

Flow: LLM streams text → `FloatingAvatar.tsx` prefetches `/api/tts-audio` → full MP3 buffer sent to Wav2Lip WS as WAV bytes → server streams JPEG frames back → canvas paints frames, audio via MediaSource. `speak(fullText)` is single-shot (no per-sentence split, avoids per-call Wav2Lip tax). Send WAV sample rate to Wav2Lip or mouth-sync drifts.

## Quiz Architecture (planned Supabase)
Server-authoritative. Vercel serverless for `/api/quiz/start` (seed RNG, select questions), `/api/quiz/submit` (validate answer server-side, `correctAnswer` never in client bundle), `/api/quiz/complete` (INSERT attempt via RLS). Supabase holds questions + attempts; RLS `SELECT only` on questions, `INSERT own` on attempts. Client-thin renderer: UI, timer, progress. Rate-limit via Vercel Edge middleware. No separate Render server — Vercel handles quiz volume.

## graphify
Knowledge graph at `graphify-out/`. For codebase questions run `graphify query "<question>"` when `graphify-out/graph.json` exists; `graphify path "<A>" "<B>"` for relationships, `graphify explain "<concept>"` for concepts — cheaper than grep/GRAPH_REPORT.md. `graphify-out/wiki/index.md` for broad navigation. After code changes, `graphify update .` to refresh (AST-only, no API cost).

<!-- forge-learnings:start -->
## Learnings (auto-maintained by /um — human edits go ABOVE this block)
- Convex is fully disconnected from the live app (2026-07-08), not just "disabled" — no `convex/react`/`convex/nextjs` imports remain under `app/`. `convex/` dir kept only as a future migration reference.
- Billing/Stripe removed entirely (no `/pricing`, no `app/api/stripe/*`, no `lib/stripe.ts`) — do not assume payments exist.
- Quiz-taking runs on `data/classified-questions.jsonl` via `app/api/quiz-data/route.ts` + localStorage key `quiz-attempts` (mirrors curriculum's `curriculum-completed-blocks` pattern) — no DB.
- Before deleting an `app/api/*` route, confirm zero callers with `grep -rl '/api/x' app --include='*.tsx'` (excluding `app/api` itself) — ~35 routes were fully orphaned dead code from a removed Prisma backend.
- After deleting routes, `rm -rf .next` before trusting `tsc --noEmit` — stale `.next/dev/types/validator.ts` reports phantom missing-module errors for deleted routes.
- ASR transcription flipped to OpenAI-primary (2026-07-21) — `gpt-4o-mini-transcribe` first with `language=en` forced (was missing, caused foreign-script hallucination); local whisper.cpp/in-browser Whisper now fallbacks only.
- `lib/asr-dictionary.json` contains non-medical English words from scraping that caused false-positive corrections — fixed via `ENGLISH_STOPLIST` in `lib/asr-correct.ts`, extend as new collisions surface, don't prune the dictionary.
- `lib/prisma.ts` deleted (2026-07-21) — zero callers, leftover from removed Prisma backend.
<!-- forge-learnings:end -->
