# Gate 2 Findings: Moving Timed-Turn Boundary

## Gate 0 Evidence (PROVEN)

**Session**: seed031_manual_direct
**First divergence**: step 411 (per-step count), step 492 (flat RNG value)
**Earliest shared owner**: command/monster boundary
**Conservation**: JS step 411 has 29 turn-end entries that appear identically (same values, same order) in C step 413. FULL conservation.
**Value integrity**: NO value mismatches in matched-count steps 1-410.
**Cannot be local gameplay bug**: identical entries, different step ownership.

## Gate 2 Attempt 1: Move advanceTimedTurn to top of run_command

### Approach
- Track `game.context.move` (boolean flag, like C)
- At TOP of `run_command`: if `context.move`, run `advanceTimedTurn`
- At BOTTOM: set `context.move = true` instead of calling `finalizeTimedCommand`
- Also moved initial turn-end to top of `repeatLoop`

### Result
161/442 gameplay passing (was 439). 31 new RNG failures.

### Root Cause of Regressions
`finalizeTimedCommand` does MORE than just `advanceTimedTurn`. It also:
1. `multi < 0` loop — paralysis tick processing (needs advanceTimedTurn each tick)
2. `_drainOccupation` — loops occupation steps with moveloop_core between each

Both consume RNG. When moved to a different position, the RNG sequence changes.

### Why Simple Movement Doesn't Work
The JS `finalizeTimedCommand` is a BUNDLED operation that combines:
- C's Phase B (monsters via advanceTimedTurn)
- C's multi < 0 handling (JS loop vs C's natural moveloop iterations)
- C's Phase D occupation (JS drains vs C does one step per iteration)

These are tightly coupled in JS but SEPARATE phases in C. Moving just
Phase B without also restructuring multi/occupation handling breaks the
RNG sequence because the occupation and multi loops call advanceTimedTurn
internally at different points.

### What's Actually Needed
The fix isn't "move advanceTimedTurn to the top." The fix is:
1. Replace `_drainOccupation` loop with C's one-step-per-iteration model
2. Replace `multi < 0` loop with C's natural moveloop iteration
3. THEN the advanceTimedTurn naturally moves to the top because it's
   Phase B of each moveloop_core iteration

This is the FULL restructure described in GAME_LOOP_REORDER_PLAN.md —
making `_gameLoopStep` behave like `moveloop_core`. It can't be done
incrementally by moving one piece at a time because the pieces are
coupled through shared RNG consumption.

## Recommendation

Gate 2 cannot be done as "move one boundary." The occupation drain and
multi < 0 loops are JS inventions that don't exist in C. They must be
replaced with C's iteration-based model FIRST, which is a larger
refactor but is the correct structural change.

The incremental path forward:
1. Replace `_drainOccupation` with single-step-per-iteration (small, testable)
2. Replace `multi < 0` loop with iteration-based handling (small, testable)
3. THEN move advanceTimedTurn to the top (should be clean after 1+2)
