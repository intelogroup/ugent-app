#!/usr/bin/env python3
"""Mic -> Whisper streaming STT via whisper-stream (M4 GPU). Clean output."""

import sys, os, subprocess, argparse, time, tempfile, re

MODEL_DIR = "/Users/kalinovdameus/Developer/gemma4llama/models"
MODEL = os.environ.get("STT_MODEL", f"{MODEL_DIR}/ggml-large-v3-turbo.bin")

def ensure_model(path):
    if not os.path.exists(path):
        name = os.path.basename(path)
        url = f"https://huggingface.co/ggerganov/whisper.cpp/resolve/main/{name}"
        print(f"Downloading {name}...", file=sys.stderr)
        import urllib.request
        urllib.request.urlretrieve(url, path)

def type_text(text):
    try:
        old_clip = subprocess.run(["pbpaste"], capture_output=True, text=True).stdout
    except:
        old_clip = None

    p = subprocess.Popen(["pbcopy"], stdin=subprocess.PIPE)
    p.communicate(text.encode())
    subprocess.run(["osascript", "-e",
        'tell application "System Events" to keystroke "v" using command down'],
        capture_output=True)

    if old_clip is not None:
        time.sleep(0.15)
        p = subprocess.Popen(["pbcopy"], stdin=subprocess.PIPE)
        p.communicate(old_clip.encode())

def main():
    ap = argparse.ArgumentParser(description="Mic -> Whisper streaming STT")
    ap.add_argument("mode", nargs="?", default="watch", choices=["watch", "listen"])
    ap.add_argument("-m", "--model", default=MODEL)
    ap.add_argument("--tiny", action="store_true", help="Use tiny.en (faster)")
    ap.add_argument("--small", action="store_true", help="Use small.en (more accurate)")
    ap.add_argument("--medium", action="store_true", help="Use medium.en (highly accurate, clinical)")
    ap.add_argument("--large", action="store_true", help="Use large-v3 (maximum accuracy)")
    ap.add_argument("--turbo", action="store_true", help="Use large-v3-turbo (fast & high accuracy)")
    ap.add_argument("--step", type=int, default=1000, help="Process step ms")
    ap.add_argument("--length", type=int, default=3000, help="Audio buffer ms")
    ap.add_argument("--vad", type=float, default=0.3, help="VAD threshold")
    ap.add_argument("--wake", default="tutor", help="Wake word to start typing (case-insensitive, 'none' to disable)")
    ap.add_argument("--silence", type=float, default=3.0, help="Seconds of silence before auto-sending (0 to disable)")
    args = ap.parse_args()

    if args.tiny:
        args.model = f"{MODEL_DIR}/ggml-tiny.en.bin"
    elif args.small:
        args.model = f"{MODEL_DIR}/ggml-small.en.bin"
    elif args.medium:
        args.model = f"{MODEL_DIR}/ggml-medium.en.bin"
    elif args.large:
        args.model = f"{MODEL_DIR}/ggml-large-v3.bin"
    elif args.turbo:
        args.model = f"{MODEL_DIR}/ggml-large-v3-turbo.bin"
    ensure_model(args.model)

    outfile = tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False)
    outpath = outfile.name
    outfile.close()

    wake_word = args.wake.lower().strip()
    if wake_word == "none":
        wake_word = None

    active = True if wake_word is None else False
    last_activity_time = None
    typed_in_session = False

    print(f"STT ready. Mode: {args.mode}, model: {os.path.basename(args.model)}", file=sys.stderr)
    if wake_word:
        print(f"Wake word: '{wake_word}', Silence timeout: {args.silence}s", file=sys.stderr)
    else:
        print(f"Continuous mode, Silence timeout: {args.silence}s", file=sys.stderr)

    proc = subprocess.Popen(
        ["whisper-stream", "-m", args.model,
         "--step", str(args.step),
         "--length", str(args.length),
         "--vad-thold", str(args.vad),
         "-f", outpath, "-t", "4"],
         stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL
    )

    last_reported = ""
    best = ""  # best version of current utterance
    seen_pos = 0

    def process_finalized(text):
        nonlocal active, typed_in_session, last_activity_time
        text_strip = text.strip()
        if not text_strip:
            return
        
        print(text_strip, flush=True)

        if not active:
            if wake_word and wake_word in text_strip.lower():
                active = True
                idx = text_strip.lower().find(wake_word)
                speech_text = text_strip[idx + len(wake_word):].strip()
                speech_text = re.sub(r'^[,\.\s\-\?\!]+', '', speech_text)
                if speech_text:
                    print(f" [Woke up: typing '{speech_text}']", file=sys.stderr)
                    if args.mode == "listen":
                        type_text(speech_text + " ")
                    typed_in_session = True
                else:
                    print(" [Woke up: listening...]", file=sys.stderr)
                    typed_in_session = False
                last_activity_time = time.time()
        else:
            if args.mode == "listen":
                type_text(text_strip + " ")
            typed_in_session = True
            last_activity_time = time.time()

    try:
        while True:
            time.sleep(0.1)
            if proc.poll() is not None:
                break

            # Check if tutor is speaking to prevent auto-transcription feedback
            if os.path.exists("/tmp/tutor-speaking.lock"):
                try:
                    with open(outpath, "r") as f:
                        f.seek(0, 2)
                        seen_pos = f.tell()
                except:
                    pass
                best = ""
                last_activity_time = None
                typed_in_session = False
                continue

            # Check silence timeout
            if args.silence > 0 and active and last_activity_time is not None:
                elapsed = time.time() - last_activity_time
                if elapsed > args.silence:
                    if typed_in_session:
                        print(f" [Silence {elapsed:.1f}s: Auto-sending...]", file=sys.stderr)
                        if args.mode == "listen":
                            subprocess.run(["osascript", "-e", 'tell application "System Events" to keystroke return'], capture_output=True)
                    else:
                        print(f" [Silence {elapsed:.1f}s: Resetting active state...]", file=sys.stderr)
                    
                    # Reset state
                    active = True if wake_word is None else False
                    last_activity_time = None
                    typed_in_session = False

            try:
                with open(outpath, "r") as f:
                    f.seek(seen_pos)
                    new_data = f.read()
                    seen_pos = f.tell()
            except:
                continue

            for line in new_data.splitlines():
                line = line.strip()
                if not line:
                    continue

                if line == "[BLANK_AUDIO]":
                    if best and best != last_reported:
                        process_finalized(best)
                        last_reported = best
                    best = ""
                elif best:
                    if line.startswith(best):
                        best = line
                    else:
                        # Check overlap: different utterance
                        best_words = set(best.split()[:3])
                        line_words = set(line.split()[:3])
                        if best_words & line_words:
                            best = line  # refinement
                        else:
                            if best != last_reported:
                                process_finalized(best)
                                last_reported = best
                            best = line
                else:
                    best = line

    except KeyboardInterrupt:
        if best and best != last_reported:
            process_finalized(best)
        proc.terminate()
        print("\nStopped.", file=sys.stderr)
    finally:
        os.unlink(outpath)

if __name__ == "__main__":
    main()
