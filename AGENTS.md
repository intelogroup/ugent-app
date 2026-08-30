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
`lib/curriculum/analyzer.ts` parses JSONL, builds dependency graph + disease frequency map. `lib/curriculum/generator.ts` builds data-driven 19-week schedule (FOUNDATIONS → ORGAN_SYSTEMS → INTEGRATION → FINAL_REVIEW), weeks 1-6/7-14/15-17/18-19. `app/api/curriculum/route.ts` wires it; `app/curriculum/page.tsx` is the timeline UI. ORGAN_SYSTEMS phase allocates weeks proportionally from enriched-bank question counts, auto-pairs diseases by frequency — no hardcoding. Curriculum reads the JSONL via `lib/data-source.ts` (Vercel Blob in prod, disk in dev); `analyzeQuestions()` is memoized once per process since `readDataFile` freezes file content for the process lifetime — a fresh deploy/restart re-parses, so pipeline changes need a redeploy to be observed. Block check-off persists per-user in Supabase `curriculum_progress` (insert/delete `app/api/curriculum-progress/route.ts`, RLS-scoped) — the dashboard reads the same DB count. No localStorage block path remains.

## Data Files
`medicospira-questions.jsonl` (parsed Q&A) → enrich (`scripts/deepseek-enrich.mjs`, DeepSeek API) → `medicospira-enriched.jsonl` → classify (`scripts/classify-local.py`, keyword-based) → `classified-questions.jsonl`. Only enriched + classified questions affect the curriculum. `medicospira-blobs.jsonl` = raw scraped blobs, rarely needed.

**Drill-card clue hygiene** (Strategy Hub `/strategy` → Drill Cards reads `enriched.highLeverageClues`/`discriminators` via `app/api/strategy/route.ts`): after re-enriching, run `node scripts/qbank-clue-clean.mjs` (flags: `--preview` dry-run, `--no-discriminators`). It deterministically strips (1) placeholders, (2) pure demographic-noise clues ("48-year-old man" — keeps "78-year-old man with hypertension" since it has real content; demographics also live in `clinicalContext`), (3) clues that just restate the disease/concept name, (4) low-specificity recycled phrases shared across ≥6 distinct diseases, and (5) bare dead discriminator cross-refs ("Same as above." — keeps "Same as above; pain is not pleuritic"). Clues-only, never touches `textHash`/`id`/`questionText`; backs up to `data/backups/` first. Audited 2026-08-30: 13,001→12,563 clues (~9%), 1 dead discriminator removed, 0 records dropped. Do NOT add an aggressive "tautology" discriminator pass — an audit proved those facts ("This is the proportion of X, not Y"; "No history of diabetes…") are real rule-out content, not fluff.

### Qbank gotchas (dedup + textHash)
- **Medicospira serves `AI-Generation` rewrites of its own questions.** Re-scraping returns reworded variants of questions we already have — the exact-text `textHash` dedup in `scripts/medicospira-loop.mjs` (md5 of raw text) reports them as "new" because the `AI-Generation\n\n` prefix changes the hash. A 50-batch scrape looked like +185 new but was ~79% reworded dups; only ~13 were genuinely novel. Always **semantic-dedup** (OpenAI `text-embedding-3-small` + cosine ≥ 0.90) before trusting "new question" counts. Scripts: `scripts/qbank-semantic-dup.py` (report), `scripts/qbank-dedup-plan.py` (cluster + pick representative), embeddings cached at `data/.embeddings/qbank.npy`.
- **textHash scheme was historically inconsistent.** `deepseek-enrich.mjs` used full sha256; `medicospira-loop.mjs` used md5-8; some hashes were computed on `AI-Generation`-prefixed raw text, others on stripped. This mixture let exact-dups slip through AND caused `classified-questions.jsonl` ids to drift from the Supabase `questions` ids (only ~634/4051 overlapped at one point). Normalized 2026-08-12: every id is now `md5(normalized(stripped text)).slice(0,8)`. If you touch the enrich/classify pipeline, keep textHash = md5-8 on `AI-Generation`-stripped text, or you'll re-fragment the id space.
- **`md5().slice(0,8)` is 32-bit** — fine at ~4k questions, but collision risk grows toward ~10k. Bump to a full hash if the bank grows.
- **`quiz_answers.question_id` has no FK to `questions.id`** and snapshots `question_text`/`correct_answer`/`explanation` per row — so deleting/re-id'ing questions is safe; past attempts are self-contained. The only sync scripts: `scripts/migrate-questions-to-supabase.mjs` (upsert from JSONL) and `scripts/clean-and-resync-qbank.mjs` (strip AI prefix + normalize hashes + full mirror). Backups land in `data/backups/`.

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
Quiz questions come from the Supabase `questions` table via `app/api/quiz-data/route.ts` (`lib/qbank.ts`, migrated 2026-07-21 from `data/classified-questions.jsonl`, which stays as pipeline source of truth). Quiz attempts are DB-backed via Supabase `quiz_attempts` — insert `app/api/quiz-activity/route.ts` (RLS-scoped to `user.id`, server-validates `1 ≤ total ≤ 500`, `0 ≤ correct ≤ total`, bounded time), read `lib/quizAttempts.ts` (range-windowed past PostgREST's 1000-row cap) / `app/api/clea-chat/route.ts`. No localStorage attempt path remains. Scoring is pure + tested in `lib/quiz-lifecycle.ts` (`recordAnswer` keyed by question id, overwrite-on-re-answer — the page's `correctCount`/`incorrectCount` derive from it, so back-nav re-answers can't double-count). Quiz payloads ship `options[].isCorrect` (needed for client self-grading) but not a separate `correctAnswer` key. `app/api/quiz-data?mode=filters` reports the exact bank count + full subject/system lists by range-windowing (a bare `select('*')` silently truncates at 1000 rows).

## Legal / Trust
Landing-page social proof (`components/SocialProof.tsx`) fetches a real registered-user count from `app/api/user-count` (service-role `listUsers`, cached) and hides below 50 users — no fabricated numbers. `/terms` + `/privacy` exist; `components/ConsentBanner.tsx` (localStorage `ugent-consent`) surfaces the voice/third-party disclosures. `.env.vercel.prod` is stripped to live keys only (Supabase + OpenAI + service role + Vercel OIDC); Stripe/Postgres/Nx-Turbo leftovers were purged.

## CI/CD
`.github/workflows/ci.yml` gates PRs: `unit` (tsc + jest + two vitest suites), `lint` (non-blocking — pre-existing react-hooks errors in avatar/Clea files), `e2e` (Playwright, gated on secrets, fetches `data/*.jsonl` from Vercel Blob since they're gitignored). The 4 `ai`-importing suites (CleaChat, clea-tools, clea-agent-context, agent-error-logger) fail under Jest/Node 24 (ai-sdk ESM interop, 0 tests run) and are routed to vitest via `npm run test:ai` + excluded in `jest.config.js`. E2E creds via `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` (fall back to stale `jbean@jovidoc.com`/`test123` — set the env vars to a live user). `/api/health` is a zero-dep liveness check.

## graphify
Knowledge graph at `graphify-out/`. For codebase questions run `graphify query "<question>"` when `graphify-out/graph.json` exists; `graphify path "<A>" "<B>"` for relationships, `graphify explain "<concept>"` for concepts — cheaper than grep/GRAPH_REPORT.md. `graphify-out/wiki/index.md` for broad navigation. After code changes, `graphify update .` to refresh (AST-only, no API cost).

<!-- forge-learnings:start -->
## Learnings (auto-maintained by /um — human edits go ABOVE this block)
- Convex/WorkOS/Stripe/`lib/prisma.ts` all fully removed (2026-07-21/24) — Supabase-only for auth+data, no payments anywhere, route protection lives in `proxy.ts` (Next 16's renamed middleware, not `middleware.ts`). Before deleting an `app/api/*` route confirm zero callers first (`grep -rl '/api/x' app --include='*.tsx'`, excluding `app/api` itself — ~35 routes were orphaned Prisma-backend dead code).
- Quiz questions/attempts are DB-backed via Supabase (`lib/qbank.ts`/`questions`, `quiz_attempts`) — no localStorage path remains anywhere in the quiz flow.
- Stale `.next/dev/` after killing/restarting `next dev` or deleting routes causes either phantom `tsc` missing-module errors OR every route 500ing with `ENOENT build-manifest.json` — check dev server stdout (e.g. `/private/tmp/nextjs-dev.log`) for that exact error before assuming an app-code regression; `rm -rf .next` + restart clears it.
- ASR is OpenAI-primary (`gpt-4o-mini-transcribe`, `language=en` forced) with local whisper.cpp fallback only, all in-browser ML deps removed. `lib/asr-dictionary.json` has non-medical scraped words causing false-positive corrections — extend `ENGLISH_STOPLIST` in `lib/asr-correct.ts` as collisions surface, don't prune the dictionary.
- Wav2Lip runs as two launchd agents: `com.ugent.wav2lip-server` :8765 (local dev) + `com.ugent.wav2lip-cloud` :8770 (prod, Cloudflare tunnel → `lipsync.clixen.app`). Each plist must set `PATH` explicitly (launchd doesn't inherit shell PATH) or `ffmpeg` subprocess fails exit 127.
- Audio is WAV/PCM end to end — `/api/tts-audio` always returns `audio/wav`, browser schedules chunks via Web Audio `scheduleWavChunk` (Chrome MediaSource doesn't support `audio/wav`). Kokoro `split_segments()` = per-sentence synth, flat ~470ms first audio.
- `lib/topic-router.ts` ("Brain 1") maps utterance → USMLE system in-process (sub-ms, no LLM), rides clea-chat's `Promise.all` behind `searchBooks` for zero added latency, feeds `predictedSystem` grounding + qbank scoping.
- `app/api/clea-chat/route.ts` cascades DeepSeek → OpenRouter (429 retry) → OpenAI (`gpt-4o-mini`) via `generateTextWithFallback()`. Verify with `DEEPSEEK_API_KEY=invalid-key`, check server log for `deepseek failed in no-grounding, fallback to openai`.
- Qbank answer-key integrity audit (2026-08-25): 182/4051 rows had `correct_answer` explicitly contradicted by their own `explanation` text (regex over `(Choice X)`/`(Choices X, Y, Z)` wrong-callout groups) — 172 confirmed real and fixed via Supabase PATCH (152 auto, 20 after manually reading full explanations); 10 flagged were false positives (heuristic misfires when the explanation affirms the answer inline, e.g. `...offset by gamma chain production (Choice C)`, with no "wrong" framing) and were left untouched. Separately, 90 rows have no usable answer key at all (`"AI-Generation\n\n"`-prefixed dead-end stubs, broken in source `classified-questions.jsonl` too, not a migration bug) — excluded from the pool via `.neq('correct_answer', '')` in `lib/qbank.ts` + `quiz-data/route.ts` (bank total 4051→3961). Never backfill missing-answer rows by fuzzy-matching question text against the jsonl — one attempt pulled an unrelated matrix-question's answer. Row `d41d8cd9` has an empty `text` field (question stem missing) — noticed in passing, unrelated to answer-key correctness, not yet fixed.
- **`questions` table RLS blocks the anon key entirely** — a bare `curl`/unauthenticated request always reads 0 rows even though service-role sees thousands. Verify quiz-data endpoints via a real logged-in browser tab or Supabase REST + `SUPABASE_SERVICE_ROLE_KEY`.
- `quiz_live_activity` (written on every `postQuizActivity()` in `app/quiz/page.tsx`) is a live proxy for "what question is the user on right now" — query it via REST + service-role key, zero browser tooling needed.
- **Vercel prod's plain server-only `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` env vars pointed to a different Supabase project than `NEXT_PUBLIC_SUPABASE_URL`** (the one the app's client bundle and `lib/supabase/server.ts` actually use) — silently 401'd (`AuthApiError: Invalid API key`) any route pairing `NEXT_PUBLIC_SUPABASE_URL` with a service-role key, e.g. `app/api/user-count/route.ts`. Fixed by syncing `SUPABASE_SERVICE_ROLE_KEY` to the same project as `.env.local`'s. Any new route doing this pairing must be hit live to confirm, not just checked for var presence — and a Vercel env var edit needs an explicit new deployment (`vercel deploy --prod`) to take effect, it does not apply to the already-built one.
- Public/aggregate API routes (bank-wide counts, not user data) must query with a service-role client, not the RLS-scoped session client, whenever the response carries `Cache-Control: s-maxage=...` — an RLS-scoped query lets one anon/unauthenticated hit (bot, health check) cache a wrong/empty result for every real user until the TTL expires. Applied to `app/api/quiz-data/route.ts`'s `mode=filters` branch.
<!-- forge-learnings:end -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
