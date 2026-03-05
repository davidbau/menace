# C-Faithful State Refactor Plan

## Goal

Make the JS runtime state match NetHack C global variable names directly, so that
C functions can be ported with near-1:1 structure and the autotranslate tool can
emit working code without a complex field-mapping layer.

## The C Global Variable System

NetHack 3.7 refactored all C globals into 26 structs (`ga` through `gz`) plus
saved-game structs (`sva` through `svy`), plus `flags`, `iflags`, `svc.context`.
The struct letter is **purely alphabetical bucketing by first letter of the
variable name** — it carries no semantic meaning. `gf.ftrap` is just `ftrap`,
`gb.bhitpos` is just `bhitpos`, `gy.youmonst` is just `youmonst`.

## JS Naming Convention

Strip the `gX.` / `svX.` mechanical prefix. Everything lives on `game`:

| C | JS |
|---|---|
| `gf.ftrap` | `game.ftrap` |
| `gb.bhitpos` | `game.bhitpos` |
| `gy.youmonst` | `game.youmonst` |
| `gm.multi` | `game.multi` |
| `gn.nomovemsg` | `game.nomovemsg` |
| `gl.launchplace` | `game.launchplace` |
| `gi.invent` | `game.invent` |
| `gv.vision_full_recalc` | `game.vision_full_recalc` |
| `svm.moves` | `game.moves` |
| `svl.level` | `game.level` |
| `svc.context` | `game.context` |
| `svd.dungeons` | `game.dungeons` |
| `u.ux` | `game.ux` |
| `u.utrap` | `game.utrap` |
| `flags.verbose` | `game.flags.verbose` |

The `u.*` hero struct fields likewise flatten onto `game.*`. The hero-as-monster
struct `gy.youmonst` becomes `game.youmonst`; its fields (`youmonst.mx` etc.)
stay as sub-fields.

The old `player` object and `map` object are **compatibility aliases** during
migration. Core new code reads/writes `game.*` directly.

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
{ "c": "u.",  "js": "game.", "requires_params": ["game"] }
```

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

Move shared constants (trap types, symbol values, etc.) into modules that import
**nothing** from the game engine. These become the roots of the import DAG.

Already done:
- `config.js` — monster/object/armor constants
- `trap.js` now exports `TT_*` constants (but also imports from `hack.js`, `vision.js` — that's the problem)

Needed: extract constants from modules that participate in cycles. For example,
`TT_*` constants should live in a zero-dependency `constants.js` or `trapconst.js`
so that `vision.js`, `hack.js`, `trap.js`, `insight.js` etc. all import from
there without creating cycles.

### Fix: game object as the shared root

Rather than passing `game`, `player`, `map` as function parameters (which
requires importing the types from somewhere), treat `game` as a well-known
singleton initialized before any module function runs. Modules import `game`
from a single `game.js` bootstrap module that itself imports nothing from
gameplay modules.

This breaks the cycle pattern: instead of `A imports from B imports from A`,
both `A` and `B` import `game` from the same zero-dep root.

### Fix: deferred imports for unavoidable cycles

Where a cycle is truly unavoidable (two modules need each other's functions),
use a lazy function-level import or a registration pattern rather than a
top-level `import` statement.

## Migration Order

1. **Extract constants** — move `TT_*`, terrain symbols, and other pure constants
   into zero-dependency modules. Fixes the most import-order bugs cheaply.

2. **Define game object shape** — write `game.js` that creates and exports the
   canonical `game` singleton with all fields initialized to C defaults.

3. **Add state_paths.json rewrites** — enable autotranslate to emit `game.*`
   references directly.

4. **Migrate field by field** — for each C global used in a function being
   ported, ensure `game.fieldname` exists and is initialized. No need to migrate
   everything at once; do it function-by-function as translation proceeds.

5. **Retire player/map as separate objects** — once core modules read `game.*`,
   make `player` and `map` aliases (`game.player = game.youmonst`, etc.) and
   eventually remove the aliases.

## What NOT to do

- Don't keep the `gX.` nesting in JS — it's a C artifact with no value in JS.
- Don't create a complex field-alias map in state_paths.json — simple prefix
  stripping is sufficient.
- Don't do a big-bang migration — migrate module by module as functions are ported.
- Don't solve circular deps by combining modules — keep modules focused; fix
  cycles by extracting shared leaf modules instead.
