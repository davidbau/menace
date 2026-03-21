# Runmode Delay Output Port Plan

## Background

The active gameplay parity blocker is:
- `test/comparison/sessions/seed031_manual_direct.session.json`
- first RNG divergence: step `933`
- first event divergence: step `934`

This frontier was reached after validated fixes to:
- special-level Mines/Rogue `mkmap()` level-flag transitions
- branch-aware turn-end spawn depth

Those fixes were real and moved the session materially later. The remaining seam is not in monster-generation rules or pet-specific AI formulas. It is now localized to the travel/contact corridor after `_` travel target confirmation.

## Problem Statement

At step `933`, JS packs too much travel and monster work into the `.` key that finishes `getpos()` for the `_` travel command.

Observed baseline JS behavior:
- step `933` performs hero travel hops:
  - `22,14 -> 23,13`
  - `23,13 -> 24,13`
  - `24,13 -> 25,13`
  - `25,13 -> 26,13`
  - then attempts hostile contact at `27,13`
- monster 27 (gas spore) gets processed multiple times inside the same step
- by step `934`, monster 27 reaches `distfleeck()` with `mux/muy=(26,13)` and logs:
  - `^distfleeck[27@27,13 in=1 near=1 ...]`

Observed C behavior:
- C step `933` does not drain that much travel inside the same command slice
- monster 27's corresponding first later turn reaches `distfleeck()` with a non-adjacent apparent target and logs:
  - `^distfleeck[27@27,13 in=1 near=0 ...]`

The first RNG mismatch is therefore not caused by `distfleeck()` itself. It is caused by JS reaching a later hero/monster state too early.

## Why `runmode_delay_output()` Matters

`runmode_delay_output()` looks display-oriented, but in C it is part of gameplay-visible control flow because of where it sits in the loop structure.

C implementation summary:
- `cmd.c:dotravel_target()` arms travel state:
  - `context.travel = 1`
  - `context.travel1 = 1`
  - `context.run = 8`
  - `context.nopick = 1`
  - `context.mv = TRUE`
  - `gm.multi = max(COLNO, ROWNO)` if unset
  - then calls `domove()`
- `allmain.c:moveloop_core()` later handles repeat slices in the once-per-player-input phase
- in the `gm.multi > 0` branch, C executes:
  1. `lookaround()`
  2. `runmode_delay_output()`
  3. if still active, one repeated `domove()` or `rhack()`

So in C, `runmode_delay_output()` is the exact boundary before the next repeated travel slice. It is not just a cosmetic delay. It is part of the slice ownership that determines how much hero movement and monster work happen before the command yields.

## C Structure To Match

### Outer loop

`allmain.c:moveloop()` (line 706):
- `for (;;) { moveloop_core(); }` — calls `moveloop_core()` forever

### `moveloop_core()` phases (lines 226–675)

`moveloop_core()` has two major phases:

1. **Actual-time-passed phase** (lines 253–545) — gated by `if (context.move)`
- decrements `u.umovement -= NORMAL_SPEED` (line 255)
- runs the "hero can't move this turn" loop (`do {...} while (u.umovement < NORMAL_SPEED)`)
- runs monster movement until hero can act or monsters are out of steam (`do { monscanmove = movemon(); ... } while (monscanmove)`)
- when both hero and monsters are out of steam, performs once-per-turn updates (regen_hp, regen_pw, nh_timeout, dosounds, gethungry, age_spells, etc.)
- handles negative `gm.multi < 0` here (lines 486–494):
  ```c
  if (gm.multi < 0) {
      runmode_delay_output();
      if (++gm.multi == 0) {
          unmul((char *) 0);
          if (u.utotype) deferred_goto();
      }
  }
  ```
  Note: this is **one iteration per `moveloop_core()` call** — the outer `for(;;)` drives the loop, not a `while` inside the phase. JS's `finalizeTimedCommand()` uses `while (game.multi < 0)` instead, which is the same structural mismatch (though less likely to cause divergence since negative multi is simpler).

2. **Once-per-player-input phase** (lines 547–675)
- `clear_splitobjs()`
- amulet wish check
- `find_ac()`
- hallucination / telepathy / warning visibility refresh
- `bot()` / cursor update as needed
- `m_everyturn_effect()` (line 585) — called BEFORE the multi check; each travel slice gets one call
- `context.move = 1` (line 589)
- occupation branch (lines 591–617) — checked BEFORE positive multi; if an occupation is set during travel (e.g., from a trap), it takes priority over multi continuation
- positive `gm.multi > 0` branch (lines 626–644)
- otherwise fresh command branch `rhack(0)`

### Positive repeat branch in C (lines 626–644)

In the once-per-player-input phase:

```c
if (gm.multi > 0) {
    RUNSTEP_EVENT(svc.context.mv ? "repeat_mv" : "repeat_cmd", gc.cmd_key);
    lookaround();
    runmode_delay_output();
    if (!gm.multi) {
        /* lookaround() cleared multi — cancel without advancing time */
        svc.context.move = 0;
        return;
    }
    if (svc.context.mv) {
        if (gm.multi < COLNO && !--gm.multi)
            end_running(TRUE);
        domove();
    } else {
        --gm.multi;
        nhassert(gc.command_count != 0);
        rhack(gc.cmd_key);
    }
} else if (gm.multi == 0) {
    rhack(0);  /* fresh command */
}
```

Critically:
- this is **one repeat slice per `moveloop_core()` call**
- the outer `moveloop()` re-enters `moveloop_core()` again later
- C does **not** drain an unbounded `while (gm.multi > 0)` loop inside command execution
- when `lookaround()` clears multi, `context.move` is set to 0 — this prevents the time-passed phase from running on the next `moveloop_core()` iteration
- `end_running(TRUE)` fires when `gm.multi < COLNO && !--gm.multi` — the travel countdown reaching zero

### Where `runmode_delay_output()` is called (hack.c:2994)

```c
void runmode_delay_output(void) {
    if ((svc.context.run || gm.multi) && flags.runmode != RUN_TPORT) {
        if (flags.runmode != RUN_LEAP || !(svm.moves % 7L)) {
            disp.time_botl = flags.time;
            curs_on_u();
            nh_delay_output();
            /* ... crawl mode extra delays ... */
        }
    }
}
```

Called at three `moveloop_core()` sites:
- line 487: negative multi (time-passed phase)
- line 615: occupation (once-per-player-input phase)
- line 629: positive multi (once-per-player-input phase)

Important distinction:
- C also calls `runmode_delay_output()` from the move path near the end of
  `domove()` after `spoteffects(TRUE)`
- JS already has a matching move-local call in `hack.js:domove()`
- the missing parity is therefore not "JS forgot the delay call"
- the missing parity is the repeat-slice ownership at the
  `moveloop_core()` positive-`multi` boundary

So the port target is the `allmain.c` repeat branch semantics, not the mere
existence of an awaitable delay in `hack.js`.

## Current JS Structure

Relevant current JS files:
- `js/allmain.js`
- `js/hack.js`

Current JS behavior:
- `run_command()` executes the command
- if the command took time, it calls:
  - `finalizeTimedCommand()` — which has `while (game.multi < 0)` draining negative multi
  - then `repeatLoop()` — which has `while (game.multi > 0)` draining positive multi
- `repeatLoop()` does:
  - `while (game.multi > 0)`
  - for travel/repeat movement, repeatedly:
    - `lookaround()`
    - `domove()`
    - `advanceTimedTurn()`

This means one command execution can drain many positive-`multi` repeat slices before returning.

That is the core structural mismatch.

There is also a second JS ownership path active today:
- `_gameLoopStep()` has a top-level travel continuation branch
- if `travelPath` remains, it calls `dotravel_target()` again before waiting for
  a fresh command

So JS currently splits travel ownership across two layers:
- command-owned `run_command().repeatLoop()`
- top-level `_gameLoopStep()` travel continuation

C does not split ownership that way:
- `dotravel_target()` performs the initial travel setup and first `domove()`
- later repeat slices are owned by `moveloop_core()`'s once-per-player-input
  phase, one slice per outer `moveloop()` re-entry

### Structural comparison

| Aspect | C | JS |
|--------|---|-----|
| Negative multi | 1 iteration per `moveloop_core()` call; outer `for(;;)` loops | `while(multi < 0)` loop inside `finalizeTimedCommand()` |
| Positive multi | 1 step per `moveloop_core()` call; outer `for(;;)` loops | `while(multi > 0)` loop inside `repeatLoop()` |
| `lookaround()` | Called inside `moveloop_core()` at line 628 | Called inside `repeatLoop()` |
| `runmode_delay_output()` | Called inside `moveloop_core()` at line 629 (after lookaround) and also from `domove()` | Called from `domove()`, but not at the repeat-slice boundary in `repeatLoop()` |
| Occupation check | Before positive multi in `moveloop_core()` | Handled in `_drainOccupation()` |
| `m_everyturn_effect()` | Called once per `moveloop_core()` iteration, before multi check | Not called per repeat slice |
| Travel owner | Initial `dotravel_target()` move, then `moveloop_core()` owns continuation | Split between `repeatLoop()` and `_gameLoopStep()` |

## Evidence Supporting This Diagnosis

### 1. Baseline step packing

`movement-propagation` and `RUN_TRACE` show JS step `933` contains multiple repeated travel slices and repeated monster turns that C spreads across later steps.

### 2. Monster 27 target refresh happens too early in JS

`MONMOVE_TRACE` around step `933/934` shows JS gas spore 27 reaches:
- step `933`: `set_apparxy ... new=(24,13)`
- later step `933`: `set_apparxy ... new=(26,13)`
- step `934`: `set_apparxy ... old=(26,13) new=(26,13)`

This makes `near=1` inevitable at step `934`.

### 3. `distfleeck()` and `monnear()` are not the bug

C and JS both compute:
- `near = inrange && monnear(mon, mux, muy)`

`monnear()` itself also matches C.

So the mismatch is upstream in when and how `mux/muy` are refreshed.

### 4. Failed broad rewrite clarified the real constraint

A prior attempt moved positive-`multi` ownership out of `run_command()` too aggressively and regressed `seed031` from step `933` back to step `163`.

That failure showed:
- the repeat ownership must move in a way that preserves the full C frame around it
- especially the split between:
  - actual-time-passed phase
  - once-per-player-input phase
  - outer `moveloop()` re-entry
- and it must remove the current split ownership between:
  - `run_command().repeatLoop()`
  - `_gameLoopStep()` travel continuation

### 5. The failed rewrite broke general counted-command ownership, not just travel

Focused survey of the early regression window (`seed031` steps `160..166`) shows
the bad rewrite was disturbing ordinary counted command flow much earlier than
the `_` travel seam:

- step `160`: key `"m"` (no timing work)
- step `161`: key `"."` drains a full monster-turn bundle in both C and JS
- step `162`: key `"m"` (no timing work)
- step `163`: key `"."` drains another full monster-turn bundle in both C and JS
- step `164`: key `"8"` extends a count prefix
- step `165`: key `"m"` starts another count-prefixed command
- step `166`: key `"."` is a counted fresh command on both sides

Baseline step `166` JS trace already shows:
- `^runstep[path=fresh_cmd keyarg=0 cmd=46 cc=0 moves=143 multi=7 run=0 mv=0 ...]`

That means:
- positive `multi` is not only the `_` travel case
- ordinary count-prefixed command repetition is already using the same state
  machinery
- a rewrite that changes positive-`multi` ownership globally will perturb much
  earlier repeated-command semantics unless it preserves the counted-command
  contract exactly

The step-summary pattern from the failed rewrite:
- step `161`: JS short by `rng -20 / evt -11`
- step `163`: JS over by `rng +28 / evt +17`
- step `166`: C pays back with `rng -44 / evt -28`

is classic cross-step redistribution. The rewrite did not merely "fail to fix
travel later"; it re-attributed whole continuation slices across earlier
counted-command boundaries.

So the next implementation must treat these as separate-but-related semantics:
- counted command repetition (`multi > 0`, `context.mv == false`)
- movement/travel repetition (`multi > 0`, `context.mv == true`)

and prove that both preserve the current early-session behavior before touching
the later travel seam.

## Design Goal

Port JS so that positive `multi` continuation is owned by the JS equivalent of
C's **once-per-player-input** phase, with **one repeat slice per outer
re-entry**, not by a `while (multi > 0)` loop inside command execution.

The purpose is not to "add delay".
The purpose is to match the exact C slice boundary where `runmode_delay_output()` occurs.

## Proposed JS Port

### 1. Introduce a JS helper for C's once-per-player-input phase

Add a helper in `js/allmain.js` that models the C block after the actual-time-passed phase and before waiting for fresh input.

This helper should own:
- `clear_splitobjs()` equivalent
- amulet wish check
- `find_ac()`
- visibility refresh rules
- status/cursor update conditions
- `m_everyturn_effect()` — must be called once per slice, before the multi check, matching C line 585
- `context.move = 1`
- occupation handling — must be checked BEFORE positive multi, matching C lines 591–617
- positive `multi > 0` handling
- fresh-command fallback

It should execute **one** repeat slice when `multi > 0`, then return.

### 2. Remove positive-`multi` draining from `run_command()`

`run_command()` should remain responsible for:
- command parsing/execution
- immediate timed finalization from the just-executed command
- negative `multi` and occupation work directly caused by that command, where already validated

It should stop owning:
- `while (multi > 0)` repeat draining

Note: the `while (multi < 0)` loop in `finalizeTimedCommand()` is the same structural mismatch as positive multi. C runs one negative-multi iteration per `moveloop_core()` call. This is lower risk (negative multi is simpler) but should be fixed for correctness if the refactor touches this area.

Important constraint from the failed rewrite:
- do not change counted-command (`context.mv == false`) ownership and travel
  (`context.mv == true`) ownership in one undifferentiated move
- first preserve the early counted-repeat corridor (`seed031` `160..166`)
- then address the later travel seam (`933/934`)

### 3. Re-enter the once-per-player-input helper from outer runtime drivers

The browser loop (`_gameLoopStep()`) and replay path (`replayStep()` / `executeReplayStep()`) should re-enter the once-per-player-input helper exactly the way C re-enters `moveloop_core()` from `moveloop()`.

That means:
- one no-input continuation slice per re-entry
- not one command-owned `while` drain

**Key integration concern**: `_gameLoopStep()` currently yields to the input system between calls. When `multi > 0`, it must NOT wait for input — it should immediately re-enter for the next slice. The replay engine's `drainUntilInput()` needs to see these as non-input-waiting continuations, not as separate input-consuming steps. This is the highest-risk part of the integration.

### 3a. Unify travel ownership in one layer

The rewrite should not leave travel continuation split between:
- `run_command().repeatLoop()`
- `_gameLoopStep()`'s `travelPath` branch

The C-faithful owner for positive repeat travel is:
- the JS equivalent of `moveloop_core()`'s once-per-player-input phase

So `_gameLoopStep()` should re-enter that helper rather than directly owning
travel advancement, and `run_command()` should stop draining repeated travel
slices locally.

### 4. Preserve current `runmode_delay_output()` body semantics

The JS body in `hack.js` is already close enough in spirit:
- awaitable
- `tport` suppression
- leap/crawl behavior

Headless/test behavior should remain effectively `0ms` delay.
Interactive deployed behavior can keep a tiny awaitable delay.

The main port target is **call-site semantics**, not the delay body's milliseconds.

## C Invariants to Preserve

These ordering and state invariants from C must be carried into the JS rewrite:

1. **`context.move = 0` when multi is cancelled by `lookaround()`** (line 632): This prevents the time-passed phase from running on the next `moveloop_core()` iteration. If JS doesn't set this, a cancelled travel will incorrectly advance time.

2. **`u.umovement` accounting**: The time-passed phase decrements `u.umovement -= NORMAL_SPEED` once per `moveloop_core()` iteration (line 255), not once per travel hop. Verify that the JS equivalent (`advanceTimedTurn` → `moveloop_core`) maintains this 1:1 relationship.

3. **`m_everyturn_effect()` ordering** (line 585): Called in the once-per-player-input phase, BEFORE the multi check. Each travel slice gets one `m_everyturn_effect()` call. JS must not skip this or reorder it.

4. **Occupation before multi** (lines 591–617 vs 626–644): Occupation is checked BEFORE positive multi in C. If an occupation is set during travel (e.g., from a trap), it takes priority over multi continuation.

5. **`end_running(TRUE)` countdown** (line 637): `if (gm.multi < COLNO && !--gm.multi) end_running(TRUE)`. This is the travel countdown for finite-distance runs. The JS port needs this exact condition.

6. **Distinguish move-local delay from repeat-slice delay**: C already has a
   move-local `runmode_delay_output()` call in the `domove()` path, and JS does
   too. The missing parity is the additional repeat-slice boundary call at the
   `moveloop_core()` positive-`multi` site. The rewrite must preserve that
   distinction rather than deleting the local move call or treating the local
   call as sufficient.

7. **Preserve counted-command boundaries before touching travel**: baseline
   `seed031` steps `160..166` show ordinary count-prefixed `"m."` command
   repetition already exercising `multi > 0` semantics. Any ownership rewrite
   must hold that corridor stable before it can be trusted on the later travel
   seam.

## Non-Goals

This plan does **not** propose:
- changing `distfleeck()` formula
- changing `monnear()`
- adding replay compensation logic
- masking the session or comparator
- special-casing `seed031`

## Validation Plan

Primary target:
- `test/comparison/sessions/seed031_manual_direct.session.json`

Guardrails:
- `test/comparison/sessions/coverage/covmax-round7/t11_s755_w_covmax9_gp.session.json`
- `test/comparison/sessions/coverage/monster-generation/t11_s756_w_covmax10_gp.session.json`
- `test/comparison/sessions/coverage/artifact-use/theme15_seed986_wiz_artifact-wish_gameplay.session.json`
- `test/comparison/sessions/coverage/round8-scrolls-potions/theme35_seed2320_wiz_artifact-combat2_gameplay.session.json`

Success criteria:
- `seed031` first RNG divergence moves later than `933`
- no larger regressions on the current guardrails
- no replay/comparator masking

## Review Responses

*Reviewed by second engineer, 2026-03-21.*

**Q1: Does the C control-flow summary match?**
Yes. Verified against `allmain.c:226-675`. The positive multi block is at lines 626–644, with exactly one `domove()` or `rhack()` per `moveloop_core()` call. The outer loop at line 706 is `for(;;) { moveloop_core(); }`. The doc's description is accurate.

**Q2: Is the structural mismatch specifically the `while (multi > 0)` drain?**
Yes. `repeatLoop()` in `allmain.js` has `while (game.multi > 0)` that drains all travel/repeat steps before returning. C executes one step per `moveloop_core()` call and returns to the outer loop. JS packs multiple travel hops + monster turns into a single "step" from the replay engine's perspective.

**Q3: Is a once-per-player-input helper the right fix?**
Yes. The JS equivalent of C's outer `for(;;)` is `_gameLoopStep()`. The fix should make `_gameLoopStep()` check `multi > 0` and execute one slice (lookaround + one domove), rather than having `run_command()` drain everything. The highest-risk area is the replay engine integration — `drainUntilInput()` must correctly handle non-input continuations.

**Q4: Additional invariants?**
See "C Invariants to Preserve" section above. The most critical are: `context.move = 0` on lookaround cancel, `m_everyturn_effect()` ordering, and occupation-before-multi priority.

## Revised Implementation Strategy

Given the failed broad rewrite, the implementation should proceed in two
explicit stages:

1. **Stage A: counted-command preservation**
- isolate positive-`multi` continuation for `context.mv == false`
- verify that the early `seed031` corridor around steps `160..166` remains
  unchanged
- do not attempt to solve the travel seam yet

2. **Stage B: travel-specific ownership**
- once counted-command semantics are proven stable, port the travel
  continuation (`context.mv == true`) to the once-per-player-input owner
- remove the split ownership between:
  - `run_command().repeatLoop()`
  - `_gameLoopStep()` travel continuation
- then validate the target seam at `933/934`

This staging is necessary because the failed rewrite proved that "positive
multi" is not one uniform case in the current JS runtime, even if it is one
uniform ownership site in C.

## Stage B Failure Analysis

The first travel-only Stage B attempt was also wrong, but it failed in a much
more informative way than the broad rewrite:

- it did **not** regress to an earlier session frontier
- it stayed at step `933`
- but it moved the first bad RNG/event **earlier within step `933`**

Observed first bad RNG under the failed Stage B patch:
- JS: `rn2(4)=2 @ dochug(monmove.js:847)`
- C: `rn2(100)=38 @ obj_resists(zap.c:1467)`

Observed first bad event under the failed Stage B patch:
- JS: `^dog_invent_decision[32@22,15 ud=5 act=0 otyp=-1 carry=0 rv=0]`
- C: `^dog_invent_decision[32@22,15 ud=8 act=0 otyp=-1 carry=0 rv=0]`

This is the key new insight:
- the patch did not merely "change the travel boundary"
- it exposed the hero's advanced repeated-travel position to dog-goal
  evaluation too early in step `933`

Focused trace from the failed patch:

```text
[RUN_TRACE] step=933 domove_target from=22,14 to=23,13
[MONMOVE_TRACE] set_apparxy step=933 ... u=(23,13) old=(22,14) new=(23,13)
[MONMOVE_TRACE] dog_move-begin step=933 ... pos=(21,17) goal=(22,16) appr=1 udist=20
...
[MONMOVE_TRACE] set_apparxy step=933 ... u=(23,13) old=(23,13) new=(23,13)
[MONMOVE_TRACE] dog_move-begin step=933 ... pos=(22,16) goal=(22,15) appr=1 udist=10
```

Interpretation:
- the travel-only patch made JS feed the first repeated travel position
  (`u=(23,13)`) into dog evaluation earlier than C does
- that reduces the dog's `ud` state too early (`8 -> 5`)
- which in turn moves the RNG seam earlier from the later gas-spore
  contact/attack mismatch into dog-goal / `dochug` work

This means the next Stage B attempt must preserve an additional invariant:

A second structural insight came out of the code comparison:
- JS `advanceTimedTurn()` is not just C's "actual time passed" phase
- it already bundles `moveloop_core()` plus the once-per-player-input pre-input sync (`find_ac()`, hallucination/telepathy monster refresh, and `display_sync()`)
- therefore a naive Stage B rewrite that calls a new movement-repeat helper after `advanceTimedTurn()` is still not C-equivalent; it has already crossed more of the C moveloop frame than the name suggests

This sharpens the likely failure mode of the first Stage B patch:
- the patch did not merely move travel ownership
- it let the first repeated `domove()` happen after a JS helper that already folds in C's pre-input phase
- so the hero's first repeated-travel square (`u=(23,13)`) became visible to `set_apparxy()`/`dog_invent_decision` too early


**Stage B invariant**:
- the first repeated travel slice must not become visible to dog-goal
  evaluation earlier than it does in C's post-`runmode_delay_output`
  ordering

So the remaining problem is narrower than "travel owner is wrong":
- the specific ordering among
  - first repeated hero travel position,
  - `runmode_delay_output`,
  - first post-delay dog turn,
  - and `set_apparxy()` / `dog_invent_decision`
  is still not C-equivalent

The next implementation should therefore:
1. preserve Stage A counted-repeat behavior
2. preserve the dog-goal ordering in step `933`
3. only then attempt to move the later gas-spore contact seam

## Stage B Refinement

The next Stage B attempt should treat the repeat-move slice as two separate
questions, not one:

1. **Which runtime owner reaches the `gm.multi > 0 && context.mv` branch?**
2. **At what exact point does the first repeated `domove()` become visible to
   monster logic?**

The failed travel-only patch answered the first question but not the second.
It moved ownership, but it still allowed the first repeated travel square to
become visible to dog evaluation too early.

The current best C-faithful hypothesis is narrower than the original plan:

- the replay/runtime boundary equivalent to `runmode_delay_output()` must yield
  **before** the first repeated `domove()` exposes `u=(23,13)` to the next pet
  goal calculation
- so the first Stage B patch was still one slice too eager, even though it had
  moved ownership away from `run_command().repeatLoop()`

This does **not** mean adding synthetic replay scheduling or prompt hacks.
It means the JS moveloop port still needs a more exact subdivision of the C
frame around:

- end of actual-time-passed processing
- once-per-player-input pre-input sync
- `lookaround()`
- `runmode_delay_output()`
- and only then the first repeated `domove()`

Additional invariant for the next implementation:

- do not call a helper that performs the first repeated `domove()` until the
  JS runtime has matched the C state *immediately after* the
  `runmode_delay_output()` boundary that precedes that `domove()`

Practical implication:

- the next code attempt should not be "Stage B patch v2"
- it should first factor the JS equivalent of the C once-per-player-input frame
  into smaller units so we can place the first repeated `domove()` at the exact
  C boundary, rather than after a helper (`advanceTimedTurn()`) that already
  bundles too much of the moveloop frame
