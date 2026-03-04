# MORE_NEEDED_CAMPAIGN.md

## Campaign Name
Operation More Needed

## Why This Campaign Exists

When NetHack displays `--More--`, C gameplay pauses until the player presses a key.
The JS port was approximating this — queueing messages, batching output, and
suppressing some prompt events — producing timing and display divergences that
cascaded into hard-to-diagnose parity failures.

This campaign makes `--More--` handling explicit throughout:
1. Sessions record actual key steps for every `--More--` dismissal (no auto-suppression).
2. JS message/display paths are async so gameplay can pause exactly when C does.
3. Event logs capture the truth (`^event` annotations in sessions).
4. Comparator layers bear the flexibility burden; replay execution stays simple.

The branch name is the mission statement: **more is needed** — more explicit
key steps, more event evidence, more async fidelity, more parity.

## Background (What Changed)

This branch was created after Operation Iron Parity was assessed as unsuccessful
for near-term parity closure (March 4, 2026). The pivot:

1. Many real `--More--` prompts had been auto-suppressed in sessions, with
   compensation logic in `replay_core` hiding meaningful gameplay complexity.
2. An erroneous C-side patch had been changing gameplay behavior during
   instrumentation; corrected.
3. Replay execution simplified: replay keys, capture outputs; no gameplay-aware
   queueing or squashing logic in replay core.
4. Flexible/tolerant handling moved to comparator/reporting code.
5. Sessions re-recorded with:
   - richer `^event` logging (monster movement, dog AI, map wipe, engravings, etc.),
   - corrected PRNG instrumentation behavior,
   - explicit space-key steps for `--More--` dismissals (`record_more_spaces`),
   - refreshed gameplay baselines against current C binary.
6. Async message flow refactors begun:
   - `pline`/message paths made async so gameplay can pause exactly at `--More--`.
7. Cursor-position capture/comparison added to the test harness.

## Work Completed on This Branch

Concrete fixes already landed:

1. **`--More--` async chain** — `pline` and message display paths refactored to
   be async-capable; gameplay pauses correctly when C does.
2. **`^event` logging** — `^distfleeck`, `^movemon_turn`, `^wipe`, `^dog_move`,
   `^dog_goal`, `^dog_invent_decision`, `^mcalcmove`, and others added to C harness
   and JS runtime for parity comparison.
3. **Session re-recording** — all 42-seed gameplay sessions re-recorded with
   `record_more_spaces=true` and the new event logging baseline.
4. **Group E fix** (seed42_items, dog display at step 20) — `--More--` dismissal
   during eating occupation now correctly processes a monster turn in JS.
5. **Group F fix** (`interface_nameprompt`, 'A' command) — `handleRemoveAll`
   implemented in `do_wear.js`, wired to 'A' in `cmd.js`, with correct overlay
   menu rendering (inverse video on prompt row) in `headless.js`.
6. **Group A fix** (seed100 `^wipe` re-record) — sessions re-recorded so `^wipe`
   only appears when an engraving actually exists, matching current C behavior.
7. **Cursor channel** — cursor position captured per step in C harness and JS
   `HeadlessDisplay`; comparator reports cursor divergences (non-blocking).
8. **Overlay menu prompt rendering** — `renderOverlayMenu` line 0 renders with
   inverse video (attr=1) to match C `tty_select_menu` behavior.

## Current State (as of branch snapshot)

Session suite: **122 / 150 passing** (28 failing).

Remaining failure clusters:

| Group | Sessions | Root cause |
|-------|----------|------------|
| B | seed031–033 (`manual_direct`) | Chargen RNG divergence — JS calls `init_objects` before `role_init`, C does `role_init` first |
| C | seed301–313 (`selfplay200`) | Same chargen RNG ordering divergence |
| D | seed321–333 (`wizard` gameplay) | Same chargen RNG ordering divergence |

All 28 failures share the same root cause: JS and C differ in the order of
startup RNG calls at character creation time. This is a single systematic
divergence cluster. Groups B/C/D are the same bug exercised across different
roles, seeds, and move sequences.

## Active Workstreams

1. **Chargen RNG ordering** (primary blocker for Groups B/C/D):
   - Identify the exact JS/C callsite order difference in `u_init.js` / `role.c`.
   - Fix JS to call `role_init`-equivalent before `init_objects`, or vice versa
     to match actual C ordering.
   - Re-record affected sessions once fix is confirmed.

2. **Cursor parity closure** (tracked in [`docs/CURSOR_PLAN.md`](CURSOR_PLAN.md)):
   - Complete JS `setCursor` / `getCursor` integration across display paths.
   - Add cursor comparison to gameplay session suite.
   - Align gameplay/topline/prompt cursor behavior with C.

3. **Async message-flow parity** (ongoing):
   - Propagate async call chains wherever C behavior can block on `--More--`.
   - Eliminate any remaining queueing-era approximations that mask ordering.

4. **Event fidelity** (ongoing):
   - Add instrumentation where first-divergence evidence is thin.
   - Keep instrumentation behavior-neutral (no gameplay side effects).

## Non-Negotiable Rules

1. Instrumentation must not change gameplay semantics.
2. No suppression or normalization of real `--More--`, RNG, screen, typgrid, or
   cursor differences to improve pass rates artificially.
3. Replay core remains execution-simple; comparison flexibility belongs in
   comparator code.
4. Session fixtures are evidence artifacts, not hand-tuned outputs.
5. Re-recording a session is valid only when the C binary behavior changed;
   re-recording to match a JS bug is not permitted.

## Success Criteria

Operation More Needed is successful when all are true:

1. All 28 remaining failures are resolved (chargen RNG ordering fixed).
2. Cursor channel is captured and compared for gameplay suites.
3. `--More--` handling is explicit in sessions and correctly replayed with no
   suppression-era approximations remaining.
4. Re-recorded session corpus is stable and trusted as parity evidence.
5. `more-needed` is merged into `main` with maintainer sign-off.

## Merge Gate

Before merging `more-needed` into `main`:

1. Keep unit/infra gates green (or explicitly document blockers).
2. Demonstrate gameplay parity improvement against the Iron Parity baseline.
3. Publish a short merge note summarizing:
   - what changed architecturally (async message flow, event logging, session re-recording),
   - which parity channels improved (events, screens, colors, cursor),
   - remaining known gaps and follow-up issues.

## Related Documents

1. [PROJECT_PLAN.md](../PROJECT_PLAN.md)
2. [docs/COMPARISON_PIPELINE.md](COMPARISON_PIPELINE.md)
3. [docs/CURSOR_PLAN.md](CURSOR_PLAN.md)
4. [docs/IRON_PARITY_PLAN.md](IRON_PARITY_PLAN.md)
