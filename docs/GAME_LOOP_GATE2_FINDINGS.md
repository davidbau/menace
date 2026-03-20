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
1. `multi < 0` loop — paralysis tick processing (needs `advanceTimedTurn` each tick)
2. `_drainOccupation` — loops occupation steps with `moveloop_core` between each

Both consume RNG. When moved to a different position, the RNG sequence changes.

### Why Simple Movement Doesn't Work
The JS `finalizeTimedCommand` is a bundled operation that combines:
- C's Phase B (monsters via `advanceTimedTurn`)
- C's `multi < 0` handling (JS loop vs C's natural `moveloop` iterations)
- C's Phase D occupation (JS drains vs C does one step per iteration)

These are tightly coupled in JS but separate phases in C. Moving just Phase B without also restructuring multi/occupation handling breaks the RNG sequence because the occupation and multi loops call `advanceTimedTurn` internally at different points.

### What Attempt 1 Proved
The fix is not “move `advanceTimedTurn` to the top.” The fix is:
1. replace `_drainOccupation` loop with C's one-step-per-iteration model
2. replace `multi < 0` loop with C's natural `moveloop` iteration
3. then `advanceTimedTurn` naturally moves to the top because it is Phase B of each `moveloop_core` iteration

This is the larger restructure described in [`docs/GAME_LOOP_REORDER_PLAN.md`](/share/u/davidbau/git/mazesofmenace/game/docs/GAME_LOOP_REORDER_PLAN.md): make the JS loop behave like C's iteration model rather than moving one boundary in isolation.

## Gate 2 Attempt 2: Naive One-Step `_gameLoopStep()` Continuations

### Exact C Observation
The core C observation is still correct:

1. `moveloop_core()` handles `gm.multi < 0` internally.
2. The occupation branch runs one callback and returns.
3. C does not use JS-style inner drain loops for those two cases.

### Tested Branch Shape
I tested the obvious next step in [`js/allmain.js`](/share/u/davidbau/git/mazesofmenace/game/js/allmain.js):

1. remove the `while (game.multi < 0)` loop from `finalizeTimedCommand()`
2. replace `_drainOccupation()` with a one-step helper
3. let `_gameLoopStep()` resume one timed iteration at a time

### Result
This regressed `seed031` immediately:

- first RNG divergence moved all the way back to step `28`
- JS first bad RNG:
  - `rnd(5)=4 @ maybe_smudge_engr(hack.js:436)`
- C first bad RNG at the same point:
  - `rn2(5)=3 @ distfleeck(monmove.c:539)`

Measured result from the failed experiment:

- [`seed031_manual_direct.session.json`](/share/u/davidbau/git/mazesofmenace/game/test/comparison/sessions/seed031_manual_direct.session.json)
  - `rng=7173/51561`
  - `events=640/28950`

So the flat RNG stream was not preserved by simply returning from `_gameLoopStep()` after each continuation iteration.

## Exact Counterexample

Session:

- [`test/comparison/sessions/seed031_manual_direct.session.json`](/share/u/davidbau/git/mazesofmenace/game/test/comparison/sessions/seed031_manual_direct.session.json)

Failing keyed step:

- step `28`
- key `"s"`

Evidence from `movement-propagation` on the current authoritative session:

- C step 28 contains multiple occupation-return bundles:
  - repeated `^distfleeck[...]`
  - repeated `^dog_goal_*[...]`
  - repeated `>runmode_delay_output @ moveloop_core(allmain.c:615)`
- all of those still belong to the same keyed step `"s"`

Relevant C stack on the first regressed RNG mismatch:

- `cmd_safety_prevention @ do.c:2317`
- `monster_nearby @ moveloop_core(allmain.c:611)`
- `runmode_delay_output @ moveloop_core(allmain.c:615)`

This is the C occupation-return path.

## What Attempt 2 Proved

Today, `_gameLoopStep()` is still too close to a key-owned replay step.

That means:

1. one `_gameLoopStep()` return is not just “one C outer loop iteration”
2. it is also part of the current replay/session ownership model
3. C can perform several `moveloop_core()` iterations without consuming a new gameplay key, and those iterations still belong to the same keyed step

So the statement

- “run one iteration, return, let the outer loop call `_gameLoopStep()` again”

is only safe if the outer layer preserves the same keyed-step ownership.

Current JS does not.

More precisely, current replay ownership lives at the promise boundary in
[`js/replay_core.js`](/share/u/davidbau/git/mazesofmenace/game/js/replay_core.js):

1. replay pushes one key
2. replay starts exactly one `_gameLoopStep()` promise
3. replay drains that promise until it blocks waiting for input

So a single key step can still own multiple no-input iterations, but only if
those iterations stay inside one `_gameLoopStep()` lifetime. Returning from
`_gameLoopStep()` hands ownership back to replay and ends the keyed step.

This is why the naive refactor regressed:

- the one-step helpers themselves were not the problem
- returning after each continuation iteration was the problem

That also means there is a viable next implementation target:

- keep the one-step helpers
- but move continuation ownership into an internal loop inside
  `_gameLoopStep()` or an equivalent wrapper above `runOneCommandCycle()`
- do not expose continuation iterations as separate top-level `_gameLoopStep()`
  returns

## Practical Implication

Do not land Gate 2 as:

1. `_gameLoopStep()` runs one continuation iteration
2. returns to the top-level loop
3. top-level loop treats that as the next replay/game step

That changes ownership too early.

## Safer Incremental Path

Gate 2 should now be split into two separate problems:

1. **semantic helpers**
   - factor exact one-step helpers for:
     - negative-`multi` continuation
     - one occupation callback
   - but do not yet change keyed-step ownership

2. **outer-loop ownership**
   - introduce a layer above those helpers that can perform multiple no-new-key C iterations while still keeping them inside the same keyed replay step
   - only after that should `_drainOccupation()` / `multi < 0` inner loops be fully removed

In other words:

- the C one-step model is correct
- `_gameLoopStep()` is currently the wrong layer to expose it directly

## Recommendation

Before another code attempt, define one explicit invariant for the branch:

- **A single replay key step may own multiple C-faithful no-input iterations.**

Any restructure that violates that invariant will regress parity even if the individual helper logic looks more C-like.

## Gate 2 Attempt 3: Respect `context.move` For Negative-`multi`

### Exact C Finding

The remaining wizard-life-save branch regression turned out to have a concrete
owner bit in C, not a generic replay artifact.

In C [`end.c`]( /share/u/davidbau/git/mazesofmenace/game/nethack-c/patched/src/end.c ):

1. `savelife()` sets:
   - `gn.nomovemsg = "You survived that attempt on your life.";`
   - `svc.context.move = 0;`
   - `gm.multi = -1;`
2. So after life-saving, C explicitly leaves `multi < 0` but also says
   "do not run moveloop work now."

The branch's internal continuation loop in [`js/allmain.js`]( /share/u/davidbau/git/mazesofmenace/game/js/allmain.js )
was using `multi < 0` alone to decide whether to run `runNegativeMultiStep()`.
That was too broad.

### Exact Branch Regression This Explained

Session:

- [`theme35_seed2320_wiz_artifact-combat2_gameplay.session.json`]( /share/u/davidbau/git/mazesofmenace/game/test/comparison/sessions/coverage/round8-scrolls-potions/theme35_seed2320_wiz_artifact-combat2_gameplay.session.json )

Passing `a84` trace at step `20`:

- `resume=done`
- `ack=1`
- `msgMore=1`
- fresh key ownership resumes at step `21`

Broken `d2` trace before the fix:

- step `20` stayed pending in `waitForMoreDismissKey(...)`
- a visible `--More--` was materialized too early
- by step `21`, the branch was still consuming boundary behavior instead of
  letting the fresh key proceed

The underlying reason was:

- JS ran the negative-`multi` continuation immediately
- that reached the `unmul()`/`nomovemsg` path
- that path materialized a command-boundary `--More--`
- C had prevented that continuation by clearing `context.move`

### Implemented Rule

Gate the branch's internal negative-`multi` continuation on `context.move`,
not just on `multi < 0`.

Concretely, `_gameLoopStep()` now treats negative-`multi` as a continuation
only when:

- `this.context?.move`
- `this.multi < 0`
- `!this.playerDied`

### Validation

This exact-C-driven guard produced a real branch improvement:

- [`theme35_seed2320_wiz_artifact-combat2_gameplay.session.json`]( /share/u/davidbau/git/mazesofmenace/game/test/comparison/sessions/coverage/round8-scrolls-potions/theme35_seed2320_wiz_artifact-combat2_gameplay.session.json ): PASS
- [`theme15_seed986_wiz_artifact-wish_gameplay.session.json`]( /share/u/davidbau/git/mazesofmenace/game/test/comparison/sessions/coverage/artifact-use/theme15_seed986_wiz_artifact-wish_gameplay.session.json ): PASS
- [`seed031_manual_direct.session.json`]( /share/u/davidbau/git/mazesofmenace/game/test/comparison/sessions/seed031_manual_direct.session.json ): unchanged live frontier
- [`t08_s984_w_camera_gp.session.json`]( /share/u/davidbau/git/mazesofmenace/game/test/comparison/sessions/coverage/apply-tools/t08_s984_w_camera_gp.session.json ): PASS
- [`theme33_seed2102_wiz_eat-various_gameplay.session.json`]( /share/u/davidbau/git/mazesofmenace/game/test/comparison/sessions/theme33_seed2102_wiz_eat-various_gameplay.session.json ): PASS
- `node --test test/unit/command_eat_occupation_timing.test.js`: PASS

### What This Means

The branch now has one more exact C ownership rule encoded:

- `multi < 0` is not by itself sufficient to justify a no-input continuation
- the continuation is only valid when the C-side turn owner (`context.move`)
  is still active
