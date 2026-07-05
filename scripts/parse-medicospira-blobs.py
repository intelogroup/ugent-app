#!/usr/bin/env python3
"""
Parse raw medicospira blobs into structured questions JSONL.

Reads unprocessed blobs from data/medicospira-blobs.jsonl,
parses each via regex, dedups against existing data/medicospira-questions.jsonl,
and appends new questions.

Usage:
  python3 scripts/parse-medicospira-blobs.py
  python3 scripts/parse-medicospira-blobs.py --blobs path/to/blobs.jsonl --questions path/to/questions.jsonl
"""
import hashlib, json, os, re, sys

BLOBS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "medicospira-blobs.jsonl")
QUESTIONS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "medicospira-questions.jsonl")

def hash_text(text: str) -> str:
    normalized = re.sub(r"\s+", " ", text.lower()).strip()
    return hashlib.sha256(normalized.encode()).hexdigest()

def _pick_by_percentage(letters: set, choice_texts: dict) -> str | None:
    pcts = {}
    for letter in letters:
        m = re.search(r"\((\d+)%\)", choice_texts.get(letter, ""))
        if m:
            pcts[letter] = int(m.group(1))
    if pcts:
        return max(pcts, key=pcts.get)
    return None

def parse_blob(blob: str) -> dict | None:
    lines = blob.strip().split("\n")
    stripped = [l.strip() for l in lines]

    # Extract all option lines first (pattern: "A. text" or "A.\ntext on next lines")
    option_lines = []
    pending_letter = None
    pending_texts = []
    for s in stripped:
        m = re.match(r"^([A-Z])\.(.+)$", s)
        if m:
            if pending_letter is not None:
                option_lines.append((pending_letter, " ".join(pending_texts)))
            pending_letter = m.group(1)
            pending_texts = [m.group(2).strip()]
        elif re.match(r"^[A-Z]\.$", s):
            if pending_letter is not None:
                option_lines.append((pending_letter, " ".join(pending_texts)))
            pending_letter = s[0]
            pending_texts = []
        elif pending_letter is not None:
            if re.match(r"^(Explanation|Correct Answer)", s):
                option_lines.append((pending_letter, " ".join(pending_texts)))
                pending_letter = None
            elif s:
                pending_texts.append(s)
    if pending_letter is not None:
        option_lines.append((pending_letter, " ".join(pending_texts)))

    if not option_lines:
        return None

    # Find Correct Answer position (with or without letter after it)
    ca_text_idx = None
    correct_letter = None
    for i, line in enumerate(stripped):
        if "Correct Answer" in line:
            ca_text_idx = i
            m = re.match(r"Correct Answer\s*[:\-]\s*([A-Z])", line)
            if m:
                correct_letter = m.group(1)
            else:
                for j in range(i + 1, min(i + 4, len(stripped))):
                    if not stripped[j]:
                        continue
                    nm = re.match(r"^([A-Z])$", stripped[j])
                    if nm:
                        correct_letter = nm.group(1)
                        break
            break

    # Find Explanation start (search entire blob, not just after CA)
    exp_idx = None
    for i, s in enumerate(stripped):
        if re.match(r"^Explanation\s*:?\s*$", s):
            exp_idx = i
            break

    if exp_idx is None:
        return None

    # Explanation: everything after the Explanation header line
    explanation = "\n".join(s for s in stripped[exp_idx + 1:] if s).strip()
    footer_idx = explanation.lower().find("block time")
    if footer_idx >= 0:
        explanation = explanation[:footer_idx].strip()

    # If correct_letter was not found on the CA line, infer from explanation
    if correct_letter is None:
        mentioned = set(re.findall(r"\(Choice[s]?\s+([A-Z](?:\s+and\s+[A-Z])?)\)", explanation, re.I))
        all_letters = {l for l, _ in option_lines}
        expanded_mentioned = set()
        for m in mentioned:
            parts = re.split(r"\s+and\s+", m)
            expanded_mentioned.update(p.strip() for p in parts)
        unmentioned = all_letters - expanded_mentioned
        if len(unmentioned) == 1:
            correct_letter = unmentioned.pop()
        elif len(unmentioned) > 1:
            choice_texts = {l: t.lower() for l, t in option_lines}
            exp_lower = explanation.lower()
            scores = {}
            for letter in unmentioned:
                text = choice_texts[letter]
                words = set(re.findall(r"[a-z]{4,}", text))
                score = sum(1 for w in words if w in exp_lower)
                scores[letter] = score
            if scores:
                best = max(scores, key=scores.get)
                if scores[best] > 0:
                    correct_letter = best
                else:
                    correct_letter = _pick_by_percentage(unmentioned, choice_texts)
        else:
            # All options share the same mention status — fall back to %
            choice_texts = {l: t.lower() for l, t in option_lines}
            correct_letter = _pick_by_percentage(all_letters, choice_texts)
 
    if correct_letter is None:
        return None

    # Question text: everything before the first option line, minus CA/exp headers
    first_opt_idx = None
    for i, s in enumerate(stripped):
        if re.match(r"^[A-Z]\.", s):
            first_opt_idx = i
            break

    if first_opt_idx is None:
        return None

    text_lines = [s for s in stripped[:first_opt_idx] if s
                  and not re.match(r"^(Correct Answer|Explanation|block time)", s, re.I)]
    question_text = "\n".join(text_lines)

    # Build options
    options = []
    for letter, choice_text in option_lines:
        options.append({
            "text": choice_text,
            "isCorrect": letter == correct_letter,
        })

    # Educational objective: first sentence of explanation
    edu_obj = ""
    if explanation:
        first_sent = re.match(r"^([^.]+\.)", explanation)
        if first_sent:
            edu_obj = first_sent.group(1).strip()

    correct_text = ""
    for opt in options:
        if opt["isCorrect"]:
            correct_text = opt["text"]
            break

    return {
        "text": question_text,
        "correctAnswer": correct_text,
        "options": options,
        "explanation": explanation,
        "educationalObjective": edu_obj,
        "textHash": hash_text(blob),
        "source": "MEDICOSPIRA",
    }

def load_existing_hashes(path: str) -> set:
    if not os.path.exists(path):
        return set()
    hashes = set()
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    q = json.loads(line)
                    if q.get("textHash"):
                        hashes.add(q["textHash"])
                except json.JSONDecodeError:
                    continue
    return hashes

def main():
    blobs_file = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else BLOBS_FILE
    questions_file = QUESTIONS_FILE
    for i, arg in enumerate(sys.argv):
        if arg == "--questions" and i + 1 < len(sys.argv):
            questions_file = sys.argv[i + 1]
        if arg == "--blobs" and i + 1 < len(sys.argv):
            blobs_file = sys.argv[i + 1]

    if not os.path.exists(blobs_file):
        print(f"[PARSE] No blobs file found: {blobs_file}")
        return

    existing_hashes = load_existing_hashes(questions_file)
    new_count = 0
    dup_count = 0
    fail_count = 0

    entries = []
    with open(blobs_file) as f:
        for i, line in enumerate(f):
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
                if isinstance(entry, dict):
                    blob_text = entry.get("text") or entry.get("blob") or ""
                else:
                    blob_text = str(entry)
                if not blob_text:
                    blob_text = line
            except json.JSONDecodeError:
                blob_text = line

            parsed = parse_blob(blob_text)
            if parsed is None:
                fail_count += 1
                continue

            if parsed["textHash"] in existing_hashes:
                dup_count += 1
                continue

            existing_hashes.add(parsed["textHash"])
            entries.append(parsed)
            new_count += 1

    if not entries:
        print(f"[PARSE] 0 new questions ({dup_count} dupes, {fail_count} failed)")
        return

    os.makedirs(os.path.dirname(questions_file), exist_ok=True)
    with open(questions_file, "a") as f:
        for q in entries:
            f.write(json.dumps(q, ensure_ascii=False) + "\n")

    print(f"[PARSE] {new_count} new, {dup_count} dupes, {fail_count} failed → {questions_file}")

if __name__ == "__main__":
    main()
