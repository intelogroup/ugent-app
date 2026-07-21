import sys
import re
import os
import time
import subprocess
import threading
import queue
import warnings

# Suppress PyTorch and third-party UserWarnings (e.g. istft shape/deprecation warnings)
warnings.filterwarnings("ignore", category=UserWarning)

import numpy as np
from kokoro import KPipeline

PID_FILE = "/tmp/tts_stream_play.pid"

if len(sys.argv) < 4:
    print("Usage: python tts_stream_play.py <lang> <voice> <text_file_path>")
    sys.exit(1)

lang = sys.argv[1]
voice = sys.argv[2]
text_file = sys.argv[3]

with open(text_file, 'r', encoding='utf-8') as f:
    text = f.read()

# Write main PID to file for easy process control
with open(PID_FILE, 'w') as f:
    f.write(str(os.getpid()))

def normalize_medical_text(text_str, lang_code):
    if lang_code.startswith('f'): # French
        text_str = re.sub(r'\b([A-Za-z])\.(?=[A-Za-z]\b|\.)', r'\1-', text_str)
        text_str = re.sub(r'-([A-Za-z])\.', r'-\1', text_str)
        acronyms = {
            r'\bSIADH\b': 'S-I-A-D-H',
            r'\bVEGF\b': 'V-E-G-F',
            r'\bHLA\b': 'H-L-A',
            r'\bAChE\b': 'A-C-H-E',
            r'\bSNC\b': 'S-N-C',
            r'\bSNP\b': 'S-N-P',
            r'\bCSF\b': 'C-S-F',
            r'\bLCR\b': 'L-C-R',
            r'\bALS\b': 'A-L-S',
            r'\bSLA\b': 'S-L-A',
            r'\bSJS\b': 'S-J-S',
            r'\bCOMT\b': 'C-O-M-T',
            r'\bMAO\b': 'M-A-O',
            r'\bHPV\b': 'H-P-V',
            r'\bRB1\b': 'R-B-1',
            r'\bCRAO\b': 'C-R-A-O',
            r'\bOVCR\b': 'O-V-C-R',
            r'\bOACR\b': 'O-A-C-R',
            r'\bRVO\b': 'R-V-O',
            r'\bROP\b': 'R-O-P',
            r'\bEKG\b': 'E-K-G',
            r'\bECG\b': 'E-C-G',
            r'\bMRI\b': 'M-R-I',
            r'\bIRM\b': 'I-R-M',
            r'\bNF1\b': 'N-F-1',
            r'\bNF2\b': 'N-F-2',
            r'\bVHL\b': 'V-H-L',
            r'\bTSC\b': 'T-S-C',
            r'\bAV\b': 'A-V',
            r'\bDMLA\b': 'D-M-L-A',
            r'\bAMD\b': 'A-M-D',
            r'\bPIO\b': 'P-I-O',
        }
        for pattern, replacement in acronyms.items():
            text_str = re.sub(pattern, replacement, text_str, flags=re.IGNORECASE)
    return text_str

text = normalize_medical_text(text, lang)

print("Initializing KPipeline on MPS...", flush=True)
pipeline = KPipeline(lang_code=lang, device='mps')

chunk_queue = queue.Queue()
generation_finished = False

def generate_chunks():
    global generation_finished
    generator = pipeline(text, voice=voice, speed=1.0, split_pattern=r'\n+')
    for gs, ps, audio in generator:
        if audio is not None:
            audio_np = audio.detach().cpu().numpy() if hasattr(audio, 'numpy') else audio
            pcm = (np.clip(audio_np, -1.0, 1.0) * 32767).astype('<i2').tobytes()
            chunk_queue.put(pcm)

    generation_finished = True
    chunk_queue.put(None)

# Start generation thread
gen_thread = threading.Thread(target=generate_chunks)
gen_thread.start()

print("Streaming started...", flush=True)

# One persistent sox process instead of afplay-per-chunk: spawning a new
# playback process per chunk opens a fresh CoreAudio session each time,
# which forces a Bluetooth output re-negotiation (audible glitch/cut) at
# every chunk boundary. A single process fed raw PCM over stdin keeps one
# continuous audio session for the whole reply.
player = subprocess.Popen(
    ["sox", "-t", "raw", "-r", "24000", "-e", "signed", "-b", "16", "-c", "1", "-", "-d"],
    stdin=subprocess.PIPE,
)
with open("/tmp/tts_stream_play_active.pid", "w") as f:
    f.write(str(player.pid))

try:
    while True:
        item = chunk_queue.get()
        if item is None:
            break
        try:
            player.stdin.write(item)
            player.stdin.flush()
        except BrokenPipeError:
            break

    player.stdin.close()
    player.wait()
    print("Playback complete.", flush=True)

finally:
    for f in [PID_FILE, "/tmp/tts_stream_play_active.pid"]:
        try:
            if os.path.exists(f):
                os.remove(f)
        except Exception:
            pass
