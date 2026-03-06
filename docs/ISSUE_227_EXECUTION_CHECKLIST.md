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

### 2A. Attack field normalization (complete)
- [x] Update `gen_monsters.py` and `gen_artifacts.py` to emit canonical C names (`aatyp`/`adtyp`/`damn`/`damd`).
- [x] Regenerate `monsters.js` and `artifacts.js`.
- [x] Remove all `canonicalizeAttackFields()` calls and imports from runtime files.
- [x] Convert all legacy attack field reads (`.type`→`.aatyp`, `.ad`→`.adtyp`, `.dice`→`.damn`, `.sides`→`.damd`) across ~15 source files.
- [x] Fix `sanitizeMonsterType` fallback in `monutil.js` (was using old `.type` field name).
- [x] Update 4 test files with canonical field names.
- [x] Delete `js/attack_fields.js`.
- [x] Remove stale `file_policy.json` entry.

### 2B. Permonst field normalization — unambiguous batch (complete)
- [x] `mr1`→`mresists`, `mr2`→`mconveys` (resistance/conveyance bitmasks, ~50 sites)
- [x] `flags1/2/3`→`mflags1/2/3` (monster flag bitmasks, ~220 sites across 28 files)
- [x] `sound`→`msound` (monster sound type, 29 sites across 9 files)
- [x] `weight`→`cwt` (corpse weight on permonst only, ~8 sites)
- [x] `nutrition`→`cnutrit` (corpse nutrition on permonst only, ~6 sites)
- [x] `size` now emitted as `msize` in generator (alias already existed, kept for compat)
- [x] Fix `sanitizeMonsterType` in `monutil.js` (flags1→mflags1 etc.)
- [x] Update test mocks (monster_accuracy, combat, monmove, monster_nearby, domove_attackmon)

### 2C. Permonst field normalization — overloaded fields (complete)
These fields share names with monster instance, player, or object properties.
Required per-usage context analysis (not safe for `replace_all`):
- [x] `speed`→`mmove` (shared with monster.speed; migrated permonst reads in 8 files)
- [x] `attacks`→`mattk` (shared with monster.attacks; migrated permonst reads in 14 files)
- [x] `color`→`mcolor` (shared with obj/display; migrated 3 permonst reads)
- [x] `align`→`maligntyp` (shared with player/dungeon; migrated 8 permonst reads)
- [x] Generator emits `mlet`/`mlevel`/`mmove`/`mattk`/`mcolor`/`maligntyp` as primary names
- [x] Bidirectional aliases added via `normalizeMonsterFields` for backward compat
- [x] Cleaned up dual-read fallback patterns in muse.js, dothrow.js, hack.js
- [x] Updated test mock in domove_attackmon_safe_stop.test.js
- [ ] `symbol`→`mlet`: alias exists, ~9 remaining reads (deferred — low priority)
- [ ] `level`→`mlevel`: alias exists, ~33 remaining reads (deferred — many in /levels/)
- [ ] `name` — keep as `name` (C 3.7 uses `name` in struct permonst)

### 2D. Objclass field normalization (complete)
Generator now emits C-canonical names (oc_name, oc_descr, oc_color, oc_prob,
oc_delay, oc_wt, oc_cost, oc_wsdam, oc_wldam, oc_oc1, oc_oc2, oc_nutrition,
oc_material, oc_oprop, oc_dir, oc_subtyp) with getter/setter alias pairs for
backward compat. Aliases include C macro aliases: oc_skill↔oc_subtyp,
oc_bulky↔oc_bimanual↔big.

- [x] Generator emits all C-canonical objclass field names
- [x] Getter/setter aliases propagate writes between canonical and legacy names
- [x] Fixed ~35 live bugs (oc_material, oc_dir, oc_skill, oc_oprop, oc_name, etc. were undefined)
- [x] Fixed pager.js undefined `obj_descr` variable
- [x] Fixed do_name.js `oc_weight` (should be `oc_wt`)
- [x] Migrated `.material`→`.oc_material` (~45 reads, 20 files)
- [x] Migrated `.desc`→`.oc_descr` (~42 reads, 7 files)
- [x] Migrated `.name`→`.oc_name` (~115 reads, 12 files)
- [ ] Migrate remaining legacy reads: .prob, .cost, .color, .weight, .delay, .sdam, .ldam, .oc1, .oc2, .sub, .dir, .prop, .nutrition (low priority — aliases handle these)
- [ ] Normalize obj instance `.name`→`.oname` (~11 files)

Phase-2 exit gate:
- [x] No remaining attack alias reads/writes.
- [x] `attack_fields.js` deleted with no remaining imports.
- [x] No remaining unambiguous permonst aliases (mr1/2, flags1/2/3, sound, weight, nutrition).
- [x] No parity regression vs baseline envelope (2488/2488 unit, 25/34 gameplay).
- [x] Objclass generator emits C-canonical names with getter/setter aliases.
- [x] Top 3 objclass fields migrated (oc_name, oc_descr, oc_material — ~200 reads total).
- [ ] Remaining objclass legacy reads deferred (low priority, aliases handle them).

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

- Phase 2D core complete. Remaining: migrate lower-priority objclass legacy reads, obj instance .name→.oname, then Phase 3 (file-per-C-source reorg).
