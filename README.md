# UGent - AI-Powered Medical Education Platform

A comprehensive USMLE study platform with AI-powered analytics, personalized curriculum, voice assistant, and talking avatar.

## Quick Start

1. **Copy env file**
   ```bash
   cp .env.example .env.local
   ```
2. **Install + run**
   ```bash
   npm install
   npm run dev
   ```
3. **Ensure data files** exist in `data/` (see Data Files below)

## Features

### Frontend
- Dashboard with performance analytics (Recharts)
- 19-week data-driven study curriculum
- Quiz interface with real-time feedback
- Clea AI study assistant (chat + voice + avatar)
- Disease reference, leaderboard, strategy hub
- Responsive (mobile-first)

### Backend
- **Supabase Auth** - Login/session management
- **Supabase DB** - `questions` + `quiz_attempts` tables (RLS-scoped); curriculum reads local JSONL
- **Clea chat** - AI assistant via DeepSeek/OpenAI, RAG over book embeddings + deterministic topic router
- **ASR pipeline** - OpenAI Whisper -> local whisper.cpp -> in-browser fallback
- **TTS + Avatar** - Kokoro/Piper (dev) -> ElevenLabs (prod) TTS, Wav2Lip lipsync (WAV/PCM end to end)

## Architecture & Data Flow

Auth + quiz data via Supabase (questions/attempts tables, RLS); curriculum reads local JSONL. Clea grounds answers on Supabase book embeddings (RAG) and a sub-ms in-process specialty router. Voice servers run as macOS launchd agents; prod reaches Wav2Lip over a persistent Cloudflare tunnel, with ElevenLabs as the cloud TTS.

```
                         ┌──────────────────────────┐
                         │   Next.js 16 (Vercel)     │
                         └────────────┬─────────────┘
                                      │
        ┌───────────────┬─────────────┼──────────────┬────────────────┐
        ▼               ▼             ▼              ▼                ▼
  [Supabase Auth]  [Supabase DB]  [data/*.jsonl]  [/api/clea-chat]  [/api/whisper-
   login/session   questions +     curriculum      DeepSeek/OpenAI    transcribe]
                   quiz_attempts    source           │                 OpenAI ASR →
                                                     │                 whisper.cpp →
                     Promise.all (parallel, no added latency):         in-browser
                        ├─ searchBooks  → Supabase book embeddings (RAG grounding)
                        └─ routeTopic   → lib/topic-router (in-proc, sub-ms) → predictedSystem
                                      │
                                      ▼
                         [/api/tts-audio]  WAV/PCM end to end
                        ┌───────────┴────────────┐
                    dev │                        │ prod
                        ▼                        ▼
         Kokoro :8767 / Piper :8768       ElevenLabs /stream (cloud)
                        │                        │
                        └───────────┬────────────┘
                                    ▼
              Wav2Lip lipsync (launchd, self-restart)
              ├─ :8765  wav2lip-server  (local dev)
              └─ :8770  wav2lip-cloud   → Cloudflare tunnel → lipsync.clixen.app (prod)
```

## Project Structure

```
ugent-app/
├── app/                     # Next.js 16 App Router
│   ├── analytics/           # Performance charts
│   ├── api/                 # API routes
│   │   ├── clea-chat/       # AI assistant chat (RAG + topic router)
│   │   ├── curriculum/      # Curriculum generator
│   │   ├── curriculum-progress/ # Block check-off (Supabase)
│   │   ├── quiz-data/       # Question bank access (Supabase questions)
│   │   ├── quiz-activity/   # Attempt insert (Supabase quiz_attempts, RLS)
│   │   ├── disease-reference/  # Strategy Hub per-disease data
│   │   ├── strategy/        # Strategy hub data
│   │   ├── tts-audio/       # TTS proxy (Kokoro/Piper → ElevenLabs), WAV/PCM
│   │   ├── elevenlabs-tts/  # ElevenLabs cloud TTS
│   │   ├── whisper-transcribe/ # ASR (OpenAI → whisper.cpp → in-browser)
│   │   ├── lipsync-test/    # Wav2Lip proxy (env-var-ified)
│   │   ├── lipsync-tts/     # ElevenLabs + Wav2Lip
│   │   └── asr-log/         # Voice-turn logging
│   ├── auth/                # Supabase Auth pages (login/signup/callback/confirm)
│   ├── create-test/         # Quiz creation
│   ├── curriculum/          # 19-week study timeline UI
│   ├── dashboard/           # Main dashboard
│   ├── diseases/            # Disease reference
│   ├── leaderboard/         # Peer comparison
│   ├── quiz/                # Quiz runner
│   ├── settings/            # User settings
│   ├── strategy/            # Strategy hub (disease priority, clue training)
│   └── tests/               # Test history
├── components/
│   ├── CleaChat.tsx         # Chat sidebar
│   ├── CleaLiveOrb.tsx      # Live orb UI
│   ├── FloatingAvatar.tsx   # Wav2Lip avatar canvas (scheduleWavChunk)
│   ├── Avatar.tsx           # Avatar element
│   ├── DashboardLayout.tsx  # Layout shell
│   ├── Sidebar.tsx          # Nav sidebar
│   └── MobileNav.tsx        # Mobile nav
├── data/                    # Pipeline source JSONL (curriculum + enrichment)
│   ├── classified-questions.jsonl   # classifier output (qbank source of truth)
│   ├── medicospira-enriched.jsonl   # enrichment output (drives curriculum + router)
│   ├── medicospira-questions.jsonl  # parsed Q&A
│   ├── medicospira-blobs.jsonl      # raw scraped blobs
│   └── asr-log.jsonl                # voice-turn log
├── lib/
│   ├── clea-agent-context.tsx  # Voice/chat state machine
│   ├── clea-tools.ts           # Agent tools (searchPathoma/FirstAid, queryQbank/Curriculum)
│   ├── topic-router.ts         # Deterministic specialty router ("Brain 1", sub-ms)
│   ├── asr-correct.ts          # ASR correction layer
│   ├── asr-dictionary.json     # Medical term dictionary
│   ├── qbank.ts / quizAttempts.ts  # Supabase question + attempt readers
│   ├── whisper-pipeline.ts     # In-browser Whisper
│   ├── use-whisper-mic.ts      # WebGPU mic hook
│   ├── use-continuous-mic.ts   # SpeechRecognition fallback
│   ├── zod-schemas.ts          # Shared agent tool I/O schemas
│   ├── navigation.ts           # Route config (auto-propagates to nav)
│   ├── curriculum/             # Generator engine (analyzer + generator)
│   └── supabase/               # Supabase client (client + server)
├── scripts/                 # Python/JS utilities
│   ├── local-kokoro-server.py # TTS server (:8767)
│   ├── local-piper-server.py  # TTS fallback (:8768)
│   ├── local-whisper-server.py# ASR fallback (:8766)
│   ├── classify-local.py      # Keyword classifier
│   ├── deepseek-enrich.mjs    # AI enrichment
│   ├── build-book-embeddings.mjs # RAG book embeddings → Supabase
│   ├── eval-topic-router.ts   # Router eval harness
│   ├── bench-topic-router.ts  # Router microbench
│   ├── extract-vision.mjs     # Vision pipeline
│   └── ...
├── scratch/lipsync_test/Wav2Lip/  # Wav2Lip server (launchd :8765 dev, :8770 prod)
├── tests/
└── __tests__/
```

## Local Development

Ensure `data/classified-questions.jsonl` and `data/medicospira-enriched.jsonl` exist before running.

```bash
npm install
npm run dev
```

For voice/avatar features, start local servers (separate terminals):
```bash
cd scratch/lipsync_test/Wav2Lip && ./venv/bin/python3 server.py --face inputs/clea_480p.mp4  # :8765
python3 scripts/local-kokoro-server.py   # :8767
python3 scripts/local-piper-server.py    # :8768
python3 scripts/local-whisper-server.py  # :8766
```

To use avatar from Vercel prod, tunnel Wav2Lip via cloudflared:
```bash
cloudflared tunnel --url http://localhost:8765
# Set NEXT_PUBLIC_WAV2LIP_WS_URL + WAV2LIP_HTTP_URL in Vercel env
```

### Tests
```bash
npm run test       # Vitest
npx playwright test  # E2E
```

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + Recharts
- **Auth**: Supabase Auth (`@supabase/ssr`)
- **Data**: Supabase (`questions` + `quiz_attempts`, RLS) + local JSONL for curriculum
- **AI Chat**: DeepSeek / OpenAI via Vercel AI SDK, RAG over Supabase book embeddings + in-proc topic router
- **ASR**: OpenAI gpt-4o-transcribe
- **TTS**: Kokoro / Piper (dev, local Python) -> ElevenLabs (prod cloud) — WAV/PCM end to end
- **Avatar**: Wav2Lip (PyTorch MPS/CUDA), launchd dev :8765 / prod :8770 via Cloudflare tunnel
- **Testing**: Jest + Vitest + Playwright

---
