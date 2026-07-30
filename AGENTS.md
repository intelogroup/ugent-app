# Ugent — USMLE Study Platform

## Overview
Next.js 16 (App Router), Supabase (Auth + Postgres, @supabase/ssr).

## Stack
- Frontend: Next.js 16 (React 19), Tailwind v4, Recharts, Heroicons
- Backend: Supabase Postgres + local JSONL in `data/` (curriculum source); no separate app backend
- Auth: Supabase Auth (@supabase/ssr); route protection in `proxy.ts` (Next 16's renamed middleware)
- Testing: Jest + Vitest + Playwright

## Key Directories
```
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
- All data operations use Supabase + local JSONL (no Convex)

## UI
Tailwind v4 theme vars in `globals.css`; component classes `.card`, `.stat-card`, `.btn-primary`, `.btn-secondary`. Dashboard pages wrap in `<DashboardLayout>`. No emojis unless requested.

## Voice / ASR pipeline
Mic: `useWhisperMic` (VAD-based) feeds `onTranscript` in `lib/clea-agent-context.tsx`. Transcription: OpenAI `gpt-4o-transcribe` via `app/api/whisper-transcribe/route.ts` — only ASR path. Correction layer `lib/asr-correct.ts`: `stripTranscriptNoise` (drops noise + non-Latin hallucinations) then `correctText` (soundex+Levenshtein vs `lib/asr-dictionary.json`, plus `ALIASES`/`MULTI_ALIASES`/`ENGLISH_STOPLIST`). Every turn logs to `data/asr-log.jsonl`. Full dev-server restart kills HMR — refresh browser tab manually.

## Avatar / TTS / Lipsync Pipeline
`lib/clea-agent-context.tsx` wires the voice/chat loop; tools in `lib/clea-tools.ts` (`searchPathoma`, `searchFirstAid`, `queryQbank`, `queryCurriculum`). Deterministic specialty router `lib/topic-router.ts` maps the utterance to a USMLE system in-process (sub-ms, no LLM), riding the chat route's `Promise.all` behind the RAG prefetch — feeds `predictedSystem` as a soft grounding hint and scopes qbank.

TTS chain: Kokoro (:8767) / Piper (:8768, dev-only, gated behind `!process.env.VERCEL`) → ElevenLabs `/stream` (`app/api/tts-audio`, `app/api/elevenlabs-tts`) as the cloud fallback — the only path in prod. **WAV/PCM end to end**; every `/api/tts-audio` branch returns `audio/wav` (Kokoro 24kHz, Piper 22050Hz, ElevenLabs requested `pcm_24000` with a streaming WAV header prepended server-side). `FloatingAvatar.tsx` strips the header per chunk (`stripWavHeader`) and schedules each WAV chunk via the Web Audio API (`scheduleWavChunk`) — Chrome's MediaSource doesn't support `audio/wav`, so MediaSource is retained only for the rare ElevenLabs mp3-tier fallback. Kokoro `split_segments()` synthesizes one sentence at a time so first audio is flat ~470ms at any reply length. Send the WAV sample rate to Wav2Lip or mouth-sync drifts. `/lipsync-stream` expects raw int16 PCM, not compressed audio.

### Talk↔idle crossfade (FloatingAvatar)
The avatar swaps between a live `<canvas>` (full Wav2Lip frames while speaking — the whole avatar moves + mouth lip-synced) and an idle `<video>` (`/clea2-idle-720p.mp4`). The talk canvas draws the FULL frame (`ctx.drawImage(bitmap, …)`), not a mouth-only overlay — a fixed-ellipse mouth compositor was tried 2026-07-24 and reverted because it froze the body (fixed ellipse only aligns if the head is still). Three rules keep the transition clean:
1. **Idle is the always-opaque BOTTOM layer; only the canvas on top fades.** Fading both at once (idle 0→1, canvas 1→0) makes each pass through ~0.5 opacity, and 0.5-over-0.5 alpha compositing sums to <100% against the container bg — a brightness dip that reads as a "light change / lighting flicker". Fixed 2026-07-24 by pinning idle `opacity:1` (no transition) and fading only the canvas. Don't reintroduce a fade on the idle layer.
2. **Pose continuity via seek, not by keeping idle running.** `resumeIdleVideo()` seeks idle to `lastFrameTimeRef` (Wav2Lip's last output frame) and gates the crossfade on the `seeked` event before revealing it. This works ONLY because idle's forward half (frames 0–240) is frame-identical to the Wav2Lip `--face` source (`clea2_720p.mp4` on both local :8765 and cloud :8770, 240f @ 24fps; idle is the 480f ping-pong of it). `CLIP_FRAME_COUNT=240`. Do NOT "keep idle playing underneath / never seek" — idle==face source, so a free-running idle lands on a random pose = the jump the seek exists to kill. If the idle loop or face clip is ever regenerated, re-verify this frame alignment.
3. **Idle is paused during talk** (opaque full-frame canvas covers it) and resumed by `resumeIdleVideo()` on talk-off.

Debug: `localStorage.clea-avatar-trace='1'` + refresh logs every talk↔idle edge with timestamps; `crossfade(fallback)` (vs `seeked`) means the 120ms seek-timer won and pixels weren't ready.

Wav2Lip runs as **two launchd server instances**, split by traffic source (both `RunAtLoad`+`KeepAlive`, self-restart, survive reboot):
| launchd agent | Port | Role |
|---------------|------|------|
| `com.ugent.wav2lip-server` | :8765 | local-only, dev Kokoro/Piper streaming (`ws://localhost:8765/lipsync-stream`) |
| `com.ugent.wav2lip-cloud`  | :8770 | prod, behind persistent Cloudflare tunnel `ugent-wav2lip` → `lipsync.clixen.app` |

Prod reaches it via `WAV2LIP_HTTP_URL` / `NEXT_PUBLIC_WAV2LIP_WS_URL` (`app/api/lipsync-tts/route.ts`, `app/api/lipsync-test/route.ts`, `FloatingAvatar.tsx`). Gotcha: launchd doesn't inherit shell `PATH`, so each plist sets `PATH` explicitly or the server's `ffmpeg` subprocess fails with exit 127.

### Planned migration off Wav2Lip (not yet built)
Wav2Lip is non-commercial-licensed — the current Mac+Cloudflare-tunnel setup is a stopgap. Decision (2026-07-21): replace with **MuseTalk** (TMElyralab, MIT, verified clean incl. every sub-checkpoint) wrapped by **lipku/LiveTalking** (Apache-2.0) rather than a from-scratch streaming wrapper — LiveTalking already solves avatar-prep caching, WebRTC output, producer/consumer threading, and barge-in. Deploy on a RunPod GPU pod (24GB+ covers MuseTalk's ~10-15GB VRAM). Ditto and LiveAvatar were evaluated and **rejected** (InsightFace non-commercial checkpoint trap; multi-GPU-cluster requirement). Remaining risk: MuseTalk is batch-per-audio-file, not frame-streaming — first-frame latency will likely exceed Wav2Lip's near-zero-buffer streaming; trade is higher latency for clean licensing + better lip quality.

## Quiz Architecture (Supabase, live)
Quiz questions come from the Supabase `questions` table via `app/api/quiz-data/route.ts` (`lib/qbank.ts`, migrated 2026-07-21 from `data/classified-questions.jsonl`, which stays as pipeline source of truth). Quiz attempts are DB-backed via Supabase `quiz_attempts` — insert `app/api/quiz-activity/route.ts` (RLS-scoped to `user.id`), read `lib/quizAttempts.ts` / `app/api/clea-chat/route.ts`. No localStorage attempt path remains.

## graphify
Knowledge graph at `graphify-out/`. For codebase questions run `graphify query "<question>"` when `graphify-out/graph.json` exists; `graphify path "<A>" "<B>"` for relationships, `graphify explain "<concept>"` for concepts — cheaper than grep/GRAPH_REPORT.md. `graphify-out/wiki/index.md` for broad navigation. After code changes, `graphify update .` to refresh (AST-only, no API cost).

<!-- forge-learnings:start -->
## Learnings (auto-maintained by /um — human edits go ABOVE this block)
- Convex + WorkOS fully removed (2026-07-24) — `convex/` dir, `lib/convex-client.ts`, the `convex` npm dep, and 13 convex-coupled scripts deleted; @workos-inc was only a transitive of convex. App is Supabase-only for auth + data. Route protection lives in `proxy.ts` (Next 16's renamed middleware, not `middleware.ts`).
- Billing/Stripe removed entirely (no `/pricing`, no `app/api/stripe/*`, no `lib/stripe.ts`) — do not assume payments exist.
- Quiz questions come from the Supabase `questions` table via `app/api/quiz-data/route.ts` (`lib/qbank.ts`, migrated 2026-07-21 from `data/classified-questions.jsonl`, kept as pipeline source of truth); attempts are DB-backed via Supabase `quiz_attempts` (insert `app/api/quiz-activity/route.ts`, read `lib/quizAttempts.ts`) — no localStorage attempt path remains (stale "localStorage `quiz-attempts` / no DB" note corrected 2026-07-24).
- Before deleting an `app/api/*` route, confirm zero callers with `grep -rl '/api/x' app --include='*.tsx'` (excluding `app/api` itself) — ~35 routes were fully orphaned dead code from a removed Prisma backend.
- After deleting routes, `rm -rf .next` before trusting `tsc --noEmit` — stale `.next/dev/types/validator.ts` reports phantom missing-module errors for deleted routes.
- ASR transcription flipped to OpenAI-primary (2026-07-21) — `gpt-4o-mini-transcribe` first with `language=en` forced (was missing, caused foreign-script hallucination); local whisper.cpp fallback only. All in-browser ML deps removed (2026-07-26): `@ricky0123/vad-web`, `@huggingface/transformers`, `@mlc-ai/web-llm`, `kokoro-js`, `public/ort/`, `public/vad/`. Energy-based VAD in `useWhisperMic` sends PCM to cloud API.
- `lib/asr-dictionary.json` contains non-medical English words from scraping that caused false-positive corrections — fixed via `ENGLISH_STOPLIST` in `lib/asr-correct.ts`, extend as new collisions surface, don't prune the dictionary.
- `lib/prisma.ts` deleted (2026-07-21) — zero callers, leftover from removed Prisma backend.
- Wav2Lip runs as two launchd agents (2026-07-24, not manual): `com.ugent.wav2lip-server` :8765 (local dev) + `com.ugent.wav2lip-cloud` :8770 (prod, persistent Cloudflare tunnel → `lipsync.clixen.app`). Both `RunAtLoad`+`KeepAlive`. URL via `NEXT_PUBLIC_WAV2LIP_WS_URL` / `WAV2LIP_HTTP_URL`. Each plist must set `PATH` explicitly (launchd doesn't inherit shell PATH) or `ffmpeg` subprocess fails exit 127.
- Audio is WAV/PCM end to end (2026-07-24) — `/api/tts-audio` returns `audio/wav` on every branch, browser schedules chunks via Web Audio `scheduleWavChunk` (Chrome MediaSource doesn't support `audio/wav`). Kokoro `split_segments()` = per-sentence synth, flat ~470ms first audio. Stale "full MP3 buffer / MediaSource / single-shot speak" note corrected.
- Deterministic specialty router `lib/topic-router.ts` ("Brain 1", 2026-07-24) — maps utterance → USMLE system in-process (sub-ms, no LLM), rides the clea-chat `Promise.all` behind `searchBooks` (zero added latency). Feeds `predictedSystem` grounding hint + qbank scoping. Eval `scripts/eval-topic-router.ts`, bench `scripts/bench-topic-router.ts`.
- DeepSeek fallback to OpenAI (2026-07-30): `app/api/clea-chat/route.ts` has 3 `generateText` + 1 buffered fallback paths via `generateTextWithFallback()` and inline try/catch at each site. Scripts `scripts/deepseek-enrich.mjs` and `scripts/reclassify-concepts.mjs` cascade DeepSeek → OpenRouter (with 429 retry) → OpenAI. Model: `gpt-4o-mini`. Provider switching uses `@ai-sdk/openai` (already installed). Verified via agent-browser: set `DEEPSEEK_API_KEY=invalid-key`, send chat msg, confirm server log shows `deepseek failed in no-grounding, fallback to openai`.
- agent-browser testing flow: `agent-browser --session-name ugent --executable-path ~/.agent-browser/browsers/chrome-*/Google\ Chrome\ for\ Testing.app/Contents/MacOS/Google\ Chrome\ for\ Testing open <url>` then navigate to `/auth/login`, fill form, submit. After login, click `@e16` (Clea assistant), fill `@e27` (chat input), click `@e28` (send). Check response in `agent-browser get text body`.
<!-- forge-learnings:end -->
