# Architecture & Design

> *"You enter a vast hall of interconnected modules. The architecture is elegant,
> if somewhat maze-like."*

**See also:**
[DEVELOPMENT.md](DEVELOPMENT.md) (dev workflow) |
[DECISIONS.md](DECISIONS.md) (trade-offs) |
[LORE.md](LORE.md) (porting lessons) |
[MODULES.md](MODULES.md) (module dependency rules)

---

## Overview

Mazes of Menace (Royal Jelly) is a faithful JavaScript port of NetHack 3.7,
playable in any modern browser — no build step, no WebAssembly, no binary blobs.
Every game behavior is hand-ported readable JavaScript that mirrors the C source
logic, with `// C ref: file.c function()` comments linking each function to its
counterpart. The goal is a codebase that can be read alongside the C source, not
a transpilation.

---

## How NetHack Is Structured

> *"You read the C source. It reads like a novel written over thirty-eight years by
> seventy authors who never met."*

Understanding the C we're porting is half the battle. NetHack 3.7 is approximately
420,000 lines of C, C headers, and Lua across ~300 source files and ~8,600
functions.

### The C game loop

The top-level loop in `allmain.c`:

```c
void moveloop(boolean resuming) {
    moveloop_preamble(resuming);      // setup, restore, display init
    for (;;) {
        moveloop_core();              // one player turn
    }
}
```

Inside `moveloop_core()`:
1. **Monster movement** — `mon_move()` advances every monster on the level
2. **Display update** — `vision_recalc()`, `botl_update()`, message flush
3. **Player command** — `rhack()` reads a keystroke, dispatches to `docmd()`,
   which calls `dodo()` — the 200-line command dispatch table
4. **Turn accounting** — `moves++`, hunger, timeout, exercise checks

The loop is **synchronous and blocking** in C. `nhgetch()` stops the process until
a key arrives. This is the single most consequential structural fact for the JS port.

### SYNCLOCK Execution Contract (Current Architecture)

To preserve C-faithful single-thread command ordering in an async JS runtime, the
port uses SYNCLOCK guardrails:

1. Command execution tokens:
   `run_command()` opens/closes a command execution token (`exec_guard.js`).
2. Typed suspension classes only:
   gameplay waits are categorized as `input`, `more`, or `anim` via `suspend.js`.
3. Boundary ownership stack:
   input boundaries are explicit owners (`prompt`, `more`, etc.) via
   `withInputBoundary()/clearInputBoundary()/peekInputBoundary()` in `allmain.js`.
4. Message `--More--` ownership:
   display/headless set pending state and register owner=`more` boundaries;
   command loop consumes dismissal keys through boundary ownership.

Practical effect:
- no raw gameplay `await nhgetch()` sites;
- no direct `display.morePrompt(nhgetch)` callbacks in gameplay modules;
- boundary violations are observable through diagnostics events.

### Major C subsystems

| Subsystem | Key C files | What it does |
|-----------|-------------|-------------|
| Game loop | `allmain.c`, `hack.c`, `cmd.c` | Input dispatch, turn cycle, time management |
| Dungeon gen | `mklev.c`, `mkroom.c`, `mkmaze.c`, `sp_lev.c` | Level layout, rooms, corridors, special levels |
| Special levels | `dat/*.lua`, `sp_lev.c`, `nhlua.c` | 132 hand-designed levels as Lua scripts |
| Vision/FOV | `vision.c` | Algorithm C raycasting for field of view |
| Monster AI | `monmove.c`, `dog.c`, `dogmove.c` | Pathfinding, fleeing, pet behavior |
| Combat | `uhitm.c`, `mhitu.c`, `mhitm.c` | Hero-hits-monster, monster-hits-hero, monster-hits-monster |
| Objects | `mkobj.c`, `pickup.c`, `invent.c`, `apply.c` | Item creation, picking up, using |
| Magic | `spell.c`, `zap.c`, `potion.c`, `read.c` | Spells, wand beams, potions, scrolls |
| Traps | `trap.c` | All trap types (arrow, pit, teleport, ...) |
| Display | `win/tty/*.c`, `drawing.c` | The pluggable windowing layer |
| Persistence | `save.c`, `restore.c`, `bones.c` | Save/restore, bones files |
| Data | `monsters.h`, `objects.h`, `artilist.h` | Static game data (macro-defined tables) |

### The windowing abstraction

NetHack's display code is pluggable through a `window_procs` struct in `wintype.h`.
All game code calls functions like `win_print_glyph()`, `win_putstr()`,
`win_nhgetch()`, `win_yn_function()` — which dispatch through a runtime function
pointer table to the active backend (tty, curses, X11, Qt, or shim/WASM). This
abstraction was built to allow ports, and we exploit it: our JS `Display` class
implements exactly these primitives.

### Static data tables

The three large data tables are defined entirely via C macros:

- **`monsters.h`** (~4,000 lines) — 383 monster types via `MON(NAM(...), S_ANT, LVL(...), ...)`
- **`objects.h`** (~1,700 lines) — 478 object types via `WEPTOOL(...)`, `ARMOR(...)`, etc.
- **`artilist.h`** (~600 lines) — artifact definitions via `PHYS(...)`, `DRLI(...)`, etc.

These are not C code that runs — they are data initialization disguised as macro
calls. Python generators parse them and emit equivalent JS.

### Encrypted data files

NetHack's `makedefs` tool XOR-encrypts several data files:
- `dat/epitaph` — gravestone inscriptions
- `dat/engrave` — Elbereth and other engravings
- `dat/rumors` — in-game rumors and fortunes

The encryption uses a trivial self-inverse XOR cipher from `hacklib.c`. We embed
the encrypted data directly in JS modules and decrypt at load time using `hacklib.js`.

---

## JS Port Architecture

### Module structure

The port has **141 JavaScript modules** in `js/`. Each module corresponds to one
or more C source files, named to match (e.g. `uhitm.js` ↔ `uhitm.c`). The naming
policy exists so the autotranslator can target the right file directly.

Modules divide into two tiers:

**Leaf files** (no imports from gameplay modules; can be imported freely by anyone):

| File | What it contains |
|------|-----------------|
| `version.js` | `COMMIT_NUMBER` build artifact (git hook generated) |
| `const.js` | All hand-maintained capitalized constants: terrain, colors, attributes, directions, trap types, alignment, etc. |
| `objects.js` | 478 object definitions (generated from `objects.h`) |
| `monsters.js` | 383 monster definitions (generated from `monsters.h`) |
| `artifacts.js` | Artifact definitions and `ART_*`/`SPFX_*` constants (generated from `artilist.h`) |
| `symbols.js` | Glyph/symbol constants derived from `display.h`; imports from the generated leaf files |
| `game.js` | `game` singleton + all struct class definitions (`struct rm`, `struct mkroom`, etc.) |
| `engrave_data.js`, `epitaph_data.js`, `rumor_data.js` | Encrypted string blobs |
| `storage.js` | `DEFAULT_FLAGS`, `OPTION_DEFS` config data |

**Rule:** Only leaf files export capitalized constants. All other files export
functions only. This means gameplay files may have arbitrary circular imports
between themselves without any constant initialization risk.

**Gameplay files** (141 total minus the leaf files above) — these implement the
actual game logic, each corresponding to a C source file. They freely import
from leaf files and from each other.

### Why circular imports are safe

> *"You feel a circular dependency. It does not bind you."*

ESM (ES6 modules) resolves import bindings **lazily at call time**, not at module
parse time. When module A imports a function from module B, and module B imports
from module A, JavaScript installs a live binding — a reference that resolves to
the actual value when it is first *called*, not when the module is first loaded.

This means: **circular imports between gameplay modules are safe** as long as they
only import functions (not values computed at module top level). By the time any
function is actually called, all modules have finished their top-level init.

The one exception: **constant values** resolved at module top level (e.g.
`export const X = importedValue + 1`). If module A's init uses a value from
module B, and module B hasn't finished loading yet, X gets `undefined`. This is
why all exported constants live in leaf files — files with no circular deps.

Gameplay files with circular imports (e.g. `hack.js ↔ vision.js ↔ trap.js`) are
explicitly allowed and work correctly. The leaf file architecture ensures no
constant ever relies on a circular chain.

### Global state: `game.*`

> *"You feel the weight of hundreds of global variables. They are neatly organized."*

The C code uses hundreds of global variables declared in `decl.c`/`decl.h`. In JS,
these become fields on a single `game` object, accessed via `gstate.js`:

```javascript
// gstate.js — the entire file
export let game = null;
export function setGame(g) { game = g; }
```

All game modules do `import { game } from './gstate.js'` and access state through
`game.*`. The reference is set once at startup by `allmain.js` before the game loop
starts. The simplicity is intentional — no registry, no DI, just one object.

Key groups on `game`:

| JS path | C equivalent | Contents |
|---------|-------------|---------|
| `game.u` | `struct you u` | Player: HP, AC, alignment, stats, intrinsics, hunger, inventory chain head |
| `game.level` | `svl.level` + `svr.rooms[]` + `svd.doors[]` | Current level: `locations[x][y]` map, rooms, doors, stairs, flags |
| `game.flags` | `struct flag flags` | Game flags: verbose, confirm, tombstone, etc. |
| `game.context` | `struct context_info context` | Turn context: running, resting, occupied movement |
| `game.svc` | `struct statedata svc` | Persistent save-compatible game variables |
| `game.moves` | `moves` | Turn counter |
| `game.fmon` | `fmon` | Monster linked list head for current level |
| `game.invent` | `invent` | Player inventory linked list head |
| `game.youmonst` | `youmonst` | Player-as-monster struct (for polymorph) |
| `game.display` | display object | The `Display` instance |

The map is `game.level`, a `GameMap` instance. Each cell is a location object:

```javascript
// makeLocation() in game.js — mirrors struct rm from rm.h
{
  typ,          // terrain type: STONE, VWALL, HWALL, ROOM, CORR, DOOR, ...
  seenv,        // bitmask: which directions this cell has been seen from
  flags,        // door state (D_LOCKED, D_TRAPPED), altar alignment, etc.
  lit, waslit,  // current and permanent lighting
  roomno,       // which room this cell belongs to (0 = no room)
  edge,         // true if this is a room boundary cell
  glyph,        // what's currently displayed here
  horizontal,   // wall orientation hint for corridor walls
  mem_bg, mem_trap, mem_obj, mem_obj_color, mem_invis,  // player's memory of cell
  nondiggable, drawbridgemask   // special terrain flags
}
```

`GameMap` also holds:
- `rooms[]` / `nroom` — room descriptors (C: `svr.rooms[]`)
- `doors[]` / `doorindex` — door descriptors (C: `svd.doors[]`)
- `upstair`, `dnstair` — stair coordinates
- `smeq[]` — same-equivalent groups for room graph connectivity
- `flags` — level metadata: `has_shop`, `has_vault`, `is_maze_lev`, `nommap`, and ~22 more
- Level entity lists accessed through `game.fmon`, `game.ftrap`, etc.

**Evolution note:** Early code used `player.js` with its own namespace and
`set*Context()` / `register*()` wiring calls to inject dependencies at init time.
All of that has been replaced by the `gstate.js` pattern — ESM live bindings
mean modules can reference `game` freely without explicit wiring, because the
binding resolves at call time, not import time.

### The async game loop

> *"You await input. The Promise resolves."*

The C game loop blocks on `nhgetch()`. JavaScript in the browser cannot block the
main thread. The solution is **async/await with a Promise-based input queue**:

```javascript
// C version (allmain.c):
void moveloop(boolean resuming) {
    moveloop_preamble(resuming);
    for (;;) {
        moveloop_core();      // blocks until key pressed
    }
}

// JS version (allmain.js):
async function moveloop(resuming) {
    moveloop_preamble(resuming);
    while (true) {
        await moveloop_core();  // awaits Promise from nhgetch()
    }
}
```

**Async infection:** Any function in the call chain from `moveloop_core` to a
function that reads input must be `async`. This propagates transitively:

```
moveloop_core → rhack → docmd → dodo → ... → getlin/yn_function/nhgetch
```

Every function in this chain is `async`. The rule is mechanical: if a function
`await`s anything (directly or transitively), it must be `async`. In practice
this means most game logic functions are async.

**What this does NOT change:** The sequential logic of the C code is completely
preserved. `await nhgetch()` reads exactly like `nhgetch()` in context. The
async/await boundary is invisible to the game logic — it just allows the browser
to remain responsive while waiting for input.

**Input queue:** Keyboard events push keycodes into a queue (`input.js`). `nhgetch()`
either dequeues immediately (if a key is waiting) or returns a Promise that resolves
when the next key arrives. Multi-step commands (running, searching) queue multiple
synthetic keypresses.

### Display architecture

> *"The walls of the room are covered in `<span>` tags."*

The display is a `<pre>` element containing an 80×24 grid of character positions,
each a `<span>` with CSS classes for the 16 NetHack colors (`clr-red`, `clr-green`,
etc.) and attributes (bold, dim, inverse). This matches the TTY window port's
character-at-position model.

**Window types** (matching NetHack's `NHW_*` constants):
- `NHW_MESSAGE` — top row: the message line
- `NHW_MAP` — rows 1-21: the dungeon map
- `NHW_STATUS` — rows 22-23: HP, AC, experience, conditions
- `NHW_MENU` — popup overlays for menus, inventory, text paging

All four are rendered within the same 80×24 grid. Menus overlay the map.

**DEC line-drawing:** NetHack's walls and corridors use DEC Special Graphics
characters (box-drawing: ─│┌┐└┘├┤┬┴┼). We use Unicode box-drawing (U+2500 block)
which maps identically and renders correctly in all modern fonts.

**Cursor tracking:** The display tracks cursor position to one cell of accuracy,
matching the C TTY port. Parity tests compare cursor position step-by-step.

---

## C-to-JS Translation Strategy

> *"The autotranslator dreams of field names that match the C source."*

### Field names must match C

All struct fields use their C canonical names, not JS aliases. This matters because:
1. Ported functions look like the C source — you can read them side by side
2. The autotranslator can emit correct field accesses directly
3. Debugging is easier when JS and C name the same thing the same way

Key normalizations completed during Phase 2:

| JS alias (old) | C canonical | Struct |
|----------------|-------------|--------|
| `.at`, `.type` | `.aatyp` | `struct attack` |
| `.damage`, `.ad` | `.adtyp` | `struct attack` |
| `.dice` | `.damn` | `struct attack` |
| `.sides` | `.damd` | `struct attack` |
| `.speed` | `.mmove` | `struct permonst` |
| `.difficulty` | `.mlevel` | `struct permonst` |
| `.name` (on item) | `.oname` | `struct obj` |
| `oc_class` fields | `oc_name`, `oc_descr`, `oc_material`, ... | `struct objclass` |

### Macros → constants and helper functions

C `#define` constants become `export const` in `const.js`. C expression macros
that compute values — like `HARDGEM(n)` (gem hardness check) or `PHYS(a,b)` (attack
struct shorthand) — become small inline helper functions defined at the top of the
file that uses them, not exported:

```javascript
// In objects.js:
function HARDGEM(n) { return n >= 8 ? 1 : 0; }
function BITS(p1, p2, ...) { /* unpack bitfield args */ }

// In artifacts.js:
function PHYS(a, b) { return { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: a, damd: b }; }
function NO_ATTK() { return { aatyp: AT_NONE, adtyp: AD_NONE, damn: 0, damd: 0 }; }
```

The Python generators emit calls like `HARDGEM(9)` rather than pre-evaluated
literals, keeping the generated tables readable alongside the C source.

### Structs → plain objects and classes

Most C structs become plain JS objects. Struct fields are accessed directly as
properties. `struct rm` (map location) becomes an object with fields `typ`, `seenv`,
`flags`, `lit`, `glyph` — same names as C.

For structs that need methods or prototypal identity (monsters, objects, player),
we use ES6 classes — but with the C field names on instances.

### Linked lists

NetHack uses linked lists pervasively (monster list `fmon`, inventory `invent`,
object piles on map cells). These are preserved as JS linked lists using the same
`nobj`/`nextmon` chain field names. JS garbage collection handles deallocation.

### File-level correspondence

Each JS file corresponds to one or more C source files. The naming policy:
one JS file per C file, same base name. JS infrastructure that has no C counterpart
(async input system, browser display, replay infrastructure) lives in
platform-specific files with descriptive names (`input.js`, `browser_input.js`,
`render.js`, etc.).

C files not needed in JS (file I/O, memory allocation, Lua bindings, Unix mail,
crash reporting) are deliberately omitted. See MODULES.md for the complete list.

---

## Data and Code Generation

> *"You read a scroll of generate data. Your objects.js glows blue!"*

### Generated data tables

Three Python generators parse C headers and patch JS files between marker comments:

```bash
python3 scripts/generators/gen_monsters.py   # monsters.h → js/monsters.js
python3 scripts/generators/gen_objects.py    # objects.h  → js/objects.js
python3 scripts/generators/gen_artifacts.py  # artilist.h → js/artifacts.js
python3 scripts/generators/gen_constants.py  # various headers → js/const.js blocks
```

Each generator patches between `// AUTO-IMPORT-START` / `// AUTO-IMPORT-END`
markers, leaving the rest of the file (manually written functions and helpers)
untouched.

### Special level conversion: Lua → JS

NetHack 3.7 defines all 132 special levels in Lua scripts (`dat/*.lua`). Rather
than embedding a Lua interpreter, each script was converted directly to JavaScript:

```
-- Lua (Arc-fila.lua)               // JavaScript (js/levels/Arc-fila.js)
des.room({ type = "ordinary",       des.room({ type: "ordinary",
  x = 3, y = 3,                       x: 3, y: 3,
  contents = function()                contents: () => {
    des.monster()                        des.monster();
  end                                  }
})                                   });
```

The conversion is mechanical: Lua table syntax (`{key=val}`) becomes JS object
syntax (`{key:val}`), Lua functions become arrow functions or named functions, and
`math.random()` becomes `rn2()`. The `des.*` API that the Lua scripts call is
implemented in `sp_lev.js` — a JS port of `sp_lev.c`.

The Lua scripts use no metatables, coroutines, module system, or runtime code
generation — features that would require a real interpreter. The most complex files
use closures and geometric set operations (`selection` API in `sp_lev.js`).

### ISAAC64: bit-identical PRNG

The PRNG is a direct port of `isaac64.c` using JavaScript BigInt for 64-bit
unsigned arithmetic. Every arithmetic operation — mixing, bit shifting, modular
addition — is identical to the C source:

```javascript
// From isaac64.js — matches isaac64.c exactly
x[i] = (x[i] - x[(i + 4) & 7]) & MASK;
x[(i + 5) & 7] ^= x[(i + 7) & 7] >> BigInt(SHIFT[i]);
```

Seeding also matches: the 64-bit seed is converted to 8 little-endian bytes, same
as the C `sizeof(unsigned long)` layout on 64-bit Linux. Golden reference tests
verify 500 consecutive values for 4 seeds against a compiled C reference program.

### Encrypted data

`hacklib.js` ports `xcrypt()` from `hacklib.c` — a self-inverse XOR cipher applied
byte-by-byte with alternating key bits. The encrypted binary blobs from `dat/epitaph`,
`dat/engrave`, and `dat/rumors` are embedded directly as strings in the `*_data.js`
files and decrypted at startup.

---

## Testing and Parity Architecture

> *"You sense the presence of determinism. It feels reassuring."*

### Parity channels

The fundamental correctness check: run the same seed through C NetHack and through
the JS port, and compare on every observable channel:

| Channel | What it measures |
|---------|-----------------|
| **RNG** | ISAAC64 call sequence — value and consuming function, step by step |
| **Screen** | Full 80×24 character grid after each step |
| **Cursor** | Terminal cursor position after each step |
| **Events** | Logical game events (monster placed, item picked up, etc.) |
| **Mapdump** | `level.locations[x][y].typ` grid — terrain type at every cell |

All five channels are compared simultaneously. RNG divergence cascades into
everything else, so RNG is checked first.

### C harness and session capture

The C NetHack binary is patched (`test/comparison/c-harness/patches/`) to enable:
- Deterministic seeding via command-line argument
- PRNG call logging (value + caller file:line) at every `rn2()`/`rnd()`/`d()` call
- Map grid dumping to JSON after level generation
- Cursor position reporting after each display operation
- Midlog infrastructure for structured event emission

Python scripts (`run_session.py`, `rerecord.py`) drive the patched C binary
through recorded move sequences and capture all channel data into **session JSON
files** (`test/comparison/`).

### Session format V3

156 golden session files record C reference behavior. Session format V3:

```json
{
  "version": 3,
  "seed": 42,
  "source": "c",
  "regen": { "mode": "gameplay", "moves": ":hhlh..." },
  "options": { "name": "Wizard", "role": "Valkyrie", ... },
  "steps": [
    {
      "key": "h",
      "rng": ["rn2(12)=2 @ mon.c:1145", "^place[otyp,x,y]", ...],
      "screen": "...(ANSI-compressed 80x24 string)...",
      "typGrid": "||2:0,3,3:2,...(RLE terrain grid)...",
      "cursor": [col, row, 1]
    }
  ]
}
```

The **`rng` array** in each step is the richest channel — it interleaves three kinds of entries:
- RNG call entries: `"rn2(12)=2 @ mon.c:1145"` — value, range, and call site
- Midlog markers: `">makemon"` / `"<makemon"` — function entry/exit boundaries
- Event entries: `"^place[otyp,x,y]"`, `"^die[mndx@x,y]"`, `"^trap[type,x,y]"` — logical game events

The JS engine emits matching entries via `pushRngLogEntry()` in `rng.js`. When C and
JS RNG arrays differ, the first mismatch reveals exactly what happened and where.

The **`typGrid`** field is an RLE-encoded terrain map: rows separated by `|`, values
encoded as digits (0-9) or letters (a-z for 10-35), runs compressed as `count:value`.

### Test result tracking via git notes

Test results are stored as **git notes** on commits, not in the working tree. This
allows retroactive comparison: given any commit, you can fetch its test note and
see exactly which sessions passed and which failed at that point in history. The
pre-push hook runs sessions and attaches a note to every pushed commit.

### Current status

- **156 session tests**: 89 gameplay/interface/chargen + 62 map + 5 pending
- **~2,500 unit tests**: 170 test files covering individual subsystems
- **E2E browser tests**: Puppeteer tests for UI and full game loop

---

## Architectural Refactoring History

> *"You recall the long campaign. The dungeon has changed."*

The codebase has gone through four architectural refactoring phases, all
completed during early Phase 2 (Feb 2026). These are structural cleanups, not
project phases — see [PROJECT_PLAN.md](../PROJECT_PLAN.md) for the overall
project timeline.

**Refactor 1 — Leaf header architecture.** Established the leaf file rule.
Merged `config.js` and old `symbols.js`. Deleted `objclass.js`. The constant
export audit now enforces that only leaf files export capitalized names.

**Refactor 2 — C field name normalization.** All struct field names renamed to C
canonical (`.aatyp`, `.adtyp`, `.mmove`, `.mlevel`, etc.). `attack_fields.js`
(a runtime alias shim) was deleted. Generators updated to emit canonical names.

**Refactor 3 — File-per-C-source reorganization.** JS "consolidation" files that
had no C counterpart were dissolved into their canonical C-source-named files.
`combat.js`, `look.js`, `monutil.js`, `stackobj.js`, `discovery.js`,
`options_menu.js`, and `map.js` were all deleted. Functions moved to their
correct homes. `player.js` roles/races tables moved to `role.js`.

**Refactor 4 — Context wiring elimination.** Multiple `set*Context()` /
`register*()` patterns that wired module dependencies at init time were replaced
by `gstate.js` direct access and explicit parameter passing. No registration
patterns remain.

---

## Appendix: Key C Files and Their JS Counterparts

| C file | JS file | Notes |
|--------|---------|-------|
| `allmain.c` | `allmain.js` | Entry point, game loop |
| `hack.c` | `hack.js` | Turn management, run/rest/multi |
| `cmd.c` | `cmd.js` | Command dispatch |
| `mklev.c` | `mklev.js` | Level generation |
| `mkroom.c` | `mkroom.js` | Room layout |
| `sp_lev.c` | `sp_lev.js` | Special level API |
| `vision.c` | `vision.js` | FOV — Algorithm C raycasting |
| `uhitm.c` | `uhitm.js` | Hero-hits-monster |
| `mhitu.c` | `mhitu.js` | Monster-hits-hero |
| `monmove.c` | `monmove.js` | Monster movement AI |
| `dog.c` | `dog.js` + `dogmove.js` | Pet AI |
| `apply.c` | `apply.js` | Tool use |
| `zap.c` | `zap.js` | Wand and beam effects |
| `trap.c` | `trap.js` | All trap logic |
| `invent.c` | `invent.js` | Inventory management |
| `pager.c` | `pager.js` | In-terminal text display |
| `save.c`/`restore.c` | `storage.js` | Persistence via localStorage |
| `bones.c` | `bones.js` | Bones file management |
| `topten.c` | `topten.js` | High score tracking |
| `hacklib.c` | `hacklib.js` | xcrypt cipher, utility functions |
| `monsters.h` | `monsters.js` | Generated monster data table |
| `objects.h` | `objects.js` | Generated object data table |
| `artilist.h` | `artifacts.js` | Generated artifact table |

---

> *"You ascend to a higher plane of existence. The architecture makes sense
> from up here."*
