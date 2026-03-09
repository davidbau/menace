#!/bin/bash
# test/comparison/c-harness/setup.sh -- Build the C NetHack binary for comparison tests
#
# Fetches the NetHack C source at a pinned commit, applies patches for
# deterministic seeding and map dumping, then builds a TTY-only binary.
#
# Idempotent: safe to re-run. Will skip clone if source exists at correct commit.
#
# Prerequisites:
#   Linux: clang, make, bison, flex, ncurses-dev
#   macOS: Xcode command-line tools (xcode-select --install)
#
# NOTE: clang is required on all platforms for deterministic cross-platform
# behavior. GCC and clang differ in function argument evaluation order
# (unspecified in C), which causes RNG log ordering differences in code like
# set_wounded_legs(rn2(2) ? RIGHT_SIDE : LEFT_SIDE, rn1(10, 10));
# Using clang on both Linux and macOS ensures identical RNG streams.
#
# Usage:
#   cd test/comparison/c-harness && bash setup.sh
#   # or from project root:
#   bash test/comparison/c-harness/setup.sh

set -euo pipefail

# --- OS Detection ---
OS="$(uname -s)"
case "$OS" in
    Linux)
        HINTS_FILE="sys/unix/hints/linux-minimal"
        LUA_SYSCFLAGS="-DLUA_USE_POSIX"
        NPROC="$(nproc)"
        sed_inplace() { sed -i "$@"; }
        ;;
    Darwin)
        HINTS_FILE="sys/unix/hints/macosx-minimal"
        LUA_SYSCFLAGS="-DLUA_USE_MACOSX"
        NPROC="$(sysctl -n hw.ncpu)"
        sed_inplace() { sed -i '' "$@"; }
        ;;
    *)
        echo "[FAIL] Unsupported OS: $OS"
        exit 1
        ;;
esac
echo "    OS detected: $OS"

# --- Compiler: require clang ---
# Clang is required for cross-platform determinism. GCC evaluates function
# arguments in a different order than clang (both are valid per C spec), which
# causes RNG log differences between macOS (clang) and Linux (gcc) builds.
if ! command -v clang &>/dev/null; then
    echo ""
    echo "[FAIL] clang is required but not found."
    echo ""
    echo "  clang is needed to match macOS builds for deterministic RNG streams."
    echo "  GCC evaluates function arguments in a different order than clang,"
    echo "  which causes RNG log mismatches in session recordings."
    echo ""
    echo "  Install clang:"
    echo "    Ubuntu/Debian:  sudo apt install clang"
    echo "    Fedora/RHEL:    sudo dnf install clang"
    echo "    Arch:           sudo pacman -S clang"
    echo "    macOS:          xcode-select --install  (clang is included)"
    echo ""
    exit 1
fi
CC=clang
export CC
echo "    Compiler: $(clang --version | head -1)"

# --- Configuration ---
NETHACK_REPO="https://github.com/NetHack/NetHack.git"
PINNED_COMMIT="79c688cc6"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
UPSTREAM_DIR="$PROJECT_ROOT/nethack-c/upstream"
NETHACK_DIR="$PROJECT_ROOT/nethack-c/patched"
INSTALL_PREFIX="$PROJECT_ROOT/nethack-c/install"
PATCHES_DIR="$SCRIPT_DIR/patches"
BINARY="$NETHACK_DIR/src/nethack"

echo "=== WebHack C Harness Setup ==="
echo "    Project root:    $PROJECT_ROOT"
echo "    Upstream source: $UPSTREAM_DIR"
echo "    Patched build:   $NETHACK_DIR"
echo "    Install prefix:  $INSTALL_PREFIX"
echo "    Pinned commit:   $PINNED_COMMIT"
echo ""

# Guardrail: upstream submodule must stay pristine; patches belong in nethack-c/patched.
if [ -d "$UPSTREAM_DIR/.git" ]; then
    UPSTREAM_DIRTY="$(cd "$UPSTREAM_DIR" && git status --porcelain)"
    if [ -n "$UPSTREAM_DIRTY" ]; then
        echo "[FAIL] Upstream submodule is dirty: $UPSTREAM_DIR"
        echo "       This harness treats nethack-c/upstream as a pristine reference."
        echo "       Apply gameplay/comparison patches only in nethack-c/patched."
        echo ""
        echo "       Dirty paths:"
        echo "$UPSTREAM_DIRTY" | sed 's/^/         /'
        echo ""
        echo "       Remediation:"
        echo "         1) Inspect changes:"
        echo "            git -C \"$UPSTREAM_DIR\" status --short"
        echo "            git -C \"$UPSTREAM_DIR\" diff"
        echo "         2) If accidental, discard:"
        echo "            git -C \"$UPSTREAM_DIR\" restore ."
        echo "         3) If intentional patch work, port it into:"
        echo "            $PATCHES_DIR/*.patch"
        exit 1
    fi
fi

# --- Step 1: Ensure patched working copy exists at correct commit ---
# Prefer copying from the upstream submodule (fast, no network).
# Fall back to git clone if submodule not populated.
if [ -d "$NETHACK_DIR/.git" ]; then
    CURRENT_COMMIT=$(cd "$NETHACK_DIR" && git rev-parse --short=9 HEAD)
    if [[ "$CURRENT_COMMIT" == "$PINNED_COMMIT"* ]]; then
        echo "[OK] Patched source exists at correct commit ($CURRENT_COMMIT)"
    else
        echo "[WARN] Patched source at wrong commit $CURRENT_COMMIT (expected $PINNED_COMMIT)"
        echo "       Removing and re-creating from upstream..."
        rm -rf "$NETHACK_DIR"
    fi
fi
if [ ! -d "$NETHACK_DIR/.git" ]; then
    if [ -d "$UPSTREAM_DIR/.git" ]; then
        echo "[...] Copying upstream submodule to patched working copy..."
        git clone "$UPSTREAM_DIR" "$NETHACK_DIR"
        (cd "$NETHACK_DIR" && git checkout "$PINNED_COMMIT")
        echo "[OK] Copied from upstream at $PINNED_COMMIT"
    else
        echo "[...] Upstream submodule not found; cloning from network..."
        git clone "$NETHACK_REPO" "$NETHACK_DIR"
        (cd "$NETHACK_DIR" && git checkout "$PINNED_COMMIT")
        echo "[OK] Cloned and checked out $PINNED_COMMIT"
    fi
fi
echo ""

# --- Step 2: Apply patches ---
echo "[...] Applying patches from $PATCHES_DIR"
cd "$NETHACK_DIR"

# Reset any previous patches (idempotent)
git checkout -- . 2>/dev/null || true

for patch in "$PATCHES_DIR"/*.patch; do
    if [ -f "$patch" ]; then
        PATCH_NAME=$(basename "$patch")
        echo "     Applying $PATCH_NAME..."
        git apply --recount "$patch"
        echo "     [OK] $PATCH_NAME applied"
    fi
done
echo ""

# --- Step 2b: Verify critical instrumentation hooks ---
# These checks fail fast if source drift causes a patch hunk to stop applying.
require_marker() {
    local file="$1"
    local pattern="$2"
    local label="$3"
    if ! grep -Fq "$pattern" "$file"; then
        echo "[FAIL] Missing required instrumentation marker: $label"
        echo "       File: $file"
        echo "       Pattern: $pattern"
        echo "       Re-run setup after fixing patch drift in $PATCHES_DIR."
        exit 1
    fi
}

require_marker "src/engrave.c" 'event_log("wipe[%d,%d]", x, y);' "engrave wipe event"
require_marker "src/engrave.c" 'event_log("engr[%d,%d,%d]", ep->engr_type, x, y);' "engrave create event"
require_marker "src/engrave.c" 'event_log("dengr[%d,%d]", ep->engr_x, ep->engr_y);' "engrave delete event"
require_marker "src/mklev.c" 'event_log("mapdump[%s]", dump_id);' "mapdump trigger event"
require_marker "src/hack.c" 'event_log("test_move[mode=%d from=%d,%d dir=%d,%d to=%d,%d rv=%d]",' "test_move event"
require_marker "src/allmain.c" 'event_log("runstep[path=%s keyarg=%d cmd=%d cc=%d moves=%ld multi=%d run=%d mv=%d move=%d occ=%d umoved=%d ux=%d uy=%d]",' "runstep event"
echo "[OK] Critical instrumentation hooks present"
echo ""

# --- Step 3: Configure build system ---
cd "$NETHACK_DIR"
# On macOS, install our minimal hints file (no macosx-minimal in upstream)
if [ "$OS" = "Darwin" ]; then
    cp "$SCRIPT_DIR/macosx-minimal" sys/unix/hints/macosx-minimal
    # Replace PREFIX placeholder with actual project-local path
    sed_inplace "s|__NETHACK_PREFIX__|$INSTALL_PREFIX|g" sys/unix/hints/macosx-minimal
fi
# For Linux, patch the upstream linux-minimal hints PREFIX
if [ "$OS" = "Linux" ]; then
    sed_inplace "s|^\(PREFIX=\).*|\1$INSTALL_PREFIX|" sys/unix/hints/linux-minimal
fi
echo "[...] Running sys/unix/setup.sh with hints: $HINTS_FILE"
bash sys/unix/setup.sh "$HINTS_FILE"
echo "[OK] Build system configured"
echo ""

# --- Step 4: Fetch Lua (required dependency) ---
echo "[...] Fetching Lua..."
cd "$NETHACK_DIR"
if [ ! -f lib/lua-5.4.8/src/lua.h ]; then
    make fetch-lua
    echo "[OK] Lua fetched"
else
    echo "[OK] Lua already present"
fi
echo ""

# --- Step 5: Build ---
echo "[...] Building NetHack (TTY-only, $OS)"
cd "$NETHACK_DIR"
# Build Lua first (avoids parallel build race condition)
( cd lib/lua-5.4.8/src && make CC=clang SYSCFLAGS="$LUA_SYSCFLAGS" a 2>&1 ) | tail -3
mkdir -p lib/lua
cp -f lib/lua-5.4.8/src/liblua.a lib/lua/liblua-5.4.8.a 2>/dev/null || true
# Now build the rest (CC=clang for cross-platform determinism)
CC=clang make -j"$NPROC" 2>&1 | tail -5
echo ""

# --- Step 6: Install (copies data files to HACKDIR) ---
if [ -x "$BINARY" ]; then
    echo "[OK] Binary built successfully: $BINARY"
    echo "[...] Installing (copying data files)..."
    make install 2>&1 | tail -5
    INSTALL_DIR="$INSTALL_PREFIX/games/lib/nethackdir"
    if [ -d "$INSTALL_DIR" ]; then
        # Ensure sysconf exists (make install doesn't always copy it)
        if [ ! -f "$INSTALL_DIR/sysconf" ]; then
            cp "$NETHACK_DIR/sys/unix/sysconf" "$INSTALL_DIR/sysconf"
        fi
        # Allow all users to use wizard mode (needed for #dumpmap)
        sed_inplace 's/^WIZARDS=.*/WIZARDS=*/' "$INSTALL_DIR/sysconf"
        # Fix paths that may not exist on this platform (avoids "sysconf errors" on startup)
        sed_inplace 's|^GDBPATH=.*|#GDBPATH=/usr/bin/gdb|' "$INSTALL_DIR/sysconf"
        if [ "$OS" = "Darwin" ]; then
            sed_inplace 's|^GREPPATH=.*|GREPPATH=/usr/bin/grep|' "$INSTALL_DIR/sysconf"
        fi
        echo "[OK] Installed to $INSTALL_DIR"
    else
        echo "[WARN] Install directory not found at expected location"
    fi
    echo ""
else
    echo "[FAIL] Binary not found at $BINARY"
    echo "       Check build output above for errors."
    exit 1
fi

# --- Step 7: Verify ---
echo "=== Setup complete ==="
echo ""
echo "Installed to: $INSTALL_DIR"
echo ""
echo "To test deterministic map generation:"
echo "  export NETHACK_SEED=42"
echo "  export NETHACK_DUMPMAP=/tmp/map42.txt"
echo "  cd $NETHACK_DIR && src/nethack -u Wizard -D"
echo "  (in game: #dumpmap to write map to file)"

# Check for old global installation
OLD_INSTALL="$HOME/nethack-minimal"
if [ -d "$OLD_INSTALL" ]; then
    echo ""
    echo "NOTE: Old global installation found at $OLD_INSTALL"
    echo "      The C binary now installs to $INSTALL_PREFIX (project-local)."
    echo "      You can safely remove the old installation:"
    echo "        rm -rf $OLD_INSTALL"
fi
