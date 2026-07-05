import os
import glob
import json
import sys

TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "temp")

def get_active_question():
    if not os.path.exists(TEMP_DIR):
        return None
    files = glob.glob(os.path.join(TEMP_DIR, "question_*.json"))
    if not files:
        return None
    # Get the latest modified file
    latest_file = max(files, key=os.path.getmtime)
    try:
        with open(latest_file, "r") as f:
            data = json.load(f)
        return {
            "filepath": latest_file,
            "data": data
        }
    except Exception as e:
        print(f"Error reading {latest_file}: {e}", file=sys.stderr)
        return None

if __name__ == "__main__":
    q = get_active_question()
    if q:
        print(json.dumps(q))
    else:
        print("NONE")
