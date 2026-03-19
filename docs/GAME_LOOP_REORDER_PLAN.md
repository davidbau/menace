# Game Loop Reorder Plan

## Problem

JS and C process commands in different order within the game loop, causing
step boundary divergences in seed031/032/033.

## C's Actual Structure

C's `moveloop_core()` is one function called in a `for(;;)` loop. Each
iteration handles ONE game tick:

```c
void moveloop_core(void) {
    // PHASE A: Bookkeeping
    dobjsfree(); clear_bypasses(); ...

    // PHASE B: Monster turn (conditional on context.move)
    if (context.move) {
        // Monsters act
        movemon();
        // New turn setup: mcalcmove, spawn, moves++
        // Once-per-turn: regen, hunger, timeout, exercise, etc.
    }

    // PHASE C: Pre-input preparation
    find_ac(); vision_updates(); bot(); curs_on_u();
    context.move = 1;  // optimistically assume next cmd takes time

    // PHASE D: Active occupation (digging, eating, etc.)
    if (multi >= 0 && occupation) {
        (*occupation)();  // run one occupation step
        return;           // loop back → monsters → occupation again
    }

    // PHASE E: Multi-repeat (counted commands like "20s")
    if (multi > 0) {
        multi--;
        rhack(cmd_key);   // re-dispatch same command, no new input
        return;           // loop back → monsters → repeat again
    }

    // PHASE F: Fresh command
    if (multi == 0) {
        rhack(0);         // nhgetch() + dispatch new command
    }

    // PHASE G: Post-command cleanup
    deferred_goto(); vision_recalc(); display_update();
}
```

Key structural points:
1. `moveloop_core` is on the callstack for EVERYTHING
2. Occupation and multi-repeat DON'T read new input — they dispatch
   and return, letting the outer loop run monsters before the next step
3. `context.move` is set to 1 by default, cleared to 0 by untimed commands
4. `rhack(0)` calls `nhgetch()` internally — blocking in C, async in JS

## JS's Current Structure

```javascript
// Called per-key from event loop
_gameLoopStep() → nhgetch() → runOneCommandCycle() → run_command()

run_command() {
    promptStep()           // handle pending prompts
    rhack()                // dispatch command
    finalizeTimedCommand() // monsters + turnend (WRONG POSITION)
    repeatLoop()           // multi-repeat loop (WRONG PATTERN)
    postRender()
}
```

Problems:
1. Monsters run AFTER the command (C runs them BEFORE)
2. `repeatLoop` loops within `run_command` instead of returning to the
   outer loop (C returns from moveloop_core to let the for-loop iterate)
3. Occupation draining also loops within `run_command`

## Target JS Structure

Match C's `moveloop_core` as closely as possible:

```javascript
async _gameLoopStep() {
    // This IS moveloop_core — one iteration per call

    // PHASE A: Bookkeeping
    dobjsfree(); clear_bypasses(); ...

    // PHASE B: Monster turn (if context.move from previous command)
    if (game.context.move) {
        await movemon();
        await processTurnEnd();  // mcalcmove, spawn, regen, hunger...
    }

    // PHASE C: Pre-input preparation
    find_ac(); vision(); display_sync();
    game.context.move = true;

    // PHASE D: Active occupation
    if (game.multi >= 0 && game.occupation) {
        await game.occupation();
        return;  // loop back for monsters
    }

    // PHASE E: Multi-repeat
    if (game.multi > 0) {
        game.multi--;
        await rhack(game.cmd_key);
        return;  // loop back for monsters
    }

    // PHASE F: Fresh command
    if (game.multi === 0) {
        const ch = await nhgetch();      // async: yields to event loop
        await rhack(ch);                 // dispatch
    }

    // PHASE G: Post-command
    await deferred_goto();
    postRender();
}
```

The outer caller (`gameLoop`) calls `_gameLoopStep()` in a loop. Each call
is one `moveloop_core` iteration. The callstack during monsters is:
```
gameLoop → _gameLoopStep → movemon/processTurnEnd
```
During player action:
```
gameLoop → _gameLoopStep → rhack → domove/etc.
```
Both have `_gameLoopStep` (= `moveloop_core`) on the stack.

## Implementation Steps

### Step 1: Extract monster/turnend processing

Factor out the monster + turn-end code currently in `finalizeTimedCommand()`
into a standalone function `processTurnEnd()` that reads from game state
flags (like C's `context.move`) instead of receiving a result object.

### Step 2: Move monster processing to _gameLoopStep

Add PHASE B (monster turn) to the TOP of `_gameLoopStep()`, before
input reading. Guarded by `game.context.move`.

### Step 3: Remove finalizeTimedCommand from run_command

`run_command` no longer calls `finalizeTimedCommand` or `repeatLoop`.
Instead, commands that take time set `game.context.move = true` (which
it already does). The outer loop handles monsters.

### Step 4: Handle multi-repeat in _gameLoopStep

Move `repeatLoop` logic to PHASE E in `_gameLoopStep`. When `multi > 0`,
dispatch the same command without reading input, then return to let the
outer loop run monsters.

### Step 5: Handle occupation in _gameLoopStep

Move `_drainOccupation` logic to PHASE D in `_gameLoopStep`. When an
occupation is active, run one step and return.

### Step 6: Re-record all sessions

All per-step boundaries will shift. Re-record every session with the
current binary. Validate with the session-recording skill checklist.

## What NOT to do

- Do NOT use pending/deferred state objects
- Do NOT create continuation tokens
- Do NOT add async queues
- DO use game state flags (context.move, multi, occupation) — same as C
- DO match C's return-to-outer-loop pattern for occupation and multi
- DO keep moveloop_core on the callstack for both monsters and commands

## Verification

1. No currently-passing session should regress in rngFull
2. seed031/032/033 rngFull should improve (step boundaries now match C)
3. After re-recording, per-step comparisons should also match
4. The total RNG call count for every session should be unchanged

## Risk

HIGH — this restructures the core game loop. But:
- The flat RNG stream is unchanged (same calls in same order)
- The logic is unchanged (same code, just called from different position)
- Each step is independently testable
- We have re-recording infrastructure to update all sessions
