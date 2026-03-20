# Game Loop Reorder Plan

## Review Notes — Follow-up (requested review of specific concerns)

### Occupation ordering: RESOLVED — branch is correct

My earlier concern was wrong. The branch ordering matches C exactly:

**C moveloop_core per iteration:**
```
Phase B (line 296): if (context.move) → movemon()     ← monsters
Phase C (line 559): find_ac(), vision, context.move=1
Phase D (line 591): if (occupation) → (*occupation)()  ← one occ step
                    return;                            ← back to loop
```

**Branch _gameLoopStep per iteration:**
```
advanceTimedTurn(game, {})  ← = Phase B+C (monsters + find_ac + vision)
runOccupationStep(game)     ← = Phase D (one occupation callback)
continue                    ← back to loop
```

Both run monsters BEFORE occupation on every iteration. The ordering
is correct. Evidence: C lines 296→591 (hack.c), branch lines 34-37
in _gameLoopStep.

### hasPendingCommandBoundaryDismiss: acceptable for merge

The function reads display state (`messageNeedsMore`, `moreMarkerActive`,
screen line content) to determine if `more()` was left pending from a
prior operation. This is needed because:

1. C's `more()` blocks synchronously — it consumes the dismiss key
   during the operation that produced the message, before returning.
2. JS's `more()` is async — the display state persists across the
   event loop boundary between `_gameLoopStep` iterations.
3. Without this check, continuation iterations (negative multi,
   occupation) would run WITHOUT the --More-- being dismissed,
   which would consume the wrong key.

The function is display-coupled but necessarily so — it's detecting a
JS-specific state that doesn't exist in C (pending async --More--).
It's used at exactly one call site and the logic is straightforward.

**Recommendation:** acceptable for merge as-is. If the display system
is later refactored to make `more()` completion more explicit (e.g., a
game-level flag rather than display inspection), this function can be
simplified. But it's not blocking merge.

## Review Notes (from original plan author)

I reviewed the branch implementation (`a818b2930`) against the original
design intent. The work is solid and the gate-based methodology is rigorous.
Key observations:

### What's working well

1. **One-step helpers are correct.** `runNegativeMultiStep` and
   `runOccupationStep` faithfully match C's per-iteration model — one step,
   then return. This is exactly what the plan called for.

2. **The `while (true)` loop in `_gameLoopStep` is the right structure.**
   It keeps multiple no-input iterations within one replay step, preserving
   the invariant that the other engineer identified: "a single replay key
   step may own multiple C-faithful no-input iterations." This avoids the
   naive one-step-per-return regression.

3. **The `context.move` gate on `multi < 0` is a genuine C discovery.**
   C only enters the negative-multi continuation when the previous command
   set `context.move`. The branch found and encoded this rule, fixing real
   session regressions.

4. **No pending/deferred state.** The branch correctly avoids continuation
   tokens. The `while (true)` loop is immediate — it checks game state
   flags and acts, exactly as C's `moveloop_core` loop does.

### Concerns and suggestions

1. **Occupation ordering needs narrower verification than first stated.**
   In `_gameLoopStep`, the occupation branch runs `advanceTimedTurn` then
   `runOccupationStep`. Re-reading C [`allmain.c`]( /share/u/davidbau/git/mazesofmenace/game/nethack-c/patched/src/allmain.c )
   shows that this broad ordering is actually the right shape for the next
   `moveloop_core()` iteration:
   - Phase B monster/turn-end work runs first when `context.move` is set
   - then Phase C pre-input display work runs
   - then Phase D executes one occupation callback and returns
   So the branch's "timed turn first, occupation step second" is not by itself
   a contradiction of C. The real verification target is narrower:
   - whether `monster_nearby()` / `stop_occupation()` happen at the same owner boundary
   - whether `runmode_delay_output()` stays attached to the same iteration
   - whether prompt-producing occupation callbacks still preserve single-owner input semantics

2. **`--More--` dismiss boundary is partly shared infrastructure, not purely branch logic.**
   The `hasPendingCommandBoundaryDismiss` function does read display state,
   but the core boundary rule already exists in shared `nhgetch({ commandBoundary: true })`
   handling and was introduced by earlier parity fixes for canned follow-up
   commands and prompt-boundary ownership. So this is not just branch-local
   improvisation. The real concern is narrower:
   - whether `_gameLoopStep()` should need its own extra pre-continuation check,
     or whether the shared command-boundary/input layer can own all of that logic
   - whether the specific predicates (`messageNeedsMoreBoundary`,
     `moreMarkerActive`, visible `--More--`) are exactly the right owner signals
   In other words, this is a maintainability/scope question, not proof that the
   branch is inventing a brand-new non-C mechanism.

3. **`finalizeTimedCommand` and `_drainOccupation` still exist.** The
   branch extracted helpers but kept the old drain loops. The `while (true)`
   in `_gameLoopStep` partially duplicates their logic. Eventually these
   should converge — either `_gameLoopStep` fully owns continuation
   dispatch (and `finalizeTimedCommand` becomes just `advanceTimedTurn`),
   or the helpers are the sole owners. Having both creates maintenance risk.

4. **Travel path isn't restructured yet.** Travel still calls
   `moveloop_core` directly (line ~2537) rather than going through the
   continuation loop. This is fine for now but should eventually match
   the pattern used for occupation and negative-multi.

5. **Missing main branch fixes.** The branch doesn't have the alignment
   propagation fix (`df75e5085`), bhit area sweep, confdir sweep, or
   LEVEL_SPECIFIC_NOCORPSE fixes from main. Merging main would bring
   436→439 and include other parity improvements. The merge has conflicts
   (tried and aborted) — should be done carefully.

### Overall assessment

The branch is on the right track. The key insight — keeping continuations
within one `_gameLoopStep` call via a `while (true)` loop — is correct and
avoids the regression that naive per-return dispatch caused. The work is
evidence-driven and gate-based as requested. It should be mergeable to main
once the remaining owner-boundary questions are verified and the main-branch
parity fixes are integrated.

## Status

This is a constrained investigation plan, not an approved migration.
Any implementation must satisfy the repository execution-model rules:
- single-threaded gameplay flow
- one active input owner at a time
- no gameplay reentrancy
- no synthetic queueing/continuations that reorder command vs monster work

It should be read together with:
- `docs/ASYNC_CLEANUP.md` Phase 3 and Phase 3d
- `AGENTS.md` execution-model constraints

Branching note:
- any actual game-loop reorder experiment should be developed on a dedicated feature branch
- keep `main` for small validated parity fixes and doc updates
- do not mix speculative loop surgery with unrelated gameplay or harness changes in one branch

## Problem

Some failing sessions, especially `seed031/032/033`, may involve command/monster
boundary drift within the JS game loop.

That is a hypothesis, not a conclusion.
Before changing the loop, we need direct evidence that the earliest shared owner
is a game-loop ordering mismatch rather than a local gameplay bug inside pet AI,
attack ownership, prompt ownership, or another subsystem.

**Important distinction:** seed031 and seed033 have DIFFERENT root causes:
- **seed031 (step 411)**: Pure game loop ordering — turn-end in wrong step.
  This plan addresses it.
- **seed033 (step 294)**: bhit animation key consumption — C's
  `runmode_delay_output()` inside `bhit()` (zap.c:3894) calls `nhgetch()`
  to pace projectile animation, consuming a key and splitting the throw
  across two steps. JS processes the entire bhit in one step. This is a
  SEPARATE issue that needs its own fix. After fixing bhit, the game loop
  ordering would be the NEXT divergence.
- **seed032**: Display-only divergence (RNG passes). Not addressed here.

## C's Actual Structure

C's `moveloop_core()` is one function called in a `for(;;)` loop. Each
iteration handles one game tick:

```c
void moveloop_core(void) {
    // PHASE A: Bookkeeping
    dobjsfree(); clear_bypasses(); ...

    // PHASE B: Monster turn (conditional on context.move)
    if (context.move) {
        movemon();
        // mcalcmove, spawn, moves++, regen, hunger, timeout, exercise...
    }

    // PHASE C: Pre-input preparation
    find_ac(); vision_updates(); bot(); curs_on_u();
    context.move = 1;

    // PHASE D: Active occupation
    if (multi >= 0 && occupation) {
        (*occupation)();
        return;
    }

    // PHASE E: Multi-repeat
    if (multi > 0) {
        multi--;
        rhack(cmd_key);
        return;
    }

    // PHASE F: Fresh command
    if (multi == 0) {
        rhack(0);   // nhgetch() + dispatch new command
    }

    // PHASE G: Post-command cleanup
    deferred_goto(); vision_recalc(); display_update();
}
```

Key structural points:
1. `moveloop_core()` is the outer owner for both monster-turn and command-turn work.
2. Occupation and multi-repeat do not read fresh input; they dispatch one step and return.
3. `context.move` is optimistic by default and cleared by untimed commands.
4. Prompts and `more()` still preserve single-owner input semantics inside this structure.

## Current JS Suspicion

The current JS structure may be flattening too much work into the per-key
`run_command()` path:

```javascript
_gameLoopStep() -> nhgetch() -> runOneCommandCycle() -> run_command()

run_command() {
    promptStep()
    rhack()
    finalizeTimedCommand()
    repeatLoop()
    postRender()
}
```

Possible failure modes:
1. monster/turn-end work is owned from the wrong boundary
2. multi-repeat loops internally instead of returning to the outer loop
3. occupation draining loops internally instead of returning to the outer loop

These are only candidate explanations until a failing session proves them.

## Target Shape

If the hypothesis is validated, the target shape is the one already described in
`docs/ASYNC_CLEANUP.md`: `_gameLoopStep()` should behave like one
`moveloop_core()` iteration.

```javascript
async _gameLoopStep() {
    // PHASE A: Bookkeeping
    dobjsfree(); clear_bypasses(); ...

    // PHASE B: Monster turn from prior timed command
    if (game.context.move) {
        await movemon();
        await processTurnEnd();
    }

    // PHASE C: Pre-input preparation
    find_ac(); vision(); display_sync();
    game.context.move = true;

    // PHASE D: Active occupation
    if (game.multi >= 0 && game.occupation) {
        await game.occupation();
        return;
    }

    // PHASE E: Multi-repeat
    if (game.multi > 0) {
        game.multi--;
        await rhack(game.cmd_key);
        return;
    }

    // PHASE F: Fresh command
    if (game.multi === 0) {
        const ch = await nhgetch();
        await rhack(ch);
    }

    // PHASE G: Post-command
    await deferred_goto();
    postRender();
}
```

But this target is acceptable only if all of these remain true:
1. exactly one active input owner exists at every suspension point
2. prompts, menus, `more()`, `getdir()`, `yn`, and `getlin()` still consume the next key directly at their own await site
3. untimed commands still prevent monster-turn ownership exactly where C does
4. no replay compensation or synthetic continuation mechanism is added

## Required Evidence Before Any Loop Change

A loop-level change should only proceed after all of the following are shown on
an existing authoritative C-recorded session:

1. The earliest shared owner is a command/monster boundary owner.
2. Adjacent-step work is conserved in the relevant event/RNG families.
3. The same command family reproduces on at least one nearby failing session.
4. The divergence cannot be explained by a more local gameplay bug.

Preferred tooling/evidence:
- `session_test_runner.js --verbose`
- `movement-propagation.mjs`
- `comparison-window.mjs`
- owner-local traces for the exact failing bundle
- repaint diagnostics when the first divergence is visible output only

## Implementation Gates

### Gate 0: Prove the owner

For one failing session, prove that the first actionable divergence is a loop
ownership problem rather than a local gameplay problem.

Required output:
- failing session name
- first divergence step on `rng`/`event`/`screen`
- earliest shared owner
- evidence of conserved adjacent-step work if this is claimed to be boundary drift

### Gate 1: Extract without reordering semantics

Factor the timed-turn block out of `finalizeTimedCommand()` into a helper such as
`processTurnEnd()`, but do not yet move ownership. This is only to isolate the
unit of work.

Validation:
- no first-divergence regressions on currently passing sessions
- target failing session unchanged or improved

### Gate 2: Move one owner boundary

Move only one boundary at a time:
- timed-turn ownership, or
- multi-repeat ownership, or
- occupation ownership

Do not move all three in one patch.

Validation:
- target failing session must improve on authoritative existing fixtures
- no larger regressions on passing coverage sessions
- no new input-owner violations

### Gate 3: Sweep the area

If one loop boundary is proven wrong, audit the surrounding owner family:
- counted commands
- occupation steps
- timed-turn post-command handling
- deferred level transitions

The goal is to fix the class of bug, not just one seed.

## What Not To Do

- do not rerecord sessions just because JS changed
- do not use replay or comparator masking
- do not add pending/deferred continuation objects
- do not add async queues to route gameplay owners
- do not change multiple ownership boundaries in one patch
- do not treat total RNG-count conservation as proof of semantic equivalence

## Session Policy

Do not rerecord existing sessions as part of a JS game-loop change.

Reason:
- the sessions are recorded from C
- C is the gameplay source of truth
- if JS changes, the existing C-recorded sessions remain the authoritative test

Rerecording is appropriate only when:
1. the C harness changes, or
2. a proven C-side capture artifact needs regeneration

That is a harness decision, not a JS gameplay-change validation step.

## Verification

Minimum acceptance criteria for any loop-related patch:
1. No currently passing authoritative session regresses on first divergence.
2. The target failing session improves on existing fixtures.
3. At least one nearby failing session is checked for the same owner family.
4. `rng`, `event`, and `screen` are all considered; do not stop at one channel.
5. Step-local conservation evidence is captured when claiming a boundary shift.
6. Prompt/input ownership remains single-owner throughout.

Helpful but insufficient by themselves:
- unchanged total RNG count
- later raw mismatch with worse event parity
- successful rerecord of regenerated fixtures

## Risk

High.

This is one of the few changes that can silently alter broad gameplay ordering
without immediately looking wrong locally. The main failure mode is not just a
buggy loop, but a superficially cleaner loop that violates the C ownership
model.

That is why the plan is evidence-first and gate-based rather than a blanket
rewrite.

## Notes On These Edits

These changes were made to tighten the plan against repository policy and to
make validation C-authoritative:

1. Removed the assumption that failing seeds already prove a global game-loop bug.
   The document now treats that as a hypothesis requiring owner-local evidence.
2. Removed the "re-record all sessions" step.
   Existing C-recorded sessions remain authoritative when only JS changes.
3. Anchored the proposal to `docs/ASYNC_CLEANUP.md` instead of treating it as a
   standalone rewrite plan.
4. Added explicit input-owner invariants because the repository forbids
   continuation/queue schemes that alter the C execution model.
5. Replaced broad migration steps with gates that force proof, then minimal
   ownership movement, then area sweep.
6. Strengthened verification so it uses first-divergence movement on existing
   sessions rather than total RNG counts or regenerated fixtures.
