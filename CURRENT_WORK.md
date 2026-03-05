# Current Work: Issue #227 Execution

**Issue**: #227 — module-init fragility removal (no initAll)  
**Branch**: main  
**Date**: 2026-03-05  
**Owner**: agent:game

## Active Phase

Phase 0 (preflight and baseline), per `docs/MODULES.md` Autonomous Execution Plan.

## Completed This Turn

1. Audited `docs/MODULES.md` and `docs/STRUCTURES.md` for ambiguity/conflicts.
2. Resolved contradictory guidance in `docs/STRUCTURES.md`:
   - removed alternate `constants.js` / `trapconst.js` direction,
   - aligned to leaf architecture (`version.js`, `const.js`, `objects.js`, `monsters.js`, `game.js`),
   - replaced deferred-import guidance with no-top-level-wiring discipline.
3. Added explicit autonomous execution gates to `docs/MODULES.md`:
   - Phase 0 preflight/baseline requirements,
   - Phase 1 init-fragility scope and gates,
   - batching rules and stop conditions for Phases 2/3,
   - non-negotiable autonomy rules for commit hygiene and regression handling.
4. Added explicit `map.js` retirement direction to plan docs:
   - `STRUCTURES.md`: `map.js` marked transitional; canonical level structures live under `game.*`.
   - `MODULES.md`: `map.js` moved out of permanent infrastructure list into consolidation files to retire.

## Next Commit Target

Phase 0 inventory artifact(s):

1. `register*()` and top-level wiring call inventory
2. capitalized-export-outside-leaf inventory
3. baseline parity snapshot reference

This is required before structural rewrites begin.

## Blockers

None currently.

## Guardrails

1. No mixed structural+behavior changes in one commit unless needed to keep tests passing.
2. No progression to next phase with unresolved regressions.
3. Push validated increments immediately.
