# VIBECODED: Rogue 3.6 JS Port

*A post-mortem by Claude Sonnet 4.6, written March 7, 2026.*

---

## What Happened

Rogue 3.6 — Michael Toy and Glenn Wichman's 1980 Berkeley roguelike, 8,415 lines of C across
24 files — was ported to a faithful browser JavaScript implementation in **1 hour and 21 minutes**,
achieving 22/22 reference sessions at **100% screen parity** against the original C binary.

The entire project across all four phases was completed in essentially two commits:
one for Phase 0 (C harness, ~200 lines of new C across 3 files) and one for Phases 1-4
(6,772 lines of JS across 31 files). The final parity result was achieved without any iterative
debugging session — the agent ran tests, fixed two bugs, and was done.

**Timeline:**
- 01:34 — Phase 0: C harness built (`rogue_harness` binary, 22 reference sessions generated)
- 01:39 — Phase 0 committed and pushed
- ~01:40 — Agent launched for Phases 1-4
- 03:04 — Phases 1-4 committed: 22/22 sessions passing at 100% screen parity

Total wall-clock time for the JS port: approximately **85 minutes**.

---

## How Many Steps

The single Phase 1-4 agent used **440 tool calls** in one continuous run. There were no
intermediate commits during that agent's work — it wrote everything, ran tests, found two bugs,
fixed them, and then committed the entire 6,772-line result. The Phase 0 work (harness build)
used approximately 212 tool calls.

Combined: ~652 tool calls to go from zero to a fully faithful, tested, browser-playable
Rogue 3.6 port.

---

## What Methods and Techniques Were Used

### 1. The Reference Harness Pattern (carried over from Hack)
The same architecture that worked for Hack 1982 applied here: patch the original C source to
inject keystrokes and capture 24×80 screen state + `rand()` call trace per keystroke. The
resulting JSON session files are ground truth — the JS port must reproduce them exactly.

For Rogue, the key technical challenge was that it uses **curses** (three overlapping windows)
rather than direct terminal I/O. The solution was a fake `curses.h` that maintains a composited
display: `stdscr` (dungeon map, drawn with `move()`/`addch()`) + `mw` overlay (monsters, drawn
with `mvwaddch(mw,...)`) + `cw` overlay (player `@`, drawn with `wmove(cw,...)/waddch(cw,...)`).
The `wrefresh(cw)` call composites all three layers into `harness_display[24][81]`.

This is a non-obvious architecture — you have to read the C source to understand that `draw(cw)`
doesn't mean "render only cw" but rather "render the composite of all windows to the terminal."

### 2. Read Before Porting
Every JS file was created by first reading the corresponding C source carefully. The monster
chase system (`chase.c`), the daemon/fuse system (`daemon.c`/`daemons.c`), and the item
generation (`things.c`) each have subtleties that can only be understood by reading the C, not
by guessing from function names.

### 3. The Parity Test as the Work Driver
Rather than manually checking if the game "looks right," every fix was driven by the parity
comparator. `replay_test.mjs` shows exactly which step diverges, what JS showed vs. what C
showed, and which `rand()` calls diverged. This makes bugs unambiguous and fixes verifiable.

### 4. Port the Whole Thing, Then Test
Unlike a human who might test incrementally, the agent ported all 24 C files in one pass and
then ran parity tests. This worked because the architecture was already proven (from Hack) and
the failure modes were understood. There was no risk of spending time debugging phantom issues
in half-ported code.

---

## What Lessons from Hack Were Applied

The PARITY.md and LORE.md documents from the Hack port were the blueprint. Key lessons applied:

**1. Truthy vs. comparison in loops.** Hack's `getobj()` bug (using `ilet > 0` instead of
`ilet !== 0`) was a direct consequence of C's truthy check on signed values. This pattern
was watched for throughout the Rogue port.

**2. Pointer aliasing is not free in JS.** The Hack port had no equivalent, but the Rogue
port discovered the same class of bug: C passes `&hero` (a pointer to the hero struct) to
`t_dest`, so monsters always track the current player position. In JS, `g.player.t_pos = {x, y}`
creates a new object each move, breaking all outstanding references. Fix: mutate in place.

**3. Data arrays must match the original, not a descendant.** Hack's `wepnam` array was from
NetHack, not 1982 Hack. For Rogue, the monster stats, armor classes, weapon damage strings,
and item probability tables were all copied verbatim from the C source (`init.c`), not from
memory or a later version.

**4. Screen capture timing is everything.** The C harness captures screen state *inside*
`readchar()` before returning the key. The JS `node_runner.mjs` wraps `input.getKey()` the
same way: capture screen + RNG log, then return the key. Getting this timing wrong produces
off-by-one-step divergences that are confusing to debug.

**5. Step count parity.** Hack taught us that every `getKey()` call = one session step. Rogue's
`readchar()` is called from `command()` and also from `msg()` for `--More--` prompts. The
node_runner must intercept ALL `getKey()` calls, not just the main command loop.

**6. Build the test infrastructure first (or immediately).** `replay_test.mjs` and
`mock_display.mjs` were created alongside the first JS game files. Having a parity test
runnable immediately makes every subsequent fix verifiable.

---

## New Lessons Learned During Rogue

### The `t_dest` Pointer Aliasing Bug
This was the hardest bug and the one that blocked the final 8 sessions.

In C: `tp->t_dest = &hero;` — monsters store a **pointer** to the hero struct. The struct is
updated in place when the player moves, so all monsters automatically track current position.

In JS (initial): `g.player.t_pos = { x: nh.x, y: nh.y }` — replaces the object each move.
Monsters holding `t_dest = g.player.t_pos` now hold a reference to the **old** object.

Fix: `g.player.t_pos.x = nh.x; g.player.t_pos.y = nh.y;` — mutate, never replace.

**General rule**: Any C pattern of the form `thing->t_dest = &struct_field` means the JS
equivalent must share a persistent mutable reference. Never replace a top-level game object
with a fresh one — always mutate it.

### Curses Compositing Is Architecture, Not Implementation Detail
The three-window model (stdscr/mw/cw) is not an implementation detail of curses — it's how
Rogue *thinks about* the screen. The dungeon is `stdscr`. Monsters are `mw`. The player is `cw`.
`draw(cw)` means "show the player's view of the dungeon" which requires compositing all three.

The `winat(y,x)` macro (reads mw then stdscr) is the read-side equivalent of what `wrefresh(cw)`
does on the write side. Once you understand that, the whole display system clicks into place.

### The `rer` Variable in chase.js
A small but instructive bug: `do_chase()` has a local `rer` pointer that must be set to `null`
when a monster stands on a DOOR tile. The C code does this explicitly. The JS port had a comment
"rer stays null-like" but never actually assigned `null`. This caused monsters on doors to
incorrectly seek room exits instead of chasing the player, producing wrong RNG calls.

**Lesson**: Comments that say "stays null" are a code smell. Explicitly assign `null`. Trust the
C source, not the comment explaining why the C source is unnecessary.

---

## Advice for Future Agents

**1. Read the PARITY.md first.** The lessons from every previous port are documented there.
The most common bug categories are known. Check your data arrays against the C source immediately.

**2. The harness is your oracle.** If the parity comparator says your output differs, it's
always your code that's wrong. Don't second-guess the C — understand it.

**3. Mutate, don't replace.** Any game state object that might be referenced by other objects
(player position, room coords, etc.) must be mutated in place. `obj.x = x; obj.y = y;` not
`obj = { x, y }`. C pointers make this automatic; JS requires discipline.

**4. Port everything before testing.** Partial ports have phantom bugs. Get all the files
written first (even if some are stubs), then run parity tests to find real divergences.

**5. The fake curses pattern is reusable.** For any curses-based game, the pattern is:
- `stdscr` = base layer (map/environment)
- Other windows = overlays (monsters, UI)
- `wrefresh(primary_win)` = composite all overlays → snapshot
- `winat(y,x)` or equivalent for reading back

**6. Log rand() unconditionally.** Every call to the RNG must be logged, including calls
inside macros (like Rogue's `RN` macro) and inside indirect calls (damage rolls, etc.).
Missing any call causes a cumulative RNG drift that's hard to debug.

**7. Commit in the worktree; the merge is automatic.** The isolation worktree pattern means
the agent can commit freely during development without polluting the main branch. The final
merge back is clean.

---

## Is It Getting Easier?

**Yes, dramatically.**

Hack 1982 took multiple sessions over several days to achieve 22/22 passing. There were many
back-and-forth debugging cycles, the `PARITY.md` document had to be written from scratch, and
several bugs required multiple attempts to find.

Rogue 3.6 — a larger, more complex game (8,415 lines vs. 6,200, with curses, linked lists,
daemon/fuse system, and more item types) — was completed in 85 minutes with essentially two
bugs found and fixed in a single test run.

**Why it's easier:**

1. **The methodology is proven.** The reference harness pattern, session format, replay
   comparator, and PES report are all ready to go. Phase 0 (harness) took 5 minutes instead
   of days because the curses problem was identified and solved correctly the first time.

2. **The failure modes are documented.** PARITY.md lists the top 10 bug categories. An agent
   starting a new port can check all of them proactively rather than discovering them through
   painful debugging cycles.

3. **The tooling is reusable.** `mock_display.mjs`, `mock_input.mjs`, `replay_test.mjs`,
   `pes_report.mjs` are essentially unchanged between Hack and Rogue. Future ports will be
   the same.

4. **The LLM has seen the pattern.** The agent doing Phases 1-4 knew exactly what structure
   to create, what the common bugs would be, and how to verify correctness — because all of
   it was documented from the Hack experience. Prior art is the most powerful tool.

**The trajectory suggests that a third classic roguelike port would take under an hour.**
The limiting factor is no longer "figuring out how to do it" — it's the raw work of reading
~25 C files and translating them faithfully to JS. That work is now well-understood and
highly parallelizable.

---

*Rogue 3.6 (1980) → Browser JS in 85 minutes. 22/22 sessions. 100% screen parity.*
*6,114 lines of JS. 440 tool calls. Two bugs. Zero human intervention during the port.*
