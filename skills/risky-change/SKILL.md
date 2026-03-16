---
name: risky-change
description: Use this skill when making a change that could cause regressions, break existing tests, or touch widely-used code paths. Provides a disciplined methodology for high-risk changes — not avoidance, but careful execution with baselines, incremental metrics, and quality gates.
---

# Risky Change

## Philosophy

Never avoid a change because it's risky. Avoidance is its own kind of failure —
it leaves bugs unfixed, features unbuilt, and technical debt compounding.

Instead, **slow down and be methodical**. The riskier the change, the more
discipline it deserves. A well-managed risky change is safer than a sloppy
"safe" one.

## When To Use

- Touching code called from many places (domove, newsym, pline, etc.)
- Changing RNG-consuming code paths (affects all session parity)
- Modifying circular import chains or module initialization order
- Replacing stubs with real implementations (drag_ball, makekops, etc.)
- Any change where you think "this might break things" — that instinct is data

## The Protocol

### 1. Measure the baseline FIRST

Before touching anything, capture the current state of the world:

```bash
# Full session parity baseline
scripts/run-and-report.sh 2>&1 | tee /tmp/baseline-before.txt

# Unit tests
npm test 2>&1 | tee /tmp/unit-before.txt

# Coverage (if relevant)
npm run coverage:session-parity 2>&1 | tail -5
```

Record the numbers: how many sessions pass, which ones fail, what the coverage
percentage is. You need these to know if your change helped or hurt.

### 2. Make a plan with intermediate checkpoints

Break the change into the smallest possible increments. For each increment,
define what you expect to happen:

- "After step 1, all existing tests still pass, no new failures"
- "After step 2, the new code path is reachable but behind a flag"
- "After step 3, 3 new sessions exercise the path and pass"

Write the plan down (use Plan mode or a scratch file). The act of writing
forces you to think through ordering and dependencies.

### 3. Define intermediate metrics

After each increment, re-run the relevant subset of tests:

```bash
# Quick check: does anything regress?
npm test

# Targeted: does the specific session still pass?
node -e "import('./test/comparison/session_test_runner.js').then(m => m.runSessionBundle({sessions: ['path/to/session.json']}))"

# Full sweep (when checkpoint warrants it)
scripts/run-and-report.sh --failures
```

If a checkpoint regresses something, STOP. Understand why before continuing.
Don't push through hoping the next step will fix it.

### 4. Define the quality gate

Before you start, decide what "done" looks like:

- All previously-passing sessions still pass (non-negotiable)
- The new behavior matches C (for parity changes)
- New sessions exercise the changed code and pass
- No new lint/type errors introduced

Write this down. It prevents scope creep and "just one more thing" chains.

### 5. Give yourself time and space

- Work on a branch or use `git stash` so you can abandon cleanly
- If the change is large, commit working intermediates even if incomplete
- If you hit an unexpected problem, it's fine to pause, research, and return
- Don't rush to merge — let the full test suite run

### 6. If it goes wrong

- `git diff` to see exactly what changed
- `git stash` to temporarily revert and confirm the baseline still works
- Bisect your increments: which step introduced the regression?
- Ask: is the regression a real bug exposed by my change, or did I break something?
  (Two bugs canceling out is a known pattern in this codebase)

## Anti-patterns

- **"Let me just try it and see"** — without a baseline, you can't tell if it worked
- **Avoiding the change entirely** — risk aversion is not risk management
- **Making the risky change plus three "improvements"** — isolate the risk
- **Skipping the full test suite** — the session you didn't run is the one that breaks
- **Force-pushing over failures** — if tests fail, the change isn't ready

## Examples

### Good: Wiring drag_ball into domove_core

1. Baseline: 259 sessions passing, 55.72% coverage
2. Plan: (a) verify drag_ball export works, (b) add call site in domove_core
   with Punished guard, (c) generate punished-movement session, (d) test
3. Intermediate: after (b), all 259 sessions must still pass (drag_ball only
   runs when Punished, which no existing session triggers)
4. Gate: 259+N sessions pass, ball.js coverage increases
5. Space: commit after (b) even if (c) isn't done yet

### Good: Fixing exercise timing divergence

1. Baseline: identify which sessions fail due to exercise timing
2. Plan: (a) trace C's exerchk call sites, (b) diff against JS, (c) fix one
   call site, (d) check if any session improves
3. Intermediate: after each call site fix, run the affected sessions
4. Gate: at least one previously-failing session now passes
5. Space: each call site is its own commit
