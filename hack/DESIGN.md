# Design: Hack 1982 JS Port

## Architecture

### Module System
ES modules (`type="module"`). All imports are explicit. No bundler — files loaded directly in the browser.

### Module Load Order (dependency graph)
```
const.js        ← leaf (no imports)
data.js         ← imports const.js
gstate.js       ← leaf (exports game, setGame)
game.js         ← imports const.js, data.js
rng.js          ← imports gstate.js
mklev.js        ← imports const.js, rng.js, gstate.js
lev.js          ← imports const.js, rng.js, gstate.js, mklev.js
pri.js          ← imports const.js, gstate.js, display.js
mon.js          ← imports const.js, data.js, rng.js, gstate.js, pri.js
do1.js          ← imports const.js, rng.js, gstate.js, pri.js, mon.js
do.js           ← imports const.js, data.js, rng.js, gstate.js, pri.js, mon.js, do1.js
hack.js         ← imports const.js, rng.js, gstate.js, pri.js, mon.js, lev.js
main.js         ← imports everything above
browser_main.js ← imports main.js, display.js, input.js
```

### Async Game Loop
The game loop in `main.js` is `async function gameLoop()`. Every operation that might need to
await user input is `async`. The key rule: **any function that calls `pline()` must be async**,
because `pline()` pauses for `--More--`.

`parse()` and `rhack()` are async because they await key input.
`domove()`, `dochug()`, `buzz()`, `amon()`, `movemon()` are async because they call pline.

### Global State
All C globals live on a single `game` object (same pattern as Menace NetHack port).
`gstate.js` exports `game` (the live reference) and `setGame(g)` (called once at init).

### C `char` → JS `number`
C uses `char` for most fields (signed, -128..127 or unsigned 0..255 depending on platform).
In JS we use plain numbers. We don't clamp — the C behavior emerges naturally.

### C `struct` → JS plain object
Structs become plain JS objects created by factory functions:
- `makeCell()` → `struct rm`
- `makeMonst(data)` → `struct monst`
- `makeObj()` → `struct obj`
- `makeGen(x,y,flag)` → `struct gen`

### Linked lists
Preserved as JS linked lists using the same `nmon`, `nobj`, `ngen` pointers.
Head pointers: `game.fmon`, `game.fobj`, `game.fgold`, `game.ftrap`, `game.fstole`.

### RNG
The C `rand()` is glibc's LCG: `seed = seed * 1103515245 + 12345; return (seed >> 16) & 0x7fff`
All RNG calls are logged to `game.rngLog` for parity testing.

### Display
`display.js` maintains an 80×24 character grid (22 map rows + 2 status rows).
`pri.js` talks to display via `display.putChar(x, y, ch)` and `display.moveCursor(x, y)`.
The display renders to a `<pre>` or canvas element in `index.html`.

### Input
`input.js` provides `async function getKey()` — same async queue pattern as Menace.

### Level Storage
C saves/loads levels to files. JS stores them in `game.savedLevels[n]` (array indexed by dlevel).
`savelev()` serializes the current level state to `game.savedLevels[game.dlevel]`.
`getlev()` deserializes from that same array.

### No termcap / No terminal
All `fputs(CL,stdout)` etc. are replaced by `display.*` calls in `pri.js`.
The VTONL (VT100 no-lib) variant of the C code is the reference — it uses escape sequences
that map cleanly to our display operations.

## Key Differences from C

1. **mklev is inlined**: C ran mklev as a separate process. JS calls `generatelevel(dlevel)` directly.
2. **No file I/O**: Levels saved to JS objects, not files. No save/restore to disk (Phase 5: localStorage).
3. **No signals**: No SIGQUIT/SIGINT handling needed.
4. **No locking**: No multi-user lock files.
5. **No terminal setup**: No termcap/tgetent. Display is always 80×22 (map) + 2 status lines.

## Naming Conventions

- C `struct rm` field `new` → JS field `isnew` (reserved word in old JS)
- C `mklev.c`'s `g_at()` → JS `g_at_lev()` (avoids name collision with `hack.mon.c`'s `g_at()`)
- C `mklev.c`'s `makemon()` → JS `makemon_lev()` (similarly)
- C `mklev.c`'s `mkobj()` → JS `mkobj_lev()` (similarly)
- C `mklev.c`'s `savelev()` → JS `savelev_lev()` (similarly)
- C `pow()` (not math pow) → JS `pow2()` (to avoid collision with Math.pow)
