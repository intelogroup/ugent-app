#!/usr/bin/env python3
import json, os, sys, random, readline

CLASSIFIED_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "classified-questions.jsonl")

def print_q(q: dict):
    print("\n" + "=" * 72)
    print(f"SYSTEM: {q.get('system', '?')}  |  SUBJECT: {q.get('subject', '?')}")
    print("-" * 72)
    print(q["text"])
    print()
    for i, opt in enumerate(q["options"]):
        letter = chr(65 + i)
        print(f"  {letter}. {opt['text']}")
    print()

def main():
    filter_system = None
    filter_subject = None
    shuffle = False
    limit = None
    
    for i, arg in enumerate(sys.argv):
        if arg == "--system" and i + 1 < len(sys.argv):
            filter_system = sys.argv[i + 1].lower()
        if arg == "--subject" and i + 1 < len(sys.argv):
            filter_subject = sys.argv[i + 1].lower()
        if arg == "--shuffle":
            shuffle = True
        if arg == "--limit" and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])
        if arg == "--help":
            print("Usage: python3 scripts/study-local.py [--system <system>] [--subject <subject>] [--shuffle] [--limit <n>]")
            print("Systems: Neurology, Respiratory, Pharmacology, Gastrointestinal, Cardiovascular, Hematology & Oncology, Immunology, Infectious Disease, Endocrine, Integumentary, Renal, Reproductive, Musculoskeletal, Psychiatry, Pediatrics")
            return
    
    if not os.path.exists(CLASSIFIED_FILE):
        print(f"[STUDY] No classified questions file. Run scripts/classify-local.py first.")
        return
    
    with open(CLASSIFIED_FILE) as f:
        questions = [json.loads(line) for line in f if line.strip()]
    
    before = len(questions)
    if filter_system:
        questions = [q for q in questions if q.get("system", "").lower() == filter_system]
    if filter_subject:
        questions = [q for q in questions if q.get("subject", "").lower() == filter_subject]
    after = len(questions)
    
    if filter_system or filter_subject:
        print(f"Filtered: {before} -> {after} questions")
    else:
        print(f"Total: {after} questions")
    
    if not questions:
        print("No questions match your filter.")
        return
    
    if shuffle:
        random.shuffle(questions)
    if limit:
        questions = questions[:limit]
    
    correct = 0
    total = 0
    
    try:
        for q in questions:
            total += 1
            print_q(q)
            
            num_opts = len(q["options"])
            valid = [chr(65 + i) for i in range(num_opts)]
            
            answer = None
            while answer is None:
                try:
                    inp = input(f"Your answer ({'/'.join(valid)}): ").strip().upper()
                    if inp in valid:
                        answer = inp
                except (EOFError):
                    return

            idx = ord(answer) - 65
            is_correct = False
            if idx >= 0 and idx < len(q["options"]):
                is_correct = q["options"][idx]["isCorrect"]
            
            if is_correct:
                correct += 1
                print("  CORRECT!")
            else:
                correct_text = ""
                for opt in q["options"]:
                    if opt["isCorrect"]:
                        correct_text = opt["text"]
                        correct_letter = chr(65 + q["options"].index(opt))
                        break
                print(f"  INCORRECT. Correct answer: {correct_letter}. {correct_text}")
            
            if q.get("educationalObjective"):
                print(f"\n  OBJECTIVE: {q['educationalObjective']}")
            
            try:
                cont = input("\n  [Enter] next, [q] quit: ").strip().lower()
                if cont == "q":
                    raise KeyboardInterrupt()
            except (EOFError, KeyboardInterrupt):
                print()
                raise KeyboardInterrupt()
    
    except KeyboardInterrupt:
        print("\n\nSession ended.")
    
    total_answered = total
    if total_answered > 0:
        pct = round(correct / total_answered * 100)
        print(f"\nScore: {correct}/{total_answered} ({pct}%)")
    else:
        print("\nNo questions answered.")

if __name__ == "__main__":
    main()
