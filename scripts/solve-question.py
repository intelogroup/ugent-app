import os
import glob
import json
import sys

TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "temp")

def solve_question(answer_choice):
    answer_choice = answer_choice.strip().upper()
    if not answer_choice or len(answer_choice) != 1 or not ('A' <= answer_choice <= 'Z'):
        print("Error: Answer must be a single letter (e.g. A, B, C, D, E).", file=sys.stderr)
        sys.exit(1)

    if not os.path.exists(TEMP_DIR):
        print("Error: temp directory does not exist.", file=sys.stderr)
        sys.exit(1)

    files = glob.glob(os.path.join(TEMP_DIR, "question_*.json"))
    if not files:
        print("Error: No active question found in temp directory.", file=sys.stderr)
        sys.exit(1)

    # Get the latest question file
    latest_file = max(files, key=os.path.getmtime)
    filename = os.path.basename(latest_file)
    
    # Filename format: question_<eId>_<qIndex>.json
    parts = filename.replace(".json", "").split("_")
    if len(parts) < 3:
        print(f"Error: Invalid question filename format '{filename}'", file=sys.stderr)
        sys.exit(1)

    eId = parts[1]
    qIndex = parts[2]

    ans_filename = f"answer_{eId}_{qIndex}.json"
    ans_path = os.path.join(TEMP_DIR, ans_filename)

    # Write answer JSON
    try:
        with open(ans_path, "w") as f:
            json.dump({"answer": answer_choice}, f, indent=2)
        print(f"Successfully wrote answer '{answer_choice}' to {ans_path}")
    except Exception as e:
        print(f"Error writing answer file: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 solve-question.py <ANSWER_LETTER>", file=sys.stderr)
        sys.exit(1)
    
    solve_question(sys.argv[1])
