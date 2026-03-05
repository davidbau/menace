# Mazes of Menace

**Royal Jelly — a vibe-coded JavaScript port of NetHack 3.7**

*You feel a strange vibration under your feet.*

A faithful JavaScript port of NetHack, playable in any modern web browser.
ASCII terminal display with DEC line-drawing graphics, native keyboard
commands, no build step. Open the page. Pick a role. Descend.
The strength of this port lies in its fidelity to the original C source.

**Play it now:** [https://mazesofmenace.net/](https://mazesofmenace.net/)

## The Game

> *"Never build a dungeon you wouldn't be happy to spend the night in yourself."*
> — Terry Pratchett, quoted in the NetHack 3.6.0 release notes

NetHack is the greatest game most people have never heard of. First released on July 28, 1987, it is a single-player dungeon exploration game in which a character descends through procedurally generated levels, fights monsters, solves puzzles, and ultimately retrieves the Amulet of Yendor from the depths of Gehennom to offer it to their deity and achieve ascension. The game runs in a terminal. The hero is an `@` sign. A newt is a `:`. A dragon is a `D`. The entire world—objects, monsters, traps, terrain—is rendered in 24 lines of 80 columns of text characters. It is arguably the most complex and deeply interactive single-player game ever created, with interaction rules so thorough that the community's highest compliment is: *"The DevTeam thinks of everything."*

NetHack's lineage runs deep. It descends from **Hack**, written by **Jay Fenlason** in 1981–1982 as a student at Lincoln-Sudbury Regional High School in Massachusetts. Lincoln-Sudbury had a PDP-11 running Unix, administered by a student-run Computer Center Users Society, and Fenlason—working with classmates Kenny Woodland, Mike Thome, and Jonathan Payne—wrote his dungeon crawler inspired by **Rogue** (1980), the game that originated the entire roguelike genre and gave it its name. Brian Harvey, the school's Computer Director, submitted Fenlason's Hack to the USENIX 82-1 software distribution tape, giving it its first public distribution.

Two years later, **Andries Brouwer**, a Dutch mathematician at CWI Amsterdam (Stichting Mathematisch Centrum), obtained the code, substantially rewrote it, and on December 17, 1984 posted **Hack 1.0** to the Usenet newsgroup `net.sources` in fifteen parts. The response was so overwhelming that Gene Spafford had to create a dedicated newsgroup, `net.games.hack`, just to handle the traffic. Brouwer later described his version as "almost entirely rewritten" relative to Fenlason's original—which is why the NetHack copyright still carries CWI's name. Fenlason himself largely stepped back after that. In a 2000 interview, he said he had "voluntarily avoided participation pretty much since spawning the original Hack almost 20 years ago," and felt the game had drifted from his original priority of gameplay over features. He still played his own version at home. He doesn't hold a grudge.

When Mike Stephenson merged several Hack variants and published **NetHack** in 1987, he built on this accretion of student work, professional rewriting, Usenet communal evolution, and one mathematician's obsessive polish. Nearly four decades later, the dungeon is still accepting visitors — making NetHack one of the longest-running continuously developed open source projects in existence.

The game's relationship to failure is part of its culture. The community coined **YASD** (*Yet Another Stupid Death*) for the deaths that feel obvious in retrospect—the floating eye you hit in melee, the potion you quaffed unidentified, the cockatrice corpse you picked up without gloves. YASD is not a complaint; it is a taxonomy. And when a player finally wins—*ascends*, in NetHack terminology—they post a **YAFAP** (*Yet Another First Ascension Post*) to share the story. The tradition goes back to Usenet. It continues today. Every death teaches something. Every ascension is worth announcing.

NetHack is maintained by a secretive volunteer group known simply as the DevTeam, whose release schedule is governed by a single policy: *"When it's ready."* They mean it. After releasing version 3.4.3 in December 2003, the DevTeam went silent for **twelve years**. During that gap, the community created dozens of fan variants, the NetHack Wiki ran humorous "next version pools" where fans bet on the release date, and a leak of work-in-progress code in 2014 fueled a fresh round of speculation. Then, in December 2015, NetHack 3.6.0 appeared—focused on infrastructure modernization rather than gameplay changes.

The 3.6.x series continued through 3.6.7 (February 2023, a security patch), but the real action has been happening on the 3.7 development branch. NetHack 3.7.0 represents the most ambitious set of gameplay changes in the game's 38-year history: a Gehennom overhaul, themed rooms, four new monsters including the dreaded genetic engineer (who polymorphs you and teleports away), dragon scale mail granting two extrinsics instead of one, nerfed unicorn horns (a meta-shattering shock to a generation of players who kept one in every kit), mirrored special levels, and much more.

As of early 2026, 3.7.0 remains unreleased. The DevTeam's README warns: *"Don't treat NetHack-3.7 branch as released code."* The community plays it on the Hardfought server. Variants have already forked from it. Everyone waits. The DevTeam thinks of everything—except telling you when.

## Royal Jelly: An Experiment in Vibe Coding

*You hear a low buzzing.*

**Royal Jelly** is the codename of this project: a faithful, vibe-coded JavaScript port of NetHack 3.7.0, built to ship the day the official release drops. The name refers to this port—the sweet output of The Hive—not to the official 3.7.0 release itself, which has no codename.

The project exists at the intersection of two unlikely forces: the pending release of NetHack 3.7.0 and the rise of AI-assisted software development.

In February 2025, Andrej Karpathy coined the term **"vibe coding"** to describe a new way of working: describe what you want to an AI, accept its code without reading the diffs, paste error messages back when things break, and see what happens. By early 2026 the approach had matured into what Karpathy calls **"agentic engineering"**—the same core idea, but with more structure, more oversight, and the recognition that orchestrating AI agents to produce real software is itself *"an art and science and expertise."*

This project is a test of that proposition at scale. Can AI agents, directed by a non-expert human, produce a faithful port of one of the most complex single-player codebases in gaming history? Not a toy demo or a weekend throwaway, but a real, playable, parity-correct reimplementation—over one hundred fifty thousand lines of readable JavaScript that match NetHack's behavior down to the random number generator?

The entire codebase—147 JavaScript modules, 3,100+ passing tests, 150 golden C-comparison sessions, and a suite of Python test harness scripts—was produced through natural-language conversation with AI agents. The human provided direction and taste; the agents wrote the code, tests, and documentation.

## Architecture

*You descend the stairs. This level is a module diagram.*

The port mirrors the original C source structure with traceable references
throughout. See the full architecture and design documents:

- **[Architecture & Design](docs/DESIGN.md)** — Module structure, display
  system, async game loop, data porting strategy
- **[Design Decisions](docs/DECISIONS.md)** — Key trade-offs: async input
  queue, `<pre>`/`<span>` rendering, ES6 modules without bundling,
  DECGraphics via Unicode, simplified FOV

### Key Design Choices

*A voice whispers: "The build step has been removed from the game."*

- **ES6 modules, no build step** — Just serve the directory and open
  `index.html`. Each JS module maps to a C source file. Do not kick it,
  it is load bearing.
- **Async/await game loop** — The C code's blocking `nhgetch()` becomes
  `await nhgetch()`, preserving the sequential logic of the original.
- **`<pre>` with per-cell `<span>`** — 80x24 terminal grid, 16 ANSI colors,
  DEC box-drawing characters for walls. It's less straining on your
  eyes than you might think.
- **Faithful C references** — Comments like `// C ref: uhitm.c find_roll_to_hit()`
  link every function to its C source counterpart. It makes for dry reading,
  but a shopkeeper would approve of the bookkeeping.

## What's Implemented

*You see here a mostly ported game.*

- PRNG-faithful gameplay (ISAAC64, bit-identical to C NetHack)
- Dungeon generation (rooms, corridors, doors, stairs, traps, themerooms)
- All 13 player roles and 5 races with correct starting inventories
- Character creation with C-faithful attribute distribution
- Movement (vi keys, arrow keys, running, searching, resting)
- Melee combat with C-faithful to-hit and damage formulas, two-weapon combat
- Throwing and firing — full projectile physics, multishot bonuses, ammo breakage, boomerangs
- Kicking — monsters, objects, doors; object migration through traps to lower levels
- 383 monster types with AI movement, attacks, special abilities, and item use
- Monster spell casting (summon nasties, curse items, heal self, etc.)
- Pet AI with taming, feeding, leashing, and steed riding (mount/dismount, saddle)
- Lycanthropy — player infection, were-form changes, summoning wolf/rat packs
- 478 object types (weapons, armor, potions, scrolls, etc.)
- Object and gold pickup, multi-turn eating system, object dipping
- Engravings, epitaphs, and rumors (with xcrypt decryption)
- Field of view with room lighting and terrain memory
- Multi-level dungeon with level caching and bones files
- DECGraphics (Unicode box-drawing walls, centered dot floors)
- Status bar with HP, AC, experience, hunger, conditions
- High scores, tombstone display, and end-of-game sequence
- Spell casting with C-faithful failure rates, retention decay, and effects
- Scroll effects (identify, enchant weapon/armor, remove curse, magic mapping, taming, genocide, and more)
- Potion effects (healing, speed, confusion, blindness, levitation, and more)
- Wand zapping with beam and contact effects for all wand types
- Artifact weapons with passive properties and most invocation effects (taming, healing, energy boost, and more)
- Apply command — tools, lamps, mirrors, whistles, leashes, tinning kits, musical instruments (with charm/calm/awaken effects), and more
- Lock picking, forcing locks, trap-detection on containers
- Fountain interactions (water demons, nymphs, wishing, draining)
- Sitting on thrones, altars, fountains — with all associated random effects
- Digging through terrain with pick-axes and wands of digging
- Divination — crystal ball, object/monster/trap/food/gold detection, clairvoyance
- Drawbridges — raising, lowering, and drowning mechanics
- Vault guard interactions — Croesus, gold corridor, full guard dialog and gold recovery
- Demon minion hierarchy — summon minions, lord/prince demon taxonomy
- Polymorph into monster forms with full stat and intrinsic changes
- Prayer and sacrifice with god relationship and alignment tracking

## What's Not Yet Implemented

*A cloud of gas surrounds you! You have a peculiar feeling about your code.*

- **Shops** — the shopkeeper knows your name and the price of everything; billing, payment, and theft detection are substantially ported but the full shop economy (paying on exit, anger mechanics, guards) is not yet fully wired
- **Special level event logic** — all 132 levels generate correctly as maps, but their unique triggers, quest mechanics, and scripted monster placements are mostly missing
- **Player trap effects** — monster traps are fully ported; the player `dotrap()` path is not yet implemented, so arrow traps, dart traps, rolling boulders, landmines, and others are present in maps but do not trigger for the player
- **Some artifact invocations** — taming, healing, and energy-boost invocations work; portal creation, ammo creation, demon banishment, and a few others are stubs
- **And more** — NetHack 3.7 has ~420,000 lines of C, headers, and Lua across ~8,600 functions; so far, this port covers the core engine and most major gameplay systems with 157,000+ lines of JavaScript (with the goal of replicating the whole game faithfully)

The Hive is aware of this.

## Running Locally

*The door is locked. You kick it open!*

Serve the directory with any static HTTP server:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Or with Node:

```bash
npx serve .
```

Note: ES6 modules require HTTP — `file://` URLs won't work due to CORS.

## Tests

*You hear a sound reminiscent of a test suite passing.*

Unit tests, C-parity session tests, and E2E browser tests:

```bash
npm install          # install puppeteer for E2E tests
npm test             # unit + session
npm run test:all     # unit + session + e2e
npm run test:unit    # unit tests only
npm run test:session # session tests only
npm run test:e2e     # E2E browser tests only
```

Session tests replay recorded C reference sessions against the JS game to verify
RNG traces, screen output, and map grids. After cloning, run the one-time setup
script to enable test automation and build the C NetHack harness:

```bash
./setup.sh
```

See **[docs/TESTING.md](docs/TESTING.md)** for the complete testing guide.

## Data Generation

*You read the scroll of generate data. Your objects.js glows blue!*

Monster and object data are auto-generated from the NetHack C source
headers via Python scripts:

```bash
python3 scripts/generators/gen_monsters.py > js/monsters.js   # 383 monsters
python3 scripts/generators/gen_objects.py > js/objects.js      # 478 objects
```

## Project Structure

*You read a scroll labeled "STRSTRSTRSTRINGS ATTACHED".*

```
├── index.html              Main web entry point
├── js/                     Game source (147 modules mirroring C structure)
│   ├── commands.js         Command dispatch
│   ├── dungeon.js          Dungeon generation & management
│   ├── display.js          Terminal rendering
│   ├── headless_runtime.js Game loop & headless execution
│   ├── combat.js           Melee combat
│   ├── monmove.js          Monster movement AI
│   ├── dog.js              Pet AI
│   ├── isaac64.js          ISAAC64 PRNG (bit-identical to C)
│   ├── monsters.js         383 monster definitions (generated)
│   ├── objects.js          478 object definitions (generated)
│   ├── levels/             132 special level modules
│   └── ...
├── test/
│   ├── unit/               159 unit test files
│   ├── comparison/         C-vs-JS golden session tests
│   ├── e2e/                Puppeteer browser tests
│   └── selfplay/           Self-play harness tests
├── selfplay/               AI self-play infrastructure
├── nethack-c/              C reference source & harness
├── scripts/                Utility and generator scripts
├── oracle/                 Dashboard (GitHub Pages)
├── dat/                    Game data files
├── guidebook/              In-game guidance
├── spoilers/               Spoiler content
└── traces/                 Recorded replay traces
```

## Documentation

*The Oracle says: "Read the docs, lest ye be confused."*

### Project-Level

- **[PROJECT_PLAN.md](PROJECT_PLAN.md)** — Authoritative project plan: goals, milestones, working principles, and risks
- **[AGENTS.md](AGENTS.md)** — Agent workflow: issue tracking, ownership, dependencies, and session completion protocol

### Architecture & Development

- **[docs/DESIGN.md](docs/DESIGN.md)** — Architecture and module structure
- **[docs/DECISIONS.md](docs/DECISIONS.md)** — Key design trade-offs and rationale
- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** — Development workflow guide

### Testing & Parity

- **[docs/PARITY_TEST_MATRIX.md](docs/PARITY_TEST_MATRIX.md)** — Canonical parity reference: test suites, session categories, comparison channels, quality gates
- **[docs/TESTING.md](docs/TESTING.md)** — Testing dashboard, enforcement, and workflows
- **[docs/COLLECTING_SESSIONS.md](docs/COLLECTING_SESSIONS.md)** — How to capture C reference sessions
- **[docs/SESSION_FORMAT_V3.md](docs/SESSION_FORMAT_V3.md)** — Session file format specification

### Porting Knowledge

- **[docs/LORE.md](docs/LORE.md)** — Hard-won porting lessons: RNG parity, special levels, pet AI, translation patterns
- **[docs/RNG_ALIGNMENT_GUIDE.md](docs/RNG_ALIGNMENT_GUIDE.md)** — Deep reference on RNG alignment techniques
- **[docs/PHASE_1_PRNG_ALIGNMENT.md](docs/PHASE_1_PRNG_ALIGNMENT.md)** — Chronicle: from xoshiro128 to ISAAC64
- **[docs/PHASE_2_GAMEPLAY_ALIGNMENT.md](docs/PHASE_2_GAMEPLAY_ALIGNMENT.md)** — Chronicle: live gameplay, monster AI, pet behavior
- **[docs/PHASE_3_MULTI_DEPTH_ALIGNMENT.md](docs/PHASE_3_MULTI_DEPTH_ALIGNMENT.md)** — Chronicle: multi-depth generation, state isolation

### Active Work & Plans

- **[docs/C_PARITY_WORKLIST.md](docs/C_PARITY_WORKLIST.md)** — C-to-JS correspondence ledger
- **[docs/NEXT_STEPS.md](docs/NEXT_STEPS.md)** — Prioritized next steps
- **[docs/CORE_REPLAY_PLAN.md](docs/CORE_REPLAY_PLAN.md)** — Replay unification plan

### Detailed Documentation (`docs/`)

- **docs/agent/** — Agent coordination and progress tracking
- **docs/plans/** — Feature implementation plans
- **docs/port-status/** — Port progress, fixes, known issues
- **docs/special-levels/** — Special level implementation guide
- **docs/level-conversion/** — Lua-to-JS conversion reports
- **docs/reference/** — NetHack reference materials
- **docs/archive/** — Historical progress snapshots and investigation notes

### Other Resources

- **[oracle/](oracle/)** — Testing dashboard (GitHub Pages)
- **[.githooks/QUICK_REFERENCE.md](.githooks/QUICK_REFERENCE.md)** — Command cheat sheet

## FAQ

*The Oracle speaks.*

**Why not just compile the C to WebAssembly?**

The DevTeam actually anticipated this. NetHack's C source has a clean
windowing abstraction layer (`win/`) with pluggable backends — `tty`, `curses`,
`X11`, `Qt`, `win32`, and notably `shim`, which is explicitly designed for
cross-compilation to WebAssembly via Emscripten. The shim backend serializes
every display call to a JavaScript callback, and an Emscripten-compiled NetHack
running in a browser is a real possibility the DevTeam has in mind.

This project takes a different path: porting the game logic directly to
JavaScript rather than compiling C to WASM. The result is a codebase that is
readable, debuggable, and hackable in any browser devtools — no WASM toolchain,
no C build step, no binary blob. It also allows a natural async/await game loop
that maps cleanly onto the browser's event model. The tradeoff is faithfulness
by construction rather than faithfulness by compilation: every behavior must be
deliberately ported, which is both the hard part and the point.

## License

NHPL (NetHack General Public License)

The JavaScript source is an independent rewrite with no C code copied or
transpiled. However, the game data (`dat/`), generated monster and object
definitions, and converted special levels are all derived from NetHack's
creative work, so NHPL is the appropriate license regardless. We also think
it's the right spirit: this project exists in gratitude to the DevTeam and
the NetHack community, not in competition with them.

*Do you want your possessions identified?*
