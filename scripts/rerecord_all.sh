#!/bin/bash
# scripts/rerecord_all.sh — Re-record all C sessions sequentially with progress.
#
# Resumable: skips sessions whose .session.json is newer than the binary.
# Interruptible: Ctrl-C stops cleanly; re-run to continue.
#
# Usage:
#   bash scripts/rerecord_all.sh          # re-record all
#   bash scripts/rerecord_all.sh --force  # re-record even if already fresh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RERECORD="$PROJECT_ROOT/test/comparison/c-harness/rerecord.py"
SESSIONS_DIR="$PROJECT_ROOT/test/comparison/sessions"
BINARY="$PROJECT_ROOT/nethack-c/install/games/lib/nethackdir/nethack"
PROGRESS_FILE="$PROJECT_ROOT/tmp/rerecord_progress.log"

FORCE=0
if [[ "${1:-}" == "--force" ]]; then
    FORCE=1
fi

if [[ ! -f "$BINARY" ]]; then
    echo "ERROR: Binary not found at $BINARY"
    echo "Run: bash test/comparison/c-harness/setup.sh"
    exit 1
fi

BINARY_MTIME=$(stat -c %Y "$BINARY" 2>/dev/null || stat -f %m "$BINARY")

mkdir -p "$PROJECT_ROOT/tmp"

# Get list of all session files
mapfile -t ALL_SESSIONS < <(find "$SESSIONS_DIR" -name '*.session.json' -type f | sort)
TOTAL=${#ALL_SESSIONS[@]}

echo "=== Re-recording $TOTAL sessions ==="
echo "    Binary: $BINARY (mtime: $(date -d @$BINARY_MTIME '+%Y-%m-%d %H:%M' 2>/dev/null || date -r $BINARY_MTIME '+%Y-%m-%d %H:%M'))"
echo "    Progress log: $PROGRESS_FILE"
echo ""

DONE=0
SKIPPED=0
FAILED=0
RECORDED=0

for SESSION in "${ALL_SESSIONS[@]}"; do
    DONE=$((DONE + 1))
    BASENAME=$(basename "$SESSION")

    # Skip if session is newer than the binary (already re-recorded)
    if [[ $FORCE -eq 0 ]]; then
        SESSION_MTIME=$(stat -c %Y "$SESSION" 2>/dev/null || stat -f %m "$SESSION")
        if [[ $SESSION_MTIME -gt $BINARY_MTIME ]]; then
            SKIPPED=$((SKIPPED + 1))
            continue
        fi
    fi

    echo -n "[$DONE/$TOTAL] $BASENAME ... "

    if python3 "$RERECORD" "$SESSION" >> "$PROGRESS_FILE" 2>&1; then
        echo "OK"
        RECORDED=$((RECORDED + 1))
    else
        echo "FAILED"
        FAILED=$((FAILED + 1))
        echo "FAILED: $BASENAME" >> "$PROGRESS_FILE"
    fi
done

echo ""
echo "=== Done ==="
echo "  Recorded: $RECORDED"
echo "  Skipped (already fresh): $SKIPPED"
echo "  Failed: $FAILED"
echo "  Total: $TOTAL"
