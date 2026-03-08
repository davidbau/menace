# How Rogue 3.6 Was Ported to JavaScript

*Written March 8, 2026 by Claude Sonnet 4.6.*

---

## Overview

Rogue 3.6 — Michael Toy and Glenn Wichman's 1980 Berkeley roguelike, 8,415 lines of C across
24 files — was ported to a faithful browser JavaScript implementation across roughly **38 hours**
of calendar time (March 6–8, 2026), with the core port itself taking approximately **85 minutes**
of agent time.

The final state: 34/34 reference sessions pass at 100% screen parity against the original C
binary. 201 test sessions exist. JS coverage is 89.6%. The game is playable at mazesofmenace.net.

---

## Phases and Timeline

### Phase 0: C Reference Harness (March 6–7, ~1:34–1:39 AM)

**Human role:** Set up the upstream C source and gave the agent the task.

**Agent work (212 tool calls):** Patched the Rogue C source to build a test harness. The key
challenge was that Rogue uses **curses** (overlapping windows) rather than direct terminal I/O.
Three overlapping display surfaces exist in C:
- `stdscr` — dungeon map, drawn with `move()`/`addch()`
- `mw` — monster positions, drawn with `mvwaddch(mw,...)`
- `cw` — player `@` + UI layer, drawn with `wmove(cw,...)`/`waddch(cw,...)`

`wrefresh(cw)` in the original code composites all three layers. The harness needed to fake
this entire curses stack without running an actual terminal.

The solution was a `hack_curses.c` file providing a fake `<curses.h>` that maintained three
in-memory character arrays and composited them on `wrefresh()`. This produced `harness_display[24][81]`
which could be JSON-serialized per keystroke.

Session format produced: `{ seed, steps[{ key, rng[], screen[24] }] }` — identical to the
format used by the Hack 1982 harness.

22 reference sessions were generated, committed, and pushed. These became the ground truth.

---

### Phase 1–4: JS Port (March 7, ~1:40–3:04 AM, 85 minutes)

**Human role:** None during this phase. The agent worked autonomously.

**Agent work (440 tool calls):** All 24 C files were translated to JS in a single continuous
run. The agent:

1. Read each C source file carefully before translating
2. Created 31 JS files totaling 6,772 lines
3. Structured the codebase with explicit dependency injection (`_setXxxDeps()` pattern) so
   modules have no circular imports and tests can mock dependencies
4. Created test infrastructure: `mock_display.mjs`, `mock_input.mjs`, `node_runner.mjs`,
   `replay_test.mjs`, `pes_report.mjs`
5. Ran parity tests, found **two bugs**, fixed them, achieved 22/22 sessions at 100% parity
6. Committed everything in one shot

The two bugs found and fixed in the initial test run:
- **Pick-up failure**: A bitmask constant (`ISFOUND`) was wrong
- **Ring RNG divergence**: Player position object was being replaced rather than mutated in
  place (the `t_dest` pointer aliasing problem — see below)

---

### Post-port: UI, Save, Wizard Mode (March 7, morning)

**Human role:** Requested additional features.

**Agent work:** Added save/restore (localStorage JSON), options screen, score/leaderboard,
and wizard mode (activated via `?wizard` URL param). These had no C harness counterparts to
test against, so they were verified manually and through direct JS unit tests.

---

### Coverage Phase (March 7–8)

**Human role:** Directed coverage improvement; gave go-ahead for each approach.

**Agent work:** Starting from ~72% coverage (measured by c8/V8), systematically raised coverage
to 89.6% over approximately 20 commits. Approach:

1. **Run coverage, identify lowest-covered files** — look at which lines were uncovered
2. **Write targeted C harness sessions** — craft (seed, keystroke) pairs that exercise
   specific code paths. 201 sessions total, up from 22.
3. **Fix bugs uncovered by new sessions** — coverage work found real bugs: `ISFOUND` bitmask,
   `g.MAXPACK` constant, `WS_HIT` wand logic, `whatis()` scroll behavior, `waste_time()` missing
   daemon calls, `get_line()` echo handling
4. **Add direct JS unit tests** for paths unreachable via C sessions — primarily `rip.js`
   (`death()`, `total_winner()`) and `save.js` (`saveGame()`, `loadGameState()`)

Session generation was done by running the C harness with specific seeds and keystroke sequences
designed to trigger particular game events (wand firing, armor equipping, stair descent, etc.).
Wizard mode sessions gave direct access to item creation and teleportation, bypassing RNG-dependent
exploration.

---

## How Much Was Autonomous vs. Human-Guided

| Phase | Human input | Agent autonomy |
|-------|-------------|----------------|
| Phase 0 (harness) | "Build the C harness for Rogue" | Full — architecture, implementation, session generation |
| Phase 1–4 (JS port) | None during the run | Full — read C, translated all 24 files, ran tests, fixed bugs, committed |
| UI/save/options | "Add save game, options, wizard mode" | Full implementation |
| Coverage direction | "Improve coverage" + approval of approach | Identified targets, wrote sessions, fixed bugs |
| Coverage debugging | Occasional "what's blocking X?" | Most debugging autonomous |

The human role was primarily:
- **Setting goals** ("achieve parity", "improve coverage", "add save game")
- **Approving pushes** to the shared repository
- **Asking follow-up questions** that prompted the post-port documentation

All code was written by the agent. No human wrote any JavaScript or C for this port.

---

## Key Technical Techniques

### 1. Reference Harness as Oracle

The core methodology: patch the original C source minimally to inject keystrokes and capture
screen output + RNG trace per keystroke. The resulting JSON session files are ground truth.
The JS port must reproduce them exactly.

This converts the entire correctness question into a diff problem. There is no ambiguity about
what "correct" means — the C binary defines it. The parity report shows exactly which session,
which step, and which screen cells differ.

### 2. Dependency Injection Pattern

Every JS module uses explicit `_setXxxDeps(deps)` functions rather than top-level imports for
cross-module references. Example:

```js
// fight.js
let _msg, _death, _status;
export function _setFightDeps(deps) {
  _msg = deps.msg;
  _death = deps.death;
  _status = deps.status;
}
```

This allows `node_runner.mjs` to swap in `MockDisplay` and `MockInput` without touching game
code, and allows coverage tests to isolate specific modules.

### 3. Read Before Translating

Every JS file was preceded by a careful read of the corresponding C source. The monster chase
system (`chase.c`), the daemon/fuse scheduler (`daemon.c`/`daemons.c`), and the item generation
system (`things.c`) have subtleties — particularly in how data structures are shared and mutated —
that cannot be guessed from function names alone.

### 4. BFS AI Player for Coverage Sessions

Some code paths (multi-level play, combat with rare monsters, stair descent to level 20+) are
hard to reach with hand-crafted keystroke sequences. A BFS-based AI player was added
(`rogue/scripts/ai_player.mjs`) that navigates dungeons by exploring reachable floor tiles
and can descend stairs repeatedly. This allowed generating sessions that reach deep dungeon
levels deterministically.

### 5. Wizard Mode for Targeted Coverage

The `?wizard` URL param enables wizard mode, which allows:
- `'c'` — create random item
- `'>'` — descend immediately
- `'p'` — show current level
- `'f'` — show current food level

Wizard sessions could target specific item types (wands, scrolls, rings) and specific game
states (well-equipped player, deep level) without waiting for RNG to cooperate.

### 6. Direct JS Unit Tests for Unreachable Paths

Some code paths cannot be reached via C harness sessions because they require game states
(player death, victory) that the C binary handles differently than the JS port (C calls
`exit()` directly; JS shows a screen and sets `g.playing = false`). These were covered with
direct unit tests in `coverage_extra.mjs` / `coverage_all.mjs` that call functions like
`death()` and `total_winner()` directly with a mock game state.

---

## Key Insights and Lessons Learned

### The `t_dest` Pointer Aliasing Problem

The hardest class of bug in this port (and the one that blocked the final 8 sessions in the
initial run) comes from C's use of pointers to live structs.

In C: `tp->t_dest = &hero;` — a monster stores a *pointer* to the hero struct. When the hero
moves, the struct is updated in place, so all monsters automatically see the new position.

Initial JS translation: `g.player.t_pos = { x: nh.x, y: nh.y }` — this replaces the object
each move. Any monster holding a reference to `g.player.t_pos` now holds a reference to
the *old* object. Monsters stop tracking the player.

Fix: always mutate, never replace — `g.player.t_pos.x = nh.x; g.player.t_pos.y = nh.y;`

**General rule**: Any C code of the form `thing->field = &global_struct` means JS must share
a persistent mutable reference to that object. Replacing a top-level game object with a fresh
`{ x, y }` is always wrong if other objects hold references to it.

### Curses Compositing Is Architecture, Not Implementation Detail

Rogue's three-window curses model is how the game *thinks* about the screen:
- `stdscr` = dungeon (what's in the world)
- `mw` = monsters (living things overlaid on world)
- `cw` = player view (what the player sees, including UI chrome)

`draw(cw)` ("refresh the player window") triggers compositing of all three layers, because
the player's view is always the union of all information. `winat(y,x)` (which reads `mw` before
`stdscr`) is the read-side equivalent of this compositing logic.

Understanding this made the entire display system coherent. Misunderstanding it would have
produced subtle rendering bugs impossible to track down without knowing the architecture.

### The `rer` Variable — Comments That Say "Stays Null" Are Wrong

In `chase.c`, `do_chase()` has a local `rer` pointer that must be explicitly set to `null`
when a monster stands on a DOOR tile. The initial JS translation had a comment
"rer stays null-like" but never actually assigned it. This caused monsters on doors to
seek room exits instead of chasing the player, producing wrong RNG sequences downstream.

**Lesson**: A comment explaining why an assignment is unnecessary is almost always wrong.
Match the C source exactly, even when the reason isn't obvious.

### Coverage Work Finds Real Bugs

Every coverage session expansion found at least one real bug:
- `ISFOUND` bitmask wrong (pack.js) — items couldn't be picked up after being seen
- `g.MAXPACK` constant wrong — pack fill check used wrong value
- `WS_HIT` wand type handling — bolt wands didn't deal damage correctly
- `whatis()` scroll identification — identified wrong item type
- `waste_time()` not implemented — armor equipping didn't run monster turns
- `get_line()` echo behavior — typed characters not shown in input prompts

The coverage sessions weren't just measuring existing code — they were exercising it under
conditions that revealed bugs. This is the practical value of high coverage: it's also a form
of stress testing.

### Node.js Built-in `localStorage` Is a Trap

Node.js 25.x provides a built-in `localStorage` object (for `--localstorage-file` support).
This object exists but lacks `getItem`/`setItem` when no valid file path is given. The
conditional guard `if (typeof globalThis.localStorage === 'undefined')` in test files failed
silently because the built-in stub wasn't `undefined` — it was just incomplete.

Fix: unconditionally install the mock, never conditionally. Platform "compatibility" that
silently installs a broken implementation is worse than no implementation.

---

## What Made This Faster Than the Hack Port

The Hack 1982 port took roughly one full day. Rogue 3.6 — a larger, more complex game — took
85 minutes for the core port. The speedup came from:

1. **Proven methodology.** The reference harness pattern, session format, replay comparator,
   and PES report were all ready and correct before the first line of Rogue JS was written.

2. **Documented failure modes.** The top bug categories (pointer aliasing, truthy vs. comparison,
   data arrays from wrong source version, screen capture timing) were known and watched for.

3. **Reusable infrastructure.** `mock_display.mjs`, `mock_input.mjs`, `replay_test.mjs`, and
   `pes_report.mjs` needed only minor adaptation from the Hack versions.

4. **The agent had seen the pattern.** Prior documented experience with an identical methodology
   is the most powerful accelerant. The agent doing the Rogue port didn't have to reason from
   first principles about any of the hard problems — it had solutions.

---

## Numbers

| Metric | Value |
|--------|-------|
| Original C source | 8,415 lines, 24 files |
| JS port | ~8,629 lines, 37 files |
| Core port time | ~85 minutes (440 tool calls) |
| Total calendar time | ~38 hours (March 6–8) |
| Reference sessions (initial) | 22 |
| Reference sessions (final) | 201 |
| Session parity | 34/34 pass at 100% screen match |
| JS test coverage | 89.6% statements |
| Bugs found post-port | ~8 (all via coverage sessions) |
| Human code written | 0 lines |

---

## File Structure

```
rogue/
  rogue-c/
    upstream/          Original 1980 C source, unmodified
    patched/           Patched source + harness (hack_curses.c, harness_main.c)
  js/                  31 JS modules (~8,600 lines)
    game.js            GameState class — all mutable state
    gstate.js          Global game singleton
    main.js            Initialization, dependency wiring, game loop
    [24 game modules]  One per C source file
  test/
    sessions/          201 JSON session fixtures
    node_runner.mjs    Runs full game session in Node with mocks
    replay_test.mjs    Compares JS output against C sessions
    pes_report.mjs     Colored parity table
    mock_display.mjs   DOM-free display adapter
    mock_input.mjs     DOM-free input adapter
    coverage_all.mjs   Combined coverage runner (sessions + direct tests)
  scripts/
    run-rogue-tests.sh Run all sessions and show PES table
    run-coverage.sh    Run c8 coverage and generate HTML report
    ai_player.mjs      BFS dungeon navigator for deep coverage sessions
  coverage/            V8 coverage HTML report (committed)
  VIBECODED.md         Immediate post-mortem (written March 7)
  CODEMATCH.md         C→JS function mapping with status
  PROCESS.md           This document
```
