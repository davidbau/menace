# NetHack 3.7.0 JavaScript Port Project Plan

## 1. Mission
Build a **100% faithful JavaScript port of NetHack 3.7.0** while keeping the JS implementation clean, readable, and modular enough to support future interactive UX enhancements without changing game behavior.

## 2. Product Goals
1. Behavioral parity with NetHack 3.7.0 C release.
2. Deterministic reproducibility across C and JS for seeded scenarios.
3. Clear, maintainable JS code with explicit module boundaries.
4. Safe extension points for non-intrusive UI features (e.g., rollover identify helper, inventory sidebar).

## 3. Scope
### In Scope
- Game mechanics parity (RNG, map gen, combat, items, status, monsters, dungeon progression, interfaces).
- Replay/session harness parity against C NetHack.
- Architecture cleanup that preserves behavior.
- Read-only UI augmentations layered on top of canonical game state.

### Out of Scope (for parity milestone)
- Rule changes or “quality of life” mechanics that alter gameplay outcomes.
- AI tuning as part of parity acceptance.
- New content beyond NetHack 3.7.0 behavior.

## 4. Definition of Done (Parity Milestone)
The project reaches parity when all are true:
1. Deterministic test suites pass against C reference traces for all maintained session categories.
2. No known systematic RNG drift between C and JS in validated scenarios.
3. Core gameplay regression suites are green (`npm test` + comparison harness suites).
4. Codebase passes agreed lint/style/test gates.
5. Extension interfaces for UI overlays are documented and used by at least one non-gameplay-changing feature prototype.

## 5. Workstreams
## A. Fidelity & Correctness
- Keep C NetHack as the single source of truth.
- Expand seeded scenario coverage by subsystem:
  - chargen/options
  - movement/combat
  - inventory/use/apply/pickup
  - special levels/quest branches
  - edge cases (dates/time effects, prompts, menus, display modes)
- Resolve divergences with minimal, test-backed fixes.

## B. Reproducibility Infrastructure
- Maintain robust C-vs-JS replay harnesses.
- Standardize environment controls (datetime, terminal size, options, symbols).
- Keep trace capture tooling deterministic and documented.
- Ensure trace regeneration workflows are scriptable and auditable.

## C. JS Architecture Quality
- Refactor only behind green parity tests.
- Enforce module boundaries:
  - core engine/state
  - RNG and deterministic services
  - rendering/terminal adapters
  - UI overlay layer (read-only by default)
- Reduce hidden global state and side effects.
- Add comments/docs where behavior is subtle or historically drift-prone.

## D. UI Extension Layer (Non-Behavioral)
- Define a stable read-only state API for front-end helpers.
- Prototype features that do not affect core simulation:
  - rollover helper for `/` identify-like lookup
  - running inventory sidebar outside playfield
- Add snapshot/integration tests to confirm overlay code is non-invasive.

## 6. Milestones
## M1: Reproducible Foundations
- Deterministic harness controls are enforced (seed, datetime, terminal size, options, symbol mode, deterministic sort behavior).
- Exactly one canonical key-centered session format is used for all recorders (manual, selfplay, wizard).
- Replay injects no synthetic input: all chargen/menu/gameplay/`--More--` keys are explicit in session files.
- Failure artifacts are high detail by default: keystrokes + PRNG + screenshots + typgrid + mid-level context at divergence.
- Bulk test collection is fast: hundreds of sessions can be checked in seconds (or agreed CI target met).
- Session recording and replay tooling remains simple and documented.
- Harness responsibility is explicit: expose and localize divergences, never compensate for game logic defects.

## M2: Pre-Release Parity Burn-Down
- Goal: close behavioral divergence against the current NetHack 3.7.0 pre-release C reference.
- Mainline session categories are green against C.
- Known high-impact divergences are resolved with test-backed fixes.
- Regression dashboards/summary reports are available and actionable.
- Core-vs-harness rule is enforced:
  - Gameplay behavior fixes belong in core JS game code.
  - Harness changes are allowed only for determinism, observability, or execution speed.
  - Comparator/session tooling must not normalize away or special-case real state mismatches.

## M3: Translation Coverage Audit and Completion
- Systematically walk every NetHack 3.7.0 C source file and map behavior to JS implementation.
- Maintain a traceable C-to-JS coverage matrix at function/decision granularity (including compile-time paths used by our target build).
- Introduce coverage tooling with a split responsibility:
  - C side: translation inspection ledger (what exists, where it maps, and which branches are in-scope).
  - JS side: executable coverage from replay/session suites to prove translated paths are actually exercised.
- For each uncovered or partially covered behavior branch, either:
  - implement the missing JS behavior, or
  - document why it is intentionally out-of-scope for parity.
- For any parity-critical low-coverage area, create or extend a deterministic session that exercises that path and add it to the maintained session matrix.
- Keep parity suites green continuously while porting; no large unverified translation batches.
- Exit criteria:
  - all in-scope C behaviors are mapped and either implemented or explicitly waived with rationale.
  - no unresolved “unknown coverage” areas remain in core gameplay codepaths.
  - JS coverage reports are generated in CI for parity-critical modules and reviewed alongside parity results.
  - each identified low-coverage parity-critical region has at least one explicit replay session covering it.

## M4: Architecture Hardening
- Engine/UI separation strengthened.
- Deterministic services isolated.
- Refactors complete with no parity regressions.

## M5: JS Enhancement Delivery (Non-Parity-Changing)
- Build user-facing enhancements on top of stable read-only/state-safe interfaces.
- Initial targets:
  - rollover look/inspect helper UI
  - running inventory sidebar
  - additional quality-of-life presentation features that do not alter core simulation
  - evaluate/prototype optional online bones community integration
- Ship enhancements behind feature flags with explicit behavior-isolation tests.
- Validation proves base game mechanics and deterministic replay remain unchanged when enhancements are enabled.

## M6: Final 3.7.0 Release Readiness and Delta Port
- Rebase/sync reference C code to final NetHack 3.7.0 release.
- Produce an upstream delta audit (changed files/functions/behavior branches).
- Re-run parity matrix against final C and classify divergences (expected upstream change vs JS bug vs harness issue).
- Port required final-release behavior changes into JS while keeping harness neutrality.
- Re-record sessions only when behavior truly changed upstream.

## M7: Parity Release Candidate
- Full parity suite green.
- Documentation complete (build, test, replay, extension guide).
- Final signoff checklist complete.

## 7. Quality Gates Per Change
Every behavior change should:
1. Reproduce baseline and candidate on agreed held-out seeds.
2. Show non-regression (or improvement, when targeted) on holdout.
3. Include/update deterministic tests or session traces.
4. Update `selfplay/LEARNINGS.md` (or equivalent) with outcome.
5. Pass harness-neutrality review: no harness logic that hides, rewrites, or bypasses true divergences.

## 8. Metrics & Reporting
Track continuously:
- Session pass rate by category.
- Number of known divergences (open/closed).
- RNG mismatch incidents per run.
- Replay determinism flake rate.
- Time-to-diagnose divergence.

## 9. Risks and Mitigations
- Hidden divergence due to environment variance.
  - Mitigation: fixed datetime, fixed terminal geometry, scripted env setup.
- Refactors accidentally alter behavior.
  - Mitigation: parity-first gating; refactor only under green tests.
- Harness fragility slows progress.
  - Mitigation: dedicate maintenance budget and smoke tests for tooling.

## 10. Immediate Next Steps
1. Confirm canonical parity test matrix (session categories + seed policy).
2. Publish a divergence backlog with severity and owner.
3. Implement/verify CI pipeline for deterministic C-vs-JS comparisons.
4. Define the read-only UI extension API contract before building new UI helpers.
