# Plan: Simplify nhgetch to match C

## Problem

JS's `nhgetch()` (input.js:516) does work that C's `nhgetch()` doesn't:

1. **Command queue popping** (`popQueuedInputKey`) — C does this in `parse()`
2. **Replay key injection** (`getNextReplayKey`) — C doesn't have this
3. **Command boundary --More-- handling** — C does this in `tty_clearmsg()`
4. **Repeat recording** (`cmdq_add_key(CQ_REPEAT)`) — C does this in `parse()`
5. **Canned command queue checking** — C does this in `moveloop_core()`

This complexity led to `nhgetch_display_raw` — a bypass function for `more()`
key reads. But `nhgetch_display_raw` is invisible to the replay system's input
wait detection, causing `more()` key consumption to not create step boundaries.

**Result**: JS has 74 steps for a session C records as 57 steps. The 17 extra
steps come from `nhgetch_display_raw` key reads that the replay system doesn't
track as separate steps.

## C's Model

In C, `nhgetch()` is a simple function:
```c
int nhgetch(void) {
    return tty_nhgetch();  // read one char from terminal
}
```

All the higher-level logic lives in the CALLERS:
- `parse()` in `cmd.c` handles count prefixes and command dispatch
- `tty_clearmsg()` handles `--More--` at command boundaries
- `moveloop_core()` handles canned command queues
- `more()` calls `nhgetch()` directly — same function, no bypass needed

## Target State

```javascript
// nhgetch should be as simple as C's:
export async function nhgetch() {
    // Check command queue first (matches C's cmdq_pop in parse)
    const queuedKey = popQueuedInputKey(cmdqInputModeDoAgain);
    if (Number.isFinite(queuedKey)) {
        recordKey(queuedKey);
        return queuedKey;
    }
    // Read from input runtime (matches C's tty_nhgetch)
    const ch = await nhgetch_raw();
    recordKey(ch);
    return ch;
}
```

Everything else moves to callers:
- **Command boundary --More--** → `_gameLoopStep` or `runOneCommandCycle`
- **Repeat recording** → `run_command` (already partially there)
- **Canned command queue** → `_gameLoopStep` (already partially there)
- **Replay key injection** → input runtime layer (already there via pushInput)

## Why This Fixes the Gate 2 Screen Regressions

With simplified `nhgetch`, `more()` calls the SAME `nhgetch` as commands.
The replay system monitors `nhgetch` → `nhgetch_raw` → `activeInputRuntime.nhgetch()`.
When `more()` blocks waiting for a dismiss key, the replay system detects the
block, captures the screen (showing the `--More--` message), and pushes the
next key. This creates a proper step boundary for `--More--` keys.

`nhgetch_display_raw` becomes unnecessary and can be removed.

## Why This Fixes the 74-vs-57 Step Count Mismatch

Currently JS produces 74 steps for a 57-step C session. The extra 17 steps
come from keys consumed by `nhgetch_display_raw` that bypass step tracking.
With unified `nhgetch`, every key consumption creates a step, matching C's
step count.

## Implementation Steps

### Step 1: Move command boundary logic out of nhgetch

The `commandBoundary` option and `--More--` handling at lines 569-606 move
to `runOneCommandCycle` in allmain.js (which already has similar logic).

### Step 2: Move repeat recording out of nhgetch

The `cmdq_add_key(CQ_REPEAT)` at line 551 moves to `run_command` (which
already does repeat recording at line 694-702).

### Step 3: Remove nhgetch_display_raw

Once `nhgetch` is simple, `nhgetch_display_raw` is identical to `nhgetch`
and can be removed. All callers use `nhgetch` directly.

### Step 4: Update display.setNhgetch

Change `setNhgetch(nhgetch_display_raw)` to `setNhgetch(nhgetch)` or
remove `setNhgetch` entirely since `more()` can import `nhgetch` directly.

### Step 5: Verify step counts match

Run the full session suite and verify JS step counts match C step counts.
Fix any remaining mismatches.

## Risk

**Medium-high.** `nhgetch` is called from many places. Moving logic to callers
requires verifying each caller still gets the behavior it needs. The command
queue and repeat recording logic is subtle.

**Mitigation:** do it on the Gate 2 branch, not main. The step boundary
changes from nhgetch simplification interact with the game loop reorder.

## First Attempt (March 20, session 27)

Stripped command boundary --More-- from nhgetch, moved to _gameLoopStep.
Result: 435/442 — 4 regressions (t04_s701, t08_s700, theme08_seed700,
theme22_1500). The --More-- boundary inside nhgetch is **load-bearing for
step alignment**. Moving it changes which key creates which step, causing
both screen AND RNG divergences.

The repeat recording (`cmdq_add_key(CQ_REPEAT)`) was initially removed
but needs to stay in nhgetch — extended commands that read sub-keys (like
#pray reading y/n) lose those keys from repeat recording otherwise.

**Key finding**: nhgetch_display_raw goes through the same
activeInputRuntime.nhgetch() as nhgetch_raw — so the replay system's
waitForInputWait/isWaitingInput DOES detect more() blocks. The 74-vs-57
step mismatch may have a different root cause than nhgetch_display_raw
bypassing detection. Needs further investigation.

## Revised approach

Do nhgetch simplification TOGETHER with Gate 2, on the gate2-phase-b branch.
Both changes affect step boundaries. Testing them separately causes
regressions that cancel when combined.

## Validation

1. `npm test` passes at 439/442 (no regressions on main)
2. Gate 2 branch with simplified nhgetch: hi15/hi17/t06 screen regressions fixed
3. JS step counts match C step counts for all sessions
4. `^more` events appear at the correct steps
