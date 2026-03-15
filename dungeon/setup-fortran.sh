#!/bin/bash
# Build the Fortran Dungeon reference binary from upstream source + patches.
#
# Usage: bash dungeon/setup-fortran.sh
#
# Upstream: https://github.com/GOFAI/dungeon (git submodule)
# Patches:  dungeon/patches/*.patch (numbered, applied in order)
# Output:   dungeon/fortran-src/dungeon (binary)
#
# This script is idempotent — safe to re-run.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
UPSTREAM_DIR="$SCRIPT_DIR/fortran-upstream"
SRC_DIR="$SCRIPT_DIR/fortran-src"
PATCHES_DIR="$SCRIPT_DIR/patches"

echo "========================================="
echo "Dungeon Fortran build system"
echo "========================================="

# ---- Step 1: Ensure upstream submodule is populated ----
if [ ! -f "$UPSTREAM_DIR/src/game.f" ]; then
    echo "Initializing upstream submodule..."
    cd "$(dirname "$SCRIPT_DIR")"
    git submodule update --init dungeon/fortran-upstream
    cd "$SCRIPT_DIR"
fi

if [ ! -f "$UPSTREAM_DIR/src/game.f" ]; then
    echo "ERROR: Upstream source not found at $UPSTREAM_DIR/src/game.f"
    echo "Run: git submodule update --init dungeon/fortran-upstream"
    exit 1
fi

echo "✓ Upstream source available"

# ---- Step 2: Copy upstream source to working directory ----
echo "Copying upstream source to $SRC_DIR..."
mkdir -p "$SRC_DIR"

# Copy Fortran source files
for f in "$UPSTREAM_DIR"/src/*.f "$UPSTREAM_DIR"/src/*.for "$UPSTREAM_DIR"/src/Makefile; do
    [ -f "$f" ] && cp "$f" "$SRC_DIR/"
done

# Copy data files
for f in dindx dtext; do
    [ -f "$UPSTREAM_DIR/$f" ] && cp "$UPSTREAM_DIR/$f" "$SRC_DIR/"
done

echo "✓ Source files copied"

# ---- Step 3: Apply patches ----
echo "Applying patches..."
cd "$SRC_DIR"

PATCH_COUNT=0
PATCH_FAIL=0
for patch in "$PATCHES_DIR"/*.patch; do
    [ -f "$patch" ] || continue
    pname="$(basename "$patch")"
    if patch -p1 --forward --silent < "$patch" 2>/dev/null; then
        echo "  ✓ $pname"
        PATCH_COUNT=$((PATCH_COUNT + 1))
    elif patch -p1 --forward --silent --dry-run < "$patch" 2>/dev/null; then
        # Patch applies cleanly but was already applied — skip
        echo "  ✓ $pname (already applied)"
        PATCH_COUNT=$((PATCH_COUNT + 1))
    else
        echo "  ✗ $pname FAILED"
        PATCH_FAIL=$((PATCH_FAIL + 1))
    fi
done

if [ "$PATCH_FAIL" -gt 0 ]; then
    echo "ERROR: $PATCH_FAIL patch(es) failed to apply"
    exit 1
fi
echo "✓ $PATCH_COUNT patch(es) applied"

# ---- Step 4: Build ----
echo "Building dungeon binary..."
cd "$SRC_DIR"

# Check for gfortran
if ! command -v gfortran &>/dev/null; then
    echo "ERROR: gfortran not found. Install with: brew install gcc"
    exit 1
fi

make -s
echo "✓ Binary built: $SRC_DIR/dungeon"

# ---- Step 5: Verify ----
if [ ! -x "$SRC_DIR/dungeon" ]; then
    echo "ERROR: Binary not found or not executable"
    exit 1
fi

# Quick smoke test (must run from source dir where dindx/dtext live)
RESULT=$(cd "$SRC_DIR" && printf 'quit\ny\n' | DUNGEON_SEED=1 ./dungeon 2>/dev/null | head -1)
if echo "$RESULT" | grep -q "Welcome to Dungeon"; then
    echo "✓ Smoke test passed"
else
    echo "WARNING: Smoke test output unexpected: $RESULT"
fi

echo ""
echo "========================================="
echo "Build complete. Binary: dungeon/fortran-src/dungeon"
echo "========================================="
