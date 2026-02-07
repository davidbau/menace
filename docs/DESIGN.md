# NetHack JavaScript Port - Architecture & Design

## Overview

This project is a faithful JavaScript port of NetHack 3.7, rendering the classic
ASCII/DEC-symbol display in a web browser. The goal is **readable, traceable
JavaScript** that mirrors the C implementation's logic, with comments referencing
the original C source files and line numbers.

## Design Principles

1. **Fidelity over convenience** -- The JS code mirrors the C logic so a reader
   can follow along with the original source. Variable names, function names,
   and control flow match the C where practical.

2. **Classic TTY display** -- No tilesets, no graphical enhancements. The browser
   shows the same 80×24 character grid with 16 ANSI colors that terminal
   NetHack shows. DEC line-drawing characters are used for walls.

3. **Readable, not compiled** -- This is a hand-ported readable JS codebase, not
   an Emscripten/WASM compilation. Every function can be read and understood.

4. **Incremental faithfulness** -- We port the core game loop first, then layer
   on subsystems. Each layer adds more faithful behavior.

## Architecture

### Module Structure

```
webhack/
├── index.html              Main HTML page (80×24 terminal)
├── docs/
│   ├── DESIGN.md           This file
│   └── DECISIONS.md        Design decision log
├── js/
│   ├── nethack.js          Entry point, game init (← allmain.c)
│   ├── display.js          Browser TTY display (← win/tty/*.c)
│   ├── input.js            Async keyboard queue (← tty input)
│   ├── dungeon.js          Level generation (← mklev.c, mkroom.c)
│   ├── monsters.js         Monster data table (← monsters.h)
│   ├── objects.js          Object data table (← objects.h)
│   ├── symbols.js          Display symbols & colors (← defsym.h, drawing.c)
│   ├── player.js           Player state (← you.h, decl.h)
│   ├── commands.js         Command dispatch (← cmd.c)
│   ├── movement.js         Hero/monster movement (← hack.c, monmove.c)
│   ├── combat.js           Combat (← uhitm.c, mhitu.c, mhitm.c)
│   ├── inventory.js        Inventory management (← invent.c)
│   ├── rng.js              Random number gen (← rnd.c, isaac64.c)
│   ├── fov.js              Field of view (← vision.c)
│   ├── map.js              Map data structures (← rm.h)
│   ├── monmove.js          Monster movement AI (← monmove.c)
│   ├── makemon.js          Monster creation (← makemon.c)
│   ├── mkobj.js            Object creation (← mkobj.c)
│   └── config.js           Game constants & configuration
├── test/
│   ├── test_rng.js         RNG unit tests
│   ├── test_dungeon.js     Dungeon generation tests
│   ├── test_movement.js    Movement tests
│   ├── test_combat.js      Combat tests
│   ├── test_display.js     Display rendering tests
│   └── test_e2e.html       End-to-end browser tests
└── nethack-c/              Original C source (reference)
```

### Display Architecture

**Choice: `<pre>` with per-cell `<span>` elements**

The display uses a `<pre>` element containing an 80×24 grid. Each character
position is a `<span>` with CSS classes for the 16 NetHack colors. This matches
the TTY window port's approach of writing individual characters at (x,y)
positions.

The C code's `window_procs` structure defines the windowing interface:
- `win_print_glyph(win, x, y, glyph_info)` → renders a character at (x,y)
- `win_putstr(win, attr, str)` → writes a string to a window
- `win_nhgetch()` → gets a character of input
- `win_yn_function(query, resp, def)` → yes/no prompts

Our JS `Display` class implements all these as methods that manipulate the DOM.

**Color mapping:** NetHack uses 16 colors (CLR_BLACK through CLR_WHITE plus
bright variants). These map directly to CSS classes: `.clr-red`, `.clr-green`,
etc.

**Window types:** NetHack has NHW_MESSAGE (top line), NHW_MAP (main map),
NHW_STATUS (bottom two lines), and NHW_MENU (popup menus). We implement all
four as regions within the terminal grid, with menus overlaying the map.

### Input Architecture

**Choice: Async queue with Promise-based waiting**

The C game loop is synchronous: `ch = nhgetch()` blocks until a key is pressed.
In JavaScript, we can't block. Instead:

1. Keyboard events push characters into an input queue
2. `nhgetch()` returns a Promise that resolves when a character is available
3. The game loop uses `await nhgetch()` to wait for input
4. `moveloop_core()` becomes an async function

This is the fundamental architectural difference from the C version. Everything
else follows from this: the game loop, command dispatch, and all input-requesting
functions become async.

### Game Loop Architecture

**C version** (allmain.c:593):
```c
void moveloop(boolean resuming) {
    moveloop_preamble(resuming);
    for (;;) {
        moveloop_core();  // synchronous, blocks on input
    }
}
```

**JS version:**
```javascript
async function moveloop(resuming) {
    moveloop_preamble(resuming);
    while (true) {
        await moveloop_core();  // async, awaits input
    }
}
```

The core loop structure mirrors the C exactly:
1. Process monster movement (if time passed)
2. Update display (vision, status, messages)
3. Get player input via `rhack()` → command dispatch
4. Execute command (may consume time)
5. Repeat

### Data Porting Strategy

**Monster data** (`monsters.h`, 3927 lines): The C uses macro-heavy definitions
like `MON(NAM("giant ant"), S_ANT, LVL(2,18,3,0,0), ...)`. We port these to
JS objects: `{ name: "giant ant", symbol: 'a', level: 2, speed: 18, ... }`.
Each entry includes a comment `// monsters.h:NNN` for traceability.

**Object data** (`objects.h`, 1647 lines): Similar macro-heavy definitions
ported to JS objects with traceability comments.

**Symbol data** (`defsym.h`): The PCHAR definitions map indices to characters,
descriptions, and colors. Ported to a JS array of `{ch, desc, color}` objects.

### Level Generation Strategy

NetHack's dungeon generation (mklev.c) uses this algorithm:
1. Decide number of rooms (3-5 on most levels)
2. Place rooms with random sizes at random positions
3. Connect rooms with corridors (using the order they were created)
4. Add doors at room boundaries
5. Place stairs (up and down)
6. Place furniture (fountains, altars, etc.)
7. Populate with monsters and objects

We port this algorithm faithfully, including the room-joining corridor algorithm
from `join()` in mklev.c which creates L-shaped corridors.

### Combat Architecture

Combat mirrors the C's `uhitm.c` (hero hits monster) and `mhitu.c` (monster
hits hero). The core flow:
1. To-hit roll: `1d20 + bonuses >= target AC + 10`
2. Damage roll: weapon base damage + strength bonus
3. Special effects (poison, drain, etc.)

### Vision/FOV Architecture

The C version uses a sophisticated raycasting algorithm in `vision.c`. For the
initial port, we implement a simplified but correct line-of-sight algorithm
that produces equivalent results for standard room-and-corridor levels:
- Inside a lit room: see the entire room
- In a corridor: see adjacent squares
- Dark rooms: see only adjacent squares

## Global State Management

The C version uses extensive global variables (declared in decl.c/decl.h):
- `u` -- the player (`struct you`)
- `level` -- current level data
- `mons[]` -- monster type data
- `objects[]` -- object type data
- `fmon` -- linked list of monsters on level
- `invent` -- player's inventory chain
- `moves` -- turn counter

In JS, these become properties of a global `NetHack` game state object,
preserving the same names for readability:
```javascript
const NH = {
    u: { ... },        // player state
    level: { ... },    // current level
    moves: 0,          // turn counter
    fmon: null,         // monster list head
    invent: null,       // inventory list head
};
```

## Map Representation

The C version uses `level.locations[x][y]` (an array of `struct rm`).
Each location has:
- `typ` -- terrain type (ROOM, CORR, DOOR, WALL, etc.)
- `seenv` -- which directions player has seen this from
- `flags` -- door state, etc.
- `lit` -- illumination state
- `glyph` -- what's currently displayed here

We mirror this exactly in JS with a 2D array of location objects.
Map dimensions: COLNO=80, ROWNO=21 (matching the C constants).
