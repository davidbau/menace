---
name: burndown-persistence
description: When doing a burndown of N issues that ALL must be solved, never abandon a hard issue just because it is hard. The cost of rebuilding context exceeds the cost of persistence. Think in invariants, collect evidence, avoid greener-pastures loops.
---

# Burndown Persistence

## When To Use

When working through a set of N bugs that **all must be solved**:
a parity campaign, a release blocker list, a test suite burndown.

## Core Principle

Never abandon a hard issue just because it is hard. We know we must
return to it. Rebuilding context is expensive. Persistence now saves
time overall.

## Anti-Pattern: The Greener Pastures Loop

1. Working on hard issue A → "this is hard, let me try B instead"
2. Issue B also turns out hard → "let me try C"
3. Repeat forever → no progress on any issue

This loop is most costly when **all issues must eventually pass**.
Each context switch wastes the understanding built so far.

## Strategy

### Stay on the problem

- Notate what makes it hard. Write down what you've eliminated.
- Avoid going in circles (re-investigating the same hypothesis).
- Track: "I checked X, and it's not the cause because Y."

### Collect empirical evidence

- **Trace details** rather than ruminate. Add debug logging, check
  actual values, compare C vs JS at specific code points.
- Every concrete measurement answers questions that hours of code
  reading cannot.
- When stuck: add a targeted `console.error` trace for the SPECIFIC
  cell/step/value/function.

### Think in invariants

- What should **always** be true?
- When is the **first time** a desired invariant is falsified?
- This reduces the state space and simplifies the problem.
- Example: "The cell at (45,15) should have COULD_SEE set. It
  doesn't. Which step in `view_from` should have set it?"

### When it seems hardest, the answer is close

- Most logical possibilities have been eliminated.
- The remaining possibilities are few.
- Look more carefully at the evidence — the answer is often in
  a detail you've seen but not fully processed.
- A "deep" issue often turns out to be a single wrong property
  name, an off-by-one, or a missing function call.

### Opportunistic fixes are welcome

- If an easy issue is noticed **along the way** of solving the
  harder problem, fix it (e.g., the `game.player` → `game.u` bug
  found while investigating seed331_map).
- But don't leave the hard problem **in search of** easy ones.

## Tactical Approach

1. **Binary search** for the divergence point (first step, first
   RNG index, first state difference).
2. **Compare C and JS code** side-by-side at the divergence.
3. **Check data flow**: what feeds into the divergent computation?
   Trace backwards from the divergence to the input.
4. **Check common parity bugs**: parameter ordering, property names
   (`game.player` vs `game.u`), off-by-one, missing imports,
   falsy-value traps (`0 || default`), integer vs float division.
5. **When stuck**: use the trace-before-theorize skill. Get a
   concrete measurement from the C binary.

## When Context-Switching IS Appropriate

- Waiting on external input (build, test run, user response)
- A genuinely independent quick fix spotted along the way
- New information from the user that reprioritizes
- The problem requires a different tool or approach that needs
  setup (e.g., C binary rebuild for tracing)

## Example: seed301 luck divergence

Three separate bugs contributed to a single divergence:
1. Session datetime resolver didn't check `session.env`
2. Preamble timing was in `init()` instead of `_gameLoopStep()`
3. `Helmet_on` was missing the FEDORA luck bonus for Archeologists

Each bug alone didn't fix the issue. Only persistence through all
three — investigating empirically at each step — resolved it.
Total: ~2 hours of investigation → 3 bugs found → session passes.
