"""Local TTS server: Piper (ONNX, CPU) over HTTP, streams mp3 bytes as synthesized.
Run: python3 scripts/local-piper-server.py  (port 8768)

A/B alternative to local-kokoro-server.py (:8767) — Piper measured ~5-10x
faster (352ms for a 4-sentence reply vs Kokoro's ~1900-3200ms) but flatter,
more robotic voice. Same streaming/ffmpeg pattern as the Kokoro server so it
drops into app/api/tts-audio/route.ts the same way if you want to swap.
"""
import asyncio
import queue
import re
import subprocess
import sys
import threading
import time

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from piper import PiperVoice

MODEL_PATH = "/tmp/piper_voices/en_US-lessac-medium.onnx"
SAMPLE_RATE = 22050  # lessac-medium's native rate

app = FastAPI()
_voice: PiperVoice | None = None


def get_voice() -> PiperVoice:
    global _voice
    if _voice is None:
        print(f"[local-piper] loading {MODEL_PATH}...", file=sys.stderr)
        _voice = PiperVoice.load(MODEL_PATH)
        print("[local-piper] ready", file=sys.stderr)
    return _voice


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


def _produce(clean: str, voice: PiperVoice, ffmpeg_stdin, t0: float, out_q: "queue.Queue"):
    """Piper's own synthesize() already chunks per-sentence internally — no
    split_sentences() needed like Kokoro required."""
    chunk_count = 0
    try:
        for chunk in voice.synthesize(clean):
            chunk_count += 1
            ffmpeg_stdin.write(chunk.audio_int16_bytes)
            ffmpeg_stdin.flush()
            print(
                f"[local-piper] chunk #{chunk_count} synthesized at +{1000*(time.monotonic() - t0):.0f}ms "
                f"({len(chunk.audio_int16_bytes)} pcm bytes)",
                file=sys.stderr,
            )
    except Exception as err:
        print(f"[local-piper] synth thread error: {err}", file=sys.stderr)
    finally:
        try:
            ffmpeg_stdin.close()
        except Exception:
            pass
        out_q.put(("synth_done", chunk_count))


def _read_ffmpeg_stdout(proc: subprocess.Popen, out_q: "queue.Queue"):
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
    voice = get_voice()

    proc = subprocess.Popen(
        ["ffmpeg", "-f", "s16le", "-ar", str(SAMPLE_RATE), "-ac", "1", "-i", "pipe:0",
         "-f", "wav", "pipe:1"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    out_q: queue.Queue = queue.Queue()
    threading.Thread(target=_produce, args=(clean, voice, proc.stdin, t0, out_q), daemon=True).start()
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
            f"[local-piper] synth_total={1000*((synth_done_at or t_done) - t0):.0f}ms "
            f"stream_total={1000*(t_done - t0):.0f}ms chars={len(clean)} wavbytes={total_bytes}",
            file=sys.stderr,
        )

    return StreamingResponse(gen(), media_type="audio/wav")


@app.get("/health")
async def health():
    return {"ok": True, "loaded": _voice is not None}


if __name__ == "__main__":
    import uvicorn

    get_voice()  # load at startup, not on first request
    uvicorn.run(app, host="localhost", port=8768)
