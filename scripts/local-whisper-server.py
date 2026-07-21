"""Local STT server: whisper.cpp (Metal GPU on Apple Silicon) via pywhispercpp.
Run: python3 scripts/local-whisper-server.py  (port 8766)

Swapped from faster-whisper/CTranslate2 — CTranslate2 has no MPS/Metal support
at all (device='mps' raises 'unsupported device'), so it was CPU-only and
heavily contention-sensitive (3-9.5s per utterance depending on what else was
running). whisper.cpp's ggml-metal backend actually offloads the encode step
to the GPU, ~2.5s and steadier under load.
"""
import subprocess
import sys
import time

import numpy as np
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from pywhispercpp.model import Model

MODEL_PATH = "/Users/kalinovdameus/Developer/clixen/models/ggml-medium.en.bin"

app = FastAPI()
model: Model | None = None


def get_model() -> Model:
    global model
    if model is None:
        print(f"[local-whisper] loading {MODEL_PATH} (whisper.cpp/Metal)...", file=sys.stderr)
        # sampling_strategy=0 is greedy (whisper.cpp's WHISPER_SAMPLING_GREEDY) —
        # matches the beam_size=1 setting the old faster-whisper server used.
        model = Model(MODEL_PATH, params_sampling_strategy=0, language="en", print_realtime=False, print_progress=False)
        print("[local-whisper] ready", file=sys.stderr)
    return model


def decode_to_pcm_f32(data: bytes) -> np.ndarray:
    """ffmpeg decodes whatever container the browser recorded (webm/mp4/etc)
    into raw 16kHz mono float32 PCM — the format whisper.cpp expects."""
    proc = subprocess.run(
        ["ffmpeg", "-i", "pipe:0", "-f", "f32le", "-ar", "16000", "-ac", "1", "pipe:1"],
        input=data,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg decode failed: {proc.stderr.decode()[-500:]}")
    return np.frombuffer(proc.stdout, dtype=np.float32)


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    t0 = time.monotonic()
    data = await audio.read()
    pcm = decode_to_pcm_f32(data)
    t_read = time.monotonic()
    m = get_model()
    segments = m.transcribe(pcm)
    text = "".join(seg.text for seg in segments).strip()
    t_done = time.monotonic()
    print(
        f"[local-whisper] decode={1000*(t_read - t0):.0f}ms infer={1000*(t_done - t_read):.0f}ms "
        f"total={1000*(t_done - t0):.0f}ms bytes={len(data)} text={text[:60]!r}",
        file=sys.stderr,
    )
    return JSONResponse({"text": text})


@app.get("/health")
async def health():
    return {"ok": True, "loaded": model is not None}


if __name__ == "__main__":
    import uvicorn

    get_model()  # load at startup, not on first request
    uvicorn.run(app, host="0.0.0.0", port=8766)
