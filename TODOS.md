# TODOS

## Live Agent Infrastructure (2026-07-17 decisions)

**Overview:** Three-pod RunPod architecture, self-hosted models, ~$540/mo for 1K users. Replaces HeyGen ($360K+/mo) and OpenAI API calls.

### Pod roles

| Pod | Model | Role | TTFT | VRAM |
|:---|:---|:---|:---|---:|
| **Pod 1 — Flash** | Llama 3.2 3B FP16 | Greetings, casual chat, simple QA | ~25ms | ~10/24GB |
| **Pod 2 — Brain** | Qwen 3.5 32B Q4_K_M | RAG (First Aid/Pathoma), tool calling, complex reasoning, USMLE QA | ~110ms | ~18/24GB |
| **Pod 3 — Renderer** | Wav2Lip + Kokoro + backup Qwen 2.5 14B | Lipsync video, TTS, load-balanced LLM fallback | ~50ms | ~19/24GB |

### Model choices

- **Qwen 3.5 32B** replaces Qwen 2.5 32B (better MedQA: ~87% vs ~82%, 256K ctx, same VRAM footprint). Self-hosted on vLLM with prefix caching for RAG chapters.
- **Llama 3.2 3B** for sub-30ms TTFT on trivial queries.
- **GPT-4o fallback** for 5% edge-case queries (~$0.01/call, negligible cost).
- Prefix-cache First Aid chapters, Pathoma transcripts, high-yield tables in vLLM.

### Agent search tools

| Tool | Status | Scope |
|:---|:---|:---|
| `searchPubMed` | ✅ Add | Primary literature. Used only when student asks "what's new" / "latest guidelines" |
| `searchExa` | ✅ Add | Curated semantic search. Medscape, UpToDate-level sources |
| Tavily / raw web fetch | ❌ Reject | SEO garbage, WebMD pop quizzes — destroys brand trust |

**Rule:** PubMed/Exa are never the default RAG source. First Aid/Pathoma stay as ground truth. PubMed/Exa are live-update layer only.

### Routing (Vercel AI SDK)

```
Heuristic classifier:
- tool calls OR >100 chars OR "explain|compare|why|how|differential" → Qwen 3.5 32B
- short chitchat, greetings, "yes/no" → Llama 3.2 3B
- 5% ultra-hard / novel cases → GPT-4o fallback
```

### GPU economics at scale

| Users | GPUs needed | RunPod cost/mo | Revenue ($49/user) | Profit/mo |
|:---|---:|---:|---:|---:|
| 1,000 | 3–4 | ~$720 | $49,000 | **~$48,460** |
| 5,000 | 15–20 | ~$3,600 | $245,000 | **~$241,400** |
| 10,000 | 30–40 | ~$7,200 | $490,000 | **~$482,800** |

Margin stays >97% at scale. Compare: HeyGen would cost $360K+/mo for 1K users.

### RunPod schedule

- **8 AM – 10 PM:** 3 pods warm (peak school hours)
- **10 PM – 8 AM:** 1 pod warm (off-peak, auto-stop 2)
- Saves ~$150/mo vs 24/7

### Week 1 rollout

| Day | Task |
|:---|---:|
| 1 | Deploy vLLM + Qwen 3.5 32B Q4_K_M on RunPod pod 2 |
| 2 | Deploy Llama 3.2 3B + Whisper + Kokoro on pod 1 |
| 3 | Connect Vercel AI SDK to both, build routing heuristic |
| 4 | Set up prefix caching for First Aid/Pathoma chapters |
| 5 | Benchmark P50/P95/P99 TTFT across query types |

### Week 2 — replace API calls

| Day | Task |
|:---|---:|
| 1 | Switch STT: browser-native → Whisper on pod 1 |
| 2 | Switch TTS: ElevenLabs → Kokoro on pod 1 |
| 3 | Switch LLM: OpenAI/Deepseek → Qwen 3.5 32B on pod 2 |
| 4 | End-to-end test: browser → Vercel AI SDK → RunPod → lipsync → browser |

---

## Brain Agent — Knowledge State Engine & Tutor Diagnostician

**What:** Build the core tutoring agent that sits behind the voice/text interface. This is the "brain" — it has access to user progress, runs knowledge gap analysis, chains prerequisite topics, and enforces a diagnostic teaching loop.

**Why:** The current RAG pipeline answers questions. It doesn't diagnose *why* a student is struggling, doesn't track root-cause gaps (e.g. failing Brugada because they don't understand ion channels), and doesn't force students to reason before getting answers. Without this, the app is Q&A, not tutoring.

**⚠️ Persistence layer needs redesign (2026-07-18):** all "Convex Schema" tables below assume Convex, but Convex is fully disconnected from the app (no `convex/react`/`convex/nextjs` imports remain). Decision made to stay on local JSONL rather than re-enable Convex. Before implementation: replace `userKnowledgeState`/`missedQuestions`/`spacedRepQueue`/`sessionLogs`/`prerequisiteGraph` Convex tables with a local-file or lightweight DB equivalent (SQLite/Neon are candidates — matches the existing `curriculum-completed-blocks`/`quiz-attempts` localStorage pattern for client state, but server-side knowledge tracking needs real persistence, not localStorage). Everything below is unchanged in spirit, just needs a non-Convex backing store.

---

### System Prompt — Core Rules

The agent prompt must enforce these non-negotiables at the Vercel AI SDK level:

1. **Diagnostician, not Answer-Giver** — Job is to identify what student doesn't know and fix it, not answer questions. Answer comes last, after student reasons through it.
2. **6-Step Cycle (MANDATORY):** Retrieve → Diagnose → Probe → Teach → Verify → Update. Agent cannot skip from step 2 to 4.
3. **Prerequisite Chain Finder** — Never teach a topic before verifying prerequisites are solid. If student fails Brugada, test ion channel basics first. Work up the chain until you find the root gap.
4. **Spaced Learning Injection** — After every correct answer, log to spaced-rep queue. Next login starts with weakest topic. If same topic 3 sessions → force-switch.
5. **Honesty Circuit** — "I don't know" is acceptable. Never fabricate. All facts must trace to RAG source (First Aid/Pathoma/PubMed). Unverified claims labeled as "recall, not source".
6. **No Cheat Day** — Student asking "just tell me the answer" → interpret as frustration, not request. Address fatigue, then continue teaching.

### Code-Level Guards

| Guard | Mechanism |
|:---|---:|
| **Must probe before teach** | `verifyKnowledgeGap` tool is MANDATORY before any explanation output. Vercel AI SDK tool-use guard rejects response if not called this turn. |
| **6-step sequence enforced** | Steps 3 (Probe), 4 (Teach), 5 (Verify) are LLM output schema validations — missing one = rejection |
| **Prerequisite chain required** | Dedicated `getPrerequisiteChain(topic)` tool. Agent must call it for any topic where student accuracy <60%. |
| **No answer-first** | First token of response must not be an answer unless flagged urgent. Regex guard on streaming output. |
| **Source traceability** | Every statement tagged with source doc ID. If no match → flagged as "recall" in frontend. |

### Convex Schema — Knowledge State Tracking

| Table | Purpose |
|:---|---:|
| `userKnowledgeState` | Per-topic accuracy, last tested, prerequisite mastery flags |
| `missedQuestions` | Raw missed Qs with topic, subtopic, timestamp, user reasoning trail |
| `spacedRepQueue` | Per-user queue of topics due for review, with priority score |
| `sessionLogs` | Full interaction trace per session (query → probe → teach → verify result) |
| `prerequisiteGraph` | DAG of topic→prerequisite edges, weight/likelihood of causal gap |

### Architecture

```
User Query → Vercel AI SDK (Qwen 3.5 32B)
               │
               ├─ Call getUserProgress(userId)
               ├─ Call getWeakAreas(userId)
               ├─ Call getPrerequisiteChain(topic)
               │
               ├─ MUST call verifyKnowledgeGap() before answering
               │
               └─ Output → structured teaching response
                            ├─ Probe questions asked
                            ├─ Explanation (only after gap confirmed)
                            └─ Verification question
```

### Implementation Order

| # | Task | Depends on |
|:--|:---|:---:|
| 1 | Define Convex schema: `userKnowledgeState`, `missedQuestions`, `spacedRepQueue`, `sessionLogs`, `prerequisiteGraph` | — |
| 2 | Build `verifyKnowledgeGap` tool (Vercel AI SDK tool definition + Convex query) | #1 |
| 3 | Build `getPrerequisiteChain` tool | #1 |
| 4 | Write system prompt with 6 non-negotiable rules + "no cheat day" circuit | #2, #3 |
| 5 | Implement Vercel AI SDK tool-use guard (reject response if probe not called) | #2 |
| 6 | Implement prerequisite chain walker (input topic → test prereqs recursively) | #3, #1 |
| 7 | Build spaced-rep queue + login-time weakest-topic injection | #1 |
| 8 | Build session log ingestion pipeline (every interaction → write to `sessionLogs`) | #1 |
| 9 | Implement force-switch detector (same topic 3 sessions → route to different subject) | #7, #8 |
| 10 | End-to-end test: real student with real missed Q data → agent diagnoses root cause → teaches → verifies → updates state | #1–#9 |

---

## Fillers / Loading States & Sound FX for Agent Latency

**What:** Two UX improvements for when the agent takes time to think/search/respond:

### A. Fillers (visual loading states)
- **Skeleton loaders** — pulsing gray blocks where the agent answer will appear (same shape as final output)
- **Typing indicator** — animated dots while agent is calling tools / reasoning
- **Progressive disclosure** — show each step as it happens (e.g., "📖 Retrieving your progress… → 🔍 Looking up Brugada prerequisites… → ✍️ Generating probe question…") so the user sees forward motion
- **Worst-case timeout fallback** — if agent >10s, show a message like "This is taking longer than usual — I'm still working on it" with a pulsing indicator

### B. Sound FX (audio feedback)
- **Page flip / book rustle** — short ~0.5s sound when agent begins a search/lookup (reinforces "I'm looking something up in your library" mental model)
- **Soft chime** — when agent finishes answering (subtle notification, especially if user tabbed away)
- **No sound on fast responses** (< 2s) — only on responses that actually take noticeable time, to avoid annoying on every keystroke
- User setting to **mute all sounds** (default: on, with a toggle in settings)

**Why:** The agent's diagnostic cycle (Retrieve → Diagnose → Probe → Teach → Verify) can take 3-10 seconds. Without fillers or sound, the user stares at a blank screen wondering if the app crashed. With them, the UI feels alive and the delay communicates "working, not broken."

**Pros:** 
- Significantly improves perceived performance
- Sound FX creates a distinctive "studying" atmosphere (ambient library feel)
- Progressive disclosure builds trust (user sees what the agent is doing)

**Cons:**
- Sounds can be annoying if overused or no mute toggle
- Need to source/buy royalty-free sound assets (page flip, soft chime)
- Skeleton loaders add extra rendering work

**Implementation notes:**
- Sound playback via `Howler.js` or native `Audio()` — tiny bundle impact
- Progressive disclosure state machine in React: `idle → retrieving → probing → teaching → verifying → done`
- Consider Haptic feedback on mobile (iOS Core Haptics / Android Vibration API) as a silent alternative to sound

**Depends on:** The Brain Agent system prompt and tool orchestration (above) being implemented first — fillers reveal the agent's internal steps, so they need a concrete step pipeline to display.

---

## Lipsync Model — MuseTalk on RunPod (Decision 2026-07-18)

**Decision:** Use **MuseTalk (MIT license)** on RunPod for production. **Do NOT train Wav2Lip from scratch** — dataset cost (500+ hours curated talking-head video) far outweighs benefit. MuseTalk is MIT, real-time (30+ FPS on A10G), supports fine-tuning on small custom data (1–3 hours) if needed.

**Update Pod 3 in architecture:**

| Pod | Model | Role | License |
|:---|:---|:---|---:|
| **Pod 3 — Renderer** | **MuseTalk** + Kokoro + Qwen 2.5 14B | Lipsync video, TTS, LLM fallback | **MIT** ✅ |

### Known Limitations (Researched July 2026)

| # | Issue | Root Cause | Severity | Fix |
|---|:---|:---|---:|:---|
| 1 | Blurry mouth region | VAE bottleneck (64×64 latent → 256×256 frame) — small latent error → 10× pixel error | 🔴 High | GFPGAN post-process (Fix 1) |
| 2 | Lip jitter (frame-to-frame incoherence) | Frame-independent UNet inference + Whisper audio-window boundaries | 🔴 High | Temporal smoothing + sliding audio window (Fix 2A/2B/5) |
| 3 | Face identity drift over long sessions | Reference frame encoded once, VAE latent drifts after 30+ seconds | 🟡 Medium | Periodic reference reset (Fix 3) |
| 4 | Poor dental detail | Dynamic Margin Sampling in training trades teeth clarity for sync speed | 🟡 Medium | Sub-region loss weight (Fix 4, fine-tuning only) |
| 5 | `huggingface_hub` version break | Semver-incompatible dependency | 🟢 Low | Pinned Dockerfile (Fix 6) |

### Fix Implementation Plan (In Priority Order)

All fixes below go into the `musetalk-worker.py` WebSocket server on RunPod or the FloatingAvatar canvas loop in the browser.

| # | Fix | Where | Effort | Latency Cost | Day |
|---|:---|:---|---:|:---:|:---:|
| **6** | **Pinned Dockerfile** | `RunPod/Dockerfile` | 🟢 10 min | 0ms | 1 |
| **2B** | **Frame blending in canvas** | `FloatingAvatar.tsx` paint loop | 🟢 5 lines | 0ms | 1 |
| **3** | **Periodic reference reset** | `musetalk-worker.py` + WS protocol | 🟢 15 lines | ~50ms/30s | 1 |
| **5** | **Sliding audio window** | `musetalk-worker.py` inference loop | 🟡 1hr | ~15ms | 2 |
| **2A** | **Latent-space blending** | `musetalk-worker.py` inference loop | 🟡 30min | ~2ms | 2 |
| **1** | **GFPGAN post-process** | `musetalk-worker.py` optional step | 🟡 1hr | ~8ms | ⏸️ If quality needs it |
| **4** | **Teeth sub-region loss** | Training config (fine-tuning only) | 🔴 N/A | 0ms | ⏸️ Optional |

#### Fix 6 — Pinned Dockerfile (Day 1)

```dockerfile
FROM nvidia/cuda:12.4.0-runtime-ubuntu22.04
RUN pip install torch==2.4.0 torchvision==0.19.0 \
                huggingface-hub==0.24.0 \
                opencv-python==4.9.0.80 \
                websockets==12.0 \
                numpy==1.26.4
```

Plus a healthcheck that verifies MuseTalk model loads before accepting WS connections.

#### Fix 2B — Frame Blending in Canvas (Day 1)

**File:** `FloatingAvatar.tsx` (canvas paint loop, ~line 300–380)

```typescript
// Replace direct frame draw with:
frameBuffer.push(decodedFrame);
if (frameBuffer.length > 2) frameBuffer.shift();
if (frameBuffer.length === 2) {
  ctx.globalAlpha = 0.3;
  ctx.drawImage(frameBuffer[0], 0, 0); // previous frame, ghosted
  ctx.globalAlpha = 0.7;
  ctx.drawImage(frameBuffer[1], 0, 0); // current frame, dominant
  ctx.globalAlpha = 1.0;
}
```

#### Fix 3 — Periodic Reference Reset (Day 1)

**Protocol addition:**

```
BROWSER → WORKER: {"type": "reset_reference"}  // every 30s
WORKER: re-run face detection on latest frame, re-encode VAE latent
```

**File:** `musetalk-worker.py`

```python
if msg.type == "reset_reference":
    latest_frame = frame_buffer[-1]
    face_bbox = face_detector(latest_frame)
    face_crop = crop(latest_frame, face_bbox)
    reference_latent = vae.encode(face_crop)
    self.reference_latent = reference_latent
```

Add a heartbeat to FloatingAvatar that fires `{"type": "reset_reference"}` every 30s of continuous streaming.

#### Fix 5 — Sliding Audio Window (Day 2)

**File:** `musetalk-worker.py`

```python
# Instead of encoding each chunk independently:
audio_buffer = deque(maxlen=16000 * 3)  # 3-second circular buffer

async def handle_audio(chunk: bytes):
    audio_buffer.extend(chunk)  # chunk is ~320 bytes at 16kHz/16bit
    full_window = np.concatenate(audio_buffer)
    audio_emb = whisper_model.encode(full_window)  # sliding window
    
    frames = []
    for pose_frame in pose_sequence.next_n(len(chunk) // 320):
        latent = vae_encode(self.reference_latent, pose_frame)
        inpainted = unet(latent, audio_emb, pose_frame)
        latent_smooth = lerp(prev_latent, inpainted, 0.7)  # Fix 2A
        output = vae_decode(latent_smooth)
        frames.append(jpeg_encode(output))
    return frames
```

Key: the 3-second window provides **stable Whisper context** across chunk boundaries. Without this, the audio embedding changes abruptly at each chunk edge → visible lip jump.

#### Fix 2A — Latent-Space Blending (Day 2)

**File:** `musetalk-worker.py` (inside inference loop, same as above)

```python
# Between VAE encode and decode:
latent_smooth = 0.7 * inpainted_latent + 0.3 * prev_latent
prev_latent = latent_smooth  # for next frame
```

This smooths jitter at the latent level before VAE decoding, producing a cleaner output than post-hoc pixel blending.

#### Fix 1 — GFPGAN Post-Process (Optional, If Testing Shows Blur)

**File:** `musetalk-worker.py`

```python
from gfpgan import GFPGANer
gfpgan = GFPGANer(model_path="GFPGANv1.4.pth", upscale=1)

# After VAE decode, before JPEG encode:
output = gfpgan.enhance(output, has_aligned=True)[1]
```

Only apply to the lower 1/3 of the face (mouth region crop) to save the ~8ms on the full frame.

#### Fix 4 — Teeth Sub-Region Loss (Fine-Tuning Only)

**File:** `muse_talk_train.py` (training config)

```python
# In the stage 2 adversarial finetuning loss:
mouth_mask = face_parsing.get_mouth_mask(pred_frame)  # 0-1 mask
teeth_region = (mouth_mask > 0) & (y_coord > 0.8 * mouth_bbox_height)
loss_weight = torch.where(teeth_region, 2.0, 1.0)
loss = (loss_weight * (mse_loss(pred, target) + perceptual_loss(pred, target))).mean()
```

### Phase 1 — MuseTalk Deployment (Weeks 3–4)

| Day | Task | Files |
|:---|---|:---:|
| 1 | Build `RunPod/Dockerfile` with pinned deps + healthcheck | `RunPod/Dockerfile`, `RunPod/healthcheck.py` |
| 1 | Write `musetalk-worker.py` — WebSocket server skeleton (load model, accept WS, `handle_audio`) | `RunPod/musetalk-worker.py` |
| 1 | Add Fix 2B (frame blending) to FloatingAvatar canvas loop | `components/avatar/FloatingAvatar.tsx` |
| 1 | Add Fix 3 (periodic reference reset) — 30s heartbeat + worker handler | `FloatingAvatar.tsx`, `musetalk-worker.py` |
| 2 | Add Fix 5 (3-second sliding audio window) to inference loop | `musetalk-worker.py` |
| 2 | Add Fix 2A (latent blending) to inference loop | `musetalk-worker.py` |
| 2 | Build `app/api/musetalk-proxy/route.ts` — CSP-safe WebSocket relay from browser to RunPod | `app/api/musetalk-proxy/route.ts` |
| 3 | Integrate `MuseTalkSurface` mode in FloatingAvatar — route TTS chunks through WS, paint returned JPEG frames | `FloatingAvatar.tsx`, `components/avatar/MuseTalkSurface.tsx` (new) |
| 3 | Fallback: if RunPod WS fails → static mp4 avatar + audio-only TTS | `FloatingAvatar.tsx` |
| 4 | Benchmark P50/P95/P99 end-to-end latency | `/scripts/latency-benchmark.ts` |
| 4 | Stress test: 5-minute continuous conversation, log frame drops / sync drift | `/scripts/stress-test.ts` |
| ⏸️ | Optional: Add GFPGAN post-process if blurriness above quality bar | `musetalk-worker.py` |

### Phase 2 — Custom Fine-Tuning (Optional, Future)

| Task | Effort | When |
|:---|---:|:---|
| Record 1–3 hours of tutor talking-head video (frontal, good lighting, clean audio) | 1 week | If generic MuseTalk quality insufficient |
| Fine-tune MuseTalk on RunPod A100 using `muse_talk_train.py` | ~2 days | After recording |
| Add Fix 4 (teeth sub-region loss weighting) to training config | ~1 day | During fine-tuning |
| Deploy fine-tuned weights to RunPod | 1 day | After fine-tuning |

### Why Not Train Wav2Lip From Scratch

| Aspect | Wav2Lip from scratch | MuseTalk off-the-shelf | MuseTalk fine-tuned |
|:---|---:|:---:|:---:|
| Time to working pipeline | 3–6 months | **2 weeks** | 3 weeks |
| Training data needed | 500+ hours (LRW-class quality) | 0 hours | 1–3 hours |
| License | Unrestricted (you trained it) | **MIT** ✅ | **MIT** ✅ |
| FPS | 60+ | 30+ | 30+ |
| Visual quality | Good (old UNet) | **Better** (latent UNet) | **Best** (custom identity) |
| Face identity preservation | Poor | Moderate | **High** (fine-tuned) |
| Teeth detail | Poor | Poor (fixable via Fix 4) | Good (with Fix 4) |

**Bottom line:** You'd spend 6+ months and thousands in GPU compute to get a model that performs *worse* than MuseTalk. If you want custom identity, fine-tune MuseTalk on 1–3 hours of your own data — that's a 3-week project.

### Cost Comparison

| Setup | Hardware | Monthly | FPS | License |
|:---|---:|---:|:---:|:---:|
| Wav2Lip (self-trained) | RunPod A10G | ~$360 | 60+ | Unrestricted |
| MuseTalk (off-shelf) | RunPod A10G | ~$360 | 30+ | MIT ✅ |
| ~~Wav2Lip (original CC BY-NC)~~ | ❌ | ❌ | ❌ | **❌ Blocked** |
| ~~HeyGen API~~ | ❌ | $360K+/mo | 30 | Vendor lock |
| MuseTalk + GFPGAN | RunPod A10G | ~$380 | 25+ | MIT ✅ |

---

## Production Readiness — Gap Analysis & Launch Checklist (2026-07-18)

**Analysis date:** 2026-07-18
**Status:** All gaps identified by reading the full codebase (components, API routes, lib, config, directory structure) and cross-referencing against the stated architecture.

### 🔴 CRITICAL BLOCKERS (Must Fix Before Launch)

| # | Gap | Why It's Blocking | Status |
|---|---|---|---|
| 1 | No RunPod pods deployed | You're still on OpenAI. vLLM is not deployed, Qwen 3.5 32B is not deployed, no pods exist | ❌ Not started |
| 2 | No MuseTalk worker code exists | `RunPod/` directory doesn't exist, no Dockerfile, no `musetalk-worker.py`, no WebSocket proxy route | ❌ Not started |
| 3 | TTS still on ElevenLabs | `app/api/elevenlabs-tts/` exists, but Kokoro hasn't replaced it yet. If ElevenLabs goes down or bans you, the avatar goes silent | ⚠️ Planned but not done |
| 4 | Persistence is broken (HIGHEST RISK) | Convex is fully disconnected from the app (no `convex/react` imports remain). TODOS says "local JSONL" but there's no persistence layer actually wired into the agent pipeline. Brain Agent can't track user progress at all | 🔴 Broken |
| 5 | Auth may be incomplete | `app/auth/` has only `verify-email`. Login and signup routes exist at top level but I don't see a real auth provider (Supabase? Clerk? NextAuth?). Need to verify this works end-to-end | ❓ Unknown |
| 6 | No fallback when RunPod is down | If your A10G pod crashes mid-session, the user gets a blank avatar. Static mp4 + audio TTS fallback is planned but not implemented | ❌ Not built |

### 🟡 HIGH PRIORITY (Week Before Launch)

| # | Gap | Why Important | Status |
|---|---|---|---|
| 7 | Whisper STT is browser-side, not pod-side | `use-whisper-mic.ts` and `whisper-pipeline.ts` run in-browser. TODOS says to move Whisper to Pod 1 for consistency. Browser Whisper works but is heavier on mobile | ⚠️ Mixed |
| 8 | No monitoring / observability | No logging pipeline, no error tracking (Sentry?), no latency dashboards, no pod healthchecks. You won't know why users are dropping off | ❌ Missing |
| 9 | Brain Agent system prompt not written | The diagnostic loop (Retrieve → Diagnose → Probe → Teach → Verify) is described in TODOS but the actual system prompt, tool definitions, and state machine aren't documented or coded | ❌ Missing |
| 10 | No barge-in handling | FloatingAvatar has VAD (voice activity detection) but interrupting the avatar mid-speech may or may not work — need to verify the audio queue can be flushed on barge-in | ❓ Untested |
| 11 | No rate limiting or abuse prevention | If this goes viral, one student can spam your RunPod pod and degrade everyone's experience. No IP-based throttling, no queue management | ❌ Missing |

### 🟢 NICE-TO-HAVE (Can Ship Without)

| # | Gap | Why Low Priority |
|---|---|---|
| 12 | Filler UI / loading states | Nice to have (skeleton loaders, page-flip sounds) but the app works without them — the user just sees a brief blank state |
| 13 | Curriculum sidebar polish | `app/curriculum/` exists, `components/Sidebar.tsx` exists — functional but may not have full mobile responsiveness |
| 14 | Analytics dashboard | `app/analytics/` and `analytics.png` exist — user progress tracking for the student, not needed for launch |
| 15 | Custom fine-tuning of MuseTalk | Off-the-shelf MuseTalk is good enough for launch. Fine-tuning adds visual polish but isn't required |
| 16 | Sound FX (ambient library, chimes) | Nice branding touch but adds no functional value |
| 17 | RunPod off-peak scheduling | Saves ~$150/mo but not needed to ship — run 3 pods 24/7 initially |

### What's Already Production-Ready ✅

Based on codebase inspection (2026-07-18):

| Component | Status | Notes |
|---|---|---|
| FloatingAvatar.tsx — core canvas, WS decode, paint pipeline | ✅ Built | Core rendering works |
| CleaChat.tsx — chat interface | ✅ Built | Functional |
| CleaLiveOrb.tsx — live indicator | ✅ Built | Functional |
| DashboardLayout.tsx — shell layout | ✅ Built | Functional |
| 11 API routes (clea-chat, curriculum, disease-reference, elevenlabs-tts, lipsync-test, lipsync-tts, quiz-data, strategy, tts-audio, whisper-transcribe) | ✅ Exist | Routes are written |
| use-whisper-mic.ts + whisper-pipeline.ts | ✅ Built | Browser Whisper pipeline works |
| app/curriculum/ + app/diseases/ | ✅ Structured | Curriculum pages exist |
| app/quiz/ + lib/qbank.ts | ✅ Built | Quiz system works |
| Jest config, `__tests__/`, `e2e/` | ✅ Exist | Test infra is in place |
| AvatarPicker, MobileNav, Sidebar, ConditionalProviders | ✅ Built | Component library exists |

### Launch Action Plan — Week-by-Week

#### Week 1: Foundation (Unblocks Everything)

| Day | Task | Depends On |
|:---|---:|:---:|
| 1 | **Fix persistence** — Pick a simple DB (Supabase free tier or Turso or working JSONL lib) and wire it into the Brain Agent so progress tracking works | None |
| 2 | **Verify auth** — Confirm login/signup/email-verify is fully working end-to-end (create test user, log in, see dashboard, log out) | None |
| 2 | **Deploy Pod 1** — RunPod with Llama 3.2 3B + Kokoro TTS (gets you off ElevenLabs) | RunPod account |
| 3 | **Deploy Pod 2** — RunPod with Qwen 3.5 32B Q4_K_M + vLLM + prefix caching for First Aid/Pathoma | Pod 1 deployed |

#### Week 2: Core Pipeline

| Day | Task | Depends On |
|:---|---:|:---:|
| 1 | **Route STT** — Connect browser Whisper to Pod 1 for consistency, or keep browser-based if mobile perf is acceptable | Pod 1 deployed |
| 2 | **Route LLM** — Switch from OpenAI/Deepseek API to Qwen 3.5 on Pod 2 | Pod 2 deployed |
| 3 | **Build the Brain Agent system prompt** — The diagnostic loop state machine, tool definitions (searchPubMed, searchExa), knowledge gap tracking | Persistence fixed |
| 4 | **Add pod fallback** — If any pod is unreachable, fall back to the static mp4 avatar + audio-only TTS (code exists, just needs wiring) | Pods 1+2 deployed |

#### Week 3: Lipsync + Polish

| Day | Task | Depends On |
|:---|---:|:---:|
| 1 | **Deploy MuseTalk on Pod 3** — Dockerfile + worker + WebSocket proxy + FloatingAvatar integration | Pods 1+2 deployed |
| 2 | **Add barge-in handling** — Flush the avatar audio/video queue when VAD detects user speech | MuseTalk deployed |
| 3 | **Add basic monitoring** — At minimum: RunPod pod healthcheck endpoint + a `console.error` hook that logs to a file or a free Sentry tier | Pods deployed |
| 4 | **Write a rate limiter** — Simple per-IP or per-session queue (even in-memory for Vercel edge) to prevent a single user from DoSing your pods | None |

#### Week 4: Launch Prep

| Day | Task | Depends On |
|:---|---:|:---:|
| 1 | **Stress test** — Run the 5-minute continuous conversation benchmark | All pods deployed |
| 2 | **Test auth edge cases** — Expired sessions, token refresh, concurrent tabs | Auth verified |
| 3 | **End-to-end dry run** — New user signup → login → first chat → quiz → persistence check → logout → login again → resume | All fixes applied |
| 4 | **Launch** 🚀 | All blockers resolved |

### The Biggest Hidden Risk

**The persistence gap is your #1 risk.** Your Brain Agent (the core tutor that diagnoses gaps and tracks progress) literally cannot work without a database. Everything the student learns, every gap identified, every quiz result — it all disappears on page refresh. You cannot launch a tutoring app without persistent state.

**Recommendation:** Pick the simplest possible fix:
- **Supabase** (free tier, PostgreSQL, auth built-in, easy Next.js integration) → 2 days to wire
- **Turso** (edge SQLite, free tier, trivial API) → 1 day
- **Even a flat JSONL file in `/tmp`** on a persistent VPS → 1 hour (but loses data on restart)

**Do not** try to fix Convex — you already removed it for good reasons. Pick a new DB and move forward.

---

## 🚀 V2 / Scale — Watch Feature Engineering

**What:** The `lib/watch-context.tsx` activity tracker is built (quiz tracking, agent status, Clea context injection, 19 passing tests). Below is the engineering roadmap to turn it from a quiz-only proof-of-concept into the proactivity engine that makes Clea feel like a real tutor.

**Classification:** All items here are **V2 / post-launch / scale work** — the current watch feature works and is sufficient for MVP launch.

### P1 — Expand to All Pages (Week 1 Post-Launch)

| Task | Effort | Detail |
|:---|---:|:---|
| Add `usePageWatch()` hook | 1 day | Self-contained hook each page calls on mount/mutation |
| Wire curriculum page → publishes week/day/block | 0.5 day | Reads from route params + curriculum context |
| Wire lecture/video player → publishes video ID, timestamp | 0.5 day | `activityType: 'watching'` with progress |
| Wire flashcard/review → publishes card count, correct rate | 0.5 day | `activityType: 'reviewing'` |
| Define full `ActivitySnapshot` union type | — | Already designed: `{ page, activityType, subject, system, resource?, progress?, engagement? }` |

### P1 — Make Clea Proactive (Week 1–2 Post-Launch)

| Task | Effort | Detail |
|:---|---:|:---|
| Build `WatchTrigger` event system | 1 day | When conditions met (2 wrong in a row, 30s idle) → Brain Agent receives trigger |
| Wire triggers into Brain Agent decision loop | 1 day | Agent decides: stay silent, offer help, change difficulty, suggest video |
| Add `subscribe_to_watch()` tool for Brain Agent | 0.5 day | Function that receives `ActivitySnapshot` updates in-system-prompt |
| Add trigger evaluation pass on every state change | 1 day | Evaluate conditions deterministically, not via LLM |
| Replace `buildWatchReply()` with trigger-based injection | 1 day | Current placeholder becomes a real inference pipeline |

### P2 — Engagement & Stuck Detection (Week 2–3)

| Task | Effort | Detail |
|:---|---:|:---|
| Build `useEngagementTracking()` hook | 1 day | Tracks: time on page, interaction density, wrong streaks, tab focus |
| Add idle timer per-question | 0.5 day | Per-question timer, resets on navigation |
| Add frustration heuristics | 0.5 day | 2+ wrong in a row on same subject, rapid back-to-back corrections |
| Wire stuck-detected → `setAgentStatus('thinking')` | 0.25 day | Clea offers help automatically |
| Add tab-blur detection (user alt-tabbed away) | 0.25 day | Pause engagement tracking when tab is not visible |

### P2 — Watch-Aware Navigation (Week 2)

| Task | Effort | Detail |
|:---|---:|:---|
| Persist `ActivitySnapshot` to sessionStorage | 0.5 day | Survives page navigation, not just in-memory state |
| Add `previousActivity` to context | 0.25 day | Clea can say: "You were on Cardiovascular quiz — picking it back up?" |
| Merge full snapshot into LLM context messages array | 0.25 day | Not just a one-line append, structured context |

### P3 — Dashboard Analytics Integration (Week 3–4)

| Task | Effort | Detail |
|:---|---:|:---|
| Build `useAnalytics()` collector hook | 1 day | Total study time / quiz accuracy / watch time per subject |
| Render study stats in `app/analytics/` | 1 day | Charts per subject, per day, accuracy trends |
| Surface most-requested help topics | 0.5 day | "You've asked about Cardiac Output 6 times" |
| Add weekly progress snapshot | 0.5 day | "This week: 4h studied, 85% quiz accuracy, 3 topics mastered" |

### P3 — Performance Refactor (Before Adding More Pages)

| Task | Effort | Detail |
|:---|---:|:---|
| Split `WatchProvider` into 3 contexts | 1 day | `WatchActivityContext` (changes freq), `WatchSettingsContext` (rare), `WatchStatusContext` (medium) |
| Memoize activity snapshot with `useMemo` | 0.25 day | Prevents unnecessary re-renders on every quiz answer |
| Benchmark render count before/after | 0.25 day | Confirm fix |

### P4 — Predictive Suggestions Engine (V2 Differentiator)

| Task | Effort | Detail |
|:---|---:|:---|
| Build suggestion inference from watch history | 1 week | Analyzes watch history → predicts next action |
| Wrong answer → suggest Pathoma video | — | `{ type: 'show_video', resource: 'Pathoma Ch.4' }` |
| Consecutive correct → suggest next subject | — | `{ type: 'next_subject', subject: 'Pulmonology' }` |
| Long idle on question → offer help | — | `{ type: 'offer_help', confidence: 0.8 }` |
| Wire suggestions into Clea's proactive messages | 1 day | Clea says "I think you're ready for Renal — want to try?" |

**Summary:** Current watch feature is ✅ MVP-ready (quiz tracking, context injection, tests). Above roadmap turns it into the observability layer that makes Clea a proactive tutor. None of this blocks launch — it's the V2 differentiator.

---

## Content Sourcing Strategy (2026-07-19)

**Decision:** Write original USMLE-style questions. Do not buy/copy existing banks (UWorld, Amboss, Kaplan) — copyright risk ($150K+ statutory damages per question). USMLE *format* and *style* aren't copyrightable, only specific text/images, so writing fresh vignettes from First Aid/Pathoma chapters is fully legal.

### Question Bank — Phased Build

| Phase | Qty | Source | Cost | Timeline |
|:---|---:|:---|:---|---:|
| **Phase 1 — Launch** | 200–300 | You + 1 med student writing from First Aid high-yield topics | ~$0 (you write) | Before launch |
| **Phase 2 — Scale** | +1,500 | 3–5 med students, 20 questions/week each, you review/edit/pay per approved question | ~$5–10/question | 6 months post-launch |

### Medical Images — Licensing Sources

| Priority | Source | What You Get | Cost | Coverage |
|:---|:---|:---|---:|---:|
| 🥇 | **Servier Medical Art** (`smart.servier.com`) | 3,000+ illustrations — anatomy, physiology, pathology, cells, organs | **Free** (CC BY 4.0, attribution only) | ~80% of needs |
| 🥇 | **Kenhub Image License** (`store.kenhub.com`) | Professional medical illustrations, labeled anatomy, clinical diagrams | ~$1–5/image or bulk packs (~$50/100) | ~15% — anatomy diagrams |
| 🥉 | **Medical Stock Images Company** | Clinical photos, radiology, histology | $10–50/image, buy per need | ~5% — clinical photos |
| ⚠️ | **AI-Generated** (Midjourney/DALL-E/Flux) | Custom illustrations, full ownership | ~$0.05/image | Needs expert review — anatomical inaccuracies risk |

**Attribution:** Single line in app footer or About page: *"Images from Servier Medical Art (CC BY 4.0) and Kenhub."*

**Design rule:** Use images only when the question requires visual diagnosis (rashes, EKGs, CT scans, histology). A well-written vignette carries most questions.

### Top Servier Medical Art Categories for Qbank

| Category | Example Images | Use In |
|:---|:---|---:|
| Anatomy — Organs | Heart, kidneys, lungs, brain (labeled) | Anatomy Qs, pathology vignettes |
| Anatomy — Systems | Cardiovascular, respiratory, GI tract diagrams | System-based questions |
| Cellular Biology | Cell structure, membrane transport, mitochondria | Physiology / biochemistry Qs |
| Pathology | Inflammation, atherosclerosis, tumor types | Pathology questions |
| Clinical | Hospital setting, patient examination, ECG setup | Clinical vignette illustrations |
| Microbiology | Bacteria, viruses, immune cells | Micro/immuno questions |
| Neurology | Brain regions, neuron, synapse, spinal cord | Neuro questions |
