# Design Decision Log

> *"You feel as if someone is watching you make choices. It must be
> the DevTeam."*

**See also:**
[DESIGN.md](DESIGN.md) (architecture) |
[DEVELOPMENT.md](DEVELOPMENT.md) (dev workflow) |
[LORE.md](LORE.md) (porting lessons)

## Decision 1: Async Game Loop via Promise Queue

> *"You are momentarily blinded by the Promise."*

**Context:** The C NetHack game loop calls `nhgetch()` which blocks the thread
until a key is pressed. JavaScript in the browser cannot block.

**Options considered:**
1. Web Workers with SharedArrayBuffer + Atomics.wait() (true blocking)
2. Async/await with a Promise-based input queue
3. State machine that returns control on each input request

**Choice:** Option 2 -- Async/await with Promise queue.

**Rationale:**
- Option 1 requires SharedArrayBuffer which needs special COOP/COEP headers
  and is complex to set up for a simple static page.
- Option 3 would require restructuring every function that reads input into
  a state machine, making the code unrecognizable vs the C.
- Option 2 preserves the sequential flow of the C code. `rhack()` and
  `getlin()` and `yn_function()` all become `async` functions, but their
  internal logic reads identically to the C.

**Tradeoff:** Every function in the call chain from `moveloop_core` to any
input function must be async. This is pervasive but mechanical.

---

## Decision 2: Single-Page HTML with Inline Terminal

> *"The walls of the room are covered in `<span>` tags."*

**Context:** How to render the 80×24 character display.

**Options considered:**
1. Canvas-based rendering (draw each character as pixels)
2. `<pre>` element with `<span>` per character cell
3. CSS Grid of divs

**Choice:** Option 2 -- `<pre>` with `<span>` elements.

**Rationale:**
- Uses the browser's text rendering, which handles font metrics perfectly
- Trivially supports copy-paste of the terminal content
- Color is applied via CSS classes, matching NetHack's 16-color model
- Simplest to implement and debug
- DEC line-drawing characters render correctly in Unicode fonts

**Performance:** 80×24 = 1,920 spans is trivial for modern browsers. Even full
screen redraws at 60fps would be fine.

---

## Decision 3: ES6 Modules Without Build Step

> *"You don't need a build tool. You feel remarkably unburdened."*

**Context:** How to organize the JavaScript code.

**Options considered:**
1. Single monolithic file
2. ES6 modules with `<script type="module">`
3. CommonJS with a bundler (webpack/rollup)

**Choice:** Option 2 -- ES6 modules loaded natively.

**Rationale:**
- No build step required; just open index.html
- Clean separation matching the C file organization
- Modern browsers all support ES6 modules natively
- Import/export makes dependencies explicit

---

## Decision 4: Faithful DEC Symbols via Unicode

> *"You see here a box-drawing character (U+2502)."*

**Context:** Classic NetHack uses DEC Special Graphics characters for wall
drawing. These are box-drawing characters like ─│┌┐└┘├┤┬┴┼.

**Choice:** Use Unicode box-drawing characters (U+2500 block) which are the
standard modern representation of DEC Special Graphics. The "IBMgraphics"
symbol set uses similar characters.

NetHack's `symbols` config option supports both "DECgraphics" and "IBMgraphics".
We default to the IBM set since Unicode box-drawing maps directly to it.

When the user hasn't selected a symbol set, we use the plain ASCII defaults
from defsym.h (|, -, +, #, etc.) which is the most faithful to the default
TTY experience.

---

## Decision 5: Simplified Vision for Initial Port *(superseded — see update)*

> *"It is dark. You can't see anything but the pragmatic choice."*

**Context:** NetHack's vision.c implements a complex raycasting algorithm for
field of view.

**Original choice:** For the initial port, implement a rule-based FOV:
- Lit rooms: player sees all squares in the room
- Dark rooms/corridors: player sees only adjacent 8 squares
- Remembered squares are shown in a different color

This produces correct results for the standard dungeon layout. The full
raycasting algorithm will be ported in a later pass.

**Justification:** The room/corridor FOV rules are what 99% of gameplay uses.
The raycasting is only needed for open areas, line-of-sight blocking by
boulders, etc. Getting the core game playable is more valuable than perfect
FOV initially.

**Update (implemented):** `vision.js` now implements the full Algorithm C
raycasting from `vision.c` — the same recursive line-of-sight scanner that
traces visibility along octant rays, handling walls, doors, boulders, and
partial occlusion exactly as the C does. The simplified rule-based approach
was completely replaced.

---

## Decision 6: Monster & Object Data as Structured JS Arrays

> *"You see here 383 monsters and 478 objects. They have been carefully catalogued."*

**Context:** The C code defines monster data via C macros in monsters.h
(3927 lines) and object data in objects.h (1647 lines).

**Choice:** Port as JavaScript arrays of plain objects, preserving field
names from the C structures.

Example (C):
```c
MON(NAM("giant ant"), S_ANT,
    LVL(2, 18, 3, 0, 0), (G_GENO | G_SGROUP),
    A(ATTK(AT_BITE, AD_PHYS, 1, 4), ...),
    SIZ(10, 10, MS_SILENT, MZ_TINY), 0, 0,
    M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_CARNIVORE,
    M2_HOSTILE, 0, CLR_BROWN, GIANT_ANT)
```

Example (JS — using canonical C field names):
```javascript
{ // monsters.h:120
  mname: "giant ant", mlet: S_ANT,
  mlevel: 2, mmove: 18, ac: 3, mr: 0, maligntyp: 0,
  geno: G_GENO | G_SGROUP,
  mattk: [{aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 4}, ...],
  cwt: 10, cnutrit: 10, msound: MS_SILENT, msize: MZ_TINY,
  mflags1: M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_CARNIVORE,
  mflags2: M2_HOSTILE, mflags3: 0,
  mcolor: CLR_BROWN
}
```

The C line reference in the comment allows cross-referencing. Field names
now match `struct permonst` in `permonst.h` exactly (Phase 2 normalization).

---

## Decision 7: Global State Object Pattern

> *"You feel the weight of hundreds of global variables settle into a
> single namespace."*

**Context:** The C code uses many global variables (decl.c has hundreds).
How to manage these in JS?

**Options:**
1. True global variables
2. Single namespace object (`NH.u`, `NH.level`, etc.)
3. Class instances with encapsulation

**Choice:** Option 2 -- single `game` object, accessed via `gstate.js`.

**Rationale:**
- Mirrors the C's global access pattern (code reads similarly)
- Avoids polluting the JS global namespace
- Easy to serialize for save/restore
- No class ceremony for what is fundamentally global state

**Implementation:** `gstate.js` exports a single mutable `game` reference
(`export let game = null`). `allmain.js` calls `setGame(game)` once before
the game loop starts. All other modules import `game` from `gstate.js` and
access state through `game.u`, `game.level`, `game.flags`, etc. — matching
C's naming where possible (`u`, `level`, `flags`, `context`, `moves`, `fmon`).

**Evolution:** Early versions used an `NH` namespace (this decision's original
choice) and also had multiple `set*Context()` / `register*()` calls to wire
module dependencies at init time. All of that was replaced by `gstate.js`
during Phase 4 of the architectural refactor. The final pattern is simpler:
one object, no wiring, ESM live bindings handle the rest.

---

## Decision 8: RNG -- ISAAC64 for Exact C Compatibility

> *"You feel the hand of fate guiding you. It is using BigInt arithmetic."*

**Context:** NetHack uses a seeded RNG for reproducible games. The C code uses
ISAAC64 (isaac64.c) for the main game RNG and the system RNG for initial
seeding.

**Choice (updated):** Port ISAAC64 faithfully using JavaScript BigInt for
64-bit unsigned integer arithmetic. This gives bit-for-bit identical output
to the C version for any given seed, enabling deterministic comparison tests.

**Implementation notes:**
- `js/isaac64.js` is a direct port of `isaac64.c` (public domain, by
  Timothy B. Terriberry). It uses BigInt for all 64-bit arithmetic.
- `js/rng.js` wraps ISAAC64 with `rn2()`, `rnd()`, `d()` etc., matching
  the C `rnd.c` logic exactly: `RND(x) = isaac64_next_uint64() % x`.
- Seeding matches `init_isaac64()` from `rnd.c`: the seed is converted to
  8 little-endian bytes (matching `sizeof(unsigned long)` = 8 on 64-bit
  Linux) and passed to `isaac64_init()`.
- Golden reference tests verify 500 consecutive values for 4 different seeds
  against output from a compiled C reference program.
- Performance: BigInt operations are fast enough. ISAAC64 generates 256
  values per batch; the ~1024 BigInt operations per batch take microseconds.
  For a turn-based game this is negligible.

**Previous choice (initial port):** xoshiro128** was used temporarily for the
first prototype, but was replaced with ISAAC64 to enable exact C matching.

---

## Decision 9: Corridor Algorithm -- Faithful Port of join()

> *"You hear the rumble of distant digging. The corridors connect."*

**Context:** mklev.c's `join()` function creates L-shaped corridors between
rooms. This is a signature visual element of NetHack's dungeon.

**Choice:** Port the exact algorithm from `join()` including:
- Choose random points in each room to connect
- Create an L-shaped corridor (horizontal then vertical, or vice versa)
- Handle corridor-corridor connections

This ensures the dungeon "looks like NetHack."

---

## Decision 10: Wizard Mode via URL Parameters

> *"You are in wizard mode. All query parameters are at your disposal."*

**Context:** NetHack's wizard mode (debug mode) is invaluable for testing. The C
version activates it via compile-time flags or special user names. We need a
browser-friendly equivalent.

**Choice:** Activate wizard mode via URL query parameters:
- `?wizard=1` -- enables wizard mode
- `?seed=N` -- sets the PRNG seed for deterministic play
- `?role=X` -- selects starting role

**Wizard commands implemented:**
- Ctrl+F: Magic mapping (reveal entire level)
- Ctrl+V: Level change (teleport to any dungeon level)
- Ctrl+T: Teleport to coordinates or random location
- Ctrl+G: Genesis (create any monster by name)
- Ctrl+W: Wish (stub)
- Ctrl+I: Identify all (stub)
- `#` extended command: text-based command dispatch

**Rationale:** URL parameters are the natural equivalent of command-line flags for
a browser application. They can be bookmarked, shared, and don't require any UI
for activation. The `?seed=N` parameter combined with wizard mode enables fully
deterministic, reproducible test scenarios.

**Testing:** Wizard commands that don't require user input (e.g., magic mapping)
are tested via unit tests with mock game objects. Input-requiring commands
(level change, teleport, genesis) are tested via E2E browser tests.

---

## Decision 11: Lua Level Definitions -- Direct Port to JS (No Interpreter)

> *You feel the mass of scripted levels pressing on your mind.*

**Context:** NetHack 3.7 introduced Lua scripting for special level definitions.
There are 141 `.lua` files totaling ~17,000 lines in `dat/`. The C code embeds
a full Lua 5.4 interpreter and exposes a `des.*` API (35+ functions from
`sp_lev.c`) plus a `selection` API for geometric map operations.  The question:
how does WebHack handle these?

**Options considered:**

1. **Embed a Lua interpreter in JS** (~1,500 lines for a minimal subset)
2. **Transpile Lua→JS** via an existing parser (e.g., `luaparse`) + code emitter
3. **Port the Lua scripts directly to JavaScript** (mechanical syntax conversion)

**Choice:** Option 3 -- Direct port to JavaScript.

**Rationale:**

The Lua scripts aren't really "programs" -- they're a DSL for dungeon layout.
Reading them reveals three complexity tiers:

| Tier | Files | Lines | What they do |
|------|-------|-------|-------------|
| Declarative | ~130 | ~3,000 | `des.room({...})`, `des.monster()`, `des.object()` in sequence. No logic. |
| Procedural | ~5 | ~500 | `if percent(60) then ... end`, `for i=1,n do`, shuffled tables |
| Complex | ~3 | ~4,600 | Closures, selection set operations (`\|`, `&`), stored callbacks |

90% of the code is declarative -- nested tables and function calls. The syntax
conversion is mechanical:

```
-- Lua                              // JavaScript
des.room({ type = "ordinary",       des.room({ type: "ordinary",
  x = 3, y = 3,                       x: 3, y: 3,
  contents = function()                contents: () => {
    des.monster()                        des.monster();
  end                                  }
})                                   });
```

An interpreter would be ~1,500 lines of code that exists purely to run scripts
that are themselves being ported.  That's building a bridge when you could just
walk across the river.  Direct porting:

- **Eliminates the middleman.**  No interpreter means no interpreter bugs, no
  impedance mismatch between Lua and JS semantics, no double debugging.
- **Enables exact RNG control.**  Every `math.random()` and `nh.rn2()` call
  becomes a direct JS `rn2()`, making PRNG sequence comparison trivial.
- **Keeps the codebase in one language.**  Debugging a Lua interpreter running
  inside a JS port of a C game is the kind of thing that would make the DevTeam
  weep with a mixture of admiration and pity.
- **The "complex" tier is exactly 3 files.**  `themerms.lua` (theme rooms,
  1,097 lines) is the hardest.  `quest.lua` (3,087 lines) is 95% text data.
  `hellfill.lua` (441 lines) uses selection operations.

**What IS needed:**

Even without a Lua interpreter, we need the APIs that Lua scripts call.  These
become JS modules:

1. **`des.*` API** (35+ functions from `sp_lev.c`):  `des.room()`, `des.monster()`,
   `des.object()`, `des.terrain()`, `des.map()`, `des.stair()`, `des.trap()`,
   `des.door()`, `des.level_flags()`, `des.level_init()`, `des.region()`,
   `des.altar()`, `des.fountain()`, `des.random_corridors()`, etc.

2. **Selection API** (geometric operations on map coordinates): `selection.new()`,
   `set()`, `rndcoord()`, `percentage()`, `grow()`, `negate()`, `match()`,
   `floodfill()`, `iterate()`, `filter_mapchar()`.  Supports union, intersection,
   complement via operator overloading or method chaining.

3. **`nhlib` helpers**: `percent()`, `shuffle()`, `montype_from_name()`, and
   a handful of utility functions (~242 lines, trivially ported).

**Lua features NOT used** (confirming an interpreter isn't needed):

- No metatables or metamethods
- No coroutines
- No module/require system (C loads files directly)
- No file I/O (except 1 function in `nhcore.lua`, easily special-cased)
- No debug library
- No `load()` or `dofile()` (no runtime code generation)

**Porting order** (tracked in GitHub Issues):

```
Phase 1 (foundation):
  ├── des.* API implementation (JS equivalent of sp_lev.c)
  └── Selection API (geometric operations)

Phase 2 (level files):
  ├── nhlib helpers
  ├── dungeon.lua (dungeon tree structure, pure data)
  ├── ~130 simple declarative levels (oracle, mines, sokoban, etc.)
  └── ~5 procedural levels (castle, medusa, astral)

Phase 3 (complex):
  ├── themerms.lua (theme rooms with closures + selection ops)
  └── quest.lua (quest text data + callbacks)
```

**Tradeoff:**  If NetHack's Lua usage expands significantly in future versions
(e.g., user-scriptable levels, Lua-based game logic), we'd need to revisit this
decision.  For 3.7's usage -- which is firmly "configuration DSL with occasional
procedural glue" -- direct porting is the pragmatic choice.

> *"You hear the strident call of a scripting language. It seems far away."*

---

## Decision 12: Pre-Makelevel PRNG Alignment via skipRng()

> *You sense the presence of 257 consumed random values.*

**Context:** The C game consumes 257 ISAAC64 values between `init_random()` and
the start of `makelevel()`.  These come from:

| Source | Calls | Purpose |
|--------|-------|---------|
| `o_init.c` | 198 | Object class shuffling (randomize potion/scroll/wand appearances) |
| `dungeon.c` | 53 | Dungeon structure initialization |
| `nhlua.c` | 4 | Lua startup |
| `u_init.c` | 1 | Character creation |
| `bones.c` | 1 | Bones file check |

JS doesn't implement these subsystems yet.  If we just call `initRng(seed)` and
then `makelevel()`, the PRNG state is 257 values behind the C version.

**Choice:** `skipRng(n)` -- consume n raw ISAAC64 values without logging, to
fast-forward past C startup calls that JS doesn't need yet.

**Rationale:** This is the pragmatic approach that the user specifically
suggested.  Instead of porting `o_init()` (which shuffles object appearances
-- a system we'll need eventually but not for basic level generation fidelity),
we advance the PRNG by the exact number of consumed values.

The skip count (257 for seed=42) was determined empirically using the C PRNG
logger (`003-prng-logging.patch`), which logs every RNG call with file:line
information.

**Future:** When we port `o_init()`, `dungeon.c` init, etc., the skip count
drops accordingly.  When all startup systems are ported, `skipRng()` is no
longer needed.  The PRNG log comparison tests track progress toward this goal.

---

## Decision 13: PRNG Timing Parity

> *"You sense a disturbance in the random number plane."*

**Context:** Session comparison tests compare JS and C PRNG call sequences using
strict index-based comparison. When one side makes an extra or missing RNG call,
all subsequent indices become misaligned, making it impossible to tell whether the
rest of the sequence matches. A single missing call early on causes hundreds of
apparent mismatches downstream.

**Principle:** PRNG calls must happen at the same step as C. Screen parity forces
this in 99%+ of cases — any call that affects visible output must happen on the
same turn or the screen will diverge. Calls may happen *later* than C only for
invisible internal state (e.g., deferred exercise checks). Calls must **never**
happen *earlier* than C — an earlier call means JS is computing something C hasn't
yet, which always indicates a bug (premature computation, misplaced logic, or a
missing guard).

**Categories of divergence:**
- **JS extra** (JS made a call C didn't at this step): indicates premature or
  misplaced computation in JS. Always a bug to investigate.
- **C extra** (C made a call JS didn't at this step): indicates missing JS
  implementation. Expected during porting; tracked as parity work.
- **Value diff** (both sides called RNG but got different results): indicates
  accumulated drift from earlier shifts. Fix the earliest shift first.

**Diagnosis:** Use `node test/comparison/rng_shift_analysis.js` to identify
time-shifts across sessions. The tool uses bounded-lookahead alignment to
distinguish shifts (insertions/deletions) from value mismatches, and aggregates
the most-affected functions across all sessions.

**See also:** [C_PARITY_WORKLIST.md](C_PARITY_WORKLIST.md) (PRNG Timing section),
Issue [#143](https://github.com/davidbau/menace/issues/143).

---

## Decision 14: SYNCLOCK Boundary Ownership Over Fallback Auto-Sync

> *"You hear a click as the boundary lock engages."*

**Context:** The JS port uses async I/O, but NetHack C is single-threaded and
blocking. During migration, `run_command()` had a compatibility fallback that
would auto-sync legacy `_pendingMore` state into a synthetic owner=`more`
boundary. This reduced breakage but obscured ownership bugs and made ordering
errors harder to diagnose.

**Choice:** Move no-owner handling to a strict-mode contract while preserving a
default compatibility path. If `_pendingMore` is set with no owner=`more`
boundary, emit `boundary.more.owner-missing`; in strict mode
(`WEBHACK_STRICT_MORE_OWNER=1`) ignore the key, otherwise perform compatibility
auto-sync.

**Rationale:**
1. Ownership bugs should fail loudly at the boundary, not be repaired silently.
2. Deterministic replay/parity debugging is faster when boundary violations are explicit.
3. Strict mode (`WEBHACK_STRICT_MORE_OWNER=1`) prevents accidental key
   consumption reordering and exposes latent ownership bugs.

**Implementation shape:**
- Typed waits use `awaitInput/awaitMore/awaitAnim` wrappers.
- Gameplay-side `morePrompt` waits are centralized via
  `awaitDisplayMorePrompt(...)` in `suspend.js`.
- `scripts/synclock_audit.mjs --strict` guards against regression to raw waits.

**Tradeoff:** Strict mode surfaces latent boundary defects earlier; default mode
keeps compatibility while migration completes.

**See also:** `docs/SYNCLOCK_CAMPAIGN_PLAN.md`,
`docs/SYNCLOCK_PROGRAMMING_GUIDE.md`, Issue `#277`.

---

> *"You have reached the bottom of the decision log. There are more decisions
> to come. The strident call of the DevTeam echoes in the distance."*
