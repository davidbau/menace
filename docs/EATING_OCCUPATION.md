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

The eating system is organized around two layers:

1. synchronous progression control flow
2. explicit saved meal state

The control flow is primary. The saved state exists to let later synchronous
calls continue the same meal without reconstructing it from scratch.

### 1.1 Progression Control Flow in C

Relevant files:

- `nethack-c/patched/src/eat.c`
- `nethack-c/patched/src/allmain.c`

The normal `#eat` progression is:

1. `doeat()` selects the target object.
   - `floorfood("eat", 0)` may synchronously ask floor questions via
     `yn_function()`.
   - If the answer is no or quit, `doeat()` returns immediately.
2. `doeat()` validates the object and decides whether this is:
   - a resume of `svc.context.victual.piece`,
   - a fresh food item,
   - a tin or non-food special case,
   - or an immediate failure/abort.
3. For a fresh meal, `doeat()` initializes `svc.context.victual`:
   - `piece`
   - `o_id`
   - `usedtime = 0`
   - `reqtime`
   - `nmod`
   - `canchoke`
   - any corpse/rotting/pre-effect state
4. For a resumed meal, `doeat()` refreshes the object via `touchfood()`,
   repairs `piece/o_id`, prints the resume message, and calls
   `start_eating()` again.
5. `start_eating()` runs synchronously inside the `doeat()` call.
   - sets `victual.fullwarn = 0`
   - sets `victual.doreset = 0`
   - sets `victual.eating = 1`
   - runs corpse pre-effects via `cprefx()` when needed
   - applies the first bite immediately via `bite()`
   - either finishes immediately via `done_eating(...)`
   - or installs the long-running occupation with
     `set_occupation(eatfood, ...)`
6. Later moveloop iterations in `allmain.c` run the occupation branch:
   - if `gm.multi >= 0 && go.occupation`, call `(*go.occupation)()` once
   - if it returns `0`, clear `go.occupation`
   - then check `monster_nearby()` and, if interrupted, call both
     `stop_occupation()` and `reset_eat()`
   - then return from that moveloop iteration
7. `eatfood()` advances one more bite.
   - if the food vanished, it calls `do_reset_eat()` and returns `0`
   - if `victual.eating` is already false, it returns `0`
   - otherwise it increments `usedtime`
   - if still in progress, it calls `bite()` and returns `1`
   - if finished, it calls `done_eating(TRUE)` and returns `0`
8. `done_eating()` performs completion synchronously.
   - marks the piece `in_use`
   - clears `go.occupation` early so hunger code knows the meal is done
   - calls `newuhs(FALSE)`
   - emits final completion messaging when appropriate
   - runs `cpostfx()` or `fpostfx()`
   - consumes the object with `useup()` or `useupf()`
   - zeroes `svc.context.victual`

Important consequence:

- there is never an ambiguous “next key owner” in C
- if a prompt is needed, it blocks in-place
- after the prompt returns, the same semantic caller continues

### 1.2 Saved State in C

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
  - whether the meal is actively in progress
- `fullwarn`
  - whether the near-choking warning already fired
- `doreset`
  - deferred request to stop/reset the meal
- `canchoke`
  - whether this meal may still trigger choking logic

These fields are not a scheduler. They are durable state used by the
synchronous control flow above.

### 1.3 Important C Edge Cases

These details matter because the JS port can easily get them wrong.

#### `reset_eat()` versus `do_reset_eat()`

C splits interruption into two phases:

- `reset_eat()` only sets `victual.doreset = 1`
- `do_reset_eat()` performs the actual reset work later

`do_reset_eat()`:

- refreshes/drops/touches the current food object as needed
- clears `fullwarn`, `eating`, and `doreset`
- deliberately does **not** clear `canchoke`
- calls `stop_occupation()`
- calls `newuhs(FALSE)`

This is an important structural point. C does not immediately tear down all
meal state at every interruption site.

#### `start_eating()` can complete the meal before any occupation exists

`start_eating()` applies the first bite synchronously. That means:

- single-bite foods can finish immediately
- resumed meals with one bite left can finish immediately
- corpse pre-effects can abort the meal before occupation is installed
- `done_eating()` may run before `set_occupation(eatfood, ...)`

So the true meal model is not “set occupation, then loop until done.” The first
bite is part of the initial command path.

#### `lesshungry()` only prompts in a narrow case

`lesshungry()` matters, but the doc should not overstate it.

While eating, `lesshungry()` may print:

- `"You're having a hard time getting all of it down."`

It only asks whether to continue when all of the following are true:

- hero is approaching full (`u.uhunger >= 1500`)
- the meal is active
- `fullwarn` has not already fired
- `canchoke` is true
- more than one bite remains

The prompt is still synchronous. It happens inside `lesshungry()`, which then
returns to the same eating path.

#### Floor-food prompting is part of the same synchronous path

`floorfood()` asks questions with `yn_function()` before `doeat()` commits to a
meal. That prompt is not a detached boundary manager. It is part of the
command's synchronous control flow.

#### `allmain.c` occupation order is specific

The moveloop occupation branch is not generic “run occupation sometime later.”
It is specifically:

1. call the occupation callback once
2. clear it if the callback returned `0`
3. then run interruption logic like `monster_nearby()`
4. if interrupted, call `stop_occupation()` and `reset_eat()`
5. return from that moveloop iteration

That ordering is part of the C contract the JS port needs to preserve.

## 2. What the JS Structure Should Look Like

The JS port should preserve the same semantic model even though the runtime is
async.

### 2.1 Structural Goal

The right JS structure is:

- one active input owner at a time
- one semantic continuation of the meal at a time
- `victual` stores meal state
- control flow, not ambient display state, decides who owns the next key

In practice that means JS should mirror the same logical stages as C:

1. object selection / floor prompt
2. meal initialization or resume in `doeat`-equivalent code
3. synchronous first-bite work in `start_eating`-equivalent code
4. later occupation ticks in `eatfood`-equivalent code
5. synchronous completion in `done_eating`-equivalent code

### 2.2 Why This Is the Right Mapping

This is the right design for JS because it:

- matches the C source directly
- preserves deterministic replay ownership
- prevents timed work from sliding across replay keys
- keeps `victual` as state instead of turning it into a scheduler
- avoids JS-only continuation machinery that has no C counterpart

The core discipline should be:

- let meal state describe the meal
- let one caller own the next input
- never let command-boundary acknowledgement and in-command raw input both
  believe they own the same next key

### 2.3 What This Implies for Async JS

Async JS is not the problem by itself. The problem is allowing async structure
to blur ownership.

The correct emulation is:

- async boundaries may exist internally
- but the code must still behave as though prompts block in-place
- when a prompt returns, control must resume in the same semantic caller
- message-boundary state must not linger in a way that competes with raw
  command input ownership

So the ideal JS structure is not “make it look synchronous.” It is “preserve
C's single-owner semantics despite async implementation details.”

## 3. Gap Between Ideal JS Structure and Current Behavior

The current `seed031` problem is not best described as a corpse-effect formula
bug or a monster-AI formula bug.

The stronger interpretation is:

- JS and C disagree about which replay key owns the next chunk of timed work
  in a late meal corridor
- C performs timed-turn work earlier
- JS delays that same work to later replay keys
- the shifted ownership eventually surfaces as the authoritative first RNG seam
  at gameplay step `1241`

Current authoritative divergence:

- session: `test/comparison/sessions/seed031_manual_direct.session.json`
- first RNG divergence: gameplay step `1241`
- JS: `rn2(3)=0 @ dochug(monmove.js:847)`
- C: `rn2(5)=0 @ distfleeck(monmove.c:539)`

### 3.1 Evidence, Ranked by Reliability

The evidence gathered so far is not all equally strong. The fix plan should be
based primarily on the highest-grade evidence.

#### Tier 1: authoritative replay evidence

These are the strongest signals:

- `session_test_runner.js --verbose`
- `comparison-window --step-summary`

Current authoritative result:

- in the late corridor `1236..1246`, C is heavier on `1236..1242`
- JS pays that work back later on `1243` and `1246`

That means the core issue is cross-step ownership drift.

#### Tier 2: microscope evidence

`rng_step_diff --step N` is useful but isolated-step replay is not itself the
source of truth.

Still, the pattern is informative:

- `rng_step_diff --step 1238`
  - JS: `(end)`
  - C: `gethungry()` then hero attack then monster turn
- `rng_step_diff --step 1243`
  - JS: full monster turn
  - C: `(end)`

This is strong support for the same ownership-drift interpretation, but should
be treated as microscope evidence, not as canonical per-step state.

#### Tier 3: replay-owner trace evidence

Replay boundary diagnostics showed that the late raw window is not stuck in a
simple `pendingPrompt` state.

Representative shape:

- owner: `input`
- prompt type: `none`
- `ack=1`
- `msgMore=1`
- waiting inside `handleEat()`

This is the sharpest structural clue so far:

- JS appears to be waiting for raw in-command input while message-boundary
  state is still live

That is exactly the sort of overlap that can cause key-ownership drift.

More specific late evidence:

- bad late case:
  - `step=1235 key="e" mode=start-gameloop start=waiting ...`
  - `step=1236 key="y" mode=resume ...`
  - `step=1236 resume=done owner=none waiting=0 ack=1 pending=0 promptType=none msgMore=1 top="This gnome lord corpse t..."`
  - `step=1237 key=" " mode=start-gameloop start=done owner=none waiting=0 ack=1 pending=0 promptType=none msgMore=1 top="Unknown command ' '."`

This is the strongest concrete late owner leak currently known.

Additional late classification evidence:

- local loop tracing showed that JS classifies the late eat action as timed one
  key too early:
  - `step=1236 key="e" tookTime=1 occ=0 multi=0 top="This gnome lord corpse tastes terrible!  You stop eating corpse." msgMore=1`
  - `step=1237 key=" " tookTime=0 occ=0 multi=0 top="Unknown command ' '." msgMore=1`

This is a stronger statement than the earlier raw-space symptom alone. It
shows that JS is not merely mishandling a dismiss key; it is finishing the
late eat action on the previous key and then treating the following key as an
untimed outer-loop command.

Direct occupation-drain evidence:

- focused local tracing around the late corridor showed that the damaging
  transition happens inside JS `finalizeTimedCommand() -> _drainOccupation()`,
  not inside the raw floor-food prompt itself
- representative late trace:
  - `fresh.return`: `occ=true`, `veat=1`, `vreq=13`, `vused=1`
  - `finalize.before_drain`: same state
  - `finalize.after_drain`: `occ=false`, `veat=1`, `vused=5`,
    top line now includes `"You stop eating corpse."`
- this means JS is consuming four additional occupation bites and the monster
  interruption inside the same keyed step
- that is the first concrete mechanism found that explains why the late meal
  becomes `veat=1, occ=0, msgMore=1` before the next key is processed

Early-versus-late drain discriminator:

- the same tracing on the earlier benign lichen-corpse corridor showed:
  - `fresh.return`: `occ=true`, `veat=1`, `vreq=3`, `vused=1`
  - `finalize.after_drain`: `occ=false`, `veat=0`, `vused=3`,
    natural meal completion
- so the problem is not merely that `_drainOccupation()` exists
- the harmful case is:
  - eager drain continues until a monster interruption stops the occupation
  - while the meal remains live (`veat=1`)
- the benign case is:
  - eager drain reaches natural completion in the same keyed step

Failed structural experiment:

- a direct experiment removed eager occupation draining from
  `finalizeTimedCommand()` and `repeatLoop()`
- result:
  - green control `t11_s755_w_covmax9_gp` remained PASS
  - `seed031` regressed sharply to first RNG divergence step `78`
- this lines up with older repository findings in
  `docs/GAME_LOOP_GATE2_FINDINGS.md`:
  - C's one-step-per-iteration model is correct in principle
  - but JS replay-key ownership currently allows several no-new-key iterations
    to belong to the same keyed step
- conclusion:
  - “remove `_drainOccupation()`” is directionally correct at the C-model
    level but wrong at the current keyed-step ownership layer
  - the remaining fix must be narrower than eliminating eager drain globally

Targeted corpse-control-flow evidence:

- a narrow experiment changed fresh-corpse handling to follow the shared
  C-shaped `victual -> eatcorpse() -> start_eating()` path and to honor the
  corpse `dont_start` branch instead of always taking the first bite inside
  `handleEat()`
- this was a plausible fix because the current JS custom corpse path performs
  first-bite/setup work unconditionally after `eatcorpse()`, while C has an
  explicit `dont_start` contract
- result:
  - `seed031` regressed sharply from first RNG divergence `1241` to `78`
  - green control `t11_s755_w_covmax9_gp` stayed green
- conclusion:
  - the late seam is **not** solved by routing all fresh corpses through the
    shared path
  - the missing discriminator is narrower than “fresh corpse versus resumed
    corpse” or “shared path versus custom path”

Early comparison evidence:

- benign early analogue:
  - `step=77 key="e" mode=start-gameloop start=waiting ...`
  - `step=78 key="y" mode=resume ...`
  - `step=78 resume=done owner=none waiting=0 ack=1 pending=0 promptType=none msgMore=1 top="This lichen corpse taste..."`
  - `step=79 key="y" mode=start-gameloop start=done owner=none waiting=0 ack=0 pending=0 promptType=none msgMore=0 top=""`

This comparison matters because it proves that the broad pattern
`resume=done + owner=none + ack=1 + msgMore=1` is not enough by itself to
identify the bad late case.

#### Tier 4: suggestive only

Late fallback mapdumps and isolated monster-state comparisons are useful for
ideas, but they are not yet strong enough to anchor the fix plan unless they
come from trustworthy matched checkpoints.

### 3.2 What the Evidence Actually Proves

The current evidence supports these claims:

1. The bug is late and real.
   - `seed031` still diverges first at step `1241`.
2. The bug is a cross-step ownership problem.
   - C does earlier timed work; JS defers it.
3. The problem is likely near eating/prompt/input boundaries.
   - replay-owner traces show JS waiting in `handleEat()` while message
     boundary state is still set.
4. The missing fix rule is more selective than message state alone.
   - broad local fixes based only on `msgMore/toplin` or
     `resume=done owner=none ack=1` regress much earlier
   - therefore the real discriminator must include additional local state or
     key-class context
5. In the bad late corridor, JS appears to finish the timed eat action one key
   earlier than C.
   - the following key is then treated as untimed outer-loop input in JS
   - C still resumes timed work there
6. The late bug is not explained by a simple fresh-corpse control-flow swap.
   - a targeted C-shaped corpse-path patch regressed the earlier lichen-corpse
     corridor at step `78`
   - therefore the real fix must discriminate between the benign early corpse
     path and the bad late gnome-lord path more narrowly

The evidence does **not** yet prove these stronger claims:

- that `lesshungry()` is the exact failing prompt
- that floor-food prompting is the exact failing prompt
- that `victual` bookkeeping alone is the root cause
- that the first-cause bug is inside `monmove.js`

Those are hypotheses, not established facts.

## 4. Critique of the Previous Version of This Note

The previous version was directionally useful, but it had weaknesses.

### 4.1 Accuracy Issues

The previous version was broadly correct about the C model, but it compressed
some details too aggressively:

- it understated the importance of the exact `allmain.c` occupation ordering
- it did not emphasize enough that `start_eating()` may finish the meal before
  any occupation is installed
- it described `lesshungry()` as especially important without making clear that
  its `Continue eating?` prompt is conditional and relatively narrow
- it did not distinguish clearly enough between `reset_eat()` and
  `do_reset_eat()`

Those are meaningful omissions because they change how a faithful JS structure
should be designed.

### 4.2 Evidence-Framing Issues

The previous version mixed evidence classes too freely.

That made it too easy to slide from:

- authoritative replay evidence

to:

- microscope evidence

to:

- suggestive late-state comparisons

without clearly labeling confidence. That was not rigorous enough.

### 4.3 Design-Insight Issues

The previous version correctly said JS should mirror the C ownership model, but
it did not push the insight far enough.

The deeper design lesson is:

- the JS port should not merely copy C state fields
- it must preserve C's single-owner semantics for the next key

That is the real constraint. If JS preserves the state but allows overlapping
ownership between message acknowledgement and raw command input, parity will
still drift.

## 5. Updated Fix Plan

The plan should be stage-gated. We should stop accepting neutral `eat.js`
patches as progress.

### Stage 1. Reconstruct the exact late owner handoff

Goal:

- identify the exact transition where JS admits a replay key under the wrong
  owner in the late meal corridor

Primary files:

- `js/eat.js`
- `js/input.js`
- `js/allmain.js`
- `js/display.js`
- `js/headless.js`

Concrete questions:

1. when `handleEat()` waits for raw input, what display/message state is still
   live?
2. which code is supposed to clear that state?
3. on the corresponding C path, which synchronous caller owns the next key?
4. which JS caller actually owns that same key?
5. what distinguishes the bad late gnome-lord case from the earlier benign
   lichen-corpse analogue?
6. why does JS classify the late eat action as `tookTime=1` on the preceding
   key while C resumes timed work on the following key?
7. why does JS allow `_drainOccupation()` to carry the long live meal to a
   monster interruption in the late corridor while the benign short-meal case
   completes naturally?

Required evidence:

- `session_test_runner.js --verbose`
- `comparison-window --step-summary 1236..1246`
- focused replay-owner traces around the same raw keys
- one explicit state-transition capture across:
  - prompt emission in `handleEat()`
  - raw answer consumption
  - `resume=done` return to owner `none`
  - the immediately following command loop
- one side-by-side comparison between:
  - the bad late gnome-lord corridor
  - the benign early lichen-corpse corridor
- one explicit command-result classification capture for the late corridor:
  - key
  - `tookTime`
  - occupation present/absent
  - top-line state after `runOneCommandCycle`
- one explicit early-versus-late `_drainOccupation()` comparison:
  - entry `victual` state
  - exit `victual` state
  - whether occupation ended by natural completion or interruption

Required tracked fields:

- `toplin`
- `topMessage`
- `messageNeedsMore`
- `moreMarkerActive`
- input owner
- the immediately following replay key and whether it is treated as:
  - prompt dismissal only
  - or command input
- whether JS has already classified the previous key as `tookTime=1`
- `victual.usedtime/reqtime` before and after `_drainOccupation()`
- whether occupation ended by:
  - natural completion (`veat -> 0`)
  - or interruption (`veat stays 1`, `occupation -> 0`)

Exit criterion:

- one concrete, named owner mismatch plus one discriminating condition that
  separates the bad late case from the benign early analogue
- and a decision on whether the missing rule belongs in:
  - local eat/occupation handoff
  - or keyed-step ownership around `_drainOccupation()`

### Stage 2. Patch the owner handoff, not the downstream symptom

Goal:

- make JS admit the next key under the same logical owner that C uses

Constraints:

- do not patch comparator or replay compensation logic
- do not start with monster-AI math
- do not keep `eat.js` changes that do not move the authoritative seam
- do not broaden the patch beyond the proven owner boundary

### Stage 2a. Prefer a local `handleEat()` fix first

Use this branch if the evidence continues to show that the bad overlap is
created inside or immediately around the `handleEat()` raw-input wait.

Likely kinds of fix:

- correcting how the floor-food / resume prompt leaves topline state
- correcting when `handleEat()` may begin a raw `nhgetch()` wait
- correcting which local path clears or preserves message-boundary state before
  returning to owner `none`
- correcting how the first replay key after `resume=done` is classified when a
  fresh post-prompt message is still pending
- correcting whether the late eat action completes on the `y` answer key or
  remains semantically open until the following dismiss/continuation key

Exit criterion:

- the local `handleEat()` corridor no longer leaves a stale owner/state overlap
- the per-step redistribution in `1236..1246` shrinks
- first authoritative divergence moves later than `1241`
- and the same rule does not regress the early benign lichen-corpse corridor

### Stage 2b. Only widen to command-boundary policy with proof

A broader `_gameLoopStep()` or command-boundary change is allowed only if Stage
1 proves the mismatch is not local to `handleEat()`.

Guardrail:

- do not generalize from `toplin==1` or `messageNeedsMore` alone; the failed
  global boundary patch showed that such a rule breaks unrelated sessions early
- do not generalize from `resume=done owner=none ack=1 msgMore=1` alone; the
  failed local `handleEat()` patches showed that this broad pattern also occurs
  in benign early food corridors
- do not generalize from the C fresh-corpse control flow alone; the failed
  shared-path corpse patch showed that this is also too broad and regresses the
  benign early corpse corridor
- do not remove `_drainOccupation()` globally at the current ownership layer;
  the direct experiment regressed `seed031` to step `78`

### Stage 2c. Narrow the `_drainOccupation()` discriminator

Use this branch only after Stage 1 has confirmed that the deciding difference
is not the raw prompt itself but the way long live meals are drained inside the
same keyed step.

Likely kinds of fix:

- keep the existing keyed-step ownership model, but change the condition under
  which eating occupations are allowed to keep draining
- distinguish natural same-step completion from monster-interrupted live-meal
  collapse
- preserve the benign short-meal case while deferring the long interrupted case
  to the owner that should handle the following key

Guardrail:

- this stage is not permission to remove `_drainOccupation()` wholesale
- any rule here must explain both:
  - why short benign meals may still complete in one keyed step
  - and why the long interrupted late meal must not

Exit criterion:

- the late corridor no longer reaches `veat=1, occ=0` inside the earlier key
- the early benign lichen corridor still matches

Exit criterion:

- a broader invariant is directly supported by trace evidence, not inferred from
  one late meal seam

### Stage 2d. Concrete resumed-floor-food bug found

One concrete bug is now proven in the resumed meal path.

C `eatfood()` does all of the following synchronously:

- load `svc.context.victual.piece`
- if the food is not carried, verify it is still on the hero square with
  `obj_here(food, u.ux, u.uy)`
- only then continue the bite / completion logic

JS had the same intended check in `eatfood()`, but it called:

- `obj_here(food, player.x, player.y)`

without passing `game.map`.

That matters because JS `obj_here()` requires the map argument in order to walk
the floor chain at `(x, y)`. Without it, resumed floor-food meals falsely took
the `!food` path and ran `do_reset_eat()`.

This was not theoretical. Targeted late traces showed the exact failure:

- resumed late `eatfood()` entered with `victual.piece` present
- the food was still on the hero square
- the missing-map `obj_here()` call still forced the `no_food` branch

That bug explains why resumed floor-food occupations could disappear even while
the meal was still live.

The faithful JS fix is:

- `obj_here(food, player.x, player.y, game?.map)`

This is narrow and directly C-shaped. It does not change replay policy, command
ownership rules, or comparator behavior.

Measured effect:

- `seed031_manual_direct.session.json`
  - baseline: first RNG divergence at step `1241`, `rng=47441/51561`,
    `events=26377/28950`
  - with the map-aware `obj_here()` fix: first RNG divergence still at step
    `1241`, but matched prefix improves to `rng=47502/51561`,
    `events=26421/28950`
  - first bad RNG shifts deeper within the same step from
    `rn2(3)=0 @ dochug(monmove.js:847)` vs
    `rn2(5)=0 @ distfleeck(monmove.c:539)`
    to
    `rn2(100)=70 @ dochug(monmove.js:847)` vs
    `rn2(8)=2 @ dog_goal(dogmove.c:582)`
- targeted non-regression checks:
  - `t11_s755_w_covmax9_gp.session.json`: still PASS
  - `theme04_seed680_wiz_eat-food_gameplay.session.json`: still PASS
  - `t04_s993_w_eatground_gp.session.json`: still PASS

What this means for the remaining plan:

- this bug was real and worth fixing
- but it is not the whole late seam, because `seed031` still first diverges at
  gameplay step `1241`
- the next remaining owner is later in the resumed-meal / pet-turn corridor,
  not the missing floor-object lookup itself

### Stage 3. Validate narrowly, then widen

Minimum validation:

- `test/comparison/sessions/seed031_manual_direct.session.json`
- `test/comparison/sessions/coverage/covmax-round7/t11_s755_w_covmax9_gp.session.json`

If improved, then also run:

- at least one additional nearby gameplay session or relevant pending session
  touching eat/prompt/topline boundaries

Exit criterion:

- `seed031` improves without regressing the green control

### Stage 4. Reconnect to the Phase 3 coverage mission

A local first-divergence improvement is not the end goal.

After a validated fix:

1. update `docs/LORE.md`
2. identify which pending or coverage session is now closer to promotion
3. choose the next highest-yield coverage/promotion action

### Stage 5. Track what remains unknown

Even after the current evidence review, these questions remain open:

- is the exact wrong owner handoff in `handleEat()` itself, or in the display /
  input boundary state that surrounds it?
- is the failing key one of the explicit eat answers, or an earlier boundary key
  that leaves stale message state behind?
- is there one owner bug, or a pair of small owner bugs that only line up in
  this meal corridor?

Those unknowns are acceptable. What is not acceptable is continuing to patch
`eat.js` speculatively without first proving the owner boundary.

## 6. Practical Summary

The best current summary is:

- C manages eating with synchronous control flow plus compact saved meal state
- `victual` stores meal progress; it does not decide who owns the next key
- the JS port should preserve the same single-owner semantics despite async
  implementation details
- the active `seed031` failure is best understood as cross-step ownership drift
  in a late meal corridor
- the strongest current clue is JS waiting for raw input inside `handleEat()`
  while message-boundary state is still live
- the next correct fix is the one that restores the right owner handoff, not
  the one that merely changes downstream monster behavior
