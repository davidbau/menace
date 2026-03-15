#!/bin/bash
# Record a Zork parity session from the Fortran reference binary.
# Usage: echo "look\nopen mailbox\nquit\ny" | ./record-fortran-session.sh > session.json
#
# Requires the instrumented Fortran binary (dungeon_trace) to be built.
# Build: cd fortran-src && make -f Makefile.trace

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DUNGEON_DIR="$SCRIPT_DIR/../fortran-src"
BINARY="$DUNGEON_DIR/dungeon_trace"

if [ ! -x "$BINARY" ]; then
    echo "Error: instrumented binary not found at $BINARY" >&2
    echo "Build it with: cd $DUNGEON_DIR && make -f Makefile.trace" >&2
    exit 1
fi

# Run the game, capturing stdout (game output) and stderr (trace data)
TRACE_FILE=$(mktemp /tmp/zork_trace.XXXXXX)
cd "$DUNGEON_DIR" && ./dungeon_trace 2>"$TRACE_FILE"

# Convert trace to session JSON
node "$SCRIPT_DIR/trace-to-session.mjs" "$TRACE_FILE" fortran

rm -f "$TRACE_FILE"
