import sqlite3, json, time, os, sys, hashlib, signal, argparse

DB_PATH = os.path.expanduser("~/.local/share/opencode/opencode.db")
POLL_INTERVAL = 0.5
spoken = set()

running = True

def handle_signal(sig, frame):
    global running
    running = False
    print("\nTutor daemon stopped.", file=sys.stderr)

def get_session_id(conn):
    row = conn.execute("""
        SELECT session_id FROM message
        ORDER BY time_created DESC LIMIT 1
    """).fetchone()
    if row:
        return row[0]
    row = conn.execute(
        "SELECT id FROM session ORDER BY time_created DESC LIMIT 1"
    ).fetchone()
    return row[0] if row else None

def get_text_for_message(conn, message_id):
    rows = conn.execute(
        "SELECT data FROM part WHERE message_id = ? ORDER BY id", (message_id,)
    ).fetchall()
    for (data_json,) in rows:
        part = json.loads(data_json)
        if part.get("type") == "text":
            text = part.get("text", "").strip()
            if text:
                return text
    return None

def has_final_text(conn, message_id):
    row = conn.execute(
        "SELECT data FROM message WHERE id = ?", (message_id,)
    ).fetchone()
    if not row:
        return False
    msg = json.loads(row[0])
    finish = msg.get("finish")
    return finish == "stop"

def get_session_user(conn, session_id):
    rows = conn.execute("""
        SELECT p.data FROM part p
        JOIN message m ON p.message_id = m.id
        WHERE m.session_id = ? AND json_extract(m.data, '$.role') = 'user'
        ORDER BY m.id DESC LIMIT 1
    """, (session_id,)).fetchall()
    for (data_json,) in rows:
        part = json.loads(data_json)
        if part.get("type") == "text":
            return part.get("text", "")
    return ""

def poll_messages(conn, session_id):
    global spoken

    rows = conn.execute("""
        SELECT m.id FROM message m
        WHERE m.session_id = ? AND json_extract(m.data, '$.role') = 'assistant'
        ORDER BY m.id DESC LIMIT 5
    """, (session_id,)).fetchall()

    for (message_id,) in reversed(rows):
        if message_id in spoken:
            continue

        if not has_final_text(conn, message_id):
            continue

        text = get_text_for_message(conn, message_id)
        if text:
            spoken.add(message_id)
            return text

    return None

def seed_spoken(conn, session_id):
    global spoken
    rows = conn.execute("""
        SELECT id FROM message
        WHERE session_id = ? AND json_extract(data, '$.role') = 'assistant'
    """, (session_id,)).fetchall()
    for (mid,) in rows:
        spoken.add(mid)
    print(f"Seeded {len(spoken)} existing messages as spoken.", file=sys.stderr)

def run_daemon(args):
    global running, spoken

    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    session_id = args.session or get_session_id(conn)

    if not session_id:
        print("No session found.", file=sys.stderr)
        sys.exit(1)

    seed_spoken(conn, session_id)

    print(f"Tutor daemon watching session: {session_id}", file=sys.stderr)
    print(f"Speaking via kokoro {args.voice} at speed {args.speed}", file=sys.stderr)

    from kokoro_tts import speak

    while running:
        try:
            text = poll_messages(conn, session_id)
            if text:
                print(f"\n[Tutor speaks: {len(text)} chars]", file=sys.stderr)
                speak(text)

            time.sleep(POLL_INTERVAL)
        except sqlite3.OperationalError:
            time.sleep(POLL_INTERVAL)
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            time.sleep(2)

    conn.close()

if __name__ == "__main__":
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    parser = argparse.ArgumentParser(description="USMLE Tutor TTS daemon")
    parser.add_argument("--session", help="Session ID (auto-detect if omitted)")
    parser.add_argument("--voice", default="af_heart", help="Kokoro voice")
    parser.add_argument("--speed", type=float, default=1.0, help="Speech speed")
    parser.add_argument("--db", default=DB_PATH, help="Path to opencode.db")
    parser.add_argument("--poll", type=float, default=0.5, help="Poll interval (s)")
    args = parser.parse_args()

    DB_PATH = args.db
    POLL_INTERVAL = args.poll

    import kokoro_tts
    kokoro_tts.VOICE = args.voice
    kokoro_tts.SPEED = args.speed

    run_daemon(args)
