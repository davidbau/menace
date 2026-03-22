# Eating Occupation

This note documents the current understanding of NetHack's eating occupation
model and the active `seed031` parity problem. It is written as an engineering
reference for fixing the bug, not as campaign history.

## 1. How C Organizes Eating Occupation

The NetHack C model is single-threaded and synchronous:

- one active input owner at a time
- one call stack
- no async continuation objects
- prompts block and return to the same caller

The eating system is built from two layers:

1. progression control flow
2. explicit saved eating state

Those two layers work together, but the progression model is primary.

### 1.1 Progression Control Flow in C

Relevant files:

- `nethack-c/patched/src/eat.c`
- `nethack-c/patched/src/allmain.c`

The progression is:

1. `doeat()` starts or resumes the meal.
2. If resuming the same `victual.piece`, `doeat()` refreshes the object and
   calls `start_eating()`.
3. If starting a fresh meal, `doeat()` computes the eating parameters and then
   calls `start_eating()`.
4. `start_eating()`:
   - resets the meal flags,
   - runs corpse pre-effects if needed,
   - applies the first bite immediately via `bite()`,
   - either finishes immediately via `done_eating()`,
   - or installs the long-running occupation via `set_occupation(eatfood, ...)`.
5. Later main-loop iterations invoke `go.occupation` once per occupation step.
6. `eatfood()` advances one more bite:
   - if still busy, returns `1`
   - if done, calls `done_eating()` and returns `0`
7. `done_eating()`:
   - clears `go.occupation` early,
   - updates hunger state,
   - emits completion messaging,
   - dispatches post-effects,
   - consumes the object,
   - zeroes `svc.context.victual`

Important C excerpts that define the model:

- `eat.c: start_eating()`
- `eat.c: eatfood()`
- `eat.c: done_eating()`
- `allmain.c: if (gm.multi >= 0 && go.occupation) { ... }`

The key invariant is:

- C always knows exactly which synchronous caller owns the next key.
- If a prompt is needed, that prompt blocks in-place.
- After the prompt returns, control resumes in the same eating path.

### 1.2 The Saved Eating State in C

The eating state lives primarily in:

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

Operational meaning:

- `piece` / `o_id`
  - the specific object being consumed
- `usedtime` / `reqtime`
  - current bite count versus total duration
- `nmod`
  - how nutrition is distributed across bites
- `eating`
  - whether the current flow is an active meal
- `fullwarn`
  - whether the near-choking warning already fired
- `doreset`
  - deferred request to abort/reset the meal
- `canchoke`
  - whether choking logic still applies to this meal

These fields are not an async scheduling system. They are ordinary saved state
used by the synchronous eating control flow described above.

### 1.3 Related C Behaviors That Matter for Parity

`lesshungry()` is especially important:

- it can emit:
  - `"You're having a hard time getting all of it down."`
- while eating, it can also ask:
  - `"Continue eating?"`

But even here, C remains synchronous:

- `lesshungry()` calls the prompt directly
- the prompt returns to `lesshungry()`
- control returns to the meal path

Likewise, the occupation branch in `allmain.c` is synchronous:

- call the occupation callback once
- clear it if it returned `0`
- then run interruption checks like `monster_nearby()`
- then return to the loop

There is no separate continuation object deciding later who owns the next key.

## 2. How This Should Map to JS

The JS port should preserve the C ownership model even though the code is async.

That means:

1. exactly one input owner at a time
2. prompts must return to the same semantic caller that asked them
3. eating progression should be modeled by the same logical stages as C:
   - `doeat`/selection
   - `start_eating`
   - `eatfood`
   - `done_eating`
4. `victual` should remain state, not become a substitute scheduler
5. message / `--More--` / prompt boundaries must not leak across owners

Why this is the right mapping:

- it matches the C source directly
- it keeps replay ownership deterministic
- it prevents the same gameplay work from sliding across replay keys
- it avoids "fixes" that merely hide drift by inventing JS-only scheduling rules

The discipline should be:

- let state describe the meal
- let control flow own the next input
- never let message-boundary state and raw in-command input both believe they
  own the same next key

## 3. Gap Between Ideal JS Structure and Current JS Behavior

The current problem exposed by
`test/comparison/sessions/seed031_manual_direct.session.json`
is not best described as a corpse-effect mismatch or a monster-AI formula bug.

It is better described as:

- JS and C disagree about which replay key owns the next chunk of timed work
  during a late meal corridor
- C performs timed-turn work earlier
- JS delays that work to later keys
- the later shift eventually appears as the first authoritative RNG seam at
  gameplay step `1241`

Current authoritative divergence:

- session: `seed031_manual_direct.session.json`
- first RNG divergence: step `1241`
- JS: `rn2(3)=0 @ dochug(monmove.js:847)`
- C: `rn2(5)=0 @ distfleeck(monmove.c:539)`

### 3.1 Empirical Evidence

Step-summary evidence:

- `comparison-window --step-summary 1236..1246`
  - C-heavy at `1236..1242`
  - JS-heavy payback at `1243` and `1246`

This means the systems are not simply "doing different work". They are
assigning real work to different replay keys.

Microscope evidence:

- `rng_step_diff --step 1238`
  - JS: `(end)`
  - C: `gethungry()` -> hero attack -> monster turn
- `rng_step_diff --step 1243`
  - JS: full monster turn
  - C: `(end)`

So the direct failure mode is:

- JS delays a chunk of timed-turn work by several gameplay keys.

Replay ownership evidence:

- replay boundary diagnostics show that in the late raw window, JS is not stuck
  in `pendingPrompt`
- instead, it is blocked inside `handleEat()` on raw input, with message
  boundary state still live

Representative late trace shape:

- owner: `input`
- pending prompt: `none`
- `ack=1`
- `msgMore=1`
- waiting inside `handleEat()`

That is the sharpest current clue.

### 3.2 What This Means Structurally

The gap between the ideal JS structure and the current one is:

- C keeps one clear synchronous owner for each next key
- JS currently has evidence that raw in-command input waits can coexist with
  still-live message-boundary state

That is exactly the situation that can cause replay-key ownership drift:

- one subsystem thinks the next key is for acknowledging a boundary
- another subsystem thinks the next key is for continuing the command

Once that happens, timed work can slide forward by one or more keys even if the
underlying gameplay state variables look similar.

## 4. What Has Been Resolved and What Remains Unknown

### Resolved / ruled out

These ideas were tested and are not the keepable fix:

- collapsing fresh meals onto the shared `start_eating()/eatfood()/done_eating()`
  path
  - this caused a large regression and was reverted
- tagging `start_eating()` occupations with `isEating`
  - neutral on `seed031`
- changing the `_gameLoopStep()` occupation branch order
  - neutral on this replay path
- replacing the floor-food prompt with `ynFunction()`
  - real mismatch, but neutral on `seed031`
- normalizing local `handleEat()` prompt-boundary clears
  - neutral on `seed031`

So the problem is narrower than:

- "victual bookkeeping is wrong"
- "monster AI is wrong"
- "all eating prompts are wrong"

### Still unknown

The main unresolved question is:

- exactly where the wrong owner handoff happens between
  - command-boundary message dismissal,
  - raw input waiting inside `handleEat()`,
  - and resumption of timed-turn work

More concretely:

- does `handleEat()` enter a raw input wait too early?
- is `toplin/messageNeedsMore` being kept live too long?
- is replay-key admission happening under the wrong owner once that overlap
  exists?

## 5. Plan for Fixing the Problem

The plan should stay narrow and evidence-driven.

### Step 1. Prove the exact owner of each late key

Goal:

- determine who owns keys in the `1236..1246` corridor

Focus:

- `js/eat.js`
- `js/input.js`
- `js/allmain.js`
- `js/display.js`
- `js/headless.js`

Measure of progress:

- identify one concrete owner mismatch, not just another downstream symptom

### Step 2. Fix the owner handoff, not the downstream monster seam

Goal:

- make the next key belong to the same logical owner in JS that it belongs to
  in C

Constraints:

- do not patch comparator/harness behavior to hide the bug
- do not keep speculative `eat.js` changes that do not move `seed031`
- do not start with monster-AI math changes

Measure of progress:

- C-heavy deficits in `1236..1242` shrink
- JS-heavy payback at `1243` / `1246` shrinks
- first divergence moves later than `1241`

### Step 3. Validate against control sessions

At minimum:

- `seed031_manual_direct.session.json`
- `coverage/covmax-round7/t11_s755_w_covmax9_gp.session.json`

Measure of progress:

- `seed031` improves
- green control remains green

### Step 4. Re-anchor on coverage/promotion

Once the seam moves or clears:

- identify which pending or coverage session benefits
- record the learning in `docs/LORE.md`
- avoid getting stuck in local first-divergence chasing without reconnecting to
  the coverage pipeline

## 6. Practical Summary

The best current summary is:

- C uses synchronous control flow plus compact saved meal state
- JS should emulate that same single-owner progression model
- the active `seed031` failure is a late ownership drift problem, not a simple
  corpse or monster formula bug
- the strongest current clue is raw input ownership inside `handleEat()` while
  message-boundary state is still live
- the next successful fix should move timed-turn ownership earlier in the
  `1236..1246` corridor, not just alter the downstream monster seam at `1241`
