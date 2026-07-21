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
- **Local JSONL** - Question bank (Convex disabled, kept as migration ref)
- **Clea chat** - AI assistant via DeepSeek/OpenAI
- **ASR pipeline** - OpenAI Whisper -> local whisper.cpp -> in-browser fallback
- **TTS + Wav2Lip** - Kokoro TTS + Wav2Lip avatar (local GPU servers)

## Architecture & Data Flow

All study data reads from local JSONL files. Convex backend is disabled (free-plan limit). Auth via Supabase. Voice/TTS/Wav2Lip run as local Python servers.

```
[Next.js 16 (Vercel)]
  │
  ├──► [Supabase Auth] ───── login/session
  │
  ├──► [data/*.jsonl] ────── question bank + curriculum
  │
  ├──► [/api/clea-chat] ──── DeepSeek/OpenAI AI assistant
  │
  └──► Local warm servers (macOS): ─── optional for prod via tunnel
        ├── Kokoro TTS  :8767
        ├── Piper TTS   :8768  (fallback)
        └── Wav2Lip     :8765  (env-var-ified, tunnel to Vercel)
```

## Project Structure

```
ugent-app/
├── app/                     # Next.js 16 App Router
│   ├── analytics/           # Performance charts
│   ├── api/                 # API routes
│   │   ├── clea-chat/       # AI assistant chat
│   │   ├── curriculum/      # Curriculum generator
│   │   ├── quiz-data/       # Question bank access
│   │   ├── tts-audio/       # Kokoro TTS proxy
│   │   ├── whisper-transcribe/ # ASR
│   │   ├── lipsync-test/    # Wav2Lip proxy (env-var-ified)
│   │   ├── lipsync-tts/     # ElevenLabs + Wav2Lip
│   │   └── ...
│   ├── auth/                # Supabase Auth pages
│   ├── create-test/         # Quiz creation
│   ├── curriculum/          # 19-week study timeline UI
│   ├── dashboard/           # Main dashboard
│   ├── diseases/            # Disease reference
│   ├── leaderboard/         # Peer comparison
│   ├── quiz/                # Quiz runner
│   ├── settings/            # User settings
│   ├── strategy/            # Strategy hub
│   └── tests/               # Test history
├── components/
│   ├── CleaChat.tsx         # Chat sidebar
│   ├── CleaLiveOrb.tsx      # Live orb UI
│   ├── FloatingAvatar.tsx   # Wav2Lip avatar canvas
│   ├── DashboardLayout.tsx  # Layout shell
│   ├── Sidebar.tsx          # Nav sidebar
│   └── MobileNav.tsx        # Mobile nav
├── convex/                  # Kept as migration reference (not live)
├── data/                    # Question bank JSONL files
│   ├── classified-questions.jsonl
│   ├── medicospira-enriched.jsonl
│   ├── medicospira-questions.jsonl
│   └── medicospira-blobs.jsonl
├── lib/
│   ├── clea-agent-context.tsx  # Voice/chat state machine
│   ├── asr-correct.ts          # ASR correction layer
│   ├── asr-dictionary.json     # Medical term dictionary
│   ├── whisper-pipeline.ts     # In-browser Whisper
│   ├── use-whisper-mic.ts      # WebGPU mic hook
│   ├── use-continuous-mic.ts   # SpeechRecognition fallback
│   ├── navigation.ts           # Route config
│   ├── curriculum/             # Generator engine
│   └── supabase/               # Supabase client
├── scripts/                 # Python/JS utilities
│   ├── local-kokoro-server.py # TTS server (:8767)
│   ├── local-piper-server.py  # TTS fallback (:8768)
│   ├── local-whisper-server.py# ASR fallback (:8766)
│   ├── tts_stream_play.py     # Kokoro MPS player
│   ├── classify-local.py      # Keyword classifier
│   ├── deepseek-enrich.mjs    # AI enrichment
│   ├── extract-vision.mjs     # Vision pipeline
│   └── ...
├── scratch/lipsync_test/Wav2Lip/  # Wav2Lip server (:8765)
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
- **Data**: Local JSONL (Convex kept as migration ref, not live)
- **AI Chat**: DeepSeek / OpenAI via Vercel AI SDK
- **ASR**: OpenAI Whisper -> local whisper.cpp -> in-browser Whisper
- **TTS**: Kokoro (primary) / Piper (fallback) — local Python servers
- **Avatar**: Wav2Lip (PyTorch MPS/CUDA) — env-var-ified, tunnel to prod
- **Testing**: Jest + Vitest + Playwright

---
