# Current Work: Issue #227 Execution

**Issue**: #227 — module-init fragility removal / C-faithful module structure  
**Branch**: `main`  
**Date**: 2026-03-06  
**Owner**: `agent:game`

## Active Phase

Phase 4 structure-only reorganization, batch-by-batch, with strict no-regression
validation against the current gameplay baseline envelope.

## Latest Validated Commit

- `ed8ada40` — `docs: refresh CURRENT_WORK status for issue 227 phase transition`
  - Documentation handoff for Phase 2 completion and Phase 4 kickoff.
  - Validation envelope unchanged at handoff:
    - `npm test`: `2652/2661` (9 gameplay parity failures; known baseline set)
    - gameplay suite: `25/34` pass

## Current Code State

- No remaining runtime `objectData[...]` legacy field reads for:
  `.prob/.cost/.weight/.delay/.sdam/.ldam/.oc1/.oc2/.sub/.dir/.nutrition`
  outside generated data layer.
- Remaining pattern hits are non-objclass contexts (display/render structs,
  transient local structs, player/monster names).
- Checklist source of truth:
  `docs/ISSUE_227_EXECUTION_CHECKLIST.md`.

## Next Concrete Commit Target

Phase 4 structure-only batch 2:
- Continue look/pager ownership consolidation after batch 1 routing work.
- Keep `look.js` as compatibility layer during transition, then prune once
  imports are fully rerouted without cycles.
- Validate with:
  - `node --test test/unit/config.test.js test/unit/symbol_accuracy.test.js`
  - `node test/comparison/session_test_runner.js test/comparison/sessions/seed42_gameplay.session.json`
  - `npm test --silent`
  - `scripts/run-and-report.sh`

## Blockers / Risks

- Main risk in current branch is accidental behavior change while doing
  structure-only file moves; mitigate by tiny batches + immediate parity check.
- Keep gameplay baseline stable at `25/34` (or better) during phase-4 moves.

## Guardrails

1. No comparator/harness masking for parity.
2. No replay compensation logic as a fix for gameplay divergences.
3. Keep commits small and push validated increments immediately.
4. If a move causes parity drift, revert that move and split smaller.
