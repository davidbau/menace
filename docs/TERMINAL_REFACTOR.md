# Terminal Display Refactoring Plan

## Problem

We have **5,703 lines across 6 display files** with massive duplication:

| File | Lines | Used by |
|------|-------|---------|
| `js/display.js` | 3,117 | NetHack (browser), Shell |
| `js/headless.js` | 1,823 | NetHack (tests/harness) |
| `rogue/js/display.js` | 239 | Rogue (browser) |
| `hack/js/display.js` | 188 | Hack (browser) |
| `basic/js/display.js` | 168 | BASIC (browser) |
| `logo/js/display.js` | 168 | Logo (browser) |

**25 methods** are duplicated between Display and HeadlessDisplay.
**6 trace functions** are copy-pasted between display.js and headless.js.
4 simplified display files (rogue, hack, basic, logo) are subsets of the shared one.

The root cause: `js/display.js` mixes three concerns:
1. **Terminal rendering** — put chars on a grid, manage cursor, flush to DOM
2. **NetHack game logic** — newsym, renderMap, FOV, glyph cache (~400 lines)
3. **NetHack UI widgets** — --More-- messages, menus, popups, tombstone (~400 lines)

## Character Encoding & Graphics Support

The Terminal's character model must support multiple symbol sets and future
Unicode expansion. Each cell stores a **Unicode character** (any valid JS string
character, including multi-byte), a **color** (integer or CSS string), and an
**attribute bitmask**.

### Color Model

Terminal uses a 16-color palette matching the ANSI/xterm standard:

| Code | Name | ANSI FG | ANSI BG | CSS hex |
|------|------|---------|---------|---------|
| 0 | CLR_BLACK | 30 | 40 | `#555` |
| 1 | CLR_RED | 31 | 41 | `#d00` |
| 2 | CLR_GREEN | 32 | 42 | `#0b0` |
| 3 | CLR_BROWN | 33 | 43 | `#a50` |
| 4 | CLR_BLUE | 34 | 44 | `#44f` |
| 5 | CLR_MAGENTA | 35 | 45 | `#a0a` |
| 6 | CLR_CYAN | 36 | 46 | `#0aa` |
| 7 | CLR_GRAY | 37 | 47 | `#ccc` |
| 8 | NO_COLOR (dark gray) | 90 | 100 | `#555` |
| 9 | CLR_ORANGE | 91 | 101 | `#fa0` |
| 10 | CLR_BRIGHT_GREEN | 92 | 102 | `#0f0` |
| 11 | CLR_YELLOW | 93 | 103 | `#ff0` |
| 12 | CLR_BRIGHT_BLUE | 94 | 104 | `#88f` |
| 13 | CLR_BRIGHT_MAGENTA | 95 | 105 | `#f0f` |
| 14 | CLR_BRIGHT_CYAN | 96 | 106 | `#0ff` |
| 15 | CLR_WHITE | 97 | 107 | `#fff` |

The `color` parameter to `setCell()` accepts:
- **Integer (0–15)**: CLR_* constant, mapped to CSS via `COLOR_CSS[]`
- **CSS string** (e.g. `'#0f0'`): passed through to DOM directly (for Logo/BASIC
  which use hex color strings for turtle graphics and BASIC output)

This dual-format approach lets NetHack and Rogue use efficient integer constants
while Logo and BASIC use arbitrary CSS colors without conversion overhead.

### Attribute Bitmask

Attributes are OR'd together as a bitmask, matching ANSI SGR codes:

| Bit | Value | Name | ANSI SGR | Effect |
|-----|-------|------|----------|--------|
| 0 | 1 | ATR_INVERSE | 7 | Swap foreground/background |
| 1 | 2 | ATR_BOLD | 1 | Bold weight |
| 2 | 4 | ATR_UNDERLINE | 4 | Underline decoration |

Named constants exported from terminal.js:
```js
export const ATR_NONE      = 0;
export const ATR_INVERSE   = 1;
export const ATR_BOLD      = 2;
export const ATR_UNDERLINE = 4;
```

These map directly to ANSI SGR escape sequences in `getScreenAnsiLines()`,
making session capture inherently ANSI-compatible.

### Symbol Sets

The Terminal grid stores **Unicode characters** directly. Symbol-set translation
(ASCII → DECgraphics → IBMgraphics → Unicode) happens **above** Terminal, in the
game logic layer that decides what character to write to the grid.

**Current symbol sets** (NetHack):

| Set | Walls | Floor | Water | Source |
|-----|-------|-------|-------|--------|
| ASCII | `-` `\|` | `.` | `}` | Default 7-bit ASCII |
| DECgraphics | `─` `│` `┌` `┐` `└` `┘` `┼` `┬` `┴` `├` `┤` | `·` | `◆` | VT100 alternate charset (Unicode equivalents) |

DECgraphics in our implementation already stores **Unicode box-drawing
characters** (U+2500–U+253C, etc.) directly in the grid, not raw DEC alternate
charset bytes. The C VT100 approach of SO/SI mode switching (`\x0e`/`\x0f`) is
only relevant for ANSI session parsing — `setScreenAnsiLines()` maps DEC codes
to Unicode via `DEC_TO_UNICODE`:

```js
const DEC_TO_UNICODE = {
    '`': '◆',  a: '▒',  f: '°',  g: '±',
    j: '┘',  k: '┐',  l: '┌',  m: '└',  n: '┼',
    q: '─',  t: '├',  u: '┤',  v: '┴',  w: '┬',
    x: '│',  '~': '·',
};
```

**Future symbol sets:**

| Set | Use case | Character range |
|-----|----------|-----------------|
| IBMgraphics | CP437 line-drawing (║═╔╗╚╝╠╣╦╩╬) | U+2550–U+256C |
| Unicode | Full Unicode symbols (swords ⚔, potions 🧪, etc.) | Misc Symbols, Dingbats |

The architecture supports all of these without Terminal changes because:
1. Grid cells hold arbitrary Unicode strings, not byte values
2. DOM `<span>` elements render any Unicode natively
3. Session capture (`getScreenAnsiLines`) encodes raw UTF-8 — no translation needed
4. Symbol-set selection (ASCII vs DEC vs IBM vs Unicode) is a **game logic concern**
   in `js/render.js` and `js/const.js`, not a terminal concern

**BASIC and Logo** already use Unicode freely (BASIC `PRINT` output, Logo
text). The shared Terminal handles this natively since DOM spans render all
Unicode.

### Graphics Plane (Logo/BASIC Turtle Canvas)

Logo and BASIC need **pixel-level graphics** alongside the text terminal.
This is the same dual-plane architecture used by the DEC VT340 (1987):

```
VT340:                          Our Terminal:
┌─────────────────────┐         ┌──────────────────────────────┐
│  Text plane (VT100)  │ top     │  <pre> text grid (spans)     │ z-index:1
│  Graphics plane      │ bottom  │  <canvas> pixel surface      │ z-index:0
│  Hardware compositor │         │  CSS stacking + transparency │
└─────────────────────┘         └──────────────────────────────┘
```

Currently, each app (Logo, BASIC) manually creates and aligns its own
canvas. Terminal should own this as an **optional graphics plane**:

```js
class Terminal {
    constructor(containerId, { rows, cols, graphicsCanvas } = {}) {
        // ... text grid setup ...
        if (graphicsCanvas) {
            this._canvas = graphicsCanvas;    // app provides canvas element
            this._pre.style.background = 'transparent';  // text over graphics
            this._alignCanvas();
        }
    }

    // Return canvas for app-specific drawing (Turtle, tiles, etc.)
    getCanvas() { return this._canvas; }

    // Return <pre> element for external sizing/alignment
    getPreElement() { return this._pre; }
}
```

The Terminal doesn't implement drawing primitives (lines, fills, etc.) —
that's the Turtle class's job. Terminal just manages the **layering and
alignment** of the two planes:

```js
// Logo entry point — clean
const terminal = new Terminal('logo-container', {
    graphicsCanvas: document.getElementById('logo-canvas')
});
const turtle = new Turtle(terminal.getCanvas());
const repl = new LogoRepl(terminal, interp);
```

This keeps the Turtle class unchanged while eliminating the manual
canvas/pre alignment code from each app's entry point.

**Future graphics capabilities** this enables:

| Feature | App | How it uses the graphics plane |
|---------|-----|-------------------------------|
| Turtle graphics | Logo | Draw lines/arcs on canvas |
| HGR mode | BASIC | High-res pixel plotting |
| Tile rendering | NetHack | Draw tile sprites under text |
| Inline images | Shell | Sixel-style image display |
| Map overlays | Rogue/Hack | Visual effects, fog of war |

All of these follow the VT340 pattern: pixel graphics underneath,
text on top with selective transparency.

**Resolution independence**: The canvas logical resolution is set by the app,
not Terminal. CSS scales it to fit the terminal's display bounds.

```js
// Apple II era: 320×200, pixelated scaling (Logo, BASIC)
canvas.width = 320; canvas.height = 200;
canvas.style.imageRendering = 'pixelated';

// VT340 era: 800×480, 16 colors (sixel emulation)
canvas.width = 800; canvas.height = 480;

// Modern: match display resolution (tiles, hi-res images)
canvas.width = pre.clientWidth * devicePixelRatio;
canvas.height = pre.clientHeight * devicePixelRatio;
```

This means Terminal can emulate anything from a 1984 VT240 to a modern
graphics terminal — the text plane is always 80×24 (or configurable), and
the graphics plane is whatever resolution the app needs.

**Headless mode**: When containerId is null, there's no canvas — `getCanvas()`
returns null. Apps that need headless graphics testing can use an
OffscreenCanvas or skip graphics entirely.

### Mobile Viewport (Future — Phone Support)

On phone screens, an 80×24 terminal at readable font sizes is too wide.
The solution: a **zoomed viewport** that shows a subregion of the terminal,
centered on the player, with pinch-zoom and pan gestures.

```
Phone landscape layout:
┌──────────────────────────────────────────────┐
│       ┌────────────────────┐                 │
│ [cmd] │  ~30×12 visible    │  [↖][↑][↗]     │
│ [cmd] │  chars, zoomed 2×  │  [←][·][→]     │
│ [cmd] │  auto-centered     │  [↙][↓][↘]     │
│ [kbd] │  on player @       │  [,][>][<]     │
│       └────────────────────┘                 │
└──────────────────────────────────────────────┘
```

**Key design point**: Terminal renders the full 80×24 grid to DOM spans as
usual. A separate `TerminalViewport` class (~300 lines) wraps the `<pre>`
in a clipping container and applies CSS `transform: scale() translate()`
to zoom and pan. No canvas, no re-rendering — the browser's GPU compositor
handles the magnification. This is why span-based DOM rendering matters:
CSS transforms on DOM elements are GPU-accelerated and support smooth
pinch-zoom natively.

**Terminal's role** is minimal — one new method:

```js
setFocusPoint(col, row)  // viewport auto-centers on this cell
```

NetHack calls this from `cursorOnPlayer()`. Rogue's cursor position IS the
player position. The viewport animates smoothly to the new focus point
after each move.

**Touch input**: A virtual keypad overlay sends keys via `input.inject()`,
identical to physical keyboard input. The game doesn't know whether input
came from keyboard or touch buttons. The keypad has:
- **Right**: 3×3 numpad for 8-directional movement + wait
- **Left**: Common commands (inventory, pickup, eat, quaff, search, etc.)
- **Bottom**: Toggle for full virtual keyboard

**Orientation**: Force landscape on phones. The 80×24 grid is inherently
wide — portrait mode would show too few columns to be useful even zoomed.

### ANSI Session Format

HeadlessTerminal's screen capture produces standard ANSI terminal sequences:

```
\x1b[31;1m     → red bold text
\x1b[7m        → inverse video
\x1b[0m        → reset all attributes
\x1b[C         → cursor forward (space with current attributes)
\x0e / \x0f    → DEC Special Graphics mode on/off (in setScreenAnsiLines input)
```

This makes session files interoperable with standard terminal tools (`less -R`,
`cat`, etc.) and enables future features like:
- Terminal replay animations
- Screen diff tools
- Integration with real terminal emulators (xterm.js)

## Grid Cell Format

All apps share a single canonical cell format:

```js
grid[row][col] = { ch: string, color: number|string, attr: number }
```

- `ch`: One Unicode character (or space for empty)
- `color`: CLR_* integer (0–15) or CSS color string
- `attr`: Attribute bitmask (0 = normal)

This is the format NetHack and Shell already use. Migration notes:
- **Rogue/Hack**: Currently store `string` in grid + separate `_attrGrid[][]`.
  After migration, rogue's `curses.js:draw()` writes `{ch, color, attr}` cells.
  Rogue game code never reads `display.grid` directly — only curses.js does.
- **Logo/Basic**: Currently store `{ch, color}`. Just add `attr: 0` default.
- **Shell**: `_captureScreen()` reads `grid[r][c].ch` and `.color` — works unchanged.

## DOM vs Headless: The containerId Pattern

The key design decision: **`containerId` being null signals headless mode**.
Terminal skips all DOM creation when containerId is null. `setCell()` always
writes to `grid[r][c]`, and conditionally updates `spans[r][c]` only if the
DOM exists. This lets browser and headless share one inheritance chain:

```
Terminal(containerId=null)  →  grid only, no DOM
Terminal(containerId)       →  grid + <pre> + spans[][] + CSS cursor
```

Core `setCell` implementation:
```js
setCell(col, row, ch, color = CLR_GRAY, attr = 0) {
    const cell = this.grid[row][col];
    cell.ch = ch; cell.color = color; cell.attr = attr;
    if (this.spans) {                       // DOM exists?
        const span = this.spans[row][col];
        span.textContent = ch;
        span.style.color = this.colorToCss(color);
        // ... apply inverse/bold/underline CSS
    }
}
```

Similarly, `setCursor()` always updates `cursorCol/cursorRow`, and
conditionally toggles the `.cursor-blink` CSS class on spans if DOM exists.

This means NethackDisplay works in both modes with **one class**:
```js
class NethackDisplay extends Terminal {
    constructor(containerId) {
        super(containerId, { rows: TERMINAL_ROWS });
        // Game state — always initialized (browser and headless)
        this.messages = []; this._tempOverlay = new Map(); ...
        // Browser-only
        if (containerId) this._setupHover();
    }
}

// Browser:
const display = new NethackDisplay('game-container');  // DOM + grid

// Headless (tests/replay):
const display = new NethackDisplay(null);              // grid only
```

There is **no HeadlessNethackDisplay class**. The game logic (putstr_message,
menus, renderMap, temp overlays, renderStatus) is identical in both modes —
it calls `this.setCell()` which writes the grid always and the DOM only if
present. The cellInfo/hover writes in renderMap are harmless when headless
(arrays nobody reads).

### Screen Capture as Free Functions

The 5 screen capture operations (getScreenLines, getScreenAnsiLines,
setScreenLines, setScreenAnsiLines, getAttrLines) are pure grid-reading
functions — they iterate `grid[r][c]` objects and emit/parse text.
Extract them as free functions in `js/screen_capture.js` (~100 lines):

```js
// js/screen_capture.js
export function getScreenLines(grid, rows, cols) { ... }
export function getScreenAnsiLines(grid, rows, cols) { ... }
export function setScreenLines(grid, rows, cols, lines) { ... }
export function setScreenAnsiLines(grid, rows, cols, lines) { ... }
export function getAttrLines(grid, rows, cols) { ... }
```

Screen capture is a **testing concern**, not a display concern. Test harnesses
and replay code call the free functions directly:
```js
import { getScreenAnsiLines } from './screen_capture.js';
const lines = getScreenAnsiLines(display.grid, display.rows, display.cols);
```

HeadlessTerminal wraps these as convenience methods for simple apps (rogue,
hack tests). NethackDisplay does not — test code calls the free functions.

## Proposed Architecture

```
js/terminal.js (NEW — ~300 lines)
├── class Terminal
│   ├── constructor(containerId, { rows, cols, graphicsCanvas })
│   │     if containerId → creates <pre>, spans[][], cursor CSS
│   │     if graphicsCanvas → transparent bg, canvas alignment
│   │     if null → grid only, no DOM, no canvas
│   ├── setCell(col, row, ch, color, attr)  — grid always; spans if DOM
│   ├── clearRow(row)
│   ├── clearScreen()
│   ├── putstr(col, row, str, color, attr)
│   ├── scrollUp()             — shift rows up (REPL scroll)
│   ├── setCursor(col, row)    — always updates state; DOM cursor if spans
│   ├── getCursor()
│   ├── cursSet(visibility)
│   ├── flush()
│   ├── colorToCss(color)      — CLR_* int or CSS string → CSS hex
│   ├── getPreElement()        — return <pre> for sizing/alignment
│   ├── getCanvas()            — return graphics canvas or null
│   └── rows, cols, grid[][]
├── class HeadlessTerminal extends Terminal
│   ├── constructor({ rows, cols })        — super(null, ...)
│   ├── getScreenLines/AnsiLines/AttrLines — delegates to screen_capture.js
│   └── setScreenLines/AnsiLines           — delegates to screen_capture.js
└── exports: Terminal, HeadlessTerminal, CLR_*, ATR_*
```

```
js/screen_capture.js (NEW — ~100 lines)
├── getScreenLines(grid, rows, cols)       — plain text capture
├── getScreenAnsiLines(grid, rows, cols)   — ANSI SGR color/attr encoded
├── setScreenLines(grid, rows, cols, lines) — restore from plain text
├── setScreenAnsiLines(grid, rows, cols, lines) — restore from ANSI (incl. DEC)
├── getAttrLines(grid, rows, cols)         — attribute plane as digit strings
└── DEC_TO_UNICODE mapping table
```

```
js/nethack_display.js (REFACTORED from display.js — ~800 lines)
├── class NethackDisplay extends Terminal
│   ├── constructor(containerId)
│   │     super(containerId, { rows: TERMINAL_ROWS })
│   │     inits game state (messages, tempOverlay, cellInfo, ...)
│   │     if containerId → _setupHover()
│   ├── setNhgetch(fn)               — for --More-- key reads
│   ├── putstr_message(msg)          — C topl.c: --More-- system
│   ├── renderMessageWindow()
│   ├── renderMoreMarker()
│   ├── renderStatus(player)         — C botl.c: status bar
│   ├── renderMap(gameMap, player, fov, flags)
│   ├── showMenu(title, items, readKey)
│   ├── renderOverlayMenu(lines, opts)
│   ├── renderChargenMenu(lines)
│   ├── renderLoreText(lines, offx)
│   ├── renderTextPopup(lines, opts)
│   ├── clearTextPopup()
│   ├── renderTombstone(name, gold, deathLines, year)
│   ├── renderTopTen(lines, startRow)
│   ├── cursorOnPlayer(player)
│   └── toplin, toplines, messages[], messageNeedsMore
│
│   NethackDisplay(null) works headless — same class, no DOM.
│   No HeadlessNethackDisplay subclass needed.
│
└── exports: NethackDisplay
```

```
js/trace.js (EXTRACTED — ~60 lines, shared)
├── parseTraceCellSpec, parseTraceStepSpec
├── traceStepForDisplay, formatTraceChar
├── traceCaller, maybeTraceCellWrite
└── Used by Terminal.setCell and Terminal.setCursor
```

## Method Catalog

### Terminal (shared base — all apps)

| Method | Signature | Description |
|--------|-----------|-------------|
| `constructor` | `(containerId, { rows?, cols? })` | DOM container + optional dimensions (default 80×24) |
| `setCell` | `(col, row, ch, color?, attr?)` | Set one cell (0-based); color = CLR_* int or CSS string |
| `clearRow` | `(row)` | Clear row to spaces (0-based) |
| `clearScreen` | `()` | Clear all cells, cursor to (0,0) |
| `putstr` | `(col, row, str, color?, attr?)` | Write string at position |
| `setCursor` | `(col, row)` | Move cursor (0-based) |
| `getCursor` | `() → [col, row, visible]` | Get cursor state |
| `cursSet` | `(visibility)` | Show/hide cursor |
| `flush` | `()` | Render to DOM (no-op in headless) |
| `colorToCss` | `(color) → string` | Convert CLR_* int or CSS string to hex |
| `scrollUp` | `()` | Shift all rows up by one, clear last row (REPL scroll) |
| `getPreElement` | `() → Element` | Return `<pre>` DOM element (for sizing/alignment) |
| `getCanvas` | `() → Canvas\|null` | Return graphics canvas if enabled, null otherwise |
| `setFocusPoint` | `(col, row)` | Hint for mobile viewport auto-centering |
| `moveCursor` | `(x, y)` | 1-based cursor move (legacy compat for rogue/hack curses) |
| `putChar` | `(x, y, ch, attr?)` | 1-based cell write (legacy compat for rogue/hack curses) |

**Dimensions**: NetHack uses 80×21 (TERMINAL_ROWS from const.js); Rogue, Hack,
Logo, BASIC all use 80×24. The constructor accepts `{ rows, cols }` options,
defaulting to 80×24. NetHack passes `{ rows: 21 }`.

### HeadlessTerminal (extends Terminal — simple apps testing)

| Method | Signature | Description |
|--------|-----------|-------------|
| `constructor` | `({ rows?, cols? })` | `super(null, ...)` — no DOM |
| `getScreenLines` | `()` | Convenience: `getScreenLines(this.grid, ...)` |
| `getScreenAnsiLines` | `()` | Convenience: `getScreenAnsiLines(this.grid, ...)` |
| `setScreenLines` | `(lines)` | Convenience: `setScreenLines(this.grid, ...)` |
| `setScreenAnsiLines` | `(lines)` | Convenience: `setScreenAnsiLines(this.grid, ...)` |
| `getAttrLines` | `()` | Convenience: `getAttrLines(this.grid, ...)` |

HeadlessTerminal is a thin wrapper: `Terminal(null)` + convenience methods
that delegate to `screen_capture.js` free functions. Used by rogue, hack,
basic, and logo test harnesses that don't need NetHack's game logic.

### NethackDisplay (extends Terminal — NetHack, browser or headless)

| Usage | Constructor | DOM | Hover |
|-------|-------------|-----|-------|
| Browser | `NethackDisplay('game-container')` | Yes | Yes |
| Tests/replay | `NethackDisplay(null)` | No | No |

Same class in both modes. Methods stay the same as current Display class,
but inherit terminal rendering from Terminal instead of reimplementing it.
Holds all NetHack-specific state: messages[], toplines, _tempOverlay,
cellInfo[][], renderMap, newsym, etc. Test code reads the grid via
`screen_capture.js` free functions.

## Dependencies

### Who imports what today:

| Consumer | Current import | New import |
|----------|---------------|------------|
| `js/nethack.js` | `Display` from `js/display.js` | `NethackDisplay` from `js/nethack_display.js` |
| `shell/js/entry.js` | `Display` from `js/display.js` | `Terminal` from `js/terminal.js` |
| `rogue/js/rogue.js` | `Display` from `rogue/js/display.js` | `Terminal` from `js/terminal.js` |
| `hack/js/firsthack.js` | `Display` from `hack/js/display.js` | `Terminal` from `js/terminal.js` |
| `basic/js/entry.js` | `LogoDisplay` from `basic/js/display.js` | `Terminal` from `js/terminal.js` |
| `logo/js/entry.js` | `LogoDisplay` from `logo/js/display.js` | `Terminal` from `js/terminal.js` |
| `js/headless.js` | `HeadlessDisplay` (1189 lines) | `NethackDisplay(null)` + `screen_capture.js` |
| `js/replay_core.js` | `HeadlessDisplay` from `js/headless.js` | `NethackDisplay(null)` + `screen_capture.js` |
| `rogue/test/node_runner.mjs` | MockDisplay from `mock_display.mjs` | `HeadlessTerminal` from `js/terminal.js` |

### Internal dependencies of map_render.js:

```
js/map_render.js
├── imports from js/const.js (ROOM, WALL, DOOR, etc.)
├── imports from js/monst.js (monster flags)
├── imports from js/objects.js (object classes)
├── imports from js/you.js (player state)
└── calls display.setCell() — pure output, no DOM dependency
```

## Phasing

### Phase 0: Pre-refactor cleanup (~1 day)

Clean up the codebase before extracting Terminal. This phase changes no
architecture — it only removes dead code, breaks circular dependencies,
and separates concerns within existing files.

**0a. Delete dead code from display.js** (~76 lines):
- `showMenu()` — 48 lines, zero callers
- `doredraw()` — 11 lines, zero callers
- `tether_glyph()` — 10 lines, zero callers
- `tp_sensemon()` — 7 lines, zero callers

**0b. Move test-only exports** from display.js to a test helper:
- 13 functions with zero production callers (only test imports):
  `display_monster`, `display_warning`, `docrt_flags`, `fn_cmap_to_glyph`,
  `howmonseen`, `knowninvisible`, `mon_warning`, `newsym_force`,
  `seeWithInfraredForMap`, `set_seenv`, `show_mon_or_warn`,
  `mon_overrides_region`, `mimic_light_blocking`, `swallow_to_glyph`
- Move to `js/display_test_helpers.js`, update test imports

**0c. Extract non-display code from headless.js** (~640 lines → new files):
- `js/headless_runtime.js`: `createHeadlessInput`, `headlessFromSeed`,
  `headlessStart`, `finalizeHeadlessReadyState`, `createHeadlessGame`,
  `generateMapsWithCoreReplay`, `generateStartupWithCoreReplay`,
  session/chargen key extraction helpers
- `js/character_normalize.js`: `normalizeRoleIndex`, `normalizeGender`,
  `normalizeAlignment`, `normalizeRace`, `buildInventoryLines`
- headless.js retains only: HeadlessDisplay class + constants + DEC_TO_UNICODE

**0d. Break circular dependencies** in display.js:
- display.js ↔ invent.js (via `update_inventory`)
- display.js ↔ pager.js (via `do_lookat`, `format_do_look_html`)
- display.js ↔ mondata.js (via `emits_light`, `infravisible`)
- display.js ↔ worm.js (via `worm_known`)
- Strategy: Move the small number of display→X imports to lazy
  `await import()` inside the functions that need them, breaking the
  static circular chain.

**Quality gate**:
- [ ] `display.js` exports drop from 65 to ~44 (21 removed/moved)
- [ ] `headless.js` drops from 1,823 to ~1,200 lines
- [ ] Zero circular dependency warnings (verify with `madge --circular`)
- [ ] All 568 NetHack parity sessions pass (unchanged behavior)
- [ ] All 223 Rogue parity sessions pass
- [ ] All 202 Hack parity sessions pass
- [ ] All 67+66 Logo/BASIC tests pass
- [ ] Shell `!` works from rogue and nethack

### Phase 1: Extract Terminal base class (~2 days)

Create `js/terminal.js` and `js/screen_capture.js`. Display and
HeadlessDisplay both extend Terminal. No consumer changes yet — the
existing `Display` and `HeadlessDisplay` class names are preserved as
subclasses.

**1a. Create `js/terminal.js`** (~300 lines):
- Extract from Display: constructor (DOM setup), setCell, clearRow,
  clearScreen, putstr, setCursor, getCursor, cursSet, flush, scrollUp
- Grid format: `grid[r][c] = { ch, color, attr }` (canonical)
- Constructor: `Terminal(containerId, { rows, cols, graphicsCanvas })`
  - containerId=null → grid only, no DOM
- `colorToCss(color)` — handles CLR_* int and CSS hex strings
- 1-based legacy wrappers: `moveCursor(x,y)`, `putChar(x,y,ch,attr)`
- Exports: Terminal, CLR_*, ATR_*

**1b. Create `js/screen_capture.js`** (~100 lines):
- Extract from HeadlessDisplay: getScreenLines, getScreenAnsiLines,
  setScreenLines, setScreenAnsiLines, getAttrLines
- Pure functions taking `(grid, rows, cols)` — no class dependency
- Include DEC_TO_UNICODE mapping for ANSI parsing

**1c. Create HeadlessTerminal** in terminal.js (~30 lines):
- `class HeadlessTerminal extends Terminal` — `super(null, opts)`
- Convenience wrappers for screen_capture.js functions

**1d. Create `js/trace.js`** (~60 lines):
- Extract duplicated trace functions from display.js and headless.js

**1e. Rebase Display and HeadlessDisplay**:
- `class Display extends Terminal` — delete duplicated methods, keep
  all NetHack-specific methods
- `class HeadlessDisplay extends Terminal` — delete duplicated methods,
  **migrate from parallel arrays to grid objects**
- Both classes keep their existing names and exports — no consumer changes

**Grid migration** (the hardest part of Phase 1):
HeadlessDisplay currently stores cells in parallel arrays:
```js
this.grid[r][c] = ' '       // char (string)
this.colors[r][c] = CLR_GRAY // number
this.attrs[r][c] = 0        // number
```
After: inherits Terminal's `grid[r][c] = {ch, color, attr}` objects.
~26 locations in HeadlessDisplay read parallel arrays and need updating.
The session snapshot code (`getScreenAnsiLines` etc.) moves to
screen_capture.js and reads grid objects.

**Quality gate**:
- [ ] `js/terminal.js` exists with Terminal + HeadlessTerminal classes
- [ ] `js/screen_capture.js` exists with 5 free functions
- [ ] `js/trace.js` exists with 6 trace functions
- [ ] display.js is now `class Display extends Terminal` (~2,500 lines, down from 3,117)
- [ ] headless.js HeadlessDisplay extends Terminal (~600 lines, down from ~1,200)
- [ ] No parallel arrays remain in HeadlessDisplay
- [ ] **568/568 NetHack parity sessions pass** (screen + cursor + RNG)
- [ ] **223/223 Rogue parity sessions pass** (screen + cursor + standout)
- [ ] **202/202 Hack parity sessions pass**
- [ ] 67+66 Logo/BASIC tests pass
- [ ] Shell works from rogue and nethack
- [ ] ANSI round-trip test: `setScreenAnsiLines(getScreenAnsiLines(grid))`
  produces identical grid for all 16 colors × 3 attributes
- [ ] Browser: all 6 apps render identically (manual visual check)
- [ ] No import changes in any consumer file (Display/HeadlessDisplay
  names preserved)

### Phase 2: Migrate simple apps to Terminal (~2 days)

Replace the 4 per-app Display classes with Terminal. Do one app at a time
with its own quality gate — don't batch them.

**2a. Rogue** (~0.5 day):
- Delete `rogue/js/display.js` (239 lines)
- `rogue/js/rogue.js` imports `Terminal` from `js/terminal.js`
- Rogue's `curses.js:draw()` calls Terminal's `putChar(c+1, r+1, ch, attr)`
  and `moveCursor(x+1, y+1)` — these 1-based wrappers are on Terminal
- Rogue's screen capture (`rogue.js` reads `display.grid[r]`) needs
  adaptation: switch from `grid[r].slice(1).join('')` (1-based string
  array) to iterating `grid[r-1][c].ch` (0-based object cells)
- Delete `rogue/test/mock_display.mjs` — use HeadlessTerminal
- **Gate**: 223/223 rogue parity sessions, shell `!` from rogue, browser play

**2b. Hack** (~0.5 day):
- Delete `hack/js/display.js` (188 lines)
- **Complication**: Hack game code calls `display.putString()`,
  `display.putCharAtCursor()`, `display.clearToEol()` directly (9+2+2 call
  sites in pri.js, do.js, do1.js, hack.js). Unlike rogue, hack has no
  curses.js intermediary.
- Two options:
  1. Add `putString`/`putCharAtCursor`/`clearToEol` to Terminal (adds 3
     small methods to the shared class — ~20 lines)
  2. Create `hack/js/curses.js` adapter layer (like rogue has)
- Option 1 is pragmatic: these are standard terminal operations (tty
  drivers have them). They're useful for future games too (Larn, Robots).
- Hack's screen capture (`firsthack.js` reads `display.grid[r]`) needs
  same adaptation as rogue.
- Delete `hack/test/mock_display.mjs` — use HeadlessTerminal
- **Gate**: 202/202 hack parity sessions, browser play

**2c. Logo + BASIC** (~0.5 day):
- Delete `logo/js/display.js` and `basic/js/display.js` (168 lines each,
  identical files)
- Both import Terminal; pass CSS hex color strings to setCell
- Both use `scrollUp()` and `getPreElement()` — already on Terminal
- **Gate**: 67 Logo + 66 BASIC tests pass, browser play with turtle
  graphics overlay

**2d. Shell standalone** (~0.5 day):
- `shell/js/entry.js` imports Terminal instead of Display
- Shell already uses only Terminal-level methods (clearRow, setCell,
  putstr, setCursor, clearScreen, flush)
- Shell's `_captureScreen()` reads `grid[r][c].ch` and `.color` — works
  unchanged with `{ch, color, attr}` objects
- **Gate**: Shell standalone, shell from rogue `!`, shell from nethack `#shell`

**Phase 2 cumulative quality gate**:
- [ ] 4 per-app Display files deleted (595 lines removed)
- [ ] 2 mock display files deleted
- [ ] All parity suites green (568 + 223 + 202 sessions)
- [ ] All test suites green (Logo, BASIC)
- [ ] All 6 apps + shell work in browser
- [ ] No per-app Display class exists anywhere — only Terminal,
  HeadlessTerminal, and Display (NetHack)

### Phase 3: Unify NethackDisplay (~2 days)

The highest-risk phase. Merge Display and HeadlessDisplay into one
NethackDisplay class that works in both browser and headless mode.

**3a. putstr_message unification** (the critical path):
- HeadlessDisplay.putstr_message (337 lines) has **117 extra lines** vs
  Display.putstr_message (220 lines). The extra lines are encumbrance
  snapshot hacks — display code saving/restoring game state.
- **Prerequisite**: Fix the game logic bug (useup/pline ordering) that
  caused this hack. Once the game posts messages before consuming items,
  the status bar renders correctly without display-side intervention.
- Strategy: after fixing the game bug, use Display's simpler 220-line
  version as canonical. Delete all encumbrance snapshot code.
- **Must verify**: run 568 parity sessions with the fixed game logic +
  simplified putstr_message to confirm no regression.

**3b. renderMap unification**:
- Display.renderMap (230 lines): inlines visibility logic + writes
  cellInfo for hover
- HeadlessDisplay.renderMap (24 lines): delegates to newsym(), no cellInfo
- Strategy: keep Display's 230-line version as the canonical one. In
  headless mode, cellInfo writes are harmless (arrays nobody reads).
  The 24-line headless version is a performance optimization (skip hover
  enrichment), not a correctness requirement. If performance matters
  later, add a `this._skipHoverInfo` flag.
- **Must verify**: headless parity sessions produce identical screens
  with the browser renderMap (they should — both call newsym() for the
  actual cell decisions).

**3c. Create NethackDisplay**:
- Rename `js/display.js` → `js/nethack_display.js`
- `class NethackDisplay extends Terminal`
- Constructor: `NethackDisplay(containerId)` → `super(containerId, {rows: TERMINAL_ROWS})`
- if containerId → _setupHover()
- All NetHack methods: putstr_message (unified), renderMap (Display's
  version), renderStatus, menus, popups, tombstone, temp overlay, etc.
- All 70+ free functions (newsym, vision, monster visibility) remain
  as module-level exports in nethack_display.js

**3d. Delete HeadlessDisplay**:
- headless.js no longer defines HeadlessDisplay
- All code that did `new HeadlessDisplay()` now does `new NethackDisplay(null)`
- headless.js retains only: headless_runtime functions (already extracted
  in Phase 0c), re-exports of NethackDisplay for backward compat if needed

**3e. Verify `_gstate` coupling**:
- display.js reads global `_gstate` in 18 locations as fallback for
  player/map context
- After unification, NethackDisplay(null) must work in environments where
  `_gstate` is initialized (headless game factories set this up)
- Verify no code path crashes when `_gstate` is null/undefined and
  explicit context is provided

**Phase 3 quality gate**:
- [ ] `js/nethack_display.js` exists as single file
- [ ] HeadlessDisplay class deleted
- [ ] `NethackDisplay(null)` creates headless instance
- [ ] `NethackDisplay('game-container')` creates browser instance
- [ ] **568/568 NetHack parity sessions pass** with unified putstr_message
- [ ] **568/568 sessions pass with unified renderMap** (Display's version)
- [ ] Screen capture via `getScreenAnsiLines(display.grid, ...)` produces
  identical output to old HeadlessDisplay.getScreenAnsiLines()
  (diff every session's captured screens before/after)
- [ ] Browser: NetHack renders identically (manual visual comparison)
- [ ] Browser: --More-- message timing matches pre-refactor behavior
- [ ] Shell works with NethackDisplay (via Terminal inheritance)
- [ ] All rogue/hack/logo/basic tests still pass (they don't touch
  NethackDisplay, but verify no import breakage)
- [ ] Codebase line count:
  - terminal.js: ~300 lines
  - screen_capture.js: ~100 lines
  - trace.js: ~60 lines
  - nethack_display.js: ~2,500 lines (down from 3,117 + 1,189 headless)
  - headless.js: ~200 lines (runtime helpers only)
  - Per-app display files: 0 (deleted)

## Audit Findings

### Code removed by refactoring

| What | Lines | Phase |
|------|-------|-------|
| Dead code in display.js | 76 | 0a |
| Test-only exports moved | ~200 | 0b |
| Non-display code in headless.js | ~640 | 0c |
| rogue/js/display.js | 239 | 2a |
| hack/js/display.js | 188 | 2b |
| basic/js/display.js | 168 | 2c |
| logo/js/display.js | 168 | 2c |
| mock_display.mjs files | ~150 | 2a,2b |
| HeadlessDisplay class | ~1,200 | 3d |
| Duplicated trace functions | ~60 | 1d |
| **Total removed** | **~3,089** | |

### Code added by refactoring

| What | Lines | Phase |
|------|-------|-------|
| terminal.js | ~300 | 1a |
| screen_capture.js | ~100 | 1b |
| trace.js | ~60 | 1d |
| display_test_helpers.js | ~200 | 0b |
| headless_runtime.js | ~400 | 0c |
| character_normalize.js | ~80 | 0c |
| **Total added** | **~1,140** | |

**Net reduction: ~1,950 lines** (mostly from dedup elimination).

### Cautions from the audit

**1. putstr_message encumbrance hack must be deleted, not unified.**
HeadlessDisplay's putstr_message has 117 extra lines that save/restore
`player.encumbrance` around display calls. This is a hack — the display
layer should have zero knowledge of encumbrance or any game state. The
root cause is a **game logic bug**: JS calls `useup()` (consumes an item)
before posting the message about using it, so when `--More--` triggers a
status bar refresh, the status bar shows the wrong encumbrance. In C, the
message is posted first, then `useup()` is called after.

**The right fix** (prerequisite to Phase 3): Fix the call ordering in the
game logic so that messages are posted before items are consumed, matching
C's sequencing. Then delete all 117 lines of encumbrance snapshot code
from putstr_message. The display should just display — it should never
know about, read, or mutate encumbrance.

**Mitigation**: Find and fix the specific `useup()` / `pline()` call sites
where ordering differs from C. Run 568 parity sessions to confirm the game
logic fix produces correct status bar output without any display-side hacks.

**2. renderMap unification adds ~200 lines of hover/cellInfo work to
headless mode.** This is wasted computation but not incorrect. If headless
test performance degrades noticeably, add a `this._headlessMode` flag to
skip cellInfo writes.
**Mitigation**: Benchmark session replay speed before/after. Accept up to
10% slowdown; investigate if worse.

**3. Hack has no curses.js layer.** Game code calls display.putString(),
putCharAtCursor(), clearToEol() directly from pri.js, do.js, hack.js.
Terminal must provide these or hack needs a curses adapter.
**Mitigation**: Add putString/putCharAtCursor/clearToEol/getChar to
Terminal (~30 lines). These are standard terminal operations useful for
future games (Larn, Robots).

**4. Circular dependencies must be broken before Phase 1.** display.js
has circular imports with invent.js, pager.js, mondata.js, worm.js. If
Terminal inherits these, the cycle propagates.
**Mitigation**: Phase 0d breaks cycles via lazy imports before extraction.

**5. All apps read `display.grid` directly for screen capture.** Rogue,
hack, and shell all access `display.grid[r][c]`. The grid format change
(string → object cells) will break these reads.
**Mitigation**: Fix each app's grid reads during its Phase 2 migration.
Verify via parity tests (every session compares captured screens).

**6. HeadlessDisplay's parallel array migration touches ~26 locations.**
This is mechanical but tedious. Each location reads `this.grid[r][c]`
(string), `this.colors[r][c]` (int), `this.attrs[r][c]` (int) and
must switch to `this.grid[r][c].ch`, `.color`, `.attr`.
**Mitigation**: Do this in Phase 1e as a focused, testable change.
Run ANSI round-trip tests to verify correctness.

**7. The _gstate global coupling (18 locations) is a latent risk.** After
unification, NethackDisplay(null) runs in headless environments where
_gstate may or may not be initialized. All 18 locations use `?.` optional
chaining, so null access won't crash, but could produce wrong results.
**Mitigation**: Verify via parity tests. The 568 sessions exercise all
display code paths with explicit context parameters.

## Testing Strategy

### Per-phase quality gates

Every phase has a checklist (see Phasing section above). The philosophy:
**if a gate fails, fix it before moving to the next phase.** No partial
migrations — each phase leaves the codebase in a clean, fully-tested state.

### Automated regression (existing tests)

These must pass at every phase boundary:
- **NetHack**: 568 parity sessions (screen + cursor + RNG — 100% match)
- **Rogue**: 223 parity sessions (screen + cursor + standout — 100% match)
- **Hack**: 202 parity sessions (screen — 100% match)
- **Logo**: 67 tests
- **BASIC**: 66 tests
- **Shell**: `!` from rogue, `#shell` from nethack, standalone

### New tests to add (before starting Phase 1)

- **Terminal unit tests**: setCell, clearRow, clearScreen, putstr,
  setCursor, getCursor, cursSet, flush, scrollUp, colorToCss,
  putChar (1-based), moveCursor (1-based), putString, putCharAtCursor,
  clearToEol, getChar
- **Terminal color tests**: CLR_* integers (0–15) and CSS hex strings
  both render correct CSS on spans
- **ANSI round-trip test**: For each of the 16 colors × 7 attr combos,
  write cells to a HeadlessTerminal, call getScreenAnsiLines, then
  setScreenAnsiLines on a fresh instance, verify grid is identical
- **Unicode round-trip test**: Box-drawing (─│┌┐└┘), middle dot (·),
  diamond (◆), degree (°), pi (π) all survive ANSI capture/restore
- **DEC Special Graphics parse test**: Feed `\x0e` + DEC chars + `\x0f`
  to setScreenAnsiLines, verify Unicode output
- **Screen diff test**: For each of the 568 NetHack sessions, capture
  screens with old HeadlessDisplay and new NethackDisplay(null), diff
  every frame — zero differences required

### Measurable outcomes (after all phases)

| Metric | Before | After | How to measure |
|--------|--------|-------|----------------|
| Display source lines | 5,703 | ~3,200 | `wc -l` on display files |
| Duplicated methods | 25 | 0 | grep for method names in both files |
| Display classes | 7 | 3 | grep for `class.*Display\|class.*Terminal` |
| Display files | 8 | 5 | `ls js/terminal.js js/screen_capture.js js/nethack_display.js js/trace.js js/headless.js` |
| Per-app display files | 4 | 0 | verify rogue/hack/basic/logo have no display.js |
| Circular dependencies | 4 | 0 | `madge --circular js/` |
| Dead exports in display | 17 | 0 | grep + call count |
| Parity session pass rate | 100% | 100% | `npm test` equivalent |
| Browser rendering | Identical | Identical | Visual comparison screenshots |

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| Total display lines | 5,703 | ~1,600 |
| Duplicated methods | 25 | 0 |
| Display classes | 7 (Display, HeadlessDisplay, 4×app Display, MockDisplay) | 3 (Terminal, HeadlessTerminal, NethackDisplay) |
| Display files | 6 | 3 (terminal.js, screen_capture.js, nethack_display.js) |
| Apps sharing Terminal | 1 (nethack+shell) | 6 (all) |
| Grid cell format | 4 different formats | 1 canonical `{ch, color, attr}` |
| Color support | Per-app (none/hex/int) | Unified (int or CSS string) |
| ANSI session format | Implicit | Documented, standard SGR |
| Character encoding | ASCII + some Unicode | Full Unicode (ASCII/DEC/IBM/emoji ready) |
| Shell works in rogue | with shims | natively |
| Shell works in hack | no | yes |
| Shell works in basic/logo | no | yes (if desired) |
