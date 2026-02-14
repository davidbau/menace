# Arc Quest Parity Checkpoint (2026-02-14)

## What changed

- Regenerated C quest reference session for seed 1 with RNG metadata:
  - `test/comparison/maps/seed1_special_quest.session.json`
- Updated quest handling in special-level comparison harness:
  - `test/unit/special_levels_comparison.test.js`
  - For quest levels, `rngRawCallStart` is used when it is strictly greater than
    `rngCallStart` (signal that raw start is the better generation anchor).
  - `preRngCalls` replay is now gated behind actual RNG-start usage.

## Runtime parity behavior retained

- `des.stair()` trap-clearing before stair placement remains in place.
- Stair depth guard behavior remains depth-aware via `levelDepth` fallback.

## Verified outcomes

- Arc comparison status improved:
  - `arc-strt`: pass
  - `arc-loca`: 2 terrain mismatches remain
  - `arc-goal`: improved from 11 mismatches to 9 mismatches
- Core green suites remain green:
  - `test/comparison/chargen.test.js`
  - `test/unit/seed1_gameplay_replay.test.js`
  - `test/unit/seed2_gameplay_replay.test.js`
  - `test/unit/seed3_gameplay_replay.test.js`
  - `test/unit/sp_lev.test.js`

## Confirmed C facts used for next steps

- C `l_create_stairway()` calls `mkstairs()` (not direct terrain write), so
  stair legality depends on `dunlev(&u.uz)` constraints in `mkstairs()`.
- Fresh C RNG logs for quest seed 1 show `flip_level_rnd` consumed two `rn2(2)`
  calls for each captured Arc level during `#wizloaddes` capture.

## Remaining gap

- Residual Arc diffs are concentrated in:
  - one missing stair placement in `arc-loca` and `arc-goal`
  - a small set of `CROSSWALL -> ROOM` deltas in `arc-goal`
- Next focus: align quest-level depth/context during special-level generation so
  `mkstairs` and post-flip/fixup behavior match C capture conditions exactly.
