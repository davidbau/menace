# WebHack -- NetHack in Your Browser

A faithful JavaScript port of NetHack, playable in any modern web browser.
ASCII terminal display with DEC line-drawing graphics, native keyboard
commands, no build step required.

**Play it now:** [https://baukit.org/u/davidbau/webhack/](https://baukit.org/u/davidbau/webhack/)

## An Experiment in Vibe Coding

This project was created as an experiment in **vibe coding** -- building
a complex, faithful game port by collaborating with an AI coding assistant
(Claude) rather than writing every line by hand.

The entire codebase -- 17 JavaScript modules, 225 passing tests, two Python
code generators, and this README -- was produced through natural-language
conversation. The human provided direction, taste, and domain knowledge
about NetHack; the AI wrote the code, tests, and documentation.

The goal was to see how far vibe coding can go on a project that demands
real fidelity: porting thousands of lines of C game logic to JavaScript
while preserving NetHack's distinctive feel, mechanics, and visual style.

## Architecture

The port mirrors the original C source structure with traceable references
throughout. See the full architecture and design documents:

- **[Architecture & Design](docs/DESIGN.md)** -- Module structure, display
  system, async game loop, data porting strategy
- **[Design Decisions](docs/DECISIONS.md)** -- Key trade-offs: async input
  queue, `<pre>`/`<span>` rendering, ES6 modules without bundling,
  DECGraphics via Unicode, simplified FOV

### Key Design Choices

- **ES6 modules, no build step** -- Just serve the directory and open
  `index.html`. Each JS module maps to a C source file.
- **Async/await game loop** -- The C code's blocking `nhgetch()` becomes
  `await nhgetch()`, preserving the sequential logic of the original.
- **`<pre>` with per-cell `<span>`** -- 80x24 terminal grid, 16 ANSI colors,
  DEC box-drawing characters for walls.
- **Faithful C references** -- Comments like `// C ref: uhitm.c find_roll_to_hit()`
  link every function to its C source counterpart.

## What's Implemented

- Dungeon generation (rooms, corridors, doors, stairs)
- All 13 player roles with correct starting attributes
- Movement (vi keys, arrow keys, running)
- Melee combat with C-faithful to-hit and damage formulas
- 382 monster types with AI movement, attacks, and special abilities
- 478 object types (weapons, armor, potions, scrolls, etc.)
- Object and gold pickup
- Field of view with room lighting and terrain memory
- Multi-level dungeon descent
- DECGraphics (Unicode box-drawing walls, centered dot floors)
- Status bar with HP, AC, experience, hunger, conditions

## What's Not Yet Implemented

Special levels, shops, altars/prayer, spellcasting, wand/potion/scroll
effects, pets, eating system, polymorph, traps, full inventory management
(wear/wield/quaff/read/zap), and many other subsystems. NetHack has
~150,000 lines of C -- this port covers the core loop and early gameplay.

## Running Locally

Serve the directory with any static HTTP server:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Or with Node:

```bash
npx serve .
```

Note: ES6 modules require HTTP -- `file://` URLs won't work due to CORS.

## Tests

225 tests across three suites:

```bash
npm install          # install puppeteer for E2E tests
npm test             # run all tests
npm run test:unit    # 102 unit tests only
npm run test:e2e     # 34 E2E browser tests only
```

## Data Generation

Monster and object data are auto-generated from the NetHack C source
headers via Python scripts:

```bash
python3 gen_monsters.py > js/monsters.js   # 382 monsters
python3 gen_objects.py > js/objects.js      # 478 objects
```

## License

NHPL (NetHack General Public License)
