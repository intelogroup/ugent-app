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

import soundfile as sf
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
    chunk_idx = 0
    for gs, ps, audio in generator:
        if audio is not None:
            if hasattr(audio, 'numpy'):
                audio_np = audio.detach().cpu().numpy()
            else:
                audio_np = audio
            
            chunk_file = f"/tmp/ugent_stream_chunk_{chunk_idx}.wav"
            sf.write(chunk_file, audio_np, 24000)
            
            chunk_queue.put((chunk_idx, chunk_file))
            chunk_idx += 1
            
    generation_finished = True
    chunk_queue.put(None)

# Start generation thread
gen_thread = threading.Thread(target=generate_chunks)
gen_thread.start()

print("Streaming started...", flush=True)

try:
    while True:
        item = chunk_queue.get()
        if item is None:
            break
        
        idx, path = item
        
        p = subprocess.Popen(["afplay", path])
        with open("/tmp/tts_stream_play_active.pid", "w") as f:
            f.write(str(p.pid))
            
        p.wait()
        
        # Cleanup file after playback
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception:
            pass

    print("Playback complete.", flush=True)

finally:
    # Final cleanup of lock/pid files
    for f in [PID_FILE, "/tmp/tts_stream_play_active.pid"]:
        try:
            if os.path.exists(f):
                os.remove(f)
        except Exception:
            pass
