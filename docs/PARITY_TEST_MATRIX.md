# Parity Test Matrix

This document is the canonical reference for what "parity" means operationally
in this project. It defines the test suites, session categories, comparison
channels, deterministic controls, and quality gates that govern C-vs-JS
fidelity.

For narrative guides to the testing infrastructure, dashboard, and workflows,
see [docs/TESTING.md](TESTING.md).

## Test Commands

| Command | Scope | What it runs | Gate |
|---------|-------|-------------|------|
| `npm run test:unit` | Unit tests | `node --test test/unit/*.test.js` (84 files) | PR |
| `npm run test:session` | Session parity tests | `node test/comparison/sessions.test.js` — all session types | PR |
| `npm test` | PR gate aggregate | `test:unit` + `test:session` | PR |
| `npm run test:e2e` | End-to-end browser tests | `node --test --test-concurrency=1 test/e2e/*.test.js` (3 files, Puppeteer) | Release |
| `npm run test:all` | Release gate aggregate | `test:unit` + `test:session` + `test:e2e` | Release |

## Session Categories

All sessions are loaded from two directories — `test/comparison/sessions/`
and `test/comparison/maps/` — and classified into types by the `deriveType`
function in `test/comparison/session_loader.js`. The test runner groups results
by type via `sessions.test.js`.

| Type | Count | Seeds | What's checked | Example file |
|------|------:|-------|---------------|-------------|
| **chargen** | 91 | 1, 42, 100, 200, 300 | Character creation: 13 roles × 5 seeds, plus race and alignment variants at seed 42. Compares startup RNG sequence and initial map grid. | `seed42_chargen_wizard.session.json` |
| **gameplay** | 49 | Various (1–306) | In-game play: selfplay traces (5–200 turns per role), wizard-mode sessions (13 roles), input-prefix tests, inventory, items, gnomish mines descent, and option-variant sessions (verbose, DECgraphics, time). Compares RNG, screen text, screen color (ANSI). | `seed3_selfplay_100turns_gameplay.session.json` |
| **interface** | 3 | 42 | Pregame UI screens: startup, options menu, name prompt. Compares screen text and color with normalization for version strings and box-drawing characters. | `interface_startup.session.json` |
| **map** | 10 | 16, 72, 119, 163, 306 | Dungeon level generation: multi-depth map grid comparison (typGrid) and per-level RNG. Includes paired `_map` / `_maps_c` files. | `seed119_map.session.json` |
| **special** | 50 | 1, 42, 100 (+ 200, 300 for sokoban) | Special level generation: 16 level groups × 3 seeds. Validates that level grids have correct 21×80 dimensions. | `seed42_special_mines.session.json` |

**Total: 203 session files** (142 in `sessions/`, 61 in `maps/`).

### Chargen breakdown

| Variant | Count | Seeds | Source in `seeds.json` |
|---------|------:|-------|----------------------|
| Base roles (13 roles × 5 seeds) | 65 | 1, 42, 100, 200, 300 | `chargen_seeds.seeds` × `chargen_seeds.sessions` |
| Race variants (seed 42) | 15 | 42 | `chargen_seeds.race_variants` |
| Alignment variants (seed 42) | 10 | 42 | `chargen_seeds.alignment_variants` |
| Interface chargen | 1 | 42 | `interface_seeds` (typed as chargen by filename) |

### Gameplay breakdown

| Subcategory | Count | Notes |
|-------------|------:|-------|
| Explicit gameplay traces | 16 | Movement, combat prefixes, multidigit, inventory, items, gnomish mines |
| Per-role selfplay 200-turn | 13 | Seeds 101–113, one per role |
| Per-role wizard-mode | 13 | Seeds 201–213, wish + explore per role |
| Option variants | 6 | Seeds 301–306: verbose, DECgraphics, time on/off |
| Map dir fallthrough | 1 | `seed42_castle.session.json` |

### Special level groups

The 16 groups tested across 3 seeds (1, 42, 100) are: mines, sokoban, oracle,
bigroom, castle, medusa, quest, gehennom, knox, valley, vlad, wizard, filler,
rogue, tutorial, planes. Sokoban additionally has seeds 200 and 300.

## Parity Dimensions

Session tests compare JS replay output against C reference captures across
five channels, implemented in `test/comparison/comparators.js`:

| Channel | What it checks | Comparison function | Mismatch report |
|---------|---------------|-------------------|----------------|
| **RNG** | PRNG call sequence (ISAAC64). Normalized: strips source tags, filters midlog/composite entries. | `compareRng()` | First divergent call index, JS vs session values, call stack context |
| **Screen** | Terminal text output (24 lines). Trailing spaces trimmed; gameplay screens get col-0 padding normalization; interface screens normalize box-drawing and version strings. | `compareScreenLines()`, `compareInterfaceScreens()`, `compareGameplayScreens()` | First mismatched row with JS vs session line content |
| **Grid** | Dungeon typGrid (21×80 tile-type array). Cell-by-cell integer comparison. | `compareGrids()`, `findFirstGridDiff()` | First differing cell (x, y, JS value, session value) |
| **Color** | ANSI terminal attributes (fg, bg, bold, inverse, underline per cell). Parses SGR sequences and DEC special graphics. | `compareScreenAnsi()` | First mismatched row/col with cell attribute details |
| **Metrics** | Aggregate pass/fail counts per channel (rng matched/total, screens matched/total, grids matched/total, colors matched/total). | `test_result_format.js` | Summary counts in result object |

A session passes when all checked channels match. The `firstDivergence` and
`firstDivergences` fields on each result identify the earliest mismatch per
channel for debugging.

## Deterministic Controls

Parity testing requires bitwise-reproducible behavior across C and JS. These
controls eliminate environmental nondeterminism:

| Control | What it fixes | C enforcement | JS enforcement |
|---------|--------------|---------------|---------------|
| **Seed** | PRNG initial state (ISAAC64) | Passed via `run_session.py` / harness startup | Passed to `game.init({ seed })` or `replaySession(seed, ...)` |
| **Date/time** | In-game clock, moon phase, Friday-13th checks | Harness patches `gettimeofday` / build-time constants | `replay_core.js` uses fixed epoch; clock functions return deterministic values |
| **Terminal size** | Screen dimensions (80×24) | Harness forces `LINES=24 COLUMNS=80` | `HeadlessDisplay` fixed at 80×24; comparators hard-code `width = 80` |
| **Options/flags** | Game behavior flags (verbose, pickup, symset, color, etc.) | Harness sets `.nethackrc` or command-line equivalents | `replayFlags` object merged with `DEFAULT_FLAGS` before replay |
| **Sorted qsort** | Stable sort order for tie-breaking in object/monster lists | C harness uses stable qsort variant | JS `Array.prototype.sort` is stable per spec (ES2019+) |
| **Input replay** | Keystroke-by-keystroke game input | Harness feeds recorded keystrokes via TTY pipe | `replaySession()` feeds keys via `input.pushKey()` with per-step screen stabilization |

## Quality Gates

### PR gate (`npm test`)

| Requirement | Details |
|------------|---------|
| Unit tests | All 84 unit test files pass |
| Session tests | All 203 sessions pass across all types |
| Regressions | No previously-passing session may regress to failing |

### Release gate (`npm run test:all` + golden comparison)

| Requirement | Details |
|------------|---------|
| PR gate | Everything above |
| E2E tests | 3 Puppeteer browser tests pass (startup, gameplay, game flow) |
| Golden comparison | `--golden` flag compares JS output against golden branch captures |

## Session Recording

New sessions are generated using Python scripts in `test/comparison/c-harness/`
that drive a patched C NetHack build:

| Script | What it generates |
|--------|------------------|
| `gen_chargen_sessions.py` | Character creation sessions from `seeds.json` chargen definitions |
| `gen_selfplay_trace.py` | Selfplay gameplay traces |
| `gen_selfplay_agent_trace.py` | Agent-driven selfplay traces |
| `gen_map_sessions.py` | Multi-depth map generation sessions |
| `gen_special_sessions.py` | Special level grid captures |
| `gen_interface_sessions.py` | Pregame UI interaction captures |
| `gen_option_sessions.py` | Option-variant gameplay sessions |
| `create_wizard_sessions.py` | Wizard-mode per-role sessions |
| `run_session.py` | Low-level single-session runner |
| `setup.sh` | Builds patched C NetHack for session capture |

Session definitions live in `test/comparison/seeds.json`. To add a new session:
1. Add the seed/moves/options entry to the appropriate section of `seeds.json`.
2. Run the corresponding `gen_*.py` script from `c-harness/` to capture the C reference.
3. The resulting `.session.json` file goes into `sessions/` or `maps/` as appropriate.
4. Run `npm run test:session` to verify the JS port matches.
