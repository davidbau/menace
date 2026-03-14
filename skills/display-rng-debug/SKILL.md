---
name: display-rng-debug
description: Use this skill to debug display PRNG divergences — hallucinated monster/object names, glyph randomization differences between C and JS during hallucination.
---

# Display RNG Debugging

## When To Use
Use this when hallucination-related screen mismatches occur — wrong
hallucinated monster/object names, shifted display RNG streams. These
show up as screen-only failures with RNG and events passing:
```
✗ session  ✓ 818  ✓ 818  ✗ 723/818  screen row 0, 'bust vortex' instead of 'schroedinbug'
```

## Background
NetHack uses a separate ISAAC64 RNG stream (`rn2_on_display_rng`) for
hallucination randomization. During hallucination, `newsym()` calls
`random_monster()` / `random_object()` which consume this display RNG
to pick randomized glyphs. C and JS must consume the same number of
display RNG calls at the same points for the hallucinated names to match.

Common divergence causes:
- **Extra `newsym()` calls** — JS's `docrt()` in `renderAndAutosave` or
  `display_sync()→renderMap` re-renders all cells, consuming display RNG
  that C's `flush_screen` doesn't (C uses buffered glyphs).
- **Missing `see_objects()`/`see_traps()`** — C's `allmain.c:456-458`
  calls all three display refresh functions when hallucinating. JS may
  only call `see_monsters`.
- **Per-cell cache misses** — `getCachedMapCell()` returns null when
  `_displayCellStepIndex` doesn't match the current step, causing an
  extra `newsym()` call.

## Display RNG Logging

Both C and JS can log display RNG calls interleaved with game RNG.

### JS Side
Set environment variables before running the session:
```bash
RNG_LOG_DISP=1 node test/comparison/session_test_runner.js ...
```
Optional: `RNG_LOG_DISP_CALLERS=1` adds caller stack tags.

Display RNG entries appear in the RNG log as:
```
~drn2(383)=157 @ randomMonsterGlyph
```
The `~` prefix distinguishes them from game RNG entries (`rn2(...)`).

### C Side
Set `NETHACK_RNGLOG_DISP=1` when recording sessions:
```bash
NETHACK_RNGLOG_DISP=1 python3 test/comparison/c-harness/rerecord.py <session.json>
```
C entries use the same format: `~drn2(383) = 157 @ newsym(display.c:305)`

### Re-recording with Display RNG
To get a C session with display RNG data for comparison:
```bash
# Re-record a session with display RNG logging enabled
NETHACK_RNGLOG_DISP=1 python3 test/comparison/c-harness/rerecord.py \
    test/comparison/sessions/coverage/.../session.json
```

## Debugging Workflow

1. **Identify the first screen divergence step** from the PES report or
   session test output (e.g., step 723).

2. **Enable display RNG logging** and replay just the failing session:
   ```bash
   RNG_LOG_DISP=1 node test/comparison/rng_step_diff.js <session> --step 723 --window 5
   ```

3. **Compare display RNG entries** between C session data and JS replay.
   Look for the first `~drn2(...)` entry that differs — this tells you
   which `newsym()` call consumed an extra or missing display RNG value.

4. **Trace the caller** using the `@ tag` to identify which code path
   made the extra/missing call. Common culprits:
   - `docrt_flags` → `newsym` on every cell (in `renderAndAutosave`)
   - `renderMap` → `newsym` on every cell (in `display_sync`)
   - `see_monsters` → `newsym` on each monster position
   - `see_objects` → `newsym` on each object position
   - `see_traps` → `newsym` on each trap position

5. **Fix** by either:
   - Removing the extra `newsym` call
   - Adding a per-step cache to prevent double consumption
   - Skipping `docrt`/`renderMap` during hallucination when display is
     already up-to-date

## Key Code Locations
- `js/rng.js:384` — `rn2_on_display_rng()` with logging
- `js/display_rng.js:13` — `randomMonsterGlyph()` consumes display RNG
- `js/display_rng.js:25` — `randomObjectGlyph()` consumes display RNG
- `js/display.js:96` — `getCachedMapCell()` per-step cell cache
- `js/display.js:2143` — `docrt_flags()` calls newsym on every cell
- `js/headless.js:1445` — `renderMap()` calls newsym on every cell
- `js/origin_awaits.js:32` — `display_sync()` calls renderMap
- `js/allmain.js` — `advanceTimedTurn` calls see_monsters/see_objects/see_traps

## Relevant Comparator Behavior
The session comparator (`comparators.js`) does NOT filter `~drn2` entries.
If present in both C and JS logs, they will be compared directly. The
comparator currently only compares the main game RNG channel; adding a
`display_rng` channel would require extending `comparators.js` and the
`session_test_runner.js` to track display RNG separately.

## Current Status
- **potionmix2** and **potprayspell** sessions fail with hallucination
  display RNG divergence (screen-only; RNG and events pass).
- Root cause: JS's `renderMap`/`docrt` makes extra `newsym` calls that
  consume display RNG. C's `flush_screen` outputs buffered glyphs with
  no additional RNG calls.
- The per-step cell cache (`getCachedMapCell`) prevents double consumption
  within a single step but doesn't cover cross-step docrt calls.
