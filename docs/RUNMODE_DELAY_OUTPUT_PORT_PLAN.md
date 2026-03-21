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

## Current Travel Framing Mismatch To Eliminate

The deepest remaining JS/C mismatch is now a two-owner split inside one `_`
travel command stream.

What the focused replay trace shows around `seed031` steps `931..934`:
- steps `931..932` resume the still-running `_` command and block in
  `getpos_async()`
- step `933` key `"."` resumes that same pending command, returns from
  `getpos_async()`, then runs:
  - `dotravel_target()` first hop
  - `run_command() -> finalizeTimedCommand()`
  - `run_command() -> repeatLoop()`
  - four more repeated `domove_target` hops
  - hostile contact / attack at `26,13 -> 27,13`
- only after that does the pending command settle:
  - `[REPLAY_PENDING_TRACE] step=933 resume=done ... top=\"You hit the gas spore.\"`
- then step `934` starts a fresh `_gameLoopStep()` and immediately takes the
  separate top-level `travelPath` continuation branch, causing another
  `domove_target from=26,13 to=27,13`

So the live split is:

1. Resumed-command travel drain in JS
- `_` travel is not a `promptStep()` command at all
- `hack.js:dotravel()` awaits `getpos_async()` directly
- replay resumes that still-running command promise through
  `replay_core.js:drainUntilInput(...)`
- once `getpos_async()` completes on step `933`, `run_command()` continues
  inside the same resumed command and `repeatLoop()` drains multiple positive
  `multi` travel hops before the runtime blocks again

2. Top-level travel continuation in JS
- after the resumed command settles, `_gameLoopStep()` still has its own
  direct `travelPath -> dotravel_target() -> moveloop_core()` path
- that path drives later travel on step `934+`
- it still preempts the generic timed-continuation ordering in
  `_gameLoopStep()`

This is more precise than the earlier "prompt-owned initial travel frame"
theory. The initial `_` step is special, but not because `promptStep()`
owns it. It is special because one resumed pending command currently drains:
- the first `dotravel_target()` hop
- plus multiple `repeatLoop()` hops

C does not split ownership that way. In C:
- `_` travel remains normal command execution inside `rhack(0)`
- `dotravel_target()` performs the first `domove()`
- later travel slices are owned by later `moveloop_core()` entries, one slice
  per outer `moveloop()` re-entry

This means JS currently gives:
- the first resumed `_` travel continuation
- local `repeatLoop()` travel slices
- later `_gameLoopStep()` `travelPath` continuation

different visibility timing relative to:
- monster movement
- `find_ac()` / vision / `display_sync()` work
- `m_everyturn_effect()`
- `lookaround()`
- the next repeated `domove()`

The key concrete evidence is step `933` itself:
- `RUN_TRACE` shows five `domove_target` hops in that one replay step
- `MONMOVE_TRACE` shows gas spore 27 refreshed to `(24,13)` and then `(26,13)`
  in the same step
- by step `934`, `distfleeck()` therefore sees `near=1`

However, a narrow probe that merely moved the top-level `travelPath` branch
below `--More--` dismissal, negative-`multi`, and occupation continuation in
`_gameLoopStep()` was not sufficient by itself:
- `seed031` remained at first RNG/event divergence `933/934`
- the four targeted gameplay guardrails stayed green

That means the preempting top-level branch is still a real mismatch, but not
the whole remaining bug. The repeated-travel framing problem is deeper than
that one reorder alone.

### Summary of probes so far (second engineer)

We now have four negative probes, each isolating one variable:

| Probe | What changed | Result | What it rules out |
|-------|-------------|--------|-------------------|
| Stage B2b | Owner move only (repeatLoop → _gameLoopStep) | No improvement | Owner move alone |
| Stage C3 | umoved reset + runmode_delay_output in slice | No improvement | Per-slice invariants alone |
| travelPath reorder | Move travelPath below --More--/multi/occ | No improvement | Preemption ordering alone |
| combined owner probe | Skip local travel `repeatLoop()` on initial `_` step and route later `travelPath` continuation through `runMovementRepeatSlice()` | Reduced `933..936` spillover but did not move first seam | The two owners are real, but the first resumed-command slice is still wrong |
| Stage B (early) | Broad multi ownership rewrite | Regressed to step 163 | Undifferentiated rewrite |

Each probe was safe (no regressions on guardrails) but none moved the seam.
This strongly suggests the fix requires changing multiple things atomically:

1. Break the `while (multi > 0)` loop (one hop per `_gameLoopStep`)
2. With C-shaped slice internals (umoved + delay + context.move=0)
3. With unified framing (eliminate the three-way asymmetry)

The cross-iteration fusing (finding #5) is the likely reason each individual
change is insufficient: the JS slice currently spans two C iterations, so
fixing one aspect of one iteration doesn't change what the other iteration
sees. Only when the slice boundary matches C's iteration boundary will the
individual invariants start to matter.

Recommendation: the next attempt should combine B2b + C3 + travelPath
reorder as one atomic change, since each has been proven individually safe
but individually insufficient. The risk is manageable because each component
was tested in isolation without regressions.

One broader probe partially improved the right region:
- replacing the top-level direct `travelPath -> dotravel_target() -> moveloop_core()`
  continuation with the extracted `runMovementRepeatSlice(...)` reduced the
  later spillover in `seed031` from:
  - baseline `step 934..936`: `rng +431 / evt +169`
  - to `rng +130 / evt +95`
- and all four targeted gameplay guardrails stayed green

But it still did not move the first divergence later:
- first RNG divergence stayed `933`
- first event divergence stayed `934`
- overall matched totals actually got slightly worse

A follow-up combined probe also changed prompt-owned travel finalization:
- for the post-`getpos_async()` initial travel completion path, use `moveloop_core()` directly instead of
  full `finalizeTimedCommand()`

That added no measurable effect beyond the top-level replacement alone.

So the refined conclusion is:
- replacing the top-level direct travel continuation is part of the right
  direction
- but the remaining earliest mismatch is still earlier than post-`getpos_async()`
  finalization handling
- the next target should be the still-earlier behavior inside the resumed `_`
  command's `repeatLoop()` drain on step `933`, not another tweak to
  post-`getpos_async()` turn finalization

## Latest correction from direct replay-owner tracing

Focused replay-owner tracing with:
- `WEBHACK_RUN_TRACE=1`
- `WEBHACK_MONMOVE_TRACE=1`
- `WEBHACK_REPLAY_PENDING_TRACE=1`

showed the exact owner split:

- steps `931..932`: the `_` command is still pending and blocked in
  `getpos_async()`
- step `933` key `"."`: resumes that same pending command
  - first `dotravel_target()` hop
  - then local `run_command() -> repeatLoop()` drain
  - total of five `domove_target` hops in one replay step
  - gas spore 27 refreshes to `(24,13)` and then `(26,13)` in the same step
- step `934`: starts a fresh `_gameLoopStep()` and immediately enters the
  separate top-level `travelPath` continuation path

This corrected an earlier mistaken theory:
- the initial `_` travel step is **not** owned by `promptStep()`
- `dotravel()` awaits `getpos_async()` directly
- replay resumes the still-running command promise through
  `replay_core.js:drainUntilInput(...)`

The latest combined owner probe matched that model:
- change A: skip local movement repeat drain after the initial `_` travel hop
- change B: route later top-level `travelPath` continuation through
  `runMovementRepeatSlice(...)`

Validation result:
- `seed031` first divergence did **not** move later:
  - RNG `933`
  - event `934`
- but step-summary spillover improved sharply:
  - baseline `933..936`: `rng +431 / evt +169`
  - combined probe: `rng +106 / evt +95`
- targeted gameplay guardrails still passed

What that means:
- both owners are real contributors
- but even after neutralizing both at a high level, the first bad work still
  starts inside step `933`
- so the next fix must target the **first resumed-command travel slice**
  itself, not just owner routing after that slice

## Further ordering correction from the first-slice analysis

The next focused pass compared:
- C `allmain.c` positive-repeat branch at lines 620..644
- C `hack.c:domove()` tail and `runmode_delay_output()`
- JS replay-owner trace for the authoritative failing step `933`

The important missed detail is:
- the earliest bad JS work is not merely that step `933` contains too many
  `domove_target` hops
- it is that JS step `933` already includes C's *later positive-repeat*
  monster-turn bundle before C has even reached its first
  `>runmode_delay_output @ moveloop_core(allmain.c:629)` boundary for the
  comparable state

Evidence:
- authoritative JS trace at step `933` begins:
  - `domove_target from=22,14 to=23,13`
  - immediately followed by dog turns with `set_apparxy ... u=(23,13)`
- authoritative C raw window at the first mismatch does **not** yet have that
  dog bundle there; instead it has:
  - `rn2(70)=45 @ moveloop_core(allmain.c:341)`
  - `rn2(20)=19 @ gethungry(eat.c:3186)`
  - `rn2(79)=55 @ moveloop_core(allmain.c:466)`
  - `>runmode_delay_output @ moveloop_core(allmain.c:629)`
  - then monster 27's `distfleeck(...)`

So the refined claim is:
- JS step `933` is not just over-draining *after* the first resumed travel hop
- it is already advancing into C's next positive-repeat iteration too early
- that is why the first JS dog work in step `933` already sees the hero at
  `(23,13)`, while the comparable C work has not yet exposed that position to
  the same monster-turn bundle

Implication for the fix:
- the next implementation should not be framed as:
  - "keep the first hop, then stop later hops"
- it must instead make the first resumed `_` step stop at the same C boundary
  that exists before the positive-repeat branch's `runmode_delay_output()`
  yields into the next repeated `domove()`
- in practice, this means the first resumed `_` command slice and the later
  positive-repeat slice need a unified C-shaped contract; otherwise JS will
  keep pulling next-iteration monster work into step `933`

### Exact JS sequence that collapses the C boundary

The current JS call chain for the initial resumed `_` step is:

1. `dotravel_target()`
   - arms `context.travel/run/mv`
   - performs the first `domove()`
2. `run_command()`
   - sees `result.tookTime`
   - calls `finalizeTimedCommand(result, ...)`
3. `finalizeTimedCommand()`
   - calls `advanceTimedTurn()`
4. `advanceTimedTurn()`
   - calls `moveloop_core()`
   - then immediately calls `syncTimedTurnPreInputState()`
5. control returns to `run_command()`
6. `run_command()` immediately calls local `repeatLoop()`
7. `repeatLoop()` enters `runMovementRepeatSlice()` and starts the next
   positive-repeat movement bundle in the same resumed command

That is the concrete premature boundary crossing.

What C does instead:
- `rhack(0)` runs `dotravel_target()` and the first `domove()`
- control returns to `moveloop_core()`
- later, the outer `moveloop()` re-enters `moveloop_core()` for the
  once-per-player-input positive-repeat branch
- only there does C do:
  - `u.umoved = FALSE`
  - `lookaround()`
  - `runmode_delay_output()`
  - repeated `domove()`

So the missing boundary is not inside `dotravel_target()` itself.
It is between:
- `finalizeTimedCommand()` completing the initial travel step
- and JS entering local `repeatLoop()` for the next travel step

This is why the first resumed JS step already contains dog work that belongs
to C's later positive-repeat branch.

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
- and do not expect local repeated-slice invariants to help until the current
  three-way JS travel framing asymmetry has been eliminated
- specifically, `_gameLoopStep()` should not let a dedicated `travelPath`
  branch preempt the generic timed-continuation ordering that C keeps inside
  `moveloop_core()`

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

## Stage B Failure: Detailed C Ordering Analysis

*Added by second engineer, 2026-03-21.*

The Stage B failure analysis and `advanceTimedTurn()` bundling insight above
are correct. Here is the precise C call chain that explains WHY the dog sees
the old hero position, and what the JS implementation must match.

### C ordering within one `moveloop_core()` iteration

For a positive-multi travel continuation, C executes in strict order:

```
PHASE 1 — time-passed (lines 253–545, gated by context.move):
  u.umovement -= NORMAL_SPEED                              // line 255
  do {
    monscanmove = movemon();                                // line 306
    // movemon() iterates all monsters:
    //   for each mon: dochugw(mon) → dochug(mon)
    //     dochug: set_apparxy(mon) at monmove.c:791
    //       → sets mon.mux/muy from CURRENT u.ux/u.uy
    //       → hero has NOT moved yet this iteration
    //     dochug: m_move(mon)
    //       m_move: set_apparxy(mon) again at monmove.c:1776
    //       m_move: dog_move(mon) at monmove.c:1788
    //         dog_move: dog_goal() at dogmove.c:1082
    //           dog_goal: reads u.ux/u.uy for goal calc
    //           → still the PRE-domove position
  } while (monscanmove);
  // ... turn-end processing ...

PHASE 2 — once-per-player-input (lines 547–644):
  m_everyturn_effect()                                      // line 585
  context.move = 1                                          // line 589
  // occupation check (lines 591–617)
  if (gm.multi > 0):                                        // line 626
    lookaround()                                            // line 628
    runmode_delay_output()                                  // line 629
    if context.mv:
      domove()                                              // line 638
      // → u.ux/u.uy NOW updated to new position
      // → but all monsters already moved in Phase 1
      //   using the OLD u.ux/u.uy
```

### The critical invariant

In C, for any single `moveloop_core()` iteration:

1. **All monsters move first** (Phase 1, `movemon()`)
2. **Using the hero's CURRENT position** (pre-domove)
3. **Then the hero moves** (Phase 2, `domove()`)
4. **The hero's new position is only visible to monsters on the NEXT iteration**

`set_apparxy()` always reads the hero position from BEFORE `domove()`. The
dog evaluates its goal using where the hero IS, not where the hero is ABOUT
TO move.

### Why the Stage B patch broke this

Because `advanceTimedTurn()` bundles both Phase 1 AND the pre-input sync
from Phase 2, calling `domove()` after `advanceTimedTurn()` meant the hero
moved BEFORE the next Phase 1 could run `movemon()` with the old position:

```
Failed JS (Stage B patch):
  Iteration N:
    advanceTimedTurn() → Phase 1 movemon + Phase 2 pre-input sync
    domove() → u.ux/u.uy updated to (23,13)   ← too early!
  Iteration N+1:
    advanceTimedTurn() → Phase 1: movemon → set_apparxy reads u=(23,13)
                         dog sees ud=5   ← one iteration early

Correct C ordering:
  Iteration N:
    Phase 1: movemon() → set_apparxy reads u=(22,14), dog sees ud=8
    Phase 2: domove() → u.ux/u.uy updated to (23,13)
  Iteration N+1:
    Phase 1: movemon() → set_apparxy reads u=(23,13), dog sees ud=5
    Phase 2: domove() → u.ux/u.uy updated to (24,13)
```

### What the fix must ensure

As the Stage B Refinement section identifies, the solution is to factor
`advanceTimedTurn()` so the repeat-travel `domove()` can be placed at the
exact C boundary — AFTER `movemon()` and pre-input sync, but BEFORE the
next `movemon()`:

```
Correct JS sequence for one repeat-travel slice:
  1. Phase 1: movemon()         → monsters see old hero position
  2. Phase 2 pre-input sync     → find_ac, vision, m_everyturn_effect
  3. lookaround()
  4. runmode_delay_output()
  5. domove()                   → hero moves to new position
  6. → return to step 1 for next slice
```

### Concrete test for correctness

At step 933, after the fix:
- The dog at (21,17) should see `ud=8` (hero at pre-travel position 22,14)
  on its first move of this iteration
- NOT `ud=5` (hero at post-first-hop position 23,13)

The `^dog_invent_decision` event's `ud` field is the direct observable.
If `ud=8` matches C, the ordering is correct.

## Stage B2b Failure: Owner Move Alone Is Not Sufficient

*Observed locally on 2026-03-21; code reverted immediately.*

After Stage B1 and Stage B2a, we tested a narrow Stage B2b patch that:

- kept the extracted `runMovementRepeatSlice(...)` body unchanged
- stopped `run_command().repeatLoop()` from draining `context.mv == true`
  repeats locally
- moved only the positive-multi movement owner to `_gameLoopStep()`

Result:
- the early counted-repeat corridor `160..166` stayed unchanged
- the four targeted gameplay guardrails stayed green
- but `seed031` did **not** improve:
  - first RNG divergence stayed at `933`
  - first event divergence stayed at `934`
- and later normalized matching got slightly worse:
  - events `19066 -> 19065`
  - screens `1279 -> 1264`

The normalized event window under the failed B2b patch still showed the same
core hostile-contact seam, only repacked across later JS steps:

- JS step `937`: `^distfleeck[27@27,13 in=1 near=1 ...]`
- C step `948`: `^distfleeck[27@27,13 in=1 near=0 ...]`

Interpretation:
- moving the runtime owner alone does not fix the first travel/contact seam
- the first actionable mismatch is still governed by the internals of the
  repeated movement slice itself, not merely by whether `_gameLoopStep()` or
  `run_command()` owns that slice
- the owner move did alter later step packing, but without improving the
  first C-vs-JS disagreement

Updated implication for Stage B:

1. Stage B1 and B2a were still useful prerequisites.
2. Stage B2b should **not** be retried unchanged.
3. The next meaningful attempt must change the **slice internals** around:
   - `lookaround()`
   - `runmode_delay_output()`
   - when `advanceTimedTurn()` / pre-input sync happens relative to the
     repeated `domove()`
4. Only after that internal ordering becomes more C-faithful does it make
   sense to revisit the outer owner move.

## Corrections After Deeper C/JS Analysis

The first versions of this plan were still abstracting too much. A closer read
of both C and JS shows several concrete mismatches that must be addressed
explicitly.

### 1. The repeat branch in C has a pre-`domove()` delay boundary that JS still lacks

C positive-repeat ordering is:

1. `lookaround()`
2. `runmode_delay_output()`            // `allmain.c:629`
3. `if (!gm.multi) { context.move=0; return; }`
4. one repeated `domove()` / `rhack()`

JS currently has the move-local `runmode_delay_output()` inside `domove()`,
but the extracted `runMovementRepeatSlice(...)` still does:

1. `lookaround()`
2. repeated `domove()`
3. later timed-turn work

So JS is still missing the repeat-branch `runmode_delay_output()` call site
that C executes before the repeated `domove()`.

This is not cosmetic. It is the exact boundary that the dog-goal and gas-spore
ordering evidence keeps pointing at.

### 2. C resets `u.umoved = FALSE` before every positive-repeat slice

In C, just before the `gm.multi > 0` branch:

- `u.umoved = FALSE;`                  // `allmain.c:624`

That happens on every `moveloop_core()` entry before a repeated move is
considered.

Current JS only resets `player.umoved = false` once at the start of a fresh
command in `run_command()`. It does **not** reset `umoved` before each
repeated movement slice.

This is a real behavioral difference because later logic reads `u.umoved`
during end-of-turn and timeout handling.

### 3. JS still treats `advanceTimedTurn()` as if it were one C phase, but it spans a full C iteration

`advanceTimedTurn()` currently does:

1. `moveloop_core()`                   // monster-time / turn-end work
2. `find_ac()`
3. vision / monster refresh
4. `display_sync()`

That is already more than one conceptual C sub-phase. It is effectively JS's
fused version of "the next `moveloop_core()` iteration after a timed action",
not just "actual time passed".

Any plan that inserts a repeated `domove()` merely "before or after
`advanceTimedTurn()`" is therefore still too coarse.

### 4. Initial travel-step handling is inconsistent with repeated travel-step handling

After `_` travel target confirmation, JS currently does:

- `dotravel_target()`
- if `tookTime`, only `moveloop_core()`
- then returns from `_gameLoopStep()`

That means the initial travel step gets:
- monster-time / turn-end work
- but **not** the same post-`moveloop_core()` pre-input sync that repeated
  slices currently get via `advanceTimedTurn()`

So the initial travel step and repeated travel steps are already running under
different JS frames, which is not a stable foundation for Stage B.

### 5. The current repeated movement slice is really spanning two C iterations

Current JS `runMovementRepeatSlice(...)` does:

1. `lookaround()`
2. repeated `domove()`
3. `advanceTimedTurn()`

But in C, the repeated `domove()` happens at the tail of one
`moveloop_core()` iteration, and the corresponding monster-time work happens
in the **next** outer-loop iteration.

So the current JS slice helper is not "one C repeat slice". It is a fused
cross-iteration helper:

- tail of C iteration N
- plus head/middle of C iteration N+1

That fused model is not automatically wrong, but the plan must acknowledge it
explicitly. Otherwise owner moves will keep failing because we will be moving a
unit that does not actually correspond to one C slice.

### 6. `advanceRunTurn` is relevant to run/rush, not to travel repeat parity

`game.advanceRunTurn` is actively consumed by `do_run()` in `hack.js`.
The travel-repeat path in `runMovementRepeatSlice(...)` currently sets
`advanceRunTurn`, but `domove()` does not consume that hook for travel.

That means the hook is currently noise for the travel-specific analysis.
It should not be part of the Stage B reasoning except as an implementation
cleanup detail.

## Updated Faithful-Port Plan

The corrected plan should now be:

### Stage C1: make the JS frame boundaries explicit

Before any further owner moves, split the runtime into helpers that reflect the
actual C structure more faithfully:

1. **actual-time-passed iteration work**
   - current `moveloop_core()` responsibility
2. **once-per-player-input pre-input sync**
   - current `syncTimedTurnPreInputState()`
3. **positive-repeat pre-`domove()` boundary**
   - must include:
     - `u.umoved = FALSE`
     - `lookaround()`
     - repeat-branch `runmode_delay_output()`
     - `context.move = 0` on lookaround cancel
4. **repeated hero step**
   - one repeated `domove()` / `rhack()`

This stage is still about expressing the right boundaries, not moving owners.

### Stage C2: make initial travel-step and repeated travel-step framing consistent

Before revisiting ownership:

- the initial `_` travel step after `dotravel_target()` must pass through the
  same post-step/pre-input framing model as later repeated travel steps
- otherwise Stage C3 will be comparing unlike units

### Stage C3: adjust the repeated movement slice internals

Once the boundaries are explicit:

- add the missing repeat-branch `runmode_delay_output()` before repeated
  `domove()`
- reset `u.umoved = FALSE` before each repeated slice
- ensure the dog sees the pre-`domove()` hero square on the first relevant
  post-delay monster turn

Primary observable:
- `^dog_invent_decision ... ud=8` where C has `ud=8`

### Stage C4: only then revisit the outer owner move

Only after Stage C3 shows the slice itself is C-shaped:

- move `context.mv == true` continuation ownership outward
- revalidate:
  - counted-repeat corridor `160..166`
  - dog-ordering corridor `933..934`
  - later gas-spore seam

## Practical Implication

The next implementation should **not** be another direct owner rewrite.

The next implementation should be:

1. make the missing per-slice invariants explicit in code
2. equalize the framing of initial and repeated travel steps
3. then test whether the first seam finally moves

Only after that should ownership move again.

## Review of Updated Plan (Second Engineer, 2026-03-21)

The "Corrections After Deeper C/JS Analysis" section is excellent — each
finding is verified against the source. Some notes:

### Finding #1 (missing repeat-branch `runmode_delay_output`) — Confirmed

Verified: C's `allmain.c:629` calls `runmode_delay_output()` between
`lookaround()` and `domove()` in the positive-multi block. JS's
`runMovementRepeatSlice()` goes directly from `lookaround()` to `domove()`
at line 877 with no delay call between. The move-local delay inside
`domove()` is a different call site with different semantics.

### Finding #2 (`u.umoved = FALSE` per slice) — Confirmed

Verified: C's `allmain.c:624` sets `u.umoved = FALSE` before the
`gm.multi > 0` block on every `moveloop_core()` iteration. JS sets
`player.umoved = false` only at `run_command()` line 750 — once per fresh
command, not per repeat slice. This is a real per-iteration invariant
that `runMovementRepeatSlice` must add.

### Finding #3 (`advanceTimedTurn` spans too much) — Confirmed

Verified: `advanceTimedTurn()` at line 1004 calls `moveloop_core()` then
`syncTimedTurnPreInputState()` (which does `find_ac`, vision refresh,
`display_sync`). In C, these are separate sub-phases within one
`moveloop_core()` iteration. The fusion means any code that calls
`advanceTimedTurn` is consuming an entire C iteration, not just "the
time-passed phase."

### Finding #4 (initial vs repeated travel inconsistency) — Important

This is a subtle point. After `dotravel_target()`, JS currently calls
`moveloop_core()` alone (no `syncTimedTurnPreInputState`), while repeated
slices call `advanceTimedTurn()` (which includes the sync). In C, both
paths go through the same `moveloop_core()` iteration. This asymmetry
could cause the first travel step to have different vision/AC state than
subsequent steps.

### Finding #5 (cross-iteration fusing) — The core insight

This is the most important finding. The JS slice does:

```
lookaround → domove → advanceTimedTurn
                       ├─ moveloop_core (= next C iteration Phase 1)
                       └─ syncTimedTurnPreInputState (= next C iteration Phase 2 prefix)
```

But in C, one `moveloop_core()` iteration is:

```
Phase 1: movemon (monsters use old hero pos) → turn-end
Phase 2: pre-input sync → umoved=FALSE → lookaround → delay → domove
```

So `domove` is the LAST thing in a C iteration, and `movemon` is the
FIRST thing in the NEXT iteration. The JS slice puts `domove` BEFORE
`advanceTimedTurn` (which contains `movemon`), which is actually the
correct ordering! The monsters in `advanceTimedTurn`'s `moveloop_core()`
do see the post-`domove` hero position, but that's iteration N+1 seeing
iteration N's result — which is correct.

**However**, the problem is that `advanceTimedTurn` also includes the
pre-input sync (Phase 2 prefix of iteration N+1), so after
`runMovementRepeatSlice` returns, the JS state has already crossed into
the middle of the next C iteration. The next call to
`runMovementRepeatSlice` then starts with `lookaround` + `domove`, which
is the tail of that partially-consumed iteration — but without the
`u.umoved = FALSE` reset that C does at the iteration boundary.

This means the fix is straightforward in principle:

1. Add `player.umoved = false` before `lookaround()` in `runMovementRepeatSlice`
2. Add the repeat-branch `runmode_delay_output()` between `lookaround()` and `domove()`
3. Handle `context.move = 0` when `lookaround()` clears multi

These are all local changes to `runMovementRepeatSlice` — no owner move
needed for Stage C3.

### Stage C1-C4 plan assessment

The staged approach is correct. One concern about Stage C2 (equalizing
initial and repeated travel framing): this could be high-risk if
`dotravel_target()` has dependencies on the current framing. Suggest
verifying with a narrow test before changing the initial travel path.

Stage C3 is the most likely to produce the `ud=8` fix, since it directly
addresses the two missing invariants (`umoved` reset and `runmode_delay_output`
call). I'd suggest starting Stage C3 immediately after C1, even before C2,
since C3's changes are local to `runMovementRepeatSlice` and don't depend
on the initial/repeated travel equalization.

### Concrete first step

The smallest testable change for Stage C3 would be adding these three
lines to `runMovementRepeatSlice`, right before `lookaround()`:

```javascript
// C ref: allmain.c:624 — u.umoved = FALSE before every positive-repeat slice
const player = game.u || game.player;
if (player) player.umoved = false;
```

And after `lookaround()`, before `domove()`:

```javascript
// C ref: allmain.c:629 — runmode_delay_output() before repeated domove
await runmode_delay_output(game);
```

Then run `seed031` and check whether `^dog_invent_decision ... ud=8`
matches C at step 933.

## Stage C3 Probe: `umoved` Reset + Repeat-Branch Delay Were Not Sufficient

*Observed locally on 2026-03-21; code reverted immediately.*

We tested the smallest local Stage C3 change suggested by the corrected plan:

- in `runMovementRepeatSlice(...)`
  - reset `player.umoved = false` before `lookaround()`
  - call `runmode_delay_output(game, display)` after `lookaround()` and before
    repeated `domove()`

Results:
- `seed031_manual_direct` remained unchanged:
  - first RNG divergence `933`
  - first event divergence `934`
- the early counted-repeat preservation corridor `160..166` remained unchanged
- the four targeted gameplay guardrails still passed

Interpretation:
- these two invariants are likely real C differences
- but adding them inside the current JS `runMovementRepeatSlice(...)` model is
  not sufficient to move the first actionable seam
- this strengthens the conclusion that the remaining mismatch is not just
  missing local pre-`domove()` details; it is also tied to the larger framing
  of the slice itself

Updated implication:
- the next investigation should compare the first dog-goal / gas-spore window
  under three models:
  1. current baseline
  2. local-invariant patch (`umoved` reset + repeat delay)
  3. C trace
- the most likely remaining explanations are now:
  - initial vs repeated travel-step framing mismatch
  - or the fact that `runMovementRepeatSlice(...)` is still a fused
    cross-iteration helper rather than a true C-repeat slice

So the next code step should not commit the local-invariant patch by itself.
The next code step should target the next smallest framing mismatch that still
separates the first dog-goal/gas-spore seam from C.

## Second Engineer Review of C3 Probe Failure

*2026-03-21.*

The C3 probe result is informative. The `umoved` reset and `runmode_delay_output`
call are real missing invariants but they're not the cause of the dog-goal
mismatch at step 933. Here's why:

### The real issue: `while (multi > 0)` still packs everything into one step

The C3 probe added correct per-slice invariants, but the slice is still inside
`repeatLoop()`'s `while (game.multi > 0)` loop. That means ALL travel hops
still execute within a single replay step (one `_gameLoopStep` call). C
spreads them across separate `moveloop_core()` iterations, each of which is
a separate "step" from the harness perspective.

The `runmode_delay_output()` call is not just a display boundary — in C's
harness, it's where `auto_inp` / `auto_step` checkpoint events fire. Each
checkpoint corresponds to one step in the C session. When JS packs 5 travel
hops into one step, the C session has 5 steps for the same hops. This is why
seed032 has 678 C steps but only 664 JS steps — the 14-step difference is
exactly the travel hops that JS packs together.

### What this means for the fix

The `umoved` reset and `runmode_delay_output` are necessary but not
sufficient. The sufficient fix requires either:

1. **Breaking the `while` loop** (the original Stage B approach) so each
   travel hop is a separate `_gameLoopStep` iteration — but this failed
   because the slice internals weren't C-shaped yet.

2. **Making the slice internals C-shaped first** (Stage C approach), then
   breaking the loop — which is the current plan.

The C3 probe confirmed that option 2 is correct: fixing slice internals
alone doesn't help because the outer `while` loop still fuses everything.
The invariants need to be combined with the owner move.

### Concrete prediction

The fix will work when BOTH are done simultaneously:
- Stage C3 invariants (umoved reset + repeat-branch delay) inside the slice
- Stage C4 owner move (one slice per `_gameLoopStep` iteration)

Neither alone is sufficient. The C3 probe proved this for the invariants;
the earlier Stage B2b probe proved it for the owner move.

### Seed032 analysis supports this

Seed032 has perfect RNG (29881/29881) but 48 screen failures. Analysis shows:
- C has 678 steps, JS has 664 — a 14-step deficit
- The 48 failing screens are ALL step-alignment issues: C shows messages or
  map content at steps where JS is offset by the packed travel hops
- The step deficit exactly corresponds to travel/run commands (`L`, `K`) where
  C spreads hops across multiple steps but JS packs them into one
- Once the moveloop refactor makes JS produce one step per hop, the step
  counts will match and the screen failures will resolve

This is the same root cause as seed031's step-933 divergence — both are
symptoms of the `while (multi > 0)` packing.

### Connection to the three-way framing asymmetry

The "Current Travel Framing Mismatch To Eliminate" section above identifies
three different JS frames for what C treats uniformly. The seed032 step-count
analysis provides quantitative evidence for the same conclusion:

- C produces 678 steps because each travel hop goes through a separate
  `moveloop_core()` iteration with its own `auto_step` checkpoint
- JS produces 664 steps because `repeatLoop`'s `while` loop fuses multiple
  hops into one `_gameLoopStep` call
- The 14-step deficit is exactly the hop count from `L`/`K` commands

Eliminating the three-way asymmetry (making initial, repeated, and top-level
travel all go through the same one-hop-per-iteration structure) would
automatically fix both the step count and the dog-goal ordering, because
each hop would get its own `movemon()` pass where monsters see the pre-hop
hero position.
