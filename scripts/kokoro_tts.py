import sys, re, json, os
import numpy as np
import sounddevice as sd
from kokoro import KPipeline

VOICE = "af_heart"
SPEED = 1.0
LANG = "a"  # a=American, b=British
LOCK_FILE = "/tmp/tutor-speaking.lock"

_pipeline = None

def get_pipeline():
    global _pipeline
    if _pipeline is None:
        _pipeline = KPipeline(lang_code=LANG, repo_id="hexgrad/Kokoro-82M", device="mps")
    return _pipeline

def strip_markdown(text):
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

def speak(text):
    if not text or not text.strip():
        return
    
    # Create lockfile
    try:
        with open(LOCK_FILE, "w") as f:
            f.write(str(os.getpid()))
    except:
        pass

    try:
        pipeline = get_pipeline()
        clean = strip_markdown(text)
        for _, _, audio in pipeline(clean, voice=VOICE, speed=SPEED):
            sd.play(audio, 24000)
            sd.wait()
    finally:
        # Remove lockfile
        try:
            if os.path.exists(LOCK_FILE):
                os.remove(LOCK_FILE)
        except:
            pass

def speak_stream(text):
    if not text or not text.strip():
        return
    
    # Create lockfile
    try:
        with open(LOCK_FILE, "w") as f:
            f.write(str(os.getpid()))
    except:
        pass

    try:
        pipeline = get_pipeline()
        clean = strip_markdown(text)
        for _, _, audio in pipeline(clean, voice=VOICE, speed=SPEED):
            sd.play(audio, 24000)
            sd.wait()
    finally:
        # Remove lockfile
        try:
            if os.path.exists(LOCK_FILE):
                os.remove(LOCK_FILE)
        except:
            pass

if __name__ == "__main__":
    text = sys.stdin.read()
    speak(text)
