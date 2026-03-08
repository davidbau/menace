# seed033 UX Agent Findings (2026-03-08)

## Context
- Agent: agent:ux (working on js/hack.js + js/allmain.js travel mechanics)
- Baseline: 33/34 gameplay passing, seed033 failing

## Key Finding 1: Travel Multi-Loop Mechanism

C's `dotravel_target()` (cmd.c:5115-5143) sets `multi = max(COLNO, ROWNO)` (~80),
`context.run = 8`, and `context.mv = TRUE`. This makes the **entire travel run**
execute as a multi-step movement within one command boundary. C's `moveloop_core`
(allmain.c:527-530) checks `context.mv` and calls `domove()` directly.

JS was processing only ONE travel step per keystroke because `dotravel_target` didn't
set these fields. Fixed by adding them and modifying `run_command`'s multi loop.

## Key Finding 2: Room Size Parity Bug

**Root cause of remaining seed033 divergence**: JS generates the room one column wider than C.

Map dump at travel target (51,4):
```
JS:  y=4 x=41-50: ROOM(25)  x=51: VWALL(1)
C:   y=4 x=36-49: floor     x=50: VWALL
```

The right wall is at x=51 in JS but x=50 in C. Room interior extends one extra column.
This causes:
- JS travel path goes to (50,4) before stopping; C stops at (49,4)
- Player position offset causes `distfleeck` event divergence (`near=1` vs `near=0`)
- Dog/pet distance calculations differ (`ud=10` vs `ud=5`)

This is likely an off-by-one in `js/mklev.js` room coordinate computation.

## Key Finding 3: C Travelmap Cycle Detection

C uses `gt.travelmap` (a selection bitmap) to track visited cells during travel.
When the BFS discovers the hero and the parent cell has been visited or IS the
target cell, C calls `nomul(0)` to stop travel. This prevents infinite loops
when the hero reaches a dead end adjacent to the travel target.

Implemented as `game._travelVisited` (a Set) in JS.

## Implemented Fixes (committed to main)
1. `dotravel_target` sets multi/run/mv/nopick matching C
2. `run_command` multi loop calls `domove()` directly when `ctx.mv` is set
3. `findtravelpath` checks parent-is-target and visited-cell conditions
4. GUESS mode uses Chebyshev distance (`distmin`) with `dist2` tiebreaker
5. `end_running` clears `_travelVisited` and `ctx.mv`

## Results
- 33/34 maintained, no regressions
- seed033 screen matched: 470/1417 (was 469/1417)
- Next frontier: room size parity bug in map generation (separate issue needed)
