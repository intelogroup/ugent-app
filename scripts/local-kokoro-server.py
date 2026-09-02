"""Local TTS server: Kokoro-82M over HTTP, streams WAV (16-bit PCM, 24kHz mono)
as it's synthesized. Never mp3 — the browser forwards these bytes straight to
Wav2Lip's /lipsync-stream, which wants raw int16 PCM, so a compressed format
would have to be decoded client-side first.
Run: python3 scripts/local-kokoro-server.py  (port 8767)
"""
from __future__ import annotations

import asyncio
import os
import queue
import re
import subprocess
import sys
import threading
import time

import numpy as np
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from kokoro import KPipeline

VOICE = "af_heart"
SPEED = 1.0
LANG = "a"  # a=American, b=British
SAMPLE_RATE = 24000


app = FastAPI()
_pipeline: KPipeline | None = None
# ponytail: global lock serializes MPS inference — PyTorch MPS is not
# thread-safe. Per-request model copies if throughput ever matters.
_synth_lock = threading.Lock()

# Generation counter: the client aborts and re-fires /tts on every text tick
# while the LLM streams, but AbortController only closes the connection — the
# server kept synthesizing the abandoned text to completion while holding
# _synth_lock, so the reply the user is actually waiting on queued behind it.
# Measured: a live 148-char reply waited 39s behind the same 708-char prefetch
# synthesized twice. Newest request wins; superseded ones bail at the next
# segment boundary (mid-segment is not interruptible — pipeline() is one call).
_generation = 0
_gen_lock = threading.Lock()


def _next_generation() -> int:
    global _generation
    with _gen_lock:
        _generation += 1
        return _generation


def _is_current(gen: int) -> bool:
    with _gen_lock:
        return gen == _generation


def get_pipeline() -> KPipeline:
    global _pipeline
    if _pipeline is None:
        print("[local-kokoro] loading pipeline...", file=sys.stderr)
        # kokoro 0.7.x dropped the `repo_id` kwarg — KModel.REPO_ID already
        # defaults to hexgrad/Kokoro-82M, so plain construction is enough.
        _pipeline = KPipeline(lang_code=LANG, model=True, device="cpu")
        print("[local-kokoro] ready", file=sys.stderr)
    return _pipeline


def strip_markdown(text: str) -> str:
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'^#+\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\|.*?\|', '', text, flags=re.MULTILINE)
    text = re.sub(r'^[-*+]\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)
    return text.strip()


class TTSRequest(BaseModel):
    text: str


def trim_silence(audio: np.ndarray, threshold: float = 0.003) -> np.ndarray:
    loud = np.where(np.abs(audio) > threshold)[0]
    if len(loud) == 0:
        return audio
    margin = int(SAMPLE_RATE * 0.03)
    start = max(loud[0] - margin, 0)
    end = min(loud[-1] + 1 + margin, len(audio))
    return audio[start:end]


MIN_SEGMENT_CHARS = 25


def split_segments(text: str) -> list[str]:
    """Kokoro's pipeline() yields ONE chunk for a typical short reply, so audio
    can't start until the whole thing is synthesized — measured 810ms for one
    sentence and 1584ms for three, with first-byte == last-byte every time.
    Feeding it a sentence at a time makes first audio cost one sentence
    instead of the full reply. Fragments shorter than MIN_SEGMENT_CHARS get
    glued onto the next one: a bare "Right." synthesized alone sounds clipped,
    and it saves nothing anyway.
    ponytail: regex on sentence punctuation, not a real sentence tokenizer —
    swap in one only if abbreviations start splitting mid-sentence.
    """
    # KOKORO_SPLIT=0 restores the old whole-reply behaviour — kept so the
    # latency claim above stays A/B-testable without editing code.
    if os.environ.get("KOKORO_SPLIT") == "0":
        return [text]
    parts = re.split(r'(?<=[.!?])\s+', text)
    segments: list[str] = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if segments and len(segments[-1]) < MIN_SEGMENT_CHARS:
            segments[-1] = f"{segments[-1]} {part}"
        else:
            segments.append(part)
    return segments or [text]


def _produce(clean: str, pipeline: KPipeline, ffmpeg_stdin, t0: float, out_q: "queue.Queue", gen: int):
    """Feeds Kokoro PCM into ffmpeg stdin as it's synthesized, one sentence at
    a time so playback can start before the full reply is done. Bails as soon
    as a newer /tts request has superseded this one."""
    chunk_count = 0
    try:
        # Cheapest check: superseded while queued for the lock, before paying
        # for any inference at all.
        if not _is_current(gen):
            print(f"[local-kokoro] gen {gen} superseded before synth", file=sys.stderr)
            return
        # Serialize model access — concurrent pipeline() calls on MPS
        # race and produce garbled audio.
        with _synth_lock:
            # trim_silence strips each segment's own tail, so per-sentence
            # synthesis would otherwise run the reply together with no breath.
            gap = np.zeros(int(SAMPLE_RATE * 0.12), dtype=np.int16).tobytes()
            for seg_index, segment in enumerate(split_segments(clean)):
                if not _is_current(gen):
                    print(
                        f"[local-kokoro] gen {gen} superseded at segment {seg_index}, "
                        f"releasing lock at +{1000*(time.monotonic() - t0):.0f}ms",
                        file=sys.stderr,
                    )
                    return
                if seg_index > 0:
                    ffmpeg_stdin.write(gap)
                for _, _, audio in pipeline(segment, voice=VOICE, speed=SPEED):
                    chunk_count += 1
                    if hasattr(audio, "detach"):
                        audio = audio.detach().cpu().numpy()
                    audio = trim_silence(audio)
                    pcm = (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16).tobytes()
                    ffmpeg_stdin.write(pcm)
                    ffmpeg_stdin.flush()
                    print(
                        f"[local-kokoro] chunk #{chunk_count} synthesized at +{1000*(time.monotonic() - t0):.0f}ms "
                        f"({len(pcm)} pcm bytes)",
                        file=sys.stderr,
                    )
    except Exception as err:
        print(f"[local-kokoro] synth thread error: {err}", file=sys.stderr)
    finally:
        try:
            ffmpeg_stdin.close()
        except Exception:
            pass
        out_q.put(("synth_done", chunk_count))


def _read_ffmpeg_stdout(proc: subprocess.Popen, out_q: "queue.Queue"):
    """Runs in a worker thread: reads WAV bytes off ffmpeg's stdout as they're
    muxed and pushes them onto the queue the async generator drains."""
    try:
        while True:
            data = proc.stdout.read(4096)
            if not data:
                break
            out_q.put(("data", data))
    finally:
        proc.stdout.close()
        proc.wait()
        out_q.put(("eof", None))


@app.post("/tts")
async def tts(req: TTSRequest):
    t0 = time.monotonic()
    gen = _next_generation()
    clean = strip_markdown(req.text)
    if not clean:
        return StreamingResponse(iter(()), media_type="audio/wav")
    pipeline = get_pipeline()

    proc = subprocess.Popen(
        ["ffmpeg", "-f", "s16le", "-ar", str(SAMPLE_RATE), "-ac", "1", "-i", "pipe:0",
         "-f", "wav", "pipe:1"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    out_q: queue.Queue = queue.Queue()
    threading.Thread(target=_produce, args=(clean, pipeline, proc.stdin, t0, out_q, gen), daemon=True).start()
    threading.Thread(target=_read_ffmpeg_stdout, args=(proc, out_q), daemon=True).start()

    # Not named `gen` — that's the generation int this closure logs.
    async def stream_wav():
        loop = asyncio.get_event_loop()
        total_bytes = 0
        synth_done_at = None
        while True:
            kind, payload = await loop.run_in_executor(None, out_q.get)
            if kind == "data":
                total_bytes += len(payload)
                yield payload
            elif kind == "synth_done":
                synth_done_at = time.monotonic()
            elif kind == "eof":
                break
        t_done = time.monotonic()
        print(
            f"[local-kokoro] gen={gen}{'' if _is_current(gen) else ' SUPERSEDED'} "
            f"synth_total={1000*((synth_done_at or t_done) - t0):.0f}ms "
            f"stream_total={1000*(t_done - t0):.0f}ms chars={len(clean)} wavbytes={total_bytes}",
            file=sys.stderr,
        )

    return StreamingResponse(stream_wav(), media_type="audio/wav")


@app.get("/health")
async def health():
    return {"ok": True, "loaded": _pipeline is not None}


def warmup(pipeline: KPipeline) -> None:
    """Loading weights isn't enough — the first real inference pays a one-time
    torch/Metal kernel-compile cost (~1.3s). Run a throwaway synth at startup
    so the first user request is already warm, same intent as pre-loading the
    Whisper model before serving."""
    try:
        t0 = time.monotonic()
        # Matches the real request shape: split_segments feeds Kokoro one
        # sentence at a time, so warm the kernels on a single sentence.
        warm_text = (
            "This is a warmup sentence for the tutor. It primes the synthesis kernels. "
            "The first real answer should now start quickly."
        )
        for _ in pipeline(warm_text, voice=VOICE, speed=SPEED):
            pass
        print(f"[local-kokoro] warmup done in {1000*(time.monotonic() - t0):.0f}ms", file=sys.stderr)
    except Exception as err:
        print(f"[local-kokoro] warmup failed (non-fatal): {err}", file=sys.stderr)


def _selfcheck() -> None:
    # The KOKORO_SPLIT=0 escape hatch would otherwise fail every case here.
    disabled = os.environ.pop("KOKORO_SPLIT", None)
    try:
        _assert_splits()
        _assert_generations()
    finally:
        if disabled is not None:
            os.environ["KOKORO_SPLIT"] = disabled


def _assert_splits() -> None:
    assert split_segments(
        "The murmur is harsh and loud. Now think about where the blood goes."
    ) == [
        "The murmur is harsh and loud.",
        "Now think about where the blood goes.",
    ]
    # Short fragment glues forward instead of becoming its own clipped clip.
    assert split_segments("Right. The blood shunts right to left and skips the lungs.") == [
        "Right. The blood shunts right to left and skips the lungs."
    ]
    assert split_segments("no punctuation at all") == ["no punctuation at all"]
    assert split_segments("") == [""]


def _assert_generations() -> None:
    global _generation
    before = _generation
    a = _next_generation()
    assert _is_current(a), "newest generation must be current"
    b = _next_generation()
    assert not _is_current(a), "older generation must be superseded"
    assert _is_current(b)
    _generation = before


if __name__ == "__main__":
    import uvicorn

    _selfcheck()

    warmup(get_pipeline())  # load AND compile kernels at startup, not on first request
    uvicorn.run(app, host="localhost", port=8767)
