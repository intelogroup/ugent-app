#!/bin/bash
# Start the USMLE tutor TTS daemon

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="/tmp/ugent-tutor.pid"
LOG_FILE="/tmp/ugent-tutor.log"

start() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "Tutor already running (PID $(cat "$PID_FILE"))"
        exit 0
    fi

    echo "Starting tutor daemon..."
    nohup python3 -u "$SCRIPT_DIR/tutor-daemon.py" \
        --voice af_heart \
        --speed 1.0 \
        --poll 0.5 \
        >> "$LOG_FILE" 2>&1 &
    
    PID=$!
    disown $PID
    echo $PID > "$PID_FILE"
    echo "Tutor daemon started (PID $PID)"
    echo "Log: $LOG_FILE"
}

stop() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        kill "$PID" 2>/dev/null
        rm -f "$PID_FILE"
        echo "Tutor daemon stopped"
    else
        echo "No PID file found"
    fi
}

status() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "Tutor running (PID $(cat "$PID_FILE"))"
    else
        echo "Tutor not running"
    fi
}

case "${1:-start}" in
    start) start ;;
    stop) stop ;;
    restart) stop; sleep 1; start ;;
    status) status ;;
    *) echo "Usage: $0 {start|stop|restart|status}" ;;
esac
