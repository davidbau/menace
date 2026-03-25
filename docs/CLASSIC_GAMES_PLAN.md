# Classic Unix Games Development Plan

## Vision

Mazes of Menace already hosts three games from the roguelike lineage (Rogue
1980, Hack 1982, NetHack 1987) plus Logo and BASIC interpreters, all sharing
a unified Terminal display and Shell. Adding six more classic games fills
out the historical canon: the very first video game, the foundational text
adventure, the most popular mainframe game ever, three beloved BSD games,
and the platform's first non-roguelike arcade-style titles.

All six games run **inside the Shell** — you type `spacewar`, `adventure`,
`trek`, `larn`, `robots`, or `tetris` at the `$` prompt, just like on a
1980s Unix workstation. Each game uses the shared Terminal for display
(text plane, optional graphics plane) and the shared Input for keyboard
handling.

## The Six Games

### 0. Spacewar! — 1962

**Authors**: Steve Russell, Martin Graetz, Wayne Wiitanen (MIT)
**Source**: ~500 lines of game logic (modern recreations)
**License**: Public domain (freely shared since 1962)
**I/O**: Graphics — vector display (canvas in our implementation)

**Why this game**: It's the Big Bang. The first real video game, written on
a PDP-1 — one of Ken Olsen's first DEC machines — at MIT. Two spaceships
orbit a central star with Newtonian gravity, firing torpedoes at each
other. It spread to every PDP installation in the world, making it the
first software to propagate virally. Nolan Bushnell saw it at Stanford
and founded Atari. Every video game traces its lineage back to Spacewar!.

It's also the historically perfect bookend for this project: the first
video game (1962) on the same platform as the roguelikes it eventually
led to. The PDP-1 that ran Spacewar! was at MIT; DEC shipped PDP-11s
that ran Unix; BSD Unix gave us Rogue, Hack, and NetHack.

**Gameplay**:
- Two ships in 2D space with Newtonian physics (momentum, gravity)
- Central star provides gravitational pull — strategic hazard
- Torpedoes follow ballistic arcs (affected by gravity)
- Hyperspace jump — teleport randomly (risk: materialize inside the star)
- Two-player simultaneous input, or AI opponent
- ~30fps real-time rendering

**Architecture**: This is the first game to use Terminal's **graphics
canvas** for the primary display (not text). Ships, torpedoes, and the
star are drawn as vector graphics on the `<canvas>` element using
`ctx.moveTo()`/`ctx.lineTo()`. The text plane can overlay score/status.

The original PDP-1 used a vector (calligraphic) display — points and
lines drawn directly on a CRT phosphor. Our canvas renders the same
vector aesthetics: wireframe ships, dot torpedoes, glowing star. The
`image-rendering` CSS doesn't matter here since we're drawing vectors,
not pixels — lines are sharp at any resolution.

**Port approach**: Direct JS implementation. The physics (gravity,
momentum, collision) is straightforward 2D vector math. Ship shapes are
~10 vertices each. The game loop runs on `requestAnimationFrame` at
~30fps. Two-player input via keyboard (left player: a/s/d/f/g, right
player: j/k/l/;/') or single-player vs AI.

**Estimated effort**: 1–2 days. Small game logic (~500 lines), well-
understood physics. The main novelty is being our first graphics-canvas
game (Logo's turtle is a library, not a game loop).

### 1. Adventure (Colossal Cave) — 1976

**Authors**: Will Crowther (1975 original), Don Woods (1977 expansion)
**Source**: BSD `adventure` from bsd-games (~3,000 lines C + data files)
**License**: Public domain (BSD version by Jim Gillogly, 1977)
**I/O**: Pure stdio — `printf`/`gets`, no curses

**Why this game**: It's the ur-game. The genre "adventure game" is named
after it. "You are in a maze of twisty little passages, all alike" is the
most famous line in gaming. The name "Mazes of Menace" (NetHack's subtitle)
is a direct homage. Not including Adventure would be like a museum of rock
music that skips Chuck Berry.

**Architecture**: The simplest port. Adventure uses line-oriented text I/O:
print a room description, read a two-word command, repeat. No cursor
addressing, no screen clearing, no colors. It's essentially a conversation.

**Data model**: The game world is defined in data files (rooms, objects,
vocabulary, messages) read at startup. The C code is a state machine that
processes commands against the world model. Some versions compile the data
into C arrays; others read external files.

**Port approach**: JS translation of the C game logic + data. Interface
through Shell's text I/O (print lines, read input). Could also run as a
standalone app with Terminal, but Shell is the natural home — it's how you
played Adventure on Unix.

**Estimated effort**: 1–2 days. Smallest game, simplest I/O.

### 2. Star Trek — 1971

**Author**: Mike Mayfield (HP BASIC, 1972 rewrite of his 1971 original)
**Source**: Super Star Trek BASIC listing (~300 lines BASIC)
**License**: Public domain (freely shared since 1972)
**I/O**: Pure `PRINT`/`INPUT` — no curses

**Why this game**: The most popular mainframe game of the 1970s. Played on
every university timeshare system. Published in David Ahl's *BASIC Computer
Games* (1978), the first million-selling computer book. It's also a
spectacular demo of our BASIC interpreter — running real historical software,
not toy programs.

**Gameplay**: Command the Enterprise through an 8×8 grid of quadrants, each
containing an 8×8 sector grid. Fire phasers and photon torpedoes at
Klingons, dock at starbases for repairs, avoid running out of energy or
time. The sector display is a text grid rendered via `PRINT` statements.

**Port approach**: **Run the original BASIC source in our BASIC interpreter.**
This is the ideal approach — it proves the interpreter handles real programs.
The Mayfield/Ahl BASIC source uses standard features: `DIM`, `FOR/NEXT`,
`GOSUB`, `INT()`, `RND()`, `TAB()`, `INPUT`, `PRINT`. Our BASIC-PLUS V1.5
interpreter should handle all of these. If there are dialect gaps (e.g.,
`DEF FN`, `ON GOTO`), fix the interpreter, not the game.

**Estimated effort**: 1–2 days. Mostly BASIC interpreter compatibility
fixes if any. The game itself needs no porting — just load and run.

### 3. Larn — 1986

**Author**: Noah Morgan, UC Santa Cruz
**Source**: ~8,000 lines C, curses-based
**License**: Public domain (posted to USENET comp.sources.games, 1986)
**I/O**: curses (full terminal control)

**Why this game**: Larn completes the roguelike trilogy — Rogue (the
original), Hack (adds complexity), Larn (adds an overworld and time
pressure). It's the least-known of the three but arguably the most
innovative for 1986:

- **Town level**: Persistent surface with a bank, store, trading post,
  school, and pharmacy. You return here between dungeon runs.
- **Time limit**: Your daughter is dying. A "mobuls" counter ticks down.
  You can't grind forever — you must be efficient.
- **Banking**: Deposit gold at the bank; it earns interest. Gold persists
  across games (the only roguelike of its era to do this).
- **Two dungeons**: The caverns (12 levels, easier) and the volcano
  (3 levels, harder). You choose which to explore based on risk/reward.
- **Spells**: A spell system with ~30 spells, learned from books and
  schools. Magic is central, not supplementary.

**Port approach**: Same as Rogue and Hack — C-to-JS translation with fake
curses, RNG instrumentation, session recording, and parity testing against
a C harness. The curses usage is standard (mvaddch, move, refresh, getch)
and matches patterns we've already built for Rogue.

**Estimated effort**: 3–5 days. Similar scope to Rogue (8K lines vs Rogue's
8.4K). The town level and banking add complexity but no new display
infrastructure. Can reuse the entire parity pipeline (C harness, session
format, replay tests).

### 4. Robots — 1980s (BSD)

**Author**: Ken Arnold (BSD port, 1985; original concept ~1980)
**Source**: ~800 lines C, curses-based
**License**: BSD license (bsd-games)
**I/O**: curses (grid display)

**Why this game**: Pure arcade-puzzle gameplay in a terminal. You're a `@`
on a grid full of `+` robots that move toward you each turn. Lure them into
crashing into each other (they become `*` junk piles that also kill robots).
Simple rules, emergent strategy, instantly addictive. It's the terminal
game people played when they should have been working.

**Gameplay**:
- Move in 8 directions (hjklyubn — same as roguelikes)
- Teleport randomly (risky — you might land on a robot)
- Wait for robots to come to you (risky — but efficient)
- When all robots are dead, next level adds more
- Score = robots destroyed

**Port approach**: Direct JS implementation. At ~800 lines of C with
standard curses, this is small enough to translate in one sitting. The game
logic is a simple loop: read move, update robots, check collisions. No
inventory, no complex state, no save files.

**Estimated effort**: 0.5–1 day. Smallest game. Good warmup or palate
cleanser between bigger ports.

### 5. Tetris — 1989 (BSD)

**Author**: Chris Torek & Darren F. Provine (based on Alexey Pajitnov's
1984 original)
**Source**: ~1,500 lines C, curses-based
**License**: BSD license (bsd-games)
**I/O**: curses (grid display + timer)

**Why this game**: Everyone knows Tetris. It's the most universally
recognized video game ever made. Having it in the Shell alongside roguelikes
and text adventures shows the Terminal's versatility — it's not just for
text games, it handles real-time arcade gameplay too.

**Technical interest**: Tetris is the first game in the collection that
requires **real-time input** — pieces fall on a timer, not waiting for
keystrokes. This means the Terminal/Input system needs a timer or
`setTimeout`-based game loop, not just blocking `getKey()`. This is a
useful capability to add: it also enables future real-time games and
animations.

**Port approach**: Direct JS implementation. The piece definitions,
rotation logic, and collision detection are straightforward. The main
challenge is the real-time input model — need `async` game loop with
`Promise.race(timeout, keypress)` or similar.

**Estimated effort**: 1–2 days. The real-time input is the only novel
infrastructure needed.

## Architecture

### How Games Run Inside Shell

Each game is a Shell command that takes over the terminal:

```
$ adventure
You are standing at the end of a road before a small brick building.
Around you is a forest. A small stream flows out of the building and
down a gully.
> enter building
You are inside a building, a well house for a large spring.
...
$ robots
```

Implementation pattern (same as the existing `!` shell escape in rogue):

```js
// shell/commands.js
case 'adventure': {
    const { Adventure } = await import('../../adventure/js/adventure.js');
    const game = new Adventure(shell.display, () => shell.readKey());
    await game.run();
    break;
}
```

Each game receives:
- **`display`**: A Terminal instance (the Shell's own terminal)
- **`readKey()`**: Async key input function (the Shell's input)

The game takes over the full 80×24 screen, runs until the player quits,
then returns control to the Shell prompt.

### Display Modes by Game

| Game | Display mode | Colors | Real-time | Graphics plane |
|------|-------------|--------|-----------|----------------|
| Spacewar! | **Graphics canvas only** | Monochrome (green/white) | **Yes (30fps)** | **Yes** |
| Adventure | Line-oriented text | No | No | No |
| Star Trek | BASIC PRINT (line-oriented) | No | No | No |
| Larn | Full curses (80×24 grid) | Yes (16 colors) | No | No |
| Robots | Full curses (grid) | No (monochrome) | No | No |
| Tetris | Full curses (grid) | Yes (per-piece colors) | **Yes** | No |

### Shared Infrastructure

| Component | Spacewar! | Adventure | Trek | Larn | Robots | Tetris |
|-----------|-----------|-----------|------|------|--------|--------|
| Terminal text grid | Score only | Scroll only | Scroll only | Full grid | Full grid | Full grid |
| Graphics canvas | **Primary** | No | No | No | No | No |
| Shell integration | Command | Command | BASIC `RUN` | Command | Command | Command |
| Input: blocking getKey | No | Yes | Via BASIC | Yes | Yes | No |
| Input: real-time | **Yes (30fps)** | No | No | No | No | **Yes** |
| Input: two-player | **Yes** | No | No | No | No | No |
| Curses emulation | No | No | No | Yes | Minimal | Minimal |
| Session recording | No | Optional | No | Yes (parity) | Optional | Optional |
| Save files | No | Yes (VFS) | No | Yes (VFS) | No | No |

### Real-Time Input (New for Tetris)

Current input model: `await readKey()` — blocks until a key is pressed.
Tetris needs: "give me a key if one was pressed in the last 500ms,
otherwise drop the piece."

```js
// New: timed key read
async function readKeyWithTimeout(ms) {
    return Promise.race([
        readKey(),                              // resolves on keypress
        new Promise(r => setTimeout(() => r(null), ms))  // resolves on timeout
    ]);
}
```

This is a small addition to the Input system. It also enables future
real-time features: animations, clock displays, network multiplayer
polling.

## Directory Structure

```
spacewar/
├── js/spacewar.js           — game engine + physics (~500 lines)
├── js/ships.js              — ship vertex definitions, rendering
├── js/ai.js                 — single-player AI opponent
└── test/

adventure/
├── js/adventure.js          — game engine
├── js/data.js               — room/object/vocabulary data
├── adventure-c/upstream/    — original BSD C source (reference)
└── test/                    — (optional) session tests

trek/
├── basic/startrek.bas       — original BASIC source
└── test/                    — (optional) output comparison tests

larn/
├── js/                      — JS game engine
│   ├── main.js              — game loop
│   ├── monster.js           — monster data + AI
│   ├── object.js            — items, spells
│   ├── dungeon.js           — level generation
│   ├── player.js            — player state
│   ├── town.js              — town level + stores
│   ├── curses.js            — curses adapter (like rogue/js/curses.js)
│   └── save.js              — save/restore via VFS
├── larn-c/upstream/         — original C source
├── larn-c/patched/          — C harness for parity
└── test/
    ├── sessions/            — recorded parity sessions
    └── replay_test.mjs      — parity test runner

robots/
├── js/robots.js             — game engine (~400 lines JS)
├── robots-c/upstream/       — original BSD C source
└── test/

tetris/
├── js/tetris.js             — game engine (~600 lines JS)
├── tetris-c/upstream/       — original BSD C source
└── test/
```

## Development Order

### Phase 1: Quick wins (Robots + Adventure) — ~2 days

**Robots first** (0.5–1 day): Smallest game, instant gratification. Tests
the Shell integration pattern. Simple grid display, blocking input, no
save files. When done, you can type `robots` at the Shell prompt and play.

**Adventure second** (1–2 days): Different I/O model (line-oriented vs
grid). Tests the Shell's scroll/text output. Historically significant.
When done, `adventure` works at the Shell prompt.

### Phase 2: Spacewar! + Star Trek — ~2–3 days

**Spacewar!** (1–2 days): First graphics-canvas game. Tests the Terminal's
graphics plane integration — `requestAnimationFrame` game loop, vector
drawing on canvas, real-time keyboard input for two players. This is the
proof-of-concept for the VT340-style dual-plane architecture. When done,
`spacewar` launches from Shell with a working 2-player game (or vs AI).

### Phase 3: Star Trek in BASIC — ~1–2 days

Load the original Mayfield BASIC source and run it in our BASIC interpreter.
This is primarily a BASIC interpreter compatibility exercise:

1. Obtain the canonical Super Star Trek BASIC source
2. Try to `RUN` it in our interpreter
3. Fix any dialect issues (likely: `ON X GOTO`, `DEF FN`, `TAB()`, `MID$`)
4. When it runs, add `trek` as a Shell command that launches BASIC with
   the Star Trek program auto-loaded

### Phase 4: Tetris — ~1–2 days

Second real-time game (after Spacewar!). Timed input system
(`readKeyWithTimeout`) already proven by Spacewar!'s game loop. Port the
game logic: piece definitions, rotation, collision, line clearing, scoring.
Add per-piece colors for visual appeal (Tetris is much better in color).

### Phase 5: Larn — ~3–5 days

Full roguelike port following the Rogue/Hack methodology:

1. **Day 1**: Obtain C source, build C harness (fake curses, RNG logging,
   keystroke injection, JSON session output). Record initial sessions.
2. **Day 2–3**: JS translation of game logic. Town level, dungeon
   generation, combat, spells, items, monsters.
3. **Day 3–4**: Parity testing. Fix divergences using the same
   instrumentation-based debugging approach as Rogue/Hack.
4. **Day 4–5**: Coverage sessions (wizard mode if Larn has one, or
   crafted sessions). Polish, save/restore via VFS, Shell integration.

## Milestones and Testing

| Milestone | Gate | Test |
|-----------|------|------|
| Robots plays | `robots` at Shell prompt | Manual play test |
| Adventure plays | `adventure` at Shell prompt | Compare output to known walkthrough |
| Spacewar! plays | `spacewar` at Shell prompt | Two ships orbit, fire, collide |
| Spacewar! graphics | Canvas renders under text | Text score overlay on vector game |
| Trek runs | `trek` or `RUN "STARTREK"` in BASIC | Play through a game |
| Tetris plays | `tetris` at Shell prompt | Timed input works, pieces fall |
| Larn basic play | `larn` at Shell prompt | Explore town + cavern level 1 |
| Larn parity | C harness matches JS | N parity sessions green |
| Larn save/restore | Save in town, quit, resume | Multigame session test |
| All in Shell | All 6 games + existing apps | `help` lists all commands |

## Historical Context

These six games span the entire history of interactive computing:

```
1962  ┌─ Spacewar! (Russell/MIT) ──── the first video game      ★ NEW
1971  ├─ Star Trek (Mayfield) ──────── mainframe BASIC           ★ NEW
1976  ├─ Adventure (Crowther/Woods) ── the first adventure game  ★ NEW
1980  ├─ Rogue (Toy/Wichman/Arnold) ── the first roguelike      ✓ already ported
1982  ├─ Hack (Langendoen/Struyf) ──── Rogue + complexity       ✓ already ported
~1983 ├─ Robots (BSD) ──────────────── arcade puzzle             ★ NEW
1986  ├─ Larn (Morgan) ─────────────── roguelike + overworld     ★ NEW
1987  ├─ NetHack (DevTeam) ─────────── the roguelike             ✓ already ported
1989  └─ Tetris (Torek/Provine) ────── arcade real-time          ★ NEW
```

Together with the Logo (1967) and BASIC (1964) interpreters, this gives
the platform coverage from 1962 to 1989 — from the PDP-1 to the VT340,
from the first video game to the last great text-mode games, all running
in a browser on the shared Terminal infrastructure.

The Terminal's dual-plane architecture (text + graphics canvas) mirrors
the hardware evolution: Spacewar! uses only the graphics plane (like the
PDP-1's Type 30 display), the roguelikes use only the text plane (like
the VT100), and Logo/BASIC use both (like the VT340).

## Relationship to Terminal Refactoring

These games are strong motivation for the Terminal refactoring
(TERMINAL_REFACTOR.md). Currently, each game has its own Display class.
After the refactoring:

- **Spacewar!**: Uses `Terminal` graphics canvas — first canvas-only game
- **Robots, Tetris**: Use `Terminal` directly — pure grid games
- **Adventure, Trek**: Use `Terminal` in scroll/line mode via Shell
- **Larn**: Uses `Terminal` + curses adapter (same pattern as Rogue/Hack)

The refactoring should happen first (or at least Phase 1: extract Terminal
base class) to avoid creating yet more duplicate Display implementations.

## Open Questions

1. **Star Trek dialect**: Which BASIC source is closest to our BASIC-PLUS
   interpreter? Mayfield 1972, Ahl 1978, or a later rewrite? May need to
   evaluate multiple versions.

2. **Larn version**: v12.0 (original 1986), v12.2 (common patched), or
   v12.4 (latest)? Recommendation: v12.0 for historical authenticity,
   same as we use Rogue 3.6 and Hack 1.0.1.

3. **Larn parity scope**: Full parity (screen + RNG + cursor) like Rogue,
   or lighter-weight (screen-only) initially? Recommendation: start with
   screen parity, add RNG parity later if useful.

4. **Tetris scoring**: Use original BSD scoring or the modern Tetris
   guideline? Recommendation: BSD original for authenticity.

5. **Adventure data format**: Use compiled-in data (simpler, one file) or
   external data files (closer to original)? Recommendation: compiled-in
   for web simplicity.
