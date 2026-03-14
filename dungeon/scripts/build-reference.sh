#!/bin/bash
# Build the C reference implementation of Dungeon.
# Run from the dungeon/ directory.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DUNGEON_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
C_SRC="$DUNGEON_DIR/c-src"

echo "Building C reference in $C_SRC..."
cd "$C_SRC"
make clean 2>/dev/null || true
make 2>&1 | grep -c warning | xargs -I{} echo "  ({} warnings)"
echo "  Built: $C_SRC/zork"

# Quick smoke test
echo ""
echo "Smoke test:"
printf 'open mailbox\nread leaflet\nquit\ny\n' | ./zork 2>&1 | head -5
echo "  ...OK"
