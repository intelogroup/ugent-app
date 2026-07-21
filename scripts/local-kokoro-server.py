"""Local TTS server: Kokoro-82M over HTTP, streams mp3 bytes as they're synthesized.
Run: python3 scripts/local-kokoro-server.py  (port 8767)
"""
import asyncio
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


def get_pipeline() -> KPipeline:
    global _pipeline
    if _pipeline is None:
        print("[local-kokoro] loading pipeline...", file=sys.stderr)
        _pipeline = KPipeline(lang_code=LANG, repo_id="hexgrad/Kokoro-82M", device="mps")
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


def _produce(clean: str, pipeline: KPipeline, ffmpeg_stdin, t0: float, out_q: "queue.Queue"):
    """Feeds Kokoro PCM into ffmpeg stdin as it's synthesized."""
    chunk_count = 0
    try:
        # Serialize model access — concurrent pipeline() calls on MPS
        # race and produce garbled audio.
        with _synth_lock:
            for _, _, audio in pipeline(clean, voice=VOICE, speed=SPEED):
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
    """Runs in a worker thread: reads mp3 bytes off ffmpeg's stdout as they're
    encoded and pushes them onto the queue the async generator drains."""
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
    threading.Thread(target=_produce, args=(clean, pipeline, proc.stdin, t0, out_q), daemon=True).start()
    threading.Thread(target=_read_ffmpeg_stdout, args=(proc, out_q), daemon=True).start()

    async def gen():
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
            f"[local-kokoro] synth_total={1000*((synth_done_at or t_done) - t0):.0f}ms "
            f"stream_total={1000*(t_done - t0):.0f}ms chars={len(clean)} wavbytes={total_bytes}",
            file=sys.stderr,
        )

    return StreamingResponse(gen(), media_type="audio/wav")


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
        # Matches input shape post-removal of split_sentences: one continuous
        # paragraph with no newlines = single Kokoro pipeline chunk.
        warm_text = (
            "This is a warmup sentence for the tutor. It primes the synthesis kernels. "
            "The first real answer should now start quickly."
        )
        for _ in pipeline(warm_text, voice=VOICE, speed=SPEED):
            pass
        print(f"[local-kokoro] warmup done in {1000*(time.monotonic() - t0):.0f}ms", file=sys.stderr)
    except Exception as err:
        print(f"[local-kokoro] warmup failed (non-fatal): {err}", file=sys.stderr)


if __name__ == "__main__":
    import uvicorn

    warmup(get_pipeline())  # load AND compile kernels at startup, not on first request
    uvicorn.run(app, host="localhost", port=8767)
