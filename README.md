# Mazes of Menace

**Royal Jelly: a vibe-coded JavaScript port of NetHack 3.7**

*You feel a strange vibration under your feet.*

NetHack 3.7 is the most ambitious update in the game's 38-year history.
Development has been continuous on GitHub since the 3.6.0 release in
December 2015, and the community plays 3.7 on public servers, but as
of early 2026, the DevTeam still hasn't shipped it. This port puts
the unreleased version in your browser. It was written entirely by
AI coding agents. 182,000+ lines of JavaScript, 141 modules mirroring
the C source structure, bit-identical PRNG, 89 golden C-comparison
test sessions. One month, 3,700+ commits.

Open the page, pick a role, descend.

**Play it now: [mazesofmenace.net](https://mazesofmenace.net/)**

Also playable: [Hack (1982)](https://mazesofmenace.net/hack/) and
[Rogue (1980)](https://mazesofmenace.net/rogue/), the ancestors.

---

## The Experiment

*You hear a low buzzing.*

The codename *Royal Jelly* refers to the port itself, the sweet
output of The Hive.

NetHack has ~420,000 lines of C, headers, and Lua across ~8,600
functions. For reference, the original Doom is ~40,000 lines, Quake
~80,000, and Civilization III ~130,000. NetHack dwarfs them all
despite rendering nothing but text. Thirty-eight years of accretionary
development have produced a codebase where any object can interact
with any monster, terrain, or status effect. It is complex because
it covers every edge case with a rule.

Our question: can AI agents, with light human supervision, produce
a faithful port? Not a prototype, but a playable, fully faithful
reimplementation that matches the C behavior down to the random
number generator.

This project contains no human-written code. AI agents wrote every
line of code, every test, and all the documentation. No C was copied
or transpiled. Every function was ported by hand -- the agents' hands,
such as they are.

We describe this process as "vibe coding," though it is very different
from Andrej Karpathy's original observation of copy-and-paste LLM
coding. The human effort here has been setting strategy, goals,
orchestration, and environment for a swarm of Codex and Claude coding
agents. Clearing a path for 24/7 automated agent software production
requires genuine skill and judgment, and the development of new
engineering techniques. This project is a test of that at scale.

---

## About NetHack

> *"Never build a dungeon you wouldn't be happy to spend the night in yourself."*
> -- Terry Pratchett, quoted in the NetHack 3.6.0 release notes

NetHack is a single-player dungeon exploration game, first released July 28,
1987. Descend through procedurally generated levels, fight monsters, solve
puzzles, retrieve the Amulet of Yendor from the depths of Gehennom, and
offer it to your deity to achieve ascension. The hero is an `@` sign. A
newt is a `:`. A dragon is a `D`. The entire world is rendered in 24 lines
of 80 columns of text. The interaction rules are so thorough that the
community's highest compliment is: *"The DevTeam thinks of everything."*

**The lineage.** In 1980, Michael Toy and Glenn Wichman wrote
[Rogue](rogue/#about) in a Santa Cruz apartment using a borrowed
terminal and a 300-baud modem. In 1982, Jay Fenlason, a high school junior
in Massachusetts, wrote [Hack](hack/#about) after the Rogue authors
refused to share their source code. Andries Brouwer rewrote Hack and posted
it to Usenet in 1984. Mike Stephenson merged the variants and published
NetHack in 1987. Both [Rogue](https://mazesofmenace.net/rogue/) and
[Hack](https://mazesofmenace.net/hack/) are playable here alongside
their descendant. The dungeon goes deeper than expected.

**The culture.** The community coined **YASD** (*Yet Another Stupid Death*)
for deaths that feel obvious in retrospect: the floating eye you hit in
melee, the potion you quaffed unidentified, the cockatrice corpse you picked
up without gloves. YASD is not a complaint; it is a taxonomy. When a player
finally ascends, they post a **YAFAP** (*Yet Another First Ascension Post*).
The tradition goes back to Usenet.

**The release schedule.** NetHack is maintained by a volunteer group known
as the DevTeam, whose policy is: *"When it's ready."* After releasing 3.4.3
in December 2003, they went silent for twelve years. Then 3.6.0 appeared
in December 2015, and development moved to a public GitHub repository.
The 3.7 branch has been actively developed since then; the community
plays it on [Hardfought](https://www.hardfought.org/nethack/) and
variants have forked from it. Everyone waits. The DevTeam thinks of
everything, except telling you when.

---

## What's Implemented

*You see here a mostly ported game.*

The core engine is complete and playable.

**World and movement** -- Procedural dungeon generation with rooms,
corridors, doors, stairs, traps, and 131 hand-designed special levels.
Field of view with room lighting, terrain memory, and Algorithm C
raycasting (faithful to `vision.c`). Multi-level dungeon with level
caching and bones files. All 13 player roles and 5 races. Movement via
vi keys, arrow keys, running, searching, resting.

**Combat and monsters** -- 383 monster types with AI movement, special
attacks, and item use. C-faithful melee with to-hit and damage formulas,
two-weapon combat, throwing, projectile physics, multishot, boomerangs.
Kicking doors and objects. Monster spellcasting. Pet AI with taming,
feeding, leashing, steed riding. Lycanthropy. Polymorph.

**Objects and magic** -- 478 object types. Spells with failure rates and
retention decay. Scrolls, potions, wands, rings, amulets. Artifact
weapons. Apply command covering tools, lamps, mirrors, whistles, leashes,
tinning kits, musical instruments. Object dipping. Multi-turn eating.

**World interactions** -- Engravings, fountains, thrones, altars. Digging.
Divination. Drawbridges. Lock picking. Vault guards. Demon hierarchy.
Prayer and sacrifice with god relationship and alignment tracking.

**Display and UI** -- 80x24 terminal with DECGraphics. Status bar.
High scores and tombstone. ISAAC64 PRNG, bit-identical to C NetHack.

---

## What's Not Yet Implemented

*A cloud of gas surrounds you! You have a peculiar feeling about your code.*

- **Shops** -- billing and payment are substantially ported; the full shop
  economy (paying on exit, anger mechanics, guards) is not yet wired
- **Special level events** -- all 131 levels generate correctly as maps,
  but their unique triggers and scripted mechanics are mostly missing
- **Player trap effects** -- monster traps work; the player `dotrap()`
  path is not yet implemented
- **Some artifact invocations** -- taming, healing, and energy-boost work;
  portal creation, demon banishment, and a few others are stubs

NetHack 3.7 has ~420,000 lines of C across ~8,600 functions. This port
covers the core engine and most major systems in 182,000+ lines of
JavaScript. The Hive is aware of this.

---

## Running Locally

*The door is locked. You kick it open!*

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Or `npx serve .` -- ES6 modules require HTTP; `file://` won't work.

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
comparing RNG traces, screen output, cursor position, and map grids
step-by-step. First-time setup: `./setup.sh`

See **[docs/TESTING.md](docs/TESTING.md)** for the complete guide.

---

## Architecture

*You descend the stairs. This level is a module diagram.*

The port mirrors the C source structure: one JS file per C source file,
same base name, with `// C ref: file.c function()` comments linking
every function to its counterpart. The codebase reads alongside the C.

- **No build step** -- serve the directory and open `index.html`
- **Async/await game loop** -- `nhgetch()` becomes `await nhgetch()`,
  preserving the sequential logic of the C while keeping the browser
  responsive
- **`<pre>` + per-cell `<span>`** -- 80x24 terminal grid, 16 ANSI
  colors, DEC box-drawing characters for walls
- **Leaf file architecture** -- constants in files that import nothing
  from gameplay modules; circular imports between gameplay files are
  safe (ESM resolves function bindings lazily)
- **`game.*` global state** -- C's hundreds of globals become fields on
  one object, via `gstate.js`

Full details: **[docs/DESIGN.md](docs/DESIGN.md)** |
**[docs/DECISIONS.md](docs/DECISIONS.md)**

---

## Data Generation

*You read the scroll of generate data. Your objects.js glows blue!*

Monster, object, and artifact definitions are auto-generated from
C headers by Python scripts:

```bash
python3 scripts/generators/gen_monsters.py   # -> js/monsters.js
python3 scripts/generators/gen_objects.py    # -> js/objects.js
python3 scripts/generators/gen_artifacts.py  # -> js/artifacts.js
python3 scripts/generators/gen_constants.py  # -> js/const.js
```

All 131 special levels were converted from Lua to JS modules
(`Arc-fila.lua` -> `js/levels/Arc-fila.js`). The PRNG is a BigInt port
of `isaac64.c`, verified against 500 consecutive values per seed from
compiled C output.

---

## Project Structure

*You read a scroll labeled "STRSTRSTRSTRINGS ATTACHED".*

```
├── index.html              Main web entry point
├── js/                     Game source (141 modules mirroring C structure)
│   ├── allmain.js          Entry point, game loop (from allmain.c)
│   ├── dungeon.js          Dungeon generation & management
│   ├── display.js          Terminal rendering (from win/tty/)
│   ├── hack.js             Turn management, run/rest/multi
│   ├── monmove.js          Monster movement AI
│   ├── dog.js              Pet AI
│   ├── isaac64.js          ISAAC64 PRNG (bit-identical to C)
│   ├── const.js            All game constants (leaf file)
│   ├── monsters.js         383 monster definitions (generated)
│   ├── objects.js          478 object definitions (generated)
│   ├── levels/             131 special level modules (from dat/*.lua)
│   └── ...
├── test/
│   ├── unit/               179 unit test files (~3,300 tests)
│   ├── comparison/         C-vs-JS golden session tests (89 sessions)
│   └── e2e/                Puppeteer browser tests
├── hack/                   1982 Hack browser port
├── rogue/                  1980 Rogue browser port
├── nethack-c/              C reference source & harness (git-ignored)
├── scripts/                Utility and generator scripts
├── oracle/                 Testing dashboard (GitHub Pages)
├── dat/                    Game data files
├── spoilers/               In-browser companion guide
└── docs/                   Documentation
```

---

## Documentation

*The Oracle says: "Read the docs, lest ye be confused."*

**Architecture** --
[DESIGN.md](docs/DESIGN.md),
[DECISIONS.md](docs/DECISIONS.md),
[MODULES.md](docs/MODULES.md)

**Development** --
[PROJECT_PLAN.md](PROJECT_PLAN.md),
[DEVELOPMENT.md](docs/DEVELOPMENT.md),
[LORE.md](docs/LORE.md),
[AGENTS.md](AGENTS.md)

**Testing** --
[TESTING.md](docs/TESTING.md),
[PARITY_TEST_MATRIX.md](docs/PARITY_TEST_MATRIX.md),
[SESSION_FORMAT_V3.md](docs/SESSION_FORMAT_V3.md),
[RNG_ALIGNMENT_GUIDE.md](docs/RNG_ALIGNMENT_GUIDE.md)

**Chronicles** --
[PHASE_1_PRNG_ALIGNMENT.md](docs/PHASE_1_PRNG_ALIGNMENT.md),
[PHASE_2_GAMEPLAY_ALIGNMENT.md](docs/PHASE_2_GAMEPLAY_ALIGNMENT.md),
[PHASE_3_MULTI_DEPTH_ALIGNMENT.md](docs/PHASE_3_MULTI_DEPTH_ALIGNMENT.md)

---

## FAQ

*The Oracle speaks.*

**Why not just compile the C to WebAssembly?**

The DevTeam anticipated this. NetHack has a clean windowing abstraction
layer (`win/`) with a `shim` backend designed for Emscripten. A WASM
NetHack in the browser is a real possibility the DevTeam has in mind.

This project takes a different path: porting the game logic to JavaScript.
The result is readable, debuggable, and hackable in any browser devtools,
with no WASM toolchain and no binary blob. It also allows a natural
async/await game loop. The tradeoff is faithfulness by construction rather
than faithfulness by compilation: every behavior must be deliberately
ported, which is both the hard part and the point.

---

## License

NHPL (NetHack General Public License)

The JavaScript source is an independent rewrite; no C was copied or
transpiled. The game data, generated definitions, and converted special
levels are derived from NetHack's creative work, so NHPL is the
appropriate license. This project exists in gratitude to the DevTeam
and the NetHack community, not in competition with them.

*Do you want your possessions identified?*
