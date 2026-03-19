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

## Self-Critique: Issues the Plan Must Address

### 1. Multi-key prompts (CRITICAL)

Many commands span multiple nhgetch calls: throw (item + direction), zap
(wand + direction), drop (class + item), eat (item), etc. In C, ALL
sub-prompt keys are consumed WITHIN one `moveloop_core` iteration:

```
moveloop_core → rhack → do_throw → getobj → nhgetch(BLOCKS for item)
                                  → getdir → nhgetch(BLOCKS for direction)
                                  → throwit
              → return
```

Monsters run once (before `rhack`). All sub-prompts happen during the SAME
iteration. But in JS, `nhgetch` is async — each sub-prompt key triggers a
SEPARATE `_gameLoopStep` call. If `_gameLoopStep` runs monsters at the top,
they'd run between sub-prompt keys (e.g., between item selection and
direction), which C never does.

**Required solution**: `context.move` must be `false` during sub-prompts.
When a command enters a prompt phase (e.g., "What do you want to throw?"),
`context.move` should be cleared so the next `_gameLoopStep` skips Phase B.
Only when the full command completes should `context.move` be set based on
`tookTime`. The current `promptStep` mechanism already prevents
`finalizeTimedCommand` from running during sub-prompts — the restructure
must preserve this guard.

### 2. Running/travel auto-movement

C handles running via `context.mv + multi > 0` in Phase E. Each running
step dispatches `domove()` and returns, letting the outer loop run monsters.
JS currently handles running via `advanceRunTurn` which loops WITHIN
`run_command`. This needs restructuring to match C's per-iteration model.

The plan mentions this in Step 4 but doesn't detail the `advanceRunTurn`
removal. Running must dispatch one `domove()` per `_gameLoopStep` call.

### 3. Occupation handling granularity

C runs ONE occupation step per `moveloop_core` iteration (line 604).
JS's `_drainOccupation` loops occupation steps. This must change to
one-step-per-iteration to match C.

### 4. context.move lifecycle

C sets `context.move = 1` at line 589 (Phase C) BEFORE dispatching. Then:
- Timed commands leave it as 1
- Untimed commands set it to 0 (varies by command)
- The NEXT iteration uses the value to decide whether monsters run

JS needs the same lifecycle. Currently `result.tookTime` is the signal.
The restructure should set `context.move = result.tookTime` after the
command finishes, or match C's pattern of setting it to 1 before dispatch
and having untimed commands clear it.

### 5. replay_core.js must also change

`replay_core.js` drives the game loop for session testing. It uses
`drainUntilInput` to process all RNG calls per step. The restructured
loop must work correctly with replay_core's step-boundary logic, or
replay_core needs matching changes.

### 6. The first iteration problem

At game start, `context.move` is false (no previous command). The first
`_gameLoopStep` call should skip Phase B and go directly to input. This
matches C (moveloop_preamble sets things up, first `moveloop_core`
iteration has `context.move = 0`). Verify this is correct.

### 7. postRender and screen capture timing

Currently `postRender` runs at the end of `run_command`. In the new
structure it runs in Phase G. But screen capture (`renderAndAutosave`)
happens in the CALLER after `_gameLoopStep` returns. The screen should
show: `[monsters from previous] + [player action]` — matching C's screen
at the `nhgetch` boundary. Verify this produces correct step-screens.

### 8. Re-recording scope

ALL sessions (120+) need re-recording. With `rerecord.py --all --parallel 8`
this takes ~30 minutes. Each re-recorded session must be validated per the
session-recording skill checklist. This is mechanical but large.

### 9. Incremental testing strategy

The plan should be executed incrementally:
- Step 1 alone (extract `processTurnEnd`) should not change behavior
- Step 2+3 together change step boundaries — test rngFull before re-recording
- Steps 4+5 (multi/occupation) can be deferred if they don't affect the
  3 failing sessions, reducing blast radius
- Step 6 (re-record) only after rngFull validation passes

## Risk

HIGH — this restructures the core game loop. Mitigations:
- The flat RNG stream is unchanged (same calls in same order)
- The logic is unchanged (same code, just called from different position)
- Each step is independently testable
- We have re-recording infrastructure to update all sessions
- Incremental execution reduces blast radius
- Multi-key prompt handling is the biggest risk — must be tested with
  throw/zap/drop/eat sessions specifically
