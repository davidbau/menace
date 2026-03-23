# Run Batching Fix Plan

## C Architecture (Comprehensive)

C's game loop is `moveloop()` → `for(;;) { moveloop_core(); }`.

Each call to `moveloop_core()` does exactly ONE of:
1. Occupation step (eating, lock-picking, etc.) — lines 476-509
2. Positive-multi movement (run/travel) — lines 519-530
3. Positive-multi non-movement (counted command) — lines 531-534
4. Fresh command (multi==0) — line 540: `rhack(0)`

For **running** (shift+direction), the flow across multiple `moveloop_core` calls:

**First call** (initiated by player pressing 'L'):
- `multi == 0` → falls to `rhack(0)` (line 540)
- `rhack(0)` reads key 'L', dispatches as DOMOVE_RUSH
- Inside rhack (cmd.c:3563-3572):
  - Sets `multi = max(COLNO, ROWNO)` = 80
  - Sets `context.mv = TRUE`
  - Calls `domove()` — ONE move in the run direction
  - Returns
- Back in moveloop_core: `deferred_goto()`, `vision_recalc()`, then **returns**
- Turn-end processing runs (monster turns, hunger, etc.)
- `moveloop()` loops back to `moveloop_core()`

**Second call** (continuation):
- `multi > 0` → enters positive-multi path (line 519)
- `lookaround()` — checks for visible monsters, corridor branches, doors, etc.
  - May clear `multi` to stop the run
- `runmode_delay_output()` — display refresh (no RNG)
- If multi cleared: `context.move = 0`, return
- `context.mv` is TRUE → movement path (line 527):
  - `multi < COLNO && !--multi` → decrement, end if 0
  - `domove()` — next move in saved direction
- **Returns**
- Turn-end processing runs again
- Loop continues

**Key C properties:**
- Each run step = one `moveloop_core()` call
- `lookaround()` runs BEFORE `domove()` in continuation
- `domove()` uses saved direction from `u.dx, u.dy` (set on first move)
- `multi` decremented BEFORE `domove()` in continuation
- Turn-end (monster turns) runs between EVERY step

## Current JS Architecture

JS has TWO run mechanisms that conflict:

### 1. `do_run()` in hack.js (lines 1549-1637)
- Has its own `while(steps < 80)` loop
- Each iteration: `domove(runDir)` → `advanceRunTurn` → `lookaround`
- Runs ALL moves before returning to `run_command`
- Order is reversed from C: domove THEN lookaround (C does lookaround THEN domove)

### 2. `runMovementRepeatSlice()` in allmain.js (lines 892-928)
- Called by `_gameLoopStep` when `hasPositiveMoveContinuation`
- Each call: `lookaround` → `--multi` → `domove([0,0])` → `advanceTimedTurn`
- Does ONE move and returns (matches C's single-moveloop_core pattern)
- Order matches C: lookaround THEN domove

### 3. `_gameLoopStep()` continuation in allmain.js
- `hasPositiveMoveContinuation = multi > 0 && context.mv`
- Calls `runMovementRepeatSlice()` then **returns** (yields to replay)
- **BUG**: After a fresh command (line 2718), `_gameLoopStep` returns even when
  `hasPositiveMoveContinuation` is true, because the return condition at
  line 2718-2720 doesn't check for positive-multi.

## The Gap

`do_run()` batches all moves internally. It should instead:
1. Do ONE move (like C's first `rhack` call)
2. Set `multi`, `context.mv`, `context.run` for continuation
3. Return `tookTime: true`
4. Let `_gameLoopStep` handle continuation via `runMovementRepeatSlice`

`_gameLoopStep` needs a fix to NOT return after a fresh command when
`hasPositiveMoveContinuation` is true (line 2718-2720).

`runMovementRepeatSlice` already matches C's continuation logic.

## The Fix (3 changes)

### Change 1: `do_run()` → one move and return
```javascript
// Set up run state (matches C's rhack DOMOVE_RUSH)
ctx.run = runModeValue;
ctx.mv = true;
if (!game.multi) game.multi = Math.max(COLNO, ROWNO);

// Execute ONE domove (matches C's rhack → domove)
const result = await domove(runDir, player, map, display, game);

// If first move failed, clean up
if (!result.moved || ctx.run === 0) {
    ctx.run = 0; game.multi = 0;
    return { moved: result.moved, tookTime: result.tookTime };
}

// Return — DON'T clear ctx.run/mv/multi
// Continuation via _gameLoopStep → runMovementRepeatSlice
return { moved: true, tookTime: true };
```

### Change 2: `_gameLoopStep` return condition
```javascript
// Line 2718: add positive-multi check
const hasPositiveMultiMv = this.multi > 0 && this.context?.mv;
if (!hasNegativeMulti && !hasOccupation && !hasPositiveMultiMv) {
    return;
}
```

### Change 3: `run_command` advanceRunTurn hook
- `do_run` no longer uses the hook (one move only)
- Either remove the hook setup, or gate it so it only applies when
  `do_run` returns with continuation pending
- `finalizeTimedCommand` at line 790 handles the first turn-end

## Progress and Findings (March 22, 2026)

### Completed
- **Comparator fix**: trailing tolerance removed (was hiding JS-shorter gaps).
  seed032 honestly reports 7421/29881 (25%).
- **Travel batching fixed**: `runAcceptedTravelCommandLoop` no longer loops.
- **Direction fix**: `runMovementRepeatSlice` now passes `[player.dx, player.dy]`
  for running (was `[0,0]` = no movement). Committed.
- **runMovementRepeatSlice restructured**: now matches do_run's ordering
  (domove → turn-end → checks → lookaround). Committed.
- **Spell FOV guard**: prevents crash when spell menu renders with null FOV.

### The Double Turn-End Problem
When `do_run` is changed to do ONE move:
1. `do_run` calls `game.advanceRunTurn()` (hook set by `run_command` line 755)
   → processes turn-end for the first move
2. `do_run` returns `tookTime: true`
3. `run_command` calls `finalizeTimedCommand` → `advanceTimedTurn` → **second
   turn-end for the same move**

With the old `tookTime: hasRunTurnHook ? false : timedTurns > 0` return, this
was avoided because `tookTime: false` skipped `finalizeTimedCommand`. But then
the continuation in `_gameLoopStep` uses `runMovementRepeatSlice` which calls
`advanceTimedTurn` directly — and this produces RNG that doesn't match `do_run`'s
hook-based approach (divergence at index ~2846).

### Root Cause of Continuation Divergence
The first move's turn-end goes through `game.advanceRunTurn` (hook path).
The continuation's turn-end goes through `advanceTimedTurn` (direct call).
Even though they call the same underlying function, the CALLING CONTEXT differs:
- Hook path: called from inside `do_run`, before `run_command` returns
- Direct path: called from `runMovementRepeatSlice`, after `_gameLoopStep` looped

The game state may differ subtly between these two points (e.g., `run_command`
cleanup code runs between them).

### Fix Approach (Next Step)
Make the first move NOT use the hook. Instead:
1. `run_command`: do NOT set `game.advanceRunTurn` before calling `do_run`
   (or clear it before the call)
2. `do_run`: with no hook, the first move does domove but NO turn-end
3. `do_run`: returns `tookTime: true`
4. `run_command`: calls `finalizeTimedCommand` → `advanceTimedTurn` (first turn-end)
5. `run_command`: returns with multi > 0, context.mv = true
6. `_gameLoopStep`: continuation → `runMovementRepeatSlice` → domove +
   advanceTimedTurn (second move's turn-end)

This ensures BOTH the first and continuation turn-ends go through the same
`advanceTimedTurn` path, eliminating the divergence.

### Attempted: Remove Hook + Route Through finalizeTimedCommand
- Removed `game.advanceRunTurn` setup in `run_command`
- `do_run` returns `tookTime: true`, goes through `finalizeTimedCommand`
- Result: 3140/29881 — WORSE than baseline (7421)
- Also tried routing through `runAcceptedTravelCommandLoop` — same result

### Attempted: Skip --More-- Dismiss During Run Continuation
- Added `!hasPositiveMoveContinuation` guard to `--More--` dismiss
- No effect — the dismiss wasn't firing anyway

### Root Cause of Unbatching Failure
Something in `_gameLoopStep`'s loop mechanics (renderAndAutosave, state between
iterations, --More-- boundary handling) changes game state compared to do_run's
tight inner loop. The exact divergence at index ~2939 shows JS pet and C pet
at different processing stages, indicating turn-end ordering or monster processing
differs.

**The gap is NOT in the turn-end function itself** (both paths call
advanceTimedTurn → moveloop_core). The gap is in WHEN and HOW game state is
observed between iterations of the run.

### Current Status
- `runMovementRepeatSlice` restructured to match do_run ordering (committed)
- Direction fix for running continuation (committed)
- Spell FOV guard (committed)
- Comparator trailing tolerance fix (committed)
- do_run unbatching: NOT yet working
- **Corridor direction persist**: added `player.dx/dy` update from
  `lookaround.nextDir` in `runMovementRepeatSlice`. Didn't fix divergence
  (first run is straight, no turning needed).
- **continue vs return**: changing `_gameLoopStep` from `return` to `continue`
  after `runMovementRepeatSlice` (batching within while loop) still diverges
  at 2938, same as yielding. This proves the issue is INSIDE
  `runMovementRepeatSlice` itself, not in the inter-iteration mechanism.
- **Key finding**: Basic RNG (rn2/rnd/rn1) matches C perfectly (7421/7421).
  But COMPOSITE RNG (rnl/rne/rnz/d) differs: JS has 23, C has 53. These
  are spell/damage dice rolls that JS isn't executing. The comparator
  filters composites, hiding this real gameplay divergence.
- **Root cause**: The game stops producing basic RNG at index 7421 not
  because of run batching, but because the game state diverged through
  missing composite RNG calls (fewer combat/spell operations in JS).
- **ROOT CAUSE FOUND**: getpos.js doesn't handle '>' key (jump to downstairs).
  C's getpos jumps cursor to downstairs when '>' is pressed during travel
  target selection. JS treats '>' as unrecognized, so the travel target is
  wrong. Player travels to the wrong position. The subsequent '>' (descend
  stairs) fails because the player isn't standing on stairs. JS never
  generates Dlvl:2/3, so 75% of C's game (combat, spawns, level generation)
  never executes.
- **Fix**: Add '>' (and '<') stair-jump handling to getpos_async in getpos.js,
  matching C's getpos_menu stair target selection.

## Session 30 Progress (March 22, 2026)

### Travel Termination Fixes (COMMITTED)
Three fixes for travel reaching its target:
1. Clear stale travelPath before findtravelpath in domove_core
2. Guard _gameLoopStep's travel fallback on context.travel
3. Change _gameLoopStep positive-multi continuation from `return` to `continue`

**seed032: RNG 25% → 43% (7421 → 12789/29881), screens 42 → 186/664.**

### xname Poisoned Prefix (COMMITTED)
C's xname() adds "poisoned" for weapons with opoisoned. JS had this only in
doname(). Fixed: moved prefix from doname to xname_for_doname. Affects
cxname_singular sorting in pickup menus. No regressions.

### Remaining seed032 Divergence (index 12532)
JS `rn2(7)=1` (fumble check in throwit) vs C `rnd(20)=18` (hit check in
thitmonst). The thrown dart (invlet 'r') is cursed in JS but not in C.

Investigation ruled out:
- Object ordering in place_object/objectsAt (reversal caused 38 regressions)
- xname poisoned prefix (fixed but didn't change invlet assignment)
- Pickup menu sort order (both JS and C produce same sort)
- RNG divergence (12532 entries match perfectly)

Likely cause: the two poisoned darts are assigned invlets in opposite order
because of a subtle difference in the creation or placement sequence. Both
darts were created during level generation with identical RNG, but the
physical dart assigned to invlet 'r' differs. Needs further investigation
of the level generation object placement order.

### Fog Cloud Gas Regions — SOLVED (seed032 step 279 → step 280)
**Root cause**: `themerms.lua` line 68 calls `des.gas_cloud({ selection = fog })`
which creates a permanent visible gas region via `create_gas_cloud_selection()`.
JS stored the data in `gasClouds[]` but never created the actual NhRegion.

**Fix**: Added `create_gas_cloud_selection_mklev()` — lightweight version that
creates the region without display side effects (block_point/newsym) that would
consume RNG during level gen. seed032 RNG 68% → 71%.

### Level Restore Monster Loop (seed032 step 280, index 18643)
New divergence: JS `rn2(10) @ changeLevel` vs C `rnd(10) @ getlev(restore.c:1212)`.
C's `getlev()` runs a monster restoration loop when returning to a previously
visited level: `restore_cham()`, `hide_monst()` (gated by `rnd(10)` for elapsed
time). JS doesn't have this loop — `restore_cham` and `hide_monst` exist in
mon.js but are never called during level transitions.

**Next step**: Implement the restore monster loop in JS's `changeLevel` (do.js),
calling `restore_cham` and `hide_monst(rnd(10))` for each monster when restoring
a saved level. This is the C ref at `restore.c:1196-1214`.

Previously documented C-side diagnostic suggestion (now unnecessary):
```c
// In monmove.c m_everyturn_effect(), inside the PM_FOG_CLOUD block:
event_log("fog_everyturn[%d@%d,%d cd=%d vr=%d]",
          monsndx(mtmp->data), x, y,
          closed_door(x, y), visible_region_at(x, y) ? 1 : 0);
```

## Validation
1. seed032 RNG increased from 7421 to 21425/31707 (68%) ✓
2. Full suite 565/568 did not regress ✓
3. Verify `lookaround()` handles all run-stop conditions (doors, engravings,
   monsters, corridor branches)
