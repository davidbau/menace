# Constant Dependency Design Doc

Execution checklist source of truth for Issue #227:
[`docs/ISSUE_227_EXECUTION_CHECKLIST.md`](/share/u/davidbau/git/mazesofmenace/game/docs/ISSUE_227_EXECUTION_CHECKLIST.md)

## Goal

Understand which C header files are "leaf" constants files (safe to import from
anywhere in JS without circular initialization risk), and which depend on
constants from other files.

## C Header Constant Cross-File Dependencies

Every case where a constant's RHS references a constant defined in another file:

### artifact.h
- `SPFX_XRAY` uses `RAY` [objclass.h]
- `TAMING` uses `LAST_PROP` [prop.h]

### botl.h
- `BL_ATTCLR_MAX`, `HL_ATTCLR_*` use `CLR_MAX` [color.h]
- `MAXCO` uses `COLNO` [global.h]
- `REASSESS_ONLY` uses `TRUE` [global.h]

### config.h
- `CONFIG_ERROR_SECURE` uses `TRUE` [global.h]
- `GEM_GRAPHICS` uses `GEM` [objects.h]

### dgn_file.h
- `D_ALIGN_CHAOTIC/LAWFUL/NEUTRAL` use `AM_*` [align.h]

### display.h
- `GLYPH_*_OFF` use `MAXEXPCHARS` [sym.h], `WARNCOUNT` [sym.h], `MAXTCHARS` [sym.h]
- guard macro only [vision.h]

### global.h
- `PANICTRACE` and guard macros use constants from [config.h]
- `NH_DEVEL_STATUS` uses `NH_STATUS_WIP` [patchlevel.h]
- `NH_STATUS_RELEASED` defined in [patchlevel.h]

### hack.h
- `SHOP_WALL_DMG` uses `ACURRSTR` [attrib.h]
- `MAXLINFO` uses `MAXDUNGEON` [global.h], `MAXLEVEL` [global.h]
- `MM_NOWAIT` uses `STRAT_WAITMASK` [monst.h]
- `RLOC_NOMSG` uses `STRAT_APPEARMSG` [monst.h]
- `BALL_IN_MON`, `CHAIN_IN_MON` use `OBJ_FREE` [obj.h]
- `UNDEFINED_RACE/ROLE` use `NON_PM` [permonst.h]
- `CC_SKIP_INACCS` uses `ZAP_POS` [rm.h]
- `SYM_OFF_X` uses `WARNCOUNT` [sym.h]

### mextra.h
- guards use `AM_*` [align.h]
- `FCSIZ` uses `COLNO` [global.h], `ROWNO` [global.h]

### monsters.h
- `SEDUCTION_ATTACKS_*` use `NO_ATTK` [artilist.h], `AD_*` [monattk.h], `AT_*` [monattk.h]

### obj.h
- `OBJ_H` guard uses `UNIX` [config.h]

### objects.h
- `B`, `P`, `S`, `PAPER` use `WHACK` [objclass.h], `PIERCE` [objclass.h], `SLASH` [objclass.h], `LEATHER` [objclass.h]

### sp_lev.h
- `ICEDPOOLS` uses `ICED_MOAT` [rm.h], `ICED_POOL` [rm.h]

### sym.h
- `MAXTCHARS` uses `TRAPNUM` [trap.h]

### you.h
- `ROLE_ALIGNMASK/CHAOTIC/LAWFUL/NEUTRAL` use `AM_*` [align.h]

---

## Pure Leaf Headers (no cross-file constant deps)

These headers define only self-contained constants and are safe to import
from anywhere without risk of unresolved dependencies:

```
align.h       artilist.h    attrib.h      context.h
coord.h       decl.h        defsym.h      dungeon.h
engrave.h     extern.h      flag.h        hacklib.h
integer.h     lint.h        mkroom.h      monattk.h
mondata.h     monst.h       optlist.h     patchlevel.h
quest.h       rect.h        region.h      rm.h
savefile.h    seffects.h    spell.h       stairs.h
trap.h        vision.h      warnings.h    weight.h
youprop.h     objclass.h    obj.h (mostly) prop.h    color.h
```

---

## JS Equivalent Leaf Files

Mapping the above to JS: the files that define only pure constants and are safe
to import from anywhere without circular init risk:

| C header | JS equivalent | Status |
|----------|---------------|--------|
| config.h + defsym.h + integer.h | `const.js` | ✅ leaf, no imports |
| monsters.h + monattk.h | `monsters.js` | ✅ near-leaf (→ attack_fields.js only) |
| objects.h + objclass.h | `objects.js` | ✅ leaf, no imports |
| trap.h | `const.js` (TT_* etc.) | ✅ |
| align.h | `const.js` (A_LAWFUL etc.) | ✅ |
| attrib.h | `const.js` (A_STR etc.) | ✅ |
| artilist.h | `const.js` / `artifacts.js` | check |
| rm.h | `const.js` | check |
| sym.h / defsym.h | `const.js` | check |
| hacklib.h | `hacklib.js` | ✅ leaf |

---

## Key Insight

The C constant dependency graph is **shallow** — only ~12 headers have any
cross-file constant dependencies, and those dependencies only go 1-2 levels
deep (e.g. `hack.h` → `global.h` → `config.h` → pure literals). There are
**no cycles** in the C constant dependency graph.

The JS equivalent should maintain this property: `const.js`, `monsters.js`,
`objects.js`, `hacklib.js` form the leaf tier and must never
import from gameplay modules. Everything else can freely import from these
without initialization risk.

The pervasive JS module cycles (`trap ↔ hack ↔ vision` etc.) are **not a
constant initialization problem** — they only involve function imports, which
are resolved by the time any function executes.

---

## Target JS Architecture

The goal is a set of **leaf files** that together hold all exported capitalized
constants and all static data tables. No other JS file exports capitalized
constants — only functions and unexported locals. This means the rest of the
codebase can have arbitrary circular dependencies between gameplay files without
any constant initialization risk.

### The leaf files

| File | Contents | Imports | Source |
|------|----------|---------|--------|
| `version.js` | `COMMIT_NUMBER` — build artifact | none | git hook |
| `const.js` | All hand-maintained capitalized constants: scalars, display tables, direction arrays, terrain/symbol/trap constants | `version.js` only | hand-maintained |
| `objects.js` | Auto-generated object data table + `initObjectData()` | `const.js` only | `gen_objects.py` |
| `monsters.js` | Auto-generated monster data table | `const.js` only | `gen_monsters.py` |
| `artifacts.js` | Auto-generated artifact data table (`artilist[]`) + `ART_*` / `SPFX_*` constants | `const.js` only | `gen_artifacts.py` |
| `game.js` | `game` singleton + all struct class definitions | `const.js` only | hand-written |
| `engrave_data.js` | Encrypted engrave strings (makedefs output) | none | build artifact |
| `epitaph_data.js` | Encrypted epitaph strings (makedefs output) | none | build artifact |
| `rumor_data.js` | Encrypted rumor strings (makedefs output) | none | build artifact |
| `storage.js` | `DEFAULT_FLAGS`, `OPTION_DEFS` — config data with 30+ consumers | core leaf headers | hand-maintained |

`config.js` and `symbols.js` are merged into `const.js`. `symbols.js`
currently imports level-type constants from `config.js`; merging eliminates
that dependency entirely.

`attack_fields.js` (runtime alias shim) is deleted entirely once all call
sites use canonical C field names (Phase 2).

### The rule

- **Core leaf headers** (`version.js`, `const.js`): export capitalized constants;
  import only from each other.
- **Generated data leaf headers** (`objects.js`, `monsters.js`, `artifacts.js`):
  export capitalized data constants and tables; import only from core leaf headers.
- **State leaf** (`game.js`): exports `game` singleton and struct classes; imports
  only from core leaf headers.
- **Build artifact leaves** (`engrave_data.js`, `epitaph_data.js`, `rumor_data.js`):
  export encrypted string blobs; no imports.
- **Options leaf** (`storage.js`): exports `DEFAULT_FLAGS` and `OPTION_DEFS`;
  imports only from core leaf headers.
- **All other files**: import freely from any leaf file; may have arbitrary circular
  imports between themselves (functions only); must not export capitalized constants.

### Table-building helper functions

The generated data files use C macro idioms that become small pure helper functions
in JS, defined **inline** at the top of the file that uses them — not exported:

| Helper | Defined in | What it does |
|--------|-----------|-------------|
| `HARDGEM(n)` | `objects.js` | `n >= 8 ? 1 : 0` — gem toughness from Mohs hardness |
| `BITS(...)` | `objects.js` | Unpacks object bitfield args into a plain object |
| `PHYS/DRLI/COLD/FIRE/ELEC/STUN/POIS(a,b)` | `artifacts.js` | Attack struct shorthand |
| `NO_ATTK`, `NO_DFNS`, `NO_CARY` | `artifacts.js` | Empty attack/defense/carry struct |
| `DFNS(c)`, `CARY(c)` | `artifacts.js` | Defense/carry struct shorthand |

If a helper is ever shared across multiple leaf files it moves to `const.js`.
The generators emit these as function calls (e.g. `HARDGEM(9)`) rather than
pre-evaluating them — keeping the JS tables readable and close to the C source.

### Implementation steps

1. Merge `config.js` + `symbols.js` → `const.js`
2. Update the Python generators so `objects.js`, `monsters.js`, `artifacts.js`
   import from `const.js` only; inline table-building helpers
3. Audit all other JS files and move any stray exported capitalized constants
   into the appropriate leaf file
4. Update all import sites from `config.js`/`symbols.js` → `const.js`

### Audit command

Check for stray exported capitalized constants outside leaf files:

```bash
grep -rn "export \(const\|let\|var\) [A-Z]" js/*.js \
  | grep -v 'js/const\.js\|js/objects\.js\|js/monsters\.js\|js/version\.js' \
  | grep -v 'js/artifacts\.js\|js/game\.js\|js/.*_data\.js\|js/storage\.js'
```

This should produce no output. If it does, move or unexport the offending constants.

---

## Master Refactor Plan (Issue #227)

Five sequential phases. Each phase keeps tests passing before moving to the next.

## Autonomous Execution Plan (Issue #227)

This section defines the required execution order and stop gates so work can be
done autonomously without ambiguity.

### Phase 0 — Preflight and baseline (required before code edits)

1. Generate and check in an inventory of:
   - top-level `register*()` calls,
   - top-level `set*Context` / `set*Player` / similar wiring calls,
   - gameplay modules exporting capitalized names outside the leaf set.
2. Record baseline parity metrics using the current standard report command.
3. Do not start structural rewrites until both inventory and baseline are
   committed.

Exit gate:
- Inventory file(s) exist and are reviewed.
- Baseline parity report is captured in commit notes/comments.
- Inventory artifact is committed and referenced:
  [`docs/port-status/ISSUE_227_PHASE0_INVENTORY_2026-03-05.md`](/share/u/davidbau/git/mazesofmenace/game/docs/port-status/ISSUE_227_PHASE0_INVENTORY_2026-03-05.md)
- Baseline artifact is committed and referenced:
  [`docs/port-status/ISSUE_227_PHASE0_BASELINE_2026-03-05.md`](/share/u/davidbau/git/mazesofmenace/game/docs/port-status/ISSUE_227_PHASE0_BASELINE_2026-03-05.md)
  with full per-session JSON:
  [`docs/metrics/issue227_phase0_session_baseline_2026-03-05.json`](/share/u/davidbau/git/mazesofmenace/game/docs/metrics/issue227_phase0_session_baseline_2026-03-05.json)

### Phase 1 — Infrastructure Laydown (highway first)

1. Lay down target ownership and module boundaries first:
   - establish/expand leaf ownership (`version.js`, `const.js`, `objects.js`,
     `monsters.js`, `game.js`),
   - move structural ownership to canonical homes (for example map/level state).
2. Keep behavior unchanged; this phase is structure-only.
3. Do not add `initAll` or any global startup orchestrator.
4. Existing legacy wiring (`register*`, `set*Context`, etc.) may temporarily
   remain if still needed during migration.

Batching rule:
- Land in small structural batches with regression evidence.

Exit gate:
- Canonical ownership targets are in place for migrated subsystems.
- No parity regressions vs baseline.

### Phase 2 — C Field Name Normalization

Fix all non-C field name aliases across the JS codebase (see table below).
Work file-by-file; run tests after each file. When all aliases are gone,
delete `attack_fields.js`.

This phase is prerequisite to Phases 3 and 4 because once names are canonical,
the autotranslator can emit correct code for newly ported functions without
a field-mapping layer.

### Phase 3 — Constant Consolidation

Move all exported capitalized constants into the leaf files. After this
phase the rule is enforced: only the leaf files listed above export
capitalized names.

Circular imports among all other files become safe — they only involve
function bindings, which are resolved before any function executes.

Batching rule:
- Move constants by subsystem (for example: traps/symbols, dungeon, combat),
  one subsystem per commit.

Exit gate:
- `rg "export (const|let|var) [A-Z]" js` only reports the leaf files listed above.
- Parity is no worse than baseline.

### Phase 4 — File-per-C-Source Reorganization

Move every function into a `.js` file whose name matches the `.c` file it was
ported from. This makes porting new C functions trivial: you always know which
file to put them in, and the autotranslator can target the right file directly.

Circular imports between `.js` files are explicitly allowed and safe after
Phase 3. No `register*()` and no `initAll` needed.

Batching rule:
- Move functions file-by-file with no behavior edits in the same commit.
- After each move commit, run targeted parity tests for touched areas.

Exit gate:
- Each gameplay function is in its corresponding C-source-named file.
- Consolidation helper files listed below are either empty or deleted.
- Parity is no worse than baseline.

### Phase 5 — Legacy Wiring Decommission

1. Remove no-longer-needed module-init wiring patterns:
   - top-level `register*()` usage in gameplay modules,
   - top-level `set*Context`/`set*Player` style cross-module wiring side effects.
2. Convert remaining initialization to declarative data setup or runtime call
   sites.
3. Keep bootstrap/UI-only registration helpers scoped to bootstrap modules.

Exit gate:
- No remaining top-level gameplay `register*()`/context wiring side effects.
- No parity regressions vs baseline.

## Non-Negotiable Autonomy Rules

1. No behavior changes mixed into pure-structure commits unless needed to keep
   tests passing; if needed, isolate the behavior fix in a separate commit.
2. Never proceed to the next phase with unresolved regressions.
3. Keep `CURRENT_WORK.md` updated with:
   - active phase/subphase,
   - current blockers,
   - next concrete commit target.
4. Push validated increments immediately; do not accumulate large local WIP.

**C source files already matched 1:1 in JS** (no work needed):
`apply`, `artifact`, `ball`, `bones`, `botl`, `cmd`, `decl`, `detect`, `dig`,
`display`, `dog`, `dogmove`, `dungeon`, `engrave`, `explode`, `fountain`,
`hack`, `insight`, `invent`, `lock`, `mhitm`, `mhitu`, `mkobj`, `mkmaze`,
`mkroom`, `mon`, `mondata`, `monmove`, `mthrowu`, `music`, `objnam`, `pager`,
`pickup`, `pline`, `polyself`, `quest`, `rect`, `region`, `restore`, `save`,
`shk`, `shknam`, `sit`, `sounds`, `sp_lev`, `spell`, `steed`, `teleport`,
`timeout`, `topologize`, `trap`, `uhitm`, `vault`, `vision`, `weapon`, `were`,
`wield`, `wizard`, `worn`, `write`, `zap`

**C source files intentionally not ported to JS** (blacklist — covered by
JS built-ins or irrelevant in the browser):

| C file | Reason not needed in JS |
|--------|------------------------|
| `alloc.c` | malloc/free wrappers — JS has garbage collection |
| `cfgfiles.c` | nethackrc/config file parsing — JS uses in-game options without file I/O |
| `coloratt.c` | terminal color attribute tables — JS uses CSS/HTML rendering; `const.js` covers what's needed |
| `date.c` | date/time utilities — JS has built-in `Date` |
| `dlb.c` | Data Library Binary file format for bundling game data — JS bundles data as ES modules |
| `drawing.c` | runtime init of defsyms/def_monsyms arrays — JS pre-declares these as constants in `const.js` |
| `files.c` | file I/O (save, bones, config) — JS uses `storage.js` and browser storage APIs |
| `mail.c` | Unix mail daemon in-game feature — not applicable in browser |
| `mdlib.c` | shared math/data utilities for NetHack toolchain — covered by JS built-ins |
| `nhlobj.c` | Lua object bindings for special levels — JS re-implements sp_lev natively |
| `nhlsel.c` | Lua selection bindings — same |
| `nhlua.c` | Lua scripting interface — same |
| `nhmd4.c` | MD4 hash for save file integrity — JS uses different save format |
| `report.c` | crash reporting / panic trace — not applicable in browser |
| `rnd.c` | C PRNG implementation — replaced by `rng.js` + `xoshiro256.js` |
| `selvar.c` | Lua selection variables for map gen — handled in JS `sp_lev.js` |
| `sfbase.c` | save file serialization base — JS uses `storage.js` with JSON |
| `sfstruct.c` | save file struct layout — same |
| `strutil.c` | C string buffer utilities — JS has built-in string methods |
| `sys.c` | system config (SYSCF, debug files) — not applicable in browser |

**JS files with no C counterpart** (JS infrastructure — keep as-is):
`animation`, `browser_input`, `chargen`, `config`, `delay`, `headless`,
`input`, `keylog`, `nethack`, `render`, `replay_core`, `replay_compare`,
`rng`, `storage`, `xoshiro256`

**JS invented consolidation files** (functions/structures need sorting into canonical ownership):
`combat`, `look`, `monutil`, `stackobj`, `player`, `discovery`, `options_menu`, `map`

`map.js` plan status: completed. Level map ownership now lives in `game.js`;
`map.js` has been removed.

### `map.js` elimination execution checklist (completed)

`map.js` previously exported four gameplay-facing symbols:
`makeLocation`, `makeRoom`, `GameMap`, and `FILL_*`.
Implemented destinations:

1. `makeRoom` + `FILL_*` -> `mkroom.js` (source-of-truth for `struct mkroom`).
2. `makeLocation` -> level-state owner (`game.js`) with C-shape
   fields matching `struct rm`.
3. `GameMap` constructor/methods -> level-state owner (`game.js`), with
   room/door/flags collections as `game.level.*`.
4. Importers (`dungeon.js`, `mklev.js`, `sp_lev.js`, `storage.js`, `chargen.js`,
   `extralev.js`) switched to canonical owners.
5. `map.js` deleted without compatibility re-exports.

---

## C Field Name Normalization

Part of the same work: JS code uses non-C field names as aliases on data
structs. These must be renamed to match the C source so that the autotranslator
can emit correct code and ported functions look like the original.

See also: `docs/STRUCTURES.md` for the parallel effort on
global variable names (`gX.` → `game.*`).

### Attack struct (`struct attack` — permonst.h)

| JS alias | C field | Uses | Files |
|----------|---------|------|-------|
| `.at` | `.aatyp` | 1 | `attack_fields.js` |
| `.type` (on attack obj) | `.aatyp` | 6 | `attack_fields.js`, `dogmove.js`, `mon.js`, `mondata.js` |
| `.damage` | `.adtyp` | 2 | `mhitu.js`, `mondata.js` |
| `.ad` | `.adtyp` | 7 | `artifact.js` |
| `.dice` | `.damn` | 1 | `artifact.js` |
| `.sides` | `.damd` | 2 | `artifact.js` |

The generated `monsters.js` already emits canonical names (`aatyp`, `adtyp`,
`damn`, `damd`). `attack_fields.js` exists solely to paper over these aliases
at runtime. Once all call sites are normalized, `attack_fields.js` is deleted.

### Monster data struct (`struct permonst` — permonst.h)

| JS alias | C field | Uses | Notes |
|----------|---------|------|-------|
| `.speed` | `.mmove` | 11 | On monster instances; `mmove` is the permonst field |
| `.difficulty` | `.mlevel` | ~10 | Used interchangeably with `.mlevel` in some files |

`.mlevel` is already the C name; `.difficulty` is a JS invention used in some
files. Normalize to `.mlevel` everywhere.

### Object struct (`struct obj` / `struct objclass`)

| JS alias | C field | Uses | Notes |
|----------|---------|------|-------|
| `.name` (on item) | `.oname` | ~11 | User-assigned name; C uses `oname` char* |

`.oc_name` (the object class name) is already the correct C name where used.
