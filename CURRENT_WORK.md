# Current Work: Issue #227 Execution

**Issue**: #227 — module-init fragility removal (no initAll)  
**Branch**: main  
**Date**: 2026-03-05  
**Owner**: agent:game

## Active Phase

Phase 1 (infrastructure laydown first), with `map.js` elimination completed
(`makeRoom`/`FILL_*` in `mkroom.js`, `GameMap`/`makeLocation` in `game.js`).

## Completed This Turn

1. Removed top-level `register*` wiring in active gameplay paths:
   - `potion.js` no longer registers status callbacks into `timeout.js`;
     `timeout.js` now lazily resolves status handlers at runtime.
   - `makemon.js`/`shknam.js` no longer use `registerGetShopItem`; direct
     import path is used instead.
2. Strengthened docs for unambiguous `map.js` retirement:
   - `docs/MODULES.md` now includes an explicit `map.js` elimination checklist.
   - `docs/STRUCTURES.md` now includes concrete migration targets before delete.
3. Executed first ownership migration step:
   - moved `makeRoom` and `FILL_*` ownership to `mkroom.js`,
   - updated importers (`dungeon.js`, `mklev.js`, `sp_lev.js`, `storage.js`),
   - removed those exports from `map.js`.
5. Completed `map.js` elimination:
   - moved `GameMap`/`makeLocation` ownership to `game.js`,
   - migrated all runtime importers off `map.js`,
   - deleted `js/map.js`,
   - updated docs references (`MODULES`, `STRUCTURES`, `SESSION_FORMAT_V3`,
     `DESIGN`, `CODEMATCH`).
6. Removed gameplay top-level registration side effects in `special_levels.js`:
   - replaced eager module-top-level special-level registration with lazy
     deterministic `initializeSpecialLevels()`,
   - switched helper naming from `register*` to `set*` in this module,
   - preserved `initQuestLevels()` role remapping semantics.
4. Validation after each step:
   - `node --test test/unit/wizard_mode.test.js` passes,
   - parity spot checks (`seed42`, `seed100`) pass,
   - `bash scripts/run-and-report.sh --failures` unchanged envelope (`23/34`,
     same 11 failing sessions).
7. Began `const.js` migration path:
   - added `js/const.js` as the consolidated constant import surface,
   - migrated `game.js` and then broad `./const.js` consumer imports to
     `./const.js` (path-only, no logic changes).

## Next Commit Target

Continue Phase 1 infrastructure ownership consolidation only. Legacy top-level
`register*`/context-wiring cleanup is deferred to Phase 5.

## Blockers

None currently.

## Guardrails

1. No mixed structural+behavior changes in one commit unless needed to keep tests passing.
2. No progression to next phase with unresolved regressions.
3. Push validated increments immediately.
