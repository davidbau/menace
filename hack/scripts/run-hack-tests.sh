#!/bin/bash
# run-hack-tests.sh — Run all Hack 1982 JS parity tests and display PES table.
#
# Usage:
#   hack/scripts/run-hack-tests.sh [options] [sessions_dir]
#
# Options:
#   --diagnose    Show events and screen diffs at first divergence for each failing session
#   --failures    Show only failing sessions in the table
#   --rerecord    Rebuild C harness and regenerate all session files before testing

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAC_DIR="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"

SESSIONS_DIR="$MAC_DIR/hack/test/sessions"
DIAGNOSE=""
FAILURES=""
RERECORD=0

for arg in "$@"; do
  case "$arg" in
    --diagnose)  DIAGNOSE="--diagnose" ;;
    --failures)  FAILURES="--failures" ;;
    --rerecord)  RERECORD=1 ;;
    *)           if [ -d "$arg" ]; then SESSIONS_DIR="$arg"; fi ;;
  esac
done

if [ $RERECORD -eq 1 ]; then
  echo "Rebuilding C harness..."
  (cd "$MAC_DIR/hack/hack-c/patched" && make -s)
  echo "Regenerating sessions..."
  python3 "$MAC_DIR/hack/hack-c/patched/make_sessions.py" \
    --harness "$MAC_DIR/hack/hack-c/patched/hack_harness" \
    --out "$SESSIONS_DIR"
  echo ""
fi

if [ ! -d "$SESSIONS_DIR" ]; then
  echo "Sessions directory not found: $SESSIONS_DIR"
  echo "Run: hack/scripts/run-hack-tests.sh --rerecord"
  exit 1
fi

node "$MAC_DIR/hack/test/replay_test.mjs" --all $DIAGNOSE "$SESSIONS_DIR" \
  | node "$MAC_DIR/hack/test/pes_report.mjs" $FAILURES
