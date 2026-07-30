# Clea Runtime (Execution Scheduler) — Design Document

> **Status: DESIGN ONLY.** This is an architecture document, not an implementation plan. No code should be written from this doc directly — it defines the contract, inputs/outputs, KPIs, and failure policy that a future implementation plan (`superpowers:writing-plans`) will be written against, task-by-task, once this design is reviewed and approved.

**Goal:** Define "Clea Runtime" — a per-turn scheduler that decides which of the app's expensive subsystems (RAG search, qbank/curriculum tools, quiz-attempt history, conversation memory mode, TTS voice, avatar state, ASR dictionary scope) actually need to run for a given voice/chat turn, replacing the current always-run-everything `Promise.all` in `app/api/clea-chat/route.ts`.

**Why now:** `app/api/clea-chat/route.ts:243-249` currently fires `quiz_attempts`, `curriculum_progress`, `loadChat`, `searchBooks` (embed + pgvector RPC), and `routeTopic` unconditionally on every single turn, whether or not the turn's content makes each one useful (e.g. `curriculum_progress` is irrelevant to "what causes clubbing?"). This is fine at today's traffic but is unconditional work, not scheduled work — Clea Runtime is the layer that makes that decision explicit, measurable, and safe to get wrong.

**Relationship to other Architecture v1 components:**
- **Medical ASR Normalizer** (`lib/asr-correct.ts`) sits upstream — its output is the "final transcript" input below.
- **Predictive Topic Router** (`lib/topic-router.ts`) is not replaced — `routeTopic()`'s output (`TopicRoute`) is one of Clea Runtime's *inputs*, not a competing scheduler. Runtime decides whether/when to call it and what to do with its result; `routeTopic` itself stays a pure classifier.
- **Speculative Retrieval** is downstream of Runtime — Runtime's `ExecutionPlan.speculative` field is the trigger; the retrieval mechanics (embed+pgvector via `searchBooks` in `lib/clea-tools.ts`) are unchanged.
- **Persistent Avatar State** and **Tutor LLM** are output/consumer surfaces — Runtime's plan for `avatar_state`/`tts_voice` is read by `FloatingAvatar.tsx`; the Tutor LLM (`streamText`/`generateText` calls in `app/api/clea-chat/route.ts`) receives a pre-narrowed tool set and grounding block instead of deciding retrieval itself.

## Two Time Domains

**Scheduler A — partial-transcript, no LLM, ~200ms tick.**
Runs client-side while the user is still speaking, fed by `useWhisperMic`'s in-progress partial transcript. Purely a cache-warmer: does *not* produce an `ExecutionPlan` and does *not* gate anything. Its only effect is calling `routeTopic()`-shaped lookups speculatively so the index/embedding for a likely topic is warm by the time ASR finalizes. If wrong, the only cost is a wasted lookup — never a wrong answer, since Scheduler B still runs the real decision afterward.

**Scheduler B — final-transcript, one `ExecutionPlan` per turn.**
Runs once ASR finalizes (server-side, in `app/api/clea-chat/route.ts`, before today's `Promise.all` block). Produces the `ExecutionPlan` contract below. May be a small heuristic classifier to start (reusing `lib/topic-router.ts`'s deterministic index-and-vote approach) with a 1–3B model swap-in as a later, separate decision — this doc does not commit to either implementation, only the contract they must satisfy.

This doc's contract, KPI, and failure-policy sections apply to **Scheduler B**. Scheduler A has no contract because it produces no decisions — it is pure cache-warming and is out of scope for correctness review.

---

## 1. Scheduler API / Contract

```ts
// lib/clea-runtime/types.ts (proposed location — not created by this doc)

type ResourceDecision =
  | 'skip'       // don't run this turn
  | 'run'        // run synchronously, block the Tutor LLM call on it
  | 'speculative'; // run in parallel, don't block — Tutor proceeds without it,
                    // result is attached if it lands before generation finishes,
                    // discarded otherwise (never retro-injected mid-stream)

interface ExecutionPlan {
  // Monotonic id for this turn's plan — used to correlate metrics
  // (see KPI section) and for cancellation of stale speculative work
  // when a barge-in produces a new plan before the old one's work lands.
  planId: string;

  // What produced this plan and how confident it is. `confidence` drives
  // the failure-policy fallback threshold (section 5) — anything below
  // FALLBACK_THRESHOLD must be treated as `heuristic` regardless of
  // what produced it.
  source: 'heuristic' | 'small-model';
  confidence: number; // 0..1

  // Per-resource decisions. Every key must be present — a scheduler that
  // omits a key is a bug, not an implicit 'skip'. New resources added to
  // the app must be added here before Runtime can gate them; there is no
  // default-skip behavior for unlisted resources by design (silent
  // starvation of a new feature is worse than a missed optimization).
  resources: {
    book_search: ResourceDecision;      // searchBooks() — RAG over Pathoma/First Aid
    qbank: ResourceDecision;            // queryQbank tool availability
    curriculum: ResourceDecision;       // queryCurriculum tool availability
    quiz_attempts: ResourceDecision;    // quiz_attempts Supabase read
    curriculum_progress: ResourceDecision; // curriculum_progress Supabase read
  };

  // Non-tool outputs — see section 3. These are always decided (no
  // 'skip'/'run'/'speculative' enum — see per-field types below).
  memory_mode: 'full' | 'summary_only';
  dictionary_scope: string[] | 'all';   // e.g. ['microbiology', 'cardiology'] or 'all'
  tts_voice: string;                    // voice id, passed through to /api/tts-audio
  avatar_state: 'wake' | 'idle';
  diagram_preload: string[];            // diagram/asset ids to warm, [] if none

  // Which resources this plan intentionally left out and why — required
  // whenever a resource above is 'skip', used for the missed_prefetches /
  // scheduler_recall KPIs (section 4). Empty array only if resources has
  // no 'skip' entries.
  skipped: Array<{ resource: string; reason: string }>;

  // Wall-clock budget for every 'speculative' entry above. A speculative
  // task still running past this deadline is cancelled, not awaited —
  // see failure policy section 5.
  speculativeTimeoutMs: number;
}
```

Notes on the contract, not the implementation:
- `resources` is deliberately flat (one key per existing tool/read), not a nested tree — it must stay a 1:1 mirror of the actual fetches in `app/api/clea-chat/route.ts:243-249` so a reviewer can diff the plan against the code path it's replacing.
- `ResourceDecision` has exactly 3 values on purpose. A 4th state ("run but low priority") was considered and rejected — priority-without-parallelism-or-skip is not a decision Runtime can act on differently from `run`, so it would be dead vocabulary in the contract.
- `speculativeTimeoutMs` is a single scalar, not per-resource, deliberately — per-resource timeouts is a real future need (book search and qbank have very different latency profiles) but this doc's job is the minimal contract that lets Runtime exist at all; split it only when a KPI (section 4) shows one timeout value is actually costing wasted work on a specific resource.

---

## 2. Inputs

Scheduler B consumes, per turn:

| Input | Source | Shape |
|---|---|---|
| Final transcript | Output of `stripTranscriptNoise` + `correctText` (`lib/asr-correct.ts`) | `string` |
| Partial transcript (last seen) | `useWhisperMic`'s in-progress buffer, passed through if Scheduler A already ran | `string \| null` |
| Topic route | `routeTopic(finalTranscript)` (`lib/topic-router.ts`) | `TopicRoute = { system: string \| null; confidence: 'phrase' \| 'fuzzy' \| 'token' \| 'none' }` |
| ASR confidence | Not currently emitted by `app/api/whisper-transcribe/route.ts` — **gap**, see below | `number \| null` until emitted |
| Conversation mode | `activity?.questionText` presence (today's `quizFire`/vignette branch in `app/api/clea-chat/route.ts:303`) | `'quiz' \| 'chat'` |
| User mastery / history | `attempts: QuizAttempt[]` (already loaded from `quiz_attempts`) | existing `QuizAttempt[]` shape |
| Network latency | Not currently measured client-side — **gap** | `number \| null` until measured |
| Device capability | `hasWebGpu` already computed in `lib/clea-agent-context.tsx:146` | `boolean` |

**Known gap, flagged not solved:** ASR confidence and network latency are not currently emitted anywhere in the pipeline. This doc lists them as inputs because the user's proposal named them, but Scheduler B's first implementation should treat both as `null`/absent and degrade to the other inputs — do not block this design on adding new instrumentation. If they prove necessary after KPI data comes in (section 4), that's a follow-up task, not a blocker for v1.

---

## 3. Outputs

Beyond the `resources` tool-gating map in the contract, Runtime's decision surface extends to:

- **`memory_mode`** — `'full'` uses today's token-budget windowed history (`app/api/clea-chat/route.ts`'s `updateSummary`); `'summary_only'` skips loading the windowed tail entirely and answers from the rolling summary alone. Intended for turns Runtime is confident are simple/self-contained (e.g. a one-off factual question with no vignette in play).
- **`dictionary_scope`** — narrows `lib/asr-correct.ts`'s correction dictionary to a specialty subset (e.g. only microbiology terms) when `routeTopic` is confident, reducing false-positive corrections from unrelated-specialty dictionary entries. Requires `lib/asr-dictionary.json` to carry a specialty tag per entry — **not currently present**, flagged as a prerequisite for this output to be anything other than `'all'`.
- **`tts_voice`** — passed through to `/api/tts-audio`'s request body (today hardcoded to one ElevenLabs voice id in `app/api/tts-audio/route.ts:122`). Requires that route to accept a voice parameter — not currently accepted, flagged as a prerequisite.
- **`avatar_state`** — `'wake'` vs `'idle'`, read by `FloatingAvatar.tsx`. Requires `FloatingAvatar.tsx` to expose a controlled prop or context value for this — currently avatar wake state is implicit (tied to `isSpeaking`/`micActive` in `lib/clea-agent-context.tsx`), flagged as a prerequisite.
- **`diagram_preload`** — asset ids to warm client-side. No diagram/asset cache currently exists in the codebase — flagged as a prerequisite, not something this design assumes already exists.

Every prerequisite flagged above is a **non-goal of this document** — Clea Runtime's contract is written to accommodate them so the `ExecutionPlan` shape doesn't need to change when they land, but this design does not implement or require them. A first implementation of Scheduler B can ship with `dictionary_scope: 'all'`, `tts_voice` fixed to today's one voice, `avatar_state` always `'wake'` while `micActive`, and `diagram_preload: []` — i.e. those four outputs default to today's actual behavior, contributing zero regression risk, while `resources` and `memory_mode` are where the real optimization work happens first.

---

## 4. Metrics / KPIs

Every `ExecutionPlan` must be logged with enough data to compute these after the fact — this section defines the KPIs, not a dashboard or storage schema (that's an implementation task).

| KPI | Definition | Computed from |
|---|---|---|
| Scheduler precision | Of resources marked `run`/`speculative`, fraction whose result was actually used by the Tutor LLM's reply (tool called, or grounding block non-empty and referenced) | Compare plan's `resources` against which tools the model actually invoked + whether `searchBooks` grounding was non-empty |
| Scheduler recall | Of resources marked `skip`, fraction where the Tutor LLM's reply indicates it needed that resource (e.g. model says "I don't have access to your progress" when `curriculum_progress` was skipped) | Requires a downstream signal — flagged as needing a lightweight reply-side heuristic, not defined further here |
| Wasted speculative work | Count of `speculative` resources whose result was never attached to the reply (timed out, or landed but plan superseded by barge-in) | `speculativeTimeoutMs` cancellations + superseded `planId`s |
| Latency saved | Wall-clock delta between today's unconditional `Promise.all` and the plan's actual critical path (skip/speculative resources removed from the blocking path) | Per-turn timing, same `timed()` pattern already used in `app/api/clea-chat/route.ts:239-241` |
| Added token cost | Extra tokens spent if Scheduler B uses a small model (`source: 'small-model'`) vs. `source: 'heuristic'` (~0 added cost) | Small-model call's own token usage, if/when that path is built |
| Cache hit rate | Fraction of Scheduler B's `run`/`speculative` resources whose result was already warm from Scheduler A's speculative cache-warming | Compare plan-issue-time cache state against a warm/cold flag per resource |
| Wrong-prediction rate | `1 - precision`, tracked separately because a false-skip (recall miss) and a false-run (precision miss) have different costs — false-skip risks a visibly worse reply, false-run only wastes compute | Derived from precision/recall above |

**No dashboard or storage schema is specified here** — that's implementation-phase work. This section exists so the first implementation plan can include "emit these fields" as a concrete, reviewable task rather than an open-ended "add logging" step.

---

## 5. Failure Policy

Non-negotiable constraints — any implementation plan for Clea Runtime must satisfy every rule below, and any task that can't demonstrate it satisfies them is not ready to ship:

1. **Confidence floor → full fallback.** If `ExecutionPlan.confidence < FALLBACK_THRESHOLD` (exact value TBD by the implementation plan, not this doc — start conservative), Runtime must produce the plan equivalent to today's behavior: every `resources` key `'run'`, `memory_mode: 'full'`, all other outputs at their default/current values. This is not "skip fewer things" — it is byte-for-byte today's `Promise.all` path, so a low-confidence turn is provably no worse than pre-Runtime behavior.
2. **Never block the Tutor LLM on speculative work.** Anything marked `'speculative'` in the plan must not be `await`-ed on the Tutor's generation critical path. If it hasn't resolved by the time the model needs it, the model proceeds without it — same as if it had been marked `'skip'`.
3. **Cancel superseded speculative work.** A new `ExecutionPlan` (new `planId`) — e.g. from a barge-in producing a new turn before the previous turn's speculative work resolved — must cancel/abandon the previous plan's in-flight speculative tasks. No result from a superseded `planId` may be attached to the new turn's reply.
4. **Time-box every speculative task.** Every `'speculative'` resource is bound by `speculativeTimeoutMs`; a task that exceeds it is treated identically to a `'skip'` for that turn (counted in "wasted speculative work," section 4), not retried, not extended.
5. **`run` decisions are still on the hook for today's existing error handling.** Marking a resource `'run'` doesn't change what happens if that resource's own fetch fails — `searchTextFile`'s existing embed-failure→word-overlap fallback (`lib/clea-tools.ts:110-121`) and `updateSummary`'s existing no-op-on-empty-transcript guard stay exactly as they are. Runtime decides *whether* to run something, never *how* that something handles its own failures.

---

## Open Questions For Review (not blockers, but flagged)

- Where does the `FALLBACK_THRESHOLD` confidence cutoff get its initial value — arbitrary conservative default, or derived from `lib/topic-router.ts`'s existing eval harness (`scripts/eval-topic-router.ts`)? Recommend reusing that harness's methodology rather than inventing a second one.
- Scheduler B's `source: 'small-model'` path (1–3B model) is named as an option in this doc but not committed to — the first implementation should almost certainly ship `source: 'heuristic'` only (reusing `lib/topic-router.ts`'s deterministic approach extended to the other resource keys) and treat the small-model swap as a distinct, later decision once heuristic-only KPI data exists to justify the added latency/cost.
- `dictionary_scope`, `tts_voice`, `avatar_state`, `diagram_preload` all have unmet prerequisites (section 3). Recommend the first implementation plan explicitly scope those four outputs out (fixed to today's defaults) and title itself "Clea Runtime v1: resource gating + memory mode only," leaving the rest for v2 once their prerequisites exist.
