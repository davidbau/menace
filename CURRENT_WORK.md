# Current Work: Issue #227 Execution

**Issue**: #227 — module-init fragility removal / C-faithful module structure  
**Branch**: `main`  
**Date**: 2026-03-06  
**Owner**: `agent:game`

## Active Phase

Phase 2 wrap-up complete; preparing Phase 4 file-per-C-source reorganization
(per current `docs/MODULES.md` sequencing).

## Latest Validated Commit

- `cf5862d3` — `issue227 phase2: canonicalize objclass fields and object naming`
  - Migrated runtime objclass field reads to canonical `oc_*` names.
  - Normalized gameplay object instance naming from `.name` to `.oname`
    in object contexts.
  - Updated `docs/ISSUE_227_EXECUTION_CHECKLIST.md` to mark Phase 2 runtime
    migration items complete.
  - Validation envelope unchanged:
    - `npm test`: `2652/2661` (9 gameplay parity failures; known baseline set)
    - session hook note: `141/150` (9 failed)

## Current Code State

- No remaining runtime `objectData[...]` legacy field reads for:
  `.prob/.cost/.weight/.delay/.sdam/.ldam/.oc1/.oc2/.sub/.dir/.nutrition`
  outside generated data layer.
- Remaining pattern hits are non-objclass contexts (display/render structs,
  transient local structs, player/monster names).
- Checklist source of truth:
  `docs/ISSUE_227_EXECUTION_CHECKLIST.md`.

## Next Concrete Commit Target

Phase 4 structure-only batch 1:
- Pick one invented consolidation module with clear ownership destination.
- Move functions file-by-file to matching C-source-named module(s) only.
- No behavior edits mixed with moves.
- Validate no regression against baseline envelope before push.

Candidate first batch (low risk):
- `look.js` -> `pager.js` ownership consolidation for look/whatis flows, with
  import path updates only.

## Blockers / Risks

- Main risk in current branch is accidental behavior change while doing
  structure-only file moves; mitigate by tiny batches + immediate parity check.
- Keep gameplay baseline stable at `25/34` (or better) during phase-4 moves.

## Guardrails

1. No comparator/harness masking for parity.
2. No replay compensation logic as a fix for gameplay divergences.
3. Keep commits small and push validated increments immediately.
4. If a move causes parity drift, revert that move and split smaller.
