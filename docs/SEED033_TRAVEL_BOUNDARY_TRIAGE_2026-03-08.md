# seed033 Travel Boundary Triage (2026-03-08)

## Context
- Session: `test/comparison/sessions/seed033_manual_direct.session.json`
- Baseline at start/end of this triage slice:
  - gameplay `33/34` passing
  - only failing session: `seed033_manual_direct`
  - first divergences: screen step `470`, RNG/event step `471`

## Key Finding
The remaining frontier appears to be a **travel command-boundary/continuation mismatch** at `getpos` confirm (`.`), not a standalone pet AI defect.

## Evidence
1. Boundary trace around the failing window (`WEBHACK_REPLAY_PENDING_TRACE=1`):
   - step 459 (`_`) enters getpos and blocks for input.
   - step 470 (`.`) reports `resume=done boundary=none`.
   - immediately after step 470, JS state still has travel active (`context.travel=1`).

2. Replay state sampling around steps 468-471:
   - step 468 key `l`: hero `(43,5)`, travel `0`
   - step 469 key `u`: hero `(43,5)`, travel `0`
   - step 470 key `.`: hero `(44,4)`, travel `1`
   - step 471 key `h`: hero `(45,4)`, travel `1`

3. Comparator mismatch at first event divergence (step 471):
   - JS: `dog_invent_decision ... ud=10`
   - C:  `dog_invent_decision ... ud=5`
   This is consistent with hero/pet spatial state having diverged by that point.

4. Per-step RNG payload size mismatch at step 470:
   - C fixture step 470 has much larger RNG chunk than JS step 470.
   - This suggests C completes more travel progression inside the `.` confirmation command before step capture.

## Hypothesis
JS is closing the step boundary too early on travel confirmation (`.`), while C continues travel progression within the same command lifetime before the next input-key step is captured.

## What Was Tried
1. C-style `dotravel_target` rewrite (run/travel-context-driven):
   - produced timeout regression and was reverted.

2. `run_command` travel continuation loop prototype:
   - produced no improvement at the frontier and was reverted.

3. `getpos` rerender-on-exit experiments:
   - did not improve first divergence location.

## Safe Current State
- No regression accepted.
- Baseline restored and re-verified:
  - `./scripts/run-and-report.sh --failures`
  - result remains `33/34`, only `seed033` failing at `470/471`.

## Suggested Next Work
1. Implement a C-faithful travel continuation boundary in core command flow (not replay compensation).
2. Verify whether step 470 post-command state reaches C-aligned travel progression.
3. Re-check first divergences and ensure no regressions in other sessions.

## Related Issue
- Tracking: https://github.com/davidbau/menace/issues/260
- Most recent summary comment: issuecomment-4019211567
