# Issue #227 Execution Checklist

Issue: https://github.com/davidbau/menace/issues/227

This file is the single execution checklist for #227.
If any other doc conflicts, follow this file.

## Rules (Non-Negotiable)

- No `initAll` and no global startup orchestrator.
- Structure-only in Phase 1 (no gameplay behavior changes).
- Keep parity no worse than baseline after each batch.
- Land small commits with validation evidence.
- When moving constants into `const.js`, annotate provenance with original
  NetHack C source/header context (for example `include/rm.h`, `include/sym.h`,
  `src/drawing.c`).

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
- [x] Confirm canonical ownership table in `docs/MODULES.md` and `docs/STRUCTURES.md` has no stale text.
  - No references to deleted files (`config.js`, `symbols.js`, `objclass.js`).
  - Updated "The rule" section to document expanded leaf header taxonomy.
- [x] Run full parity report and record a short Phase-1 signoff note in docs.
  - See Phase-1 exit gate below.

### 1D. Constant export rule enforcement (pulled into Phase 1)
- [x] Only leaf headers export capitalized constants.
  - Core leaf headers: `const.js`, `objects.js`, `monsters.js`, `version.js`.
  - Data-definition leaf headers: `artifacts.js`, `engrave_data.js`, `epitaph_data.js`, `rumor_data.js`.
  - Options leaf header: `storage.js` (`DEFAULT_FLAGS`, `OPTION_DEFS` — config data, 30+ consumers).
- [x] Move any stray exported capitalized constants from gameplay modules.
  - Moved `DUNGEON_ALIGN_BY_DNUM` from `dungeon.js` → `const.js`.
  - Removed unused exports: `LORE_TEXT_TEMPLATE` (player.js), `TERRAIN_SYMBOLS_*` (render.js), `TYP_NAMES` (replay_compare.js).
  - Converted `WIN_*` mutable globals (windows.js) to getter function.
- [x] Normalize capitalized constant imports so they come from leaf headers only.

### 1E. Constant organization and documentation
- [x] Organize consolidated constants into clear sections in leaf headers (by subsystem/source).
  - `const.js` already organized by C header provenance with section comments.
  - `DUNGEON_ALIGN_BY_DNUM` placed adjacent to dungeon constants with C ref comment.
- [x] Document constant ownership and allowed import sources in `docs/MODULES.md`.
  - Updated "The rule" with three tiers: core, data-definition, and options leaf headers.
  - Updated Phase 3 description to use "leaf headers" instead of "four header files".
- [x] Add a quick audit command snippet for future checks.
  - Added "Audit command" section to MODULES.md with grep command and expected output.
- [x] Ensure newly moved `const.js` constants include C provenance comments.
  - `DUNGEON_ALIGN_BY_DNUM` has `// C ref: dungeon.c init_dungeons()` comment.

Phase-1 exit gate:
- [x] Structural targets in place for migrated subsystems.
- [x] No parity regression vs baseline envelope (2630/2639, 25/34 gameplay — matches baseline).
- [x] `rg "export (const|let|var) [A-Z]" js` reports only leaf header files (core + data + options).
- [x] Run full parity report (`scripts/run-and-report.sh`) and record Phase-1 signoff.
  - Phase-1 signoff: 2026-03-06, commit 88837e8b. 25/34 gameplay passing (matches baseline).
  - All 9 failures are dochug/monmove divergences (agent:game #213). No UX-agent regressions.

## Phase 2: C Field Name Normalization

- [ ] Remove non-C field aliases (attack/permonst/objclass/obj).
- [ ] Normalize callsites to canonical C names.
- [ ] Delete `js/attack_fields.js`.

Phase-2 exit gate:
- [ ] No remaining alias reads/writes listed in `docs/STRUCTURES.md` field tables.
- [ ] No parity regression vs baseline envelope.

## Phase 3: File-Per-C-Source Reorganization

- [ ] Move functions so each JS file aligns to its C source ownership plan.
- [ ] Keep each move commit structure-only (no logic edits mixed in).

Phase-3 exit gate:
- [ ] Ownership mapping in `docs/MODULES.md` reflects code reality.
- [ ] No parity regression vs baseline envelope.

## Phase 4: Legacy Top-Level Wiring Cleanup

- [ ] Remove remaining top-level gameplay `register*` and `set*Context` wiring side effects.
- [ ] Keep bootstrap/UI-only runtime setup where appropriate (not gameplay wiring hacks).

Phase-4 exit gate:
- [ ] No gameplay top-level lazy-registration side effects remain.
- [ ] No parity regression vs baseline envelope.

## Validation Commands (Use Per Batch)

- `scripts/run-and-report.sh`
- `node --test test/unit/config.test.js`
- `node --test test/unit/symbol_accuracy.test.js`
- `node test/comparison/session_test_runner.js test/comparison/sessions/seed42_gameplay.session.json`

## Current Focus

- Finish Phase 1 exit-gate items (1C + 1D), then start Phase 2.
