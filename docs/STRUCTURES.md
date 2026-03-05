# C-Faithful State Refactor Plan

Execution checklist source of truth for Issue #227:
[`docs/ISSUE_227_EXECUTION_CHECKLIST.md`](/share/u/davidbau/git/mazesofmenace/game/docs/ISSUE_227_EXECUTION_CHECKLIST.md)

## Goal

Make the JS runtime state match NetHack C global variable names directly, so that
C functions can be ported with near-1:1 structure and the autotranslate tool can
emit working code without a complex field-mapping layer.

See also: `docs/MODULES.md` for the complementary plan to consolidate
all capitalized constants into four leaf header files (`const.js`, `objects.js`,
`monsters.js`, `version.js`), and for the C field name normalization table covering
struct fields like `aatyp`/`adtyp`/`damn`/`damd` and `mmove`.

## The C Global Variable System

NetHack 3.7 refactored all C globals into 26 structs (`ga` through `gz`) plus
saved-game structs (`sva` through `svy`), plus `flags`, `iflags`, `svc.context`.
The struct letter is **purely alphabetical bucketing by first letter of the
variable name** — it carries no semantic meaning. `gf.ftrap` is just `ftrap`,
`gb.bhitpos` is just `bhitpos`, `gy.youmonst` is just `youmonst`.

## JS Naming Convention

Strip the `gX.` / `svX.` mechanical prefix. Everything lives on `game`.
The "current JS" column shows legacy names that need renaming:

| C | target JS | current/legacy JS |
|---|-----------|-------------------|
| `gf.ftrap` | `game.ftrap` | — |
| `gb.bhitpos` | `game.bhitpos` | — |
| `gy.youmonst` | `game.youmonst` | — |
| `gm.multi` | `game.multi` | `game.multi` ✓ |
| `gn.nomovemsg` | `game.nomovemsg` | — |
| `gl.launchplace` | `game.launchplace` | — |
| `gi.invent` | `game.invent` | `player.inventory` |
| `gv.vision_full_recalc` | `game.vision_full_recalc` | — |
| `svm.moves` | `game.moves` | `game.turnCount` |
| `svl.level` | `game.level` | — |
| `svc.context` | `game.context` | `game.svc.context` |
| `svd.dungeons` | `game.dungeons` | — |
| `u.ux` | `game.u.ux` | `player.x` |
| `u.utrap` | `game.u.utrap` | — |
| `flags.verbose` | `game.flags.verbose` | `game.flags.verbose` ✓ |
| `flags.debug` | `game.flags.debug` | `game.wizard` |
| `svc.context.run` | `game.context.run` | `game.svc.context.run` |
| `svs.spl_book` | `game.spl_book` | `player.spells` |
| `u.uhp` | `game.u.uhp` | `player.hp` |
| `u.uac` | `game.u.uac` | `player.ac` |
| `u.ulevel` | `game.u.ulevel` | `player.level` |
| `u.acurr` | `game.u.acurr` | `player.attributes[]` |
| `u.ualign` | `game.u.ualign` | `player.alignment` (type only) |

### Hero state nesting: flat vs `game.u.*`

Two options for mapping `u.*` (struct you) fields:

**Option A — flat** (current plan): `u.uhp` → `game.uhp`, `u.ulevel` → `game.ulevel`
- autotranslator rule: `u.` → `game.`
- Drawback: `game.*` mixes hero fields with engine fields; names like `game.uhp` are fine but slightly opaque

**Option B — nested `game.u.*`**: `u.uhp` → `game.u.uhp`, `u.ulevel` → `game.u.ulevel`
- autotranslator rule: `u.` → `game.u.`
- Matches C source exactly (C code says `u.uhp`)
- Ported functions can do `const u = game.u;` to mirror C's global `u` access
- Hero state is clearly separated from engine state in the object shape
- Drawback: `game.u.uhp` is redundant-looking (u prefix twice), but this is faithful to C

The `u.` prefix on field names (uhp, uac, ulevel…) is historical — they already
have a `u` prefix in C because they're in `struct you`. Option B with `game.u.*`
is the cleaner choice for autotranslation and readability of ported code.

The `gX.*` engine fields stay flat: `gm.multi` → `game.multi` (those field names
don't have a prefix, so flattening is clean).

The old `player` object and `map` object are **compatibility aliases** during
migration. Core new code reads/writes `game.u.*` (hero) and `game.*` (engine)
directly.

The hero-as-monster struct `gy.youmonst` becomes `game.youmonst`; its fields
(`youmonst.mx` etc.) stay as sub-fields.

## state_paths.json translator rewrites

The autotranslate tool `state_paths.json` gets simple prefix-stripping entries:

```json
{ "c": "gy.", "js": "game.", "requires_params": ["game"] },
{ "c": "gf.", "js": "game.", "requires_params": ["game"] },
{ "c": "gb.", "js": "game.", "requires_params": ["game"] },
{ "c": "gi.", "js": "game.", "requires_params": ["game"] },
... (one entry per letter a-z)
{ "c": "svm.", "js": "game.", "requires_params": ["game"] },
{ "c": "svl.", "js": "game.", "requires_params": ["game"] },
... (one entry per saved-game letter)
{ "c": "u.",  "js": "game.u.", "requires_params": ["game"] }
```

Note: `u.*` maps to `game.u.*` (Option B — nested sub-object) so that ported
C functions can do `const u = game.u;` and the code reads exactly like C.
All other gX./svX. map flat onto `game.*` since those field names have no prefix.

This replaces the existing complex field-by-field mapping.

## Circular Dependency Problem

The JS module graph has pervasive cycles. Key clusters:

- `trap <-> vision`, `trap <-> hack`, `trap <-> do`, `trap <-> mon`
- `makemon <-> mkobj`, `monutil <-> mondata <-> worn`
- `invent <-> dothrow`, `invent <-> objnam <-> shk`
- `hack <-> uhitm`, `hack <-> monmove`

JavaScript ESM handles cycles via live bindings, but **functions used at module
init time** (not inside function bodies) will see `undefined` if the exporting
module hasn't finished executing yet. This causes silent bugs.

### Root cause

Cycles exist because modules import both **constants/types** and **functions**
from each other. The fix is to separate these concerns:

### Fix: constants-only leaf modules

Use the `docs/MODULES.md` leaf-file architecture as the source of truth:
`version.js`, `const.js`, `objects.js`, `monsters.js` (plus `game.js` as the
state leaf defined in this doc). Do not introduce alternative constant files
(`constants.js`, `trapconst.js`, etc.) in parallel.

All capitalized constants are consolidated into those leaf files; gameplay
modules import constants from leaf files only.

### Fix: game object as the shared root

Rather than passing `game`, `player`, `map` as function parameters (which
requires importing the types from somewhere), treat `game` as a well-known
singleton initialized before any module function runs. Modules import `game`
from a single `game.js` bootstrap module that itself imports nothing from
gameplay modules.

This breaks the cycle pattern: instead of `A imports from B imports from A`,
both `A` and `B` import `game` from the same zero-dep root.

### Fix: runtime wiring discipline

Avoid top-level side-effect wiring and `register*()`-style initialization
patterns. Do not add `initAll`/startup orchestrator wiring.

**Why `initAll` is not needed:** after the five leaf files are in place, every
remaining circular import is a cycle between function-exporting modules. ESM live
bindings resolve function references correctly — a function body that calls an
imported function will always see the correct binding as long as it is not
*invoked* during module initialization. Since module top-level code is restricted
to declarations (classes, functions, constants), no function body runs until
after all modules are loaded, so all live bindings are already set. No explicit
wiring phase is required.

## Work Plan

The full four-phase refactor is described in `docs/MODULES.md` (Issue #227).
Each step must leave the test suite no worse than before moving to the next —
this is purely structural; no behavior changes at any phase.

**Phase 0** (preflight) and **Phase 1** (infrastructure laydown first) are
described in MODULES.md. The state-rename work below maps to **Phases 2–4** of
that plan; legacy wiring decommission is **Phase 5**. No `initAll` or startup
orchestrator is added; cross-module interactions happen at normal runtime call
sites.

Phase-0 artifacts (inventory + baseline) are committed and referenced here:
- [`docs/port-status/ISSUE_227_PHASE0_INVENTORY_2026-03-05.md`](/share/u/davidbau/git/mazesofmenace/game/docs/port-status/ISSUE_227_PHASE0_INVENTORY_2026-03-05.md)
- [`docs/port-status/ISSUE_227_PHASE0_BASELINE_2026-03-05.md`](/share/u/davidbau/git/mazesofmenace/game/docs/port-status/ISSUE_227_PHASE0_BASELINE_2026-03-05.md)

### Target end state

When the refactor is complete:
- Every JS function has the same name as the C function it ports
- Every JS file is named after the C source file it corresponds to
- Every struct field has the same name as in C (no aliases, no adapters)
- No pass-through functions (no `function foo(...args) { return _foo(...args); }`)
- No legacy-fallback expressions (no `legacyField ?? newField`)
- No compatibility shim objects (`player`, `game.svc`, `game.u` aliases, etc.)
- `game` is the single shared state root; `game.u` holds hero state as a sub-object

Backward-compatible aliases introduced during migration are **temporary
scaffolding only** — each alias is removed as soon as the last code that uses it
is migrated and tests are confirmed no worse.

### Phase 2 — Struct Field Name Normalization

Rename all non-C JS field aliases to canonical C names, file by file.
Run tests after each file. This is a pure rename of property accesses with no
logic changes.

**Why Phase 2 before Phase 3:** once field names are canonical, the autotranslator
can emit correct code for newly ported C functions without a field-mapping layer.
Doing this first means every subsequent phase benefits immediately.

**Batching rule:** one struct type per commit — attack struct first, then
permonst, then objclass, then obj instances. Run tests after each commit.

**Exit gate — before moving to Phase 3:**

| | Status |
|-|--------|
| **Present** | All struct fields accessed by canonical C names throughout the codebase |
| **Complete** | Every alias in the tables below renamed in every file |
| **Deleted (attack)** | `attack_fields.js` gone; no remaining `.at`, `.type` (on attacks), `.damage`, `.ad`, `.dice`, `.sides` |
| **Deleted (permonst)** | No remaining `.speed`, `.difficulty`, `.mr1`, `.mr2`, `.flags1`/`.flags2`/`.flags3` (on permonst) |
| **Deleted (objclass/obj)** | No remaining `.sdam`, `.ldam`, `.oc1`, `.oc2`, `.sub`/`.prop`/`.dir` (on objclass); no `.name` (user-given, on obj instances) |
| **Verified** | Test suite is no worse than before Phase 2 began |

**Attack struct** (`struct attack` in `permonst.h`):

| JS alias | → C field | Files |
|----------|-----------|-------|
| `.at` / `.type` | `.aatyp` | `attack_fields.js`, `dogmove.js`, `mon.js`, `mondata.js` |
| `.damage` / `.ad` | `.adtyp` | `mhitu.js`, `mondata.js`, `artifact.js` |
| `.dice` | `.damn` | `artifact.js` |
| `.sides` | `.damd` | `artifact.js` |

The generated `monsters.js` already emits canonical names. Delete
`attack_fields.js` once all call sites are normalized — it exists only to paper
over these aliases at runtime.

**Permonst struct** (`struct permonst` in `permonst.h`) — generated `monsters.js`
already emits C names; fix all reading-side uses:

| JS alias | → C field | Notes |
|----------|-----------|-------|
| `.name` | `.pmnames` | Array `[name, namePlural]` |
| `.symbol` | `.mlet` | |
| `.level` | `.mlevel` | |
| `.speed` | `.mmove` | |
| `.difficulty` | `.mlevel` | JS alias for the same C field as `.level`; normalize both |
| `.align` | `.maligntyp` | |
| `.attacks` | `.mattk` | |
| `.weight` | `.cwt` | |
| `.nutrition` | `.cnutrit` | |
| `.sound` | `.msound` | |
| `.size` | `.msize` | |
| `.mr1` | `.mresists` | |
| `.mr2` | `.mconveys` | |
| `.flags1` / `.flags2` / `.flags3` | `.mflags1` / `.mflags2` / `.mflags3` | |
| `.color` | `.mcolor` | |

Note: `.difficulty` and `.level` are two JS aliases for the same C field
`.mlevel`. Normalize both to `.mlevel`.

**ObjClass struct** (`struct objclass` in `objclass.h`) — generated `objects.js`
already emits C names; fix all reading-side uses:

| JS alias | → C field |
|----------|-----------|
| `.name` | `.oc_name` |
| `.desc` | `.oc_descr` |
| `.sdam` | `.oc_wsdam` |
| `.ldam` | `.oc_wldam` |
| `.oc1` | `.oc_oc1` |
| `.oc2` | `.oc_oc2` |
| `.sub` | `.oc_subtyp` |
| `.prop` | `.oc_oprop` |
| `.dir` | `.oc_dir` |
| `.material` | `.oc_material` |

**Obj instance struct** (`struct obj` in `obj.h`):

| JS alias | → C field | Notes |
|----------|-----------|-------|
| `.name` (user-given name) | `.oname` | ~11 files; distinct from `.oc_name` |

### game.js bootstrap — prerequisite for the rename sweep

`docs/MODULES.md` defines four constant leaf files (`version.js`, `const.js`,
`objects.js`, `monsters.js`). `game.js` is the fifth leaf: it owns the `game`
singleton and all struct class definitions. It can be written in parallel with
Phase 2 but must be complete before the legacy rename sweep begins.

**The five leaf files and their import rules:**

| File | Imports from | Contains |
|------|-------------|---------|
| `version.js` | nothing | build artifact (git hook output) |
| `const.js` | `version.js` | all hand-maintained capitalized constants |
| `objects.js` | `const.js` | auto-generated object table + `initObjectData()` |
| `monsters.js` | `const.js` | auto-generated monster table |
| `game.js` | `const.js` only | `game` singleton + inline struct class definitions |

`map.js` scaffolding has been removed and is not part of the target leaf set.
Map/level structures are owned by canonical `game.*` state definitions in this
document and should be instantiated from `game.js` (or C-source-mapped files in
later phases), not from a standalone `map.js` singleton class module.

All gameplay files import freely from each other and from these five.
Because the leaf files import no gameplay functions, they cannot participate in
cycles. This makes all other circular imports safe — function bindings resolve
before any function body executes.

**Why `game.js` doesn't import `objects.js` or `monsters.js`:** `game.js` only
creates empty/default instances (e.g. `new Monst()`). Monster and object table
data is loaded at game start via `initObjectData()` called from game startup code,
not at module-init time. No module-init dependency on those tables.

**Why `game.u` is a sub-object (not flat):** see the "Hero state nesting" section
above. The key reason: ported C functions can do `const u = game.u;` and the code
reads exactly like the original C with its global `struct you u;`.

```js
// game.js — imports only const.js (no gameplay modules)
import { COLNO, ROWNO, ... } from './const.js';

// Struct class definitions inline:
class Context { constructor() { this.run = 0; ... } }
class Flag     { constructor() { this.debug = false; ... } }
// ...

export const game = {
  u:        new You(),      // struct you  — hero state (u.* → game.u.*)
  context:  new Context(),  // target: game.context (was game.svc.context)
  flags:    new Flag(),     // target: game.flags.* (was game.wizard etc.)
  youmonst: new Monst(),    // gy.youmonst — hero-as-monster form cache
  level:    new Level(),    // svl.level — current dungeon level
  // ... all other fields from Complete game.* Field Reference below
};
```

During migration, temporary shims let old code keep working:

```js
// TEMPORARY — delete when all callers are migrated to game.context
game.svc = { context: game.context };
```

Each shim is marked `// TEMPORARY` and deleted as soon as its last caller is
updated. End state: zero shims in `game.js`.

**`game.u` is a live sub-object.** Ported C functions can do:
```js
const u = game.u;   // mirrors C's global `struct you u;`
```

**Exit gate for game.js bootstrap — before the legacy rename sweep:**

| | Status |
|-|--------|
| **Present** | `game.js` exists; exports `game` singleton with all fields; all struct class definitions inline or imported from canonical C-source-mapped files |
| **Complete** | All gameplay modules import `game` from `game.js`; all `// TEMPORARY` shims documented |
| **Deleted** | Nothing yet — shims still live; `player.js` still in use |
| **Verified** | Test suite is no worse than before |

### Phase 3 — Constant Consolidation

Move all capitalized constants into the four leaf files (`const.js`, `objects.js`,
`monsters.js`, `version.js`). No behavior changes — only the file that owns each
constant changes. After this phase, circular imports among all other files are
safe because they involve only function bindings, not constant values.

**Exit gate — before the legacy rename sweep:**

| | Status |
|-|--------|
| **Present** | `const.js`, `objects.js`, `monsters.js`, `version.js` each contain all their respective constants |
| **Complete** | Only these four files (plus `game.js`) export capitalized names; no other JS file exports a capitalized constant |
| **Deleted** | Any intermediate consolidation helpers or re-export shims used during the move |
| **Verified** | Test suite is no worse than before Phase 3 began |

### Between Phase 3 and Phase 4 — state_paths.json and legacy rename sweep

Add autotranslate rewrites so newly ported functions emit `game.*` directly:

```json
{ "c": "u.",   "js": "game.u.", "requires_params": ["game"] },
{ "c": "ga.",  "js": "game.",   "requires_params": ["game"] },
{ "c": "gb.",  "js": "game.",   "requires_params": ["game"] },
...  (one entry per letter a–z, and per saved-game letter sva–svy)
```

Sweep remaining legacy JS names to their canonical targets (file by file, tests
must pass after each file):

| Legacy JS | → Target JS | C source |
|-----------|-------------|----------|
| `game.turnCount` | `game.moves` | `svm.moves` |
| `game.svc.context` | `game.context` | `svc.context` |
| `game.wizard` | `game.flags.debug` | `flags.debug` |
| `game.in_doAgain` | `game.in_doagain` | `gi.in_doagain` |
| `player.x` / `player.y` | `game.u.ux` / `game.u.uy` | `u.ux` / `u.uy` |
| `player.hp` / `player.hpmax` | `game.u.uhp` / `game.u.uhpmax` | `u.uhp` / `u.uhpmax` |
| `player.pw` / `player.pwmax` | `game.u.uen` / `game.u.uenmax` | `u.uen` / `u.uenmax` |
| `player.ac` | `game.u.uac` | `u.uac` |
| `player.level` | `game.u.ulevel` | `u.ulevel` |
| `player.exp` | `game.u.uexp` | `u.uexp` |
| `player.hunger` | `game.u.uhunger` | `u.uhunger` |
| `player.moved` | `game.u.umoved` | `u.umoved` |
| `player.alignment` | `game.u.ualign.type` | `u.ualign.type` |
| `player.alignmentRecord` | `game.u.ualign.record` | `u.ualign.record` |
| `player.alignmentAbuse` | `game.u.ualign.abuse` | `u.ualign.abuse` |
| `player.attributes[]` | `game.u.acurr.a[]` | `u.acurr.a[]` |
| `player.uluck` / `player.moreluck` | `game.u.uluck` / `game.u.moreluck` | `u.uluck` / `u.moreluck` |
| `player.uprops` | `game.u.uprops` | `u.uprops` |
| `player.inventory` | `game.invent` | `gi.invent` |
| `player.spells` | `game.spl_book` | `svs.spl_book` |
| `player.name` | `game.plname` | `gp.plname` |

**youmonst and set_uasmon():** `game.youmonst` is a **form cache**, not a
continuous mirror of `game.u`. Port `set_uasmon()` before porting anything that
passes the hero to monster-combat functions. When porting it:
- Set `game.youmonst.data = mons[game.u.umonnum]` (permonst entry for current form)
- Set `game.youmonst.m_id = 1` (always; `mx` stays 0 — youmonst has no map position)
- Propagate species intrinsics into `game.u.uprops[]`
- Do **not** sync on every turn — rebuilt only on polymorph, lycanthropy, and restore.
- Called from: `u_init`, `restore`, `polyself`, `were`, `allmain`

**Exit gate for the legacy rename sweep — before Phase 4:**

| | Status |
|-|--------|
| **Present** | `state_paths.json` has entries for all `gX.`/`svX.` prefixes and `u.`; all canonical `game.*` / `game.u.*` field names are in use throughout the codebase |
| **Complete** | Every row in the legacy rename table above has been applied in every file |
| **Deleted** | `game.svc` shim; `game.wizard` reference; `game.turnCount` reference; all `// TEMPORARY` shims that have been migrated |
| **Verified** | Test suite is no worse than before |

### Phase 4 — File-per-C-Source Reorganization

Move functions to `.js` files matching their `.c` origin. No pass-through
wrappers — each function is defined once, in the file where others will import it,
with the same name used in C. See `docs/MODULES.md` for the full file list.

After Phase 3, all non-leaf modules can import each other freely without any
concern about circular initialization order. The five leaf files guarantee that
all constants and the `game` singleton are fully initialized before any function
body runs. Gameplay modules just import what they need, with no restrictions.

**Exit gate — before the final cleanup step:**

| | Status |
|-|--------|
| **Present** | Every gameplay function lives in a `.js` file named after its origin `.c` file; each function defined exactly once |
| **Complete** | No pass-through wrapper functions anywhere in the codebase; autotranslator targets correct files |
| **Deleted** | JS invented consolidation files (`combat.js`, `look.js`, `monutil.js`, `stackobj.js`, `player.js`, `discovery.js`, `options_menu.js`) once their contents are distributed |
| **Verified** | Test suite is no worse than before Phase 4 began |

### Final step — remove all remaining scaffolding

**Exit gate (done when all of the following are true):**

| | Status |
|-|--------|
| **Present** | Clean codebase with canonical C names everywhere |
| **Complete** | No `// TEMPORARY` comments remain; no `?? legacyField` fallback expressions; no shim objects |
| **Deleted** | `player.js`; `game.svc`; all legacy alias blocks; any remaining re-export pass-throughs |
| **Deleted** | `map.js` standalone ownership of level state; any temporary compatibility re-exports |
| **Verified** | Test suite is no worse than the start of the refactor |

## Complete game.* Field Reference

All C globals map to `game.fieldname` by stripping the `gX.`/`svX.` prefix.
Fields are grouped by their C source struct (which is just alphabetical
bucketing — the letter carries no meaning).

### gb — botl/general

| game.* | C source | Description |
|--------|----------|-------------|
| game.bhitpos | gb.bhitpos | coordinate where thrown/zapped object hits or stops |
| game.billobjs | gb.billobjs | objects not yet paid for (in shops) |
| game.blinit | gb.blinit | bottom line initialized |
| game.blstats | gb.blstats | bottom line status array |
| game.bl_hilite_moves | gb.bl_hilite_moves | moves timestamp for status hilite |
| game.bldrpush_oid | gb.bldrpush_oid | id of last boulder pushed |
| game.bldrpushtime | gb.bldrpushtime | turn a boulder-push message was given |
| game.bones | gb.bones | bones level data |
| game.bot_disabled | gb.bot_disabled | suppresses bottom-line refresh |
| game.bucx_filter | gb.bucx_filter | BUC-status filter for container operations |
| game.bughack | gb.bughack | lev_region hack for Baalz level insect legs |
| game.buzzer | gb.buzzer | monster initiating buzz()/zap/breath |

### gc — cmd/command

| game.* | C source | Description |
|--------|----------|-------------|
| game.Cmd | gc.Cmd | command flag structure |
| game.catmore | gc.catmore | external pager (from env or DEF_PAGER) |
| game.catname | gc.catname | cat pet name |
| game.clicklook_cc | gc.clicklook_cc | cursor coords for click-to-look |
| game.cmd_key | gc.cmd_key | current command key from parse()/rhack() |
| game.command_count | gc.command_count | command repeat count |
| game.command_queue | gc.command_queue | command queue |
| game.cond_hilites | gc.cond_hilites | condition highlights |
| game.condmenu_sortorder | gc.condmenu_sortorder | sort order for condition menu |
| game.coder | gc.coder | special level coder state |
| game.color_colorings | gc.color_colorings | alternate menu color set |
| game.core_invent_state | gc.core_invent_state | core inventory window state |
| game.corpsenm_digested | gc.corpsenm_digested | monster type currently being digested |
| game.current_container | gc.current_container | container currently being looted |
| game.current_wand | gc.current_wand | wand currently being applied/zapped |
| game.currentgraphics | gc.currentgraphics | current graphics mode |
| game.cvt_buf | gc.cvt_buf | conversion buffer |

### gd — do/door/decl

| game.* | C source | Description |
|--------|----------|-------------|
| game.defer_see_monsters | gd.defer_see_monsters | defer see_monsters() until level change done |
| game.dfr_pre_msg | gd.dfr_pre_msg | pline() to show before level change |
| game.dfr_post_msg | gd.dfr_post_msg | pline() to show after level change |
| game.did_dig_msg | gd.did_dig_msg | dig message was already shown |
| game.did_nothing_flag | gd.did_nothing_flag | augments no-rest-next-to-monster message |
| game.disintegested | gd.disintegested | monster was disintegested |
| game.dogname | gd.dogname | dog pet name |
| game.domove_attempting | gd.domove_attempting | flags for current move attempt |
| game.domove_succeeded | gd.domove_succeeded | flags for successful move |
| game.done_money | gd.done_money | gold spent this game |
| game.done_seq | gd.done_seq | counts deaths on the same hero_seq |
| game.doorindex | gd.doorindex | current door index |

### ge — eat/ext/mkmaze

| game.* | C source | Description |
|--------|----------|-------------|
| game.eatmbuf | ge.eatmbuf | set by cpostfx() during eating |
| game.ebubbles | ge.ebubbles | mkmaze bubble list |
| game.en_via_menu | ge.en_via_menu | extended command entered via menu |
| game.en_win | ge.en_win | extended command window |
| game.ext_tlist | ge.ext_tlist | extended command info for rhack() |

### gf — fruit/ftrap/rumors

| game.* | C source | Description |
|--------|----------|-------------|
| game.false_rumor_end | gf.false_rumor_end | false rumor end offset |
| game.false_rumor_size | gf.false_rumor_size | false rumor file size |
| game.false_rumor_start | gf.false_rumor_start | false rumor start offset |
| game.far_noise | gf.far_noise | heard a far noise this turn |
| game.ffruit | gf.ffruit | fruit list head |
| game.followmsg | gf.followmsg | last turn a follow message was shown |
| game.fqn_prefix | gf.fqn_prefix | fully qualified name prefix array |
| game.ftrap | gf.ftrap | current trap being processed |

### gg — graphics buffer/dog goal

| game.* | C source | Description |
|--------|----------|-------------|
| game.gamelog | gg.gamelog | pline.c game log |
| game.gbuf | gg.gbuf | display graphics buffer [ROWNO][COLNO] |
| game.gbuf_start | gg.gbuf_start | per-row graphics buffer start |
| game.gbuf_stop | gg.gbuf_stop | per-row graphics buffer stop |
| game.gems | gg.gems | gem value table |
| game.glyphmap_perlevel_flags | gg.glyphmap_perlevel_flags | per-level glyph mapping flags |
| game.gtyp | gg.gtyp | dog goal type |
| game.gx | gg.gx | dog goal x coordinate |
| game.gy | gg.gy | dog goal y coordinate |

### gh — hero seq/names

| game.* | C source | Description |
|--------|----------|-------------|
| game.hackdir | gh.hackdir | path to rumors, help, record files |
| game.hero_seq | gh.hero_seq | moves*8+n, counts hero moves within a turn |
| game.hitmsg_mid | gh.hitmsg_mid | monster id for pending hit message |
| game.hitmsg_prev | gh.hitmsg_prev | previous attack for pending hit message |
| game.hname | gh.hname | game executable name (argv[0]) |
| game.horsename | gh.horsename | horse pet name |

### gi — inventory/in_mklev/in_doagain

| game.* | C source | Description |
|--------|----------|-------------|
| game.id_map | gi.id_map | restore.c id mapping |
| game.in_doagain | gi.in_doagain | currently replaying last command |
| game.in_mk_themerooms | gi.in_mk_themerooms | currently making theme rooms |
| game.in_mklev | gi.in_mklev | currently generating a level |
| game.in_steed_dismounting | gi.in_steed_dismounting | currently dismounting steed |
| game.initial_don | gi.initial_don | starting equipment auto-worn at new game |
| game.invent | gi.invent | hero's inventory chain (head of obj list) |
| game.invbuf | gi.invbuf | inventory display buffer |
| game.itermonarr | gi.itermonarr | temp array of all monsters on current level |

### gj

| game.* | C source | Description |
|--------|----------|-------------|
| game.jumping_is_magic | gj.jumping_is_magic | current jump was magical |

### gk — kicked/known

| game.* | C source | Description |
|--------|----------|-------------|
| game.kickedloc | gk.kickedloc | location hero just kicked |
| game.kickedobj | gk.kickedobj | object in flight after kick |
| game.known | gk.known | read.c known flag |

### gl — light/lock/launchplace

| game.* | C source | Description |
|--------|----------|-------------|
| game.last_command_count | gl.last_command_count | previous command count |
| game.last_hider | gl.last_hider | m_id of hiding monster last seen |
| game.launchplace | gl.launchplace | projectile launch position info |
| game.lastinvnr | gl.lastinvnr | last inventory number 0-51 |
| game.lev_message | gl.lev_message | special level message |
| game.light_base | gl.light_base | head of light source list |
| game.loot_reset_justpicked | gl.loot_reset_justpicked | loot just-picked reset flag |
| game.loosechain | gl.loosechain | track uchain during save/restore |
| game.looseball | gl.looseball | track uball during save/restore |
| game.lregions | gl.lregions | level region array |
| game.luacore | gl.luacore | lua_State* |

### gm — multi/monster/migrating/menu

| game.* | C source | Description |
|--------|----------|-------------|
| game.m | gm.m | musable monster info |
| game.m_shot | gm.m_shot | multishot info (fired volleys) |
| game.m_using | gm.m_using | monster using mondied instead of killed |
| game.made_branch | gm.made_branch | branch was created during level gen |
| game.maploc | gm.maploc | current map location pointer |
| game.marcher | gm.marcher | monster doing the shooting |
| game.max_regions | gm.max_regions | maximum region count |
| game.mentioned_water | gm.mentioned_water | water_damage() already issued water message |
| game.menu_colorings | gm.menu_colorings | menu color rules |
| game.mesg_given | gm.mesg_given | for m_throw()/thitu() miss message |
| game.migrating_mons | gm.migrating_mons | monsters moving to another level |
| game.migrating_objs | gm.migrating_objs | objects moving to another level |
| game.mkcorpstat_norevive | gm.mkcorpstat_norevive | prevent troll revival |
| game.mrank_sz | gm.mrank_sz | loaded by max_rank_sz() |
| game.mrg_to_wielded | gm.mrg_to_wielded | picked weapon merged with wielded |
| game.mswallower | gm.mswallower | monster swallowing a gas spore |
| game.mtarget | gm.mtarget | monster being targeted by another |
| game.multi | gm.multi | moves remaining in multi-move command |
| game.multi_reason | gm.multi_reason | why multi is nonzero |
| game.mydogs | gm.mydogs | pets that followed hero between levels |

### gn — nomovemsg/nesting

| game.* | C source | Description |
|--------|----------|-------------|
| game.nesting | gn.nesting | display nesting level |
| game.noisetime | gn.noisetime | turn of last noise |
| game.nomovemsg | gn.nomovemsg | message to show instead of moving |
| game.notonhead | gn.notonhead | for long worm head/segment tracking |
| game.nsubroom | gn.nsubroom | number of subrooms |
| game.num_lregions | gn.num_lregions | number of level regions |
| game.nowhere | gn.nowhere | empty room struct (for "nowhere" refs) |

### go — occupation/objects/options

| game.* | C source | Description |
|--------|----------|-------------|
| game.objs_deleted | go.objs_deleted | recently deleted objects |
| game.occupation | go.occupation | current occupation function pointer |
| game.occtxt | go.occtxt | text description of current occupation |
| game.occtime | go.occtime | time spent in occupation |
| game.oclass_prob_totals | go.oclass_prob_totals | probability totals per object class |
| game.oracle_flg | go.oracle_flg | oracle init state: -1=don't use, 0=need init, 1=done |
| game.otg_otmp | go.otg_otmp | obj for obj_is_piletop() |
| game.override_confirmation | go.override_confirmation | Stormbringer malice flag |
| game.obj_zapped | go.obj_zapped | object was zapped |
| game.oldcap | go.oldcap | last encumbrance level |
| game.oldfruit | go.oldfruit | previous fruit |
| game.occupants | go.occupants | occupant entities array |

### gp — polearm/plname/prayer/pet

| game.* | C source | Description |
|--------|----------|-------------|
| game.p_aligntyp | gp.p_aligntyp | prayer alignment type |
| game.p_trouble | gp.p_trouble | prayer trouble type |
| game.p_type | gp.p_type | prayer goodness: -1=really naughty .. 3=really good |
| game.petname_used | gp.petname_used | preferred pet name has been used |
| game.pl_race | gp.pl_race | character's race letter |
| game.pline_flags | gp.pline_flags | pline() formatting flags |
| game.polearm_range_max | gp.polearm_range_max | max reach of polearm |
| game.polearm_range_min | gp.polearm_range_min | min reach of polearm |
| game.poly_zapped | gp.poly_zapped | polymorph was zapped |
| game.potion_nothing | gp.potion_nothing | count of potions with no effect |
| game.potion_unkn | gp.potion_unkn | count of unknown potions |
| game.preferred_pet | gp.preferred_pet | preferred starting pet: 'c','d', or 'n' |
| game.prevmsg | gp.prevmsg | previous pline message |
| game.primary_syms | gp.primary_syms | primary display symbols |
| game.propellor | gp.propellor | propellor weapon |

### gr — rogue/regions/rip

| game.* | C source | Description |
|--------|----------|-------------|
| game.ransacked | gr.ransacked | mkmaze ransacked flag |
| game.regions | gr.regions | region array |
| game.rfilter | gr.rfilter | role/race/gender/align filter |
| game.rip | gr.rip | RIP display text |
| game.rogue_syms | gr.rogue_syms | rogue display symbols |

### gs — stairs/stoned/subrooms/symset

| game.* | C source | Description |
|--------|----------|-------------|
| game.saving_grace_turn | gs.saving_grace_turn | saving grace triggered this turn |
| game.sell_how | gs.sell_how | sell mode |
| game.sell_response | gs.sell_response | auto-response for "sell foo?" |
| game.showsyms | gs.showsyms | currently displayed symbols |
| game.skipdrin | gs.skipdrin | mind flayer vs headless target flag |
| game.smeq | gs.smeq | smeq array for room merging |
| game.somebody_can_move | gs.somebody_can_move | someone can move this turn |
| game.sortlootmode | gs.sortlootmode | sort mode set by sortloot() |
| game.spec_dbon_applies | gs.spec_dbon_applies | coordinate spec_dbon with artifact_hit messages |
| game.spl_orderindx | gs.spl_orderindx | spell book order index |
| game.spl_sortmode | gs.spl_sortmode | spell sort mode |
| game.stairs | gs.stairs | stairway list head |
| game.stealoid | gs.stealoid | object being stolen |
| game.stealmid | gs.stealmid | monster doing the stealing |
| game.stoned | gs.stoned | cockatrice-hit flag for monsters |
| game.subrooms | gs.subrooms | subroom array |
| game.symset | gs.symset | loaded symbol sets |

### gt — trap/toplines/thrown/timers

| game.* | C source | Description |
|--------|----------|-------------|
| game.tbx / game.tby | gt.tbx/tby | mthrowu target x/y |
| game.thrownobj | gt.thrownobj | object in flight after throw |
| game.timer_base | gt.timer_base | ordered timer list head |
| game.tmp_anything | gt.tmp_anything | temporary anything storage |
| game.toplines | gt.toplines | top-of-screen message buffer |
| game.trapinfo | gt.trapinfo | trap info struct |
| game.trapx / game.trapy | gt.trapx/trapy | trap coordinates |
| game.travelmap | gt.travelmap | travel path selection map |
| game.true_rumor_end | gt.true_rumor_end | true rumor end offset |
| game.true_rumor_size | gt.true_rumor_size | true rumor file size |
| game.true_rumor_start | gt.true_rumor_start | true rumor start offset |
| game.twohits | gt.twohits | 0=single hit, 1=first of pair, 2=second |

### gu — urole/urace/unweapon

| game.* | C source | Description |
|--------|----------|-------------|
| game.uhp_at_start_of_monster_turn | gu.uhp_at_start_of_monster_turn | hero HP at monster turn start (for death detection) |
| game.unweapon | gu.unweapon | using an unweapon (hands/hooves/etc.) |
| game.update_all | gu.update_all | update all status lines |
| game.urace | gu.urace | hero's race struct |
| game.urole | gu.urole | hero's role struct |

### gv — vision/visibility/vault

| game.* | C source | Description |
|--------|----------|-------------|
| game.vamp_rise_msg | gv.vamp_rise_msg | vampire rise message shown this turn |
| game.vault_x / game.vault_y | gv.vault_x/vault_y | vault guard coordinates |
| game.vis | gv.vis | current visibility flag |
| game.vision_full_recalc | gv.vision_full_recalc | needs full vision recalculation |
| game.viz_array | gv.viz_array | visibility array (cansee/couldsee macros) |

### gw — warn/wail/were

| game.* | C source | Description |
|--------|----------|-------------|
| game.wailmsg | gw.wailmsg | turn of last wail message |
| game.warn_obj_cnt | gw.warn_obj_cnt | count of monsters meeting warning criteria |
| game.warnsyms | gw.warnsyms | current warning display symbols |
| game.wasinwater | gw.wasinwater | hero was in water last turn |
| game.wc | gw.wc | current weight capacity |
| game.were_changes | gw.were_changes | were-creature change count |
| game.wizkit | gw.wizkit | wizard kit item list |
| game.wportal | gw.wportal | water portal trap |

### gx — x_maze/xname

| game.* | C source | Description |
|--------|----------|-------------|
| game.x_maze_max | gx.x_maze_max | maze x boundary |
| game.xnamep | gx.xnamep | xname() return buffer pointer |
| game.xstart / game.xsize | gx.xstart/xsize | special level x start/size |

### gy — youmonst/you_buf

| game.* | C source | Description |
|--------|----------|-------------|
| game.y_maze_max | gy.y_maze_max | maze y boundary |
| game.youmonst | gy.youmonst | hero as a monster struct (struct monst) |
| game.you_buf | gy.you_buf | work buffer for You(), verbalize() |
| game.ystart / game.ysize | gy.ystart/ysize | special level y start/size |

### gz — zombify/zap

| game.* | C source | Description |
|--------|----------|-------------|
| game.zap_oseen | gz.zap_oseen | wand zapped at player flag |
| game.zombify | gz.zombify | zombify flag |

---

### Saved-state structs (svX → game.*)

| game.* (target) | current/legacy JS | C source | Description |
|-----------------|-------------------|----------|-------------|
| game.bases | — | svb.bases | first object index per class (see initObjectData) |
| game.branches | — | svb.branches | dungeon branch list |
| game.context | `game.svc.context` | svc.context | Context: run, nopick, travel, forcefight, etc. |
| game.disco | — | svd.disco | discoveries array |
| game.doors | — | svd.doors | door location array |
| game.dungeon_topology | — | svd.dungeon_topology | dungeon topology |
| game.dungeons | — | svd.dungeons | dungeon array (initialized by init_dungeon) |
| game.hackpid | — | svh.hackpid | current process id |
| game.killer | — | svk.killer | killer info → KInfo |
| game.lastseentyp | — | svl.lastseentyp | last seen dungeon type per cell |
| game.level | — | svl.level | current dungeon level (dlevel_t) |
| game.level_info | — | svl.level_info | level info array |
| game.mapseenchn | — | svm.mapseenchn | dungeon overview (for ^ command) |
| game.moves | `game.turnCount` | svm.moves | turn counter |
| game.mvitals | — | svm.mvitals | monster vitals (kills/genocides) → Mvitals[] |
| game.n_dgns | — | svn.n_dgns | number of dungeons |
| game.n_regions | — | svn.n_regions | number of regions |
| game.nroom | — | svn.nroom | number of rooms on current level |
| game.omoves | — | svo.omoves | level timestamp |
| game.oracle_cnt | — | svo.oracle_cnt | oracle count |
| game.pl_character | — | svp.pl_character | character class name |
| game.pl_fruit | — | svp.pl_fruit | player's fruit name |
| game.plname | `player.name` | svp.plname | player name |
| game.quest_status | — | svq.quest_status | quest score → QScore |
| game.rooms | — | svr.rooms | room array → MkRoom[] |
| game.sp_levchn | — | svs.sp_levchn | special level chain |
| game.spl_book | `player.spells` | svs.spl_book | spell book → Spell[] |
| game.timer_id | — | svt.timer_id | timer id counter |
| game.tune | — | svt.tune | castle drawbridge tune |
| game.xmin / game.xmax | — | svx.xmin/xmax | level x boundaries |
| game.ymin / game.ymax | — | svy.ymin/ymax | level y boundaries |

---

### u.* (struct you) → game.u.*

The hero struct maps to `game.u.*` sub-object (Option B — see naming convention
note above). Ported C functions can do `const u = game.u;` at the top.

The `player.*` column shows the current legacy JS names (old `Player` class):

| game.u.* (target) | current/legacy JS | C source | Description |
|-------------------|-------------------|----------|-------------|
| game.u.ux / game.u.uy | player.x / player.y | u.ux/uy | hero's map coordinates |
| game.u.dx / game.u.dy / game.u.dz | — | u.dx/dy/dz | direction delta of current move |
| game.u.tx / game.u.ty | — | u.tx/ty | travel destination |
| game.u.ux0 / game.u.uy0 | — | u.ux0/uy0 | previous hero coordinates |
| game.u.uz | — | u.uz | hero's current dungeon level (d_level) |
| game.u.utolev | — | u.utolev | level monster teleported hero to |
| game.u.utotype | — | u.utotype | goto_level() flags for utolev |
| game.u.ucamefrom | — | u.ucamefrom | level hero came from (tutorial use) |
| game.u.umoved | player.moved | u.umoved | hero changed map location this turn |
| game.u.ulevel | player.level | u.ulevel | hero's experience level (1–30) |
| game.u.ulevelmax | — | u.ulevelmax | highest level reached (can decrease) |
| game.u.ulevelpeak | — | u.ulevelpeak | peak level (never decreases) |
| game.u.utrap | — | u.utrap | trap timeout |
| game.u.utraptype | — | u.utraptype | type of trap hero is stuck in |
| game.u.urooms | — | u.urooms | rooms hero currently occupies |
| game.u.ushops | — | u.ushops | shops hero currently occupies |
| game.u.uhunger | player.hunger | u.uhunger | hunger points |
| game.u.uhs | — | u.uhs | hunger state (SATIATED … STARVING) |
| game.u.uprops | player.uprops | u.uprops | intrinsic/extrinsic properties → Prop[] |
| game.u.umconf | — | u.umconf | confusion timeout |
| game.u.usick_type | player.usick_type | u.usick_type | illness type flags |
| game.u.umonster | — | u.umonster | hero's "real" monster index (when poly'd) |
| game.u.umonnum | — | u.umonnum | hero's current monster index |
| game.u.mh / game.u.mhmax | — | u.mh/mhmax | HP when polymorphed |
| game.u.ulycn | — | u.ulycn | lycanthrope type |
| game.u.uswldtim | — | u.uswldtim | turns swallowed |
| game.u.uswallow | — | u.uswallow | currently swallowed |
| game.u.uinwater | — | u.uinwater | currently underwater |
| game.u.uinvulnerable | — | u.uinvulnerable | invulnerable (praying) |
| game.u.uburied | — | u.uburied | buried |
| game.u.udg_cnt | — | u.udg_cnt | turns as demigod |
| game.u.uevent | — | u.uevent | milestone events → UEvent struct |
| game.u.uhave | — | u.uhave | special objects carried → UHave struct |
| game.u.uconduct | — | u.uconduct | conduct tracking → UConduct struct |
| game.u.acurr | player.attributes[] | u.acurr | current attributes → Attribs struct |
| game.u.abon | — | u.abon | attribute bonuses → Attribs struct |
| game.u.amax | — | u.amax | max attributes → Attribs struct |
| game.u.atemp | — | u.atemp | temporary attribute adjustments → Attribs struct |
| game.u.atime | — | u.atime | countdown for temp adjustments → Attribs struct |
| game.u.ualign | player.alignment (type only) | u.ualign | hero's alignment → Align struct |
| game.u.uluck | player.uluck | u.uluck | luck |
| game.u.moreluck | player.moreluck | u.moreluck | luck bonus |
| game.u.uhitinc | — | u.uhitinc | to-hit increment |
| game.u.udaminc | — | u.udaminc | damage increment |
| game.u.uac | player.ac | u.uac | armor class (lower is better) |
| game.u.uhp / game.u.uhpmax | player.hp / player.hpmax | u.uhp/uhpmax | hit points / max HP |
| game.u.uen / game.u.uenmax | player.pw / player.pwmax | u.uen/uenmax | spell energy / max energy |
| game.u.ugangr | — | u.ugangr | gods angry at hero |
| game.u.ugifts | — | u.ugifts | number of artifacts bestowed |
| game.u.uexp / game.u.urexp | player.exp | u.uexp/urexp | XP for leveling / score XP |
| game.u.umortality | — | u.umortality | number of times died |
| game.u.weapon_skills | player.weaponSkills | u.weapon_skills | weapon skills → Skills[] |
| game.u.twoweap | — | u.twoweap | two-weapon combat active |
| game.u.umovement | player.umovement | u.umovement | movement points |
| game.u.uachieved | — | u.uachieved | achievement list |
| game.u.ustuck | — | u.ustuck | engulfer or grabber monster |
| game.u.usteed | — | u.usteed | steed being ridden |
| game.u.ugallop | — | u.ugallop | turns steed runs after kick |
| game.u.uinvault | — | u.uinvault | hero is in a vault |
| game.u.usleep | — | u.usleep | sleeping (move count when last started) |
| game.u.ucleansed | — | u.ucleansed | move count when cleansed |

---

## Struct Types and Class Names

Every `game.*` field whose type is a struct stays nested. Here is the complete list
of struct-typed fields with their proposed JS class name and all canonical C subfields.

### `game.context` — class `Context` (struct context_info)

Top-level scalar fields. Legacy access is via `game.svc.context.*` (the
`game.context` alias maps to the same object):

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `ident` | — | unsigned | social security number counter for monsters |
| `no_of_wizards` | — | unsigned | 0, 1, or 2 (wizard + shadow) |
| `run` | `game.svc.context.run` | unsigned | 0=h/walk, 1=H/run, 2-7=fast/tunnel, 8=travel |
| `startingpet_mid` | — | unsigned | monster id of initial pet |
| `current_fruit` | — | int | fid matching svp.pl_fruit[] |
| `mysteryforce` | — | int | how often "mysterious force" triggers |
| `rndencode` | — | int | randomized escape sequence introducer |
| `startingpet_typ` | — | int | monster type for initial pet |
| `warnlevel` | — | int | digit threshold to warn about unseen monsters |
| `next_attrib_check` | — | long | next attribute check turn |
| `seer_turn` | `game.seerTurn` | long | next random clairvoyance turn |
| `snickersnee_turn` | — | long | last Snickersnee distance attack turn |
| `stethoscope_seq` | — | long | last stethoscope use turn |
| `travel` | `game.svc.context.travel` | boolean | traveling to tx,ty automatically |
| `travel1` | — | boolean | first travel step |
| `forcefight` | `game.svc.context.forcefight` | boolean | force fight mode |
| `nopick` | `game.svc.context.nopick` | boolean | no autopickup (while running) |
| `made_amulet` | — | boolean | the Amulet has been generated |
| `mon_moving` | — | boolean | monsters' turn to move |
| `move` | — | boolean | a move is happening |
| `mv` | — | boolean | hero movement (vs. other actions) |
| `bypasses` | — | boolean | bypass flag set on at least one object |
| `door_opened` | — | boolean | door was opened during test_move |
| `resume_wish` | — | boolean | game exited during wish prompt |
| `tips[]` | — | boolean[NUM_TIPS] | help hints shown (TIP_ENHANCE, TIP_SWIM, etc.) |
| `jingle` | — | char[6] | castle drawbridge tune (also in game.tune) |

Nested sub-structs:

#### `game.context.digging` — class `DigInfo` (struct dig_info)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `effort` | — | int | dig effort expended |
| `level` | — | d_level | level being dug |
| `pos` | — | coord | position being dug |
| `lastdigtime` | — | long | last turn we dug |
| `down` | — | boolean | digging downward |
| `chew` | — | boolean | digging by eating (xorn etc.) |
| `warned` | — | boolean | warned about shouting |
| `quiet` | — | boolean | quiet dig (no messages) |

#### `game.context.victual` — class `VictualInfo` (struct victual_info)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `piece` | — | obj* | food being eaten (null if tin) |
| `o_id` | — | unsigned | obj id for save/restore |
| `usedtime` | — | int | turns spent eating so far |
| `reqtime` | — | int | turns required to eat |
| `nmod` | — | int | coded nutrition per turn |
| `canchoke` | — | bit | was satiated at start |
| `fullwarn` | — | bit | warned about being full |
| `eating` | — | bit | currently eating |
| `doreset` | — | bit | stop eating at end of turn |

#### `game.context.engraving` — class `EngraveInfo` (struct engrave_info)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `text` | — | char[BUFSZ] | text being engraved |
| `nextc` | — | char* | next character to engrave |
| `stylus` | — | obj* | object doing the writing |
| `type` | — | xint8 | engraving type (DUST, MARK, ENGRAVE, etc.) |
| `pos` | — | coord | map location |
| `actionct` | — | int | nth turn spent engraving |

#### `game.context.tin` — class `TinInfo` (struct tin_info)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `tin` | — | obj* | tin being opened |
| `o_id` | — | unsigned | obj id for save/restore |
| `usedtime` | — | int | turns spent so far |
| `reqtime` | — | int | turns required |

#### `game.context.spbook` — class `BookInfo` (struct book_info)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `book` | — | obj* | spell book being read |
| `o_id` | — | unsigned | obj id for save/restore |
| `delay` | — | schar | moves remaining for this spell |

#### `game.context.takeoff` — class `TakeoffInfo` (struct takeoff_info)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `mask` | — | long | item slots being removed |
| `what` | — | long | which item is being removed |
| `delay` | — | int | turns remaining |
| `cancelled_don` | — | boolean | don was cancelled |
| `disrobing` | — | char[CONTEXTVERBSZ+1] | verb for message |

#### `game.context.warntype` — class `WarntypeInfo` (struct warntype_info)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `obj` | — | unsigned long | M2 bits for object warn_of_mon |
| `polyd` | — | unsigned long | M2 bits from polymorph |
| `species` | — | permonst* | specific poly'd-into species |
| `speciesidx` | — | short | mons[] index for save/restore |

#### `game.context.polearm` — class `PolearmInfo` (struct polearm_info)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `hitmon` | — | monst* | monster we tried to hit last |
| `m_id` | — | unsigned | monster id for save/restore |

#### `game.context.objsplit` — class `ObjSplit` (struct obj_split)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `parent_oid` | — | unsigned | parent object id |
| `child_oid` | — | unsigned | child object id |

#### `game.context.tribute` — class `TributeInfo` (struct tribute_info)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `tributesz` | — | size_t | struct size for forward-compat skipping |
| `enabled` | — | boolean | tributes feature on |
| `bookstock` | — | bit | book has been stocked |
| `Deathnotice` | — | bit | Death noticed the book |

#### `game.context.novel` — class `NovelTracking` (struct novel_tracking)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `id` | — | unsigned | novel oid from prior passage selection |
| `count` | — | int | available passage count in pasg[] |
| `pasg` | — | xint8[30] | passage indices for random selection |

#### `game.context.achieveo` — class `AchievementTracking` (struct achievement_tracking)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `mines_prize_oid` | — | unsigned | luckstone o_id |
| `soko_prize_oid` | — | unsigned | sokoban prize o_id |
| `castle_prize_old` | — | unsigned | castle prize o_id |
| `mines_prize_otyp` | — | short | luckstone otyp |
| `soko_prize_otyp` | — | short | bag/amulet otyp |
| `castle_prize_otyp` | — | short | strange object otyp |
| `minetn_reached` | — | boolean | Minetown reached (avoid redundant check) |

#### `game.context.lifelist` — class `Lifelists` (struct lifelists)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `total_seen_upclose` | — | long | critters seen up close |
| `total_photographed` | — | long | critters photographed (tourists) |

---

### `game.flags` — class `Flag` (struct flag)

Saved with game. All options/mode flags. `game.flags` is already the JS name
(same as C); subfield names are also the same. Key legacy aliases:

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `acoustics` | `game.flags.acoustics` ✓ | boolean | dungeon sound messages |
| `autodig` | `game.flags.autodig` ✓ | boolean | automatically dig |
| `autoquiver` | `game.flags.autoquiver` ✓ | boolean | auto-fill quiver |
| `autoopen` | `game.flags.autoopen` ✓ | boolean | open doors by walking into them |
| `beginner` | `game.flags.beginner` ✓ | boolean | early-game simplified feedback |
| `bones` | `game.flags.bones` ✓ | boolean | allow saving/loading bones files |
| `confirm` | `game.flags.confirm` ✓ | boolean | confirm before hitting tame monsters |
| `dark_room` | `game.flags.dark_room` ✓ | boolean | show shadows in lit rooms |
| `debug` | `game.wizard` (alias) | boolean | wizard/debug mode (`#define wizard flags.debug`) |
| `explore` | `game.flags.explore` ✓ | boolean | explore mode (`#define discover flags.explore`) |
| `female` | `player.gender === 1` | boolean | character is female |
| `friday13` | — | boolean | it's Friday the 13th |
| `goldX` | — | boolean | gold BUC filtering: X or U |
| `help` | — | boolean | look up items in data file |
| `tips` | — | boolean | show helpful hints |
| `tutorial` | — | boolean | ask about tutorial level |
| `implicit_uncursed` | — | boolean | omit "uncursed" in inventory |
| `invlet_constant` | — | boolean | items keep their inventory letters |
| `legacy` | — | boolean | print game entry story |
| `lit_corridor` | — | boolean | dark corridor shown lit if in sight |
| `mention_decor` | — | boolean | feedback for furniture |
| `mention_walls` | — | boolean | feedback when bumping walls |
| `nap` | — | boolean | timed display delays |
| `nopick_dropped` | — | boolean | dropped items may be autopicked |
| `pickup` | — | boolean | pick up or move-and-look |
| `pickup_stolen` | — | boolean | auto-pickup stolen items |
| `pickup_thrown` | — | boolean | auto-pickup thrown items |
| `pushweapon` | — | boolean | push old weapon to off-hand on wield |
| `quick_farsight` | — | boolean | disable map browsing during clairvoyance |
| `rest_on_space` | — | boolean | space means rest |
| `safe_dog` | — | boolean | complete protection for pet |
| `safe_wait` | — | boolean | prevent wait/search next to hostile |
| `showexp` | `player.showExp` | boolean | show experience points |
| `showscore` | `player.showScore` | boolean | show score |
| `showvers` | — | boolean | show version on status line |
| `silent` | — | boolean | no bell sound |
| `sortpack` | — | boolean | sorted inventory |
| `sparkle` | — | boolean | show "resisting" special effects |
| `standout` | — | boolean | standout for --More-- |
| `time` | `player.showTime` | boolean | display elapsed time |
| `tombstone` | — | boolean | print tombstone |
| `verbose` | `game.flags.verbose` ✓ | boolean | maximum battle info |
| `end_top` | — | int | top N scores to list |
| `end_around` | — | int | N scores around player's score |
| `autounlock` | — | unsigned | locked door/chest action bitmask |
| `moonphase` | — | unsigned | current moon phase |
| `suppress_alert` | — | unsigned long | version number last alerted |
| `paranoia_bits` | — | unsigned | alternate confirmation prompts bitmask |
| `versinfo` | — | unsigned | version display mask (VI_NUMBER, VI_NAME, VI_BRANCH) |
| `pickup_burden` | — | int | max burden before pickup prompt |
| `pile_limit` | — | int | feedback threshold when walking over objects |
| `discosort` | — | char | discovery sort order: o/s/c/a |
| `sortloot` | — | char | loot sort: n=none, l=loot, f=full |
| `vanq_sortmode` | — | uchar | vanquished monsters sort order 0-7 |
| `inv_order` | — | char[MAXOCLASSES] | inventory display order |
| `pickup_types` | — | char[MAXOCLASSES] | which types to auto-pickup |
| `end_disclose` | — | char[7] | disclose on exit: i,a,v,g,c,o |
| `menu_style` | — | char | UI menu style |
| `made_fruit` | — | boolean | don't easily overflow fruit limit |
| `initrole` | `player.roleIndex` | int | starting role index (startup only) |
| `initrace` | `player.race` | int | starting race index (startup only) |
| `initgend` | `player.gender` | int | starting gender index (startup only) |
| `initalign` | — | int | starting alignment index (startup only) |
| `randomall` | — | int | randomly assign everything not specified |
| `pantheon` | — | int | deity selection for priest |
| `lootabc` | — | boolean | use a/b/c rather than o/i/b for loot |
| `showrace` | — | boolean | show hero glyph by race |
| `travelcmd` | — | boolean | allow travel command |
| `runmode` | — | int | screen update frequency during run |

---

### `game.youmonst` — class `Monst` (struct monst)

A `struct monst` used as a handle when passing the hero to combat/monster
functions that take `struct monst*`. It is **not** a mirror of `game.u` —
it holds a different, complementary slice of hero state:

- `youmonst.mx` is **always 0** (position is never stored here; use `u.ux/uy`)
- `youmonst.mhp` is **not used** for hero HP (use `u.uhp`)
- `youmonst.m_id` is always 1 (sentinel; never a real monster id)

`youmonst` is a **form cache** rebuilt by `set_uasmon()` whenever the hero's
form changes (polymorph, lycanthropy, game start, save restore). It holds:

- `data` → `&mons[u.umonnum]` — current species permonst (attacks, resists, size)
- `cham` — shapeshifter original form index
- `m_ap_type`, `mappearance` — hero disguise state
- Status flag bits: `mcan`, `minvis`, `mconf`, `mstun`, `mblinded`, etc.

`set_uasmon()` also propagates species-derived intrinsics into `u.uprops[]`
(e.g. fire resistance from being polymorphed into a fire giant).

No continuous synchronization between `youmonst` and `u` is needed or done.
In JS, `game.youmonst` needs a `set_uasmon()` call on polymorph/lycanthropy/
restore, but not otherwise. It is a form descriptor, not a position or HP mirror.

`struct monst` is also the type for every live monster on the level (the `nmon`
chain). Most `youmonst.*` fields have no current JS equivalent:

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `nmon` | — | monst* | next monster in level's monster list |
| `data` | — | permonst* | pointer into mons[] species data |
| `m_id` | — | unsigned | unique monster id |
| `mnum` | — | short | permanent mons[] index |
| `cham` | — | short | if shapeshifter, original mons[] index |
| `movement` | `player.speed` (approx) | short | movement points (speed + effects) |
| `m_lev` | — | uchar | adjusted difficulty level |
| `malign` | — | aligntyp | alignment relative to player |
| `mx, my` | `player.x, player.y` | coordxy | current map position (same as game.ux/uy) |
| `mux, muy` | — | coordxy | where monster thinks hero is |
| `mtrack[4]` | — | coord | recent positions (migration data) |
| `mhp, mhpmax` | `player.hp, player.hpmax` | int | current / max hit points (same as game.uhp/uhpmax) |
| `mappearance` | — | unsigned | mimic/wiz disguise glyph |
| `m_ap_type` | — | uchar | what mappearance describes |
| `mtame` | — | schar | tameness level (implies peaceful) |
| `mintrinsics` | — | unsigned short | intrinsic resistances |
| `mextrinsics` | — | unsigned short | extrinsic resistances |
| `seen_resistance` | — | unsigned long | M_SEEN_x bits |
| `mspec_used` | — | int | special ability cooldown |
| `female` | — | bit | is female |
| `minvis` | — | bit | currently invisible |
| `mcan` | — | bit | has been cancelled |
| `mburied` | — | bit | has been buried |
| `mundetected` | — | bit | hiding but not yet seen |
| `mcansee` | — | bit | can see |
| `mspeed` | — | 2 bits | current speed (MSLOW/MNORM/MFAST) |
| `permspeed` | — | 2 bits | intrinsic speed |
| `mflee` | — | bit | fleeing |
| `mfleetim` | — | 7 bits | flee timeout |
| `msleeping` | — | bit | asleep |
| `mblinded` | — | 7 bits | temp blind turns |
| `mstun` | — | bit | stunned |
| `mfrozen` | — | 7 bits | paralysis turns |
| `mcanmove` | — | bit | can move (not paralyzed) |
| `mconf` | — | bit | confused |
| `mpeaceful` | — | bit | does not attack unprovoked |
| `mtrapped` | — | bit | trapped in pit/web/bear trap |
| `mleashed` | — | bit | on a leash |
| `isshk` | — | bit | is shopkeeper |
| `isgd` | — | bit | is guard |
| `ispriest` | — | bit | is aligned priest |
| `iswiz` | — | bit | is Wizard of Yendor |
| `wormno` | — | 5 bits | worm segment index (0 = not a worm) |
| `mstrategy` | — | unsigned long | monster AI strategy flags |
| `mgoal` | — | coord | monster's movement goal |
| `minvent` | — | obj* | monster's inventory |
| `mw` | — | obj* | monster's wielded weapon |
| `misc_worn_check` | — | long | worn item check bitmask |
| `mextra` | — | mextra* | extended monster data (shop/priest/etc.) |

---

### `game.killer` — class `KInfo` (struct kinfo)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `next` | — | kinfo* | next killer in chain |
| `id` | — | int | killer identifier |
| `format` | — | int | KILLED_BY / KILLED_BY_AN / etc. |
| `name` | — | char[BUFSZ] | killer name string |

---

### `game.launchplace` — class `LaunchPlace` (struct launchplace)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `obj` | — | obj* | projectile being launched |
| `x, y` | — | coordxy | launch origin coordinates |

---

### `game.m_shot` — class `Multishot` (struct multishot)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `n` | — | int | total shots in volley |
| `i` | — | int | current shot index |
| `o` | — | short | otyp of projectile |
| `s` | — | boolean | display "n shots" message |

---

### `game.m` — class `Musable` (struct musable)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `offensive` | — | obj* | best offensive item monster can use |
| `defensive` | — | obj* | best defensive item |
| `misc` | — | obj* | best miscellaneous item |
| `has_offense` | — | int | type/count of offensive options |
| `has_defense` | — | int | type/count of defensive options |
| `has_misc` | — | int | type/count of misc options |

---

### `game.u.ualign` — class `Align` (struct align)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `type` | `player.alignment` | aligntyp | A_LAWFUL / A_NEUTRAL / A_CHAOTIC |
| `record` | `player.alignmentRecord` | int | alignment record (positive = good standing) |
| `abuse` | `player.alignmentAbuse` | int | abuse count (deferred penalty) |

---

### `game.u.acurr` / `game.u.abon` / `game.u.amax` / `game.u.atemp` / `game.u.atime` — class `Attribs` (struct attribs)

`acurr` = current values, `abon` = bonuses, `amax` = maximums,
`atemp` = temporary adjustments, `atime` = countdown for temp adjustments.

The legacy `player.attributes[]` array holds only `acurr.a[]`. The others (`abon`,
`amax`, `atemp`, `atime`) have no current JS equivalents and must be added.

| C field | current/legacy JS (acurr only) | type | description |
|---------|-------------------------------|------|-------------|
| `a[A_STR]` | `player.attributes[0]` | xint8 | strength |
| `a[A_DEX]` | `player.attributes[1]` | xint8 | dexterity |
| `a[A_CON]` | `player.attributes[2]` | xint8 | constitution |
| `a[A_INT]` | `player.attributes[3]` | xint8 | intelligence |
| `a[A_WIS]` | `player.attributes[4]` | xint8 | wisdom |
| `a[A_CHA]` | `player.attributes[5]` | xint8 | charisma |

---

### `game.u.uevent` — class `UEvent` (struct u_event)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `minor_oracle` | — | bit | received cheap oracle |
| `major_oracle` | — | bit | received expensive oracle |
| `read_tribute` | — | bit | read a novel passage |
| `qcalled` | — | bit | called by Quest leader |
| `qexpelled` | — | bit | expelled from Quest dungeon |
| `qcompleted` | — | bit | completed Quest |
| `uheard_tune` | — | 2 bits | 1=know about, 2=heard tune, 3=bridge destroyed |
| `uopened_dbridge` | — | bit | opened the drawbridge |
| `invoked` | — | bit | invoked Gate at Sanctum |
| `gehennom_entered` | — | bit | entered Gehennom via Valley |
| `udemigod` | — | bit | killed the Wizard |
| `uvibrated` | — | bit | stood on vibrating square |
| `ascended` | — | bit | ascended |
| `amulet_wish` | — | bit | wished for the Amulet |

---

### `game.u.uhave` — class `UHave` (struct u_have)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `amulet` | — | bit | carrying Amulet of Yendor |
| `bell` | — | bit | carrying Bell of Opening |
| `book` | — | bit | carrying Book of the Dead |
| `menorah` | — | bit | carrying Candelabrum of Invocation |
| `questart` | — | bit | carrying the Quest Artifact |

---

### `game.u.uconduct` — class `UConduct` (struct u_conduct)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `unvegetarian` | — | long | times ate meat |
| `unvegan` | — | long | times ate animal products |
| `food` | — | long | times ate any food |
| `gnostic` | — | long | times prayed/sacrificed/etc. |
| `weaphit` | — | long | times hit with weapon |
| `killer` | — | long | monsters killed |
| `literate` | — | long | times read something |
| `polypiles` | — | long | times polypiled |
| `polyselfs` | — | long | times polymorphed self |
| `wishes` | — | long | wishes made |
| `wisharti` | — | long | artifact wishes |
| `sokocheat` | — | long | sokoban cheats |
| `pets` | — | long | pets owned |

---

### `game.u.uroleplay` — class `URoleplay` (struct u_roleplay)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `blind` | — | boolean | started blind |
| `nudist` | — | boolean | nudist conduct |
| `deaf` | — | boolean | started deaf |
| `pauper` | — | boolean | started without gold |
| `reroll` | — | boolean | rerolled stats |
| `numbones` | — | short | bones files loaded count |
| `numrerolls` | — | short | stat reroll count |

---

### `game.quest_status` — class `QScore` (struct q_score)

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `first_start` | — | boolean | first time starting Quest branch |
| `met_leader` | — | boolean | met Quest leader |
| `not_ready` | — | boolean | leader said not ready |
| `pissed_off` | — | boolean | leader is angry |
| `got_quest` | — | boolean | received quest task |
| `killed_leader` | — | boolean | killed quest leader |
| `got_final` | — | boolean | got the final quest item |
| `made_goal` | — | boolean | reached the goal level |
| `met_nemesis` | — | boolean | met the nemesis |
| `killed_nemesis` | — | boolean | killed the nemesis |
| `cheater` | — | boolean | used illegal means |
| `touched_artifact` | — | boolean | touched the Quest artifact |
| `offered_artifact` | — | boolean | offered artifact on high altar |
| `got_thanks` | — | boolean | received leader's thanks |
| `leader_m_id` | — | unsigned | leader's monster id |

---

### `game.dungeons[]` — class `Dungeon` (struct dungeon)

Array of all dungeons (branches). `game.n_dgns` is the count.

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `dname` | — | char[] | dungeon name |
| `proto` | — | char[] | prototype level file prefix |
| `boneid` | — | char | bones file level letter |
| `flags` | — | d_flags | dungeon flags (hellish, mazelike, etc.) |
| `entry_lev` | — | xint8 | level number of entry point |
| `num_dunlevs` | — | xint8 | number of levels in this dungeon |
| `dunlev_ureached` | — | xint8 | deepest level reached |
| `ledger_start` | — | schar | starting ledger number |
| `depth_start` | — | schar | depth of top level |

---

### `game.level` — canonical level-state structure (`game.js` owner)

`game.level` represents the C level-state aggregate (`svl.level` plus related
level arrays/collections). Constructors/helpers now live in `game.js` as the
canonical ownership module for level container state.

| C source | JS field | Description |
|----------|----------|-------------|
| `svl.level.locations[COLNO][ROWNO]` | `game.level.locations[x][y]` | per-tile data (struct rm) |
| `svr.rooms[]` | `game.level.rooms[]` | room array for current level |
| `svd.doors[]` | `game.level.doors[]` | door data array |
| `svl.level` flags | `game.level.flags` | level-wide boolean flags |
| `level.monsters` / fmon chain | `game.level.monsters[]` | monsters on level |
| `level.objects` / fobj chain | `game.level.objects[]` | objects on level |
| `level.traps` / ftrap chain | `game.level.traps[]` | traps on level |
| `level.engravings` | `game.level.engravings[]` | engravings on level |

**Note on consolidation:** In C, `svr.rooms`, `svd.doors`, and `svl.level` are
separate saved-state globals. JS may aggregate these during transition, but end
state should keep names/shapes that are translator-friendly and C-faithful.

**Location tile fields** (each `game.level.locations[x][y]`, mirrors `struct rm`
from `rm.h`):

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `typ` | — | levl_typ | terrain type (STONE, ROOM, CORR, DOOR…) |
| `seenv` | — | uchar | seen-from-direction bitmask |
| `flags` | — | uchar | door state, altar alignment, etc. |
| `lit` | — | bool | currently lit |
| `waslit` | — | bool | was ever lit |
| `roomno` | — | uchar | room number (0 = not in a room) |
| `edge` | — | bool | on the edge of a room |
| `mem_bg` | — | uchar | remembered background glyph |
| `mem_trap` | — | uchar | remembered trap type |
| `mem_obj` | — | ushort | remembered object type |
| `mem_obj_color` | — | uchar | remembered object color |
| `mem_invis` | — | bool | remembered invisible monster |
| `horizontal` | — | bool | wall orientation (JS extension of C bitfield) |
| `nondiggable` | — | bool | W_NONDIGGABLE set |
| `drawbridgemask` | — | uchar | drawbridge direction + terrain-under bits |

**`map.js` and the refactor:** migration is complete.
1. `makeRoom` and `FILL_*` now live in `mkroom.js`.
2. `makeLocation` and level container constructor now live in `game.js`.
3. Runtime importers (`dungeon.js`, `mklev.js`, `sp_lev.js`, `storage.js`,
   `chargen.js`, `extralev.js`) now import from canonical owners.
4. `map.js` is deleted with no compatibility re-export shim.

---

### `game.rooms[]` — class `MkRoom` (struct mkroom)

Array of rooms on current level. `game.nroom` is the count.
In JS these live inside `game.level.rooms[]`; `game.rooms` may be an alias.

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `lx, hx` | — | schar | left/right x boundaries |
| `ly, hy` | — | schar | top/bottom y boundaries |
| `rtype` | — | schar | room type (OROOM, SHOPBASE, etc.) |
| `orig_rtype` | — | schar | original room type before transforms |
| `rlit` | — | schar | room is lit |
| `needfill` | — | schar | needs to be filled |
| `needjoining` | — | schar | needs to be joined to corridors |
| `doorct` | — | schar | number of doors |
| `fdoor` | — | schar | index of first door in doors[] |
| `nsubrooms` | — | schar | number of subrooms |
| `irregular` | — | boolean | not rectangular |
| `roomnoidx` | — | schar | room number index |
| `sbrooms[MAX_SUBROOMS]` | — | schar[] | subroom indices |
| `resident` | — | monst* | shopkeeper/priest resident |

---

### `game.mvitals[]` — class `Mvitals` (struct mvitals)

Array indexed by mons[] index. Tracks kill/genocide stats.

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `born` | — | uchar | total ever created |
| `died` | — | uchar | total ever killed |
| `mvflags` | — | uchar | MV_GENOCIDE, MV_EXTINCT, etc. |
| `seen_close` | — | bit | hero has seen this species up close |
| `photographed` | — | bit | hero has photographed this species |

---

### `game.spl_book[]` — class `Spell` (struct spell)

Array of known spells. Length is `MAXSPELL`.

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `sp_id` | — | short | spell type (SPE_* constant) |
| `sp_lev` | — | xint8 | spell level (1-7) |
| `sp_know` | — | int | knowledge/retention (decreases with casting) |

---

### `game.u.uprops[]` — class `Prop` (struct prop)

Array indexed by property constant (FIRE_RES, INVIS, etc.).

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `extrinsic` | — | long | worn/carried item bits granting this property |
| `blocked` | — | long | bits blocking this property |
| `intrinsic` | — | long | intrinsic timeout or permanent flag |

---

### `game.u.weapon_skills[]` — class `Skills` (struct skills)

Array indexed by P_* weapon skill constants.

| C field | current/legacy JS | type | description |
|---------|-------------------|------|-------------|
| `skill` | — | xint8 | current skill level (P_UNSKILLED .. P_GRAND_MASTER) |
| `max_skill` | — | xint8 | maximum achievable skill level for this role |
| `advance` | — | unsigned short | XP points toward next skill level |

---

## Static Table Classes

These are the **species/type definition** tables — auto-generated, never modified
during gameplay. Live instances (`struct monst`, `struct obj`) carry a pointer or
index into these tables for species/type data.

### `Permonst` — monster species definition (struct permonst, `mons[]`)

Lives in `monsters.js` as the exported `mons` array. Each entry is one monster
species. `struct monst` instances reference it via `monst.data`.

| C field | current JS (monsters.js) | type | description |
|---------|--------------------------|------|-------------|
| `pmnames[NUM_MGENDERS]` | `name` | const char*[] | name strings by gender (m/f/n) |
| `pmidx` | — (implied by index) | enum monnums | PM_ identifier / mons[] index |
| `mlet` | `symbol` | char | display symbol (S_ANT, S_BLOB, …) |
| `mlevel` | `level` | schar | base monster level |
| `mmove` | `speed` | schar | movement speed |
| `ac` | `ac` ✓ | schar | base armor class |
| `mr` | `mr` ✓ | schar | base magic resistance % |
| `maligntyp` | `align` | aligntyp | basic alignment (A_LAWFUL etc.) |
| `geno` | `geno` ✓ | unsigned short | creation/genocide mask |
| `mattk[NATTK]` | `attacks` | struct attack[] | attack matrix (up to 6 attacks) |
| `cwt` | `weight` | unsigned short | corpse weight |
| `cnutrit` | `nutrition` | unsigned short | corpse nutritional value |
| `msound` | `sound` | uchar | sound type (MS_BUZZ, MS_SILENT, …) |
| `msize` | `size` | uchar | physical size (MZ_TINY … MZ_GIGANTIC) |
| `mresists` | `mr1` | uchar | resistances (MR_FIRE, MR_ELEC, …) |
| `mconveys` | `mr2` | uchar | intrinsics conveyed by eating |
| `mflags1` | `flags1` | unsigned long | boolean flags set 1 (M1_*) |
| `mflags2` | `flags2` | unsigned long | boolean flags set 2 (M2_*) |
| `mflags3` | `flags3` | unsigned short | boolean flags set 3 (M3_*) |
| `difficulty` | `difficulty` ✓ | uchar | toughness rating (for difficulty checks) |
| `mcolor` | `color` | uchar | display color |

**Field name fixes needed** (see also MODULES.md):

| current JS | → target JS | C field | note |
|------------|-------------|---------|------|
| `name` | `pmnames` | `pmnames[]` | JS uses string; C is array by gender |
| `symbol` | `mlet` | `mlet` | single char, not a symbol constant |
| `level` | `mlevel` | `mlevel` | base level; separate from `difficulty` |
| `speed` | `mmove` | `mmove` | movement points per turn |
| `align` | `maligntyp` | `maligntyp` | alignment type constant |
| `attacks` | `mattk` | `mattk[NATTK]` | fixed-length attack array |
| `weight` | `cwt` | `cwt` | corpse weight (not monster weight) |
| `nutrition` | `cnutrit` | `cnutrit` | corpse nutrition |
| `sound` | `msound` | `msound` | sound enum |
| `size` | `msize` | `msize` | size enum |
| `mr1` | `mresists` | `mresists` | resistance bitmask |
| `mr2` | `mconveys` | `mconveys` | conveyed intrinsics bitmask |
| `flags1` | `mflags1` | `mflags1` | M1_* flags |
| `flags2` | `mflags2` | `mflags2` | M2_* flags |
| `flags3` | `mflags3` | `mflags3` | M3_* flags |
| `color` | `mcolor` | `mcolor` | color constant |

### `Attack` sub-struct — `struct attack` (within `mattk[]`)

Already uses canonical C names in the generated `monsters.js`. The legacy JS
aliases (from `attack_fields.js`) need to be removed from call sites:

| C field | current JS | legacy JS aliases | description |
|---------|------------|-------------------|-------------|
| `aatyp` | `aatyp` ✓ | `.at`, `.type` | attack type (AT_BITE, AT_CLAW, …) |
| `adtyp` | `adtyp` ✓ | `.damage`, `.ad` | damage type (AD_PHYS, AD_FIRE, …) |
| `damn` | `damn` ✓ | `.dice` | number of damage dice |
| `damd` | `damd` ✓ | `.sides` | sides per damage die |

---

### `ObjClass` — object type definition (struct objclass, `objects[]`)

Lives in `objects.js` as the exported `objects` array. Each entry is one object
type. `struct obj` instances reference the type by `obj.otyp` (index into `objects[]`).

Note: `oc_name` and `oc_descr` are not direct fields of `struct objclass` — they
are indexed into a separate `struct objdescr` table. The JS generator inlines them
as `name` and `desc` for convenience.

| C field | current JS (objects.js) | type | description |
|---------|-------------------------|------|-------------|
| `oc_name_idx` → `objdescr.oc_name` | `name` | const char* | actual object name |
| `oc_descr_idx` → `objdescr.oc_descr` | `desc` | const char* | appearance when unidentified |
| `oc_uname` | — | char* | user's "call" name (runtime, not in table) |
| `oc_name_known` | `known` | bit | type identified (name known) |
| `oc_merge` | — | bit | merge equal objects |
| `oc_uses_known` | — | bit | obj.known affects description |
| `oc_encountered` | — | bit | hero has seen this type |
| `oc_magic` | — | bit | inherently magical |
| `oc_charged` | — | bit | may have charges |
| `oc_unique` | — | bit | one-of-a-kind object |
| `oc_nowish` | `no_wish` | bit | cannot be wished for |
| `oc_big` / `oc_bimanual` / `oc_bulky` | — | bit | large/two-handed/bulky |
| `oc_tough` | — | bit | hard (gems, rings) |
| `oc_dir` | `dir` | 3 bits | zap direction / weapon strike mode |
| `oc_material` | `material` | 5 bits | material type (IRON, WOOD, GOLD, …) |
| `oc_subtyp` / `oc_skill` / `oc_armcat` | `sub` | schar | weapon skill / armor category |
| `oc_oprop` | `prop` | uchar | property conveyed (INVIS, FIRE_RES, …) |
| `oc_class` | `oc_class` ✓ | char | object class (WEAPON_CLASS, ARMOR_CLASS, …) |
| `oc_delay` | `delay` ✓ | schar | delay when using this object |
| `oc_color` | `color` ✓ | uchar | display color |
| `oc_prob` | `prob` ✓ | short | generation probability |
| `oc_weight` | `weight` ✓ | unsigned short | weight in centigrams |
| `oc_cost` | `cost` ✓ | short | base shop cost |
| `oc_wsdam` | `sdam` | schar | max small-monster weapon damage |
| `oc_wldam` | `ldam` | schar | max large-monster weapon damage |
| `oc_oc1` / `oc_hitbon` / `a_ac` | `oc1` | schar | weapon to-hit bonus / armor AC |
| `oc_oc2` / `a_can` / `oc_level` | `oc2` | schar | armor cancel / spellbook level |
| `oc_nutrition` | `nutrition` ✓ | unsigned short | food value |

**Field name fixes needed:**

| current JS | → target JS | C field | note |
|------------|-------------|---------|------|
| `name` | `oc_name` | `objdescr.oc_name` | inlined from objdescr |
| `desc` | `oc_descr` | `objdescr.oc_descr` | inlined from objdescr |
| `known` | `oc_name_known` | `oc_name_known` | type-identification flag |
| `no_wish` | `oc_nowish` | `oc_nowish` | cannot wish for this |
| `dir` | `oc_dir` | `oc_dir` | zap/strike direction |
| `material` | `oc_material` | `oc_material` | material type |
| `sub` | `oc_subtyp` | `oc_subtyp` | skill/armor category |
| `prop` | `oc_oprop` | `oc_oprop` | conveyed property |
| `sdam` | `oc_wsdam` | `oc_wsdam` | small monster damage |
| `ldam` | `oc_wldam` | `oc_wldam` | large monster damage |
| `oc1` | `oc_oc1` | `oc_oc1` | hit bonus / armor class (aliased) |
| `oc2` | `oc_oc2` | `oc_oc2` | armor cancel / book level (aliased) |
| `symbol` | — | not in objclass | computed from `oc_class` at runtime |

---

## What NOT to do

- Don't keep the `gX.` nesting in JS — it's a C artifact with no value in JS.
- Don't create a complex field-alias map in state_paths.json — simple prefix
  stripping is sufficient.
- Don't do a big-bang migration — migrate module by module as functions are ported.
- Don't solve circular deps by combining modules — keep modules focused; fix
  cycles by extracting shared leaf modules instead.
