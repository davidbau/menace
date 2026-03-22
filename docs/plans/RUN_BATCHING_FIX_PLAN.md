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

## Validation
1. seed032 RNG should increase from 7421/29881
2. Full suite 565/568 should not regress
3. Verify `lookaround()` handles all run-stop conditions (doors, engravings,
   monsters, corridor branches)
