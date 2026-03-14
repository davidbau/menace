# Dungeon

**A JavaScript port of the 1980 MIT Dungeon (the complete mainframe Zork)**

*You are in an open field west of a big white house with a boarded front door.*

## What is Dungeon?

Dungeon is the original text adventure game created at MIT in 1977-79 by
Tim Anderson, Marc Blank, Bruce Daniels, and Dave Lebling.  Written in MDL
(a Lisp dialect) on a PDP-10, it was the most ambitious interactive fiction
of its era.  When Infocom commercialized it, the game was too large for
home computers, so they split it into Zork I, II, and III — each containing
roughly a third of the original.

Bob Supnik translated the MDL source to Fortran in 1980, renaming it
"Dungeon" to avoid Infocom's trademark.  Ian Lance Taylor later translated
it to C via f2c.  The complete game has 585 points of treasure, ~200 rooms,
~220 objects, and a vocabulary of ~600 words.

This subproject ports Dungeon to JavaScript, continuing the Mazes of Menace
tradition of AI-assisted faithful game ports.  Dungeon (1980) is
contemporary with Rogue (1980) and predates Hack (1982) — completing the
family tree of the games that shaped NetHack.

## Lineage

```
1977  Zork (MDL, MIT PDP-10)
1980  Dungeon (Fortran, Supnik)     Rogue (C, Toy & Wichman)
1982                                 Hack (C, Fenlason)
1984                                 Hack 1.0 (C, Brouwer)
1980  Zork I  (ZIL, Infocom)
1981  Zork II (ZIL, Infocom)
1982  Zork III (ZIL, Infocom)
1987                                 NetHack 1.0 (Stephenson et al.)
 ...                                  ...
2025                                 NetHack 3.7 JS port
```

## Source Material

Two reference implementations are included.  **The Fortran 4.0 is the
primary porting reference** — it is the most complete version of the game
(616 points vs 585 in the C version, additional objects and rooms, updated
parser).  The C translation is useful as a readability aid when Fortran
idioms are unclear.

- **`fortran-src/`** — Supnik's Fortran, version 4.0A (gfortran port by GOFAI).
  11,563 lines + 666-line include file + binary data files (dindx, dtext).
  This is the canonical, most complete version.  Builds with `make` (requires
  gfortran).  The resulting `dungeon` binary serves as the C-parity reference
  for comparison testing.

- **`c-src/`** — C translation (f2c + cleanup), version 2.7A (devshane/zork).
  17,092 lines across 33 .c files + 3 headers + dtextc.dat data file.
  An older snapshot (1991) missing content added through Supnik's final 1994
  release.  Useful for understanding f2c-translated logic.

## Architecture Overview

### Game Structure

The game is a classic parser-driven text adventure with these major systems:

| System | Fortran | C (readability aid) | Description |
|--------|---------|---------------------|-------------|
| **Main loop** | `dungeon.f`, `game.f` | `dmain.c`, `dgame.c` | Init, command loop, end-of-turn |
| **Parser** | `parser.f` | `np.c`, `np1-3.c` | Lexer, word lookup, object resolution |
| **Rooms** | `rooms.f` | `rooms.c`, `nrooms.c` | Per-room action handlers (200 rooms) |
| **Objects** | `objects.f` | `objcts.c`, `sobjs.c`, `nobjs.c` | Per-object handlers (220 objects) |
| **Verbs** | `verbs.f` | `verbs.c`, `sverbs.c`, `dverb1-2.c` | Verb dispatch and implementation |
| **Clock** | `timefnc.f` | `clockr.c`, `lightp.c`, `ballop.c` | Timed events, light, combat |
| **Support** | `subr.f` | `dsub.c`, `dso1-7.c` | Utilities, inventory, movement |
| **Data** | `dparam.for` | `vars.h`, `parse.h`, `funcs.h` | Constants, vocabulary, state |
| **Debug** | `gdt.f` | `gdt.c` | Game debugging tool |

### Data Model

All game state lives in global arrays defined in `vars.h`:

- **Rooms**: 200 entries — descriptions, exits, actions, flags
- **Objects**: 220 entries — descriptions, locations, flags, values, containers
- **Exits**: 900-entry travel table (direction → destination mappings)
- **Clock events**: 25 timed triggers
- **Villains**: 4 NPCs with combat stats
- **Adventurers**: 4 actors (player + 3 NPCs)
- **Messages**: 1050 text strings (stored in binary data file)

### I/O Model

Dungeon's I/O is pure line-based text:
- **Input**: `rdline_()` reads one line from stdin
- **Output**: `rspeak_(n)` prints message #n from the data file;
  `more_output(str)` prints a literal string
- **No cursor positioning**, no colors, no terminal control
- Perfect fit for a simple `<pre>` text display with an input line

### Data File

The binary `dtextc.dat` contains:
1. An index section with room/object/exit/event arrays (read at init)
2. A text section with XOR-encrypted message strings (read on demand)

For the JS port, this data will be extracted into a JSON module.

## Porting Plan

### Phase 1: Data Extraction
- Parse the Fortran `dindx` + `dtext` binary data files
- Extract all ~1,100 message texts (XOR-encrypted in `dtext`)
- Extract room, object, exit, event, villain, adventurer arrays from `dindx`
- Extract vocabulary table from `dparam.for` (the Fortran include file)
- Produce `dungeon-data.js` with all game data as JS constants
- Validate against the Fortran reference binary's runtime behavior

### Phase 2: Core Engine
- Port `dparam.for` constants and state → JS game state object
- Port `game.f` main loop → async/await game loop
- Port `subr.f` utilities (rspeak, movement, scoring, death)
- Port `parser.f` → JS parser module (lexer, word lookup, object resolution)
- Port initialization from extracted data (replacing Fortran's `dindx` reader)

### Phase 3: Game Logic
- Port `rooms.f` room action handlers
- Port `objects.f` object action handlers (largest file: 2,664 lines)
- Port `verbs.f` verb dispatch and implementation (2,112 lines)
- Port `timefnc.f` clock/timed event handlers (1,198 lines)
- Port `gdt.f` game debugging tool (optional — for development use)
- Use C files (`rooms.c`, `objcts.c`, `verbs.c`, etc.) as readability aid

### Phase 4: Integration & Testing
- Wire into the Mazes of Menace shell (launched via `dungeon` command)
- Text display using the existing terminal `<pre>` element
- Save/restore via virtual filesystem
- Record Fortran reference sessions (input → output golden files)
- Comparison testing: replay sessions against JS, diff output
- Puzzle-by-puzzle verification (mailbox → thief → endgame)

## Estimated Scope

| Metric | Value |
|--------|-------|
| Fortran source lines | ~12,200 (+ 666-line include) |
| C readability aid | ~17,000 lines |
| Expected JS lines | ~8,000-10,000 |
| Fortran subroutines to port | ~100 |
| Data: rooms | 200 |
| Data: objects | 220 |
| Data: messages | ~1,100 |
| Data: vocabulary | ~600 words |
| Total points | 616 (Fortran 4.0) |

Much smaller than NetHack (~420K C lines) but a complete, self-contained
game with a sophisticated parser and rich puzzle design.

## Directory Structure

```
dungeon/
├── README.md           This file
├── c-src/              C reference source (v2.7A, primary porting reference)
├── fortran-src/        Fortran reference source (v4.0, includes data files)
├── docs/               Original documentation (dungeon.txt, hints.txt)
├── scripts/            Data extraction and build scripts
└── js/                 JavaScript port (target)
```

## License

The original Dungeon source is public domain (released by Infocom/Activision).
The C translation by Ian Lance Taylor is also public domain.
The Fortran gfortran port by GOFAI inherits the same terms.
