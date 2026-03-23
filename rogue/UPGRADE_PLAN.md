# Rogue 3.6 Reference Upgrade Plan

## Goal

Replace the JulianOnions/rogue-3.6 source (with DBM house modifications) with
RoguelikeRestorationProject/rogue3.6 as the authoritative C reference.  Update
the JS port, C harness, and all session fixtures to match.

## Current State

- **Upstream submodule**: `rogue/rogue-c/upstream/` → `RoguelikeRestorationProject/rogue3.6` ✅
- **JS monster stats**: Reverted all DBM changes (centaur/eye/yeti/umber hulk XP, floating eye 0d0) ✅
- **JS strength init**: 1% exceptional, else 16/0 ✅
- **JS init_colors/stones/materials**: uses `used[]` arrays (no duplicate items) ✅
- **C harness**: Broken — needs rebuild for RRP source structure

## Key Differences: JulianOnions → RRP

| Area | JulianOnions (old) | RRP (new) |
|------|-------------------|-----------|
| Strength init | Always 18/XX (DBM) | 1% chance of 18/XX, else 16/0 |
| Floating eye | 1d1 damage, 10 XP | 0d0 damage, 5 XP |
| Centaur XP | 25 | 15 |
| Yeti XP | 35 | 50 |
| Umber hulk XP | 1000 | 130 |
| Color/stone/material init | strdup (allows duplicates) | used[] array (no duplicates) |
| Source structure | ~24 .c files, K&R style | +mdport.c/h, state.c, xcrypt.c |
| Type system | `bool` typedef | `int` for all booleans |
| Curses | Direct `#include "curses.h"` | Through mdport.h abstraction |

## Phase 1: C Harness Rebuild

### 1A. Copy upstream source to patched directory

The Makefile should have a `setup` target:
```
make setup   # copies upstream/*.c *.h to patched/, applies patches
make         # builds rogue_harness
```

Files to copy from upstream:
- All `.c` and `.h` files
- Exclude: `Makefile`, `*.sln`, `*.vcproj`, `*.html`, `*.doc`, `*.cat`, `LICENSE.TXT`

### 1B. Adapt rogue_patch.h (cross-platform)

The patch header must work on both macOS and Linux.  It injects overrides
via `-include rogue_patch.h` at compile time.

**Strategy**: Instead of `#define rand()` which conflicts with system headers,
use linker-level symbol interposition:

```c
// rogue_patch.h

// 1. RNG override: The game uses the RN macro (rogue.h:43) which reads/writes
//    the global `seed` variable directly.  The harness controls `seed` to
//    inject deterministic RNG.  No rand/srand override needed — RN doesn't
//    use them.  The only call to srand() is in main() during initialization.
//    We rename main→game_main via harness_rename.h, so the harness controls
//    initialization including srand.

// 2. Exit override: redirect exit() to harness for session capture
extern void harness_exit(int status);
#define exit(s) harness_exit(s)

// 3. Signal override: disable signal handlers (harness manages lifecycle)
//    Use a function-style macro that works with system header declarations.
#define md_onsignal_exit()   ((void)0)
#define md_onsignal_autosave() ((void)0)

// 4. Crypt: not needed for harness (wizard mode unused)
//    Override md_crypt to skip password hashing.
```

**Key insight**: RRP uses `mdport.c` for all system-specific code.  Instead of
overriding libc functions (rand, signal), we override the `md_*` abstraction
layer.  This is cleaner and avoids header conflicts:
- `md_readchar()` → harness keystroke injection (via hack_curses.c)
- `md_getpid()` → return 0 (deterministic)
- `md_onsignal_*` → no-ops
- `md_crypt()` → passthrough (no wizard mode in harness)

### 1C. Adapt curses.h (fake curses)

The existing fake `curses.h` needs updates for RRP:
- RRP declares `WINDOW *cw, *mw, *hw` in rogue source (not in curses.h)
- RRP uses `getmaxx()`, `getmaxy()`, `keypad()` — add stubs
- RRP's `rogue.h` includes `"curses.h"` then `"machdep.h"` then `"mdport.h"`
- Must handle `mdport.h`'s `#include <crypt.h>` — either stub it or
  define `HAVE_CRYPT 0`

### 1D. Adapt Makefile

New source files to compile:
- `mdport.c` — portability layer (compile with harness overrides)
- `state.c` — save/restore (compile normally)
- `xcrypt.c` — not needed (compile stub or skip)

Build flow:
```
make setup     →  cp upstream/*.c upstream/*.h upstream/machdep.h .
make           →  compile all .c with harness patches, link
make clean     →  rm *.o rogue_harness
```

### 1E. Handle RNG

RRP's RNG is the `RN` macro in `rogue.h`:
```c
#define RN (((seed = seed*11109+13849) & 0x7fff) >> 1)
```

This is a direct LCG on the global `seed` variable.  The harness controls
`seed` at initialization via the `SEED` env var (already supported by RRP's
main.c).  `rnd()` and `roll()` are in `main.c` and use `RN`.

For RNG logging, the harness wraps `rnd()`:
- Option A: `#define rnd(x) harness_rnd(x)` in rogue_patch.h
- Option B: Compile a modified `main.c` with logging in rnd()

Option A is cleaner.  `harness_rnd(x)` calls the original `RN` macro,
logs the result, and returns it.  The `RN` macro is available because
`rogue.h` is included by all game files.

**Problem**: `RN` macro uses `seed` which is declared `extern int seed` in
rogue.h and defined in init.c.  The harness must access this same variable.
Since the harness compiles without game headers, it must `extern int seed;`
explicitly.

### 1F. Verify build on macOS and Linux

Test:
```bash
# macOS
cd rogue/rogue-c/patched && make setup && make

# Linux (quadro)
ssh quadro 'cd /path/to/rogue/rogue-c/patched && make setup && make'
```

## Phase 2: Re-record Sessions

### 2A. Record fresh reference sessions

```bash
cd rogue/rogue-c/patched
python3 run_session.py --seed 10001 --keys "..." --out ../../test/sessions/seed10001.json
```

The move sequences need adjustment because:
1. Strength 16 vs 18/XX changes combat outcomes
2. Different item assignments (no duplicate colors/stones)
3. Different dungeon layouts (RNG stream shifted by init changes)

### 2B. Session design for coverage

Current: 22 sessions with ~100% coverage.  Goal: maintain near-100%
coverage with minimal sessions.

Coverage areas:
- Movement (corridors, rooms, doors, passages)
- Combat (melee, ranged, monster specials)
- Items (potions, scrolls, rings, wands, weapons, armor)
- Rooms (dark, treasure zoo, gone)
- Traps (all types)
- Dungeon features (stairs, gold, food)
- Special monsters (mimic, nymph, leprechaun, rust monster, etc.)

Strategy: Use `rogue/scripts/run-rogue-tests.sh` to run sessions and check
coverage.  Adjust move sequences iteratively until coverage targets are met.

### 2C. Validate parity

For each session:
```bash
node rogue/test/test_session.js test/sessions/seedNNNN.json
```

Check: RNG matches (100%), screen matches (100%).

## Phase 3: Verify JS Parity

### 3A. Run all session tests

```bash
bash rogue/scripts/run-rogue-tests.sh
```

### 3B. Check coverage report

```bash
node rogue/scripts/pes_report.mjs
```

Target: all sessions at 100% screen parity.

### 3C. Fix any remaining JS differences

The RRP source may have minor behavioral differences beyond the DBM changes:
- `init_colors`/`init_stones`/`init_materials` RNG consumption differs
  (used[] array rejection loops consume more RNG calls)
- `state.c` save/restore may affect session boundaries
- `mdport.c` abstractions may change I/O timing

---

## Critique

### What's good about this plan

1. **Clean separation**: Submodule for upstream, patched/ for harness.
   Easy to pull upstream updates.
2. **Cross-platform**: Using mdport.c overrides instead of libc macros
   avoids macOS/Linux header conflicts.
3. **Incremental**: JS changes already pushed and live.  C harness and
   sessions can follow independently.

### What's risky

1. **RNG interception**: The `RN` macro is inlined everywhere via rogue.h.
   `#define rnd(x) harness_rnd(x)` only catches `rnd()` calls, not
   direct `RN` uses.  Need to verify no game code uses `RN` directly
   outside of `rnd()`/`roll()`.

2. **used[] array changes RNG consumption significantly**: The old init
   consumed exactly N random calls for N items.  The new init may consume
   2N or more due to rejection sampling.  This shifts the entire RNG
   stream for the rest of the game.  All 22 sessions MUST be re-recorded —
   no partial fixes possible.

3. **mdport.c complexity**: The portability layer abstracts signals, file
   locking, terminal control, password hashing.  The harness must stub
   ALL of these.  Missing a stub will cause link errors or runtime crashes.

4. **state.c references curses internals**: The save/restore code
   serializes WINDOW contents.  Our fake curses must provide compatible
   WINDOW structures or state.c must be stubbed out.

5. **Session coverage may degrade**: With different RNG streams, the
   hand-crafted move sequences may no longer exercise the intended code
   paths.  Coverage restoration is the most labor-intensive phase.

### Mitigations

- For risk 1: `grep -c 'RN' *.c` to verify RN usage.  If only in
  rnd()/roll(), we're safe.
- For risk 2: Accept this — it's the correct behavior.
- For risk 3: Start with a minimal harness (no save/load, no signals,
  no file locking) and add stubs as link errors arise.
- For risk 4: Compile state.c but don't call rs_save_file/rs_restore_file
  in the harness path.
- For risk 5: Use automated selfplay or seed probing to find sessions
  that hit coverage gaps.

### Alternative approach considered

Instead of patching the upstream source, use the upstream Makefile directly
with `-lcurses` and run in a tmux harness (like the NetHack C harness).
**Rejected** because: (a) the fake curses approach gives deterministic
screen capture without tmux timing issues; (b) RNG logging requires
source-level instrumentation that tmux can't provide.

## Estimated Effort

| Phase | Task | Estimate |
|-------|------|----------|
| 1A | Setup script | 15 min |
| 1B | rogue_patch.h | 30 min |
| 1C | curses.h updates | 30 min |
| 1D | Makefile | 15 min |
| 1E | RNG logging | 30 min |
| 1F | Build & test | 30 min |
| 2A | Record sessions | 2 hours |
| 2B | Coverage tuning | 2-4 hours |
| 2C | Parity validation | 1 hour |
| 3A-3C | JS fixes | 1-2 hours |
| **Total** | | **8-10 hours** |
