# Workspace Antigravity Rules

## Book Grounding & Fact-Checking
- **Always consult local study books first**: When answering questions, creating summary tables, or explaining USMLE concepts, always search and ground explanations against First Aid (`data/firstaid_text.jsonl`), Pathoma (`data/pathoma_text.jsonl`), and Qbank (`data/classified-questions.jsonl`, `data/medicospira-enriched.jsonl`) using file search tools.

## macOS TTS Study Mode
- When the user requests a lecture or spoken explanation:
  1. Search all of First Aid, Pathoma, and the Qbank (`firstaid_text.jsonl`, `pathoma_text.jsonl`, `medicospira-enriched.jsonl`) for exact matches.
  2. Present a detailed written synthesis in the chat of **how the subject is tested in the Qbank**, including **typical vignette presentation clues**, **expected answers/mechanisms**, and **key distractors/discriminators to watch out for**.
  3. Write a clean, speech-friendly version of the text to `scratch/tts_input.txt` (or `scratch/tts_input_fr.txt`).
  4. Stream/play the generated audio file using `scripts/speak.py <fr|en> "<text>"`.
- **Approved Engine Selection:**
  - **French**: Default to local **Voxtral-4B-TTS-2603-mlx-4bit** via `mlx-audio` on Apple Silicon Metal GPU (`fr_female`/`fr_male`). Fallback: Kokoro (`ff_siwis`).
  - **English**: Default to **Kokoro** (`af_bella`) via `scripts/speak.py` or **Pocket TTS** (`english` / `alba`).
- **Unified execution:** `python3 scripts/speak.py <fr|en> "<text>"`
- Fallback to the macOS native `say` command if primary scripts fail.
- When generating French TTS for medical lectures, pre-process the text to replace common medical acronyms (e.g. "SIADH", "VEGF", "AChE", "SNC", "SNP") and dotted abbreviations (e.g. "S.I.A.D.H.") with hyphenated uppercase letters (e.g. "S-I-A-D-H", "V-E-G-F"). This forces the TTS engines to pronounce them letter-by-letter correctly instead of mispronouncing them as single words.


## PyTorch TTS Device Configuration
- When initializing local TTS models (e.g. Kokoro, MeloTTS), always pass the device target as a string (e.g., `'cpu'` or `'mps'`), not as a `torch.device` object. PyTorch device objects cause library list membership checks (e.g. `device in ["cpu", "mps"]`) to evaluate as `False`, which disables CPU fallbacks and causes CUDA deserialization errors.
- MeloTTS FR should always run with `device='mps'` on Apple Silicon and `speed=0.88` for optimal clarity.

## TTS Model Installation Guidelines (Apple Silicon)
- **MeCab and UniDic Setup**: Engines using Japanese text processing (like MeloTTS) require system-level MeCab. Install via Homebrew (`brew install mecab mecab-ipadic`) and run `python -m unidic download` to initialize successfully.
- **Bypassing Compilation Downgrades**: Older setups (like MeloTTS) may pin old `transformers` or `tokenizers` versions that fail to compile on modern macOS PyTorch environments. Resolve this by installing modern versions first (`transformers>=4.27.4`, `tokenizers>=0.13.3`), then installing the target model package with `--no-deps`.

## Simplified Medical Explanations
- When the user requests simplified explanations (e.g., "for a 15yo"), explain complex anatomical/pathological mechanisms using concrete, mechanical metaphors (e.g., internet cables, power steering, brakes, hybrid engines, plumbing, or electric guitars).

## Strategy Explorer Design Principle
- For any updates, configurations, or references in the Strategy Graph Explorer, align closely with the structure, chapters, page ranges, and content of the official study books (First Aid and Pathoma), rather than inventing terms or relying solely on raw Qbank fields.



