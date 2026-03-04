# CRYSTAL_REPLAY_CAMPAIGN.md

## Campaign Name
Operation Crystal Replay

## Why This Campaign Exists

Detailed, explicit event logging has proven more effective than prior parity
debugging approaches for locating and fixing real C-vs-JS divergence.

This campaign formalizes that direction:
1. Keep replay/recording architecture simple and transparent.
2. Capture more truth in sessions (events, `--More--` behavior, cursor).
3. Push flexibility into comparison/reporting layers, not replay execution.
4. Use richer evidence to drive faster, safer parity fixes.

## Background (What Changed)

1. We discovered many real `--More--` prompts had been auto-suppressed in
   sessions, with compensation logic in `replay_core`, hiding meaningful
   gameplay complexity.
2. We found an erroneous C-side patch that changed gameplay behavior during
   instrumentation; this was corrected.
3. We simplified replay execution: replay keys, capture outputs; no gameplay-
   aware queueing/squashing logic in replay core.
4. We moved flexible/tolerant handling to comparator/reporting code.
5. We re-recorded sessions with:
   1. richer `^event` logging,
   2. corrected PRNG instrumentation behavior,
   3. explicit key steps for dismissing `--More--` prompts (for example, space),
   4. refreshed gameplay sessions for current dungeon/PRNG baselines.
6. We began parity-critical async conversion for message flow:
   1. `pline`/message paths must be async-capable so gameplay can pause exactly
      when `--More--` requires acknowledgement.
7. We are adding cursor-position capture/comparison to support both strict
   parity and correct blinking-cursor UI behavior.

## Active Workstreams

1. Event fidelity expansion:
   1. add high-value instrumentation (monster movement/planning, map gen, etc.),
   2. keep instrumentation behavior-neutral.
2. Replay core simplification and hardening:
   1. deterministic key replay,
   2. deterministic capture of screen/color/events/rng/cursor,
   3. no semantic suppression in execution.
3. Comparator-first diagnostics:
   1. richer mismatch views (first divergence + local context),
   2. channelized reporting (`rng`, `event`, `screen`, `color`, `cursor`).
4. Async message-flow parity:
   1. propagate async call chains where C behavior can block on `--More--`,
   2. eliminate queueing-era approximations that mask ordering.
5. Cursor parity closure:
   1. complete capture + compare + runtime placement,
   2. align gameplay/topline/prompt cursor behavior with C.

## Non-Negotiable Rules

1. Instrumentation must not change gameplay semantics.
2. No suppression/normalization of real `--More--`, RNG, screen, typgrid, or
   cursor differences to "improve" pass rates.
3. Replay core remains execution-simple; comparison flexibility belongs in
   comparator code.
4. Session fixtures are evidence artifacts, not hand-tuned outputs.

## Success Criteria

Operation Crystal Replay is successful when all are true:
1. Re-recorded session corpus is stable and trusted as parity evidence.
2. Detailed `^event` logs are available across key divergence clusters.
3. `--More--` handling is explicit in sessions and correctly replayed.
4. Cursor channel is captured and compared for gameplay suites.
5. A substantial portion of new gameplay sessions are green, with first
   divergences moved later and narrowed to fewer root-cause clusters.
6. `more-needed` is merged into `main` with maintainer sign-off.

## Merge Gate (Branch Outcome)

Before merging `more-needed` into `main`:
1. keep unit/infra gates green (or explicitly documented blockers),
2. demonstrate gameplay parity improvement against this campaign baseline,
3. publish a short merge note summarizing:
   1. what changed architecturally,
   2. which parity channels improved,
   3. remaining known gaps and follow-up issues.

## Related Documents

1. [PROJECT_PLAN.md](/share/u/davidbau/git/mazesofmenace/mazes/PROJECT_PLAN.md)
2. [COMPARISON_PIPELINE.md](/share/u/davidbau/git/mazesofmenace/mazes/docs/COMPARISON_PIPELINE.md)
3. [SESSION_FORMAT_V3.md](/share/u/davidbau/git/mazesofmenace/mazes/docs/SESSION_FORMAT_V3.md)
4. [CURSOR_PLAN.md](/share/u/davidbau/git/mazesofmenace/mazes/docs/CURSOR_PLAN.md)
5. [LORE.md](/share/u/davidbau/git/mazesofmenace/mazes/docs/LORE.md)
