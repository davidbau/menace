# Issue #227 Execution Checklist

Issue: https://github.com/davidbau/menace/issues/227

This file is the single execution checklist for #227.
If any other doc conflicts, follow this file.

## Rules (Non-Negotiable)

- No `initAll` and no global startup orchestrator.
- Structure-only in Phase 1 (no gameplay behavior changes).
- Keep parity no worse than baseline after each batch.
- Land small commits with validation evidence.

## Baseline (Locked Reference)

- [x] Phase-0 inventory committed: [`docs/port-status/ISSUE_227_PHASE0_INVENTORY_2026-03-05.md`](/share/u/davidbau/git/mazesofmenace/game/docs/port-status/ISSUE_227_PHASE0_INVENTORY_2026-03-05.md)
- [x] Phase-0 baseline committed: [`docs/port-status/ISSUE_227_PHASE0_BASELINE_2026-03-05.md`](/share/u/davidbau/git/mazesofmenace/game/docs/port-status/ISSUE_227_PHASE0_BASELINE_2026-03-05.md)
- [x] Baseline JSON committed: [`docs/metrics/issue227_phase0_session_baseline_2026-03-05.json`](/share/u/davidbau/git/mazesofmenace/game/docs/metrics/issue227_phase0_session_baseline_2026-03-05.json)

## Phase 1: Infrastructure Laydown (Structure-Only)

### 1A. Ownership / boundaries
- [x] Retire `map.js` ownership; move canonical map/room structures to owning modules (`game.js`, `mkroom.js`).
- [x] Consolidate constant entrypoint to `js/const.js`.
- [x] Delete `js/config.js` and `js/symbols.js` after migration.
- [x] Normalize imports to `const.js` across runtime and tests.

### 1B. Documentation / tooling alignment
- [x] Remove active references to `config.js` / `symbols.js` in docs, scripts, comments, templates.
- [x] Keep historical timestamped artifacts unchanged (`docs/metrics`, `docs/port-status`, `docs/archive`).

### 1C. Phase-1 remaining work
- [ ] Confirm canonical ownership table in `docs/MODULES.md` and `docs/STRUCTURES.md` has no stale text.
- [ ] Run full parity report and record a short Phase-1 signoff note in docs.

Phase-1 exit gate:
- [ ] Structural targets in place for migrated subsystems.
- [ ] No parity regression vs baseline envelope.

## Phase 2: C Field Name Normalization

- [ ] Remove non-C field aliases (attack/permonst/objclass/obj).
- [ ] Normalize callsites to canonical C names.
- [ ] Delete `js/attack_fields.js`.

Phase-2 exit gate:
- [ ] No remaining alias reads/writes listed in `docs/STRUCTURES.md` field tables.
- [ ] No parity regression vs baseline envelope.

## Phase 3: Constant Export Rule Enforcement

- [ ] Only leaf headers export capitalized constants: `const.js`, `objects.js`, `monsters.js`, `version.js`.
- [ ] Move any stray exported capitalized constants from gameplay modules.

Phase-3 exit gate:
- [ ] `rg "export (const|let|var) [A-Z]" js` reports only the four leaf files.
- [ ] No parity regression vs baseline envelope.

## Phase 4: File-Per-C-Source Reorganization

- [ ] Move functions so each JS file aligns to its C source ownership plan.
- [ ] Keep each move commit structure-only (no logic edits mixed in).

Phase-4 exit gate:
- [ ] Ownership mapping in `docs/MODULES.md` reflects code reality.
- [ ] No parity regression vs baseline envelope.

## Phase 5: Legacy Top-Level Wiring Cleanup

- [ ] Remove remaining top-level gameplay `register*` and `set*Context` wiring side effects.
- [ ] Keep bootstrap/UI-only runtime setup where appropriate (not gameplay wiring hacks).

Phase-5 exit gate:
- [ ] No gameplay top-level lazy-registration side effects remain.
- [ ] No parity regression vs baseline envelope.

## Validation Commands (Use Per Batch)

- `scripts/run-and-report.sh`
- `node --test test/unit/config.test.js`
- `node --test test/unit/symbol_accuracy.test.js`
- `node test/comparison/session_test_runner.js test/comparison/sessions/seed42_gameplay.session.json`

## Current Focus

- Finish Phase 1 exit-gate items (1C), then start Phase 2.
