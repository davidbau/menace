# Hack 1982 JS Port — Process Journal

*Started March 8, 2026 by Claude Sonnet 4.6.*
*This document is updated in-place as work proceeds.*

---

## How We Got Here

### The Original Port (March 6–7, 2026)

Hack 1982 — Jay Fenlason's single-author roguelike written at MIT, ~6,200 lines of C across
9 files — was ported to JavaScript over approximately one day of calendar time. The methodology:

**Phase 0 (~noon March 6):** Build a C reference harness. Patch the original C source to inject
keystrokes and capture 24×80 screen state + `rand()` call trace per keystroke, emit JSON.
Six initial sessions generated (seeds 1, 42, 100, 777, 1337, 2023).

**Phases 1–3 (March 6 afternoon):** Port all 9 C files to JS. This was largely straightforward
except for the curses-adjacent display system and the level save/load mechanism (`savelev`/`getlev`).
The glibc LCG formula had to be matched exactly (32-bit signed arithmetic, specific bit shifting).

**Phase 4 (March 6 evening–midnight):** Systematic parity debugging. Multiple commits to fix:
- `topl` reset bug causing spurious `--More--` prompts
- Sentinel sort in monster list
- `mdone` reset between steps
- CORR bitfield value (wrong constant)
- `omoves` initialization for RNG drift
- SLEEP bitfield divergence
- 19/22 → 22/22 passing (100% screen parity) at midnight March 6–7.

The full debugging history and lessons are in `LORE.md` and `PARITY.md`.

**Expand sessions (March 7):** The 22 sessions were extended and a PES report / run script added.
Coverage was measured for the first time: **62.4% statements**.

---

## The Coverage Problem

As of March 8, 2026, coverage sits at:

| File | Statements | Key gap |
|------|-----------|---------|
| `do.js` | 26% | item use (potions, scrolls, armor, rings, wands) |
| `do1.js` | 20% | buzz/bolt combat, dosave/dorecover, ring-off |
| `mon.js` | 52% | monster combat paths, stealing, poison, exp loss |
| `lev.js` | 54% | level save/restore (only runs on stair transit) |
| `hack.js` | 63% | core combat, movement edge cases |
| `mklev.js` | 77% | dungeon gen edge cases |
| `pri.js` | 79% | display/UI edge cases |
| `main.js` | 66% | game init, death, end-game |
| **All files** | **62.4%** | |

The root cause is simple: the 22 sessions are very short navigation sequences. They barely use
items, rarely fight, and rarely descend stairs. The game code for item-use, multi-level play,
and combat is fully written but never exercised by the test sessions.

---

## The Plan

### Part A: Enable Wizard Mode in C Harness

The harness currently runs with `flags.magic = 0`. Hack's wizard mode (enabled by `domagic()`)
allows:
- Creating items from thin air (`F` key — `makemon(0)` for monsters, object creation)
- `d` prefix in wizard mode gives extra diagnostics
- Level skipping

We'll patch `hack_harness.c` to call `domagic()` before the game loop when a `WIZARD=1`
env var is set (or a `--wizard` flag). This bypasses the password check.
The session JSON will include `"wizard": true` to flag wizard sessions.

### Part B: Generate 40+ New Sessions

Target sessions covering:
1. **Item use** — potions, scrolls, wands, armor, rings (each type)
2. **Multi-level play** — descend 3+ levels (exercises `lev.js` save/restore)
3. **Extended combat** — longer fights, monster death, experience gain
4. **Death/end-game** — player dies or quits (exercises `main.js` done/done1)
5. **Steal/poison** — specific monster interactions in `mon.js`

### Part C: Direct JS Unit Tests

For paths that diverge from C (C calls `exit()` on death, JS doesn't), write direct tests
like the Rogue `coverage_extra.mjs` approach. Target: `done()`, `done1()`, `dosave()`,
`dorecover()`.

### Part D: Fix Bugs Found

History suggests coverage sessions will find real bugs. Fix them as we go.

### Expected Outcome

Target: **~85% statement coverage**, similar to what Rogue achieved. The ceiling is set by
truly unreachable code (some polymorph variants, dead error paths) and paths that would require
specific RNG outcomes not reliably achievable via keystroke injection.

---

## Execution Log

### Step 1: Assess the harness wizard mode situation

*March 8, 2026*

First, check what wizard mode actually does in the harness and how sessions are generated.

```
hack/hack-c/patched/hack_harness.c  — main harness
hack/hack-c/patched/make_sessions.py — session generator
hack/hack-c/patched/run_session.py   — single session runner
```

The C wizard mode (`domagic()`) is triggered by Ctrl-\ in normal play, protected by a
password or UID check. In the harness, we can simply set `flags.magic = 1` and call
`tellall()` (which identifies all items) before the game loop. This gives us wizard access
without the password dance.

Key wizard commands available in C:
- `^` — show trap
- `^T` — teleport (wizard teleport)
- `F` followed by monster letter — create monster
- `d` mode — diagnostics

However, Hack 1982's wizard item-creation is monster-focused. It doesn't have a "give me
a potion" command. Items come from killing monsters or finding them in the dungeon.

**Revised approach:** Rather than relying on wizard mode for items, use longer sessions with
specific seeds that are known to generate items early. The BFS AI player (`ai_player.mjs`)
already exists for Rogue — we can use the same approach for Hack: write a Python session
generator that simulates longer gameplay with exploration keys.

Actually, the simplest approach: generate sessions with 300–500 keystrokes of exploration.
Items will appear naturally. The `make_sessions.py` sessions are only 20–40 keystrokes.

### Step 2: Revised Approach — Direct JS Tests (Not Wizard Mode)

*March 8, 2026*

**Key insight**: The plan called for wizard mode and longer C sessions. But after examining
the C harness, wizard mode in Hack 1982 doesn't provide item creation — it only shows
diagnostics. And longer exploration sessions would take time to generate while still not
guaranteeing item encounter.

**Better approach**: Direct JS unit tests, following the Rogue `coverage_extra.mjs` pattern.
The `gameLoop()` function + MockInput intercept gives us a clean hook: the **first `getKey()`
call** happens after dungeon generation. We can add items to `game.invent` at that point,
then inject command keystrokes.

```javascript
async function runWith(seed, setupFn, keys) {
  // ...setup game, display, input...
  input.getKey = async function () {
    if (!initialized) { initialized = true; if (setupFn) setupFn(g); }
    if (keyIdx >= keys.length) throw new SessionDone();
    return keys[keyIdx++];
  };
  await gameLoop(seed);
}
```

**Files created**:
- `hack/test/coverage_direct.mjs` — 37 targeted tests
- `hack/test/coverage_all.mjs` — combined runner (sessions + direct tests)

---

### Step 3: Coverage Results and What We Learned

*March 8, 2026*

#### Initial state (62.4%):
The 22 reference sessions exercise navigation and basic combat. Items are almost never used
because the player starts with only food, a mace, and ring armor. No potions, scrolls, rings,
wands, or armor alternatives.

#### After direct tests (82.6%):

| File | Before | After | Notes |
|------|--------|-------|-------|
| `do.js` | 26% | 88% | All item-use commands covered |
| `do1.js` | 20% | 84% | buzz/bolt, save/restore, ring effects |
| `main.js` | 66% | 83% | losestr, hunger, stair code |
| `mklev.js` | 77% | 89% | maze level gen via flags.maze=2 trick |
| `hack.js` | 63% | 78% | attmon/amon, gobj pickup |
| `pri.js` | 79% | 89% | display helpers |
| `do.js` | 26% | 88% | full item-use coverage |

#### Key insights from the work:

**1. Ring "Right or Left?" prompt is case-sensitive.** The do-while loop checks
`'rl'.includes(side)` — uppercase 'R' does not match. Initial test used `'Pa Ra '` (wrong);
fixed to `'Pal R  '`.

**2. pline() --More-- protocol.** `getobj()` explicitly sets `game.flags.topl = 1` after its
own prompt, so the NEXT pline won't trigger --More--. This means: for getobj → select → show
result, you only need one space (for the result pline if it's the second pline in sequence).

**3. placeMonsterAdjacent helper** forces `levl[nx][ny].typ = ROOM` for the chosen adjacent
cell, ensuring the movement key succeeds. This is a test-only hack but perfectly valid for
coverage purposes since we're not checking screen parity.

**4. dirKey must be pre-computed.** JavaScript evaluates `runWith(seed, setupFn, dirKey + ' ')`
*before* calling runWith, so `dirKey.repeat(5)` uses the initialized value. The setupFn updates
`dirKey` but too late. Solution: initialize `dirKey = 'l'` and ensure placeMonsterAdjacent
tries 'l' (right direction) first — so the combat goes left.

Wait, that's wrong: I force the cell to ROOM and place to the right. Let me correct: I move
PLAYER right ('l'), monster is placed at (ux+1, uy). So pre-computing `'l'` is correct.

**5. Maze level trick**: `game.flags.maze` determines which dungeon level is a maze.
Setting `g.flags.maze = 2` in setupFn then descending causes `makemaz()` to generate
a maze instead of normal rooms. Covered 12% of mklev.js in one test.

**6. Bolt wands need monsters in path.** The testWands() test fires all wands in direction 'h',
but with no monster in that direction, the bolt never hits anything. Added testBuzzZhitTypes()
which places a monster at (ux-1, uy) and fires left — covers all 5 zhit() types.

**7. Stair descent required teleporting player to stairs.** The 22 sessions have stair keys
but the player is never actually AT the staircase when '>' is sent. Added stair tests that
set `g.u.ux = g.xdnstair; g.u.uy = g.ydnstair` in setupFn before sending '>'.

#### Remaining uncovered code (the hard ceiling) — after Wave 6:

| Area | Coverage | Why hard to cover |
|------|----------|-------------------|
| `mon.js` | 99% | 3 dead-code stubs: mnexto rloc fallback (488-489), attmon/amon no-op stubs (603-610) |
| `lev.js` | 99% | lev.js 68-70: smon_key reconnect — impossible without serialized stole with monster key |
| `do.js` | 98% | do.js 168-175: carry-items-while-throwing path; 307: never-taken branch |
| `do1.js` | 98% | do1.js 106,210,272,280-282,318-319: buzz/bolt edge cases |
| `hack.js` | 96% | hack.js 195-215 (door-move paths), 294-296 (bad-trap dead code), 317-320 (pow2 dead), 501-503 (purple worm reduction), 540/618 (dead stubs) |
| `mklev.js` | 94% | mklev.js: mkmim() (dlevel>8), specific room-corner configurations |
| `main.js` | 86% | main.js: rhack fallback (100-170), death screen dead-end code (142-170), regen branch (298-300) |

**Practical ceiling achieved**: ~97% statement coverage. The remaining 3% is:
- Dead code (pow2(), vowelStart(), doup wrapper, attmon/amon stubs)
- Impossible states (contradictory preconditions: sleeping monster adjacent, etc.)
- Extremely rare probabilistic paths that would require thousands more test iterations

---

### Step 4: Wave 6 — Direct dochug() Tests Break the --More-- Barrier

*March 8, 2026*

**Key insight**: The game loop approach (`runWith()`) causes monster attack plines to
call `await getKey()` for --More-- prompts. This consumes keys from the finite test
sequence, preventing the REST of the monster's attack body from executing. Specifically,
when a monster hits AND triggers a secondary effect (case 'S' snake poison, case 'k'
killer bee poison, case 'A' giant ant weakness, etc.):

1. `await mhit(mdat.mname)` → pline → --More-- → consumes one key
2. `await pline('You are poisoned...')` → --More-- → consumes another key
3. If the key sequence runs out BEFORE step 2, the closing `}` of the if block
   is NEVER reached, so c8 reports it as uncovered.

**Fix**: Direct `dochug()` calls with `g.input.getKey = async () => ' '` (unlimited
keys). This allows all plines to complete without exhausting the key supply.

**Tests added**:
- `testSnakePoisonDirect`: 1000 dochug calls on snake → mon.js 274-275 (snake bite)
- `testHomonculousSleepDirect`: 500 calls → mon.js 206-208 (sleep bite body)
- `testKillerBeePoisonDirect`: 500 calls → mon.js 218-220 (killer bee poison)
- `testLeprechaunStealDirect`: 200 calls → mon.js 224-238 (gold steal body)
- `testOwlbearCrush`: 30 seeds × 50 calls → mon.js 254-256 (owlbear crush)
- `testPurpleWormSwallow`: 200 calls → mon.js 260-262 (purple worm swallow)
- `testGelCubeDirect`: 500 calls → mon.js 198-203 (gelatinous cube freeze)
- `testDisenchanterBuzzDirect`: 300 calls → mon.js 174-175 (disenchanter buzz)
- `testBlackPuddingDirect`: 200 calls → mon.js 144-146 (black pudding engulf)
- `testGiantAntDirect`: 500 calls → mon.js 149-150 (giant ant weakness)
- `testCockatriceStone`: 500 calls → mon.js 164-166 (cockatrice stone)
- `testGAt`: direct call → mon.js 22-30 (g_at generic searcher)
- `testYellowLightFight` fix: mhp=100 + ' ' key → mon.js 295-303 (yellow light)
- `testFreezingSphere` fix: mhp=100 + ' ' key → mon.js 185-196 (sphere explosion)

**Coverage progression (Step 4)**:
- Start: 95.02% → Wave 6 continued: 96.84%
- mon.js: 59% → 99.01% (only 3 dead-code lines remain)
- All monster special attacks now covered via direct dochug() pattern

**Lesson**: For probabilistic code inside `await`-heavy bodies (monster special attacks),
game loop tests are unreliable because --More-- plines consume the finite key supply.
The direct `dochug(mtmp)` + unlimited keys pattern is the correct approach.

---

*[Document continues as work proceeds]*
