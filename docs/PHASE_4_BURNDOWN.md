# Phase 4: Gameplay Parity Burndown

Date: 2026-03-09
Status: Active; major milestone reached at `48a9f0da` (`seed031/032/033` all green)

## Handoff From Phase 3

Phase 4 starts exactly where [PHASE_3_MULTI_DEPTH_ALIGNMENT.md](/share/u/davidbau/git/mazesofmenace/game/docs/PHASE_3_MULTI_DEPTH_ALIGNMENT.md) ends:

1. Multi-depth/state initialization work was in place.
2. Remaining gaps were concentrated in gameplay-boundary correctness and late-session behavioral parity.
3. The campaign focus shifted from broad structural alignment to strict divergence burndown on real gameplay sessions.

## Goal

Drive gameplay session parity to 100% by fixing JS core behavior to match NetHack C 3.7.0, without adding comparator masking, replay compensation, or harness-side special-casing.

## Scope

Phase 4 focused on late-stage gameplay parity burndown after major architectural and instrumentation work:

1. Manual-direct gameplay sessions (`seed031`, `seed032`, `seed033`) as high-signal frontier sessions.
2. Boundary-ordering correctness (`--More--`, prompt ownership, cursor placement, topline sequencing).
3. Mapdump/checkpoint parity (`T/F/H/L/R/W/U/A/O/Q/M/N/K/J/E`) to keep state comparisons trustworthy.
4. C-faithful field naming and behavior in JS (remove normalized/compat names when practical).

## Non-Negotiable Rules Used in Burndown

1. Fix game logic in JS core modules, not comparator exceptions.
2. Do not add replay queueing/auto-dismiss/compensating behavior in `replay_core`.
3. Treat regressions as first-class failures:
   - Progress = later first shared divergence and/or more matched RNG/event/screen prefixes.
   - Regression = earlier divergence or lower matched-prefix coverage.
4. Keep changes incremental and evidence-backed with reproducible session runs.

## Operating Loop

For each divergence:

1. Localize the first shared mismatch (RNG/event/screen/mapdump).
2. Confirm expected behavior from C source and call order.
3. Implement branch-by-branch faithful JS fix.
4. Re-run targeted sessions immediately.
5. Run guard sessions to ensure no regressions.
6. Commit and push validated increments quickly so all agents can coordinate.

## Tooling and Diagnostics That Proved Effective

1. `session_test_runner.js` for authoritative parity metrics.
2. `rng_step_diff.js` and focused event windows for first divergence windows.
3. `dbgmapdump.js` for section-aware state diffs and adjacent-step checks.
4. Harness checkpoints and mapdump payloads for early-level state correctness.
5. Explicit C-code audits for every suspicious branch (rather than heuristic patching).

## Key Burndown Strategies

1. Chase earliest shared drift signal first; later mismatches are usually downstream.
2. Keep fixes C-structural:
   - preserve original branch order and side-effect timing,
   - preserve short-circuit semantics,
   - preserve message/state ordering where `--More--` can intervene.
3. Stabilize deterministic context:
   - fixed datetime where needed,
   - no synthetic key injection in replay,
   - session keys remain source of truth.
4. Prefer better observability over harness cleverness.

## Milestone Achieved

Checkpoint commit: `48a9f0da`

All of:

1. `seed031_manual_direct`
2. `seed032_manual_direct`
3. `seed033_manual_direct`

were fully green on:

1. RNG
2. events
3. screens
4. colors
5. cursor
6. mapdump

This confirmed the burndown method is working and that fidelity gains were real, not masked.

## Validation Checkpoint (2026-03-09)

Post-milestone validation on `main`:

1. `./scripts/run-and-report.sh --failures`:
   - gameplay `34/34` passing.
2. `npm test -- --runInBand`:
   - total `3345/3345` passing.
   - gameplay `34/34`, unit `3194/3194`, special `50/50`.

This is the first full-suite green checkpoint documented under Phase 4 burndown.

## Representative Fix Classes in Phase 4

1. Boundary ordering fixes around prompt/topline/`--More--` ownership.
2. C-faithful mapdump projection fixes (`W`, `U`, `A`, sparse sections).
3. Missing state assignments that consumed RNG but failed to apply C state updates.
4. Trap/object/state detail parity fixes visible only through mapdump sparse vectors.

## Phase 4 Exit Criteria

Phase 4 is complete when:

1. Gameplay sessions are fully green (or any remaining divergences are explicitly documented and queued as scoped issues).
2. Comparator and replay remain strict (no masking/compensation).
3. Repro tooling can localize first divergence quickly and reliably.
4. Docs capture what worked so future parity campaigns can follow the same playbook.

## What Comes Next

1. Continue session burndown using the same strict loop.
2. Keep parity fixes small, test-backed, and rapidly pushed.
3. Expand C-faithful coverage in remaining shallow modules while preserving no-regression discipline.
