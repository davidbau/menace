#!/bin/bash
# scripts/fix_install.sh — Work around NFS lock on install directory
#
# When make install fails with "Device or resource busy" on .nfs* files,
# this script copies the built binary and data files manually.
#
# Usage: bash scripts/fix_install.sh

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PATCHED="$PROJECT_ROOT/nethack-c/patched"
INSTALL="$PROJECT_ROOT/nethack-c/install/games/lib/nethackdir"
BINARY="$PATCHED/src/nethack"

if [[ ! -f "$BINARY" ]]; then
    echo "ERROR: Binary not found at $BINARY"
    echo "Run: bash test/comparison/c-harness/setup.sh first"
    exit 1
fi

mkdir -p "$INSTALL/save"

# Copy binary (may fail if text file busy — retry after killing tmux sessions)
if ! cp "$BINARY" "$INSTALL/nethack" 2>/dev/null; then
    echo "Binary copy failed (text file busy). Killing stale tmux sessions..."
    tmux list-sessions 2>/dev/null | grep 'webhack-\|trace' | cut -d: -f1 | while read s; do
        tmux kill-session -t "$s" 2>/dev/null
    done
    sleep 1
    cp "$BINARY" "$INSTALL/nethack"
fi

# Copy Lua data files
cp "$PATCHED"/dat/*.lua "$INSTALL/" 2>/dev/null || true

# Create required runtime files
for f in perm record logfile xlogfile livelog; do
    touch "$INSTALL/$f" 2>/dev/null
    chmod 0600 "$INSTALL/$f" 2>/dev/null
done

# Copy other data files that make install would copy
for f in symbols cmdhelp help hh history opthelp wizhelp data oracles rumors quest.lua tribute; do
    [[ -f "$PATCHED/dat/$f" ]] && cp "$PATCHED/dat/$f" "$INSTALL/" 2>/dev/null || true
done

# Generate encrypted/compiled data files via makedefs
# C ref: sys/unix/Makefile.dat
#   -d → data    -r → rumors    -h → oracles
#   -1 → epitaph -2 → engrave   -3 → bogusmon
MAKEDEFS="$PATCHED/util/makedefs"
if [[ -x "$MAKEDEFS" ]]; then
    for flag_file in "-d data" "-r rumors" "-h oracles" "-1 epitaph" "-2 engrave" "-3 bogusmon"; do
        flag="${flag_file%% *}"
        file="${flag_file##* }"
        if [[ ! -f "$INSTALL/$file" ]] || [[ "$PATCHED/dat/${file}.txt" -nt "$INSTALL/$file" ]] 2>/dev/null; then
            (cd "$PATCHED/dat" && "$MAKEDEFS" "$flag" 2>/dev/null && cp "$file" "$INSTALL/" 2>/dev/null) || true
        fi
    done
fi

# Copy sysconf and fix wizard mode access
if [[ -f "$PATCHED/sys/unix/sysconf" ]]; then
    cp "$PATCHED/sys/unix/sysconf" "$INSTALL/sysconf"
    # Allow all users to use wizard mode (needed for session replay)
    sed -i 's/^WIZARDS=.*/WIZARDS=*/' "$INSTALL/sysconf"
fi

echo "Install fixed: $(ls -la "$INSTALL/nethack" | awk '{print $6, $7, $8, $9}')"
