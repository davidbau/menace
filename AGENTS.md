# AGENTS.md

## Purpose
This file defines how coding agents should work in this repository.

Primary project direction is in `PROJECT_PLAN.md`. Agents should read that first and follow the current phase goals.

## Source of Truth and Priorities
1. NetHack C 3.7.0 behavior is the gameplay source of truth.
2. `PROJECT_PLAN.md` is the execution roadmap and phase gate definition.
3. Test harness outputs are evidence for divergences, not a place to hide or special-case them.

## Non-Negotiable Engineering Rules
1. Fix behavior in core JS game code, not by patching comparator/harness logic.
2. Keep harness simple, deterministic, and high-signal for debugging.
3. Never normalize away real mismatches (RNG/state/screen/typgrid) just to pass tests.
4. Keep changes incremental and test-backed.
5. Preserve deterministic controls (seed, datetime, terminal geometry, options/symbol mode).

## Development Cycle
1. Identify a failing parity behavior from sessions/tests.
2. Confirm expected behavior from C source.
3. Implement minimal JS core fix.
4. Run relevant tests/sessions (and held-out eval where applicable).
5. Record learnings in `selfplay/LEARNINGS.md` for agent work.
6. Commit only validated improvements.

## Session and Coverage Expectations
1. Use the canonical key-centered deterministic session format.
2. During translation coverage work, maintain a C-to-JS mapping ledger.
3. For low-coverage parity-critical areas, add targeted deterministic sessions.
4. Keep parity suites green while expanding coverage.

## Harness Boundary
Allowed harness changes:
1. Determinism controls
2. Better observability/logging
3. Faster execution that does not change semantics

Not allowed:
1. Comparator exceptions that hide true behavior differences
2. Replay behavior that injects synthetic decisions not in session keys
3. Any workaround that makes failing gameplay look passing

## Practical Commands
- Install/run basics: see `docs/DEVELOPMENT.md`.
- Issue tracking workflow: see `docs/agent/AGENTS.md` (`bd` workflow).

## Completion Discipline
When a task is complete:
1. Run relevant tests.
2. Commit with a clear message.
3. Push to remote (do not leave validated work stranded locally).
4. Report what changed, what was validated, and any remaining risks.
