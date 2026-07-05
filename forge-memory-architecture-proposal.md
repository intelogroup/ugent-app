# RFC: Replace batch-distill with session-aware memory architecture

## The Problem

Forge's current distillation system uses a periodic batch process: take N random events, ask the LLM "any patterns?", repeat every 10 minutes. After a real-world session producing 5,590 events, 15 principles were extracted -- a 0.3% yield. The events themselves are detailed tool-use traces from rich problem-solving sessions (one session has 694 events including prompts, tool calls, and stops). The issue is not a lack of signal -- it's that the extraction method cannot reconstruct narrative.

## Observed Behaviors

1. **Batch distillation finds nothing** -- 50-event random slices rarely contain 3+ related events. Sessions span 100-700 events but batches break them apart.
2. **Session narrative is lost** -- `UserPromptSubmit` + `PostToolUse` + `Stop` form a dialogue but batch distillation never sees the full arc.
3. **No cross-session synthesis** -- If session A "tried React Router v7" and session B "rolled back to v6," no mechanism connects them.
4. **Principles are the only output** -- There is no episodic memory layer. You get a flat list of "facts" but cannot ask "what did we do about X last time?"

## Proposed Architecture

### Layer 1: Session Reconstruction (replaces batch distill)

Instead of periodic N-event batches, on `SessionEnd`:

1. **Session summary** -- The LLM reads the full session transcript and produces:
   - Goal (1 sentence)
   - What was attempted
   - What worked / what didn't
   - Key decisions with rationale
   - Surprises or hard-won lessons

2. **Session embedding** -- The summary is embedded for semantic retrieval.

3. **Event compression** -- Raw events can be pruned or archived after summarization.

Storage: `session_summaries` table with session_id, goal, summary, decisions[], timestamp, embedding.

### Layer 2: Episodic Retrieval (replaces `forge search`)

On new session start (or periodically):

1. **Query construction** -- Agent's `cwd`, recent branches, and last N principles form a probe.
2. **Hybrid search** -- Semantic (embeddings) + keyword (FTS) across session summaries and principles.
3. **Context injection** -- Top-3 relevant sessions + top-5 principles injected into agent prompt (as CLAUDE.md context or MCP tool).

This means every session starts informed by what happened before -- the core promise of "memory for agents."

### Layer 3: Cross-Session Synthesis (periodic, replaces current distill)

Every N sessions (configurable, default 5):

1. **Pattern mining** -- LLM reads the last N session summaries looking for:
   - Recurring failure modes
   - Tool preferences or workflows
   - Project-level progress
   - Knowledge gaps

2. **Principle extraction** -- Generate or update principles from patterns (this replaces today's distill).

3. **Pruning** -- Archive low-value sessions, merge duplicate principles.

### Storage Model

```
principles (current table -- unchanged)
  id, content, source_session_id, created_at, updated_at, access_count

session_summaries (new)
  id, session_id, goal, summary, decisions (json), surprises (json), tool_summary, 
  embedding (vector), created_at, last_accessed_at

cross_session_patterns (new)
  id, pattern, evidence_session_ids[], confidence, created_at, updated_at
```

## Why This Matters

The key insight: **forgetfulness is as important as memory**. A flat pile of 5,590 events is noise. A stack of 12 session summaries, 5 cross-session patterns, and 15 principles is a working memory. The architecture should mirror how cognition works: episodic detail at the session layer, semantic extraction at the principle layer, and a retrieval mechanism that brings relevant past context forward automatically.

This also solves a practical pain point: right now, if distillation breaks for 9 days (as it did for us due to a config issue), the backlog is unrecoverable -- 5,500 events fail to yield anything because batch randomness can't reconstruct narrative after the fact. Session-level summarization would have captured those 694-event sessions immediately.

## Prior Art

- [Engram](https://github.com/foramoment/engram-ai-memory) -- cognitive memory with FoA (Focus of Attention), sleep consolidation, decay, and pruning
- [Claude-Mem](https://github.com/lagosito/claude-mem) -- per-session compression with cross-session injection
- MemGPT/Letta -- virtual context management with archival/working memory tiers

## Questions for Discussion

1. Should session summarization be agent-driven (via MCP tool) or daemon-driven (on SessionEnd)?
2. What embedding store? SQLite + BGE-M3 (local) vs. external provider?
3. Should the context injection be implicit (env var / CLAUDE.md rewrite) or explicit (MCP tool the agent calls)?
