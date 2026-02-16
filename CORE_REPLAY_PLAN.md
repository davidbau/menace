# Core Replay Unification Plan

## Purpose

This document replaces the previous cleanup plan.

The project goal now is specific:

1. Move session replay behavior out of the test harness and into core game/runtime code.
2. Keep fidelity checking strict: PRNG, typgrid, and screen parity must stay first-class.
3. Keep debugging quality high: when parity fails, we must still get fast, precise divergence reports.

In short: the harness should drive and compare; the game should behave.

---

## Motivation

The current session stack still contains game-aware behavior in test infrastructure
(`test/comparison/session_runtime.js`). That creates three problems:

1. Duplication risk: behavior can diverge between gameplay code and replay code.
2. Trust risk: a failing session can come from harness emulation, not game behavior.
3. Maintenance drag: parity fixes require touching test runtime internals and core game paths.

For faithful C parity work, we need one source of behavior truth: core game runtime.

---

## Hard Goals

The end state should satisfy all of these:

1. One official session run path remains:
   - `npm run test:session`
2. Session execution for all session types is driven by one core stepping path.
3. Harness modules do not implement turn logic, prompt logic, or command semantics.
4. PRNG, typgrid, and screen comparisons stay granular and deterministic.
5. Replay debugging remains rich enough to pinpoint first divergence with context.

---

## Non-Goals

1. Rewriting all historical diagnostic scripts immediately.
2. Replacing existing session formats in one step.
3. Requiring full green parity before refactor completion.

---

## Target Architecture

## 1) Core Owns Replay Semantics

`js/nethack.js` + `js/headless_runtime.js` should expose replay-safe APIs so tests do
not infer behavior from session metadata heuristics.

Target capabilities in core/runtime:

1. Initialize game from explicit startup options (seed, wizard, role/race/gender/align,
   optional dungeon start context).
2. Submit one input key and run exactly one canonical command/turn boundary.
3. Return structured per-step observation payload.
4. Expose stable hooks for trace capture (without test-only game logic in harness).

## 2) Harness Becomes Thin

`test/comparison/session_test_runner.js` should only:

1. Load and normalize session data.
2. Construct game with requested options.
3. Feed keys through core replay API.
4. Compare expected vs actual streams.
5. Emit diagnostics and result summaries.

No gameplay simulation in harness.

## 3) Comparators Stay Focused

`test/comparison/comparators.js` should remain pure comparison logic.

It may format diffs, but it should not interpret gameplay behavior.

---

## Required Core API Additions

Add or standardize APIs in core/headless runtime:

1. `createHeadlessGame(options)` (or equivalent) with explicit replay-safe options:
   - `seed`, `wizard`, `character`, `startDnum`, `startDlevel`, `startDungeonAlign`,
     runtime flags, symbol mode.
2. `executeReplayStep(key, replayContext)` (name can differ) that:
   - feeds key,
   - executes command,
   - runs canonical end-of-turn behavior when appropriate,
   - returns structured observation.
3. Trace hooks (under `deps.hooks`) for step boundaries:
   - `onStepStart`, `onCommandResult`, `onTurnAdvanced`, `onScreenRendered`,
     `onLevelChange`, `onReplayPrompt`.

These hooks are observability only, not behavior overrides.

---

## Fidelity Model

Fidelity remains checked in three channels.

## PRNG

Per startup and per step:

1. Compare compact RNG calls with source tags ignored by default.
2. Preserve first divergence payload:
   - step index,
   - rng index,
   - expected call,
   - actual call,
   - optional stage/depth metadata.

## Typgrid

1. For map/special sessions, compare per-level grid with exact cell diffs.
2. Keep deterministic regeneration check for map sessions.

## Screen

1. Compare normalized screen rows per step.
2. Keep row-level first mismatch reporting.
3. Preserve support for ANSI normalization.

---

## Debuggability Requirements

When a session fails, output must still answer quickly:

1. Where did divergence start?
2. Is it startup or gameplay?
3. Is it RNG, grid, screen, or multiple channels?
4. What was the last matching step/key?

Required tooling outputs:

1. machine-readable JSON results bundle,
2. human summary with first divergence,
3. optional verbose trace mode by session/type filter.

---

## Phased Plan

## Phase 0: Baseline Snapshot

1. Capture current session failure signatures and runtime timings.
2. Freeze a few sentinel sessions (chargen, gameplay, map, special, interface).

Exit criteria:

1. Baseline artifact exists for regression comparison.

## Phase 1: Define Core Replay Contract

1. Specify structured replay-step return schema.
2. Add hook event contracts in core runtime.
3. Add unit tests for replay-step invariants.

Exit criteria:

1. Core exposes stable replay API used by tests.

## Phase 2: Move Step Semantics into Core

Move behavior currently emulated in harness into core replay path:

1. pending input/prompt continuation semantics,
2. count-prefix handling,
3. staircase transition timing behavior,
4. message boundary behavior used for replay continuity.

Exit criteria:

1. Harness no longer contains these semantics.

## Phase 3: Unify All Session Types on Core Path

1. Chargen, gameplay, map, special, interface all use one execution primitive.
2. Wizard-specific navigation stays in core, not harness.

Exit criteria:

1. Type branching in harness is only comparison/reporting policy, not behavior emulation.

## Phase 4: Replace Harness Runtime Module

1. Remove gameplay logic from `test/comparison/session_runtime.js`.
2. Keep only adapters needed to call core replay APIs.

Exit criteria:

1. `session_runtime.js` is removed or reduced to thin wiring.

## Phase 5: Harden Comparators and Diagnostics

1. Keep strict PRNG/typgrid/screen fidelity checks.
2. Improve first-divergence diagnostics where currently vague.
3. Add a single-session debug mode for rapid iteration.

Exit criteria:

1. Failure reports are at least as actionable as before.

## Phase 6: Cleanup and Docs

1. Delete obsolete harness-only compatibility paths.
2. Update docs to describe core replay architecture.
3. Keep only three run categories (`unit`, `e2e`, `session`) in docs/scripts.

Exit criteria:

1. No harness game-awareness detritus remains.

---

## Acceptance Criteria (Final)

All must be true:

1. `npm run test:session` runs all session categories through one core replay path.
2. Harness does not implement game turn logic or command semantics.
3. PRNG, typgrid, and screen diffs retain per-step granularity.
4. Determinism checks remain for map generation replay.
5. Debug output can identify first divergence with step-level context.

---

## Risks and Mitigations

## Risk: Refactor reduces diagnostic quality

Mitigation:

1. Keep existing result bundle schema stable.
2. Add parity checks for diagnostic fields before deleting old paths.

## Risk: Hidden coupling in current replay heuristics

Mitigation:

1. Port behavior incrementally with sentinel sessions.
2. Keep temporary A/B mode behind internal test flags until parity signatures match.

## Risk: Core API churn breaks selfplay

Mitigation:

1. Move selfplay onto shared replay-safe runtime in parallel.
2. Add adapter contract tests in `test/unit`.

---

## Immediate Next Tasks

1. Add a replay-step contract test file under `test/unit`.
2. Introduce core replay hooks under `deps.hooks` with no behavior change.
3. Move one harness heuristic (count-prefix or pending prompt flow) into core and verify no regression in sentinel sessions.
