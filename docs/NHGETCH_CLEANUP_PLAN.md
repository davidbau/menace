# NHGETCH Cleanup Plan

Date: 2026-03-09  
Status: In progress

## Objective

Make input layering C-faithful and simpler by separating low-level key reads
from higher-level command/boundary behavior:

1. `nhgetch_raw`: minimal runtime key read only.
2. `nhgetch_wrap`: transitional high-level wrapper.
3. Final state: rename wrapper behavior back to `nhgetch` after cleanup.

## Scope

This plan only targets input/boundary architecture around `nhgetch` and
`--More--` behavior. It does not change gameplay semantics.

## Current Ownership

1. Tracking issue: `#332` (label: `agent:game`)
2. Primary execution files:
   - `js/input.js`
   - `js/display.js`
   - `js/headless.js`
   - `js/allmain.js`
   - `js/suspend.js`
3. Primary regression sentinels:
   - `seed031_manual_direct`
   - `seed032_manual_direct`
   - `seed033_manual_direct`

## Guardrails

1. No comparator masking or replay compensation.
2. No gameplay behavior regressions.
3. Every step must keep parity green.

Required validation per phase:

1. `npm test -- --runInBand`
2. `./scripts/run-and-report.sh --failures`
3. Spot-check `seed031_manual_direct`, `seed032_manual_direct`, `seed033_manual_direct`

## Workstreams

### A) Naming/API workstream

1. Keep migration names explicit while behavior is in transition.
2. Avoid compatibility aliases that hide callsite state.
3. Keep final API target as `nhgetch` (with `nhgetch_raw` retained as low-level helper).

### B) `--More--` ownership workstream

1. Move wait/dismiss behavior from generic input wrapper into boundary/more code paths.
2. Ensure dismissal keys remain C-faithful:
   - space, ESC, CR/LF, `^P`.
3. Ensure non-dismiss keys are ignored while waiting at `--More--`.

### C) Prompt/readchar callflow workstream

1. Route prompt-heavy paths through one boundary-aware read flow.
2. Prevent accidental key fallthrough from prompt ownership.
3. Preserve current replay/session semantics while migrating.

### D) Validation/rollback workstream

1. After each refactor slice, run full gates.
2. If first-shared divergence moves earlier, rollback that slice and split smaller.
3. Commit only slices that preserve or improve parity.

## Checklist

### Phase 0: Naming + baseline

- [x] Introduce explicit `nhgetch_raw`.
- [x] Introduce explicit `nhgetch_wrap`.
- [x] Rename gameplay callsites/imports to `nhgetch_wrap` for migration visibility.
- [x] Keep full test suite green after rename.

### Phase 1: Shared `--More--` primitives (no behavior change)

- [x] Extract shared `--More--` dismissal-key predicate/helper (`space`, `esc`, `cr/lf`, `^P`).
- [x] Use shared helper in `display.js`, `headless.js`, and `input.js`.
- [x] Keep behavior unchanged and parity green.
- [x] Record any behavior surprises in Subtleties Ledger (below).

### Phase 2: Move `--More--` waiting out of wrapper

- [x] Add shared helper to consume pending `--More--` using shared primitives.
- [x] Route command loop (`allmain`/boundary owner path) through boundary helper.
- [x] Route prompt/readchar-equivalent paths through same boundary helper.
- [ ] Remove `--More--` dismissal loop from `nhgetch_wrap`.
- [ ] Verify no regressions in parity channels.
- [ ] If regressions appear, split by callflow (command-loop vs prompt-loop) and re-run.

### Phase 3: Simplify wrapper

- [ ] Keep queue/replay/keylog/repeat behavior centralized in one wrapper function.
- [ ] Ensure `nhgetch_raw` has no queue/replay/keylog/repeat/`--More--` logic.
- [ ] Remove transitional comments/branches that are no longer needed.

### Phase 4: Final API rename

- [ ] Rename `nhgetch_wrap` back to `nhgetch`.
- [ ] Keep low-level function named `nhgetch_raw`.
- [ ] Update SYNCLOCK and unit tests for final naming.
- [ ] Remove migration-only naming references from docs/tests.
- [ ] Close issue `#332` with final before/after architecture note.

## Exit Criteria by Phase

### Phase 1 exit

1. Shared primitives exist and are used in all three layers (`display`, `headless`, `input`).
2. No behavior deltas in session parity.
3. Full test suite green.

### Phase 2 exit

1. `nhgetch_wrap` no longer owns `--More--` wait loop.
2. Boundary/more layer is the only `--More--` wait owner.
3. Sentinel sessions and full suite remain green.

### Phase 3 exit

1. `nhgetch_raw` contains only runtime read.
2. Wrapper contains only intended high-level composition logic.
3. No dead migration paths remain.

### Phase 4 exit

1. Public high-level API name restored to `nhgetch`.
2. Raw API remains explicit as `nhgetch_raw`.
3. SYNCLOCK and parity docs/tests reflect final shape.

## Subtleties Ledger (Live)

1. 2026-03-09: Direct one-shot removal of wrapper `--More--` logic regressed
   `seed031/032/033`; migration must be staged by callflow.
2. 2026-03-09: Runtime input object still exposes method name `nhgetch`; this
   is a low-level runtime contract and should not be bulk-renamed blindly.
3. 2026-03-09: Shared dismissal primitive extraction (`js/more_keys.js`) was
   behavior-neutral and preserved full green.
4. 2026-03-09: Introduced reusable `consumePendingMore(...)` helper and wired
   `nhgetch_wrap` through it (Phase 2a). This is still wrapper-owned behavior,
   but isolates logic for later ownership transfer.
5. 2026-03-09: Command-loop key reads in `allmain` now pre-consume pending
   `--More--` via `consumePendingMore(...)` and read keys via
   `nhgetch_wrap({ handleMore: false })`.
6. 2026-03-09: `input.js` prompt/readchar-equivalent paths (`getlin`,
   `ynFunction`, `getCount`) now pre-consume pending `--More--` via
   `consumePendingMore(...)` and then read via
   `nhgetch_wrap({ handleMore: false })`.
7. 2026-03-09: A direct default-off toggle for wrapper-owned `--More--`
   handling regressed `seed031/seed032/seed033` (prompt paths like
   "What do you want to fire?"); migration must stay callsite-first.
8. 2026-03-09: Migrated fire/zap prompt paths to explicit boundary reads
   (`dothrow.js`, `zap.js`) via `readBoundaryKey(...)`.

## Decision Log

1. Keep explicit migration naming (`nhgetch_wrap`) during transition so callsites
   are auditable in diffs.
2. Prefer boundary ownership over wrapper ownership for `--More--` waits.
3. Preserve no-regression rule over speed of refactor.

## Notes

1. A direct removal of `--More--` logic from wrapper regressed `seed031/032/033`,
   so cleanup is intentionally staged.
2. Migration progress should be tracked in GitHub issue checklist comments and
   mirrored in this document.
