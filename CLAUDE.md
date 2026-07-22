# Response style
No markdown in chat replies: no asterisks/bold, no bullet lists, no headers. Plain short sentences only.

# Ugent — USMLE Study Platform

## Overview
Next.js 16 (App Router) + Convex backend (disabled) + Supabase Auth. Data-driven USMLE Step 1 study platform: ingests, enriches, classifies medical questions and generates personalized study curricula.

## Stack
- Frontend: Next.js 16 (React 19), Tailwind v4, Recharts, Heroicons
- Backend: Convex (disabled — free plan limit exceeded; local JSONL is the real data source)
- Auth: Supabase (`@supabase/ssr`, `@supabase/supabase-js`) — email/password + magic link, session cookies via `middleware.ts`, RLS-backed `quiz_attempts`/`quiz_answers` (`supabase/migration.sql`)
- Testing: Jest + Vitest + Playwright

## Key Directories
```
convex/          — Convex backend (kept as future migration reference only, not live)
data/            — Question bank JSONL files (primary data source)
lib/curriculum/  — Curriculum generator (data-driven study plan engine)
app/curriculum/  — Curriculum page (interactive 19-week study timeline)
app/strategy/    — Strategy Hub (disease priority, clue training, graph explorer)
components/      — Shared UI (Sidebar, MobileNav, DashboardLayout)
lib/             — Shared utilities (curriculum, navigation, ASR, agent/voice, hooks)
```

## Curriculum Generator
`lib/curriculum/analyzer.ts` parses `data/classified-questions.jsonl` + `data/medicospira-enriched.jsonl`, builds a dependency graph and per-system disease frequency map. `lib/curriculum/generator.ts` produces a 19-week, 4-phase, 342-block `Curriculum` (FA + Pathoma refs). `app/api/curriculum/route.ts` wires analyzer → generator; `app/curriculum/page.tsx` is the interactive timeline UI.

Phases (137 study days, 2.5h/day = `DAY_MINUTES=150`, 3 blocks/day = `BLOCK_MINUTES=50`, 6 days/week, Sunday rest):
| Phase | Weeks | Content |
|-------|-------|---------|
| FOUNDATIONS | 1-6 (32%, 90h) | Physiology + basic principles by system |
| ORGAN_SYSTEMS | 7-14 (42%, 120h) | Disease pairs, data-driven allocation from enriched bank |
| INTEGRATION | 15-17 (16%, 45h) | Cross-system mixed blocks, discriminator drills |
| FINAL_REVIEW | 18-19 (11%, 30h) | NBME simulations, weak-area targeting |

ORGAN_SYSTEMS is fully data-driven, not hardcoded: `systemDiseaseMap` (disease → question count per system) drives proportional week allocation and auto-pairs adjacent diseases by frequency. `normalizeSystem()` maps 30+ raw enriched system names to standard FA chapters (direct match → `ENRICHED_TO_FA_SYSTEM` alias → best-matching part of a compound name split on `/`, `,`, ` & `, ` and `). Curriculum auto-adapts as new questions are enriched/classified — no cached data.

Block check-off state persists in `localStorage` key `curriculum-completed-blocks`.

## Data Files
File | Role | When to update
-----|------|----------------
`data/medicospira-questions.jsonl` | Parsed Q&A (841 rows) | After scraping new questions
`data/medicospira-enriched.jsonl` | AI-enriched (disease, system, discriminators, prerequisites) | After enrichment pipeline
`data/classified-questions.jsonl` | Classified (subject, system, difficulty) | After classification pipeline
`data/medicospira-blobs.jsonl` | Raw scraped page blobs | Source material, rarely needed directly

Only enriched + classified questions are curriculum-visible; raw questions are invisible until enriched. Currently 100% of the 841 questions are enriched/classified. Pipeline: `scripts/deepseek-enrich.mjs` (DeepSeek API, batch 5, resumable) → `scripts/classify-local.py` (keyword-based).

Adding new questions: raw → `medicospira-questions.jsonl` (needs text, correctAnswer, options[], explanation, textHash) → enrich → classify → curriculum auto-updates on next load.

## UI / TypeScript conventions
- Tailwind v4 theme vars in `globals.css` (`--color-primary-600`, `--color-neutral-*`); component classes `.card`, `.stat-card`, `.btn-primary`, `.btn-secondary`
- Dashboard pages wrap in `<DashboardLayout>`; nav links added via `lib/navigation.ts` (auto-propagates to Sidebar + MobileNav)
- No emojis unless requested
- Legacy Convex server modules use `// @ts-nocheck`; new code doesn't. `convex/schema.ts` is the canonical (but currently inert) data model.

## Voice / ASR pipeline
Mic capture: `useWhisperMic` (`lib/use-whisper-mic.ts`, WebGPU + energy VAD) or `useContinuousMic` (browser `SpeechRecognition` fallback) — both feed `onTranscript` in `lib/clea-agent-context.tsx`.

Transcription order (`app/api/whisper-transcribe/route.ts`): OpenAI `gpt-4o-mini-transcribe` (primary, `language=en` forced) → local `scripts/local-whisper-server.py` (whisper.cpp/Metal, `ggml-medium.en.bin`, :8766) → in-browser `whisper-base.en` (`lib/whisper-pipeline.ts`) as last resort.

Correction layer (`lib/asr-correct.ts`), runs client-side before text reaches the LLM:
- `stripTranscriptNoise` — drops known noise tokens and any non-Latin-script transcript (CJK/Cyrillic hallucination)
- `correctText` — soundex + Levenshtein against `lib/asr-dictionary.json`, plus `ALIASES` (single-word Whisper mangling), `MULTI_ALIASES` (Whisper-split multi-word terms), `ENGLISH_STOPLIST` (plain English words the scraped dictionary wrongly contains — e.g. `shaving`, `refused`, `non` — that would otherwise "correct" real speech at edit-distance 1)

Every voice turn (raw + corrected, including dropped/noise) logs to `data/asr-log.jsonl` via `lib/asr-log.ts` + `app/api/asr-log/route.ts`. Console helpers: `asrLog()` / `asrMisses()`. New dict misses or false positives go into `ALIASES`/`MULTI_ALIASES`/`ENGLISH_STOPLIST`, not a dictionary rewrite.

Gotcha: a full dev-server restart kills the HMR socket — open tabs run the stale bundle until manually refreshed.

## Clea agent, TTS, and avatar (brief)
`lib/clea-agent-context.tsx` wires the voice/chat loop; tools in `lib/clea-tools.ts` (`searchPathoma`, `searchFirstAid`, `queryQbank`, `queryCurriculum`). TTS/lipsync chain: Kokoro (:8767) / Piper (:8768, dev-only, gated behind `!process.env.VERCEL`) → ElevenLabs `/stream` (`app/api/tts-audio`, `app/api/elevenlabs-tts`) as the cloud fallback that's the only path in prod. Avatar UI: `components/FloatingAvatar.tsx`, `Avatar.tsx`, `CleaLiveOrb.tsx`. `lib/watch-context.tsx` = watch-mode toggle (`clea-watch-enabled`). `lib/agent-error-logger.ts` logs AI SDK `APICallError`s to disk.

ASR (`app/api/whisper-transcribe/route.ts`): OpenAI `gpt-4o-mini-transcribe` primary (cloud, works in prod) → local whisper.cpp fallback gated to dev only (`if (process.env.VERCEL) return 500` before attempting it) → in-browser Whisper as the client-side last resort.

### Wav2Lip lipsync — two local server instances, split by traffic source
`scripts/lipsync_test/Wav2Lip/server.py` (actually under `scratch/lipsync_test/Wav2Lip/`) runs as **two separate processes** so a local dev session never contends with prod's GPU-bound inference:
- **`com.ugent.wav2lip-server`** (launchd) — port 8765, local-only, dev Kokoro/Piper PCM streaming via `ws://localhost:8765/lipsync-stream`. Never exposed to the internet.
- **`com.ugent.wav2lip-cloud`** (launchd) — port 8770, dedicated to prod. Sits behind a persistent named Cloudflare Tunnel (`cloudflared`, tunnel `ugent-wav2lip`, config `~/.cloudflared/ugent-wav2lip.yml`) at `https://lipsync.clixen.app`, which Vercel prod reaches via `WAV2LIP_HTTP_URL`/`NEXT_PUBLIC_WAV2LIP_WS_URL` env vars (`app/api/lipsync-tts/route.ts`, `app/api/lipsync-test/route.ts`, `components/FloatingAvatar.tsx`).

Both server instances and the tunnel run as launchd agents (`~/Library/LaunchAgents/com.ugent.wav2lip-*.plist`) with `RunAtLoad`+`KeepAlive` — they self-restart on crash and survive reboot/logout without manual restart. Gotcha: launchd doesn't inherit the shell `PATH`, so each plist must set `PATH` explicitly (`/opt/homebrew/bin:...`) or the server's `ffmpeg` subprocess calls fail with exit 127.

`/lipsync-stream` expects raw int16 PCM, not compressed audio. The WAV path (local Kokoro/Piper) strips the WAV header and streams real PCM. The MP3 path (ElevenLabs, prod's only TTS source) must decode via `AudioContext.decodeAudioData` client-side before sending — shipping raw MP3 bytes as if they were PCM reads as near-silent noise and the mouth doesn't move, even though frames still stream (this bug shipped once, since prod-only, dev testing with Kokoro's WAV path never exercised the MP3 branch).

### Planned migration off Wav2Lip (not yet built)
Wav2Lip is non-commercial-licensed — the current `com.ugent.wav2lip-cloud` Mac+Cloudflare-tunnel setup is a stopgap, not a licensed prod deploy. Decision (2026-07-21, see `~/.claude/plans/i-cnat-use-wave2lip-bubbly-willow.md`): replace with **MuseTalk** (TMElyralab, MIT, verified clean incl. every sub-checkpoint — sd-vae-ft-mse/Whisper/DWPose/face-parsing/face-alignment) wrapped by **lipku/LiveTalking** (Apache-2.0) rather than a from-scratch streaming wrapper — LiveTalking already solves avatar-prep caching, WebRTC output, producer/consumer threading, and barge-in, deployed on a RunPod GPU pod (24GB+ covers MuseTalk's ~10-15GB real-world VRAM use). Ditto and LiveAvatar were evaluated and rejected (InsightFace non-commercial checkpoint trap; multi-GPU-cluster requirement, respectively). Remaining risk: MuseTalk's native inference is batch-per-audio-file, not frame-streaming — first-frame latency will likely exceed Wav2Lip's near-zero-buffer streaming even with LiveTalking's optimizations; expected trade is somewhat higher latency for clean licensing + better mouth/lip quality.

## Other modules
- `lib/qbank.ts` — question bank reader (local JSONL). `lib/quizAttempts.ts` — quiz attempt read/write via Supabase `quiz_attempts` (`app/api/quiz-activity/route.ts` inserts, RLS-scoped to `user.id`); no localStorage attempt storage remains
- `app/api/disease-reference` → `lib/curriculum/disease-reference.ts` — Strategy Hub per-disease data (`app/strategy/[disease]`, `app/strategy/clue-training`)
- `lib/zod-schemas.ts` — shared Zod schemas for agent tool I/O
- `app/analytics`, `leaderboard`, `settings` — thin pages. `app/auth/login`, `app/auth/signup`, `app/auth/callback`, `app/auth/confirm` — Supabase auth flow (`lib/supabase/client.ts`, `lib/supabase/server.ts`); root `middleware.ts` gates protected routes via `supabase.auth.getUser()`

## Top tested diseases (current bank)
Pulmonary Embolism (3x), Tetralogy of Fallot (3x), Asthma (3x), TB (3x), Anaphylaxis (3x), Turner Syndrome (3x) — will shift as the bank grows.

<!-- forge-learnings:start -->
## Learnings (auto-maintained by /um — human edits go ABOVE this block)
- Convex fully disconnected from the live app (2026-07-08) — no `convex/react`/`convex/nextjs` imports under `app/`. `convex/` kept only as migration reference.
- Billing/Stripe removed entirely (no `/pricing`, no `app/api/stripe/*`, no `lib/stripe.ts`).
- Quiz questions come from Supabase `questions` table (`lib/qbank.ts`, migrated 2026-07-21 from `data/classified-questions.jsonl`, which stays as pipeline source of truth) via `app/api/quiz-data/route.ts`; quiz attempts are DB-backed via Supabase `quiz_attempts` (insert: `app/api/quiz-activity/route.ts`, read: `lib/quizAttempts.ts`/`app/api/clea-chat/route.ts`) — no localStorage attempt path remains (stale note corrected 2026-07-22).
- Before deleting an `app/api/*` route, confirm zero callers with `grep -rl '/api/x' app --include='*.tsx'` — ~35 routes were orphaned dead code from a removed Prisma backend.
- After deleting routes, `rm -rf .next` before trusting `tsc --noEmit` — stale `.next/dev/types/validator.ts` reports phantom missing-module errors.
- ASR transcription flipped to OpenAI-primary (2026-07-21) — `gpt-4o-mini-transcribe` first with `language=en` forced (previously omitted, caused foreign-script hallucination on short clips); local whisper.cpp and in-browser Whisper are now fallbacks only.
- `lib/asr-dictionary.json` contains non-medical English words from scraping (`shaving`, `refused`, `non`, `dad`, `mine`, `rob`...) that caused false-positive corrections at edit-distance 1. Fixed via `ENGLISH_STOPLIST` in `lib/asr-correct.ts` — extend the stoplist as new collisions surface, don't prune the dictionary wholesale.
- `lib/prisma.ts` deleted (2026-07-21) — zero callers, leftover from the already-removed Prisma backend.
<!-- forge-learnings:end -->
