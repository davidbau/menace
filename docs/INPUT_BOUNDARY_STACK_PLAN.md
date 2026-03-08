# Input Boundary Stack Plan

Issue: #274

## Problem
Input-boundary ownership is split across multiple layers:
- `run_command()` has a top-level `_pendingMore` consume path.
- `nhgetch()` recursively consumes `--More--` via `_clearMore()`.
- `pendingPrompt` is an independent path (`run_command` and `cmd.js` branches).
- Several callsites set `display._pendingMore = true` directly.

This creates ambiguous key ownership and boundary timing drift during session replay.

## Objective
Introduce a small, explicit API for temporary input boundaries so the layer that creates the boundary is the one that consumes keys for it.

## API (minimal)
Add to `NetHackGame`:
- `withInputBoundary(owner, onKey, meta?) -> token`
- `clearInputBoundary(token) -> boolean`
- `peekInputBoundary() -> Boundary|null`

Boundary entry shape (internal):
- `token: number`
- `owner: string`
- `onKey: (ch, game) => Promise<boolean|BoundaryResult> | boolean | BoundaryResult`
- `meta?: object`

Boundary result normalization:
- `true` => handled
- `{ handled: true }` => handled
- otherwise => not handled

Semantics:
- Strict LIFO stack.
- Only top boundary receives key.
- If top boundary handles key, command parser does not run.
- Token-based clear avoids accidental removal of sibling boundaries.

## Simplicity Criteria
The API is considered "simple enough" only if:
1. Exactly 3 public methods (`with`, `clear`, `peek`).
2. Boundary consumers only need a single boolean handled contract.
3. No `replay_core` coupling and no synthetic queue injections.
4. Existing behavior can remain as fallback during migration.

## Callsite Audit

### `_pendingMore = true` writers
Primary (`putstr_message` paths):
- `js/display.js`
- `js/headless.js`

Direct manual writers outside display module:
- `js/allmain.js` (lore startup path)
- `js/do.js`
- `js/dothrow.js`
- `js/wield.js`
- `js/hack.js`
- `js/apply.js`

### `_clearMore()` consumers
- `js/allmain.js` (`run_command` branch)
- `js/input.js` (`nhgetch` recursion)
- display/headless internals

### `pendingPrompt` writers
- `js/end.js`
- `js/eat.js`
- `js/pickup.js`
- `js/allmain.js` (tutorial flow)

### `pendingPrompt` readers/consumers
- `js/allmain.js` (`run_command` prompt branch)
- `js/cmd.js`
- `js/chargen.js`

## Phases and Gates

### Phase 0: API + observability only
- Implement stack API in `NetHackGame`.
- Add boundary state in diagnostics (`owner`, `depth`).
- No behavior change expected.

Gate:
- Parity unchanged on `seed031/seed032/seed033`.

### Phase 1: `--More--` ownership migration
- Route command dispatch through stack top before existing `_pendingMore` branch.
- Add display helpers:
  - `markMorePending(ownerMeta?)` => sets `_pendingMore` and registers owner=`more` once.
  - `_clearMoreBoundaryToken()` internal helper.
- Update display/headless `putstr_message` non-blocking paths to call `markMorePending`.
- Update direct `_pendingMore` writers to use helper where accessible.
- Keep existing `_pendingMore` checks in `run_command`/`nhgetch` as compatibility fallback.

Gate:
- No regressions in first divergence index for `seed031/032/033`.
- `./scripts/run-and-report.sh --failures` is non-regressive.
- Diagnostics show owner=`more` active on `--More--` frames.

### Phase 2: prompt ownership migration
- Add `setPendingPrompt(handler)` wrapper that binds prompt to owner=`prompt` boundary.
- Convert current `pendingPrompt = ...` writes to wrapper.
- Collapse duplicate prompt handling branches after stability.

Gate:
- No prompt deadlocks; no early event regressions in manual-direct seeds.

### Phase 3: cleanup
- Remove redundant fallback branches only after parity confidence.
- Keep compatibility shims if any uncertain callsites remain.

Gate:
- Fallback code removal does not reduce current pass counts.

## Validation Matrix
Required at each phase:
1. `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed031_manual_direct.session.json`
2. Same for `seed032_manual_direct` and `seed033_manual_direct`.
3. `./scripts/run-and-report.sh --failures`

Compare:
- First divergence step/channel
- PRNG matched prefix
- Screen matched prefix
- Event matched prefix

## Non-goals (for this issue)
- No comparator masking.
- No replay_core boundary compensation.
- No harness-side key synthesis.

## Risks and Mitigations
- Risk: double-consumption when both stack and fallback handle same key.
  - Mitigation: short-circuit return immediately when stack top handles key.
- Risk: hidden direct `_pendingMore` writers bypass stack.
  - Mitigation: callsite inventory + helper migration + diagnostic owner checks.
- Risk: prompt path regressions from broad migration.
  - Mitigation: phase split; prompt migration deferred until `more` path stable.
