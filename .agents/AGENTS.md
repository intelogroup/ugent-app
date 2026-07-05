# Workspace Antigravity Rules

## macOS TTS Study Mode
- When the user requests a lecture on a subject (e.g. "lecture me on...", "sio..."):
  1. Search all of First Aid, Pathoma, and the entire Qbank (e.g., `medicospira-enriched.jsonl`, `classified-questions.jsonl`, `medicospira-questions.jsonl`) for matches.
  2. Present a detailed written synthesis in the chat of **how the subject is tested in the Qbank**, including **typical vignette presentation clues**, **expected answers/mechanisms**, and **key distractors/discriminators to watch out for**.
  3. Write a clean, speech-friendly version of the lecture text (removing markdown syntax, brackets, and complex formatting) to the temporary scratch file (`scratch/tts_input.txt` or `scratch/tts_input_fr.txt`).
  4. Stream/play the generated audio file using the high-performance MPS player (`scripts/tts_stream_play.py`).
- **Approved TTS engines for ugent: Kokoro and MeloTTS only. Do NOT use Qwen3-TTS for any audio generation (English or French).**
- **Engine selection:**
  - **French**: prefer Kokoro (`ff_siwis`) via the high-performance MPS streaming script `tts_stream_play.py`. Fallback: MeloTTS FR on MPS (`melo_tts_fr.py`, speed=0.88).
  - **English**: prefer Kokoro (`af_bella`) via `tts_stream_play.py`.
- `tts_stream_play.py` usage: `/Users/kalinovdameus/miniforge3/bin/python3.12 /Users/kalinovdameus/Developer/ugent-app/scripts/tts_stream_play.py <lang> <voice> <file_path>`
  - French: `f ff_siwis <file_path>`
  - English: `a af_bella <file_path>`
- Fallback to the macOS native `say` command if Kokoro or the python script fails.
- For multi-topic replays or combined lectures, concatenate the corresponding text files into a single file first, then run a single continuous audio stream to avoid concurrent audio outputs.
- When generating French TTS for medical lectures, pre-process the text to replace common medical acronyms (e.g. "SIADH", "VEGF", "AChE", "SNC", "SNP") and dotted abbreviations (e.g. "S.I.A.D.H.") with hyphenated uppercase letters (e.g. "S-I-A-D-H", "V-E-G-F"). This forces the TTS engines to pronounce them letter-by-letter correctly instead of mispronouncing them as single words.

## PyTorch TTS Device Configuration
- When initializing local TTS models (e.g. Kokoro, MeloTTS), always pass the device target as a string (e.g., `'cpu'` or `'mps'`), not as a `torch.device` object. PyTorch device objects cause library list membership checks (e.g. `device in ["cpu", "mps"]`) to evaluate as `False`, which disables CPU fallbacks and causes CUDA deserialization errors.
- MeloTTS FR should always run with `device='mps'` on Apple Silicon and `speed=0.88` for optimal clarity.

## TTS Model Installation Guidelines (Apple Silicon)
- **MeCab and UniDic Setup**: Engines using Japanese text processing (like MeloTTS) require system-level MeCab. Install via Homebrew (`brew install mecab mecab-ipadic`) and run `python -m unidic download` to initialize successfully.
- **Bypassing Compilation Downgrades**: Older setups (like MeloTTS) may pin old `transformers` or `tokenizers` versions that fail to compile on modern macOS PyTorch environments. Resolve this by installing modern versions first (`transformers>=4.27.4`, `tokenizers>=0.13.3`), then installing the target model package with `--no-deps`.

## Simplified Medical Explanations
- When the user requests simplified explanations (e.g., "for a 15yo"), explain complex anatomical/pathological mechanisms using concrete, mechanical metaphors (e.g., internet cables, power steering, brakes, hybrid engines, plumbing, or electric guitars).


