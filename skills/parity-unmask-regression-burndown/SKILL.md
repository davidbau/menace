---
name: parity-unmask-regression-burndown
description: Use this skill when making a C-faithful foundational parity fix that may unmask masked regressions, then driving systematic root-cause burndown without reverting the correct fix.
---

# Parity Unmask Regression Burndown

## When To Use
Use this when you are changing a foundational C-faithfulness invariant and expect turbulent regressions:
- bitfield semantics (`wall_info`, flags overlays)
- ordering/call-chain alignment (`postmov`, `m_move`, trap/dig ordering)
- engine boundary contracts (input/waiting, movement phases)

## Core Principle
Hold the known-correct C-faithful fix. Do not revert it just because regressions appear.
Treat regressions as newly exposed bugs that were previously masked.

## Non-Negotiable Guardrails
- No comparator masking/exceptions.
- No replay compensation hacks.
- No session re-recording to match JS behavior.
- Fix core gameplay logic only.

## Workflow
1. **Declare the invariant**
- Name the exact C rule you are enforcing.
- Cite C source locations.

2. **Land the foundational fix first**
- Implement the C-faithful behavior directly.
- Keep diff focused on semantics, not broad refactors.

3. **Run immediate parity checks**
- `node test/comparison/session_test_runner.js --verbose --session-timeout-ms=12000 --sessions=<target.session.json>`
- Capture first divergence and matched prefix deltas.

4. **If regression appears, instrument surgically**
- Add temporary, opt-in traces behind env flags (for one path/square/function only).
- Prefer watchpoints over global logging.
- Example style: `WEBHACK_*_TRACE=1` plus precise location/function tags.

5. **Trace writer/reader ownership for state bugs**
- For bitfields, identify:
  - who writes the bit
  - who reads the bit
  - whether C overlay semantics are respected
- Confirm with concrete evidence (single line proving the writer).

6. **Fix the exposed bug, not the symptom**
- Patch the root mismatch (often boundary conditions or overlay misuse).
- Re-run the same target session immediately.

7. **Remove temporary instrumentation**
- Delete temporary logs/env checks after diagnosis.
- Keep only durable diagnostics that are generally useful.

8. **Broaden validation before commit**
- Run a nearby seed batch to detect collateral regressions.
- Use a representative cluster, not only one seed.

9. **Commit a clean slice**
- Stage only files relevant to this issue.
- Avoid bundling unrelated local debug changes.

10. **Track transparently in issue**
- Post: root cause, fix, validation metrics, residual risks, next target.

## Practical Commands
- Single target replay:
  - `node test/comparison/session_test_runner.js --verbose --session-timeout-ms=12000 --sessions=<session>`
- Multi-seed batch:
  - `node test/comparison/session_test_runner.js --verbose --session-timeout-ms=12000 --sessions=<s1,s2,...>`
- Locate first RNG divergence window:
  - `node test/comparison/rng_step_diff.js <session> --step <N> --window 16`

## Gates
A change is ready only when all gates pass:
1. **Invariant Gate**: foundational C-faithful rule remains in place.
2. **No-Mask Gate**: no harness/comparator/replay masking added.
3. **Regression Gate**: target seed is non-regressing vs pre-fix checkpoint (or improved).
4. **Breadth Gate**: nearby seed batch shows no severe new regressions/timeouts.
5. **Cleanliness Gate**: temporary instrumentation removed.
6. **Tracking Gate**: issue updated with evidence and metrics.

## Anti-Patterns
- Reverting a correct foundational fix to quiet tests.
- Accepting unexplained state writes ("it works now").
- Leaving temporary diagnostics in committed code.
- Committing mixed unrelated changes with parity fixes.

## Done Criteria
- Foundational fix stays intact.
- Exposed regression root cause identified and fixed.
- Target session divergence is restored/improved.
- Broader validation executed and reported.
- Clean issue-linked commit pushed.
