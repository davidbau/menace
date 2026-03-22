# Eating Occupation

## Current Problem Statement

This document explains the eating-occupation model in NetHack C and the
specific parity problem currently exposed by
`test/comparison/sessions/seed031_manual_direct.session.json`.

The live `seed031` seam is not best described as "corpse nutrition is wrong" or
"monster AI is wrong". The sharper description is:

- JS and C disagree about **which replay key owns the next chunk of work**
  during a multi-step eating corridor.
- The disagreement shows up as **cross-step ownership drift**.
- C does real timed-turn work earlier; JS delays that work to later keys.
- The later delayed work shifts monster state and eventually surfaces as the
  first authoritative RNG divergence at gameplay step `1241`.

Current authoritative first divergence:

- session: `seed031_manual_direct.session.json`
- first RNG divergence: gameplay step `1241`
- JS: `rn2(3)=0 @ dochug(monmove.js:847)`
- C: `rn2(5)=0 @ distfleeck(monmove.c:539)`

The best current evidence for ownership drift is:

- `comparison-window --step-summary 1236..1246`
  - C-heavy at `1236..1242`
  - JS-heavy payback at `1243` and `1246`
- `rng_step_diff --step 1238`
  - JS: `(end)`
  - C: `gethungry()` -> hero attack -> monster turn
- `rng_step_diff --step 1243`
  - JS: full monster turn
  - C: `(end)`

So the real failure mode is:

- JS delays a chunk of timed-turn work by several gameplay keys.
- That later reordering changes monster movement/flee state.
- The visible monster seam at `1241` is downstream fallout.

This is why local fixes to `distfleeck()`, `set_apparxy()`, or corpse-side
effects have not been keepable: they are downstream of the wrong owner.

## Why Eating Is a Good Suspect

The seam sits inside a repeated meal/prompt corridor. Around the late failure,
the fixture toplines repeatedly cycle through:

- floor-food prompt
- resume meal
- stop/finish eating
- corpse taste/status messages
- later monster-time messages

Replay diagnostics show that, in the corresponding late raw window, JS is
waiting inside `handleEat()` for input while message-boundary state is still
live:

- owner: `input`
- pendingPrompt: `none`
- `messageNeedsMore = 1`
- `ack = 1`

That does **not** prove `eat.js` contains the final fix, but it does prove the
active owner is inside the eating command path rather than a stale
`pendingPrompt`.

## C Model: Progression First

The C implementation is fundamentally synchronous and single-owner.

Relevant files:

- `nethack-c/patched/src/eat.c`
- `nethack-c/patched/src/allmain.c`

The important progression is:

1. `doeat()` starts the interaction.
2. If the selected item is the current `victual.piece`, `doeat()` resumes the
   meal and calls `start_eating()`.
3. `start_eating()`:
   - initializes/refreshes eating state,
   - applies the first bite immediately via `bite()`,
   - either finishes immediately via `done_eating()`,
   - or sets `go.occupation = eatfood`.
4. Later moveloop iterations run exactly one occupation callback by invoking
   `(*go.occupation)()`.
5. `eatfood()` consumes one more bite, then either:
   - returns `1` to stay occupied, or
   - calls `done_eating()` and returns `0`.
6. `done_eating()` clears occupation early, runs hunger/post-effects, consumes
   the object, and zeroes `svc.context.victual`.

This progression is synchronous:

- one active input owner at a time
- one call stack
- no async suspension model
- prompts like `yn_function()` and `more()` block and return directly to the
  same caller

That "single owner, synchronous return" rule is the key behavioral invariant JS
must emulate.

## C Model: State Variables Second

The synchronous flow uses a compact state bundle to remember meal progress:

- `go.occupation`
- `svc.context.victual`

Important `victual` fields:

- `piece`
- `o_id`
- `usedtime`
- `reqtime`
- `nmod`
- `eating`
- `fullwarn`
- `doreset`
- `canchoke`

What these mean operationally:

- `piece` / `o_id`: which object is being consumed
- `usedtime` / `reqtime`: current bite count vs total duration
- `nmod`: nutrition distribution per bite
- `eating`: whether the hero is actively in an eating flow
- `fullwarn`: whether the near-choking warning already fired
- `doreset`: deferred meal reset requested by other logic
- `canchoke`: whether choking logic still applies to this meal

The important point is not just that C uses state. It is that the state is
driven by synchronous control flow, not by separate async owners.

## How C Handles the Occupation in `moveloop()`

The controlling loop in `allmain.c` is:

- if `gm.multi >= 0 && go.occupation`
  - call the occupation callback once
  - clear `go.occupation` if it returns `0`
  - then run interruption checks like `monster_nearby()`
  - then return to the top-level loop

This matters because the occupation is not a free-floating async continuation.
It is a synchronous branch in the main loop with a single owner.

Relevant C shape:

- `eatfood()` controls "one more bite"
- `allmain.c` controls "one more occupation step"

That separation is simple in C and easy to reason about:

- progression logic lives in `eat.c`
- scheduling/ownership lives in `allmain.c`

## Fullness Warning and Prompt Ownership

One subtle but important C detail is the near-choking warning in
`lesshungry()`:

- `lesshungry()` may print:
  - `"You're having a hard time getting all of it down."`
- while eating, it may ask:
  - `"Continue eating?"`

In C, this still remains synchronous:

- `lesshungry()` calls the prompt
- the prompt returns to `lesshungry()`
- `lesshungry()` returns to the eating flow
- no separate prompt continuation object is created

That means C does not have ambiguity about which future key "belongs" to the
meal versus to command parsing. The answer is: the current synchronous caller
owns it until that prompt returns.

## Why JS Is Vulnerable Here

JS has to emulate C's single-owner model using async calls.

That is fragile around:

- `putstr_message()`
- `more()`
- raw `nhgetch()`
- `ynFunction()`
- command-boundary `tty_clearmsg()` behavior

The failure family now under investigation is:

- JS enters a raw input wait inside `handleEat()`
- while message-boundary state is still live
  - `toplin`
  - `messageNeedsMore`
  - `moreMarkerActive`
  - `messageNeedsMoreBoundary`
- later replay keys can then be consumed under the wrong owner
- timed-turn work shifts across keys

The current evidence suggests this is not a stale `pendingPrompt` bug.
It is more likely an interaction between:

- in-command raw input waits in `handleEat()`
- message/topline state
- command-boundary clear/dismiss logic in `allmain.js` / `input.js`

## Things Already Ruled Out

These were tested and did **not** produce a keepable `seed031` improvement:

- collapsing fresh meals onto the `start_eating()/eatfood()/done_eating()` path
  - this caused a large regression and was reverted
- tagging `start_eating()` occupations with `isEating`
  - neutral on `seed031`
- reordering the `_gameLoopStep()` occupation branch
  - neutral on this replay path
- replacing the floor-food prompt with `ynFunction()`
  - neutral on `seed031`
- normalizing local `handleEat()` prompt-boundary clears
  - neutral on `seed031`

So the remaining problem is narrower than "eating logic is broadly wrong".

## Current Working Hypothesis

The best current hypothesis is:

- JS is allowing raw input ownership inside `handleEat()` while message-boundary
  state is still semantically live.
- That lets replay keys land under the wrong owner.
- The meal corridor only exposes the bug; it may really be a more general
  boundary-handling flaw.

Expressed operationally:

- the bug is probably not in corpse math
- probably not in monster AI formulas
- probably not in victual bookkeeping alone
- probably in the handoff between:
  - command-boundary message dismissal,
  - in-command prompt/input waits,
  - and when the next timed turn is allowed to happen

## Practical Debugging Guidance

When working this seam:

1. Treat `session_test_runner.js --verbose` as authoritative.
2. Use `rng_step_diff` only as a microscope.
3. Prefer boundary-owner evidence over downstream monster math.
4. Do not patch comparator/harness behavior to hide the drift.
5. Do not keep speculative `eat.js` changes that do not move `seed031`.

The most relevant JS files are currently:

- `js/eat.js`
- `js/input.js`
- `js/allmain.js`
- `js/display.js`
- `js/headless.js`

The next successful fix should move real timed-turn ownership earlier in the
`1236..1246` corridor, not just alter later monster behavior at `1241`.
