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

### 5. Replay boundary is currently weaker than "wait until input is needed"

The remaining post-`933` seam clarified an important runtime fact:

- session steps are still input-keyed
- but the JS replay executor currently allows a step to finish when
  `_gameLoopStep()` resolves, even if the game has not actually reached an
  input wait yet

This is visible in `js/replay_core.js:drainUntilInput()`:
- it races command completion against `waitForInputWait(...)`
- if the command promise resolves first, it returns `done: true`
- that means replay can record a step on promise completion rather than on a
  true input boundary

That distinction did not matter much while `_gameLoopStep()` usually returned
only at real input waits. It matters now because the validated owner fix
deliberately made `_gameLoopStep()` return after one positive-repeat slice.

The consequence is subtle but important:
- changing an internal loop boundary does **not** by itself redefine a
  session step
- however, if replay admits the next queued key after `_gameLoopStep()`
  completes while `input.isWaitingInput()` is still false, then JS is
  effectively allowing the next input earlier than the runtime is actually
  ready for it

So the next replay/runtime question is precise:
- after the resumed `_` travel command, when JS finishes one no-input slice
  and `_gameLoopStep()` returns, has the game truly reached an input wait?
- if not, replay must continue driving no-input continuation before consuming
  the next session key

This does **not** mean "step numbers are not input-delimited".
It means the current JS executor is not yet enforcing that input-delimited
boundary strongly enough.

### 6. The surviving gas-spore `near=1` vs `near=0` mismatch is still cross-step

The strongest correction from the latest analysis is:

- the normalized event window around the remaining seam does **not** compare
  the same recorded input key on both sides
- current alignment shows:
  - JS `step=937`, `step=938` keys are still `"l"`, `"l"`
  - the aligned C events are at `step=947`, `step=948`, whose keys are
    `"."`, `"h"`

This matters because it invalidates the earlier narrow claim:
- it is **not** yet proven that JS monster 27 and C monster 27 are seeing the
  same input-step boundary when `near=1` vs `near=0` is compared
- therefore the surviving `distfleeck()` mismatch is still best treated as
  cross-step attribution / ownership drift first, not as a confirmed
  monster-AI formula or `set_apparxy()` state bug

What remains true:
- JS step `937` shows gas spore at `(28,13)` refreshing to target `(26,13)` and
  moving to `(27,13)`
- JS step `938` then starts with:
  - `^movemon_turn[27@27,13 mv=12->0]`
  - `^distfleeck[27@27,13 in=1 near=1 ...]`

But because the aligned C `near=0` event lands on later recorded keys
(`"."`, `"h"`), the next fix target should be framed as:
- what command/timed-turn ownership still lets JS advance this monster bundle
  earlier in the session-step stream than C does?

That is a stronger and safer statement than:
- "monster 27 target persistence is wrong"

The immediate implication for implementation is:
- do not patch `distfleeck()` or `set_apparxy()` from this evidence
- continue treating the remaining problem as boundary/ownership drift until a
  same-key comparison proves otherwise

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

### Narrower owner-isolation result

A follow-up probe isolated only the local collapsed boundary:
- change:
  - after the resumed `_` command's initial `dotravel_target()` hop,
    `run_command()` skips the local movement `repeatLoop()`
  - top-level `_gameLoopStep()` `travelPath` continuation is left unchanged

Validation:
- `seed031` still first diverges at:
  - RNG `933`
  - event `934`
- but the spillover again drops sharply:
  - baseline `933..936`: `rng +431 / evt +169`
  - local-boundary-only probe: `rng +106 / evt +95`
- the same four targeted gameplay guardrails still pass

This is an important narrowing result:
- the local `finalizeTimedCommand() -> repeatLoop()` collapse is the dominant
  contributor to the `933..936` spillover reduction
- the top-level `travelPath` owner is still a real mismatch, but it is not
  needed to obtain that specific spillover improvement

What remains after removing the local drain:
- the first seam still begins at step `933`
- so the first resumed `_` slice itself is still not C-faithful even before
  the later top-level owner comes back into play

That means the next analysis target should be:
- the initial resumed `_` slice with local repeat drain suppressed
- specifically, what inside
  `dotravel_target() -> domove() -> finalizeTimedCommand()/advanceTimedTurn()`
  still reaches the gas-spore contact corridor too early

### Full deferred-travel implementation attempt

A direct implementation of the reviewed model was tested:
- initial resumed `_` travel step:
  - skip immediate `finalizeTimedCommand()`
  - set a deferred travel timed-turn flag
- next `_gameLoopStep()`:
  - run deferred `moveloop_core() + syncTimedTurnPreInputState()`
  - then use `runMovementRepeatSlice(...)` for top-level travel continuation

Validation:
- targeted gameplay guardrails all still passed
- but `seed031` reproduced the same result as the earlier combined owner probe:
  - first RNG divergence still `933`
  - first event divergence still `934`
  - later spillover improved, but the first seam did not move

Interpretation:
- the reviewed Phase 1/Phase 2 inversion insight is real and explains why the
  owner-only changes help the right region
- but implementing that model at the current helper boundaries still collapses
  to the same insufficient behavior
- so one more lower-level mismatch remains inside the first resumed `_` slice,
  even after:
  - deferring the initial travel timed turn
  - and routing later continuation through `runMovementRepeatSlice(...)`

### Second engineer review of boundary collapse analysis

The call chain trace is exactly right. The key insight is at step 4:
`advanceTimedTurn()` calls `moveloop_core()` then `syncTimedTurnPreInputState()`.
In C, after `rhack(0)` returns (having done `dotravel_target()` + `domove()`),
control returns to `moveloop_core()` which has ALREADY done its Phase 1
(`movemon()`) for this iteration BEFORE calling `rhack()`. So C's sequence is:

```
moveloop_core() iteration N:
  Phase 1: movemon()       ← monsters move (see hero at pre-travel position)
  Phase 2: rhack(0)
    → dotravel_target()
    → domove()             ← hero moves to first travel square
  ← returns to moveloop_core() which returns to moveloop()

moveloop_core() iteration N+1:
  Phase 1: movemon()       ← monsters move (see hero at post-first-hop position)
  Phase 2: multi > 0 branch
    → umoved = FALSE
    → lookaround()
    → runmode_delay_output()
    → domove()             ← hero moves to second travel square
```

But JS does:

```
_gameLoopStep():
  run_command()
    → dotravel_target() → domove()     ← hero moves
    → finalizeTimedCommand()
      → advanceTimedTurn()
        → moveloop_core()              ← Phase 1: monsters see POST-first-hop position
        → syncTimedTurnPreInputState()
    → repeatLoop()
      → runMovementRepeatSlice()
        → domove()                     ← second hop, STILL in same _gameLoopStep
        → advanceTimedTurn()
          → moveloop_core()            ← Phase 1: monsters see POST-second-hop
```

The problem isn't just that `repeatLoop` packs multiple hops. It's that
`finalizeTimedCommand()` → `advanceTimedTurn()` → `moveloop_core()` runs
Phase 1 (monsters) AFTER `domove()` within the same call frame. In C,
Phase 1 ran BEFORE `rhack()` in the same `moveloop_core()` iteration.

This means even the FIRST travel hop's monster processing is wrong:
monsters see the post-hop position instead of the pre-hop position, because
`moveloop_core()` is called AFTER `domove()` via `finalizeTimedCommand()`.

This is the same ordering issue I identified in the Stage B analysis, but
now pinpointed to the initial hop, not the repeat loop. The `advanceTimedTurn()`
call after `domove()` puts Phase 1 (monsters) AFTER the hero move, inverting
C's Phase 1 → Phase 2 ordering within one iteration.

This inversion is fundamental to how JS currently structures timed commands:
every timed command does `command() → finalizeTimedCommand() → advanceTimedTurn()`
which means monsters always see the post-command state, not the pre-command state.
For most commands this doesn't matter (monsters move AFTER the command either way),
but for travel's repeated hops it compounds because each hop's monster pass sees
a position one hop ahead of where C's monsters see it.

The spillover reduction when suppressing local `repeatLoop` makes sense:
it reduces the number of times this inversion compounds. But the first
inversion (from `finalizeTimedCommand`) still happens even without the loop.

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

## New structural correction: JS still lacks a positive-`multi` no-input lane

One more lower-level analysis pass corrected the owner model again.

The current JS runtime has explicit no-input continuation lanes in
`_gameLoopStep()` for:

- negative `multi`
- occupation

But it still does **not** have the equivalent no-input lane for positive
`multi` travel/running.

That means positive-travel continuation is currently forced into two wrong
owners:

1. **Too early**: local `run_command() -> repeatLoop()` drain inside the same
   resumed command frame
2. **Too late / wrong layer**: the later top-level `_gameLoopStep()`
   `travelPath` branch

There is no JS owner that corresponds to what C actually does:

- `rhack(0)` / `dotravel_target()` performs one travel hop
- control returns to the outer moveloop machinery
- the runtime immediately re-enters a **no-input positive-multi**
  continuation slice under outer-loop ownership
- without falling back into command-local `while (multi > 0)` draining
- and without waiting for a fresh command cycle

This explains two earlier results at once:

1. **Why suppressing only the local `repeatLoop()` helped so much**
   - it removed the dominant too-early owner
   - `933..936` spillover dropped from `rng +431 / evt +169`
     to `rng +106 / evt +95`

2. **Why the deferred-timed-turn rewrite still was not enough**
   - it postponed the first timed continuation to a later command-cycle entry
   - but C does not wait for a later command cycle here
   - C keeps running no-input continuation under outer moveloop ownership

So the remaining target is not just "break the `while` loop".
It is:

- add a JS positive-`multi` no-input continuation path in `_gameLoopStep()`
- make that path own exactly one C-shaped continuation slice
- and retire both the command-local overdrain and the dedicated top-level
  `travelPath` shortcut once the new lane exists

This is a stronger and more complete model than the earlier
"local owner vs top-level owner" framing:

- the local owner is the dominant wrong owner
- the top-level `travelPath` branch is a secondary wrong owner
- the missing owner is the real C-faithful outer no-input continuation lane

## Probe result: a positive-`multi` lane inside `_gameLoopStep()` is still too low-level

We tested the obvious next probe:

- suppress local movement overdrain in `run_command()`
- add a positive-`multi` / `context.mv` no-input lane inside the existing
  `_gameLoopStep()` `while` loop
- run one `runMovementRepeatSlice(...)` per loop pass

This probe was informative but still not correct.

### Validation result

- `seed031` still first diverged at:
  - RNG `933`
  - event `934`
- later spillover improved sharply again:
  - `933..936`: `rng +130 / evt +95`
- the current targeted gameplay guardrail
  `t11_s755_w_covmax9_gp.session.json` stayed green

### Why it still failed

Trace on the probe showed step `933` still contained multiple repeated travel
hops:

```text
step=933 domove_target from=22,14 to=23,13
... kitten turns at u=(23,13) ...
step=933 domove_target from=23,13 to=24,13
... gas spore / kitten turns ...
step=933 domove_target from=24,13 to=25,13
step=933 domove_target from=25,13 to=26,13
step=933 domove_target from=26,13 to=27,13 mon=27@27,13
step=933 domove_attackmon_at ...
```

So even though the new lane removed the command-local `repeatLoop()`, it still
did not create a C-faithful boundary. The reason is structural:

- `_gameLoopStep()` itself owns an internal `while (true)` loop
- as long as that loop keeps `continue`-ing through no-input continuation
  work, replay still sees it as the **same gameplay step**
- therefore positive-travel slices are still fused together inside one replay
  step, just under a different local owner

### Corrected implication

The missing owner is not merely "inside `_gameLoopStep()`".
It must be:

- a no-input continuation owner that yields **after one slice**
- so the runtime can re-enter for the next slice without consuming a new key
- but also without keeping all slices inside one `_gameLoopStep()` call

In other words:

- local `repeatLoop()` is too early
- later dedicated `travelPath` is too late
- `_gameLoopStep()`-internal `while` continuation is still too fused

The real C-faithful boundary must sit **above** the current `_gameLoopStep()`
internal loop, or `_gameLoopStep()` itself must be refactored so one
positive-repeat slice causes it to return rather than `continue`.

## Validated owner fix: one positive-repeat slice per `_gameLoopStep()` return

The next probe finally produced a meaningful parity improvement.

Implemented together:

1. suppress local movement overdrain in `run_command()` when `context.mv`
   is active
2. add a positive-`multi` no-input continuation lane in `_gameLoopStep()`
3. make that lane `return` after one slice instead of `continue`-ing the
   internal `_gameLoopStep()` loop
4. defer the timed continuation after the initial resumed `_` travel hop into
   a dedicated `pendingTravelTimedTurn` pass

### Why all four parts mattered together

Earlier probes established these partial truths:

- suppressing only the local `repeatLoop()` removed the dominant overdrain but
  still left the first resumed `_` slice wrong
- adding a positive lane inside `_gameLoopStep()` without returning after one
  slice was still too fused
- deferring the initial travel timed turn without fixing the later owner
  boundaries was also insufficient

The combined fix works because it creates separate outer runtime re-entries
for:

1. the initial resumed `_` hop
2. the timed continuation after that hop
3. each later positive-repeat slice

That is the first JS structure in this investigation that no longer collapses
all of those into one replay-visible step family.

### Validation evidence

`seed031_manual_direct.session.json`

- `comparison-window --step-summary --step-from 931 --step-to 936` now shows:
  - step `933`: `rng 0 / evt 0`
  - first new spillover begins at step `934`
- normalized RNG window moved from:
  - baseline JS step `933`
  - to JS step `938`
- normalized event window moved from:
  - baseline JS step `934`
  - to JS step `996`

Focused trace after the fix:

```text
step 933: initial resumed hop only
step 934: timed continuation after first hop
step 935: one travel hop
step 936: one travel hop
```

So the same-step multi-hop packing has been eliminated.

### Stability checks

- counted-repeat corridor `160..166`: unchanged
- gameplay guardrails still green:
  - `t11_s755_w_covmax9_gp`
  - `t11_s756_w_covmax10_gp`
  - `theme15_seed986_wiz_artifact-wish_gameplay`
  - `theme35_seed2320_wiz_artifact-combat2_gameplay`
- nearby controls stayed on their prior divergence classes:
  - `seed032_manual_direct`: unchanged RNG-full / screen-event drift class
  - `seed033_manual_direct`: unchanged early special-level RNG seam

### Reporting caveat

`session_test_runner`'s legacy `firstDivergence.step` metadata still reports
`933` on this session. The authoritative evidence for step movement on this
patch is:

- normalized `comparison-window` output
- and the per-step spillover summary

That mismatch should be treated as step-label reporting lag, not as evidence
that the owner fix failed.

## Follow-up probe: exact C stop-before-attack gate is real, but not sufficient

After `7feb605cd`, the next probe reintroduced the exact C hostile-visible
running stop from `hack.c:2762-2773` on top of the validated owner fix:

- if `context.run` is active
- and the destination square contains a visible/sensed non-safe monster
- stop running with `nomul(0)`, set `context.move = 0`, and return before
  bump/attack

### What changed

This no longer behaved like the earlier pre-owner-fix experiments.

On the owner-correct baseline, the probe did the right thing at the old bad
 contact point:

```text
step 938 domove_target from=26,13 to=27,13 mon=27@27,13
step 938 domove_notime stop-visible-hostile-while-running from=26,13 dir=1,0 run=0 travel=0
step 938 movemon_turn[27@27,13 ...]
```

So JS no longer entered `domove_attackmon_at()` first. The old hero-attack
 mismatch was removed.

### New first mismatch under the probe

The first raw RNG mismatch moved from hero attack to monster-side AI:

- JS:
  - `rn2(5)=0 @ dochug(monmove.js:847)`
- C:
  - `rn2(8)=7 @ m_move(monmove.c:1979)`

And the first event mismatch became:

- JS:
  - `^distfleeck[27@27,13 in=1 near=1 scare=0 brave=1 ...]`
- C:
  - `^distfleeck[27@27,13 in=1 near=0 scare=0 brave=1 ...]`

This is important because:

- `brave` aligned
- the premature hero attack disappeared
- the remaining mismatch is now only the monster-side `near` state

### Interpretation

This means the exact C stop-before-attack rule is genuinely part of the final
fix, but it is **not** the whole fix.

The residual mismatch is now narrower:

- after the stop gate fires, JS still hands monster `27` an adjacent apparent
  hero target before the first post-stop `distfleeck()`
- C does not

So the next target is no longer `domove_core()` ownership. It is the
post-stop monster-target handoff:

- `set_apparxy()`
- `distfleeck()`
- and the exact state/order by which monster `27` inherits the hero target

### Why the probe was reverted

By the repo standard, it still did not move the session's first-divergence
step later, so it was not kept as code.

However, it was a successful diagnostic probe because it proved:

1. the owner fix made this C gate meaningful
2. the old hero-attack mismatch is now behind us once the gate is present
3. the remaining bug is specifically the post-stop `near` state, not generic
   travel ownership anymore

## Follow-up probe: defer repeated travel timed turns, then reapply the exact C stop gate

After the validated owner fix in `7feb605cd`, the next useful structural probe
was to treat repeated travel hops like the initial resumed `_` hop:

- repeated `context.mv` slices no longer finalized their timed turn inline
- instead they armed a pending timed continuation for the next `_gameLoopStep()`
- then the exact C visible-hostile stop gate from `hack.c:2762-2773` was
  reapplied on top

### What improved

This combination was materially better than either piece alone:

- `seed031` matched RNG increased to `34371/51561`
- `seed031` matched events increased to `19071/28950`
- the old hero-attack mismatch disappeared again
- the first raw mismatch became:
  - JS: `rn2(5)=0 @ dochug(monmove.js:847)`
  - C: `rn2(8)=7 @ m_move(monmove.c:1979)`
- the first event mismatch became:
  - JS: `^distfleeck[27@27,13 in=1 near=1 scare=0 brave=1 ...]`
  - C: `^distfleeck[27@27,13 in=1 near=0 scare=0 brave=1 ...]`

The normalized RNG seam also moved later again:

- previous owner-fix baseline: first normalized RNG mismatch at JS step `938`
- combined probe: first normalized RNG mismatch at JS step `941`

So this is the cleanest surviving seam so far:

- `brave` aligns
- the hero attack is gone
- the residual mismatch is only monster `27`'s `near` state before `m_move()`

### What the trace proved

The focused propagation trace around steps `940..942` showed:

```text
JS step 940:
  set_apparxy ... id=279 old=(24,13) new=(26,13)
  distfleeck ... pos=(28,13) roll=1
  m_move-begin ... pos=(28,13) target=(26,13)
  distfleeck ... pos=(27,13) roll=1

JS step 941:
  domove_target from=26,13 to=27,13 mon=27@27,13
  domove_notime stop-visible-hostile-while-running ...
  set_apparxy ... id=279 old=(26,13) new=(26,13)
  distfleeck ... pos=(27,13) roll=0
```

At the comparable C window:

- monster `27`'s first relevant event is still:
  - `^distfleeck[27@27,13 in=1 near=0 ...]`
- and only *after* that does C reach:
  - `rn2(8)=7 @ m_move(monmove.c:1979)`
  - then the follow-up `^distfleeck[27@26,13 in=1 near=1 ...]`

So JS is still refreshing monster `27`'s apparent target to `(26,13)` too
early, one slice before C does.

### Corrected interpretation

The remaining bug is no longer in:

- the direct hero attack path
- generic top-level travel ownership
- or the visible-hostile stop gate itself

It is specifically in the timed-turn handoff *before* monster `27`'s first
post-stop `distfleeck()`:

- JS gives monster `27` a turn at `28,13 -> 27,13` with `mux/muy=(26,13)`
- C does not expose that state yet at the comparable boundary

This points at one more lower-level boundary bug:

- the repeated-travel timed continuation is still entering monster work one
  slice too early relative to C, even after the owner fix and stop gate

### What is now validated and should stay

The exact C visible-hostile stop gate in `hack.c:2763-2773` is now validated on
top of the owner fix and should remain part of the port:

- while running/traveling, if the destination monster is hostile and
  visible/sensed, stop before bump/attack resolution
- then clear running/travel via the adjacent hostile-contact `nomul(0)` before
  bump/attack handling

This change is no longer provisional because it:

- removes the old hero-attack mismatch
- improves `seed031` to the best narrowed seam seen so far:
  - RNG matched `34371/51561`
  - events matched `19071/28950`
- keeps the current gameplay guardrails green

So the next stage should build on that stop gate, not revisit whether it is
correct.

### New lower-level finding after the stop-gate fix

Fresh `WEBHACK_MONMOVE_TRACE` on top of `6c72c5e14` shows the remaining
`near=1` mismatch is not caused by `distfleeck()` or `set_apparxy()` doing the
wrong work on the bad turn itself.

What actually happens in JS:

- on monster `27`'s prior turn, `set_apparxy()` already refreshes `mux/muy` to
  the hero's exact square (for example `old=(62,15) -> new=(64,15)`)
- then the second `set_apparxy()` call inside the same `dochug()/m_move()`
  corridor immediately hits the fast path:
  - `mode=direct`
  - `u_at_old=1`
- on the next monster `27` turn, the first `set_apparxy()` starts from that
  already-direct target, so the first `distfleeck()` inevitably sees
  `near=1`

This means:

- the remaining bug is upstream of the bad `distfleeck()` call
- the real difference is that JS gives monster `27` one direct target refresh
  too early, on the immediately preceding turn
- therefore the next fix target is not:
  - `distfleeck()`
  - `monnear()`
  - or the `set_apparxy()` formulas themselves
- the next fix target is:
  - why monster `27` gets that preceding turn / target refresh earlier than C

Concrete implication:

- the next parity question is:
  - "what earlier timed-turn / movemon boundary lets JS refresh monster `27` to
    the hero's exact square one cycle before C?"
- not:
  - "how should `near` be calculated?"

### Why this probe was reverted

By the repo standard it still did not move the legacy first-divergence step
label later, and it was not yet clear enough to keep as code.

However, this was still a strong diagnostic result because it showed:

1. deferred repeated travel timed turns are directionally correct
2. the exact C stop gate stays correct on top of that deferral
3. the remaining difference is now narrowed to monster `27`'s pre-`m_move()`
   handoff, not hero attack logic

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

## Strategic Review (Second Engineer, 2026-03-21)

### Assessment of the investigation

The 8 probes have been excellent work. Each one was disciplined: isolated
one variable, measured the result, reverted, documented. The cumulative
knowledge is now substantial:

| What works | Evidence |
|---|---|
| Owner fix: one slice per `_gameLoopStep` return | Step 933 now one hop, guardrails green |
| C stop-before-attack gate | Hero-attack mismatch eliminated |
| Deferred repeated timed turns | Best RNG yet: 34371/51561 |

| What's left | Evidence |
|---|---|
| Monster 27 gets `set_apparxy` refresh one turn early | `near=1` vs `near=0` |
| Preceding turn gives monster 27 `mux/muy = hero exact square` | Trace: `mode=direct, u_at_old=1` |

### The pattern I see

Each probe fixes one boundary, then reveals the next boundary is also
wrong. This isn't random — it's causal. The fused `advanceTimedTurn()`
propagates a one-iteration timing offset forward through the monster
turn chain. Fixing one monster's timing relative to the hero exposes that
the NEXT monster's timing is also off by one iteration.

The probes have been surgically correct but structurally incomplete.
They're treating symptoms of the same root cause.

### Concrete recommendation

You're very close. The validated owner fix + stop gate + deferred timed
turns got you to 34371/51561 (67% RNG match). The remaining 33% gap is
the one-turn-early `set_apparxy` refresh.

That refresh happens because `advanceTimedTurn()` runs `moveloop_core()`
(which calls `movemon()` → `set_apparxy()`) AFTER `domove()` has already
updated the hero position. Monster 27 sees the post-hop hero position
when it should see the pre-hop position.

**The fix**: in the deferred-timed-turn model (your best probe so far),
the repeated slice currently does:

```
domove() → hero moves
pendingTravelTimedTurn → advanceTimedTurn()
  → moveloop_core() → movemon() → set_apparxy sees NEW hero pos  ← bug
```

C does:

```
moveloop_core() → movemon() → set_apparxy sees OLD hero pos
domove() → hero moves
```

The ordering difference: C runs `movemon` BEFORE `domove`. JS runs it
AFTER. For the INITIAL travel hop this doesn't matter (the hop is part
of the current `moveloop_core` iteration which already ran `movemon`).
But for REPEATED hops, the deferred timed turn runs `movemon` with the
hero already at the new position.

**To fix**: the deferred timed turn for a repeated hop should run
`movemon` BEFORE the next `domove`, not after the current one. In
practice this means the repeated-hop slice should be:

```
// Phase 1 of THIS iteration (from previous deferred turn)
moveloop_core()         ← monsters see hero at CURRENT position
syncTimedTurnPreInput() ← pre-input sync
// Phase 2 of THIS iteration
umoved = false
lookaround()
runmode_delay_output()
domove()                ← hero moves to NEXT position
// DON'T run moveloop_core here — defer to next slice
return (one slice done)
```

The key insight: `moveloop_core` (which contains `movemon`) should run
at the TOP of each repeat slice, not at the BOTTOM. The deferred timed
turn runs it at the bottom (after domove), which is the wrong ordering
for repeated hops.

This is a one-line reorder, not a structural refactor. Move the
`moveloop_core` + `syncTimedTurnPreInputState` calls from AFTER `domove`
to BEFORE `lookaround` in the repeated-hop slice. The deferred-turn flag
just becomes "run phase 1+2 at the start of the next `_gameLoopStep`
entry rather than at the end of the current one."

### Why I'm confident

The trace data from your latest probe proves the exact mechanism:
monster 27's `set_apparxy` runs with the hero at `(26,13)` when it
should be at `(24,13)`. That's a two-hop offset. The hero moved from
`(24,13)` → `(25,13)` → `(26,13)` and then the deferred `movemon` ran.
If `movemon` had run BEFORE those two hops (at the top of the slice
instead of after), it would see `(24,13)` — matching C.

### Suggested experiment

On top of your best probe (deferred timed turns + stop gate):

1. In the repeated-hop slice, move the `advanceTimedTurn` call from
   after `domove` to before `lookaround`
2. For the first repeated hop after the initial `_` command, the
   deferred timed turn should fire before `lookaround`, not after `domove`
3. Test: does `^dog_invent_decision ... ud=8` now match C?

If yes, commit. If no, trace where `movemon` actually runs relative to
`domove` in the reordered slice and compare with C's trace.

## 2026-03-21 correction: reason on gameplay-step numbering, not raw `steps[]`

For `manual-direct-live` sessions, the runtime diagnostics and replay key
stream operate on `getSessionGameplaySteps(session)`, not the raw JSON
`session.steps[]` indices.

For `seed031_manual_direct`:
- raw steps length: `1366`
- gameplay steps length: `1351`
- offset: `15`

Concrete gameplay-key window at the remaining seam:
- gameplay `931`: `"l"`
- gameplay `932`: `"l"`
- gameplay `933`: `"."`
- gameplay `934`: `"h"`
- gameplay `935`: `"b"`
- gameplay `936`: `"y"`
- gameplay `937`: `"."`
- gameplay `938`: `"f"`
- gameplay `939`: `"l"`

So any owner or mapdump analysis for this corridor must be aligned to gameplay
steps, not the raw JSON step numbers. A raw `dbgmapdump --steps 933-938`
comparison is looking at the wrong part of the session for this bug.

## 2026-03-21 probe result: fresh keys arrive, but JS still honors carried travel state

With the validated baseline on `armoroff-general-fix`:
- `7feb605cd` owner-side travel fix ported onto branch
- `6c72c5e14` exact visible-hostile stop gate ported onto branch
- branch head after push: `a98f4379f`

live replay inspection around gameplay steps `933..939` shows:

```json
{"step":933,"key":".","u":[23,13],"multi":80,"ctx":{"run":8,"travel":1,"mv":true,"move":1}}
{"step":934,"key":"h","u":[24,13],"multi":80,"ctx":{"run":8,"travel":1,"mv":true,"move":1}}
{"step":935,"key":"b","u":[25,13],"multi":80,"ctx":{"run":8,"travel":1,"mv":true,"move":1}}
{"step":936,"key":"y","u":[26,13],"multi":80,"ctx":{"run":8,"travel":1,"mv":true,"move":1}}
{"step":937,"key":".","u":[26,13],"multi":0,"ctx":{"run":0,"travel":0,"mv":false,"move":0}}
```

And `REPLAY_PENDING_TRACE` shows those later steps are **fresh** command cycles:

```text
step=934 key="h" mode=start-gameloop start=done owner=none waiting=0 ...
step=935 key="b" mode=start-gameloop start=done owner=none waiting=0 ...
step=936 key="y" mode=start-gameloop start=done owner=none waiting=0 ...
```

But `RUN_TRACE` still shows:

```text
step=934 domove_target from=23,13 to=24,13 mon=none
step=935 domove_target from=24,13 to=25,13 mon=none
step=936 domove_target from=25,13 to=26,13 mon=none
```

This is the strongest current evidence:
- the post-`933` drift is not a still-pending `_` prompt or pending command
- fresh gameplay keys are arriving
- but JS still lets the previously armed travel/run state drive `domove_target`
  inside those fresh command cycles

So the remaining bug is not just "repeat ownership is wrong". More precisely:
- JS is failing to cancel or supersede carried travel state when a new real
  command key is consumed
- the surviving gas-spore seam is downstream of that state-carry behavior

## 2026-03-21 rejected probe: top-of-loop queue preemption is not sufficient

A narrow probe changed `_gameLoopStep()` so the positive-repeat movement lane
would not activate when `input.getInputState().queueLength > 0`.

Result:
- `t11_s755_w_covmax9_gp` stayed green
- `seed031_manual_direct` changed slightly:
  - matched RNG `34371 -> 34381`
  - matched events `19071 -> 19069`
- first seam did **not** move later

More importantly, the probe did **not** fix the actual mechanism:
- fresh keys still accumulated in the queue while steps `934..936` advanced
  `domove_target`
- by step `936`, `queueLength` had grown to `3`

So the bad continuation is not chosen only by the top-level
`hasPositiveMoveContinuation` branch. The fresh key is entering a command cycle
that still honors the carried travel state.

That probe was reverted.

## Current best next step

Inspect the fresh-command path itself:
- `runOneCommandCycle(firstCh)`
- `rhackCore()`
- move command setup in JS vs C `cmd.c:set_move_cmd()`

The likely missing behavior is:
- when a fresh real movement key is consumed after auto-travel was armed,
  JS must cancel or supersede the previous travel/run state before executing the
  new command
- rather than continuing to interpret the turn as `domove_target()` under the
  carried travel state

## 2026-03-21 rejected probe: fresh-movement setup alone is not enough

A narrow `cmd.js` probe attempted to make fresh movement keys perform a
`set_move_cmd()`-style state transition before `domove()`:
- set `player.dx/dy`
- clear `travel/travel1`
- clear carried auto-travel state

Result:
- `seed031_manual_direct` was unchanged:
  - first RNG divergence still `933`
  - first event divergence still `934`
- `t11_s755_w_covmax9_gp` stayed green

More importantly, targeted traces were unchanged:

```text
step=934 domove_target from=23,13 to=24,13 mon=none
step=935 domove_target from=24,13 to=25,13 mon=none
step=936 domove_target from=25,13 to=26,13 mon=none
```

So the bad `934..936` travel hops are not being caused solely by the fresh
movement branch in `rhack()`. That patch was reverted.

## 2026-03-21 decisive owner trace: queued fresh keys exist, but `_gameLoopStep()` still takes the positive-repeat lane first

A temporary `_gameLoopStep()` branch-owner trace showed the exact control flow
for gameplay steps `933..937`:

```text
step=933 branch=pendingTravelTimedTurn multi=80 run=8 mv=1 travel=1 pendingTravel=1 qlen=0
step=934 branch=positiveMoveContinuation multi=80 run=8 mv=1 travel=1 pendingTravel=0 qlen=1
step=935 branch=positiveMoveContinuation multi=80 run=8 mv=1 travel=1 pendingTravel=0 qlen=2
step=936 branch=positiveMoveContinuation multi=80 run=8 mv=1 travel=1 pendingTravel=0 qlen=3
step=937 branch=positiveMoveContinuation multi=80 run=8 mv=1 travel=1 pendingTravel=0 qlen=4
```

At the same time, replay traces report fresh gameplay keys:

```text
step=934 key="h" mode=start-gameloop start=done ...
step=935 key="b" mode=start-gameloop start=done ...
step=936 key="y" mode=start-gameloop start=done ...
step=937 key="." mode=start-gameloop start=done ...
```

This proves:
- fresh keys have already been queued (`qlen=1..4`)
- but before consuming them, `_gameLoopStep()` is still choosing the
  `positiveMoveContinuation` lane
- those queued keys are therefore being attributed to travel slices that still
  belong to the previously armed auto-travel state

That is the clearest current statement of the seam:
- same fixture key stream
- but JS is still assigning explicit no-input positive-repeat work to later
  queued keys before those keys are actually consumed

## 2026-03-21 rejected probe: post-step explicit-owner drain in `replay_core` did not change the session

A narrow replay-only probe tried to drain only the already-explicit no-input
owners after a command completed:
- `pendingTravelTimedTurn`
- `multi > 0 && context.mv`
- negative `multi`
- `occupation`
- `travelPath` fallback

Result:
- `seed031_manual_direct` unchanged
- `t11_s755_w_covmax9_gp` still green

So simply adding a post-step explicit-owner drain in `replay_core` did not fix
the attribution problem. That probe was reverted immediately.

What this means:
- the owner-trace diagnosis is real
- but the specific replay-side drain attempted here was not sufficient as an
  implementation
- the next fix must be reasoned from the exact point where a queued key first
  becomes visible to replay ownership, not from a generic "drain more after the
  step" rule

## 2026-03-21 strategy refinement: define the seam as violated ownership invariants

The most productive next step is to stop describing the remaining problem as a
general "travel attribution bug" and instead define it as a small set of
explicit ownership invariants that JS must satisfy.

This is useful because:
- the remaining seam is now narrow
- several plausible one-off fixes have already been rejected
- the current evidence is strongest when phrased as a forbidden coexistence of
  runtime states, not as a guessed branch rewrite

### Core invariant family

The shared fixture key stream is authoritative. Therefore the remaining bug can
be expressed as a question of when the runtime is allowed to expose the next
fixture key relative to the previous command's no-input continuation owners.

The key invariant candidates are:

1. **Queued-key / positive-repeat exclusion**
   - once a fresh gameplay key is already queued for the current fixture step,
     JS must not still execute the previous command's explicit no-input
     positive-repeat travel slice first
   - current `seed031` evidence violates exactly this:
     - `qlen=1..4`
     - while `_gameLoopStep()` still chooses `branch=positiveMoveContinuation`

2. **Queued-key / prior-owner exclusion**
   - more generally, once a fresh gameplay key is visible to the runtime,
     prior-command explicit no-input owners should already be exhausted
   - relevant owners are the ones already modeled in `_gameLoopStep()`:
     - `pendingTravelTimedTurn`
     - `multi > 0 && context.mv`
     - `context.move && multi < 0`
     - `occupation`
     - `travelPath` fallback

3. **Step-finalization discipline**
   - replay should only finalize a captured gameplay step after the explicit
     no-input owners that belong to that consumed fixture key have been fully
     accounted for
   - if a later key is already visible before that point, the boundary is wrong

### Why this is better than another speculative fix

The rejected probes already showed:
- a fresh-movement `cmd.js` patch was too shallow
- a generic replay-side "drain more" rule was too blunt
- a top-of-loop queue-preemption patch was not sufficient

Those failures were all missing the same thing:
- they changed control flow without first stating exactly which state
  combinations are forbidden

The invariant formulation gives a better procedure:
1. encode the forbidden coexistence as a debug-only assertion or diagnostic
2. reproduce `seed031`
3. identify the first point where JS violates the invariant
4. fix the owner boundary that is demonstrably responsible

### Physical assertions / diagnostics to add

These should be debug-only and high-signal at first, not shipping behavior
changes:

1. **Pre-positive-repeat guard**
   - before `_gameLoopStep()` takes `hasPositiveMoveContinuation`
   - assert or log if `input.getInputState().queueLength > 0`
   - this directly encodes the currently observed seam

2. **Key-admission guard**
   - when replay is about to expose the next fixture key to the runtime
   - assert or log if any explicit no-input owner from the prior command is
     still armed

3. **Step-finalization guard**
   - when replay decides a gameplay step is complete
   - assert or log whether explicit no-input owners still exist for that same
     consumed key

These assertions are not the fix. They are there to force the next iteration to
be argued in terms of a concrete ownership contract rather than intuition.

### Current hypothesis, stated as an invariant violation

The best current reading of `seed031` is:
- JS is allowing a fresh fixture key to become visible while the previous
  command still owns `positiveMoveContinuation`
- then replay captures the resulting travel hop under the later queued key

That is the invariant violation to attack next.

### Practical next step

Add the debug-only invariant checks above, using the existing owner predicates
already present in `_gameLoopStep()` rather than inventing new owner concepts.

The desired outcome of that pass is not an immediate parity fix. It is to
produce one precise answer to this question:

- **At what exact point does the next fixture key first become visible while a
  prior explicit no-input owner is still active?**

Once that answer is recorded, the next behavior patch can target the actual
boundary owner instead of another approximate proxy.

## Review of invariant-based approach (Second Engineer)

The invariant-based framing is the right move. Three observations:

### 1. The owner trace is the breakthrough finding

The decisive trace at steps 933-937 is the clearest evidence in this
entire investigation:

```
step=934 branch=positiveMoveContinuation qlen=1
step=935 branch=positiveMoveContinuation qlen=2
step=936 branch=positiveMoveContinuation qlen=3
```

Fresh keys are queued but `_gameLoopStep()` keeps choosing the travel
continuation lane. This is the invariant violation stated precisely. The
previous probes were working around this without seeing it directly.

### 2. Correcting my earlier "reorder moveloop_core" advice

I previously recommended moving `moveloop_core` from after `domove` to
before `lookaround`. That was based on the assumption that the
repeated-hop slice was the issue. But the owner trace shows the real
problem is upstream: JS is still running travel continuation slices when
it should be consuming the queued fresh key instead. The ordering within
a slice may be fine — the issue is that the slice shouldn't be running
at all when fresh keys are waiting.

### 3. Why the invariant approach should work

The forbidden state is clear: `qlen > 0 && branch == positiveMoveContinuation`.
In C, this can't happen because:

- `moveloop_core()` returns after one iteration
- the outer `for(;;)` loop re-enters `moveloop_core()`
- C's `nhgetch()` at the `rhack(0)` call in Phase 2 consumes the next
  key immediately
- if a key is already buffered, `nhgetch` returns instantly
- the key is consumed BEFORE any positive-repeat continuation is
  considered (because `rhack(0)` runs AFTER the positive-repeat branch
  in C's if/else-if chain)

Wait — actually that's backwards. In C's `moveloop_core()` at lines
626-650:

```c
if (gm.multi > 0) {
    // positive repeat runs FIRST
    lookaround();
    domove();
} else if (gm.multi == 0) {
    rhack(0);  // fresh command runs ONLY when multi == 0
}
```

C checks `multi > 0` BEFORE `multi == 0`. So C ALSO runs positive-repeat
before consuming a fresh key. The difference is: in C, the fresh key
hasn't been read yet (it's waiting in the terminal buffer). In JS, the
replay engine has already pushed it into the queue.

This means the invariant violation is actually a **replay engine** issue,
not a `_gameLoopStep` issue. The replay engine pushes the next fixture
key before the previous command's no-input owners have completed. In C,
the next key simply hasn't arrived yet because `nhgetch` hasn't been
called.

### What this means for the fix

The fix should be in how the replay engine exposes keys to the runtime,
not in how `_gameLoopStep` prioritizes branches. The replay engine
should NOT push the next fixture key until all no-input owners from the
current step are exhausted.

In `replay_core.js`, `drainUntilInput()` determines when a step is
"done" (the game is waiting for input). If it declares the step done
too early — while positive-repeat continuation is still active — then
the next key gets pushed and queued, creating the `qlen > 0` state that
causes `_gameLoopStep` to attribute the continuation to the wrong step.

### Concrete suggestion

Check `drainUntilInput()` and `isWaitingInput()`: do they correctly
detect that positive-repeat continuation is still active? If
`isWaitingInput()` returns true while `multi > 0 && context.mv`, the
replay engine will push the next key prematurely.

The fix may be as simple as: `isWaitingInput` should return false when
`hasPositiveMoveContinuation` is true, so the replay engine keeps
draining instead of exposing the next key.

### My recommendation

1. Add the debug assertions (they're cheap and will confirm)
2. Check `isWaitingInput()` / `drainUntilInput()` for premature
   input-ready detection during positive-repeat continuation
3. If `isWaitingInput` is the culprit, the fix is one predicate change —
   not a structural refactor
