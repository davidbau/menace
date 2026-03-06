# Mazes of Menace

*You feel a strange vibration under your feet.*

NetHack is one of the most complex single-player games ever made: a procedurally
generated dungeon RPG with 38 years of accumulated rules, running in 80 columns of
ASCII text. This is a faithful JavaScript port, playable in any modern browser.
Open the page, pick a role, descend.

**Play it now: [mazesofmenace.net](https://mazesofmenace.net/)**

---

## What's Implemented

*You see here a mostly ported game.*

The core engine is complete and playable. Key systems:

**World and movement**
- Procedural dungeon generation — rooms, corridors, doors, stairs, traps, and 132 hand-designed special levels
- Field of view with room lighting, terrain memory, and Algorithm C raycasting (faithful to `vision.c`)
- Multi-level dungeon with level caching and bones files (find the gear of dead players)
- All 13 player roles and 5 races with correct starting inventories and C-faithful attribute distribution
- Movement: vi keys, arrow keys, running, searching, resting

**Combat and monsters**
- 383 monster types with AI movement, special attacks, intrinsic abilities, and item use
- Melee combat with C-faithful to-hit and damage formulas; two-weapon combat
- Throwing and firing — projectile physics, multishot bonuses, ammo breakage, boomerangs
- Kicking — monsters, objects, doors; objects migrate through traps to lower levels
- Monster spell casting (summon nasties, curse items, drain levels, heal self, etc.)
- Pet AI — taming, feeding, leashing, steed riding (mount/dismount, saddle)
- Lycanthropy — infection, were-form changes, wolf/rat pack summoning
- Polymorph into monster forms with full stat and intrinsic changes

**Objects and magic**
- 478 object types: weapons, armor, potions, scrolls, wands, rings, amulets, tools, gems
- Object and gold pickup; multi-turn eating; object dipping
- Spells — C-faithful failure rates, retention decay, and effects
- Scrolls — identify, enchant, remove curse, magic mapping, taming, genocide, and more
- Potions — healing, speed, confusion, blindness, levitation, and more
- Wands — beam and contact effects for all wand types
- Artifact weapons — passive properties and most invocation effects
- Apply command — tools, lamps, mirrors, whistles, leashes, tinning kits, musical instruments

**World interactions**
- Engravings, epitaphs, and rumors (with xcrypt decryption of encrypted data files)
- Fountain interactions: water demons, nymphs, wishing, draining
- Thrones, altars — all associated random effects
- Digging through terrain with pick-axes and wands of digging
- Divination: crystal ball, object/monster/trap/food/gold detection, clairvoyance
- Drawbridges — raising, lowering, drowning mechanics
- Lock picking, forcing locks, trap-detection on containers
- Vault guards — Croesus, gold corridor, full guard dialog and gold recovery
- Demon minion hierarchy — summon minions, lord/prince demon taxonomy
- Prayer and sacrifice with god relationship and alignment tracking

**Display and UI**
- 80×24 terminal display with DECGraphics (Unicode box-drawing walls, centered dot floors)
- Status bar: HP, AC, experience, hunger, conditions
- High scores, tombstone display, end-of-game sequence
- PRNG-faithful gameplay — ISAAC64, bit-identical to C NetHack

---

## What's Not Yet Implemented

*A cloud of gas surrounds you! You have a peculiar feeling about your code.*

- **Shops** — the shopkeeper knows your name and the price of everything; billing, payment, and theft detection are substantially ported but the full shop economy (paying on exit, anger mechanics, guards) is not yet fully wired
- **Special level event logic** — all 132 levels generate correctly as maps, but their unique triggers, quest mechanics, and scripted monster placements are mostly missing
- **Player trap effects** — monster traps are fully ported; the player `dotrap()` path is not yet implemented, so arrow traps, dart traps, rolling boulders, landmines, and others are present in maps but do not trigger for the player
- **Some artifact invocations** — taming, healing, and energy-boost invocations work; portal creation, ammo creation, demon banishment, and a few others are stubs
- **And more** — NetHack 3.7 has ~420,000 lines of C, headers, and Lua across ~8,600 functions; this port covers the core engine and most major gameplay systems in 175,000+ lines of JavaScript

The Hive is aware of this.

---

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

ES6 modules require HTTP — `file://` URLs won't work due to CORS.

---

## Tests

*You hear a sound reminiscent of a test suite passing.*

```bash
npm test             # unit + session tests
npm run test:unit    # unit tests only
npm run test:session # C-parity session tests only
npm run test:e2e     # E2E browser tests (requires npm install first)
npm run test:all     # everything
```

Session tests replay recorded C reference sessions against the JS engine,
comparing RNG traces, screen output, cursor position, and map grids step-by-step.

For the first run, build the C NetHack comparison harness:

```bash
./setup.sh
```

See **[docs/TESTING.md](docs/TESTING.md)** for the complete guide.

---

## Architecture

*You descend the stairs. This level is a module diagram.*

The port mirrors the C source structure: one JS file per C source file, same base
name, with `// C ref: file.c function()` comments linking every function to its
counterpart. The result is a codebase you can read alongside the C source.

Key design choices:

- **No build step** — serve the directory and open `index.html`; each JS module maps to a C source file
- **Async/await game loop** — `nhgetch()` becomes `await nhgetch()`, preserving the sequential logic of the C while allowing the browser to remain responsive
- **`<pre>` + per-cell `<span>`** — 80×24 terminal grid, 16 ANSI colors, DEC box-drawing characters for walls
- **Leaf file architecture** — all constants live in files that import nothing from gameplay modules; circular imports between gameplay files are safe (ESM resolves function bindings lazily)
- **`game.*` global state** — C's hundreds of globals become fields on one object, accessed via `gstate.js`; no dependency injection wiring needed

Full details: **[docs/DESIGN.md](docs/DESIGN.md)** | **[docs/DECISIONS.md](docs/DECISIONS.md)**

---

## Data Generation and Metaprogramming

*You read the scroll of generate data. Your objects.js glows blue!*

Several parts of the codebase are generated or converted from NetHack's C source:

**Data tables** — Monster, object, and artifact definitions are auto-generated from
`monsters.h`, `objects.h`, and `artilist.h` by Python scripts that parse C macro
calls and emit equivalent JS:

```bash
python3 scripts/generators/gen_monsters.py   # → js/monsters.js
python3 scripts/generators/gen_objects.py    # → js/objects.js
python3 scripts/generators/gen_artifacts.py  # → js/artifacts.js
python3 scripts/generators/gen_constants.py  # → js/const.js
```

**Special levels** — All 132 NetHack special levels are defined in Lua in the C
source. Each was converted to an equivalent JS module (`Arc-fila.lua` →
`js/levels/Arc-fila.js`) calling a JS implementation of the `sp_lev` API.

**ISAAC64** — The PRNG is a direct BigInt port of `isaac64.c`, bit-identical to C
including seeding. A golden reference test verifies 500 consecutive values per seed
against compiled C output.

**C-parity test harness** — A Python harness runs the real NetHack C binary and
records every RNG call, screen frame, cursor position, and map state into session
JSON files. The JS test suite replays these step-by-step on five channels: RNG,
screen, cursor, events, and mapdump. Test results are stored as git notes on
commits for retroactive comparison.

---

## Project Structure

*You read a scroll labeled "STRSTRSTRSTRINGS ATTACHED".*

```
├── index.html              Main web entry point
├── js/                     Game source (141 modules mirroring C structure)
│   ├── allmain.js          Entry point, game loop (← allmain.c)
│   ├── dungeon.js          Dungeon generation & management
│   ├── display.js          Terminal rendering (← win/tty/)
│   ├── hack.js             Turn management, run/rest/multi (← hack.c)
│   ├── monmove.js          Monster movement AI (← monmove.c)
│   ├── dog.js              Pet AI (← dog.c)
│   ├── isaac64.js          ISAAC64 PRNG (bit-identical to C)
│   ├── const.js            All game constants (leaf file)
│   ├── monsters.js         383 monster definitions (generated)
│   ├── objects.js          478 object definitions (generated)
│   ├── levels/             132 special level modules (← dat/*.lua)
│   └── ...
├── test/
│   ├── unit/               183 unit test files
│   ├── comparison/         C-vs-JS golden session tests (156 sessions)
│   └── e2e/                Puppeteer browser tests
├── nethack-c/              C reference source & harness (git-ignored)
├── scripts/                Utility and generator scripts
│   └── generators/         Python data generators
├── oracle/                 Testing dashboard (GitHub Pages)
├── dat/                    Game data files
├── spoilers/               In-browser spoiler guide
└── docs/                   Documentation
```

---

## Documentation

*The Oracle says: "Read the docs, lest ye be confused."*

**Architecture**
- [docs/DESIGN.md](docs/DESIGN.md) — How NetHack works, how the port adapts it: async loop, module structure, state management, C-to-JS translation
- [docs/DECISIONS.md](docs/DECISIONS.md) — Why specific choices were made (async vs blocking, modules vs bundler, etc.)
- [docs/MODULES.md](docs/MODULES.md) — Module dependency rules and leaf file architecture

**Development**
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — Workflow guide
- [docs/LORE.md](docs/LORE.md) — Hard-won porting lessons: RNG parity, translation patterns, known traps
- [PROJECT_PLAN.md](PROJECT_PLAN.md) — Project goals, milestones, working principles
- [AGENTS.md](AGENTS.md) — Agent workflow and session protocol

**Testing and parity**
- [docs/TESTING.md](docs/TESTING.md) — Test infrastructure and workflows
- [docs/PARITY_TEST_MATRIX.md](docs/PARITY_TEST_MATRIX.md) — Parity channels, session categories, quality gates
- [docs/SESSION_FORMAT_V3.md](docs/SESSION_FORMAT_V3.md) — Session file format
- [docs/RNG_ALIGNMENT_GUIDE.md](docs/RNG_ALIGNMENT_GUIDE.md) — Deep reference on RNG alignment

**Chronicles** (historical records of the port's progression)
- [docs/PHASE_1_PRNG_ALIGNMENT.md](docs/PHASE_1_PRNG_ALIGNMENT.md) — From xoshiro128 to ISAAC64
- [docs/PHASE_2_GAMEPLAY_ALIGNMENT.md](docs/PHASE_2_GAMEPLAY_ALIGNMENT.md) — Live gameplay, monster AI, pet behavior
- [docs/PHASE_3_MULTI_DEPTH_ALIGNMENT.md](docs/PHASE_3_MULTI_DEPTH_ALIGNMENT.md) — Multi-depth generation, state isolation

---

## FAQ

*The Oracle speaks.*

**Why not just compile the C to WebAssembly?**

The DevTeam anticipated this. NetHack has a clean windowing abstraction layer
(`win/`) with pluggable backends including `shim`, explicitly designed for
cross-compilation via Emscripten. An Emscripten-compiled NetHack in the browser
is a real possibility the DevTeam has in mind.

Mazes of Menace takes a different path: porting the game logic directly to JavaScript.
The result is readable, debuggable, and hackable in any browser devtools, with no
WASM toolchain and no binary blob. It also allows a natural async/await game loop
that maps cleanly onto the browser's event model. The tradeoff is faithfulness by
construction rather than faithfulness by compilation: every behavior must be
deliberately ported, which is both the hard part and the point.

---

## About NetHack

> *"Never build a dungeon you wouldn't be happy to spend the night in yourself."*
> — Terry Pratchett, quoted in the NetHack 3.6.0 release notes

NetHack is the greatest game most people have never heard of. First released on
July 28, 1987, it is a single-player dungeon exploration game: descend through
procedurally generated levels, fight monsters, solve puzzles, retrieve the Amulet
of Yendor from the depths of Gehennom, and offer it to your deity to achieve
ascension. The game runs in a terminal. The hero is an `@` sign. A newt is a `:`.
A dragon is a `D`. The entire world is rendered in 24 lines of 80 columns of text.
It is arguably the most complex and deeply interactive single-player game ever
created, with interaction rules so thorough that the community's highest compliment
is: *"The DevTeam thinks of everything."*

**The lineage.** NetHack descends from *Hack*, written by Jay Fenlason in 1981–1982
as a student at Lincoln-Sudbury Regional High School in Massachusetts, inspired by
*Rogue* (1980), the game that originated the roguelike genre. Andries Brouwer, a
Dutch mathematician at CWI Amsterdam, obtained the code, substantially rewrote it,
and posted *Hack 1.0* to Usenet in December 1984. The response was so overwhelming
that Gene Spafford had to create a dedicated newsgroup just to handle the traffic.
Mike Stephenson merged several Hack variants and published NetHack in 1987. Nearly
four decades later, the dungeon is still accepting visitors.

**The culture.** The community coined **YASD** (*Yet Another Stupid Death*) for the
deaths that feel obvious in retrospect — the floating eye you hit in melee, the
potion you quaffed unidentified, the cockatrice corpse you picked up without gloves.
YASD is not a complaint; it is a taxonomy. When a player finally wins — *ascends*
— they post a **YAFAP** (*Yet Another First Ascension Post*). The tradition goes
back to Usenet. Every death teaches something. Every ascension is worth announcing.

**The release schedule.** NetHack is maintained by a secretive volunteer group
known simply as the DevTeam, whose policy is: *"When it's ready."* After releasing
3.4.3 in December 2003, they went silent for **twelve years**. Then in December
2015, 3.6.0 appeared. The 3.7 development branch — the most ambitious set of
gameplay changes in the game's history — remains unreleased as of early 2026. The
community plays it on Hardfought. Variants have forked from it. Everyone waits.
The DevTeam thinks of everything — except telling you when.

---

## Royal Jelly: An Experiment in Vibe Coding

*You hear a low buzzing.*

**Royal Jelly** is the codename of this project. The name refers to the port itself,
the sweet output of The Hive. The 3.7.0 release has no codename of its own.

In February 2025, Andrej Karpathy coined the term *vibe coding*: describe what you
want to an AI, accept the output without reading the diffs, paste errors back when
things break. By 2026 the approach had acquired more structure and a more serious
name — *agentic engineering* — along with the recognition that directing AI agents
to produce real software requires genuine skill and judgment.

Mazes of Menace is a test of that claim. The question was whether AI agents, with
human direction, could produce a faithful port of one of the most complex codebases
in gaming history: not a prototype, but a real, playable, parity-correct
reimplementation that matches NetHack's behavior down to the random number generator.

So far, yes. The codebase — 141 JavaScript modules, 2,400+ passing unit tests, 156
golden C-comparison sessions — was written through natural-language conversation
with AI agents. The human set direction; the agents wrote the code, tests, and
documentation.

---

## License

NHPL (NetHack General Public License)

The JavaScript source is an independent rewrite with no C code copied or
transpiled. The game data (`dat/`), generated monster and object definitions, and
converted special levels are derived from NetHack's creative work, so NHPL is the
appropriate license regardless. This project exists in gratitude to the DevTeam
and the NetHack community, not in competition with them.

*Do you want your possessions identified?*
