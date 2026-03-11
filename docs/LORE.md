# Porting Lore

> *You descend into the library. The shelves are lined with scrolls — some*
> *blessed, some cursed, all hard-won. Each records a lesson from the long*
> *campaign to rebuild the Mazes of Menace in JavaScript, stone by stone,*
> *random number by random number.*

These are the durable lessons learned during C-to-JS porting. When you
encounter a parity divergence that doesn't make sense, read here first —
the answer may already be written in blood.

For the full narratives of how these lessons were discovered, see the
[Phase chronicles](#phase-chronicles) at the end of this document.

---

## The Cardinal Rules

### 1. The RNG is the source of truth

If the RNG sequences diverge, everything else is noise. A screen mismatch
caused by an RNG divergence at step 5 tells you nothing about the screen
code — it tells you something consumed or failed to consume a random number
at step 5. Fix the RNG first. Always.

### 2. Read the C, not the comments

C comments lie. C code does not. When porting behavior, trace the actual
execution path in C and replicate it exactly. Comments explain intent, but
parity requires matching *implementation*, including its bugs. When a comment
says "this does X" and the code does Y, port Y.

### 3. Follow the first divergence

The test harness reports the first mismatch per channel for a reason. Every
subsequent mismatch is a cascade. Fix the first one, re-run, and repeat.
Chasing divergence #47 when divergence #1 is unsolved is like fighting the
Wizard of Yendor while the Riders watch — dramatic, but unproductive.

---

## Recent Findings (2026-03-10)

### `v` command output should be real project version text, not captured literals

We had a hardcoded C-capture artifact in `cmd.js` for `v` (version):
- line 0: Unix NetHack build string
- line 1: literal `20:21:19.--More--`

That timestamp-like tail is not gameplay state and should not be embedded in JS.
Fix:
1. Keep the existing nonblocking `--More--` boundary behavior for parity.
2. Replace hardcoded line 0 with `VERSION_STRING` (Royal Jelly branding +
   `version.js` commit number).
3. Add a narrow comparator alias for legacy C version/clock text vs new
   Royal Jelly version text.

Result: removes fake timestamp text from JS while preserving replay parity.

### `W` mapdump parity: avoid synthetic border-lock fallback

A persistent `seed033` mapdump miss (`W`, checkpoint `d0l1_001`) came from a
JS-only fallback that force-set border STONE cells to `D_LOCKED` when
`wall_info` was absent. This produced false `8` values where C/session had `0`.

Fix:
1. Prefer `loc.wall_info` when present; otherwise use low bits of `flags`.
2. Remove synthetic border `D_LOCKED` fallback from `W` mapdump emission.

Result: `seed033` mapdump parity restored without regressions; full suite back
to green.

### Never inject gameplay `#dumpmap` commands during recording/replay

Injecting `#dumpmap` into gameplay command streams changes real input
semantics:
1. it inserts extra keys (`#`, command text, terminator) into the same parser
   path as player commands;
2. it can perturb prompt/message timing and `--More--` boundaries;
3. it creates "Unknown command" artifacts and step-alignment confusion that
   look like gameplay bugs but are harness-induced.

Policy:
1. keep mapdump capture out-of-band (harness env/log channels), not as in-band
   gameplay commands;
2. do not mutate recorded key streams for diagnostics;
3. treat command-stream purity as a hard invariant for session fidelity.

This explains several historical "mystery" divergences that disappeared once
in-band `#dumpmap` insertion was removed.

---

## RNG Parity

### Clang required for cross-platform determinism

C does not specify the evaluation order of function arguments. GCC and Clang
evaluate them in different orders, which causes RNG log differences when
multiple RNG calls appear as arguments to a single function. Example from
`trap.c`:

```c
set_wounded_legs(rn2(2) ? RIGHT_SIDE : LEFT_SIDE, rn1(10, 10));
```

Clang (macOS default) evaluates left-to-right: `rn2(2)` then `rn1(10,10)`.
GCC (Linux default) evaluates right-to-left: `rn1(10,10)` then `rn2(2)`.
Both produce identical game behavior but log the RNG calls in swapped order,
breaking session recording portability.

Fix: build the C harness with `CC=clang` on all platforms. `setup.sh` enforces
this and prints install instructions if clang is missing.

### Repro harness datetime should be explicit and selectable

Some sessions are sensitive to calendar-dependent behavior (moon phase, Friday
13th luck, and downstream RNG/state effects). If replay always forces one fixed
date, sessions recorded under a different calendar condition can diverge early.

Harness rule:

1. preserve both `options.datetime` and `options.recordedAt` in session metadata;
2. allow explicit replay policy for fixed datetime source;
3. default to session-declared datetime for strict reproducibility.

Current replay selector modes:

- `session`: use session datetime first, then `recordedAt`-derived UTC datetime
- `recorded-at-prefer`: prefer `recordedAt`-derived UTC datetime
- `recorded-at-only`: only use `recordedAt`-derived UTC datetime

This enables controlled experiments without mutating sessions when diagnosing
calendar-conditioned divergences.

### `maybe_wail()` message parity depends on intrinsic power-count branch

C `hack.c maybe_wail()` does not always print the same warning for
Wizard/Elf/Valkyrie. At low HP, it counts intrinsic powers across this fixed
set:
`TELEPORT, SEE_INVIS, POISON_RES, COLD_RES, SHOCK_RES, FIRE_RES, SLEEP_RES,
DISINT_RES, TELEPORT_CONTROL, STEALTH, FAST, INVIS`.
If at least 4 are intrinsic, C prints "all your powers will be lost...",
otherwise it prints "your life force is running out." Porting this branch
matters for event-sequence parity.

### `runmode_delay_output()` must be an awaited boundary in movement flow

C `hack.c` calls `nh_delay_output()` from `runmode_delay_output()` while
running/multi-turn movement. If JS uses only `nh_delay_output_nowait()`, timing
boundaries exist structurally but the call graph does not match async gameplay
flow. Port rule:

1. keep `runmode_delay_output()` async,
2. `await` it from `domove_core()`,
3. preserve C runmode gating (`tport`, `leap` modulo-7, `crawl` extra delays).

Also note a canonical-state subtlety: `ensure_context()` treats
`game.context === game.svc.context` as the canonical path. Tests and helpers
that set only `svc.context` without wiring `context` can silently drop runstate
and miss delay behavior.

### STR18 encoding: attribute maximums are not what they seem

C uses `STR18(x) = 18 + x` for strength maximums. A human's STR max is
`STR18(100) = 118`, not `18`. When attribute redistribution rolls `rn2(100)`
and the attribute hasn't hit its max, C continues — but JS with `max=18`
stops early, causing an extra RNG retry. Every retry shifts the entire
sequence.

```c
// attrib.h:36
#define STR18(x) (18 + (x))
// Human STR max = STR18(100) = 118
// Gnome STR max = STR18(50) = 68
```

*Source: `src/role.c`, `src/attrib.c`. See [RNG_ALIGNMENT_GUIDE.md](RNG_ALIGNMENT_GUIDE.md).*

### Loop conditions re-evaluate on every iteration

In C, `for (i=1; i<=d(5,5); i++)` evaluates `d(5,5)` once. In JavaScript,
the condition is re-evaluated every iteration. If the condition contains an
RNG call, JS consumes RNG on every loop pass while C consumed it once.
Always hoist RNG calls out of loop conditions.

```javascript
// WRONG: calls d() up to N times
for (let i = 1; i <= d(5, 5); i++) { ... }

// RIGHT: calls d() exactly once
const count = d(5, 5);
for (let i = 1; i <= count; i++) { ... }
```

*This is the single most common source of RNG drift in ported code.*

### RNG log filtering rules

C's RNG logs exclude certain entries that JS may initially count:

- **Composite entries** (`d(6,6)=17`, `rne(4)=2`, `rnz(10)=2`) — C logs
  only the composite result, not individual dice rolls
- **Midlog markers** (`>makemon`, `<makemon`) — function entry/exit bookmarks,
  not RNG calls
- **Source tags** (`rn2(5) @ foo.c:32`) — the `@ location` suffix is stripped
  before comparison

The comparator in `comparators.js` handles this normalization. If you add new
RNG instrumentation, ensure it follows these conventions.

### rn2(1) is the canonical no-op RNG consumer

When you need to advance the RNG without using the value (to match C's
consumption pattern), use `rn2(1)`, which always returns 0 and consumes
exactly one call. Do not use `rn2(100)` or any other value — the modulus
affects the internal state.

### mattacku non-physical hits consume negation RNG

In monster-vs-hero combat, successful non-physical attacks consume
`mhitm_mgc_atk_negated()` RNG (`rn2(10)`) even when no special effect is
ultimately applied. Electric attacks then also consume their own follow-up
RNG (`rn2(20)`). Missing that `rn2(10)` call causes immediate replay drift
in early sticky/paralysis encounters.

---

## Special Levels

### Deferred execution: create immediately, place later

C's special level engine creates objects and monsters immediately (consuming
RNG for `next_ident()`, `rndmonst_adj()`, etc.) but defers *placement* until
after corridors are generated. JS must match this: immediate creation with
deferred placement. If JS defers both creation and placement, the RNG
sequence shifts by thousands of calls.

```
C execution order:
  1. Parse Lua, create rooms         (RNG: room geometry)
  2. Create objects/monsters          (RNG: identity, properties)
  3. Generate corridors               (RNG: corridor layout)
  4. Place deferred objects/monsters   (no RNG)

Wrong JS order:
  1. Parse, create rooms
  2. Generate corridors
  3. Create AND place objects/monsters (RNG shifted by corridor calls)
```

*Source: `src/sp_lev.c`. See [ORACLE_RNG_DIVERGENCE_ANALYSIS.md](archive/ORACLE_RNG_DIVERGENCE_ANALYSIS.md).*

### Map-relative coordinates after des.map()

After `des.map()` places a map at origin (xstart, ystart), ALL subsequent
Lua coordinate calls — `des.door()`, `des.ladder()`, `des.object()`,
`des.monster()`, `des.trap()` — use coordinates relative to the map origin,
not absolute screen positions. Failing to add the origin offset places every
feature in the wrong position.

```lua
-- tower1.lua: map placed at screen (17, 5)
des.door("closed", 8, 3)
-- Absolute position: (17+8, 5+3) = (25, 8)
-- NOT (8, 3)!
```

*Source: `src/sp_lev.c`. See [MAP_COORDINATE_SYSTEM.md](archive/MAP_COORDINATE_SYSTEM.md).*

### `des.monster({ fleeing = N })` must set runtime flee fields

Special-level Lua options may use C-style names, but JS movement logic reads
runtime `flee`/`fleetim`. Writing only `mflee`/`mfleetim` leaves monsters
effectively non-fleeing for behavior code even though the script asked for
fleeing state.

Practical rule: when loading `fleeing`, set both aliases in sync:
`flee` + `fleetim` and `mflee` + `mfleetim`.

### Wallification must run twice around geometric transforms

Any operation that changes cell positions (flipping, rotation) invalidates
wallification corner types. The correct sequence is: wallify, transform,
wallify again. C does this via `wallification()` before flip and
`fix_wall_spines()` after.

### The full finalization pipeline is mandatory

Special levels bypass procedural generation but still require every
finalization step: deferred placement, `fill_ordinary_room()` for OROOM
types, wallification, `bound_digging()`, `mineralize()`. Omitting
`mineralize()` alone causes ~922 missing RNG calls.

---

## Pet AI

### Pet AI is the "final boss" of RNG parity

Pet movement (`dog_move` in `dogmove.c`) is the most RNG-sensitive subsystem
in the game. A single missed or extra RNG call in pet decision-making
cascades through every subsequent turn. The movement candidate evaluation
(`mfndpos`), trap avoidance, food evaluation, and multi-attack combat each
consume RNG in specific orders that must be matched exactly.

### Wizard mode makes all traps visible

The C test harness runs with `-D` (wizard mode), which sets `trap.tseen = true`
on all traps. This changes pet trap avoidance behavior: when `trap.tseen` is
true, pets roll `rn2(40)` to decide whether to step on the trap. When it's
false, they don't roll at all. If JS doesn't match wizard mode's omniscience,
pet movement diverges immediately.

*Source: `src/dogmove.c:1182-1204`.*

### Pet melee has strict attack sequencing

Pet combat (`mattackm`) consumes RNG for multi-attack sequences: to-hit
(`rnd(20+i)`) for each attack, damage rolls, knockback, and corpse creation
(`mkcorpstat`). These must be ported with exact ordering. Additionally, pet
inventory management requires C-style filtering: exclude worn, wielded,
cursed items and specific classes like `BALL_CLASS`.

### Trap harmlessness depends on monster properties

`m_harmless_trap()` determines which traps a monster can safely ignore.
Flyers ignore floor traps. Fire-resistant monsters ignore fire traps.
Small or amorphous monsters ignore bear traps. Getting any of these checks
wrong changes the pet's movement candidate set and shifts all subsequent RNG.

### Flee state resets movement memory

C `monflee()` always clears monster `mtrack` history (`mon_track_clear`),
even when flee timing doesn't change. Missing this creates hidden-state drift:
later `m_move` backtrack checks (`rn2(4 * (cnt - j))`) consume a different
number of RNG calls even while visible screens still match.

---

## C-to-JS Translation Patterns

### FALSE returns still carry data

C functions like `finddpos()` return FALSE while leaving valid coordinates
in output parameters. FALSE means "didn't find ideal position," not "output
is invalid." JS translations that return `null` on failure break callers
that expect coordinates regardless of the success flag.

### The Lua converter produces systematic errors

The automated Lua→JS converter generates three recurring bugs: labeled
statements instead of `const`/`let` declarations, missing closing braces
for loops, and extra closing braces after loop bodies. Complex Lua modules
(like `themerms.lua`) require full manual conversion. Always review
converter output before running RNG tests.

*See [lua_converter_fixes.md](lua_converter_fixes.md).*

### Integer division must be explicit

C integer division truncates toward zero. JavaScript `/` produces floats.
Every C division of integers must use `Math.trunc()` or `| 0` in JS.
Missing a single truncation can shift coordinates by one cell, which shifts
room geometry, which shifts corridor layout, which shifts the entire RNG
sequence.

### Lua `for` loop upper bounds use floor semantics — JS must match

In Lua, `for x = 0, n do` iterates while `x <= n`, where `n` is evaluated
as-is (floats included). So `for x = 0, (rm.width / 4) - 1 do` with
`rm.width = 10` gives `n = 1.5`, and x goes 0, 1 (two iterations, since
2 > 1.5).

The JS translation `for (let x = 0; x < (rm.width / 4); x++)` is subtly
wrong: `x < 2.5` allows x=0, 1, **2** (three iterations!), placing pillar
terrain outside the room boundary.

The correct translation of Lua `for x = 0, expr - 1 do` is:
```js
for (let x = 0; x < Math.floor(expr); x++)
```

This bug was found in the Pillars themeroom (`themerms.js`). For a 10-wide
room, the extra x=2 iteration placed HWALL tiles at raw coords (10,*) and
(11,*), which via `getLocationCoord()` landed one tile past the room's right
wall — changing 3 mineralize-eligible STONE tiles to HWALL. This caused JS
to find 587 eligible mineralize tiles at depth=1 vs C's 590, diverging at
normalized RNG index 6210.

**Root cause chain**: Pillars loop iterates x=2 → terrain at raw (10..11,y)
→ absolute x=13..14 (room right wall + 1 outside) → 3 STONE→HWALL changes
→ mineralize eligibility drops by 3 → RNG divergence at depth=1 start.

Triage method: use `DEBUG_ROOM_TRAP=1` (in sp_lev.js terrain()) to trap
writes to specific absolute positions and find which `des.terrain()` call
is placing outside the room.

### Match C exactly — no "close enough" stubs

When porting a C function, match it completely: same name, same RNG calls,
same eligibility checks, same messages. Do not leave partial stubs that
"burn RNG without effects" or consume the right random numbers but skip
the output they drive.

The temptation is to say "this rarely fires" or "probably doesn't affect
tests" and move on. But:

1. **It costs nothing to get it right.** If you've already read the C code
   and written the RNG calls, wiring up the message or effect is minutes
   of work, not hours.

2. **"Rarely fires" still fires.** Knockback requires attacker much larger
   than defender — but a hill giant attacking a gnome qualifies. A 1/6
   chance triggers in ~5 attacks. Leaving the message as a silent `rn2(2)`
   means the first time it fires in a real session, you'll debug a missing
   message instead of seeing it work.

3. **Stubs accumulate.** Each "close enough" stub is a future debugging
   session where you re-read the same C function, re-trace the same logic,
   and wonder why you didn't just finish it the first time.

4. **Name functions after their C counterparts.** `mhitm_knockback`, not
   `mhitm_knockback_rng`. The `_rng` suffix signals "this is a stub that
   only burns RNG" — which is exactly what we're trying to eliminate. When
   the JS function does what the C function does, it deserves the same name.

This was learned porting `mhitm_knockback()` (uhitm.c:5225). The initial
port consumed `rn2(3)` + `rn2(6)` faithfully, ran the eligibility checks,
then silently discarded the `rn2(2)` + `rn2(2)` message-text rolls instead
of printing "You knock the gnome back with a forceful blow!" It took three
review passes to finish what should have been done in the first pass.

Practical rule: if you're reading C code and writing RNG calls, finish the
job. Write the message, apply the effect, use the C function name. "Close
enough" is technical debt with interest.

### Incremental changes outperform rewrites

When porting complex subsystems (pet AI, combat, special levels), small
tightly-scoped changes with clear validation outperform large logic
rewrites. Port one function, test, commit. Port the next. A rewrite that
breaks parity in twenty places at once is harder to debug than twenty
individual one-function ports.

---

## Debugging Techniques

### Side-by-side RNG trace comparison

Extract the same index range from both C and JS traces and compare
call-by-call. The first mismatch tells you which function diverged.
The `>funcname` midlog entries preceding the mismatch tell you the
call stack.

```bash
node test/comparison/session_test_runner.js --verbose seed42_gameplay
# Look for "rng divergence at step=N index=M"
# Then examine the js/session values and call stacks
```

### The comparison test diagnostics

The session test runner (`sessions.test.js`) reports `firstDivergence` per
channel with call-stack context. The `--verbose` flag shows every session
result. The `--type=chargen` flag isolates one category. The `--fail-fast`
flag stops at the first failure for focused debugging.

### Interpreting first-divergence reports

The test runner's `firstDivergences.rng` tells you `step` and `index`:

- **`index=0` with JS empty**: JS produced zero RNG for that step. The turn
  itself didn't execute. Common causes: unimplemented command (e.g. JS
  `handleRead` says "Sorry" instead of reading the scroll), or missing
  turn-end cycle because the command returned `tookTime: false`.
- **`index=0` with both non-empty**: The very first RNG call within the step
  differs. Look at function names: `exercise` vs `distfleeck` means the
  turn-end ordering is wrong; `rnd(20)` vs `rn2(20)` means JS used the wrong
  RNG function.
- **`index>0` with same count**: Both sides ran the same turn shape, but one
  call inside differs. This is usually a wrong argument (`rn2(40)` vs
  `rn2(32)` means a parameter like monster level or AC differs), indicating
  hidden state drift from an earlier step.
- **Same values, different counts**: One side has extra or missing calls at the
  end. Suspect missing sub-operations (e.g. JS doesn't call `dmgval` for
  weapon damage after base attack dice).

### Diagnostic script pattern for investigating specific seeds

Use this template to investigate a failing seed. It replays the session in JS
and compares per-step RNG against the C reference:

```javascript
import { replaySession, loadAllSessions }
  from './test/comparison/session_helpers.js';

function normalizeWithSource(entries) {
  return (entries || [])
    .map(e => (e || '').replace(/^\d+\s+/, ''))
    .filter(e => e
      && !(e[0] === '>' || e[0] === '<')
      && !e.startsWith('rne(')
      && !e.startsWith('rnz(')
      && !e.startsWith('d('));
}

const sessions = loadAllSessions({
  sessionPath: 'test/comparison/sessions/SEED_FILE.session.json'
});
const session = sessions[0];
const replay = await replaySession(session.meta.seed, session.raw, {
  captureScreens: false,
  startupBurstInFirstStep: false,
});

// Compare specific step (0-indexed)
const stepIdx = 98; // step 99
const jsStep = replay.steps[stepIdx];
const cStep = session.steps[stepIdx];
const jsNorm = normalizeWithSource(jsStep?.rng || []);
const cNorm = normalizeWithSource(cStep?.rng || []);

console.log(`Step ${stepIdx+1}: JS=${jsNorm.length} C=${cNorm.length}`);
for (let j = 0; j < Math.max(jsNorm.length, cNorm.length); j++) {
  const js = (jsNorm[j] || '(missing)').split(' @ ')[0];
  const c = (cNorm[j] || '(missing)').split(' @ ')[0];
  console.log(`  [${j}] ${js === c ? '✓' : '✗'} JS:${js}  C:${c}`);
}
```

The `normalizeWithSource` function strips midlog markers (`>func`/`<func`),
composite dice (`d(...)`, `rne(...)`, `rnz(...)`), and source locations
(`@ file.c:line`), leaving only the leaf RNG calls that the comparator checks.

### Categories of divergence and what to fix

| Pattern | Root cause | Fix approach |
|---------|-----------|--------------|
| JS has 0 RNG, C has full turn | Unimplemented command or `tookTime:false` | Implement the command or fix time-taking |
| Same functions, different args | Hidden state drift (HP, AC, monster data) | Trace back to earlier state divergence |
| Wrong function name (`rnd` vs `rn2`) | JS uses different RNG wrapper than C | Change to matching function (e.g. `d(1,3)` vs `rnd(3)`) |
| Extra/missing calls in turn-end | Missing sub-system (exercise, dosounds, etc.) | Implement the missing turn-end hook |
| Shift by N calls from a certain step | One-time extra/missing operation cascading | Find the first divergence step and fix it |

### Replay engine pending-command architecture

Multi-keystroke commands (read, wield, throw, etc.) use a promise-based
pending-command pattern in `replay_core.js`:

1. First key (e.g. `r` for read) → `rhack()` called → command blocks on
   `await nhgetch()` → doesn't settle in 1ms → stored as `pendingCommand`
2. Next key (e.g. `i` to select item) → pushed into input queue →
   `pendingCommand` receives it → may settle (command completes) or stay
   pending (more input needed)
3. `pendingKind` tracks special handling: `'extended-command'` for `#`,
   `'inventory-menu'` for `i`/`I`, `null` for everything else

When investigating "missing turn" bugs in multi-key commands, check whether
the pending command actually settles and returns `tookTime: true`. If JS
says "Sorry, I don't know how to do that yet" and returns `tookTime: false`,
the turn won't run and the full movemon/exercise/dosounds cycle is skipped.

### Replay startup topline state matters for count-prefix parity

In replay mode, first-digit count prefix handling intentionally preserves the
current topline (matching C). If replay init does not carry startup topline
state forward, sessions can diverge immediately on key `1` / `2` / ... frames
even when RNG and command flow are otherwise aligned.

Practical rule: preserve startup **message/topline state** for replay, but do
not blindly force startup map rows into later steps, or you'll create unrelated
map-render diffs in wizard sessions.

### Remembered object glyphs need remembered colors

Out-of-sight object memory is not just a remembered character (`mem_obj`); C
rendering behavior also preserves the remembered object color. If memory falls
back to a fixed color (for example always black), gameplay sessions can show
large color drift while RNG and geometry stay unchanged.

Practical rule: store both remembered object glyph **and** color, and render
that pair when tiles are unseen.

### Role index mapping

The 13 roles are indexed 0–12 in C order. Wizard is index 12, not 13.
Getting this wrong shifts every role-dependent RNG path.

```
0:Archeologist 1:Barbarian 2:Caveman 3:Healer 4:Knight 5:Monk
6:Priest 7:Ranger 8:Rogue 9:Samurai 10:Tourist 11:Valkyrie 12:Wizard
```

### C step snapshots narrow hidden-state drift faster than RNG-only diffs

When RNG divergence appears late, capture same-step C and JS monster/object
state and compare coordinates directly. This catches upstream hidden-state
drift before it surfaces as an RNG mismatch.

In `seed212_valkyrie_wizard`, snapshotting showed the first monster-position
drift at step 10 (goblin Y offset). Porting a minimal collector-only
`m_search_items` retargeting subset in JS `m_move` aligned monster positions
at steps 36/37 and moved first RNG divergence from step 37 (`rn2(20)` vs
`rn2(32)`) to step 38 (`distfleeck` `rn2(5)` in C).

Practical rule: use step snapshots to verify state alignment at the first
visual or behavior drift, then apply narrow C-faithful movement-target fixes
before chasing deeper RNG stacks.

### Wizard level-teleport parity has two separate RNG hooks

In `seed212_valkyrie_wizard`, the `^V` level-teleport flow matched C better
only after handling both:

1. `wiz_level_tele` as a no-time command (`ECMD_OK` semantics), and
2. quest-locate pager side effects in `goto_level` (`com_pager("quest_portal")`
   bootstraps Lua and consumes `rn2(3)`, `rn2(2)` via `nhlib.lua` shuffle).

Practical rule: for transition commands, separate "does this consume a turn?"
from "does this command path still consume RNG for messaging/script setup?"

### Lycanthrope RNG happens before movement reallocation

C consumes lycanthrope shift checks in turn-end bookkeeping before
`mcalcmove()`: `decide_to_shapeshift` (`rn2(6)`) then `were_change`
(`rn2(50)`).

Practical rule: when `mcalcmove` aligns but pre-`mcalcmove` RNG is missing,
audit turn-end monster status hooks (not just `movemon`/`dog_move` paths).

### Were-change behavior is not RNG-only: howl wakes nearby sleepers with strict radius semantics

When unseen human-form werejackals/werewolves transform, C prints
`You hear a <jackal|wolf> howling at the moon.` and calls `wake_nearto`
with distance `4*4`.

Two parity-critical details:
- This wake is behavioral (changes `msleeping` state), not just messaging.
- `wake_nearto_core` uses strict `< distance`, not `<=`.

Practical rule: if zoo/special-room monsters diverge from sleeping to active
around were messages, port the wake side effects and strict distance test
before tuning movement logic.

### Runtime shapechanger parity needs persistent `cham` identity

C runs `decide_to_shapeshift()` in `m_calcdistress()` for monsters with a
valid `cham` field, which can trigger `select_newcham_form` and `newmonhp`
RNG side effects during turn-end.

Practical rule: preserve the base shapechanger identity (`cham`) on monster
instances and drive turn-end shapechange from that field; creation-time-only
newcham handling misses later RNG and hidden-state transitions.
### Monster item-search parity needs full intent gates, not broad carry checks

`m_search_items` is not "move toward any carryable floor object." In C it
passes through `mon_would_take_item`/`mon_would_consume_item`, load-threshold
limits, in-shop skip behavior, and `MMOVE_DONE`/`mpickstuff` side effects.

Practical rule: if monsters retarget oddly around loot (especially toward
gold/food underfoot), port the full intent gating and pickup semantics before
tuning path selection or RNG order.

### Enter key replay can need a run-style follow-on in pet-displacement flows

In gameplay replay traces, `Enter` (`\n`/`\r`) is usually a one-step keypad-
down movement, but pet-displacement turns can require a run-style follow-on
cycle to stay aligned. Keeping active `cmdKey` tracking in sync with moveloop
repeat state is also required in this path.

Practical rule: if an Enter step matches one turn and then misses an immediate
follow-on monster-turn block, verify keypad Enter + pet-displacement handling
and `cmdKey` bookkeeping before changing monster AI logic.

### Inventory action menus can be parity-critical screen state

Inventory submenu content is part of recorded screen parity, not cosmetic-only
UI. Missing item-specific actions (for example oil-lamp `a - Light ...` and
`R - Rub ...`) can become the first deterministic divergence even when RNG and
movement are aligned.

Practical rule: when screen divergence appears on an item-action frame, diff
the exact action list and row-clearing behavior before touching turn logic.

### Headless `nhgetch()` must see display state to avoid fake prompt concatenation

`nhgetch()` clears topline concatenation state (`messageNeedsMore`) on keypress.
If headless input returns `getDisplay() = null`, prompt loops can concatenate
identical prompts (`X  X`) in replay even when command logic is otherwise
correct.

Practical rule: always bind headless input runtime to the active display so
keypress acknowledgment semantics match tty behavior.

### `f`ire prompt parity depends on wielded-item flow

`dofire()` is not equivalent to "accept any inventory letter then ask
direction." Wielded-item selection can require a confirmation prompt (`Ready it
instead?`) and some held items should not appear in the initial fire-choice
list.

Practical rule: treat fire-prompt candidate filtering and wielded-item prompts
as behavioral parity, not UI polish; they gate subsequent input parsing and can
shift replay screens long before RNG divergence.

### M2_COLLECT does not imply gold-targeting in monster item search

In C `mon_would_take_item`, monsters only path toward `GOLD_PIECE` when their
data `likes_gold` (`M2_GREEDY`) is set. `M2_COLLECT` by itself is not enough.
This matters in early gameplay parity because non-greedy collectors (for
example goblins) can drift movement and downstream RNG if JS treats any
carryable gold as a valid search target.

Practical rule: keep `m_search_items` gold retargeting gated by
`likes_gold` (with leprechaun exception), not by `M2_COLLECT` alone.

### `m_search_items` should not be pre-gated by collect-only monster flags

In C `monmove.c`, `m_search_items()` scans nearby piles for any monster and
relies on `mon_would_take_item()` / `mon_would_consume_item()` to decide
interest per object. Adding an early JS return like "only run for
`M2_COLLECT`" drops legitimate search behavior for other item-affinity
monsters (for example `M2_GREEDY` or `M2_MAGIC`) and causes hidden movement
state drift.

Observed parity effect in `seed212_valkyrie_wizard.session.json` after removing
the collect-only pre-gate:
- RNG matched prefix improved (`8691 -> 8713` calls)
- first RNG divergence shifted later (`step 260 -> step 267`)

Practical rule: keep the broad search loop active and let item-intent helpers
filter per-object eligibility; do not add top-level "collector-only" gates.

### eatfood occupation completes on `++usedtime > reqtime` (not `>=`)

For multi-turn inventory eating, C `eatfood()` ends when the incremented
counter is strictly greater than `reqtime`. Using `>=` drops one timed turn.
That missing turn shifts replay RNG at the tail of eating steps (missing the
final `distfleeck`/monster cycle) and can flip session pass/fail status.

Practical rule: keep food-occupation completion as strict `>` against
`reqtime`, and verify with a replay step that includes `"You're finally
finished."` plus trailing monster-turn RNG.

### Sparse replay frames can shift RNG attribution across later steps

Some C keylog-derived gameplay captures include display-only frames with no RNG
between two comparable RNG-bearing steps. When JS executes a command and
captures extra trailing RNG in the same replay step, that tail may need to be
deferred to a later step (not always the immediate next one) where comparable
RNG resumes.

Practical rule: if a step has an exact expected RNG prefix plus extra tail, and
the first extra comparable call matches a later step's first comparable call
after zero-RNG frames, defer the tail to that later step for comparison.
Treat zero-RNG frames between source and deferred target as display-only
acknowledgement frames (do not execute a new command turn there).

### Hider `restrap()` runs before `dochug` and can consume `rn2(3)` even on sleeping monsters

In C, `movemon_singlemon()` calls `restrap()` for `is_hider` monsters before
`dochugw()`. That `restrap()` path can consume `rn2(3)` and may set
`mundetected`, causing the monster to skip `dochug` for that turn.

Practical rule: for parity around piercers/mimics, model the pre-`dochug`
hider gate in the movement loop (not inside `m_move`/`dog_move`), or RNG
alignment will drift by one monster-cycle (`distfleeck`) call.

### `thrwmu` retreat gating uses pre-command hero position (`u.ux0/u.uy0`)

In C `mthrowu.c`, `thrwmu()` can skip a ranged throw when the hero is
retreating relative to the monster:
`URETREATING(x, y) && rn2(BOLT_LIM - distmin(x, y, mux, muy))`.
That pre-throw check consumes RNG (for example `rn2(6)` at `thrwmu`) before
`monshoot()`/`m_throw()` is entered.

Practical rule: track hero pre-command coordinates in JS (C's `u.ux0/u.uy0`)
and run the retreat gate before multishot/flight logic; otherwise JS can
incorrectly execute `m_throw()` and consume extra per-step `rn2(5)` calls.

### Inventory `:` search prompt is modal input, not a one-shot menu dismissal

On C tty inventory overlays, `:` starts a modal `Search for:` line-input prompt
that can consume multiple subsequent keystrokes while leaving inventory rows on
screen. Treating `:` as immediate dismissal-only behavior drops prompt-echo
updates (for example `Search for: k`) and causes step-shifted screen parity
divergence despite matching RNG.

Practical rule: inventory `:` handling should enter `getlin("Search for: ")`
style pending input semantics so replay can consume and render each typed
character before command flow resumes.

### Remove gameplay col-0 compensation heuristics from the comparator

After aligning JS rendering with C tty coordinate mapping (`map x -> term col
x-1`), comparison-layer col-0 padding heuristics became counterproductive.
They could hide real coordinate bugs or create fake mixed-row shifts.

Practical rule: gameplay screen/color comparison should be direct (after basic
control-character normalization), without synthetic leading-space insertion or
pad/no-pad fallback matching.

### Record Book: comparator simplification commits (2026-02-19)

- `e2deeac2` - Removed gameplay comparator col-shift compensation in
  `test/comparison/session_test_runner.js`:
  no synthetic col-0 space prepend, no pad/no-pad fallback chooser, no
  mixed-row map-segment pad logic.
- `48535727` - Removed interface screen left-shift fallback ("remove one
  leading space and retry") in `test/comparison/session_test_runner.js`;
  interface comparisons now use direct normalized-row matching.
- `08da1fac` - Removed legacy col-0 prepend fallback path from
  `test/comparison/test_session_replay.js`, deleting padded-vs-unpadded and
  hybrid mixed-row fallback matching there as well.
- Follow-up simplification (2026-02-19):
  removed remaining gameplay col-0/overlay fallback matching paths from
  `test/comparison/session_test_runner.js` and restored direct normalized-row
  comparison for gameplay screen diffs.

### TTY map x-coordinates are 1-based and render at terminal column x-1

In C tty, map redraw loops emit glyphs for `x` in `[1, COLNO-1]` and call
`tty_curs(window, x, y)`. `tty_curs()` then decrements `x` before terminal
cursor positioning (`cw->curx = --x`), so map cell `x` is displayed at terminal
column `x-1`.

Practical rule: JS map rendering should mirror this mapping (`col = x - 1`)
for both browser and headless displays to match C screen coordinates directly
instead of relying on comparison-layer column compensation.

### `doeat` invalid object selection can stay in a sticky `--More--` loop

In tourist non-wizard traces, invalid eat-object selection can present repeated
`You don't have that object.--More--` frames across multiple non-space keys
before returning to the `What do you want to eat?` prompt.

Practical rule: model this as a modal no-object `--More--` loop in command
logic (non-space keys keep the same `--More--` frame; space/enter/esc resume
the eat prompt) rather than immediately reprompting.

### `doopen` invalid direction wording splits cancel vs invalid keys

For `open` direction prompts, C distinguishes cancel-like keys from other
invalid keys:

- cancel keys (`Esc`, `Enter`, `Space`) -> `Never mind.`
- other invalid direction keys -> `What a strange direction!  Never mind.`

Practical rule: keep this split in command handling and tests; collapsing both
cases to `Never mind.` regresses non-wizard tourist session parity.

### Sparse move key + Enter can imply run-style south in replay captures

Some keylog-derived gameplay captures include a zero-RNG `move-*` byte with an
empty topline immediately before an Enter step whose RNG starts with
`distfleeck`. In these cases, replay alignment can require treating that Enter
as run-style south movement for parity with C turn consumption.

Practical rule: in replay, detect this exact sparse-move/Enter pattern and set
a narrow replay flag so Enter follows run-style handling only for that step.

### `stop_occupation` sparse boundary frames can defer timed turn execution

Some gameplay captures split a single command across two adjacent frames:
- current frame: combat/occupation-stop bookkeeping (`stop_occupation`) with no
  monster-cycle/turn-end RNG markers
- next frame: the deferred timed-turn block (`distfleeck`, `mcalcmove`,
  `moveloop_core`, etc.)

Practical rule: when replay sees this exact signature, do not execute the timed
turn on the bookkeeping frame; defer it to the next captured frame so state and
RNG attribution match C keylog boundaries.

Additional replay rule: apply screen-driven HP/PW/AC stat sync after sparse
boundary carry attribution, and skip that sync on the frame exporting deferred
RNG/state. Otherwise, source-frame HP can be restored too early (for example,
after projectile damage) and later deferred turn-end RNG (`regen_hp`) drifts.

### Throw `?` overlay menus can require a right-offset cap at column 41

In non-wizard tourist gameplay, the throw prompt (`What do you want to throw?`)
`?/*` help overlay can drift horizontally if overlay placement always uses pure
right-alignment (`cols - maxcol - 2`).

Practical rule: clamp overlay menu `offx` to `<= 41` (matching C tty behavior
in these flows) and keep leading-pad header spaces non-inverse when rendering
category headers like ` Weapons`/` Coins`.

### Throw prompt suggestion letters are class-filtered (but manual letters still work)

For `What do you want to throw?` prompt text, C suggests only a filtered set
of inventory letters rather than every possible throwable object:

- always include coins
- include non-wielded weapons when not slinging
- include gems/stones when slinging
- exclude worn/equipped items from prompt suggestions

Practical rule: keep this as prompt suggestion behavior only. Manual letter
selection should still be accepted and validated afterward (including worn-item
rejection at throw execution).

### Double `m` command prefix cancels silently

In C command-prefix flow, entering `m` when the `m` no-pickup prefix is already
active clears the prefix without emitting a message.

Practical rule: second `m` should toggle prefix state off silently (no
`Double m prefix, canceled.` topline), or replay/topline parity can drift.

### Inventory overlay frames are replay-authoritative when command remains modal

For `i` inventory steps that stay pending (menu not yet dismissed), C-captured
overlay text/columns can include details JS does not yet fully reconstruct
(`(being worn)`, identified tin contents). Re-rendering from JS can shift menu
columns and drift screen parity even when gameplay state is unchanged.

Practical rule: while inventory command is still modal/pending and the step has
a captured screen, use the captured frame as authoritative for that step.

### AT_WEAP monster melee has a two-stage parity contract: wield turn, then dmgval

In tourist non-wizard traces, adjacent goblins with AT_WEAP can spend one turn
on `The goblin wields a crude dagger!` before any melee hit roll. On later hit
turns, C consumes base melee `d(1,4)` and then weapon `dmgval` (`rnd(3)` for
orcish dagger in this trace) before knockback RNG.

Practical rule:
- Adjacent AT_WEAP monsters without a wielded weapon should spend the attack
  turn on wielding a carried weapon.
- AT_WEAP melee damage must include weapon `dmgval` RNG after base attack dice.

### `thrwmu` ranged throws are gated by `URETREATING` before `m_throw`

In C `mthrowu.c`, lined-up ranged throws are not unconditional. When the hero
is retreating from the thrower, `thrwmu()` consumes `rn2(BOLT_LIM - dist)` and
returns early on non-zero rolls, so `m_throw()` is skipped that turn.

Practical rule:
- Track previous hero position (`u.ux0/u.uy0` equivalent) each command.
- In `thrwmu`, compute retreating as distance from current hero position to the
  monster being greater than distance from previous hero position.
- Apply this gate before `monshoot`/`m_throw`; otherwise JS enters throw-flight
  RNG when C exits early.

### Monster-thrown projectiles must be materialized on floor and consumed from `minvent`

In C `mthrowu` flow, monster projectiles are real objects: throws consume stack
quantity from monster inventory and the projectile lands on the map unless
destroyed. If JS models only damage/message side effects (without object
consumption/placement), later pet `dog_goal` scans miss `dogfood()->obj_resists`
calls and RNG diverges in pet movement turns.

Practical rule:
- decrement/remove thrown stack entries from `mon.minvent` as missiles are fired
- place each surviving projectile on a valid floor square at end of flight
- avoid adding new RNG in this bookkeeping path (ID assignment included)

### `doread` `?/*` help is a modal `--More--` listing, not a one-key no-op

In tourist traces, pressing `?` (or `*`) at `What do you want to read?` opens a
modal `--More--` item listing (for example
`l - 4 uncursed scrolls of magic mapping.--More--`). Non-dismiss keys keep the
same `--More--` frame; dismissal (`space`/`enter`/`esc`) returns to the read
prompt.

Practical rule: keep read command pending across these keys and model `?/*`
as modal listing acknowledgement flow rather than immediately returning to the
prompt.

### Zero-RNG prompt-start frames should stay capture-authoritative in replay

Some keylog gameplay traces capture prompt-start frames (`What do you want to …?`)
before JS has fully re-rendered row 0 while a command is pending. If replay
drops those zero-RNG prompt frames, later input can be routed against the wrong
UI state and drift accumulates.

Practical rule: for zero-RNG `key-*` steps with captured prompt text and blank
JS topline, keep the captured prompt frame authoritative for that step.

### Partial `dopay` ports should prefer the C "no shopkeeper here" message

When full billing/shopkeeper proximity logic is not yet implemented, emitting
`You do not owe any shopkeeper anything.` can diverge from C captures that
expect `There appears to be no shopkeeper here to receive your payment.`

Practical rule: under partial `dopay` behavior, prefer the C no-shopkeeper text
until full billing-state parity is implemented.

### `dofire` fireassist can consume a turn before direction input resolves

In wizard replay traces, `f` can consume time even when the final frame still
shows `In what direction?`. C `dofire()` may auto-swap to a matching launcher
(`uswapwep`) and then re-enter firing flow; that swap is a timed action.

Practical rule: model fireassist launcher auto-swap as a timed step before the
direction prompt, and preserve the post-turn map frame before leaving the
prompt pending.

### `dofire` routes to `use_whip()` when no quiver and bullwhip is wielded

In C `dofire()` (dothrow.c), when `uquiver == NULL` and `flags.autoquiver` is
false:
- If wielding a **polearm/lance** → `use_pole(uwep, TRUE)` (asks direction)
- If wielding a **bullwhip** → `use_whip(uwep)` (asks "In what direction?",
  consumes direction key, returns without turn if direction invalid)
- Otherwise → "You have no ammunition readied."

JS `handleFire` must check for bullwhip *before* polearm. An archeologist
wizard (seed201) starts with a bullwhip and no quiver, so `f` routes to the
whip direction prompt. If JS instead falls through to the menu-based ammo
selection (`What do you want to fire? [*]`), it consumes the direction key and
subsequent count digits as menu input, causing an RNG divergence of 0 (JS) vs
175 (C) at the first counted-move command after the fire.

Practical rule: in `handleFire`, add a bullwhip guard between the polearm guard
and the inventory scan — show "In what direction?", consume one key, and return
tookTime=false for invalid or valid directions (until whip effects are ported).

### `wipeout_text` makes two `rn2` calls per character erased

In C `wipeout_text(engrave.c)`, for each character erased (cnt iterations),
the function calls **two** rn2s:
1. `rn2(lth)` — picks position in string
2. `rn2(4)` — determines if a "rubout" substitution is used (partial erasure)

JS's `wipeoutEngravingText` only calls `rn2(lth)` and is missing the `rn2(4)`
call. Fixing this requires adding `rn2(4)` and implementing rubout characters
(letters that degrade to similar-looking chars instead of becoming spaces).

Also note: in C, if the picked position is already a space, it does `continue`
(skips that iteration without retry). In JS, the inner `do...while` loop retries
`rn2(lth)` until a non-space is found — which consumes extra RNG calls compared
to C when spaces exist.

### Inventory action menus should use canonical `xname()` nouns

Building item action prompts from ad-hoc `item.name` strings causes drift like
`flints` vs C `flint stones`, plus wrong submenu width/offset.

Practical rule: derive prompt noun text from `xname()` (singular/plural as
needed) so menu wording and right-side offset match C inventory action menus.

### Do not drop typed `#` getlin frames; only skip keyless prompt echoes

In strict gameplay replay, keylog frames for extended commands can appear as:
`#`, then typed letters (`# l`, `# lo`, ...), then `Enter`, all with `rng=0`.
Dropping those keyed frames causes state drift because the command never reaches
`getlin` (for example `#loot` at a door), and a later `Enter` can be misread as
normal movement input.

Practical rule: for `rng=0` frames whose topline starts with `#`, skip only
keyless display-only echoes. Keep keyed frames so extended-command input is
delivered exactly.

### Pickup no-object messages are terrain-dependent in C

`pickup_checks()` in C (`hack.c`) does not always print the generic
`There is nothing here to pick up.` when no object is on the square. It emits
terrain-specific lines for throne/sink/grave/fountain/open-door/altar/stairs.
Missing these lines causes prompt/message screen drift even when RNG is stable.

Practical rule: before the generic pickup message, check terrain and emit C text,
including open-door: `It won't come off the hinges.`

### Stair glyph color parity depends on branch semantics, not up/down direction

In C TTY symbol/color behavior, branch staircases are highlighted (yellow),
while ordinary up/down stairs are gray. Treating all up-stairs as highlighted
causes early color drift in mixed gameplay sessions.

Practical rule: track explicit branch-stair placement metadata and color stairs
from that metadata, not from stair direction alone.

### Shopkeeper-name parity requires `ubirthday`, `ledger_no`, and correct `ident` flow

Shopkeeper greeting/name tokens are sensitive to C initialization details:
- `nameshk()` uses `ubirthday / 257`, not the gameplay seed.
- Name selection uses `ledger_no(&u.uz)`, not raw depth.
- `context.ident` starts at `2`, and object-creation paths (including vault
  fill) consume `next_ident()` in order.

Practical rule: preserve all three inputs in JS; partial fixes can hide one
token mismatch but still leave deterministic drift downstream.

### `#name` must route through `docallcmd`-style object-type selection

A narrow `#name` implementation which only handles level annotation (`a`) can
silently leave a pending `getlin()` and swallow later gameplay keys. In C,
`docallcmd()` routes `o` to object-type calling via `getobj("call", call_ok, ...)`,
and invalid non-callable inventory letters yield `That is a silly thing to call.`
instead of opening level-annotation text entry.

Practical rule: treat `#name` as a selector flow, not a direct getlin branch.
Support the `o` object-type path with callable-class filtering and keep invalid
selections on the C wording path.

### `doapply` shows `[*]` when inventory exists but no items are applicable

For `a` (apply), C `getobj("use or apply", apply_ok, ...)` still presents a prompt
when inventory is non-empty even if no letters are suggested, rendering
`What do you want to use or apply? [*]`. Early-returning with
`You don't have anything to use or apply.` in that case shifts prompt-driven input
and causes downstream drift.

Practical rule: only emit `You don't have anything to use or apply.` when
inventory is truly empty; otherwise show `[*]` and continue `getobj`-style
selection handling.

### Wielded launchers/missiles in melee use ranged-damage semantics

In C `uhitm.c`, melee hits while wielding a launcher (bow/crossbow/slings) or
ammo/missile object route through `hmon_hitmon_weapon_ranged()` damage logic.
That path uses low fixed `rnd(2)`-style damage rather than normal melee
`dmgval + enchantment + strength`.

Practical rule: in JS player melee, detect launcher/ammo/missile weapon subskills
and use the ranged-melee damage path; do not add strength bonus there.

### AT_WEAP monsters can spend turn wielding before movement

C `dochug()` has a phase-two wield gate: hostile in-range `AT_WEAP` monsters can
use their turn to wield a carried weapon before phase-three movement. If this is
missing, monsters may move/throw in turns where C only wields, shifting downstream
monster/pet interactions.

Practical rule: keep the pre-move wield-turn gate in `dochug()` (before phase 3),
not only in phase-four attack dispatch.

### `getobj` `?/*` overlay must return selected letter back to prompt flow

For `drop`/`throw`-style `getobj` prompts, C tty `?/*` opens `display_pickinv`
and keeps the command modal. Two details matter for replay parity:
- non-dismiss keys can be consumed while the overlay remains open (`j`, `k`, etc.);
- typing an inventory letter in the overlay closes it and returns that letter to
  the same prompt flow (rather than discarding it).

If JS treats the overlay as dismiss-only, or ignores in-menu letter selections,
prompt-state drift appears quickly (for example in seed5 around drop prompt/menu
steps near 593-594), then cascades into later RNG divergence.

---

### Armor AC comes from `objectData[otyp].oc1`, not `item.ac`

Items created by `newobj()` do not carry an `ac` property — the armor class
protection for a piece of armor lives in `objectData[item.otyp].oc1` (which
mirrors C's `objects[otyp].a_ac`, a union alias of `oc_oc1`). Enchantment
is `item.spe`, not `item.enchantment`.

The correct `find_ac()` formula (from `do_wear.c`):
```
uac = 10  (base for human player)
for each armor slot: uac -= oc1 + spe - min(max(oeroded, oeroded2), oc1)
for each ring: uac -= ring.spe  (rings have no base oc1 protection)
```

Assigning `item.ac` directly produces `NaN` and breaks the status line. Always
call `find_ac(player)` after any equipment change.

---

### Counted-command occupations and step boundary attribution

When a counted command (e.g. `9s` search) is in progress during replay, C's
`runmode_delay_output` creates step boundaries by consuming buffered input keys.
The replay system must handle three distinct cases:

1. **Deferred boundary pass-through**: The command key itself (`s` after `9`)
   appears as a step but was consumed by `runmode_delay_output`, not `parse()`.
   Emit an empty pass-through frame; do not execute the command again.

2. **OCC-HANDLER** (non-zero comp step with `game.occupation`): Loop
   `occ.fn → movemon → simulateTurnEnd` until `ownComp >= stepTarget`.
   When the occupation ends mid-step (NONOCC), consume subsequent 0-comp buffer
   steps as new commands.

3. **Eager block** (digit step with deferred boundary RNG): The digit step has
   non-zero comp because in C the next command ran within the same step boundary.
   Eagerly execute that command then loop occupation iters to cover the target.

Critical: `simulateTurnEnd()` only calls `dosounds/gethungry/exercise` when
`game.occupation === null`. The "free cycle" turn where the occupation ends
therefore generates more comparable RNG than mid-occupation turns.

The `multi` count left by the eager block is correct for the OCC-HANDLER's
subsequent iterations. For seed5's `9s...9l` sequence: `multi=4` maps to 3
occupation iters (fn returns true) + 1 free cycle (fn returns false, dosounds
fires).

---

## Centralized Bottleneck Functions and Event Logging

### Mirror C's bottleneck architecture, don't scatter logic

C routes all monster deaths through `mondead()` (mon.c), all monster pickups
through `mpickobj()` (steal.c), and all monster drops through `mdrop_obj()`
(steal.c). The JS port originally had these scattered across 10+ call sites
with inconsistent behavior — some sites logged events, some dropped inventory,
some did neither. Centralizing to match C's architecture solved three problems
at once: consistent behavior, correct event logging, and easier maintenance.

The three bottleneck functions live in `js/monutil.js`:

- **`mondead(mon, map)`** — sets `mon.dead = true`, logs `^die`, drops
  inventory to floor via `placeFloorObject`. Does NOT call `map.removeMonster`
  — callers handle that.
- **`mpickobj(mon, obj)`** — logs `^pickup`, adds to monster inventory.
  Caller must extract obj from floor first.
- **`mdrop_obj(mon, obj, map)`** — removes from minvent, logs `^drop`,
  places on floor.

### Death drops use `placeFloorObject`, not `mdrop_obj`

This is a subtle but important distinction. When a monster dies, C's `relobj()`
calls `place_object()` directly — it does NOT go through `mdrop_obj()`. This
means death inventory drops produce `^place` events, not `^drop` events. If JS
routed death drops through `mdrop_obj`, the event logs would show extra `^drop`
entries that don't match C, creating false divergences.

### Event logging is interleaved with the RNG log

Both C and JS write `^`-prefixed event lines into the same stream as RNG calls.
On the C side, `event_log()` (in rnd.c, added by 012-event-logging.patch)
writes to the RNG log file. On the JS side, `pushRngLogEntry('^...')` appends
to the step's RNG array.

Current event types:

| Event | Meaning | C source | JS source |
|-------|---------|----------|-----------|
| `^die[mndx@x,y]` | Monster death | mon.c mondead | monutil.js mondead |
| `^pickup[mndx@x,y,otyp]` | Monster picks up | steal.c mpickobj | monutil.js mpickobj |
| `^drop[mndx@x,y,otyp]` | Monster drops | steal.c mdrop_obj | monutil.js mdrop_obj |
| `^place[otyp,x,y]` | Object on floor | mkobj.c place_object | floor_objects.js |
| `^remove[otyp,x,y]` | Object off floor | mkobj.c obj_extract_self | floor_objects.js |
| `^corpse[corpsenm,x,y]` | Corpse created | mkobj.c mkcorpstat | (corpse creation) |
| `^eat[mndx@x,y,otyp]` | Monster eats | dogmove.c dog_eat | dogmove.js dog_eat |
| `^trap[ttyp,x,y]` | Trap created | trap.c maketrap | (trap creation) |
| `^dtrap[ttyp,x,y]` | Trap deleted | trap.c deltrap | (trap deletion) |
| `^engr[type,x,y]` | Engraving created | engrave.c make_engr_at | engrave.js |
| `^dengr[x,y]` | Engraving deleted | engrave.c del_engr | engrave.js |
| `^wipe[x,y]` | Engraving eroded | engrave.c wipe_engr_at | engrave.js |

Event comparison is informational only — event mismatches appear in
`firstDivergences` but don't set `result.passed = false`. This lets us detect
state drift without blocking on expected differences while JS catches up.

### Thread parameters carefully when centralizing

When `mondead(mon, map)` needs a `map` parameter but the caller doesn't have
one, you must thread it through the entire call chain. For example,
`dog_starve()` didn't have `map`, so it had to be threaded through
`dog_hunger()` → `dog_starve()` → `dog_move()`. Always trace the full call
chain before adding a parameter to a bottleneck function.

### Clean up imports after centralizing

After moving logic into bottleneck functions, callers may have leftover imports
(`addToMonsterInventory`, `pushRngLogEntry`, `placeFloorObject`) that are no
longer used directly. Always verify and clean up.

### Port large-scale logic before entering bug burndown

During the initial port, many subsystems were "stubbed" — consuming the correct
RNG calls without creating actual game objects (gold, traps, engravings, etc.)
or performing the full logic. This was intended to maintain RNG parity while
deferring full implementation, under the assumption that unported subsystems
were "test-irrelevant."

**The meta-lesson: get the large-scale logic correct before entering a bug
burndown phase.** It is not efficient to chase test metrics empirically when
large subsystems are still stubbed — stubs create an illusion of parity that
makes individual bugs harder to diagnose:

1. **Missing objects cascade.** A vault gold stub consumes RNG without creating
   gold → no `^place` events → monsters don't path toward gold that doesn't
   exist → pet AI diverges → RNG shifts → every subsequent turn is wrong. The
   failure manifests in `dog_move`, but the root cause is in `mklev`.

2. **Diagnosis wastes time.** When 13 of 19 failing sessions trace back to
   stubbed level generation, debugging individual pet AI or combat differences
   is fighting symptoms. You can't distinguish "real AI bug" from "cascading
   from missing vault gold" without first porting the missing code.

3. **Incremental burndown stalls.** Each stub removal potentially fixes multiple
   sessions and reveals new "real" bugs. But if stubs remain, fixing one real
   bug may not flip any session green, because the cascading stub divergence
   still dominates.

Analysis of 19 failing gameplay sessions showed that 13 (68%) had their first
event divergence in level generation code where JS consumed RNG but didn't
create objects. The remaining sessions had runtime divergences that largely
cascaded from these level-gen differences.

Practical rule: before entering a "get all tests green" bug burndown, ensure
all major subsystems are faithfully ported — not stubbed. If C creates an
object and places it, JS must too. The RNG stub pattern saves short-term
effort but creates compounding debugging pain downstream.

---

## Game Orchestration

### Separate game orchestration from comparison

Don't contort the game engine to produce output shaped for comparison.
Run the game naturally, collect a flat log, and compare post-hoc.

**What happened:** `replay_core.js` grew ~1700 lines of complexity because it tried
to produce RNG logs in step-sized chunks matching C's screen-frame boundaries.
C's test harness creates artificial step boundaries mid-occupation
(`runmode_delay_output`) and mid-turn (`--More--` pagination). replay_core
contorted itself with RNG-count-driven loops, deferred boundary carrying, sparse
move handling, and step-consumption lookahead — all to match artifacts that
have nothing to do with game logic.

Meanwhile, three independent implementations (nethack.js, headless_runtime.js,
replay_core.js) each drove the same post-rhack orchestration (occupation loops,
multi-repeat, running mode) independently, creating a deployment risk: a bug in
the browser's orchestration wouldn't be caught by session tests using a different
orchestration.

**The fix:** Separate the two concerns completely:
1. **Game orchestration** — one shared `run_command()` function in `allmain.js`
   used by nethack.js (browser) and headless_runtime.js (tests/selfplay), so
   what you test is what you deploy.
2. **RNG comparison** — flatten both C and JS RNG streams into one sequence each,
   compare them post-hoc with relaxed boundary matching. Step boundaries from C
   are only used for diagnostic context ("divergence near step 42"), not as
   loop-control signals.

replay_core.js remains on its own orchestration for now because its loops are
fundamentally RNG-count-driven (using `reachedFinalRecordedStepTarget()` to
break loops based on matching C's RNG output count). This will be unified when
the comparison is reworked to post-hoc flat matching.

**Why it matters:** When comparison logic drives execution, you can't tell whether
a test failure is a real game divergence or a boundary-matching artifact. When
orchestration is duplicated, you can't tell whether a passing test means the
deployed code is correct. Separating these concerns makes both problems tractable.

---

## Phase Chronicles

The full narratives of the porting campaign, rich with war stories and
hard-won wisdom:

- **[Phase 1: PRNG Alignment](PHASE_1_PRNG_ALIGNMENT.md)** — The journey
  from xoshiro128 to ISAAC64, achieving perfect map alignment across all
  test seeds. Where it all began.

- **[Phase 2: Gameplay Alignment](PHASE_2_GAMEPLAY_ALIGNMENT.md)** — Extending
  parity to live gameplay: the turn loop, monster AI, pet behavior, vision,
  combat. The "final boss" chapter on pet AI.

- **[Phase 3: Multi-Depth Alignment](PHASE_3_MULTI_DEPTH_ALIGNMENT.md)** —
  Multi-depth dungeon generation, test isolation failures, and the long tail
  of state leaks between levels.

---

*You close the book. The lessons are many, and the dungeon is deep.*
*But forewarned is forearmed, and a ported function is a function that works.*

### sp_lev table-parser + dungeon predicate naming parity (2026-02-24)

- Porting `sp_lev.c` helper names into JS (`get_table_*`, `find_montype`, `find_objtype`, `sp_level_coder_init`, `create_des_coder`, `l_register_des`) is safe when behavior is kept behind existing call paths first, then adopted incrementally.
- `levregion`/`teleport_region` validation must stay C-strict for region shape (`{1,2,3,4}` array form); relaxing to object-shaped regions causes unit regressions.
- Moving `Can_dig_down`/`Can_fall_thru`/`Can_rise_up` and `builds_up` ownership into `dungeon.js` avoids cross-module stubs and keeps map/topology predicates co-located with dungeon branch state.

### Coordinate/levregion stair helpers (2026-02-24)

- Keep C helper ownership explicit in `sp_lev.js` (`get_table_xy_or_coord`, `l_create_stairway`, `l_get_lregion`, `levregion_add`, `light_region`) and route existing des entrypoints through those helpers so behavior stays centralized.
- `levregion`/`teleport_region` remain strict on region-array validation while still accepting object form where existing JS port paths already depend on it.
- Exporting `dungeon.c` topology names directly (`Invocation_lev`, `dname_to_dnum`, `dungeon_branch`) removes hidden duplicates and makes branch logic reusable from map-generation call sites.

### lspo entrypoint-name parity pass (2026-02-24)

- Keeping C entrypoint names (`lspo_*`) exported in `sp_lev.js` while retaining existing `des.*` names lets CODEMATCH track true structural parity without changing script-call surface.
- For feature flags, centralizing bit parse/set logic in one helper (`l_table_getset_feature_flag`) reduces drift and keeps random-flag semantics consistent across fountain/sink/throne/tree paths.
- Map-facing dungeon helpers (`find_branch`, `find_level`, `find_hell`, `br_string*`) are low-risk parity wins when implemented as pure topology lookups over already-initialized branch state.

### sp_lev helper-name parity batch (2026-02-24)

- Converting existing door/wall-location logic to C helper names in-place (`rnddoor`, `set_door_orientation`, `sel_set_door`, `sel_set_wall_property`, `set_wallprop_in_selection`, `set_wall_property`, `set_ok_location_func`) keeps behavior stable while improving CODEMATCH coverage.
- `rndtrap` can be shared by both maze fill and trap-selection paths when it receives explicit context (`canDigDown`, `inEndgame`) instead of reaching into unrelated generation state.
- Exporting these C-named helpers in `sp_lev.js` preserves direct dependency wiring and avoids extra forwarding modules or alias layers.

### sel_set_ter call-site parity (2026-02-24)

- Keep `sel_set_ter` as a C-named primitive, but make metadata-reset behavior explicit via options so call sites can match C context (`lspo_map` clears tile metadata; other writes may not).
- `lspo_map` now routes through `sel_set_ter` while preserving prior semantics and test baseline.
- `sel_set_lit` is now used by region-lighting loops, with lava handling kept at call sites so behavior remains unchanged.

### mapfragment runtime-enable for replace_terrain (2026-02-24)

- `sp_lev` mapfragment helpers (`mapfrag_fromstr`, `mapfrag_canmatch`, `mapfrag_error`, `mapfrag_match`) can be enabled in runtime safely when `replace_terrain` only enters that path when `mapfragment` is explicitly present.
- Keeping non-mapfragment `fromterrain` behavior unchanged avoids broad RNG churn while letting `hellfill`/themeroom mapfragment calls execute real C-analog matching.
- `mapfrag_match` must compare `match_maptyps(mapTyp, fragTyp)` (not reversed) so the `'w'` wildcard and non-terrain sentinels behave like C pattern semantics.

### mkmaze waterlevel + nhlua/nhlsel mapchar bridge (2026-02-24)

- `mkmaze` waterlevel helpers (`setup_waterlevel`, `mk_bubble`, `movebubbles`, `mv_bubble`, `save_waterlevel`, `restore_waterlevel`, `set_wportal`) should carry real structured state (bounds, bubble descriptors, active flags) rather than opaque placeholders so later movement parity work has deterministic hooks.
- `nhlua`/`nhlsel` mapchar glue belongs in `sp_lev` where mapchar parsing already lives; adding `check_mapchr`, `get_table_mapchr[_opt]`, and `l_selection_filter_mapchar` enables direct C-name call sites with no forwarder indirection.
- `selection.filter_mapchar` should route to `l_selection_filter_mapchar` so wildcard wall (`'w'`) and transparent selector (`'x'`) behavior is centralized and parity-debuggable.

### nhlsel/nhlua C-name wrapper parity pass (2026-02-24)

- For selection semantics already implemented in `selection.*`, exposing C-name entrypoints (`l_selection_*`, `params_sel_2coords`) in `sp_lev.js` is a low-risk way to collapse CODEMATCH "missing" rows without adding cross-file forwarders.
- Keep C-name wrappers thin and route all behavior through the same underlying selection operations (`intersect/union/xor/sub`, `grow`, `floodfill`, `match`) to avoid split logic paths.
- `nhlua` table helpers (`get_table_boolean/int/str/option` and *_opt variants) should be centralized with explicit coercion/default behavior so des parser callsites share consistent semantics.

### mkmaze ownership consolidation for water/baalz helpers (2026-02-24)

- `sp_lev` special-fixup should call `mkmaze` ownership functions for water setup and Baalz wall-geometry (`setup_waterlevel`, `baalz_fixup`) instead of maintaining duplicate logic in two files.
- Keep thin local wrappers in `sp_lev` only where needed for existing call structure, but route implementation to `mkmaze` to avoid drift.
- Preserve existing parity-visible state fields (`_waterLevelSetup`) when moving logic, so targeted map/special replay checks stay stable while ownership is cleaned up.

### mkmaze water-state save/restore hardening (2026-02-24)

- `save_waterlevel`/`restore_waterlevel` should snapshot and restore all parity-relevant water scaffolding (`_water`, `_waterLevelSetup`, and `flags.hero_memory`), not just the bubble array.
- Keep backward compatibility for earlier save format (raw `_water` object) so ongoing replay/debug workflows do not break when the saved payload schema evolves.
- `unsetup_waterlevel` should clear active runtime movers (bubbles, hero bubble, fumaroles, portal) while keeping deterministic state handling explicit.

### mkmaze walkfrom/deadend ownership tightening (2026-02-24)

- `create_maze` should use `walkfrom()` as the actual carve engine and rely on `okay()` with current maze bounds, instead of a separate iterative DFS path with different RNG shape.
- `maze_remove_deadends` should operate in-place on an already carved maze; re-entering `create_maze()` from `maze_remove_deadends()` is structurally wrong and changes behavior.
- In `sp_lev`, `fixupSpecialLevel` should call `mkmaze` ownership functions (`setup_waterlevel`, `baalz_fixup`) directly rather than going through local forwarding wrappers.
- `sp_lev` `level_init(style=\"maze\")` should invoke `mkmaze.create_maze()` directly (with `corrwid`/`wallthick`/`deadends`) instead of leaving a STONE-filled placeholder grid.
- `sp_lev` finalize should honor the C `premapped` coder flag by calling `premap_detect()` so terrain/traps are revealed through the standard detect path.
- `mkmaze` water runtime state should keep movement-side structures coherent (`fumaroles` shift in deterministic `movebubbles` mode) and treat fumarole squares as sticky in `water_friction`.
- `mkmaze.fixup_special` can safely own low-risk special-name flag side effects (`castle` graveyard, `minetn*` town) and `check_ransacked` should support room-name lookup in addition to numeric IDs.

### safepet force-fight parity in domove attack path (2026-02-24)

- In `hack.js` attack resolution, `flags.safe_pet` must not block an intentional force-fight (`F`) attack on a tame monster.
- Gating safe-pet rejection behind `!game.forceFight` aligns with C behavior where forced attacks bypass safemon displacement/protection and proceed into normal attack logic.
- This change preserved suite baseline while improving gameplay parity: seed202 no longer diverges on RNG at step 272 (moved to message-only divergence).

### uhitm improvised-weapon opening message parity (2026-02-24)

- In C (`uhitm.c`), attacking while wielding a non-weapon emits a one-time opening message (`You begin bashing monsters with ...`) before the attack outcome line.
- For replay parity, when that opening message and miss result need to appear in the same turn at topline-width boundary, emitting the combined miss line directly in `do_attack()` avoids relying on display-layer concat edge cases.
- Miss messages should use `mon_nam()` semantics (not hardcoded `the ...`) so named monsters/pets (e.g. `Idefix`) match C wording.

### mkmaze protofile special-level loading parity (2026-02-24)

- `makemaz(protofile, ...)` should first attempt protofile-driven special-level generation (C `mkmaze.c` path) and only fall back to procedural maze generation when lookup fails.
- Protofile lookup needs base-name variant support (`medusa` -> `medusa-1..4`, `tower` -> `tower1..3`) and should prefer the current `(dnum,dlevel)` endpoint when provided.
- Reusing the same special-level setup path (`resetLevelState`, finalize context, special-theme init shuffle) avoids introducing a separate RNG/loader code path for protofile-backed mazes.

### sp_lev trap coordinate resolution tightening (2026-02-24)

- In parity finalize context, explicit `des.trap` coordinates should be resolved immediately (no RNG) and passed straight to trap creation.
- Only random/negative coordinates should defer through `get_location_coord` so random-location probing does not run for explicit coordinates.
- Deferred trap random detection should treat negative coordinates as random requests, matching C call-shape expectations.

### mklev ordinary-room amulet gate parity (2026-02-24)

- `fill_ordinary_room` monster seed path should follow C condition `(u.uhave.amulet || !rn2(3))`; this is now represented with a map-level `_heroHasAmulet` parity hook.
- Default behavior remains unchanged when that hook is unset, keeping existing replay baseline stable.

### sp_lev trap coord normalization parity (2026-02-24)

- `des.trap` coordinate normalization should treat packed `SP_COORD_PACK` values the same as array/object coords; missing this silently falls back to random placement and can consume unrelated RNG.
- In `finalizeContext`, trap creation should still execute immediately in script order and resolve coordinates at call time, mirroring C `lspo_trap` behavior.
- Added unit coverage for packed-coord trap table form to keep this path stable (`des.trap({ type: 'pit', coord: packed })`).

### makelevel amulet flag propagation + bubble bound fix (2026-02-24)

### mkmaze fixup/water matrix tightening (2026-02-24)

- `mkmaze.fixup_special` can safely own more of C's post-levregion matrix (Medusa statue pass, cleric-quest/castle graveyard flags, Minetown ransacked booty gate) while `sp_lev` continues to own levregion iteration itself.
- `check_ransacked` should track the `minetn-1` marker path in addition to ad-hoc room-id/name lookup helpers used by existing JS tests.
- For water runtime parity, `movebubbles` and `mv_bubble` can adopt C-style traversal and heading updates without forcing full object/monster/trap transport in the same batch; keep those as explicit remaining TODOs.

- `fill_ordinary_room`'s amulet gate only helps parity when makelevel callers propagate hero state; `changeLevel`/newgame generation now pass `heroHasAmulet` into `makelevel`, and generated maps retain `_heroHasAmulet`.
- Water bubble bounds should treat size `n` as span `n-1` in movement edge checks so a `1x1` bubble can legally occupy `xmax`/`ymax`.
- Added unit coverage for the `1x1` bubble right-edge case to prevent reintroducing off-by-one clamping.

### coupled A/B parity fix pattern: movemon pass shape + moveloop sequencing (2026-02-24)

- We hit a hard coupling where fixing only one side regressed parity: making `movemon` single-pass (C-like) without also porting `moveloop_core` scheduling caused early divergences, while keeping legacy `movemon` internal looping forced non-C turn ordering drift.
- The failure mode was structural: JS had monster re-looping inside `movemon` plus `_bonusMovement` gating, but C splits responsibilities (`movemon()` single pass returning `somebody_can_move`; outer `moveloop_core` loops based on `u.umovement` and `monscanmove`).
- The stable fix is atomic and paired: port both pieces together so control flow matches C end-to-end. Partial ports of either side alone are misleading and can appear to "fix" one seed while regressing broad ordering and RNG alignment.
- Practical rule for future parity work: when a C function's return contract controls outer-loop scheduling, port caller and callee together in one change; otherwise A-vs-B oscillation is likely.

### seed1 event-order parity: iterate order + niche/statue object paths (2026-02-24)

- `sp_lev` selection `iterate()` must follow C `l_selection_iterate()` ordering (y-major then x); x-major iteration preserves set membership but drifts deterministic event order during themed-room generation.
- `mklev.makeniche()` must place generated niche objects at the niche square (`yy + dy`) via `mksobj_at`/`mkobj_at` semantics; creating objects without map placement consumes RNG but drops `^place` events.
- `fill_ordinary_room` statue generation should use `mkcorpstat(STATUE, -1, ...)` rather than raw `mksobj(STATUE)` so C-style `^corpse[...]` event emission and ordering are preserved.
- With these three core-code fixes, `seed1_gameplay` reached full event parity (`663/663`) while keeping RNG/screens/colors at `100%`.

### mkmaze water runtime scaffold tightening (2026-02-24)

- `setup_waterlevel()` should seed bubbles through `mk_bubble()` (not raw descriptors) so per-bubble shape and initial drift RNG match C call order.
- `set_wportal()` should support C-style discovery from existing `MAGIC_PORTAL` traps when no explicit coordinates are supplied.
- `movebubbles()` should re-establish water/air base terrain before moving bubbles; this keeps bubble rendering behavior closer to C even before full object/monster/trap bubble transport is ported.
- Bubble transport can be ported incrementally by lifting map contents into per-bubble containers before movement, then replacing at shifted coordinates afterward; this closes object/monster/trap drift without requiring full hero-transport wiring in the same batch.

### mkgrave headstone parity + seed100 recapture (2026-02-24)

- `mklev.mkgrave()` must create the grave through `engrave.make_grave()` (or equivalent) so headstone engravings are emitted as `^engr[6,x,y]`, matching C event logs.
- Setting `loc.typ = GRAVE` alone is insufficient for event parity because it misses the engraving-side event stream even when RNG/screens remain aligned.
- Older session captures can under-report modern movement/event instrumentation; when core behavior is already aligned, re-record those sessions with current `run_session.py` to restore event-schema parity.

### Meta-lesson: event parity is a high-value bug finder (2026-02-24)

- Full RNG parity can still hide real behavioral gaps; event-stream mismatches often expose missing state transitions that RNG alone does not make obvious.
- Practical workflow: first classify event drift into (a) stale capture schema vs (b) real core logic mismatch, then only re-record when (a) is confirmed.
- Concrete example: in pet split-stack pickup, JS created a detached split object and went straight to `mpickobj`, skipping the C-style on-floor extraction event. Event parity highlighted the missing `^remove` before `^pickup`, leading to a core fix in `dogmove` split handling.
- Treat event parity as production-path validation, not test-harness cosmetics: fixes should land in game logic and improve replay/debug observability for future divergence work.

### Knight pony start-inventory parity (2026-02-24)

- In `makedog()`, the knight pony saddle path must route through `mpickobj()` rather than directly mutating `pet.minvent`.
- Direct inventory mutation preserves state but drops the `^pickup` event, causing early event-order drift before the first monster movement phase.
- Event parity around startup can reveal these "state-correct but instrumentation-wrong" paths; fixing them in core helpers keeps replay diagnostics trustworthy.

### Medusa statue reroll parity helper reuse (2026-02-24)

- `sp_lev` Medusa fixup should use shared `mondata.poly_when_stoned(ptr)` rather than local TODO logic when rerolling statue corpsenm.

### Water-plane hero coupling hook (2026-02-24)

- Bubble transport in `mkmaze.movebubbles()` can move the hero deterministically if callers provide `map._water.heroPos` plus `map._water.onHeroMoved(x,y)`; this avoids cross-module imports while keeping movement ownership in `mkmaze`.
- For parity-friendly vision updates, callers can provide `map._water.onVisionRecalc()` and let `movebubbles()` invoke it after terrain/bubble updates.
- `hack.water_turbulence()` should call `maybe_adjust_hero_bubble()` on Water level so hero directional intent can steer the current bubble with C-style 50% gating.
- When hero transport lands onto an occupied square, displace that monster with `enexto()` before finalizing hero position to match C `mv_bubble` collision handling intent.
- Direct `vision.block_point/unblock_point/recalc_block_point` calls can throw in map-only unit contexts; wrap those as best-effort hooks in map generators so tests without full FOV state remain deterministic.
- `unsetup_waterlevel()` should clear runtime callback hooks (`heroPos`, `onHeroMoved`, `onVisionRecalc`) to avoid stale cross-level closures after level transitions.

### mkmaze fumaroles C-path scaffold (2026-02-24)

- `mkmaze.fumaroles()` should own a C-style runtime path (nmax sizing, fire/temperature adjustments, random lava-cell probes, gas-cloud size/damage rolls) rather than only accepting precomputed coordinates.
- Keep backward-compatible list-input behavior for existing waterlevel deterministic tests while introducing the C-path as default runtime behavior.
- `create_gas_cloud()` can throw in vision-lite generator/test contexts; `fumaroles()` should treat cloud placement as best-effort there so deterministic map/unit flows do not crash.

### objnam helper-surface closure for codematch (2026-02-24)

- `objnam.js` now owns explicit symbol wrappers for C-facing naming APIs (`xname`, `doname`, `erosion_matters`, `xname_flags`, `doname_base`) rather than relying on implicit re-exports from `mkobj.js`.
- Added missing helper surfaces used by C mapping and wishing workflows: fruit lookup helpers (`fruit_from_name`, `fruitname`, `fruit_from_indx`), safe prompt builder (`safe_qbuf`), terrain/wallprop adapters (`dbterrainmesg`, `set_wallprop_from_str`), and staged readobjnam hooks (`readobjnam_init/preparse/parse_charges/postparse*`).
- Kept behavior stable for current parity sessions by making helper additions non-invasive: readobjnam retains existing parser flow while exposing C-structured stages for future deeper parity work.

### objnam readobjnam staged parser parity pass (2026-02-24)

- `readobjnam_postparse1/2/3` now carry real parser work instead of no-op placeholders:
  - phase 1 splits `"named"/"called"/"labeled|labelled"` segments and handles `"pair(s)/set(s) of"` normalization;
  - phase 1 also centralizes object-class inference (`scroll of`, `foo wand`, bare class nouns) plus dragon-scale-mail forced type handling;
  - phase 2 adds C-style generic `"<color> gem/stone"` coercion into `GEM_CLASS`.
- `readobjnam` lookup order is now C-shaped: try `actualn`, then `dn` (label/description token), then `un` (called-name), then original text (`origbp`) before classless fallback attempts.
- Added deterministic unit coverage for the new staged parser behavior (`scroll labeled ...`, `pair of ...`, `blue gem` normalization) in `test/unit/objnam_port_coverage.test.js`.

### objnam naming helper de-stub + codematch audit pass (2026-02-24)

- Replaced naming stubs with working behavior in `objnam.js`:
  - `mshot_xname()` now prepends C-style ordinal multishot context (`"the 2nd ..."`) when `_m_shot/m_shot` metadata is present on the object.
  - `doname_with_price()` now appends shop-style suffixes (`unpaid`, `for sale`, `contents`) when price metadata or `shk.get_cost_of_shop_item()` context is available.
  - `doname_vague_quan()` now emits farlook-style `"some ..."` naming when stack quantity is unknown (`!dknown` and quantity > 1).
- `wizterrainwish()` no longer hard-noops; it now parses wizard terrain wish intent into a structured descriptor (`terrain`, `wallprops`) as a bounded first step before full map-mutation wiring.
- Expanded deterministic coverage in `test/unit/objnam_port_coverage.test.js` for multishot naming, vague quantity naming, price suffix formatting, and terrain-wish parsing.
- Audited and refreshed `docs/CODEMATCH.md` `objnam.c -> objnam.js` entries against live symbols and implementations; current status is `86 Aligned / 1 Stub / 0 Missing` (remaining stub: `wizterrainwish`, map mutation path still pending).

### objnam wizterrainwish in-map mutation path (2026-02-24)

- `wizterrainwish()` now supports live map mutation when called with `{ text, player, map }` context:
  - terrain mutations for door/wall/room/fountain/sink/throne/altar/grave/tree/iron bars/cloud/water/lava/ice/secret corridor;
  - trap creation for named trap wishes via `dungeon.maketrap()`;
  - side effects for engravings (`del_engr_at`), floor object damage chains on water/lava (`water_damage_chain`/`fire_damage_chain`), trap removal on room-floor replacement (`deltrap`), and vision blocking refresh (`recalc_block_point`).
- C-flow parity follow-up: terrain/trap wish handling now lives in `readobjnam()` (wizard-only, disabled for wizkit wishes), and `zap.makewish()` handles the returned `hands_obj` sentinel instead of doing a separate terrain fallback.
- Added deterministic unit coverage for live map mutation (`locked door` mask application and trap creation at hero position) in `test/unit/objnam_port_coverage.test.js`.
- Post-implementation codematch audit now reports `objnam.c -> objnam.js` as `87 Aligned / 0 Stub / 0 Missing`.

### Trap generation + setup port tightening (2026-02-24)

- `dungeon.maketrap()` now records C-style fall destinations for generated holes/trapdoors via a dedicated `hole_destination()` helper instead of consuming RNG without storing destination.
- Hole/trapdoor depth gating in `mktrap()` should use dungeon-bottom logic (`dng_bottom`) rather than a fixed hardcoded depth cutoff; this keeps branch behavior closer to C across dungeons.
- `apply` trap setup now has real `use_trap`/`set_trap` occupation wiring for land mines and bear traps, including placement checks and inventory consumption, replacing prior stubs.
- `dokick` now routes monster trap resolution through `trap.mintrap_postmove()` rather than a no-op local stub.
- Session impact from this batch stayed stable in current coverage: `seed42_inventory_wizard_pickup_gameplay` remains full parity, while known first divergences in `seed8_tutorial_manual_gameplay` and `seed206_monk_wizard_gameplay` remain unchanged and still point to broader special-level RNG/call-order gaps.

### cmdq infrastructure port (2026-02-24)

- Ported C-style command queue primitives into `input.js` with matching queue/type enums and node fields:
  - queue kinds: `CQ_CANNED`, `CQ_REPEAT`
  - node types: `CMDQ_KEY`, `CMDQ_EXTCMD`, `CMDQ_DIR`, `CMDQ_USER_INPUT`, `CMDQ_INT`
  - APIs: `cmdq_add_ec/key/dir/userinput/int`, `cmdq_shift`, `cmdq_reverse`, `cmdq_copy`, `cmdq_pop`, `cmdq_peek`, `cmdq_clear`.
- `cmdq_pop()` now matches C selection semantics by choosing queue based on `in_doagain`-style flag (`cmdq_pop(true)` reads `CQ_REPEAT`, otherwise `CQ_CANNED`).
- Added deterministic unit coverage in `test/unit/input_runtime.test.js` for FIFO pop behavior, repeat-vs-canned selection, `cmdq_shift` tail-to-head movement, structural copy behavior (`cmdq_copy`), and linked-list reversal (`cmdq_reverse`).
- Full gate remained stable relative to baseline (`unit` green; existing 19 gameplay parity divergences unchanged).

### CQ_REPEAT wiring in runtime command flow (2026-02-24)

- `run_command()` now records a repeat snapshot into `CQ_REPEAT` for non-`Ctrl+A` commands using C-shaped cmdq payload (`CMDQ_INT` count prefix when present + `CMDQ_KEY` command key).
- Browser `gameLoop()` `Ctrl+A` resolution now reads repeat data from `CQ_REPEAT` (via `get_repeat_command_snapshot()`) instead of relying only on `lastCommand` state.
- Added deterministic unit coverage in `test/unit/command_repeat_queue.test.js` for repeat snapshot recording and `Ctrl+A` non-overwrite behavior.
- Gate impact stayed baseline-stable (`npm test`: unit pass; existing 19 gameplay parity failures unchanged).

### CQ_REPEAT doagain execution wiring (2026-02-24)

- Added runtime doagain execution path via `allmain.execute_repeat_command()`:
  - used by `Ctrl+A` in browser game loop;
  - used by `#repeat`/`#again` extended command route.
- `run_command()` now decodes queued command payloads via `cmdq_pop_command(inDoAgain)` when invoked with key `0`, matching C-style queue-driven command replay entry.
- `input.nhgetch()` gained command-queue input playback mode (`setCmdqInputMode`) so queued `CMDQ_KEY`/`CMDQ_DIR`/`CMDQ_INT` nodes can satisfy follow-up prompts during doagain replay.
- `input.nhgetch()` also gained repeat-capture mode (`setCmdqRepeatRecordMode`) so follow-up prompt answers entered during normal command execution are appended to `CQ_REPEAT` as `CMDQ_KEY` entries.
- Added cmdq restore helper (`cmdq_restore`) and tests covering queued command decode, queued direction consumption, repeat-input capture, and `#repeat` command sentinel flow.
- Full test gate remains baseline-stable: all unit tests pass, gameplay parity retains existing 19 known divergences.

### cmdq ownership moved into rhack (2026-02-24)

- Tightened parity shape so command-queue dispatch occurs in `cmd.js:rhack()` (via `cmdq_pop_command`) rather than `run_command()` orchestration.
- `run_command()` now focuses on turn orchestration and repeat-capture toggles, while `rhack()` owns decoding queued `CMDQ_INT` count + `CMDQ_KEY`/`CMDQ_EXTCMD` command nodes.
- Added repeat-queue restore regression check in `test/unit/command_repeat_queue.test.js` (`execute_repeat_command` preserves CQ_REPEAT payload after replay).

### Meta-lesson: event parity can unlock PRNG parity (2026-02-25)

- For `seed113_wizard_selfplay200_gameplay`, driving event sequence parity exposed the real semantic mismatches and led directly to full RNG parity.
- Concretely, fixing C-faithful event-producing paths (`mklev` niche corpse creation via `mkcorpstat`, and combat growth/kill flow in `mhitm`) moved both metrics together to `event 3321/3321` and `rng 13421/13421`.
- Practical strategy: when a seed is close on RNG but diverges in event ordering/content, prioritize event-faithful core logic first; event alignment is often the shortest path to recovering RNG alignment.

### Meta-lesson: avoid fixture-overfit when capture timing is suspect (2026-02-25)

- `seed204_multidigit_wait_gameplay` showed a topline mismatch at step 3 (`""` vs `"You stop waiting."`) while RNG/events were already fully matched.
- A JS-side suppression of `stop_occupation` messaging for counted wait/search was introduced to force the blank topline; this was not C-faithful and was an overfit workaround.
- Capture experiment showed the fixture itself was timing-sensitive: re-recording with a small final settle (`NETHACK_FINAL_CAPTURE_DELAY_S=0.10`) changed C's captured final topline to `"You stop waiting."` without changing RNG counts.
- Correct resolution was to remove the suppression and keep C-like `stop_occupation` behavior (`You stop ...`), then re-record only the targeted session with final settle delay.
- Operational rule: when mismatch is screen-only and RNG/events are stable, treat fixture capture timing as a first-class suspect; do not change core gameplay semantics to satisfy a possibly stale/under-settled frame.
## 2026-02-26: Iron Parity campaign operations

- Keep campaign work issue-driven in three layers: tracker epic (`M0..M6`), milestone issues, and concrete child implementation issues. Milestones should not carry unscoped implementation directly.
- For failing-session burndown, capture two artifacts per baseline run: a full pass/fail snapshot and a first-divergence taxonomy grouped by JS origin (`function(file:line)`). Use the taxonomy to open follow-up cluster issues immediately.
- Require each campaign issue to carry dependency links (`Blocked by`, `Blocks`) and evidence fields (session/seed, first divergence, expected C vs actual JS) to keep parallel engineers aligned.

### Translator safe-scaling lesson: string-pointer style ports must be gated (2026-02-27)

- A wide stitch batch surfaced that several `hacklib.c`-style string functions can emit syntactically-valid but semantically-wrong JS when C pointer mutation idioms are lowered mechanically (`p++`, in-place char writes, NUL termination).
- These outputs can pass structural safety checks yet still regress runtime behavior or hang unit runs.
- Practical policy update for batch stitching:
  - keep broad autostitch on modules with scalar/control logic (`windows`, small status helpers),
  - require stricter semantic gating for string/pointer-mutation families (`hacklib`, name-formatting surfaces) until translator rules model immutable JS strings explicitly,
  - when in doubt, prefer conservative module filtering and revert suspect subsets immediately.

### Translator safety lint now blocks pointer-string traps pre-stitch (2026-02-27)

- Added semantic hazard checks to `runtime_candidate_safety.py` so syntax-valid but JS-invalid string-pointer rewrites are rejected before stitching.
- New blocked patterns:
  - `NUL_SENTINEL_ASSIGN` (scalar assignment of `'\0'` / `'\x00'`),
  - `POINTER_TRUTHY_FOR` (C-style pointer scan loops like `for (p=s; p; p++)`),
  - `WHOLE_STRING_HIGHC_LOWC` (whole-string `highc/lowc` rewrites).
- Added module-level semantic blocking (`MODULE_SEMANTIC_BLOCK`) driven by
  `tools/c_translator/rulesets/semantic_block_modules.json` for known
  string/pointer-heavy files (`hacklib`, `do_name`, `objnam`) until emitter
  rules can preserve JS string semantics safely.
- On the latest full candidate set (`/tmp/translator-runtime-stitch-candidates-v4.json`), safe candidates decreased from `470` to `452` and dry-run stitchable count dropped from `174` to `129`, preventing known bad inserts from entering runtime patches.

### Translator batch-control lesson: prefer allowlist stitching for surgical batches (2026-02-27)

- Denylists are useful for broad suppression, but they still leave room for accidental extra inserts when candidate sets evolve.
- `runtime_stitch_apply.py` now supports `--allowlist` with exact `{js_module,function}` pairs, so surgical batches can be applied deterministically.
- Operationally, use allowlists for high-accuracy incremental landings; reserve denylists for coarse global exclusions.

### Monster-throw input handoff can consume replay command keys (2026-03-01)

- `seed113_wizard_selfplay200_gameplay` divergence at step 22 was caused by JS consuming the next recorded command key after a monster throw.
- Root cause: `mthrowu.monshoot()` always forced `display.morePrompt(nhgetch)` for non-target throws, which can shift replay command timing by treating the next gameplay key as prompt acknowledgement.
- C parity behavior is subtler: this handoff is not unconditional and should not always steal the next command key.
- Fix: keep throw-message handoff only for non-target throws that did **not** already resolve with a direct hit on the hero, preserving known-good behavior on control seeds while removing the step-22 key-steal in seed113.

### tmp_at overlay erase must redraw current map state, not cached cells (2026-03-01)

- During `seed110_samurai_selfplay200_gameplay`, a screen-only mismatch showed stale monster/object glyphs after throw animations even when RNG/events were fully matched.
- Root cause: JS temp-glyph erase (`display.redraw()` / `headless.redraw()`) restored from `_mapBaseCells` captured at the start of map render, but C `tmp_at` erase semantics are `newsym()`-like (recompute from current state).
- Fix: when temp overlay stack empties for a cell, redraw from the current `_lastMapState` map render instead of restoring cached base cells.
- Impact: removed stale-map ghosting artifacts in the seed110 throw window and improved color parity there (`4795/4800` -> `4796/4800`) without regressing seed108/seed113.

### m_throw timing parity: resolve impact before per-step animation frame (2026-03-01)

- In C `m_throw()` ordering is: advance projectile -> resolve hit/block logic -> `tmp_at(x,y)` + `nh_delay_output()` per traversed step -> final `tmp_at(x,y)` + delay -> `tmp_at(DISP_END, ...)`.
- JS `m_throw_timed()` had diverged ordering (display/delay before hit resolution, and `DISP_END` before the final impact frame), which can skew throw-frame timing and visual parity windows.
- Fix: reordered JS loop/body and trailer to match C ordering, keeping non-throw control seeds stable (`seed108`, `seed113`) while preserving ongoing seed110/seed208 debugging signal.

### Ctrl+A repeat semantics with count prefixes (2026-03-02)

- Session evidence from `seed7_tutorial_manual_wizard_gameplay` shows that after entering `5s`, pressing `Ctrl+A` replays plain `s` search turns rather than replaying the `5` count prefix each time.
- Practical parity implication: `CQ_REPEAT` replay payload for this path should preserve the repeatable command key stream, but not force stored count prefixes back into every `Ctrl+A` replay cycle.
- We updated JS repeat behavior and unit expectations accordingly:
  - `Ctrl+A` now follows observed session semantics for counted search replay.
  - `command_repeat_queue` unit checks now assert key-only replay snapshot behavior for counted commands.
- Result: repeat-queue unit coverage is green, and tutorial seed divergence is now late (`step 110`) rather than at startup.

### Seed110 throw-frame parity and visible monster-item naming (2026-03-02)

- `seed110_samurai_selfplay200_gameplay` had full RNG/event parity but a screen mismatch at step 106 during a goblin dagger throw.
- Root cause was message/animation ordering: JS paused for `--More--` in `monshoot()` after projectile cleanup, while C can block during `m_throw()`/`ohitmon()` before cleanup, preserving the intermediate projectile frame.
- Fix in core combat flow (`js/mthrowu.js`):
  - made `ohitmon()`/`thitu()` async-capable with C-like topline flush checks,
  - moved the throw-window `--More--` pause to the impact path inside `m_throw_timed()` (before cleanup),
  - surfaced deferred death message timing (`"<Mon> is killed!"`) so it appears after dismissing `--More--`, matching C captures.
- Follow-on parity gap exposed by this fix: non-pet monster pickup messaging/naming.
  - Added C-like visible pickup messages in `monmove` pickup path (`js/monmove.js`), using seen-known object naming.
  - Aligned monster weapon-swing visible naming in `mhitu` to seen-known names (`orcish dagger` vs unidentified appearance names like `crude dagger`).
- Result: `seed110` is now fully green (`201/201` screens, `4824/4824` colors, RNG/events 100%) and overall failing gameplay sessions dropped from 14 to 13 in `run-and-report --failures`.

### Seed7 tutorial regression root cause: lost special-level generation context (2026-03-02)

- `seed7_tutorial_manual_wizard_gameplay` regressed from deeper parity back to immediate early divergence after `b6637fd6`.
- Root cause was in JS core special-level setup (`sp_lev`), not harness: new `GameMap` instances created in `level_init()` no longer copied finalize context to `_genDnum/_genDlevel`.
- `mktrap()`/`hole_destination()` in `dungeon.js` relies on `_genDnum/_genDlevel` for C-faithful trap depth RNG during level generation.
- Without that context, hole/trapdoor destination depth consumed a different RNG path (`rn2(4)` loop against wrong dungeon/depth), shifting RNG from step 2.
- Restoring `_genDnum/_genDlevel` (and `_dnum/_dlevel`) on special-level map init moved seed7 first RNG divergence back out to step 165.

### Level flag naming migration: `rndmongen` -> `nomongen` (2026-03-02)

- Standardized level random-monster-generation flag naming to the C-facing name `nomongen`.
- Removed all runtime references to the JS-specific alias `rndmongen`; no compatibility read path remains.
- Updated special-level flag parsing (`des.level_flags("nomongen")`) and level initialization defaults to write/read `nomongen` directly.
- This is a breaking internal flag-name change for stale serialized in-memory flag objects that still use `rndmongen`.

### Event parity migration: dog diagnostics now strict (2026-03-02)

- Comparator event filtering for `^distfleeck[...]` and `^dog_invent_decision[...]` was removed, and `^dog_move_choice[...]` filtering was also removed.
- Result: dog diagnostic events now participate in strict parity checks like other event channels.
- Current gameplay session corpus is mixed-instrumentation:
  - 4 gameplay sessions include `^distfleeck[...]`, `^dog_invent_decision[...]`, and `^dog_move_choice[...]`.
  - 38 gameplay sessions include only older dog event schema (`^dog_move_entry[...]`/`^dog_move_exit[...]`) and will fail event parity until re-recorded.
- Migration requirement: re-record gameplay sessions with the latest C harness event patches so event schemas match and strict event parity is meaningful.

### Cursor parity for count-prefix replay frames (2026-03-02)

- `seed204_multidigit_wait_gameplay` had a non-blocking cursor mismatch at step 2:
  C capture cursor was on topline after `Count: 15` (`[9,0]`), while JS replay left cursor on player.
- Root cause: replay count-prefix digit handling rendered map/status after writing `Count: N`, which reset cursor to player.
- Fix: in replay capture path, restore cursor to topline (`setCursor(len("Count: N"), 0)`) after render and before snapshot capture.
- Result: `seed204_multidigit_wait_gameplay` cursor parity is now full (`3/3`).

### seed301 kick-door RNG mismatch triage (2026-03-04)

- `seed301_archeologist_selfplay200_gameplay` first RNG divergence is at step 10 around a `^D`/`l` kick-door interaction.
- JS emits:
  - `rn2(19)=10` (DEX exercise),
  - `rnl(35)=23`.
- The recorded C session emits:
  - `rn2(19)=10` (DEX exercise),
  - `rn2(38)=10`,
  - `rnl(35)=22`.
- Current C source (`dokick.c` + `rnd.c`) only emits `rn2(37+abs(Luck))` inside `rnl()` when `Luck != 0`.
- JS runtime trace at that kick site shows `uluck=0`, `moreluck=0`, so no `rn2(38)` is expected from current C logic either.
- Conclusion: this looks like capture provenance mismatch (session generated from a C build/behavior not matching current patched source), not a safe JS core fix candidate.

### Engraving/trap helper correctness hardening (2026-03-04)

- Fixed `engrave.del_engr_at()` argument handling; it previously called `engr_at()`/`del_engr()` with wrong signatures and could silently no-op.
- `del_engr_at()` now accepts map-first and map-last call forms and correctly deletes from `map.engravings`.
- Tightened `can_reach_floor()` toward C semantics:
  - checks `uswallow`, `ustuck + AT_HUGS`, levitation, `uundetected + ceiling_hider`, flying/huge-size fast path,
  - supports explicit `check_pit` gating and uses trap-at-hero checks for pit/hole edge cases.
- Updated `u_wipe_engr()` and `maybeSmudgeEngraving()` to pass `check_pit=TRUE` semantics explicitly.
- Fixed translated trap helpers with wrong argument order:
  - `adj_nonconjoined_pit()` now passes map to `t_at()`,
  - `uteetering_at_seen_pit()` and `uescaped_shaft()` now pass `player` to `u_at()`.
- Validation:
  - `seed309_rogue_selfplay200_gameplay` remains fully green (no regression),
  - known `seed312` first divergence (`^wipe[56,13]`) is unchanged, so this patch improves helper correctness but does not resolve that divergence yet.

### Wear prompt parity: `GETOBJ_DOWNPLAY` behavior for `W` (2026-03-04)

- `dowear` prompt behavior in C comes from `getobj()` callbacks, not a simple
  "any unworn armor?" check.
- C's `wear_ok` can return:
  - `GETOBJ_SUGGEST` for valid armor candidates,
  - `GETOBJ_DOWNPLAY` for non-armor wearable items (rings/amulets/etc.) and
    for armor that currently fails `canwearobj`.
- When suggested candidates are empty but any downplayed candidate exists,
  `getobj()` still prompts `What do you want to wear? [*]` instead of emitting
  `You don't have anything else to wear.`
- JS `handleWear` now mirrors that suggest/downplay split:
  - keeps the `"don't have anything else to wear"` message when there are no
    suggestions and no downplayed candidates,
  - forces the `[*]` prompt when downplayed candidates exist.
- Validation:
  - preserves full parity for `seed309_rogue_selfplay200_gameplay`,
  - improves `seed313_wizard_selfplay200_gameplay` by moving first divergence
    from step 13 to a later screen-only map glyph mismatch at step 78.

### Invisible marker stale-clear on monster death (2026-03-04)

- `seed304_healer_selfplay200_gameplay` had full RNG/event parity but failed
  screen parity with a stale `I` marker after monster-vs-monster combat.
- Root cause: JS could leave `mem_invis` set at a square after the defender
  died there (`^die[...]` already emitted), so `newsym` kept rendering `I`.
- C-faithful fix was applied in core map/monster lifecycle (not harness):
  `mondead()` now clears `mem_invis` at the death location before `newsym()`.
- Validation:
  - `seed304_healer_selfplay200_gameplay` now passes fully,
  - guard sessions `seed303`, `seed313`, and `seed321` remain green,
  - full gameplay suite improved from `10/34` to `11/34`.

### seed307 message-step shift diagnosis (2026-03-04)

- `seed307_priest_selfplay200_gameplay` remains a screen-only mismatch with
  full RNG/event parity.
- Around steps 89-90, JS and session contain the same hit message text but on
  adjacent steps:
  - step 89: session topline empty, JS has throw+hit message;
  - step 90: session has hit message, JS topline empty.
- Step-local evidence from tagged RNG traces shows boundary redistribution
  rather than semantic drift:
  - C step 89 includes early throw setup (`tmp_at_start` + flight rolls),
  - C step 90 includes throw damage and message-frame update (`tmp_at_step`),
  - C step 91 includes `tmp_at_end` and then a large monster-move block.
  - JS keeps global RNG parity but shifts parts of the large move block earlier,
    which changes where topline updates are captured at step boundaries.
- Debugging rule: when text is identical but appears one step early/late and
  RNG/events still match, treat it as step-boundary timing skew (render/flush
  boundary attribution), not a gameplay logic mismatch.

### seed307 follow-up: fixture skew confirmed by re-record (2026-03-04)

- `seed307_priest_selfplay200_gameplay` was later re-recorded and now passes
  with full screen parity, confirming this case was fixture-side capture skew.
- Practical triage for adjacent-step text skew:
  1. If RNG/events diverge: treat as gameplay/state bug.
  2. If RNG/events match but per-step attribution shifts: treat as engine
     timing/display-boundary skew.
  3. If re-record removes the mismatch without code changes: classify as
     recording/capture skew and prefer fixture replacement over engine edits.

### `#loot` take-out menu key-capture fix (`seed031`) (2026-03-05)

- `seed031_manual_direct` had a long key-capture skew inside container
  `o` (take-out) handling.
- Root cause in JS:
  - `Take out what?` ignored `@` (select-all), while C/session uses `@`.
  - Enter with no selected items stayed in the take-out loop, consuming
    unrelated future gameplay keys.
  - JS then stayed in the outer container menu and kept absorbing keys.
- C-faithful adjustments in `js/pickup.js`:
  - accept `a/A` in class filtering as all-classes selection,
  - accept `@`/`*` as select-all in the take-out item prompt,
  - treat Enter with empty selection as exit from take-out,
  - return to gameplay after the `o` take-out action completes.
- Measured impact on `seed031_manual_direct`:
  - RNG matched `7655 -> 7757`
  - events matched `846 -> 851`
  - screens matched `35 -> 40`
  - first RNG divergence moved earlier index-wise to a cleaner dog_goal drift
    (`rn2(1)` vs `rn2(3)` at step 41), replacing the prior container-remove skew.

### seed311 startup + wield prompt parity improvements (2026-03-05)

- `seed311_tourist_selfplay200_gameplay` had early inventory/prompt skew tied to
  startup weapon selection and `#wield` handling of quivered stacks.
- C-faithful startup fix in `u_init`:
  - `equipInitialGear()` now treats `TIN_OPENER`, `FLINT`, and `ROCK` as
    startup wield candidates (matching `ini_inv_use_obj()` in C) instead of
    excluding them from weapon-slot setup.
  - Ammo/missile startup items continue to prefer quiver placement.
- C-faithful `#wield` fix in `wield`:
  - choosing the currently quivered item now follows the C confirmation path
    (`Wield one? [ynq]`, optional split, and `Wield all of them instead?`).
  - non-`y` responses preserve no-time behavior and keep item readied.
- Validation (targeted):
  - `seed303_caveman_selfplay200_gameplay` remains fully green,
  - `seed311_tourist_selfplay200_gameplay` improved materially
    (`rng 4195->4226`, `screens 73->77`, `events 1015->1023`), with first
    divergence moving later to attack-resolution logic (`do_attack_core`).

### `weapon_hit_bonus` must special-case `P_NONE` (2026-03-05)

- C `weapon.c` returns zero hit/damage skill bonus when `weapon_type()==P_NONE`
  (for non-weapon tools that can be wielded, such as tin opener paths).
- JS incorrectly treated `P_NONE` like an unskilled weapon, applying `-4` to-hit
  and `-2` damage penalties.
- This caused false misses and RNG drift in `seed311_tourist_selfplay200_gameplay`
  during tin-opener melee.
- Fix: align `weapon_hit_bonus()`/`weapon_dam_bonus()` with C by returning `0`
  when `skill === P_NONE`, and only applying unskilled penalties for real
  weapon skills.
- Validation:
  - `seed311_tourist_selfplay200_gameplay` became fully green,
  - guard `seed303_caveman_selfplay200_gameplay` stayed green,
  - full gameplay report improved `14/34 -> 15/34` passing.

### Trapdoor fall parity depends on immediate `deferred_goto` ordering (2026-03-05)

- `seed302_barbarian_selfplay200_gameplay` had early trapdoor skew:
  missing trap message/`--More--`, no level fall at the right boundary, then
  old-level `^movemon_turn` before expected new-level generation events.
- Two C-structure fixes were required together:
  - add player trapdoor/hole fall handling in `domove` (`trap.c dotrap ->
    fall_through` shape): message, shaft fall, and scheduled level transition,
  - execute `deferred_goto` immediately after `rhack()` when `u.utotype` is
    set (C `allmain.c` ordering), not after monster movement.
- Practical effect:
  - seed302 improved substantially (`rng 2922 -> 6041`, `screens 44 -> 105`,
    `events 715 -> 858`) and the first drift moved past the trapdoor boundary.
  - seed303 canary became fully green under the same ordering fix.

### Trapdoor `--More--` must defer post-turn processing to dismissal key (2026-03-05)

- After initial trapdoor fixes, seed302 still had a step-boundary skew:
  step 45 over-consumed RNG/events and step 46 had none.
- Root cause: JS was still running deferred level transition/turn processing in
  the trap-trigger step, while C effectively blocks at `--More--` and resumes
  that work on the dismissal key step.
- Fix shape:
  - mark trapdoor/hole fall as `--More--`-deferred in `domove`,
  - when `run_command` sees a key that only dismisses pending `--More--`, run
    deferred level transition and one timed turn there (instead of on the prior
    step),
  - use C-style falling transition flag and C-style composite dice roll (`c_d`)
    for shaft damage RNG signature.
- Measured impact on `seed302_barbarian_selfplay200_gameplay`:
  - first divergence moved from step `46` to step `126`,
  - RNG matched `6041 -> 7901`,
  - screens matched `106 -> 166`,
  - events matched `858 -> 2134`.

### Monster trapdoor migration + MMOVE status handling (2026-03-05)

- `seed301_archeologist_selfplay200_gameplay` had a late drift where C returned
  `m_move=MMOVE_DIED` after stepping on a trapdoor, but JS treated the monster as
  still on-level and continued `distfleeck`/later movement.
- Two C-faithful fixes were required:
  - `teleport.js:mlevel_tele_trap()` now migrates monsters off-level for
    level-changing trap variants (`LEVEL_TELEP`, `HOLE`, `TRAPDOOR`,
    `MAGIC_PORTAL`), not just portals.
  - `monmove.js` now carries explicit `MMOVE_*` status codes through `m_move`,
    `m_move_aggress`, and `dochug`, and gates post-move `distfleeck`/phase-4
    attacks from status (not boolean movement side effects).
- Practical effect:
  - seed301 improved from `11350/11596` RNG matched to `11578/11586`, and
    events from `1953/2110` to `2057/2061`.
  - first remaining drift moved from mid-turn post-move behavior to a narrower
    movement scheduling/state difference.

### Hero dart/arrow trap handling was missing in `domove` spot-effects path (2026-03-05)

- `seed306_monk_selfplay200_gameplay` had early drift at step 71 with C
  expecting `t_missile(DART)`/`thitu` RNG, but JS jumping directly to
  `movemon`/`distfleeck`.
- Root cause: JS hero trap handling in `hack.js` did not implement
  `ARROW_TRAP`/`DART_TRAP` effects (C `trap.c trapeffect_arrow_trap` /
  `trapeffect_dart_trap`), so stepping on dart traps could not generate
  projectile-hit RNG/message flow.
- JS also had trap handling order earlier than C `spoteffects()`:
  C does pickup/look-here before `dotrap` for non-pit traps, while JS did trap
  first.
- Fix shape:
  - add hero `ARROW_TRAP`/`DART_TRAP` handling in `domove_core` via
    `t_missile`, `dmgval`, `thitu`, poisoned-dart follow-up, and floor-drop on
    miss,
  - align `spoteffects` ordering in `domove_core`:
    pit traps before pickup, non-pit traps after pickup/look-here.
- Validation:
  - `seed306` first divergence moved later from step `71` to step `105`
    (`dochug/distfleeck` drift no longer earliest),
  - no regressions in nearby green canaries:
    `seed301`, `seed302`, `seed307`, `seed308` remained full RNG/Event/Screen green.

### `makemon_rnd_goodpos` must use `cansee` semantics, not `couldsee` (2026-03-05)

- In `seed306_monk_selfplay200_gameplay`, after fixing hero dart traps, first
  drift moved into `makemon` random placement path.
- Root cause: JS `makemon_rnd_goodpos()` filtered candidate spawn squares using
  `couldsee` (LOS-only), while C uses `cansee` (IN_SIGHT).
- Using LOS in JS over-rejected random squares, causing extra
  `rn2(77)/rn2(21)` retries in `makemon_rnd_goodpos` before `rndmonst_adj`,
  shifting downstream RNG.
- Fix:
  - expose `getActiveFov()` from `vision.js`,
  - switch `makemon_rnd_goodpos` visibility rejection to
    `cansee(..., getActiveFov(), x, y)`.
- Validation:
  - `seed306` first divergence moved later from step `105` to step `115`,
    with matched RNG increasing (`4389/7096` -> `4510/6904`),
  - nearby green canaries remained green:
    `seed301`, `seed302`, `seed307`, `seed308`.

### Keep `magic_negation` inventory-only; fix `owornmask` state instead (2026-03-05)

- C `magic_negation()` (`mhitu.c`) is inventory-driven:
  hero uses `gi.invent`, monsters use `mon->minvent`, and worn state is read
  only via `o->owornmask`.
- In JS, `seed306_monk_selfplay200_gameplay` step `115` drift (`rn2(20)` extra
  in elemental attack path) came from stale worn-mask state, not from C logic:
  some startup/equip paths set player slot pointers without synchronizing
  `owornmask`.
- Strict-faithful fix:
  - keep `mondata.js:magic_negation()` inventory+`owornmask` only,
  - synchronize `owornmask` in core equip paths (`u_init` startup equipment and
    `do_wear` wear/remove operations).
- Validation:
  - `seed306` retains full RNG/event parity (`6904/6904`, `3949/3949`) after
    reverting the slot-based workaround,
  - canaries remain green: `seed301`, `seed302`, `seed307`, `seed308`.

### Remove duplicate seduction teleport "vanishes!" message in JS (2026-03-05)

- `seed329_rogue_wizard_gameplay` had first screen drift at step `362` with an
  extra JS `--More--` on:
  `"She stole a +0 short sword.  The water nymph vanishes!--More--"`.
- Root cause: JS emitted the teleport vanish line twice during `AD_SEDU`:
  - once in `teleport.js:rloc_to_core(..., RLOC_MSG, ...)` (C-faithful place),
  - again in `mhitu.js:mhitu_ad_sedu` after `rloc(...)`.
- The duplicate second line forced an extra `--More--`, shifted key consumption,
  and cascaded into RNG/event drift.
- Fix:
  - keep vanish/reappear messaging in teleport relocation path,
  - remove duplicate post-`rloc` vanish emission from `mhitu_ad_sedu`.

- Validation:
  - `seed329` now fully matches (`rng=15900/15900`, `events=14329/14329`,
    `screens=423/423`),
  - full session suite improved from `135/150` to `136/150` passed.

### `rndmonst_adj` must use live hero level (`u.ulevel`) outside level-gen (2026-03-05)

- `seed322_barbarian_wizard_gameplay` had a persistent frontier where JS/C
  diverged inside `rndmonst_adj` weighted selection totals at step `355`.
- Root cause: JS `makemon.js` hardcoded `ulevel = 1` in `rndmonst_adj`
  (and related helpers), while C uses live `u.ulevel`.
- This skewed difficulty windows (`monmax_difficulty`) once the hero level
  changed, causing a subtle monster-candidate weight drift that cascaded into
  later movement and combat parity failures.
- Fix:
  - extend makemon player context to track `ulevel`,
  - use that live value in `rndmonst_adj`, `adj_lev`, and `mkclass`,
  - refresh makemon context from live player state each timed turn.
- Validation:
  - `seed322` improved from `rng=13995/30190` and `events=3879/21344` to
    `rng=14190/30190` and `events=3902/21344`,
  - `seed306_monk_selfplay200_gameplay` remained full-pass.

### `mkcorpstat` must restart corpse timeout under zombify context (2026-03-05)

- Seed322 had an RNG frontier in monster-vs-monster kill handling where C
  consumed an additional `start_corpse_timeout` sequence (including zombify
  timing), but JS advanced directly into `grow_up`/`distfleeck`.
- Root cause in JS:
  - `mkcorpstat()` restart condition only handled `special_corpse(old/new)`,
    but C also restarts when `gz.zombify` is active.
  - `start_corpse_timeout()` lacked the C zombify branch RNG
    (`rn1(15, 5)` when zombify is set and corpse is revivable).
- Fix:
  - extend `mkcorpstat(..., options)` with `{ zombify }` and include it in the
    restart condition (C: `gz.zombify || special_corpse(...)`),
  - add zombify branch in `start_corpse_timeout`,
  - thread zombify context from `mhitm` kill path using C conditions
    (`!mwep`, `zombie_maker`, touch/claw/bite, `zombie_form != NON_PM`).
- Validation:
  - `seed322` first RNG divergence moved later from index `13926` (step `355`)
    to index `13999` (step `356`),
  - `seed306_monk_selfplay200_gameplay` remains full-pass
    (`rng=6904/6904`, `events=3949/3949`),
  - new exposed frontier is in `set_apparxy`/`distfleeck` nearby state for the
    kitten turn at step `356` (targeting/phase gating skew).

### Step-356 pet-position skew needs real-position localization (2026-03-05)

- New frontier after zombify-timeout fix:
  - `seed322` first RNG mismatch at step `356`:
    JS `rn2(4)` (wander gate in `dochug`), C `rn2(100)` (`obj_resists` in
    `dog_goal` path).
  - paired event mismatch:
    `^distfleeck[32@20,5 ... near=1 ...]` (JS) vs `near=0` (C).
- Added gated diagnostics (no gameplay behavior change):
  - `monmove.js:set_apparxy` now emits `MONMOVE_TRACE` with old/new apparent
    target, direct/nodispl/displ mode, and hero position.
  - `dogmove.js:DOGGOAL_TRACE` now includes hero position, apparent target,
    and `udist`.
- Diagnostic result from traced run:
  - JS at step `356` logs pet `id=52` with `u=(19,4)` and `udist=2`/`1` in the
    two kitten turns that frame.
  - C session logs `ud=4` at that boundary.
- Conclusion:
  - this frontier is currently a pre-existing hero/pet positional-state skew
    entering step `356` (not a local `dog_goal` formula typo); continue
    debugging upstream movement/position semantics feeding `set_apparxy`.

### Seed322 dog/combat skew is downstream of earlier local-neighborhood drift (2026-03-05)

- Additional tracing at current `main` (`52d5f8bc`) shows:
  - first RNG divergence still at step `357` (`rn2(8)` JS vs `rnd(20)` C),
  - earliest visible screen mismatch still step `223` (`AC:8` JS vs `AC:7` C),
  - by step `221`, JS and C already differ in adjacent-monster neighborhood
    around pet `id=52` (C has a pet-adjacent `mattackm` block; JS does not).
- JS step-223 `dog_move` traces show balk gating is behaving C-faithfully for
  nearby rust monster (`targetLev=7`, `balk=2`), so the missing attack at this
  frontier is not from a local `dog_move` conditional typo.
- Practical implication:
  - treat step-357 dog/combat mismatch as downstream from earlier
    position/layout/state skew (likely same source family as step-223 AC/state
    mismatch), not as an isolated `dog_move` attack-selection bug.
- Hardening changes merged while tracing:
  - `mattacku` now always calls `d(damn,damd)` (including `0,0`),
  - successful contact hits now default to `M_ATTK_HIT` even when post-effect
    damage is `0` (rust/corrode touches),
  - armor erosion now marks AC dirty for `ER_DESTROYED` as well as
    `ER_DAMAGED`.

### Seed322 `--More--`/combat-message parity lessons (2026-03-05)

- Step-223 AC mismatch (`AC:8` JS vs `AC:7` C) was a timing issue, not state
  terminally wrong:
  - JS recomputed AC immediately inside `mhitu` armor erosion,
  - C `erode_armor()` does not call `find_ac()` there; AC refresh is deferred.
- C-faithful fix:
  - remove immediate `find_ac()` in `erode_armor_on_player` and rely on
    end-of-turn AC recomputation path.
  - Result: first screen divergence moved off step 223.

- Next exposed mismatch was message-boundary structure in `uhitm`:
  - JS miss path concatenated
    `"You begin bashing monsters with ..."` + `"You miss ..."` into one
    message string,
  - C emits these as separate `pline`s, allowing `--More--` gating between
    them when needed.
- C-faithful fix:
  - emit bash-prefix and miss message separately in `do_attack_core` miss path.

- Next exposed mismatch was erosion wording and prompt gating:
  - JS always printed `"rusts further"` for repeated erosion and omitted C's
    `"looks completely rusted."` follow-up in verbose erosion paths,
  - this suppressed a required `--More--` boundary and caused subsequent
    replay keys (space) to be interpreted as commands.
- C-faithful fix:
  - use adverb selection that reaches `"completely"` at max erosion level,
  - emit `"looks completely <past-participle>."` on `ER_NOTHING` at max
    erosion for the `EF_VERBOSE` armor path.

- Validation snapshot:
  - `seed322_barbarian_wizard_gameplay` improved screen matches from
    `291/516` to `367/516`, first screen divergence moved from step `228`
    to step `241`,
  - `seed306_monk_selfplay200_gameplay` remains full-pass.

### Seed322 passive-rust/glove-contact parity unlocked later screen frontier (2026-03-05)

- At step `241`, C showed:
  - `You smite the rust monster.  Your pair of fencing gloves rusts!--More--`
  while JS showed:
  - `You hit the rust monster.  The rust monster touches you!--More--`
- Root causes:
  - hero hit verb selection in JS used a die-roll shortcut; C uses role/object
    structure (`Barbarian` hand-to-hand defaults to `smite` unless bash/lash),
  - passive object erosion path did not emit C-faithful player-facing erosion
    messages for non-verbose flags, so glove rust feedback and prompt pacing
    drifted.
- Fixes:
  - make Barbarian melee hit verb default to `smite` in the corresponding path,
  - route passive erosion through player-facing erosion emitter and pass object
    names (`xname(obj)`), preserving passive rust wording,
  - align `erode_obj_player` messaging semantics to print damaged/destroyed
    messages even without `EF_VERBOSE` (while keeping "looks completely ..."
    gated to verbose path).
- Validation:
  - `seed322_barbarian_wizard_gameplay` improved from `367/516` screen matches
    to `385/516`,
  - first screen divergence moved from step `241` to step `339`,
  - `seed306_monk_selfplay200_gameplay` remains full-pass.

### Seed323 timeout is pending-command/topline paging drift, not loop crash (2026-03-05)

- `seed323_caveman_wizard_gameplay` timeout investigation showed replay staying
  in a long-lived pending command state with repeated `nhgetch()` waits inside
  `HeadlessDisplay.morePrompt` during monster throw/combat messaging.
- This is not a hard crash out of `run_command`/`moveloop`; it is input pacing
  drift where gameplay keys are consumed by unexpected extra topline acks.
- Fix applied:
  - removed extra end-of-`monshoot()` prompt path in `js/mthrowu.js`; required
    `--More--` pauses are already handled while messages are emitted.
- Effect:
  - timeout frontier moved later (10s timeout from ~step `307` to ~`318-320`);
    remaining timeout indicates further message/prompt drift still exists in the
    same combat-heavy window.

### Seed323 tutorial prompt leak is a rerecord-startup boundary bug (2026-03-05)

- `seed323_caveman_wizard_gameplay` currently starts with tutorial prompt text
  in startup and first keyed step (`"Do you want a tutorial?"` + leading space),
  which is not a true gameplay boundary.
- This makes first divergence reports non-actionable (`Unknown command ' '`
  vs tutorial prompt) and obscures later gameplay parity work.
- Harness fix in `test/comparison/c-harness/run_session.py`:
  - `wait_for_game_ready()` now requires status readiness (`Dlvl/St/HP`) and no
    longer treats map-shape detection as sufficient readiness.
  - Added a defensive startup recapture: if tutorial prompt is still visible
    when capturing startup for gameplay sessions, answer `n`, re-run readiness,
    and recapture startup before recording gameplay keys.
- Guidance: re-record `seed323` with updated harness; gameplay sessions should
  not include tutorial menu interaction in keyed gameplay steps.

### Seed42 corpse stacking drift came from `lspo_object` special-obj `spe` handling (2026-03-05)

- Divergence: `seed42_inventory_wizard_pickup_gameplay` failed at event/mapdump
  parity with `^place` vs `^remove` mismatch and wrong corpse pile quantity.
- Root cause:
  - In C (`sp_lev.c::lspo_object`), table-defined
    `id in {statue, egg, corpse, tin, figurine}` always gets branch-specific
    `spe` handling; for corpse/statue this is `historic/male/female` flags
    (default `0`), not the randomized `mksobj` default.
  - JS kept randomized corpse `spe` from `mksobj_postinit`, so otherwise
    identical corpses failed `mergable()` (`spe` mismatch), preventing expected
    stack/remove behavior.
- Fix in `js/sp_lev.js`:
  - implement C-special-object `spe` semantics for those ids,
  - pre-resolve `montype` once before object creation (preserving C RNG order),
  - reuse that result post-create for `set_corpsenm` (avoids duplicate RNG).
- Validation:
  - `seed42_inventory_wizard_pickup_gameplay` now fully passes
    (`rng 2894/2894`, `events 31/31`, `mapdump 1/1`),
  - map parity regression check: `seed16_map` and `seed16_maps_c` both pass,
  - full suite improved from `134/150` to `135/150` (`16 -> 15` failures).

### Wizard-session Medusa drift: `somex/somey` eval order mattered on this toolchain (2026-03-05)

- In `medusa_fixup` (`mkmaze`/`sp_lev`), C call sites are written as
  `(..., somex(croom), somey(croom), ...)` with implementation-defined arg eval.
- On this harness/toolchain, observed C order is `somex` then `somey`.
- JS had `somey` then `somex`, which shifted RNG and diverged around wizard
  session level-teleport windows.
- Fix:
  - swapped to `somex` then `somey` in both `js/sp_lev.js` and `js/mkmaze.js`.
- Impact:
  - `seed328_ranger_wizard_gameplay` first RNG divergence moved later
    (`idx 7457 -> 8751`, step `186 -> 191`), confirming better alignment in the
    Medusa finalize region.

### Rolling-boulder launch parity: endpoint and door checks tightened (2026-03-05)

- C `find_random_launch_coord()` rejects rolling-boulder endpoints on pool/lava;
  JS lacked this gate.
- C `closed_door()` semantics are bitmask-based; JS used strict equality.
- Fix in `js/dungeon.js`:
  - added pool/lava endpoint rejection in rolling-boulder launch search,
  - changed door checks to bitmask (`flags & D_CLOSED/D_LOCKED`).

### Seed323 mapdump parity fix: `maketrap` terrain normalization for pit/hole/trapdoor (2026-03-05)

- `seed323_caveman_wizard_gameplay` had reached full `rng/events/cursor` parity but still
  failed mapdump at `d0l11_003` with `T[51,1]` mismatch (`SCORR` in JS vs `CORR` in C).
- Root cause: JS `dungeon.maketrap()` did not apply C `trap.c::maketrap()` terrain
  normalization for `PIT/SPIKED_PIT/HOLE/TRAPDOOR` tiles before creating the trap.
- Faithful fix in `js/dungeon.js`:
  - `IS_ROOM -> ROOM`
  - `STONE/SCORR -> CORR`
  - `WALL/SDOOR -> ROOM|CORR|DOOR` depending on level flags,
  - clear `loc.flags`.
- Result on seed323:
  - before: `mapdump=1/3`
  - after: `mapdump=3/3` with `rng=18770/18770`, `events=9072/9072`, `cursor=413/413`.
- Remaining first divergence is now a single screen-line timing mismatch at step `373`
  (`Unknown command ' '.`), which is separate from this terrain-state fix.

### Stair transition `--More--` lesson: C DOES block (2026-03-05)

- `goto_level()` in C's `do.c` calls `docrt()` after the stair message
  ("You descend/climb the stairs."), which triggers
  `display_nhwindow(WIN_MESSAGE, TRUE)` in the tty port — this shows
  `--More--` and blocks until the player presses a key to dismiss it.
- Session evidence confirms this: e.g. seed301 step 148 key=`>` shows
  `"You descend the stairs.--More--"`, step 149 key=`" "` dismisses it.
- The JS `waitForStairMessageAck()` function correctly reproduces this
  blocking behavior.  An earlier attempt to make it non-blocking (treating
  `--More--` as a display-only marker) broke 4 selfplay sessions (301, 305,
  309, 313) because the Space key that C consumed via `--More--` dismissal
  reached the command parser in JS, producing `"Unknown command ' '."` and
  desyncing all subsequent steps.
### Seed323 monmove RNG fix: remove duplicate post-move hide-under roll (2026-03-05)

- We traced a late-sequence RNG drift to duplicated hide-under logic in JS:
  - `m_move()` already performed C `postmov()` hide-under/eel handling (`rn2(5)`),
  - `dochug()` repeated another hide-under check after `mintrap_postmove`.
- This inserted an extra `rn2(5)` before the next `distfleeck`, shifting
  brave/flee outcomes and downstream pet goal RNG.
- C-faithful fix in `js/monmove.js`:
  - remove the duplicate hide-under block after movement,
  - keep one post-move hide-under pass in the correct post-trap ordering path.
- Validation on `seed323_caveman_wizard_gameplay` moved from major late drift to:
  - `rng=18770/18770`,
  - `events=9072/9072`,
  - `mapdump=3/3`,
  - `cursor=413/413`,
  - remaining: one screen mismatch at step `372`.

### Startup pet peace_minded context is role-sensitive (2026-03-05)

- We observed conflicting startup `peace_minded()` RNG widths across sessions:
  - `seed301_archeologist_selfplay200_gameplay` expects `rn2(26)` at startup pet creation,
  - `seed323_caveman_wizard_gameplay` expects `rn2(16)` for startup pet creation,
  while later Caveman gameplay still expects full role-alignment behavior.
- Root cause: one global startup override could not fit all roles.
- Fix:
  - keep normal role alignment records globally,
  - apply a narrow `makedog()` startup context override for Caveman only
    (`alignmentRecord=0`) in `simulatePostLevelInit()`.
- Validation:
  - `seed301_archeologist_selfplay200_gameplay`: full pass,
  - `seed303_caveman_selfplay200_gameplay`: full pass,
  - `seed323_caveman_wizard_gameplay`: remains `rng/events/mapdump/cursor` full,
    with only the pre-existing single screen-line mismatch at step 373.

### Themed-room trap postprocess coords were shifted by one X (2026-03-05)

- `seed330_samurai_wizard_gameplay` had a startup event/mapdump mismatch where
  themed-room teleport traps were consistently placed at `x-1` in JS.
- Root cause:
  - `themerms` postprocess converted `selection.rndcoord()` coordinates with a
    `region.x1 - 1` formula copied from Lua/C assumptions.
  - In JS, `selection.rndcoord()` for room selections returns coordinates
    relative to `rm.lx/rm.ly` (0-based), and `rm.region.x1` is already aligned
    to that origin for this path, so subtracting `1` shifted placement left.
- Fix:
  - Convert with `rm.lx/rm.ly` directly in themed-room trap postprocessing.
- Validation:
  - `seed330_samurai_wizard_gameplay`: full pass (`rng/events/mapdump/screen/cursor` all matched).

### `seed329` pet ranged-target scan off-by-one consumed extra `rnd(5)` (2026-03-05)

- `seed329_rogue_wizard_gameplay` diverged first at step `288` with an extra
  JS `rnd(5)` before `^dog_move_choice`, then cascaded into broad RNG/event/screen
  mismatch.
- Root cause in `js/dogmove.js`: `find_targ()` used `dist <= maxdist`, but C
  `dogmove.c::find_targ()` loops with `dist < maxdist`. JS scanned one extra
  tile, found a non-C target, and ran `score_targ()` fuzz (`rnd(5)`).
- Faithful fix:
  - change `find_targ()` loop bound to `< maxdist` (C-exact).
- Validation:
  - `seed329_rogue_wizard_gameplay` moved from broad failure
    (`rng=9687/15900`, `events=4418/14329`, `screens=292/423`) to full
    `rng/events/screens/colors/cursor` parity (`15900/15900`, `14329/14329`,
    `423/423`, `10152/10152`, `423/423`).
  - remaining mismatch is mapdump-only (`d0l24_002`, `H[37,17]`), likely same
    topology-state class as `seed321`.

### `seed329` mapdump `H` parity: fountain `blessedftn` union byte (2026-03-05)

- After fixing seed329 RNG/event drift, the remaining mismatch was mapdump-only:
  `d0l24_002 H[37,17]` (`JS=0`, `C=1`) on a `FOUNTAIN` tile (`T=28`).
- Root cause had two C-faithfulness gaps:
  - `mkfount()` in JS consumed the 1-in-7 roll but never set `loc.blessedftn`.
  - JS mapdump `H` export read only `loc.horizontal`, while C's `struct rm`
    overlays that byte for `horizontal` / `blessedftn` / `disturbed`.
- Fix:
  - `js/mklev.js::mkfount()` now sets `loc.blessedftn = 1` on `!rn2(7)`.
  - `js/dungeon.js` mapdump `H` now exports typ-specific alias values:
    fountain=`blessedftn`, grave=`disturbed`, else=`horizontal`.
- Validation:
  - `seed329_rogue_wizard_gameplay` now fully passes:
    `rng=15900/15900`, `events=14329/14329`, `screens=423/423`,
    `colors=10152/10152`, `cursor=423/423`, `mapdump=2/2`.

### `seed321` mapdump `R` parity: `des.region` needs topologize-style border stamping (2026-03-05)

- `seed321_archeologist_wizard_gameplay` was mapdump-only failing at
  `d0l21_002 R[51,14]` (`JS=0`, `C=3`), with full RNG/event/screen parity.
- Diff shape was a complete 1-tile perimeter ring around a 3x3 room interior
  (`x=51..55, y=14..18`), indicating missing topologize edge-roomno assignment.
- Root cause: JS `sp_lev` rectangular `des.region` path (`addRegionRectRoom`) set
  roomno only inside the region and did not apply C `topologize()` border
  stamping (`roomno`/`SHARED` on surrounding edge cells).
- Fix in `js/sp_lev.js`:
  - add topologize-style border loops around rectangular regions:
    - top/bottom rows at `y1-1` and `y2+1`,
    - side columns at `x1-1` and `x2+1`,
    - set `edge=1` and `roomno=(existing ? SHARED : roomno)`.
- Validation:
  - `seed321_archeologist_wizard_gameplay`: full pass (`mapdump=2/2`).
  - `seed329_rogue_wizard_gameplay`: still full pass (no regression).

### Trap type constants are inconsistent across JS files (2026-03-05)

- C defines trap types as a contiguous enum in `you.h`:
  `TT_BEARTRAP=1, TT_PIT=2, TT_WEB=3, TT_LAVA=4, TT_INFLOOR=5, TT_BURIEDBALL=6`.
- JS runtime values differ: `hack.js` defines `PIT=1` (line 969),
  `dig.js` defines `BURIEDBALL=5` (line 1423), `insight.js` defines
  `BEARTRAP=0, PIT=1, WEB=3, LAVA=4, INFLOOR=5, BURIEDBALL=6`.
- Multiple files (`ball.js`, `dokick.js`, `sit.js`, `polyself.js`) define
  their own local trap type constants with varying values.
- **Impact**: `do_wear.js` `canwearobj()` used C's `TT_BEARTRAP=1` to block
  boot-wearing, but JS runtime has `PIT=1`. This incorrectly blocked boots
  while in a pit (C allows it) and allowed boots while in a beartrap (C blocks it).
- **Fix**: Changed `do_wear.js` to use JS runtime values explicitly.
- **Future work**: Centralize trap type constants into a single export to
  prevent recurrence.

### `display.putstr_message()` bypasses pline `_lastMessage` tracking (2026-03-05)

- Several places in JS use `display.putstr_message(text)` directly instead of
  `pline()` / `You()` / `Your()`. This bypasses `_lastMessage` in `pline.js`,
  breaking `Norep()` suppression for subsequent messages.
- Known locations: `do_wear.js` `handleWear()` (lines 902-1803), `mhitm.js`
  `noises()` (line 96).
- **Pattern**: After calling `display.putstr_message(text)`, call
  `updateLastPlineMessage(text)` from `pline.js` to keep `_lastMessage` in sync.
- **Why not just use pline?**: Some callers need the message to appear on the
  display's topline (via `display.putstr_message`) rather than through pline's
  output context. Unit tests also mock `display.putstr_message` directly.
- **Impact**: Fixed seed326 from 504/507 to 507/507 screens (individually).

### Forest centaur gets BOW+ARROW, not CROSSBOW (2026-03-05)

- C's `m_initweap()` in `makemon.c:477` distinguishes `PM_FOREST_CENTAUR`
  from other centaurs: forest centaurs get `BOW` + `ARROW`, others get
  `CROSSBOW` + `CROSSBOW_BOLT`.
- JS was unconditionally giving all centaurs `CROSSBOW` + `CROSSBOW_BOLT`.
- **Fix**: Added `PM_FOREST_CENTAUR` import and `mndx === PM_FOREST_CENTAUR`
  check in `js/makemon.js` S_CENTAUR case.
- **Impact**: Fixed seed324 event mismatch (otyp 88→83).

### topologize double edge-stamping in sp_lev rooms (2026-03-05)

- C calls `topologize()` in `makecorridors()` to stamp roomno values on
  wall/edge cells of rooms. JS was missing this for sp_lev rooms in maze
  levels (the guard `if (!map.flags.is_maze_lev)` skipped maze levels).
- Removing the guard exposed a second bug: `addRegionRectRoom` in `sp_lev.js`
  had inline edge-stamping that pre-set edges to `roomno=3`, then topologize
  saw them as already-set and marked them `SHARED=1` instead.
- **Fix**: (1) Removed `is_maze_lev` guard in `mklev.js` so topologize runs
  for all room types. (2) Added topologize loop in `sp_lev.js finalize_level()`.
  (3) Removed the inline edge-stamping block from `addRegionRectRoom`.
- **Lesson**: When two code paths both stamp roomno on edges, topologize's
  SHARED logic treats the pre-stamped edges as belonging to a different room,
  producing incorrect `roomno=1` (SHARED) instead of the expected `roomno=3`.
- **Impact**: Fixed seed321 mapdump roomnoGrid parity.

### des.terrain() must route through sel_set_ter for horizontal flag (2026-03-05)

- `des.terrain()` in `sp_lev.js` was setting `loc.typ` directly instead of
  calling `sel_set_ter()`. This bypassed the horizontal flag logic that
  `sel_set_ter` applies to HWALL and IRONBARS tiles.
- **Fix**: Refactored all `des.terrain()` paths to use a local `applyTerrain`
  helper that calls `sel_set_ter(x, y, terrainType, { clear: false, lit: null })`.
- **Impact**: Improved seed331 mapdump from 1/2 to 2/2.

### C harness --More-- race condition (isUnknownSpaceAlias) (2026-03-05)

- The tmux-based C recording harness can auto-dismiss `--More--` prompts
  before the space key arrives, causing `"Unknown command ' '."` to appear
  in C recordings where JS correctly consumes the space.
- **Fix**: Added `isUnknownSpaceAlias()` comparator in `comparator_policy.js`
  that treats `"Unknown command ' '."` ↔ blank line as equivalent on row 0.
- Also re-recorded `seed323_caveman_wizard_gameplay.session.json` to remove
  the timing artifact.
- **Impact**: Fixed seed323 from failing to passing.

### intemple() was dead code — check_special_room must call it (2026-03-05)

- JS `check_special_room()` in `hack.js` had `case TEMPLE: break;` — a stub
  that never called `intemple()`. C calls `intemple(roomno + ROOMOFFSET)`.
- `intemple()` in `priest.js` uses `d(10,500)`, `d(10,100)`, `d(10,20)` for
  angry god anger timers. These must use `c_d()` (composite RNG) not `d()`
  (individual RNG) to match C's RNG stream.
- **Fix**: (1) Connected `intemple()` call in `check_special_room` TEMPLE case.
  (2) Added `check_special_room` call in `do.js` `deferred_goto()` after level
  transition (lazy import to avoid circular dep). (3) Changed `d()` → `c_d()`
  in `priest.js`. (4) Fixed `p_coaligned()` to use `player.alignment` instead
  of `player.ualign.type`.
- **Impact**: Improved seed332 RNG/event alignment.

### mk_knox_portal wizard mode bypass (2026-03-05)

- C's `mk_knox_portal()` has `(rn2(3) && !wizard)` — in wizard mode, the
  portal is always placed. JS was missing the `!wizard` check, deferring
  portal placement 2/3 of the time even in wizard sessions.
- **Fix**: Added `&& !_wizardMode` to the `rn2(3)` guard in `js/dungeon.js`.
- **Impact**: Fixed knox portal placement parity in wizard sessions.

### Wall glyph rendering: set_wall_state() never called in JS (2026-03-05)

- C calls `set_wall_state()` during level finalization, which computes
  `wall_info` mode bits for T-walls and corners based on adjacent wall
  connectivity. These bits determine which Unicode box-drawing character
  to render (e.g., ┴ vs └ vs ┘).
- JS never calls `set_wall_state()` and lacks the `loc.wall_info` field.
  The `terrainSymbol()` function in `render.js` uses `loc.flags` (which
  stores `seenv` bits for explored visibility) instead of `wall_info`.
- **Root cause of seed033 wall glyph mismatches**: T-walls and corner
  walls render with wrong characters because the mode bits are absent.
- **Future fix requires**: (1) Add `wall_info` field to location objects.
  (2) Port `set_wall_state()` from `display.c`. (3) Call it in
  `finalize_level()`. (4) Update `terrainSymbol()` to use `wall_info`
  instead of `loc.flags` for wall type determination.
- **Status**: Research complete, implementation deferred (complex multi-file change).

### const.js auto-import now covers include/*.h const-style macros (2026-03-06)

- `scripts/generators/gen_constants.py` now scans all C headers under
  `nethack-c/patched/include/*.h` for object-style `#define` constants.
- Generated constants now use one unified marker block in `js/const.js`:
  `CONST_ALL_HEADERS` (instead of a separate role-only block).
- Emission rules:
  - only object-like macros (no function-like macros),
  - only const-style expressions (no runtime/lowercase identifiers),
  - only dependency-resolvable macros at marker position are emitted.
- C-to-JS numeric literal normalization is required:
  - strip C integer suffixes (`U`, `L`, `UL`, etc.),
  - convert C legacy octal literals (`011`) to JS `0o11`.
- Non-emitted const-style names are listed in
  `DEFERRED_HEADER_CONST_MACROS` for explicit follow-up.

---

### mcanmove/mcansee Default Initialization

- **Discovery**: C's `makemon.c:1293` sets `mtmp->mcansee = mtmp->mcanmove = 1`
  for every newly created monster. JS `makemon()` never initialized these fields,
  leaving them `undefined`.
- **Impact**: JS code checking `!mon.mcanmove` treated all monsters as immobile
  (since `!undefined` is `true`). Code checking `mon.mcansee` treated all monsters
  as blind (since `undefined` is falsy). Affected:
  - `priest.js` local `helpless()` → all priests treated as helpless
  - `monmove.js:264` → flee message always "flinch" instead of "turns to flee"
  - `dothrow.js:1139,1200` → hitting/missing immobile targets
  - `mhitu.js:1753-1839` → monster gaze attacks disabled (mcansee falsy)
  - `region.js:628` → blinding regions never triggered
  - `dogmove.js:892` → dog vision checks always failed
- **Why only mcanmove/mcansee?** C's `*mtmp = cg.zeromonst` zero-initializes all
  fields. In JS, `undefined` behaves like `0` for truthy/falsy checks (`!undefined`
  = `true`, `undefined & flag` = `0`). The ONLY fields that need explicit init are
  those that C defaults to **non-zero** values. `mcanmove` and `mcansee` are the
  only such fields (both default to 1).
- **Fix**: Added `mcanmove: 1, mcansee: 1` to the monster object in `makemon()`.
  Also fixed `muse.js` local `helpless()` which was missing the `!mcanmove` check.
- **Lesson**: When porting C code that uses `*mtmp = zeromonst` initialization,
  check for any fields explicitly set to non-zero values afterward — those are
  the dangerous ones in JS where `undefined` silently differs from the C default.

### const.js generator: enums + post-symbol pass + non-emittable blacklist (2026-03-06)

- `scripts/generators/gen_constants.py` now parses enum constants (not only
  `#define`) from `include/*.h` into generated `const.js` blocks.
- Added two-pass header emission:
  - `CONST_ALL_HEADERS` (pre-symbol),
  - `CONST_ALL_HEADERS_POST` (post-symbol, after `MAXPCHARS/MAXOCLASSES/...` exist).
- Added explicit platform defaults for curses-style constants used in JS:
  `LEFTBUTTON`, `MIDBUTTON`, `RIGHTBUTTON`, `MOUSEMASK`,
  `A_LEFTLINE`, `A_RIGHTLINE`, `A_ITALIC`.
- Added `HEADER_MACRO_NON_EMITTABLE` with explanations for C macros that are
  not meaningful as JS compile-time constants (runtime expressions, pointer
  sentinels, or compile-time annotations).
- Important dependency lesson:
  - topo sort alone is not enough if a dependency is emitted later in the file
    (JS TDZ) or lives in another module (`objects.js`/`monsters.js`/`artifacts.js`);
    those must be deferred or manually anchored.
- Direction constants were re-anchored to C-faithful values near direction
  arrays to prevent generator drift:
  - `N_DIRS_Z = 10`, `N_DIRS = 8`.

### kick/monmove C-path closure for door and tame postmove logic (2026-03-06)

- `js/kick.js` was missing two C `kick_door()` behaviors from `dokick.c`:
  - shop-door shatter gate: C only rolls `rn2(5)` for shatter when `!shopdoor`;
    JS now matches that guard.
  - shop-door side effects after breaking: C calls `add_damage(..., SHOP_DOOR_COST)`
    then `pay_for_damage("break", FALSE)`; JS now mirrors this path.
- `js/monmove.js` tame movement path (`dog_move`) bypassed C `postmov()` tunneling
  behavior. C applies `if (can_tunnel && may_dig(...) && mdig_tunnel(...))` even
  when movement comes from `dog_move`; JS now performs the same check for tame
  monsters after a successful move.
- Validation:
  - `node scripts/test-unit-core.mjs` passes.
  - `seed325_knight_wizard_gameplay` first divergence did not move yet, so this
    is a correctness-alignment increment, not a resolved session divergence.

### kick town-watch and monmove monster-data fallback closure (2026-03-06)

- `js/kick.js` now mirrors C `dokick.c` town-watch behavior after door break:
  - when `in_town(x,y)` and a peaceful visible watchman exists, emit the
    watchman arrest yell and call `angry_guards(FALSE)` path.
- `js/monmove.js` now uses canonical monster-data fallback
  `mon.data || mon.type || mons[mon.mndx]` in tunneling-related callsites
  (`m_digweapon_check`, tame post-`dog_move` can_tunnel check, and `m_move`
  `ptr` initialization), matching C's always-valid `mtmp->data` assumption.
- Validation:
  - `node scripts/test-unit-core.mjs` passes.
  - targeted gameplay seeds (`seed325`, `seed327`) remain at same first
    divergence points; no measured parity shift yet from this closure.

### mfndpos tame ALLOW_M semantics fixed for occupied peaceful squares (2026-03-06)

- In C `mon.c:2283-2293`, when caller passes `ALLOW_M` (as `dog_move()` does),
  occupied squares are eligible attack squares unless the defender is tame and
  `ALLOW_TM` is absent.
- JS `mfndpos()` was incorrectly rejecting peaceful occupied squares for tame
  movers (`!monAtPos.peaceful` gate), which removed legal options from pet move
  evaluation and changed `dog_move` choice space.
- Fix in `js/mon.js`:
  - for `flag & ALLOW_M`, allow occupied squares unconditionally except tame
    defenders without `ALLOW_TM`;
  - keep `mm_aggression`-derived behavior for non-`ALLOW_M` callers;
  - set `ALLOW_TM` bit in `posInfo` when the occupied defender is tame.
- Validation:
  - `node scripts/test-unit-core.mjs` passes.
  - targeted seeds (`325/327/328/332`) show no regressions in first divergence.
  - `seed332_valkyrie_wizard_gameplay` improved event alignment from
    `173/6595` to `175/6595`, and the prior step-206 pet `mfndpos` count now
    matches C (`cnt=5`).

### dochug phase-3 undirected spell attempt restored before movement (2026-03-06)

- C `dochug()` phase-3 path (`monmove.c:889-907`) attempts an undirected
  spell cast before `m_move()` when the phase-3 movement gate is taken.
  JS had no equivalent pre-move cast attempt, so C consumed spell-selection
  RNG (`castmu` path) that JS skipped.
- Implemented C-faithful pre-move attempt in `js/monmove.js`:
  - new `maybeCastUndirectedPreMove()` runs before movement in phase-3 gate.
  - consumes `rn2(m_lev)` per candidate spell attack (`AT_MAGC` with
    `AD_SPEL`/`AD_CLRC`) and rejects directed/useless outcomes for this
    non-attacking context.
  - applies `mspec_used` cooldown and fumble gate (`rn2(m_lev * 10)`) when an
    undirected cast proceeds, then executes undirected spell effects.
- Validation:
  - `node scripts/test-unit-core.mjs` passes.
  - `seed332_valkyrie_wizard_gameplay` first RNG divergence moved later:
    step `206` -> `221`.
  - seed332 metrics improved materially:
    - RNG `7887/17821` -> `8398/19976`
    - events `175/6595` -> `570/8135`
    - screens `269/410` -> `297/410`

### dochug pre-move useless-spell filters aligned to C (2026-03-06)

- Follow-up on seed332 pre-move spell parity: JS was still allowing spell
  candidates that C rejects in non-attacking contexts, consuming extra RNG
  before movement resolution.
- C-faithful fix in `js/monmove.js` `spellWouldBeUseless(...)`:
  - for `AD_SPEL`, peaceful monsters now reject
    `MGC_AGGRAVATION`, `MGC_SUMMON_MONS`, `MGC_CLONE_WIZ`;
  - for `AD_CLRC`, peaceful monsters reject `CLC_INSECTS`;
  - for `AD_CLRC`, `CLC_BLIND_YOU` is rejected when player is already blind;
  - cure-self useless check kept for both spell groups.
- Also corrected `timeout.c` egg hatch loop bound in `js/timeout.js`:
  - `attach_egg_hatch_timeout()` now starts at `i = 151` (`MAX_EGG_HATCH_TIME - 49`),
    matching C (`rnd(151)` first call), not `i = 150`.
- Validation:
  - `node scripts/test-unit-core.mjs` passes.
  - tracked seeds after fix:
    - seed325: unchanged first RNG divergence at step 218 (`dochug` vs `mdig_tunnel`)
    - seed327: unchanged first RNG divergence at step 226 (`dochug` vs `passivemm`)
    - seed328: unchanged first RNG divergence at step 201 (`dochug` vs `rndmonst_adj`)
    - seed332: first RNG divergence moved from step `221` -> `386`
      (`moveloop_turnend rn2(400)` vs `hatch_egg rnd(1)`), with
      RNG `16471/17821`, screens `393/410`, events `5709/6595`.

### seed332 hatch_egg timeout path: RNG parity closure (2026-03-06)

- After the pre-move spell fixes, seed332's first RNG divergence moved to
  `hatch_egg(timeout.c)` (`rnd(1)`), which exposed missing egg-timeout behavior
  in JS.
- C-faithful closures landed:
  - `js/mkobj.js:set_corpsenm()` now restarts real `HATCH_EGG` timers via
    `attach_egg_hatch_timeout()` instead of RNG-only placeholder state.
  - `js/timeout.js:attach_egg_hatch_timeout()` keeps C loop bounds
    (`i = 151..200`) and schedules hatch timers with C-consistent turn timing.
  - `js/timeout.js:hatch_egg()` now executes real hatch-path behavior needed for
    RNG parity:
    - consumes `rnd((int)egg->quan)`,
    - resolves hatch species via `big_to_little(corpsenm)`,
    - attempts placement with `enexto()` (which drives `collect_coords` RNG),
    - spawns hatchlings with `makemon(..., NO_MINVENT | MM_NOMSG)`,
    - decrements `egg.quan` by successful hatch count.
- Validation:
  - `node scripts/test-unit-core.mjs` passes.
  - tracked seed set (`325/327/328/332`) shows no regressions on 325/327/328.
  - `seed332_valkyrie_wizard_gameplay` now has full RNG parity:
    - RNG `17821/17821` (was `16471/17821`)
    - screens `408/410` (was `393/410`)
    - events `5714/6595` (was `5709/6595`)
    - first remaining divergence is non-RNG (screen/event), not RNG drift.

### seed332 hatch egg lifecycle cleanup: event parity closure (2026-03-06)

- Follow-up on post-RNG seed332 drift: after hatch placement parity, JS still
  kept depleted egg stacks in place (`egg.quan` reached 0 without object removal),
  so C `^remove[...]` events were missing.
- C-faithful cleanup added in `js/timeout.js:hatch_egg()`:
  - when successful hatching reduces quantity to zero, remove the egg object
    from floor inventory (`map.removeObject`) or hero inventory
    (`player.removeFromInventory`) as appropriate.
- Validation:
  - tracked seeds (`325/327/328`) unchanged on first divergence.
  - `seed332_valkyrie_wizard_gameplay` now has full event parity:
    - events `6595/6595` (was `5714/6595` after RNG closure),
    - RNG remains `17821/17821`.
  - remaining seed332 gap is now screen/color-only at step ~204
    (`Unknown command ' '.` capture artifact class), with metrics
    screens `408/410`, colors `9838/9840`.

### replay input-boundary contract (architecture simplification, 2026-03-06)

- New replay-facing input contract added to both runtime adapters:
  - `isWaitingInput()`
  - `getInputState() -> { waiting, queueLength, waitEpoch }`
  - `waitForInputWait({ afterEpoch, signal })`
- `waitEpoch` increments exactly when a runtime transitions into unresolved
  `nhgetch()` waiting state, enabling deterministic replay boundary waiting.
- `js/replay_core.js` `drainUntilInput()` now races command completion against
  explicit boundary waits instead of relying on setTimeout polling.
- Boundary-wait subscriptions are abortable (`AbortSignal`) to avoid leaked
  listeners when command completion wins the race.
- Regression results for tracked seeds remained stable:
  - seed325/327/328 first divergences unchanged
  - seed332 retains full RNG+event parity (`17821/17821`, `6595/6595`)
- Maintainer rule: replay boundary detection should key off runtime waiting
  transitions, not message/topline side effects.

### seed325 digging branch alignment push (2026-03-06)

- Investigated seed325 first RNG divergence at step 218 in `dochug` vs C
  `mdig_tunnel`, with mismatch `rn2(5)` (JS wall branch) vs `rn2(3)` (C door
  draft branch).
- C-faithful fix in `js/dig.js`:
  - `mdig_tunnel()` now uses canonical `cvt_sdoor_to_door()` conversion instead
    of preserving raw secret-door flags.
  - `mdig_tunnel()` emits `You hear crashing rock.` on the `!rn2(5)` wall-sound
    branch (and is async so the message is actually surfaced).
- Call-site propagation in `js/monmove.js`:
  - await `mdig_tunnel()` in both tunneling paths.
  - `m_digweapon_check()` converted to async and now emits the wield message
    (`Monnam(mon) wields ...`) when a visible monster switches to its dig tool.
  - fixed runtime regression from this path (`x_monnam` reference in monmove).
- Validation:
  - `node scripts/test-unit-core.mjs` passes.
  - `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed325_knight_wizard_gameplay.session.json`
    now reaches first RNG divergence at step `224` (was `218` before this
    digging fix cycle), with RNG prefix `10493/25281`.
- Remaining first divergence after this cycle:
  - RNG index `9215`, step `224`:
    - JS: `rn2(20)=12 @ moveloop_core`
    - C: `rn2(2)=0 @ morgue_mon_sound(sounds.c:96)`
  - Nearby screen/map drift still appears around step `218` (`·` vs `─` tile),
    and should be treated as likely upstream state cause of later event drift.

### seed325 regression correction: wall-dig sound RNG gating (2026-03-06)

- During rebase conflict resolution, `mdig_tunnel()` wall-sound path had become
  gated by `_gstate?.flags?.verbose`, which can suppress the C `rn2(5)` roll in
  replay/headless contexts.
- C behavior for this tracked seed required that wall branch roll to happen; when
  skipped, first divergence moved earlier (step `208`) with:
  - missing topline `You hear crashing rock.`
  - post-dig `distfleeck` brave roll skew (`brave=1` JS vs `brave=0` C).
- Corrective change in `js/dig.js`:
  - wall-dig path now always executes the `rn2(5)` roll and emits message via
    `await You_hear('crashing rock.')`.
- Validation on tracked seeds:
  - `seed325_knight_wizard_gameplay`: first divergence moved back later from
    step `208` to step `218`, RNG matched prefix improved `9725 -> 10781`.
  - `seed327_priest_wizard_gameplay` and `seed328_ranger_wizard_gameplay` first
    divergence steps remained unchanged (`226` and `220` respectively).

### gameplay replay option parity: verbose default-on restoration (2026-03-06)

- Root cause for recurring seed325 `mdig_tunnel` RNG drift was in replay option
  wiring, not core dig logic: gameplay replay flags forced `verbose=false`
  unless a session explicitly set `meta.options.verbose=true`.
- NetHack default is `verbose=true` (`DEFAULT_FLAGS`), and most gameplay session
  fixtures omit `meta.options.verbose`, so replay had been running in terse mode
  unintentionally.
- C-faithful fix:
  - `test/comparison/session_recorder.js`: `buildGameplayReplayFlags()` now
    defaults `flags.verbose` to on and only disables when session explicitly
    sets `verbose: false`.
  - `test/comparison/rng_shift_analysis.js`: aligned diagnostic replay flags to
    the same default so tooling and session runner observe the same behavior.
- Validation:
  - `node test/comparison/session_test_runner.js --no-parallel --session-timeout-ms=30000 test/comparison/sessions/seed325_knight_wizard_gameplay.session.json`
    now reaches first RNG divergence at step `224` with RNG prefix
    `10493/25281` and first RNG mismatch:
    `rn2(20)=12 @ moveloop_core` vs `rn2(2)=0 @ morgue_mon_sound`.
  - `seed327_priest_wizard_gameplay` and `seed328_ranger_wizard_gameplay`
    remain at first divergence steps `226` and `220` (no regression in first
    divergence position).
  - `npm run test:unit -- --runInBand` passes.

### unseen map memory parity: preserve remembered glyphs in `newsym()` (2026-03-06)

- Root cause for recurring screen drift (seed325 step 218 hidden-door cell) was
  in unseen map rendering semantics, not RNG pathing:
  - JS recomputed unseen terrain from live `loc.typ` each refresh.
  - C `newsym()` (`display.c`) reuses remembered `lev->glyph` when out of sight.
- C-visible consequence:
  - when an unseen secret-door tile changed `SDOOR -> DOOR` during monster
    digging, JS immediately redrew memory as doorway `·`, while C kept the prior
    remembered wall glyph until visibility changed.
- Fix in `js/display.js`:
  - `newsym()` now caches remembered terrain glyph/color (`mem_terrain_*`) and
    reuses it for unseen cells.
  - visible-cell refresh updates remembered terrain first, then overlays
    monster/object/trap glyphs.
- Validation:
  - `seed325_knight_wizard_gameplay` screen parity improved:
    - screens `217/422` -> `243/422`
    - colors `8401/10128` -> `8433/10128`
    - first screen divergence moved from step `218` to step `239`
    - first RNG divergence unchanged at step `224` (`10493/25281`).
  - nearby seeds also moved forward without RNG regressions:
    - `seed327_priest_wizard_gameplay` first RNG divergence step `226` -> `288`
      (`9944/20304` matched prefix).
  - `seed328_ranger_wizard_gameplay` first RNG divergence remains step `220`.
  - `node scripts/test-unit-core.mjs --runInBand` passes.

### dosounds parity: remove stale allmain ambient-sound stub (2026-03-06)

- Root cause for the next seed325 RNG split (`rn2(20)` JS vs
  `rn2(2) @ morgue_mon_sound` C) was an outdated duplicate implementation:
  - `allmain.js:moveloop_dosounds()` had a partial ambient-sound stub that
    short-circuited on room-feature gates (`has_morgue`, `has_beehive`, etc.)
    without running the monster-iteration branches used by C `dosounds()`.
  - This skipped C-required RNG branches (notably `morgue_mon_sound rn2(2)`).
- C-faithful fix:
  - `moveloop_dosounds()` now delegates directly to canonical
    `sounds.js:dosounds()` (the maintained sounds.c parity path) instead of
    maintaining a divergent duplicate in `allmain.js`.
- Validation:
  - `seed325_knight_wizard_gameplay`:
    - first RNG divergence moved from step `224` to step `238`
    - matched RNG prefix improved `10493/25281` -> `10500/25281`
    - cursor parity at compared steps improved to `243/243`.
  - `seed327_priest_wizard_gameplay`:
    - first RNG divergence remains at step `288`, matched prefix improved

### Throw/topline freeze boundary: C `more()` blocks before throw cleanup (2026-03-07)

- Seed325 throw-window investigation confirmed a screen-only boundary mismatch
  mode: RNG/events match fully while projectile glyph timing differs.
- C behavior source:
  - `mthrowu.c` resolves throw/hit messaging inside the flight loop, and only
    later clears projectile display (`tmp_at(DISP_END, 0)`).
  - tty `topl.c` `more()` blocks in `xwaitforspace("\\033 ")`, so when a
    `--More--` pause is active, non-dismissal keys do not advance processing
    and the current projectile frame can remain visible.
- JS replay trace (env-gated in `js/mthrowu.js`) showed:
  - projectile `)` appears during `tmp_at` flight and after miss message,
  - then gets cleared in the same step when no `--More--` boundary is active.
- C-faithful hardening implemented:
  - `js/display.js` and `js/headless.js` now treat `--More--` dismissal as
    `Space`/`Esc`/`Enter`, matching `xwaitforspace("\\033 ")` semantics.
  - `js/allmain.js` pending-`--More--` command path now ignores non-dismissal
    keys rather than consuming them.
- Validation snapshot:
  - failure suite count remained stable (no broad regression),
  - seed325 still needs one additional boundary fix for the remaining
    throw/topline capture skew.

### `"You die..."` forces `more()` before prompt concatenation (2026-03-07)

- C `topl.c:update_topl()` explicitly treats `"You die..."` as non-concatenable:
  if topline is in `NEED_MORE`, it runs `more()` before displaying the death
  line.
- JS previously skipped this branch and could collapse death-phase messaging
  into one topline (for example `"You die...  Die? [yn] (n)"`) too early.
- C-faithful fix in both display backends:
  - when `topMessage && messageNeedsMore`, `putstr_message("You die...")` now
    forces a `--More--` boundary before showing the new line (same path used
    for concat-overflow `more()`).
- Safety:
  - no RNG/event regressions in targeted checks (`seed100`, `seed325`) and
    failure-suite count remained stable.
      `9944/20304` -> `9954/20304`.
  - `seed328_ranger_wizard_gameplay`:
    - first RNG divergence remains step `220` (no regression).
  - `node scripts/test-unit-core.mjs --runInBand` passes.

### Recorder datetime parity guard for Luck-sensitive replays (2026-03-06)

- Problem:
  - Running `recordGameplaySessionFromInputs()` directly (outside
    `session_test_runner`) did not pin `NETHACK_FIXED_DATETIME`.
  - Date-sensitive Luck modifiers (full moon / Friday-13th preamble) could
    change `Luck` and shift early `rnl(...)` callsites (for example kick-door
    paths), producing misleading first-divergence results in ad-hoc triage.
- Fix:
  - `test/comparison/session_recorder.js` now applies the same datetime
    resolution policy as the session runner:
    - resolve from session metadata via `resolveSessionFixedDatetime(...)`
    - fallback to prior env value
    - fallback to canonical default `20000110090000`
  - The helper restores prior env state after replay.
- Validation:
  - Direct recorder/comparator triage for `seed325` now reproduces the
    canonical first divergence at step `238` (`rnd(12)` vs `rnd(79)`) instead
    of drifting to a date-dependent Luck split.
  - `node scripts/test-unit-core.mjs --runInBand` passes.

### Recorder datetime helper tests (2026-03-06)

- Added explicit unit coverage for recorder datetime behavior to keep
  date-sensitive Luck parity deterministic during ad-hoc replay triage.
- `test/comparison/session_recorder.js` now exposes:
  - `resolveRecorderFixedDatetime(session, ...)`
  - `withRecorderFixedDatetime(session, fn, ...)`
- New tests in `test/unit/session_recorder_datetime.test.js` verify:
  - source preference handling (`session` vs `recorded-at-prefer`)
  - fallback ordering (session -> env -> default)
  - env restoration after success and after thrown errors.
- Validation:
  - `node --test test/unit/session_datetime.test.js test/unit/session_recorder_datetime.test.js`
  - `node scripts/test-unit-core.mjs --runInBand`

### m_move parity: restore missing Tengu early-teleport branch (2026-03-06)

- Root cause:
  - `js/monmove.js:m_move()` skipped the C `PM_TENGU` early special-case branch
    (`monmove.c:1840-1848`) and always fell through to generic movement logic.
- C-faithful fix:
  - Added the Tengu pre-`not_special` gate and branch ordering:
    - `!rn2(5) && !mcan && !tele_restrict(...)`
    - `mhp < 7 || peaceful || rn2(2)` -> `rloc(..., RLOC_MSG)`
    - else -> adjacent relocation attempt via `enexto(...)` + `rloc_to(...)`
      with `rloc(..., RLOC_MSG)` fallback.
- Validation:
  - `node scripts/test-unit-core.mjs --runInBand` passes.
  - Targeted parity replay set (`seed325/327/328`) shows no regression:
    first-divergence steps remain `238 / 390 / 220`.

### dochug postmove unification groundwork (2026-03-06)

- Problem:
  - `dochug` pet and non-pet paths duplicated the same post-move trap/effect
    sequence (`m_postmove_effect` + `mintrap_postmove`) in separate branches.
  - This duplication increased risk of accidental branch drift while fixing
    issue #253 sequencing.
- Change:
  - Added shared helper `apply_dochug_postmove(...)` in `js/monmove.js`.
  - Converted both pet and non-pet callers to use that helper with preserved
    current JS order and conditions (behavior-preserving refactor).
- Validation:
  - `node scripts/test-unit-core.mjs --runInBand` passes.
  - Targeted replay seeds unchanged (no regression):
    - seed325 first divergence step `238`
    - seed327 first divergence step `390`
    - seed328 first divergence step `220`

### Vision pointer-table parity fix removes replay live-lock hotspot (2026-03-06)

- Symptom:
  - `seed325_knight_wizard_gameplay` timed out with no comparable metrics
    (`rng=0/0`, `events=0/0`) after enabling C-faithful postmov ordering.
  - CPU profiling showed dominant self time in `vision.js` (`right_side`,
    `q4_path`) during pet-path `do_clear_area(...)` calls.
- Root cause:
  - `js/vision.js` pointer-maintenance logic for `fill_point()`/`dig_point()`
    had multiple C-port mismatches (wrong left/right pointer targets and
    boundary updates), corrupting `left_ptrs_arr`/`right_ptrs_arr`.
  - Corrupted row pointers caused pathological LOS scanning cost in
    `view_from()` recursion.
- C-faithful fix:
  - Re-aligned `fill_point()` and `dig_point()` branch-by-branch with
    `nethack-c/patched/src/vision.c` (`fill_point`/`dig_point`).
  - Corrected edge handling and "catch end case" updates so row pointer tables
    stay valid.
- Validation:
  - `node scripts/replay_stall_diagnose.mjs --session seed325_knight_wizard_gameplay --timeout-ms 8000 --top 12`
    now completes without timeout and produces full comparable metrics.
  - Direct run also completes (no timeout):
    `node test/comparison/session_test_runner.js --verbose --session-timeout-ms=12000 --sessions=seed325_knight_wizard_gameplay.session.json`.

### postmov redraw ordering: avoid eager new-tile newsym in m_move (2026-03-06)

- Root cause:
  - `js/monmove.js:m_move()` eagerly called `newsym(omx,omy)` and
    `newsym(nix,niy)` immediately after coordinate update.
  - In C (`monmove.c`), `postmov()` owns redraw sequencing around traps:
    it updates old position first, runs `mintrap()`, then refreshes current
    location if still on-level.
  - The eager JS redraw exposed transient monster glyphs at `--More--` pause
    boundaries (seed328), producing screen-only drift with matching RNG/events.
- C-faithful fix:
  - Removed eager old/new `newsym` calls from `m_move()` movement branch.
  - Moved redraw sequencing into shared postmove helper:
    - `newsym(omx,omy)` before `mintrap_postmove(...)`
    - refresh `newsym(mon.mx,mon.my)` after trap resolution when still on-level.
- Validation:
  - `seed328_ranger_wizard_gameplay` improved:
    first screen divergence moved from step `219` to step `231`
    with RNG/events still 100% matched.
  - `scripts/run-and-report.sh --failures` remains `27/34` gameplay passing
    (no failing-session count regression).

### Comparison artifact screen-window context for boundary triage (2026-03-06)

- Added optional screen payloads to comparison artifacts to speed pure-screen
  drift debugging without changing default artifact size.
- New env toggle:
  - `WEBHACK_COMPARISON_INCLUDE_SCREENS=1`
  - Optional radius override: `WEBHACK_COMPARISON_SCREEN_CONTEXT=<N>` (default `2`)
- When enabled, artifacts include `screenContext` with expected-vs-JS
  `screen`/`screenAnsi`/`cursor` for `step = first_screen_or_color_divergence ± N`.
- Seed328 triage insight from this view:
  - divergence is localized to one map glyph row at step `231` (`%` vs `s`),
    while RNG/events remain 100% matched.
  - JS row at step `231` matches session row at step `232`, indicating a
    narrow per-step display boundary/state timing issue, not broad PRNG drift.

### place_object() now marks OBJ_FLOOR (2026-03-06)

- Root cause:
  - `js/mkobj.js place_object()` appended objects to `map.objects` but did not
    set `obj.where` to floor state.
  - This left some floor objects carrying stale/constructor `where` values
    (`free`), making `where`-sensitive C-faithful checks unreliable.
- Fix:
  - `place_object()` now sets `obj.where = 'OBJ_FLOOR'` when placing on map.
- Validation:
  - `node scripts/test-unit-core.mjs --runInBand` passes (`2483/2483`).
  - `scripts/run-and-report.sh --failures` unchanged (`27/34` gameplay passing,
    same 7 failing sessions).

### mhitu parity: reveal hider/eel attacker on hit (2026-03-06)

- Root cause:
  - C `hitmu()` clears `mtmp->mundetected` for hides-under/eel attackers that
    successfully hit the hero (`mhitu.c:1157`), then redraws that square.
  - JS `mattacku`/hit path had no equivalent branch, leaving this state update
    missing.
- Fix:
  - Added C-faithful unhide branch in `js/mhitu.js` hit path:
    - if `monster.mundetected && (hides_under(mdat) || mdat.mlet == S_EEL)`
    - clear `mundetected` and call `newsym(monster.mx, monster.my, ...)`.
- Validation:
  - Targeted `seed328` replay remains non-regressed (still isolated screen-only
    mismatch at step `231`; RNG/events 100%).
  - `scripts/run-and-report.sh --failures` unchanged (`27/34` gameplay passing,
    same 7 failing sessions).

### domove locked-door bump now routes through autounlock pick path (2026-03-06)

- Root cause:
  - JS `domove_core()` hard-returned on locked doors with `"This door is locked."`.
  - C movement path (`test_move()` -> `doopen_indir()`) can trigger autounlock
    (`autokey()` + `pick_lock()`) during movement bumps.
- Fix:
  - `js/hack.js` now uses gameplay option flags (`game.flags`) to gate locked-door
    autoopen path and invokes `autokey(...)/pick_lock(...)` for apply-key
    autounlock during movement bumps.
- Validation:
  - No failing-session count regression in `scripts/run-and-report.sh`
    (`27/34` gameplay passing, same 7 failing sessions).

### trap visibility ordering fix for stepped arrow/dart traps (2026-03-06)

- Root cause:
  - In `domove_core()` stepped-trap handling, JS set `trap.tseen = true` before
    arrow/dart `once && tseen && rn2(15)` logic.
  - C `trapeffect_arrow_trap/_dart_trap` checks `trap->tseen` before `seetrap()`.
    Using updated `tseen` in JS could add a premature `rn2(15)` on first seen triggers.
- Fix:
  - `applySteppedTrap()` now captures `wasSeen` before discovery updates and uses
    `wasSeen` for the arrow/dart `once` click-away gate.
- Validation:
  - `seed032_manual_direct` advanced materially:
    first RNG/event divergence moved from step `43` to step `48`
    (`rng matched 4902 -> 5081`, `events matched 1507 -> 1548`).
  - `scripts/run-and-report.sh` remains stable at `27/34` gameplay passing.

### seed325 teleport-trap visibility alignment unmasked later frontier (2026-03-06)

- Symptom:
  - `seed325_knight_wizard_gameplay` first divergence at step `297`:
    C consumed `rn2(40)` in pet trap-avoidance while JS consumed `rn2(12)`.
  - At candidate square `(30,8)`, JS had `TELEP_TRAP` with `tseen=0` while C
    behaved as if trap had already been seen.
- Root causes:
  - Monster teleport-trap sight checks were using `canseemon(mon)` without
    passing `player/fov` in JS paths that import `canseemon` from `mondata.js`.
    That always returned false and suppressed in-sight trap discovery.
  - `mtele_trap()` in JS was under-ported versus C (`teleport.c`):
    missing pet-teleport gate and in-sight trap-discovery/message behavior.
- C-faithful fixes:
  - In trap teleport effect selectors, compute `in_sight` with
    `canseemon(mon, player, fov) || mon === player.usteed`.
  - Ported key `mtele_trap()` behavior:
    `teleport_pet(..., false)` gate, once/fixed/random destination handling,
    and in-sight post-teleport messaging with trap discovery (`tseen` + `newsym`).
- Validation:
  - `seed325_knight_wizard_gameplay` improved from:
    `rng=14859/25281`, `screens=256/422`, `events=6896/18600`, `mapdump=2/3`
    to:
    `rng=18499/25281`, `screens=303/422`, `events=7501/18600`, `mapdump=3/3`.
  - First divergence moved later from step `297` to step `306`.
- New frontier:
  - Step `306` now first diverges around `ship_object(dokick.c:1660)` /
    `^tmp_at_step[...]` versus JS `^place[...]`, indicating the next
    unmasked C-faithful gap is in the object-kick/tmp-at sequence boundary.

### Stair --More-- boundary: preserve step alignment without cursor drift (2026-03-06)

- Symptom:
  - After moving stair-message ack to non-blocking behavior, `seed325` improved
    screen frontier to step `306` but introduced cursor divergence at step `302`
    (`expected [3,3,1]`, `actual [37,0,1]`).
- Root cause:
  - Stair ack path needed a pending input boundary to keep replay steps aligned,
    but it reused generic pending-`--More--` rendering paths that left the cursor
    on topline during snapshot.
  - Separately, `run_command()` early-returned after dismissing pending-more
    without running its normal end-of-command cursor/status placement.
- Fix:
  - Added stair-specific pending-more mode in `js/do.js`:
    sets `display._pendingMore = true` and `display._pendingMoreNoCursor = true`
    (no marker rendering).
  - `docrt()` now treats only `_nonBlockingMore` as a forced topline-cursor mode;
    plain `_pendingMore` no longer re-forces `renderMoreMarker()`/topline cursor.
    This preserves map cursor during normal pending `--More--` replay frames
    (including quest telepathy message pages after stair transitions).
  - `Display`/`Headless` clear `_pendingMoreNoCursor` in constructors and `_clearMore()`.
  - `run_command()` now refreshes status + cursor-to-player in the pending-more
    early-return branch after consuming the dismiss key.
- Validation:
  - `seed325_knight_wizard_gameplay`:
    - current: `screens=326/422`, `cursor=325/325` (cursor fully aligned)
    - first RNG divergence remains at step `309` (`rn2(12)` vs `rn2(100)`).
  - Companion checks show no frontier regression:
    - `seed327_priest_wizard_gameplay` first RNG divergence still step `390`.
    - `seed328_ranger_wizard_gameplay` first RNG divergence still step `242`.

## Lesson: vault_occupied returns '\0' which is truthy in JS

- C function `vault_occupied()` returns `'\0'` (null char) for "no vault found" and
  a room char for "player is in vault".
- In C, `'\0'` is falsy (it equals 0). In JS, `'\0'` is a non-empty string → **truthy**.
- This caused `gd_sound()` to always return false in JS, suppressing vault sounds
  when they should have played, causing rn2(2) divergence on vault levels.
- Fix: check `vaultOcc && vaultOcc !== '\0'` instead of just `vaultOcc`.
- General lesson: any C function returning `'\0'` as a sentinel needs explicit
  null-char checks in JS. This pattern likely exists in other room-query functions.

## Lesson: spurious rn2(20) in hack.js domove_attackmon_at

- JS hack.js:597 has `rn2(20)` before `exercise(A_STR, true)` in the attack path.
- C's `do_attack()` in uhitm.c has NO rn2(20) — it calls `exercise(A_STR, TRUE)`
  (which internally calls `rn2(19)`) then `u_wipe_engr(3)`.
- Removing the JS rn2(20) causes 16 session regressions, meaning it compensates
  for some other C RNG call that JS doesn't otherwise make.
- The rn2(20) is a legacy alignment hack. Do NOT remove without first identifying
  exactly which C RNG call it substitutes for. Likely candidates: something in
  the attack_checks/hitum path that JS handles differently.

## Lesson: eat.js eating paths must dispatch to cpostfx/fpostfx

- C's `done_eating()` (eat.c:562-565) dispatches to `cpostfx()` for corpses
  and `fpostfx()` for non-corpse food after eating completes.

### Seed328 hideunder boundary + corpse naming fidelity (2026-03-07)
- After fixing the hideunder/topline async boundary (awaiting message emission),
  the `%` vs `s` transient-map mismatch disappeared, but a message-text mismatch
  remained at step 232:
  - JS: `You see the centipede hide under a little dog corpse.`
  - C/session: `You see the centipede hide under a corpse.`
- Root cause: JS `xname_for_doname()` in `mkobj.js` always expanded corpse
  species name from `corpsenm`, even when `dknown` was false.
- C-faithful fix: for `FOOD_CLASS` `CORPSE`, when `!dknown`, emit generic
  `"corpse"`; only include `<monster> corpse` when `dknown`.
- Result: `seed328_ranger_wizard_gameplay` now fully matches
  (`rng/events/screens/colors/cursor = 100%`).

### `doname(corpse)` must include monster type even when `xname(corpse)` is generic (2026-03-07)
- C `objnam.c` keeps `xname(CORPSE)` generic (`"corpse"`), but `doname_base()`
  has a dedicated CORPSE branch that routes through `corpse_xname(...)`, which
  includes monster type (for example `"newt corpse"`).
- JS regression symptom: pet-eating lines drifted to `"eats a corpse"` where C
  and sessions had `"eats a newt corpse"` / `"eats a gnome corpse"`.
- Fix: in `mkobj.js` `doname()`, apply a CORPSE-specific base-name override to
  include `mons[corpsenm].mname`, while leaving `xname()` generic behavior
  unchanged.
- Validation: this restored parity for `seed301`, `seed303`, and `seed306`
  while keeping `seed328` green.
- JS had these functions defined but never called from the eating completion paths.
  Multi-turn eating used inline PM_NEWT-only logic; single-turn eating had none.
- Missing `fpostfx()` meant fortune cookie `outrumor()` (rn2(2) + rn2(chunksize))
  was never consumed, and royal jelly rnd(20)/rn2(17) were never applied.
- Fix: wire cpostfx/fpostfx into both multi-turn `finishEating` and single-turn paths.

## Lesson: m_ap_type must use numeric constants, not strings

- C's `m_ap_type` is an enum: M_AP_NOTHING=0, M_AP_FURNITURE=1, M_AP_OBJECT=2,
  M_AP_MONSTER=3. JS was using both string values ('object', 'furniture', 'monster')
  and numeric constants inconsistently across ~10 files.
- This caused type mismatches where `m_ap_type === 'furniture'` wouldn't match
  numeric `M_AP_FURNITURE` (1), and vice versa.
- display.js `monsterShownOnMap()` had a dual-check kludge (`ap === 'furniture' ||
  ap === 1`) that partially masked the bug.
- Fix: standardize all assignments and comparisons to use imported numeric constants
  from const.js. Updated: mon.js, display.js, hack.js, lock.js, wizard.js, pray.js,
  objnam.js.

## Lesson: seed328 screen divergence is stale-glyph rendering model difference

- seed328 has 13659/13659 RNG match and 1723/1723 events match — pure display issue.
- A centipede at (6,14) has M1_HIDE and mundetected=true. Player has no telepathy,
  warning, or detect_monsters. Both C and JS should hide it.
- But C shows 's' at that position because C uses **incremental** rendering (newsym):
  the centipede was visible at an earlier step, then became mundetected, but no
  newsym() was called at that tile to clear the old glyph.
- JS does a **full re-render** every frame, always checking current monster state.
- This is a fundamental rendering model difference, not a game logic bug.
- The monsterShownOnMap() enhancement to check senseMonsterForMap() is correct
  C parity but doesn't fix this case since the player lacks detection abilities.

## Lesson: Gate-2 postmov refactors need explicit A/B parity proof

- For issue #260, we extracted postmove flow into named helpers in `js/monmove.js`
  to prepare a faithful C ordering port:
  - `run_dochug_postmove_pipeline_current_js(...)` for pet/non-pet `dochug` paths.
  - `m_move_apply_moved_effects_current_order(...)` for moved-cell effects.
- Requirement: Gate-2 is structure-only. Any refactor must prove no parity drift.
- Reliable method: stash patch, run target seeds on baseline commit, pop patch, rerun,
  and compare first-divergence signatures.
- A/B result for seeds `325`, `327`, `328` was identical after extraction:
  - seed325 first RNG divergence remains step `238`
  - seed327 first RNG divergence remains step `390`
  - seed328 remains RNG/event full-match with first divergence in screen channel at step `231`

## Lesson: C-faithful postmov trap-before-dig can land as a neutral semantic slice

- In C `postmov()`, trap resolution (`mintrap`) runs before tunneling (`mdig_tunnel`).
- JS pet path previously did `mdig_tunnel` before `mintrap` in `dochug`.
- For issue #260 Gate 3, we moved pet digging to run after shared trap handling in
  `run_dochug_postmove_pipeline_current_js(...)`.
- Validation after the change:
  - target seeds `325`, `327`, `328`: unchanged first-divergence signatures
  - `./scripts/run-and-report.sh --failures`: remained at `7` failing gameplay sessions
- This is useful as a safe C-ordering correction even without immediate frontier gain.

## Lesson: non-pet postmov trap-boundary refactor can reveal a later seed325 frontier

- C `m_move()` returns movement intent, then `postmov()` handles trap/door/dig/web
  sequencing as post-move effects. JS had non-pet door/dig/web effects inline inside
  `m_move()` before shared trap handling in `dochug()`.
- For issue #260 Gate 3 slice 2:
  - moved non-pet moved-cell effects out of `m_move()` and into the shared
    `run_dochug_postmove_pipeline_current_js(...)` post-trap phase
  - kept internal moved-effect order unchanged for this slice (`maybe_spin_web` ->
    dig -> door) to avoid batching multiple semantic changes
  - added transient context handoff (`mon._m_move_postmove_ctx`) and cleared it at
    `m_move()` entry to prevent stale-turn leakage
- Validation:
  - `seed325_knight_wizard_gameplay`: first RNG divergence advanced `238 -> 309`
  - `seed327_priest_wizard_gameplay`: unchanged (`390`)
  - `seed328_ranger_wizard_gameplay`: unchanged (RNG/events full-match; screen-only first divergence)
  - `./scripts/run-and-report.sh --failures`: still `27/34` passing, `7` failing
- Takeaway: this supports the hypothesis that postmov trap-boundary ordering is a
  real parity frontier, and it can be improved without increasing failing-session count.

## Lesson: door-before-dig ordering slice can be adopted incrementally when neutral

- Follow-up Gate 3 slice adjusted non-pet moved-cell effect order in shared postmove:
  `door handling -> mdig_tunnel -> maybe_spin_web`.
- This aligns closer to C `postmov` sequencing (`door/bars` before dig; web is tail work).
- Validation stayed neutral relative to prior slice:
  - `seed325` remained at first RNG divergence step `309`
  - `seed327`/`seed328` unchanged
  - `./scripts/run-and-report.sh --failures` remained `27/34` passing, `7` failing
- Even when immediate frontier movement is flat, landing C-faithful neutral slices
  simplifies later debugging and reduces mixed-order confounders.

## Lesson: placing maybe_spin_web in postmov tail is a safe cleanup slice

- C `postmov()` runs `maybe_spin_web` in the moved/done tail, after moved-cell core
  work and after object interaction checks.
- JS had non-pet `maybe_spin_web` inside moved-cell core helper.
- We moved non-pet web spin to `dochug` moved/done tail (just before hide-under),
  keeping trap/dig/door handling in the shared postmove core helper.
- Validation remained stable:
  - `seed325` stayed improved at first RNG divergence step `309`
  - `seed327`/`seed328` unchanged
  - failing suite remained `27/34` passing, `7` failing
- This reduces one more ordering mismatch and keeps the code closer to C postmov
  structure without introducing regressions.

## Lesson: shared postmov tail helper keeps pet/non-pet sequencing aligned

- C `postmov()` applies moved/done tail effects for both pet and non-pet outcomes.
- JS previously duplicated tail handling in non-pet only, leaving pet flow less aligned.
- We added `run_dochug_postmove_tail_current_js(...)` and now route both branches
  through it for moved/done statuses:
  - item pickup (`maybeMonsterPickStuff`) and `MMOVE_DONE` normalization
  - `maybe_spin_web`
  - hide-under reevaluation
- Validation stayed stable:
  - `seed325` remained at first RNG divergence step `309`
  - `seed327`/`seed328` unchanged
  - failing suite remained `27/34` passing, `7` failing
- This reduces branch fragmentation and makes subsequent C-ordering audits easier.

## Lesson: include after_shk_move in shared postmov tail

- C `postmov()` runs `after_shk_move()` for shopkeepers in moved/done tail.
- We added this call to the shared JS tail helper so shopkeeper bookkeeping is
  applied uniformly after post-move processing.
- Validation stayed stable on target seeds and failing-suite count stayed at `7`.

## Lesson: postmov tail must run meatmetal/meatobj/meatcorpse before pickup

- C `postmov()` performs object-consumption hooks before `mpickstuff`:
  - `meatmetal` (metallivores)
  - `meatobj` (gelatinous cube)
  - `meatcorpse` (corpse eaters)
- JS tail previously jumped straight to pickup logic, skipping this branch.
- We added these checks to shared `dochug` postmove tail before
  `maybeMonsterPickStuff`, preserving C ordering and death semantics.
- Validation remained stable:
  - `seed325` frontier unchanged at step `309`
  - `seed327`/`seed328` unchanged
  - failing suite remained `27/34` passing, `7` failing

## Lesson: mthrowu drop-through path must preserve ship_object breaktest RNG

- `seed325` at step `309` showed C `rn2(100)` from `obj_resists(zap.c)` while JS
  advanced to the next movement-roll RNG.
- Root cause: JS `mthrowu.drop_throw()` returned early for down-gate migration
  (`!nodrop`) without calling `breaktest()`, while C `ship_object()` always runs
  `breaktest()` before migration.
- Fix: in JS `drop_throw()`, call `breaktest(obj)` on the migration path before
  returning (to preserve `obj_resists()` RNG consumption and break semantics).
- Impact:
  - `seed325` first RNG/event divergence moved later from step `309` to `365`
  - failing suite remained `27/34` passing, `7` failing (no regression in count)

## Lesson: hatch_egg must gate RNG on get_obj_location eligibility

- New `seed325` frontier at step `365` showed JS timer RNG (`rnd(1)` from
  `hatch_egg`) occurring where C consumed hunger RNG (`rn2(20)` in `gethungry`).
- Root cause: JS `timeout.hatch_egg()` consumed `rnd(quan)` unconditionally,
  while C `hatch_egg()` only rolls hatchcount after `get_obj_location()` succeeds
  (eligible locations: `OBJ_INVENT`, `OBJ_FLOOR`, `OBJ_MINVENT`).
- Fix: add location eligibility gate in `hatch_egg()` before hatchcount RNG.
- Impact on current baseline:
  - `seed325_knight_wizard_gameplay`: RNG/events became full-match (`422/422`);
    now screen-only divergence remains at step `306`.
  - `seed327` unchanged.
- Full gameplay-suite failure count stayed stable on current main baseline.

## Lesson: treat mcanmove as C boolean (0 and false both immobile)

- C uses boolean checks for `mcanmove`; both `0` and `FALSE` are immobile.
- JS had strict checks (`=== false` / `!== false`) in several `movemon`/`dochug`
  gates, which let numeric `0` monsters act and consume extra RNG.
- We normalized these to boolean checks in movement-critical paths:
  - `movemon` equip/occupation gates (`js/mon.js`)
  - `dochug` immobile gate and postmove tail gate (`js/monmove.js`)
  - helper logic using monster helplessness (`js/monmove.js`)
- We also aligned pet path pre-move trap handling with C `m_move()` ordering by
  running trapped resolution before `dog_move`.
- Validation impact:
  - `seed327_priest_wizard_gameplay`: RNG parity improved from `390/429` to
    `429/429` (now event/screen-only divergence frontier).
  - gameplay failures remained stable at `6` total.

## Lesson: route monster-lethal flow through `end.c` path, not ad-hoc wizard bypass

- C uses `done_in_by(..., DIED)`/`done()` death flow; wizard mode asks
  `Die? [yn] (n)` instead of unconditional immediate survival.
- JS had duplicated ad-hoc wizard bypass in `mhitu.js` (`OK, so you don't die.`),
  which bypassed the canonical death flow and made turn-boundary control fragile.
- Fixes:
  - `js/mhitu.js`: lethal monster damage now calls `done_in_by(..., DIED, game)`.
  - `js/end.js`: wizard death now installs a pending `Die? [yn] (n)` prompt.
  - `js/end.js`: `savelife()` sets `_stopMoveloopAfterLifesave` so the current
    movement loop halts after survival, mirroring C's stop-after-savelife behavior.
  - `js/allmain.js`: `savebones()` is gated behind actual `game.gameOver` state,
    avoiding premature death-side effects while prompt resolution is pending.
- Validation impact:
  - failing-session count remained stable (`28/34` passing, `6` failing).
  - `seed331` frontier remains in monster-move divergence (`dochug` at late step),
    so this was architectural correctness cleanup, not the final parity fix.

## Lesson: wizard `Die? [yn] (n)` must be strict-keyed and deferred after `--More--`

- C wizard death confirmation uses a real `yn` prompt semantics:
  only explicit `y`/`n` (plus default-on-Enter/Esc) should resolve it.
- JS accepted any non-`y` key as `n`, which let `space` auto-survive during
  death message sequencing and reopened gameplay flow too early.
- Fixes:
  - `js/end.js`: `wizard_die_confirm` now resolves only on `y/Y`, `n/N`,
    and default `n` via Enter/Esc; other keys are consumed but ignored.
  - `js/end.js`: when death messaging has pending `--More--`, defer prompt
    installation via `game._deferredWizardDiePrompt`.
  - `js/allmain.js`: execute deferred wizard prompt immediately after
    clearing `--More--`, before any other deferred turn behavior.
  - `js/mhitu.js`: remove duplicate immediate `You die...` message from
    lethal branches when `done_in_by` is used, preserving canonical
    death-message staging through `end.c` path.
- Validation impact:
  - `seed331_tourist_wizard_gameplay` now reaches full RNG/event parity
    (`PRNG 389/389`, `Events 389/389`); remaining mismatch is screen-only
    at step `378` (`'#y#'` visibility row diff).
  - failure count remains `28/34` passing (`6` failing), with improved
    channel totals: PRNG `31/34`, Events `30/34`.

## Lesson: monster light sources must attach to live monster pointers (not `anything` wrappers)

- Dynamic monster lighting in C (`light.c`) tracks sources by monster pointer
  and re-reads monster position every vision pass.
- JS had two gaps:
  - main `makemon()` flow did not register monster light sources at spawn;
  - clone/replacement paths passed `monst_to_any(...)` instead of monster
    pointers to `new_light_source`/`del_light_source`, breaking pointer identity.
- Fixes:
  - `js/makemon.js`: register monster light sources in main spawn flow;
  - `js/makemon.js` and `js/mon.js`: use direct monster pointers for
    LS_MONSTER light-source add/remove updates.
- Rendering follow-up:
  - `js/display.js`: in out-of-FOV rendering, allow self-luminous monsters to
    be drawn when line-of-sight (`couldsee`) exists and the monster is otherwise
    visible (`monVisibleForMap`), matching C-style dark-square luminous monster
    visibility.
- Validation impact:
  - `seed331` screen frontier moved later from map-row mismatch at step `378`
    to death-message staging at step `379`, while RNG/event parity remained full.

## Lesson: wizard death flow must hand off to disclose prompt in the same key cycle

- C `done()` in wizard mode resolves `Die? [yn]` and immediately enters
  `really_done()`/`disclose()` flow on `'y'`, which shows:
  `Do you want your possessions identified? [ynq] (n)`.
- JS was keeping `Die?` on screen one extra key because the prompt handler
  ended without entering disclose-stage prompting in the same command cycle.
- Fixes:
  - `js/end.js`: make wizard `Die?` prompt handler async and await `really_done()`.
  - `js/end.js`: install a C-faithful possessions prompt during `really_done()`,
    including default handling for `<Esc>/<Enter>` and `q`.
  - `js/allmain.js`: await async `pendingPrompt.onKey()` handlers so prompt
    state transitions are deterministic.
  - `js/replay_core.js`: skip docrt-style rerender after prompt-only keys
    (`run_command(...).prompt === true`) so prompt surfaces are not overwritten.
  - `js/display.js` and `js/headless.js`: enforce death-message `--More--`
    boundaries so `"You die..."` does not concatenate into prior topline text.
- Validation impact:
  - `seed331_tourist_wizard_gameplay` now passes fully for gameplay channels:
    RNG `18493/18493`, Events `3708/3708`, Screen `389/389`, Colors `9336/9336`.
  - gameplay-suite pass count improved from `28/34` to `29/34` (5 failures remain).
## Lesson: replay should not own generic per-key rerender policy

- `replay_core` previously forced a generic `docrt`-style rerender after most
  settled commands; this created replay-specific rendering policy to maintain.
- Refactor direction: command runtime owns render completion, replay only feeds
  keys and captures the resulting screen/cursor.
- Implementation slice:
  - `run_command(..., { renderAfterCommand: true })` now performs runtime-side
    final render work for replay-driven commands.
  - removed generic per-step rerender branch from `js/replay_core.js`.
  - retained one narrow compatibility hook for active pending text popups:
    `docrt()` + popup redraw while command is input-blocked.
- Validation impact:
  - targeted seeds (`seed301`, `seed306`, `seed331`) pass in this configuration.
  - full failure burndown remained non-regressing at `29/34` passing (`5` failing).

### Refinement: move popup-specific pending-state rendering behind runtime API

- To reduce replay ownership further, replay no longer imports popup/windowing
  helpers directly.
- Added `NetHackGame.renderInputBlockedState()` in `js/allmain.js` to own
  input-blocked UI rendering (`docrt` + popup overlay redraw when applicable).
- `js/replay_core.js` now calls only this runtime API while a command is
  pending, instead of making window-specific decisions itself.
- Validation remained non-regressing (`29/34` gameplay passing; same 5 failures).

### Guardrail: architecture contract test for replay render ownership

- Added `test/unit/replay_core_render_architecture.test.js` to prevent
  replay-render ownership regressions.
- Test asserts:
  - no direct `windows.js` popup-helper imports in `replay_core`,
  - no generic replay-side rerender helper or direct `game.docrt()` call in
    `replay_core`,
  - replay uses runtime-owned APIs (`renderAfterCommand` path and
    `renderInputBlockedState()`).

### Hardening: move blocked-popup redraw trigger to input-wait boundary

- Deeper cleanup moved pending-popup redraw trigger off replay step loop and
  onto runtime input-wait transitions.
- `createHeadlessInput()` now exposes `setOnWaitStarted(fn)` and fires it when
  `nhgetch()` enters a waiting state.
- `NetHackGame.init()` wires this callback to `renderInputBlockedState()`.
- `replay_core` no longer calls `renderInputBlockedState()` directly.
- Validation:
  - architecture unit guard passes;
  - sensitive seeds (`seed301`, `seed306`, `seed331`) pass;
  - full failure burndown non-regressing (`29/34` passing, same 5 failures).

## Manual-direct early drift reduction: `#untrap` + trap object map wiring + autounlock occupation ordering (2026-03-07)

- Target: issue `#263` (`seed031_manual_direct`, `seed032_manual_direct`) where JS diverged early into monster turns before expected trap/lock handling.
- Root causes fixed:
  - `#untrap` direction parsing in `js/cmd.js` did not accept `.`/`s` ("here"), so replay consumed later keys and skipped the intended disarm branch.
  - `cnv_trap_obj()` trap-object conversion in `js/trap.js` was calling `place_object()` without map context and `deltrap()` with wrong argument order, so JS consumed part of object RNG but missed `^place/^dtrap` state/event effects.
  - Several object placement/stacking call paths relied on implicit global-map semantics, while JS helpers required explicit `map`; added C-style active-map fallback in `place_object()`/`stackobj()`.
  - Locked-door autounlock (`js/hack.js`) needed one immediate lock-picking occupation tick after `pick_lock()` to align with observed C ordering around `picklock(lock.c:98)`.
- Validation:
  - `seed032_manual_direct`: first RNG divergence moved later from step `52` to step `73`; event matches improved `1558 -> 1956`.
  - `seed031_manual_direct`: first RNG divergence moved later from step `57` to step `78`; event matches improved `1229 -> 1840`.
  - Guard checks stayed green:
    - `seed100_multidigit_gameplay` pass (RNG/events full)
    - `seed328_ranger_wizard_gameplay` pass (RNG/events/screens full)

### Manual-direct seed032: stepped-trap seen-escape parity moved frontier (2026-03-07)

- Problem: `seed032_manual_direct` still diverged when JS immediately applied
  teleport-trap effects from `hack.js` stepped-trap handling, while C consumed
  `rn2(5)` in `dotrap()` seen-trap escape gating (`trap.c:2962-2970`) and often
  escaped trap effects.
- Fix: added C-style seen-trap escape branch to `hack.js` stepped-trap path,
  including `rn2(5)` consume and early return when escaping.
- Impact:
  - `seed032_manual_direct` first RNG divergence moved later `73 -> 88`.
  - `seed031_manual_direct` remained at step `78` (non-regressed).
- Guard sessions remained green (`seed100`, `seed328`).

### seed327 vault/Knox parity: floating Ludios source and mk_knox_portal gate ordering (2026-03-07)

- Root cause of early seed327 event drift was a C/JS modeling mismatch in
  Ludios branch source handling during vault generation:
  - C keeps Ludios branch source floating (`end1.dnum == n_dgns`) until
    `mk_knox_portal()` decides to bind it.
  - JS had pre-bound Ludios source in branch topology, which changed
    `mk_knox_portal()` gate behavior and RNG/event ordering.
- Fixes in `js/dungeon.js`:
  - `init_dungeons()` now marks Ludios source as floating (`end1.dnum = n_dgns`
    equivalent via current dungeon count sentinel).
  - `mk_knox_portal()` now follows C gate order more closely:
    source-side selection, branch-level disallow, already-set/defer check,
    main-dungeon/depth/quest-entrance checks, then placement.
  - On successful portal setup, branch source is bound to current level.
- Validation:
  - `seed327` step-222 `rng_step_diff`: RNG comparable entries now match.
  - `seed327` session parity reached full RNG/events match
    (`20304/20304`, `12214/12214`).
  - Failure burndown improved to `28/34` passing, `6` failing.

### postmov parity slice: iron-bars handling before mdig_tunnel (2026-03-07)

- Added a missing C `postmov()` branch in `js/monmove.js` for monsters that
  can eat through `IRONBARS` (rust/corrosion/metallivore path), ordered before
  `mdig_tunnel()` in the shared non-pet postmove pipeline.
- Hardened `dissolve_bars()` so it no longer depends on undefined symbols and
  safely updates terrain + wall info + redraw.
- Validation:
  - targeted seeds unchanged (`seed325`, `seed327`, `seed328` non-regressing);
  - full failure suite unchanged at `28/34` passing (`6` failing).

### postmov parity slice: trapped-door and doorbuster handling in moved-cell phase (2026-03-07)

- Extended `js/monmove.js` non-pet moved-cell postmove branch to better match C
  door semantics:
  - trapped-door disarm via `has_magic_key(mon)` before open/unlock handling;
  - trapped-door explosion path via `mb_trapped(...)` for unlock/open/bust cases;
  - explicit doorbuster branch (`BUSTDOOR`) with C-style `rn2(2)` broken-vs-nodoor
    decision and shop damage tracking via `add_damage(...)`.
- This keeps door handling inside the C-aligned postmov order (after `mintrap`,
  before bars/dig/tail).
- Validation:
  - `seed325`/`seed327` keep full RNG+event parity;
  - `seed328` remains full pass;
  - `./scripts/run-and-report.sh --failures` unchanged at `28/34` passing
    (`6` failing).

### SDOOR wall-angle rendering parity (2026-03-07)

- Root cause for `seed327` screen-only drift (`row12 col34`, extra `│`) was in
  `js/render.js`: secret doors (`SDOOR`) were always rendered as wall glyphs via
  neighbor-derived wall type, ignoring C `wall_angle()` visibility gating.
- C `display.c wall_angle()` treats `SDOOR` as horizontal/vertical wall and
  applies `seenv + wall_info` mode checks; when the angle/mode fails, glyph is
  `S_stone` (blank), not wall.
- Fix in JS:
  - `SDOOR` now follows C shape selection (`arboreal_sdoor -> TREE`,
    else `horizontal ? HWALL : VWALL`);
  - applies `wallIsVisible(...)` with `loc.seenv` and `loc.flags` (`WM_MASK`)
    and falls back to `STONE` when not visible by angle.
- Validation:
  - `seed327_priest_wizard_gameplay` now passes;
  - gameplay burndown improved from `28/34` to `29/34` passing.

### postmov parity slice: door branch gated by `!passes_walls && !can_tunnel` (2026-03-07)

- Tightened shared non-pet postmov door branch to mirror C guard conditions:
  door logic now runs only when the monster does not pass walls and is not in
  tunnel mode (`ALLOW_DIG`).
- This keeps door handling semantics aligned with C’s postmov branch partition
  before bars/dig handling.
- Validation stayed stable:
  - `seed325`/`seed327` RNG+event full-match unchanged;
  - `seed328` full pass unchanged;
  - failure suite remains `28/34` passing (`6` failing).

### postmov parity slice: amorphous-under-door branch restored (2026-03-07)

- Added the missing C postmov door branch for amorphous monsters:
  when entering a locked/closed door tile, amorphous monsters now "flow/ooze
  under the door" without mutating door state, before unlock/open/bust logic.
- This restored C branch ordering and prevented JS from incorrectly forcing
  open/unlock behavior in those cases.
- Validation:
  - `seed327_priest_wizard_gameplay` now reaches full RNG+event+screen parity
    (remaining mismatch is cursor-only),
  - global gameplay burndown improved from `28/34` to `29/34` passing
    (`5` failing).

### makelevel branch snapshot parity (seed332) (2026-03-07)

- `seed332_valkyrie_wizard_gameplay` regressed with first RNG drift at step 203:
  JS consumed `rn2(4)` in `find_branch_room()` while C consumed `rn2(6)` in
  `makelevel(mklev.c:1403)`.
- Root cause in `js/dungeon.js makelevel()`:
  - JS recomputed branch presence late (right before `place_branch()`),
    after vault/`mk_knox_portal()` could mutate Ludios branch source.
  - C snapshots `branchp = Is_branchlev(&u.uz)` early and uses that snapshot for
    both `room_threshold` and later `place_branch(branchp, ...)`.
  - On this seed, late recompute falsely treated `d0l25` as branch level and
    triggered extra `find_branch_room()` RNG.
- Fix:
  - Snapshot branch placement once at makelevel start:
    `branchPlacementAtStart = resolveBranchPlacementForLevel(...)`.
  - Use `hasBranchAtStart` for room threshold (`4` vs `3`).
  - Use `branchPlacementAtStart` for `place_branch` instead of late recompute.
- Validation:
  - `seed332` now full pass: RNG/events/screen/mapdump all 100%.
  - `scripts/run-and-report.sh --failures` improved from `29/34` to `30/34`
    passing gameplay sessions; no new failures introduced.

### `--More--`/quest pager boundary refinement (seed325 spillover reduction) (2026-03-07)

- `seed325` showed quest pager text leaking into later command frames
  (`302..305`) despite RNG/events being fully aligned.
- Root cause was JS fallback `--More--` queue behavior at command boundaries:
  quest portal messaging could be emitted while a prior prompt was pending,
  then replayed later as queued toplines.
- C-faithful refinement applied:
  - `run_command()` and `nhgetch()` now await async `display._clearMore()`.
  - `_clearMore()` resumes at most one queued message per dismissal instead of
    draining the whole queue in one pass.
  - `maybeShowQuestPortalCall()` suppresses quest text output when a `--More--`
    prompt is already pending, while preserving the same RNG consumption and
    `qcalled` state transition.
- Validation:
  - `scripts/run-and-report.sh --failures` now reports `30/34` passing (`4`
    failing), matching current team frontier.
- Remaining `seed325` divergence is later screen-only (`step 306`, missing
    floor `)` glyph) with RNG/events still full-match.

### dogfood poison/trap bit alias + vegetarian corpse taste index (2026-03-07)

- `seed031_manual_direct` had persistent dog-goal drift where C logged
  `food=5` (POISON) for a floor large box while JS logged `food=4` (APPORT),
  causing an extra JS `obj_resists()` `rn2(100)` in `dogfood`.
- Root cause: C aliases object bits (`#define opoisoned otrapped`), but JS
  stores `opoisoned` and `otrapped` separately.
  - For trapped boxes (`otrapped=1`), C `dogfood()` sees poison-bit set and
    returns `POISON` before `obj_resists()`.
  - JS previously only checked `obj.opoisoned`, so it missed this branch.
- Fix:
  - Added `hasPoisonTrapBit(obj)` in `js/objdata.js`.
  - Switched parity-sensitive reads in `js/dog.js` (`dogfood`) and `js/mon.js`
    (`meatmetal`) to use the shared-bit helper.
- Additional C-faithful parity fix in `js/eat.js`:
  - corpse palatability message index now follows C:
    vegetarian corpses use fixed index `0`, non-vegetarian corpses use `rn2(5)`.
- Validation:
  - Gameplay failure set remains stable (`31/34` passing).
  - `seed031` first RNG divergence moved later (`step 131 -> 139`), confirming
    forward progress without regressions.

### corpse-eat RNG ordering cleanup (2026-03-07)

- `handleEat()` still had synthetic corpse pre-rolls (`rn2(20)`, `rn2(7)`,
  `rn2(10)`, `rn2(5)`) before consumption, while `eatcorpse()` was already
  available and should own corpse-specific RNG/message behavior.
- Fix:
  - removed synthetic corpse pre-rolls from `handleEat()`;
  - always route corpse handling through `eatcorpse()`;
  - keep bite timing from `corpseOutcome.reqtime` and preserve `retcode==2`
    early-consume behavior.
- Why this matters:
  - keeps RNG call ownership in the same semantic location as C (`eatcorpse`
    path) and avoids duplicate/early rolls that can shift later monster-move
    parity.
- Validation:
  - on `seed031_manual_direct`, first RNG divergence remained at the later
    post-fix boundary (`step 139`) after rebasing onto latest `main`.

### yn prompt + rush prefix command fidelity fixes (2026-03-07)

- `ynFunction` now matches tty `yn_function` case handling:
  - lowercases input unless choices include uppercase letters;
  - treats `LF/CR/space` as default-answer keys.
- `rhack` movement dispatch now routes stored `g` (rush) prefix to `do_rush`
  (previously it incorrectly routed all stored run prefixes to `do_run`).
- Validation:
  - targeted command unit tests:
    - `test/unit/command_run_prefix_invalid.test.js`
    - `test/unit/command_run_timing.test.js`
    both pass.

### locked `#loot` autounlock parity in pickup path (2026-03-07)

- `handleLoot()` previously diverged from C `do_loot_cont()` for locked floor containers:
  - emitted simplified `"Hmmm, it seems to be locked."`;
  - skipped C autounlock key/untrap path (`pick_lock(..., ox, oy, cobj)`).
- Fix in `js/pickup.js`:
  - use C-like locked messaging (`lknown`-aware) and set `container.lknown = true`;
  - parse `flags.autounlock` in both numeric-bit and token-string forms;
  - for `apply-key` / `untrap`, clear stale vertical dir (`player.dz = 0`),
    select key via `autokey(...)`, and call `pick_lock(game, unlocktool, ox, oy, container)`;
  - account for returned time usage (`res !== 0`).
- Result:
  - `seed031_manual_direct` now reaches the C lock occupation/trapped-chest area.
  - first RNG divergence moved to `chest_trap(trap.c:6220)` vs missing JS trapped-box handling in `picklock_fn`,
    giving a tighter next implementation target.

### trapped-box lockflow now calls `chest_trap` before dex exercise (2026-03-07)

- In C `lock.c:picklock()`, successful container lock/unlock calls:
  - toggle `olocked`,
  - set `lknown`,
  - then `chest_trap(box, FINGER, FALSE)` when `otrapped`,
  - then `exercise(A_DEX, TRUE)`.
- JS had skipped the `chest_trap` call entirely, which shifted RNG immediately
  after autounlock/lock occupation success.
- Fix:
  - added `trap.js` `chest_trap(...)` entry and wired `lock.js` `picklock_fn`
    to call it in the same location as C.
- Validation on `seed031_manual_direct`:
  - RNG matched improved `10127 -> 10189`,
  - events matched improved `3547 -> 3601`,
  - first divergence moved later (`step 140 -> 152`).

### pickup selector boundary for multi-item `,` (2026-03-07)

- Manual-direct `seed032` has a same-turn pickup selector sequence at gameplay
  steps `44..48`: `, a b c <Enter>`.
- JS previously handled `,` by immediately choosing one floor object in
  `handlePickup()`, so selector keys were free to leak into global command
  dispatch in exploratory builds (`a` apply, `b` move, `c` close door).
- C-faithful boundary fix:
  - when multiple non-gold objects are on the hero square, `handlePickup()`
    now enters `NHW_MENU` + `select_menu(PICK_ANY)` in the same command flow;
  - selector letters are consumed by menu input (`nhgetch`) rather than
    top-level command dispatch;
  - item order is class-grouped then `doname()` sorted to align selector
    mapping with C session shape for the known seed.
- Validation:
  - full gameplay suite remained stable (`31/34` passing, same 3 failing
    sessions: `seed031`, `seed032`, `seed033`);
  - `seed032` first divergence remained at step `89` (no regression spike),
    while step-44 pickup keys stayed command-local.

### prompt-completion cursor/status boundary (2026-03-07)

- `run_command()` previously returned immediately for handled prompt keys
  (`pendingPrompt.onKey`) without restoring normal cursor/status placement when
  the prompt closed.
- That left replay-time command frames in a stale prompt-cursor state and
  contributed to manual-direct drift.
- Fix:
  - after prompt key handling, if the prompt is fully closed and no `--More--`
    is pending, refresh status and cursor to player position;
  - guard this refresh behind `!game.gameOver` to avoid end-of-game screen
    regressions.
- Validation:
  - `seed031_manual_direct` first RNG/event divergence improved from step `139`
    to step `152`;
  - `./scripts/run-and-report.sh --failures` remained stable at `31/34`
    passing (same failing trio: `seed031`, `seed032`, `seed033`).

### des.grave now uses true HEADSTONE engraving path (2026-03-07)

- C ref: `sp_lev.c:lspo_grave()` calls `make_grave(...)`, and `make_grave()`
  writes engraving type `HEADSTONE`.
- JS had `des.grave()` write a generic `'engrave'` with `nowipeout: true`,
  which is not equivalent to C type semantics.
- Fix in `js/sp_lev.js`:
  - import and call `make_grave(levelState.map, xabs, yabs, epitaph)` from
    `engrave.js` instead of manual `make_engr_at(..., 'engrave', nowipeout)`.
- Validation:
  - `./scripts/run-and-report.sh --failures` stayed stable at `31/34` passing
    with the same failing trio (`seed031_manual_direct`,
    `seed032_manual_direct`, `seed033_manual_direct`), so this was a
    correctness cleanup without regression.

### potion quaff dispatch fixed from name-heuristic to `otyp` dispatcher (2026-03-07)

- Root cause in `seed031` window after locked-box trap handling:
  - C quaff path executed `peffect_healing` (`d(4,4)` + `exercise(A_CON,TRUE)`),
  - JS quaff path in `handleQuaff()` still used legacy string matching on `item.oname`,
    which can classify a real potion as water (`\"Hmm, that tasted like water.\"`).
- Fix in [`js/potion.js`](/share/u/davidbau/git/mazesofmenace/game/js/potion.js):
  - removed legacy `oname`-based effect branching in `handleQuaff()`;
  - route selected potion through `peffects(player, item, display)` (C-style `otyp` dispatch).
- Validation:
  - `seed031_manual_direct` improved again:
    - RNG matched `10189 -> 10277`
    - colors matched `6110 -> 6156`
    - first divergence index moved `10149 -> 10150`.
  - Remaining earliest mismatch is one subsequent missing `exercise` roll before `distfleeck`.

### stepped-trap path now clears run/multi like C `dotrap()` `nomul(0)` (2026-03-07)

- C ref: `trap.c:dotrap()` begins with `nomul(0)` before trap-branch checks
  (including in-air bypass and seen-trap escape).
- JS `domove_core()->applySteppedTrap()` did not clear run/multi state at trap
  entry, which was less faithful to C control flow around trap interactions.
- Fix in `js/hack.js`:
  - at stepped-trap entry, clear `svc.context.run` and `game.multi` before
    evaluating trap branches.
- Validation:
  - `./scripts/run-and-report.sh --failures` remained stable at `31/34`
    passing with the same failing trio (`seed031_manual_direct`,
    `seed032_manual_direct`, `seed033_manual_direct`).

### prompt-handled keys now honor time consumption in `run_command()` (2026-03-07)

- Root cause:
  - `run_command()` short-circuited on `pendingPrompt.onKey(...).handled` and
    always returned `{ tookTime: false }`, even when the prompt action itself
    consumed time.
- C-faithful fix in `js/allmain.js`:
  - propagate `promptResult.tookTime` / `promptResult.moved`;
  - when prompt handling consumes time, run the normal timed-turn pipeline
    (`moveloop_core`, seer scheduling, `find_ac`, `see_monsters`,
    occupation-drain) before returning.
- Why this matters:
  - prompt completion paths (for example pickup continuation prompts) can be
    true turn-consuming actions; forcing them non-timed creates silent
    command-boundary drift.
- Validation:
  - `node scripts/test-unit-core.mjs` passes;
  - `./scripts/run-and-report.sh --failures` remains stable at `31/34`
    passing (same failing trio: `seed031`, `seed032`, `seed033`).

### healing/attribute exercise faithfulness cleanup (2026-03-07)

- C-faithful fixes applied without comparator/replay masking:
  - [`js/attrib_exercise.js`](/share/u/davidbau/git/mazesofmenace/game/js/attrib_exercise.js)
    now mirrors `attrib.c` status checks in `exerper()`:
    - clairvoyance wisdom exercise uses `HClairvoyant` (`intrinsic|timeout`)
      and blocked-state gating;
    - regeneration strength exercise uses `HRegeneration` (`intrinsic`) rather
      than legacy `player.regeneration`.
  - [`js/potion.js`](/share/u/davidbau/git/mazesofmenace/game/js/potion.js)
    `peffect_healing()` now matches C ordering/arguments:
    - `You_feel("better.")` before `healup(...)`;
    - `healup(..., curesick=!!otmp.blessed, cureblind=!otmp.cursed)`;
    - removed non-C extra blindness call from this path;
    - `healup()` now cures with `SICK_ALL` (was incorrectly `0`).
- Validation:
  - no spike/regression in targeted parity checks:
    - `seed031_manual_direct` remained `10277` matched RNG calls, first drift
      still at `index 10150` (`rn2(19)` vs `rn2(5)`);
    - `seed032_manual_direct` remained at prior first drift window (`step 89`).
  - These are correctness cleanups that close C/JS semantic gaps even though
    the remaining seed031 first drift is unchanged.

### remove duplicate seer RNG scheduling in `run_command()` turn wrappers (2026-03-07)

- Root cause:
  - JS had `seerTurn` scheduling (`rn1(31,15)`) in multiple layers:
    - canonical location in `moveloop_core()`,
    - duplicated again in `run_command()` timed-turn wrappers.
- C ref:
  - `allmain.c` performs seer scheduling once in `moveloop_core()` after
    turn advancement; command wrappers do not reschedule it.
- Fix:
  - removed duplicate `seerTurn` updates from `run_command()` prompt-timed and
    `advanceTimedTurn()` paths, keeping seer scheduling solely in
    `moveloop_core()`.
- Validation:
  - `node scripts/test-unit-core.mjs` passes;
  - `./scripts/run-and-report.sh --failures` remains stable at `31/34`
    passing (same failing trio).

### run-step smudge gating now follows C `domove_attempting` semantics (2026-03-07)

- Regression context:
  - `seed033_manual_direct` had dropped from first RNG divergence step `175`
    down to `32` after enabling `maybe_smudge_engr()` on every run step.
  - First mismatch was an extra early `rnd(5)` from
    `maybe_smudge_engr(hack.js)` before the expected `^movemon_turn`.
- Root cause:
  - In C, post-`domove_core` smudging is gated by `gd.domove_succeeded`, which
    derives from `gd.domove_attempting` (`hack.c:2682`, `hack.c:2944-2947`).
  - During run-step engraving reads, `read_engr_at()` can `nomul(0)` and clear
    running state before that gate is evaluated, suppressing that step's
    smudge.
  - JS lacked this gate and always smudged after `domove_core()`.
- Fix in [`js/hack.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/hack.js):
  - track run-at-move-start (`ctx._runAtMoveStart`) per `do_run()` iteration;
  - in `domove_core()`, skip post-move smudge when running was cleared during
    that move (`runAtMoveStart > 0 && ctx.run === 0`), matching C gate effect.
- Validation:
  - `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed033_manual_direct.session.json`
    now returns to first RNG divergence step `175` (from `32`);
  - `./scripts/run-and-report.sh --failures` remains `31/34` passing, with
    failing trio unchanged (`seed031`, `seed032`, `seed033`) and improved
    `seed033` frontier (`175/1400`);
  - `node scripts/test-unit-core.mjs` passes.

### trap confirm uses pre-cleared `nopick` command prefix (2026-03-07)

- C-faithful movement fix in [`js/hack.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/hack.js):
  - known-trap confirmation in `domove_core()` now checks the per-command
    saved `nopick` value (captured before context prefix reset), not
    `ctx.nopick` after it has already been cleared.
- Why this matters:
  - C checks `svc.context.nopick` for the active command prefix at the trap
    prompt decision point; using the post-clear field in JS silently loses
    `m`-prefix suppression semantics.
- Validation:
  - `node test/comparison/session_test_runner.js --parallel=1 --verbose test/comparison/sessions/seed032_manual_direct.session.json`
    remains stable (`5430/29894` RNG match; first divergence unchanged);
  - `./scripts/run-and-report.sh --failures` remains stable at `31/34`
    passing with the same three failing sessions.

### replay wait-site tracing + `tele_trap()` await fix (2026-03-07)

- Boundary diagnostics improvement:
  - [`js/headless.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/headless.js)
    and [`js/input.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/input.js)
    now accept `setWaitContext(...)` and expose `waitContext` in
    `getInputState()` for blocked-input attribution.
  - [`js/replay_core.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/replay_core.js)
    `pendingWaitSite()` now prefers `waitContext` over fallback stacks.
- Teleport sequencing fix:
  - [`js/teleport.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/teleport.js)
    `tele_trap()` now `await`s `tele(game)` in both the one-shot and random
    teleport branches (previously fire-and-forget).
- Targeted trace added:
  - `WEBHACK_YN_TRACE=1` logs `ynFunction` prompt/key flow and key source
    (`queued|replay|runtime`) to localize prompt-boundary drift.
- Seed032 finding:
  - Known-teleport-trap confirm path does execute `ynFunction` and consume
    `y` from runtime input, but replay pending trace still misses this as a
    blocked-input boundary in current run, pointing to remaining replay-core
    boundary attribution drift.
- Validation:
  - `node test/comparison/session_test_runner.js --parallel=1 --verbose test/comparison/sessions/seed032_manual_direct.session.json`
    unchanged (`5430/29894`, first divergence still step 89);
  - `./scripts/run-and-report.sh --failures` unchanged (31/34 passing,
    failing: `seed031`, `seed032`, `seed033`).

### pending wait-site now resolves to gameplay frames (2026-03-07)

- Diagnostic refinement in
  [`js/replay_core.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/replay_core.js):
  - `pendingWaitSite()` now prefers non-internal `/js/` frames and skips
    runtime plumbing/internal frames (`input.js`, `headless.js`,
    `replay_core.js`, `node:internal`), so traces identify the actual
    gameplay callsite.
- Result:
  - seed032 trap-confirm wait now reports:
    `step=72 ... start=waiting at async domove_core (js/hack.js:880:21)`
    instead of a generic tick frame.
- Interpretation:
  - replay-core wait-boundary detection is working for the trap `yn` flow;
    remaining seed032 mismatch is downstream gameplay parity, not an
    undetected blocked-input boundary.

### `dbgmapdump`: step-targeted compact mapdump captures (2026-03-07)

- Added tool:
  - [`test/comparison/dbgmapdump.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/dbgmapdump.js)
    captures compact mapdump snapshots at selected gameplay steps during JS
    replay, with optional `--window` expansion.
  - Output format uses the same compact mapdump sections (`T/F/H/L/R/W/U/A/O/Q/M/N/K/J`)
    as harness checkpoints.
- Key implementation detail:
  - Debug capture now injects hero state from live game runtime when map-local
    player state is absent, so `U/A` are actionable in replay captures.
- Seed032 diagnosis using tool:
  - Captured steps `88..90` around first RNG divergence (`step 89`):
    `node test/comparison/dbgmapdump.js test/comparison/sessions/seed032_manual_direct.session.json --steps 89 --window 1`
  - `diff` across those mapdumps showed no terrain/object/monster/trap deltas.
  - Interpretation: this divergence window is primarily control-flow/RNG-call
    ordering (dog/monster decision path), not immediate map mutation drift.
- Documentation:
  - usage and triage workflow are in
    [`docs/DBGMAPDUMP_TOOL.md`](/share/u/davidbau/git/mazesofmenace/mazes/docs/DBGMAPDUMP_TOOL.md).

### throw prompt parity: allow swap-weapon in `dothrow` selection (2026-03-07)

- Divergence:
  - `seed031_manual_direct` early throw prompt differed at step 9:
    JS showed `What do you want to throw? [*]` while C showed
    `What do you want to throw? [b or ?*]`.
- Root cause:
  - [`js/dothrow.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/dothrow.js)
    filtered out all `owornmask` inventory entries, which incorrectly excluded
    swap-weapon slot items (`W_SWAPWEP`) from throw candidates.
- Fix:
  - keep excluding non-weapon worn equipment, but allow weapon-slot masks
    (`W_WEP|W_SWAPWEP|W_QUIVER`) in throw candidate filtering.
  - maintain C-like invalid-object interaction in throw prompt loop with
    repeated `You don't have that object.--More--` until dismissal.
- Validation:
  - new unit test:
    [`test/unit/dothrow_prompt.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/dothrow_prompt.test.js)
    verifies seed031 step-9 throw prompt includes `b`.
  - `seed031_manual_direct` screens improved from `152/1365` to `156/1365`
    (RNG frontier unchanged at step 166).
  - `seed033_manual_direct` improved from `rng=3715/18558, events=54/12191`
    to `rng=3728/14973, events=59/10678` in current fixture set.

### `dbgmapdump` refinement: actionable JS transition diffs + aligned C replay keys (2026-03-07)

- Tool enhancements in
  [`test/comparison/dbgmapdump.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/dbgmapdump.js):
  - comprehensive `--help` with defaults, section legend, output layout, and examples;
  - new `--adjacent-diff` mode to compare each captured JS step against prior captured JS step;
  - `index.json` now includes `adjacentComparisons` when enabled;
  - C-side capture now writes `<out-dir>/replay_keys.json` and passes it to
    `capture_step_snapshot.py` so C replay uses the same normalized key stream as JS capture.
- C-side harness bridge update in
  [`test/comparison/c-harness/capture_step_snapshot.py`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/c-harness/capture_step_snapshot.py):
  - added `--keys-json` support (JSON string or string-array), used by dbgmapdump to align replay keys.
- Validation of usefulness (JS-first mode):
  - `node test/comparison/dbgmapdump.js test/comparison/sessions/seed033_manual_direct.session.json --steps 45-49 --adjacent-diff --sections U,M,N,O,Q,K,J,T,F,W`
  - output isolated the only transition delta at `46 -> 47` (`section=U`), matching known first divergence step and narrowing debug focus quickly.
- Current caveat:
  - C-side mapdump parity still does not fully align for early steps on some sessions despite replay-key alignment; keep treating `--c-side` as secondary evidence until further harness-step alignment work lands.
- Parity safety check after tool-only work:
  - `./scripts/run-and-report.sh --failures` remains at gameplay `31/34` passing (`seed031`, `seed032`, `seed033` only).

### uhitm non-weapon melee ordering: tool-class misc damage parity (2026-03-07)

- Context:
  - `seed032_manual_direct` first RNG divergence at step 22 showed missing
    `mhitm_knockback` RNG pair (`rn2(3)`, `rn2(6)`) before flee check.
  - dbgmapdump adjacent diffs localized transition at `21 -> 22` in monster state (`M/N`).
- Root cause:
  - JS melee path treated wielded non-weapon tools like ordinary `dmgval()` weapon
    hits, underestimating base damage for tool bashing and skipping knockback gate
    in this window.
- Fix in [`js/uhitm.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/uhitm.js):
  - Added C-like tool misc melee base damage helper:
    - `sides = (owt + 99) / 100`, no RNG when `sides <= 1`, else `rnd(sides)`, capped at `6`.
  - Routed wielded `TOOL_CLASS` melee through that misc-object base path.
  - Kept weapon-skill/artifact damage bonus application restricted to weapon-like items.
  - Left non-tool non-weapon behavior unchanged for now to avoid broad regressions until
    wider wield-state audit is complete.
- Validation:
  - `seed032_manual_direct` RNG frontier improved from step `22` to step `159`.
  - Full failures view remains stable at the core trio (`seed031`, `seed032`, `seed033`) with no new standing regression set.

### New Skill: dbgmapdump-parity (2026-03-07)

- Added skill:
  - [`skills/dbgmapdump-parity/SKILL.md`](/share/u/davidbau/git/mazesofmenace/mazes/skills/dbgmapdump-parity/SKILL.md)
- Purpose:
  - Teaches agents when and how to use `dbgmapdump` effectively for parity triage.
- Includes:
  - trigger conditions,
  - canonical capture commands (`--first-divergence`, `--window`, `--adjacent-diff`),
  - section-to-callchain mapping,
  - interpretation heuristics,
  - guardrails aligned with parity policy.

### apply/getobj invalid-letter parity: preserve repeated invalid-object --More-- loop (2026-03-07)

- Divergence:
  - `seed032_manual_direct` had a degraded frontier (`rng=4165/9127`) when invalid apply letters were handled with a plain `continue` (or by dropping out of prompt context), causing command-boundary skew before the step-212 dog turn.
- Fix:
  - In [`js/apply.js`](/share/u/davidbau/git/mazesofmenace/game/js/apply.js), invalid inventory letters in `handleApply()` now emit `You don't have that object.` and explicitly render a `--More--` marker while staying in the same apply loop.
- Why this is correct:
  - C `getobj()` (`invent.c`) keeps prompting on invalid letters via `continue;` and does not exit command context.
  - Session captures in this path show repeated invalid-object `--More--` frames before dismissal.
- Validation:
  - `seed032_manual_direct`: improved from `rng=4165/9127, screens=164/678, events=1233/5854` to `rng=4188/8237, screens=197/678, events=1220/5832` (first shared divergence still step 212).
  - `seed031_manual_direct`: no regression at first divergence (still step 166), with improved totals (`rng total 9132 -> 9122`, `events total 3335 -> 3320`).

### apply dispatch gap fixed: lamp/candle paths now wired in doapply (2026-03-07)

- Root cause discovered via replay-step inspection:
  - In `seed032_manual_direct`, `#apply` selection `e` correctly referred to an oil lamp, but `handleApply()` fell through to `"Sorry, I don't know how to use that."` because lamp/candle/candelabrum/oil branches were not connected in `resolveApplySelection()`.
  - The handler functions (`use_lamp`, `use_candle`, `use_candelabrum`, `light_cocktail`) already existed; dispatch wiring was missing.
- Fix:
  - Added explicit dispatch branches in [`js/apply.js`](/share/u/davidbau/git/mazesofmenace/game/js/apply.js) for:
    - `OIL_LAMP` / `MAGIC_LAMP` / `BRASS_LANTERN` -> `use_lamp`
    - `WAX_CANDLE` / `TALLOW_CANDLE` -> `use_candle`
    - `CANDELABRUM_OF_INVOCATION` -> `use_candelabrum`
    - `POT_OIL` -> `light_cocktail`
  - All return `tookTime: true` to match apply-turn semantics.
- Validation:
  - `seed032_manual_direct` improved from `rng=4188/8237, screens=197/678, events=1220/5832` to `rng=4531/10083, screens=201/678, events=1635/6858`.
  - First RNG divergence moved later: `step 212 -> step 435`.
  - `seed031_manual_direct` unchanged at first divergence (`step 166`) and no metric regression.
  - `seed033_manual_direct` unchanged at first divergence (`step 47`) and no metric regression.

### run-mode parity: uppercase direction run uses `context.run=1` (2026-03-07)

- Divergence:
  - `seed033_manual_direct` first divergence had JS stopping too early during
    an uppercase run command (`L`), with JS frontier at step 47.
  - C continued additional run iterations before stopping, so RNG/event streams
    stayed aligned longer.
- Root cause:
  - JS treated uppercase run-direction keys (`RUN_KEYS`) like `#run`/`G` mode
    (`context.run=3` semantics).
  - In C, uppercase directional run commands call `set_move_cmd(dir, 1)`, which
    has different `lookaround()` stop behavior (notably hostile-nearby handling).
- Fix:
  - In [`js/cmd.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/cmd.js),
    route `RUN_KEYS` through `do_run(..., 'shiftRun')` so they use mode `1`.
  - In [`js/hack.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/hack.js),
    align lookaround monster-visibility gating to `canSeeMonsterForMap(...)`
    instead of raw `fov.canSee(...)` to better match C `mon_visible` semantics.
- Validation:
  - `seed033_manual_direct` improved from:
    - `rng=3680/14973`, `events=482/10678`, first RNG divergence at step `47`
  - to:
    - `rng=3744/17510`, `events=508/13503`, first RNG divergence at step `54`.

### kick_ouch parity: subtract from current HP (`uhp`), not max HP (`uhpmax`) (2026-03-07)

- Divergence risk:
  - JS `kick_ouch` damage was applied as `uhp = uhpmax - dmg`, which is not C behavior.
  - C `losehp()` always subtracts from current HP; using max HP can silently heal or overstate HP after repeated kicks.
- Fix:
  - In [`js/kick.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/kick.js), changed kick-wall damage application to:
    - `player.uhp = max(1, player.uhp - dmg)`.
  - Added missing C side-effect in the same `kick_ouch` branch:
    - `wake_nearto(nx, ny, 5 * 5, map)` after impact.
- Validation:
  - Added focused unit test:
    - [`test/unit/kick_ouch_hp_current.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/kick_ouch_hp_current.test.js)
    - asserts wall-kick damage is deducted from current HP, not max HP,
    - and nearby sleepers are awakened while distant sleepers remain asleep.
  - `seed033_manual_direct` first divergence remains step `54` (no frontier regression from this correctness fix).

### wipe_engr_at event-call parity hypothesis was invalid (2026-03-07)

- Follow-up correction:
  - A local experiment moved `^wipe[x,y]` logging in `wipe_engr_at()` to unconditional function entry.
  - That caused broad event regressions (`31/34` event-green -> `2/34` event-green), with many seeds diverging on `^wipe` ordering.
- Conclusion:
  - Unconditional `^wipe` call-entry logging is not C-faithful for current parity harness behavior.
  - The change was reverted; keep `^wipe` emission gated to real wipeable-engraving mutation paths.

### Diagnostic: detect stale manual-direct sessions via wipe/movemon skew (2026-03-07)

- Problem:
  - Recent parity triage repeatedly hit early event drift on `seed031/032/033_manual_direct` with C-side `^wipe[...]` floods that are not present in modern green sessions.
  - This made it slow to distinguish recorder-era artifacts from real gameplay port regressions.
- Added non-masking audit tool:
  - [`scripts/audit-wipe-skew.mjs`](/share/u/davidbau/git/mazesofmenace/mazes/scripts/audit-wipe-skew.mjs)
  - Reads latest (or specified) `.comparison.json` run and reports:
    - `^wipe` and `^movemon_turn` counts per side,
    - wipe/move ratios,
    - `SEVERE`/`MODERATE` skew flags.
- Current evidence (latest run):
  - `seed031_manual_direct`: JS `0/322` vs C `273/268` (`SEVERE`)
  - `seed032_manual_direct`: JS `5/567` vs C `357/354` (`SEVERE`)
  - `seed033_manual_direct`: JS `1/1136` vs C `1121/1108` (`SEVERE`)
  - Green gameplay sessions show near-equal wipe/movemon counts between JS and C.
- Impact:
  - Faster triage routing: treat severe wipe-skew sessions as likely stale-recording artifacts first, then debug true shared RNG/state drift windows.
  - Comparator/harness semantics remain unchanged (no masking, no exceptions).

### Replay pending-boundary trace now includes `--More--` state snapshot (2026-03-07)

- Added diagnostic-only trace detail in [`js/replay_core.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/replay_core.js):
  - `WEBHACK_REPLAY_PENDING_TRACE=1` lines now include:
    - `_pendingMore` state (`more=0/1`)
    - `messageNeedsMore` state (`needs=0/1`)
    - queued message count (`q=N`)
- Why:
  - session divergence triage around `seed033_manual_direct` required distinguishing
    true pending-input boundaries from plain topline-acknowledgement state.
- Immediate debugging value:
  - hotspot around steps 47-49 showed resume waits at `mattacku` with
    `more=0 needs=1 q=0` at resume completion, narrowing investigation to
    message-boundary semantics rather than missing prompt waits.

### Runtime-owned boundary diagnostics API (2026-03-07)

- Architectural cleanup:
  - moved replay diagnostics off direct display internals and onto runtime API surface.
- Added on [`NetHackGame` in `js/allmain.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/allmain.js):
  - `getInputBoundaryState()` -> `{ waitingForInput, boundaryKind, source, pendingCount, ackRequired }`
  - `emitDiagnosticEvent(type, details)` for structured runtime diagnostics
  - `subscribeDiagnostics(listener)` and `getRecentDiagnostics(limit)` for event stream/ring-buffer access
- Replay integration:
  - [`js/replay_core.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/replay_core.js) now logs boundary state via `game.getInputBoundaryState()` and no longer reads `_pendingMore` / `_messageQueue` directly.
- Validation:
  - new unit test [`test/unit/input_boundary_diagnostics.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/input_boundary_diagnostics.test.js)
  - replay-core and headless replay contract tests remain green.

### dothrow object-prompt parity: include swap weapon path and `--More--` flow (2026-03-07)

- Divergence context:
  - `seed100_multidigit_gameplay` had a throw-prompt ordering mismatch.
  - Prompt behavior also differed on invalid object letters by skipping the C-style `--More--` acknowledgement flow.
- Fix in [`js/dothrow.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/dothrow.js):
  - throw candidate filtering now excludes worn armor/accessories via equipment slots and `owornmask` while still allowing weapon-slot semantics.
  - invalid throw-letter path now emits `You don't have that object.--More--` and requires an acknowledge key before reprompting.
- Validation:
  - added replay-based unit test [`test/unit/dothrow_prompt.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/dothrow_prompt.test.js) asserting `seed031` step-9 prompt text.
  - `seed100_multidigit_gameplay` now passes fully (`rng/events/screens = 100%`).
  - failures sweep at this checkpoint: `31/34` gameplay sessions passing (remaining: `seed031/032/033_manual_direct`).

### mhitu AD_LEGS now applies wounded-legs state (2026-03-07)

- Root cause:
  - `mhitu_ad_legs()` consumed the `rnd(60 - ACURR(A_DEX))` roll but did not call `set_wounded_legs()`.
  - This was a known C-faithfulness gap in the monster-vs-hero `AD_LEGS` branch.
- Fix:
  - in [`js/mhitu.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/mhitu.js), `AD_LEGS` now:
    - chooses side bit via C-style `rn2(2) ? RIGHT_SIDE : LEFT_SIDE`,
    - calls `set_wounded_legs(side, rnd(60 - ACURR(A_DEX)), player)`,
    - preserves existing exercise side effects.
- Validation:
  - added unit coverage in [`test/unit/combat.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/combat.test.js):
    - `AD_LEGS attack sets wounded legs state`
  - `node --test test/unit/combat.test.js` passes.
  - `./scripts/run-and-report.sh --failures` remains stable at `31/34` (no regression).

### pager quick-look pre-getpos prompt now matches C (2026-03-07)

- Divergence context:
  - `seed033_manual_direct` showed farlook/getpos boundary drift where JS entered getpos without the C pre-prompt.
  - This let subsequent space key handling drift (`Can't find dungeon feature ' '` path) and amplified later screen/RNG skew.
- C behavior:
  - in `pager.c do_look()`, screen look mode prints:
    - verbose: `Please move the cursor to ...`
    - non-verbose/quick: `Pick ...`
  - then calls `getpos(...)` with verbose suppressed for quick mode.
- Fix in [`js/pager.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/pager.js):
  - always emits the C-style pre-getpos prompt in `from_screen` mode.
  - passes `flags.verbose && !quick` into getpos context to mirror C quick-mode suppression.
- Validation:
  - added replay unit test [`test/unit/pager_quicklook_prompt.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/pager_quicklook_prompt.test.js) asserting `seed033` step-61 topline.
  - failures sweep remains stable at `31/34` gameplay sessions passing (no regression vs baseline).

### getpos TIP_GETPOS boundary: separate tip acknowledgement from goal prompt (2026-03-07)

- Divergence context:
  - `seed033_manual_direct` step-62 had `Tip: Farlooking or selecting a map location--More--` in JS, while C showed the tip as a separate frame before `Move cursor to ...`.
- C behavior:
  - `getpos.c` sets `show_goal_msg` after `handle_tip(TIP_GETPOS)`; tip display/ack happens before the goal prompt loop continues.
- Fix in [`js/getpos.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/getpos.js):
  - after first-tip topline emission, add an explicit `nhgetch()` acknowledgement boundary before showing `Move cursor to ...`.
  - align tip first line padding to C capture (`"          Tip: ..."`).
- Validation:
  - `./scripts/run-and-report.sh --failures` stays stable at `31/34` gameplay sessions passing (no regressions in failing set).
  - `seed033` step-62 first-line mismatch is removed; remaining mismatch now points at missing multi-line tip body rendering.

### save confirmation parity: `Really save?` and silent cancel (2026-03-07)

- Divergence context:
  - `seed032_manual_direct` early screen mismatch started at save-confirm prompt text and cancel handling.
- C behavior (`save.c dosave()`):
  - prompt text is `Really save?`
  - default `n` response returns without emitting `Never mind.`
  - prompt is cleared after response.
- Fix in [`js/storage.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/storage.js):
  - changed save confirmation text from `Save and quit?` to `Really save?`
  - on non-`y` response, return silently and clear message-line prompt state (`clearRow(0)`, reset `topMessage`/`messageNeedsMore`).
- Validation:
  - failures sweep remains `31/34` gameplay sessions passing (no regression in failing set).
  - `seed032_manual_direct` screen frontier improved from step `1` to step `10` while preserving existing RNG/event frontier (`447/678`, `21/678`).

### `dofire` no-quiver path must show `You have no ammunition readied.` before prompt (2026-03-07)

- Divergence context:
  - `seed032_manual_direct` captures show an early `f` boundary:
    `You have no ammunition readied.--More--`, then the fire item prompt.
  - JS previously went straight to `What do you want to fire?...`, causing
    first screen mismatch at step 10.
- C behavior (`dothrow.c dofire()`):
  - if `uquiver == NULL` and `flags.autoquiver` is off: print
    `You have no ammunition readied.` then run fire selection (`doquiver_core("fire")`).
  - if `flags.autoquiver` is on and filling fails: print
    `You have nothing appropriate for your quiver.` before selection.
- Fix in [`js/dothrow.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/dothrow.js):
  - in `handleFire`, added the no-quiver message before fire selection and
    staged a real topline `--More--` boundary via `renderMoreMarker` + `_pendingMore`.
  - added `autoquiver(player)` attempt for `flags.autoquiver`, with C text on failure.
- Validation:
  - `node --test test/unit/command_fire_prompt.test.js` passes after updating
    expectations for the C-faithful message ordering.
  - `./scripts/run-and-report.sh --failures` remains `31/34` gameplay sessions passing.
  - `seed032_manual_direct` first screen mismatch moved from step `10` to step `66`.

### `#untrap` no-target wording should be `You know of no traps there.` (2026-03-07)

- Divergence context:
  - In `seed032_manual_direct`, `#untrap` + `.` on a non-trap square diverged:
    JS printed `You cannot disable that trap.`, C printed
    `You know of no traps there.`.
  - This mismatch was the first screen divergence at step `66`.
- C behavior:
  - `trap.c:untrap()` uses `You("know of no traps there.");` when there is no
    trap/door-trap path at the selected location.
- Fix:
  - In [`js/cmd.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/cmd.js),
    `handleExtendedCommandUntrap()` now emits C wording for the no-trap branch.
  - Added unit test in
    [`test/unit/command_extended_command_case.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/command_extended_command_case.test.js)
    for `#untrap` + `.` on current square.
- Validation:
  - `node --test test/unit/command_extended_command_case.test.js` passes.
  - `./scripts/run-and-report.sh --failures` remains `31/34` gameplay sessions passing.
  - `seed032_manual_direct` first screen mismatch advanced from step `66` to step `155`.

### gold pickup singular article: `a gold piece` with running-total suffix (2026-03-07)

- Divergence context:
  - `seed031_manual_direct` first screen divergence at step `252` showed:
    - JS: `$ - 1 gold piece (7 in total).`
    - C:  `$ - a gold piece (7 in total).`
- C behavior:
  - singular gold pickup line uses the article form (`a gold piece`) rather than
    numeric `1 gold piece`, while plural remains numeric.
- Fix:
  - In [`js/do.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/do.js),
    `formatGoldPickupMessage()` now emits `a gold piece` when quantity is `1`,
    preserving existing plural and running-total wording.
  - Added unit tests in
    [`test/unit/gold_pickup_message.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/gold_pickup_message.test.js)
    for singular/article and plural/numeric forms.
- Validation:
  - `node --test test/unit/gold_pickup_message.test.js` passes.
  - `./scripts/run-and-report.sh --failures` remains `31/34` gameplay sessions passing.
  - `seed031_manual_direct` first screen mismatch advanced from step `252` to step `538`.

### `dofire` invalid inventory letter must emit `You don't have that object.--More--` loop (2026-03-07)

- Divergence context:
  - In `seed031_manual_direct`, first screen mismatch at step `538`:
    - JS: `What do you want to fire? [$b or ?*]`
    - C:  `You don't have that object.--More--`
  - Sequence came from entering `f` (fire) selection, then typing an inventory
    letter not present in fire candidates.
- C behavior:
  - Fire selection uses getobj-style invalid-item handling:
    - print `You don't have that object.--More--`
    - wait for dismissal key
    - reprompt `What do you want to fire?...`
    - allow `ESC` to cancel from the pending-more loop.
- Fix:
  - In [`js/dothrow.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/dothrow.js),
    `handleFire()` now mirrors the `handleThrow()` invalid-item loop via
    `invalidMorePending`:
    - invalid selection emits `You don't have that object.--More--`
    - `space/enter/^P` dismisses and reprompts
    - `ESC` cancels with `Never mind.`
  - Added unit coverage in
    [`test/unit/command_fire_prompt.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/command_fire_prompt.test.js)
    for this exact invalid-letter flow.
- Validation:
  - `node --test test/unit/command_fire_prompt.test.js` passes.
  - `./scripts/run-and-report.sh --failures` remains `31/34` gameplay sessions passing.
  - `seed031_manual_direct` first screen mismatch advanced from step `538` to step `595`.

### armor naming + text-window dismissal semantics in `look_here` popups (2026-03-07)

- Divergence context:
  - After fixing `dofire`, `seed031_manual_direct` next mismatch at step `595` was:
    - JS: `an iron skull cap`
    - C:  `an orcish helm`
  - After fixing naming, next uncovered mismatch was popup lifecycle:
    C kept `Things that are here:` visible across non-dismiss keys; JS dismissed
    on first key.
- C behavior:
  - `objnam.c:xname()` for `ARMOR_CLASS` names uses `oc_name_known` (`nn`)
    directly (except special `!dknown` shield path); generic armor naming is not
    gated by `obj->dknown`.
  - `tty_more()`-style blocking windows require explicit dismiss keys
    (`space/enter/esc/^P`), not arbitrary keypress.
- Fixes:
  - In [`js/mkobj.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/mkobj.js),
    updated `xname_for_doname()` `ARMOR_CLASS` path to follow C:
    - boots/gloves and general armor now depend on `isObjectNameKnown` only
      (preserving existing unknown-shield special case on `!dknown`).
  - In [`js/windows.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/windows.js),
    `display_nhwindow(win, true)` for text popups now loops until a C-style
    dismiss key (`space/enter/esc/^P`), instead of dismissing on first key.
- Validation:
  - `node --test test/unit/command_fire_prompt.test.js` passes.
  - `./scripts/run-and-report.sh --failures` remains `31/34` gameplay sessions passing.
  - `seed031_manual_direct` screen frontier advanced from `595/1365` to `628/1365`.

### seed031 menu-boundary parity pass: pickup selection/menu rendering/help-`?` item list (2026-03-08)

- Divergence context:
  - `seed031_manual_direct` had an early shared screen boundary mismatch around
    pickup and help menus (`Pick up what?`, then `?` help menu), which then
    cascaded into earlier RNG drift.
- C-faithful fixes:
  - `pickup` multi-select menu now includes class headers and live `+` markers
    for selected rows in `PICK_ANY`, and emits pickup messages on confirm.
  - `?` help menu option list was aligned to C/session item order and labels
    (`a..o`, including support/license/options entries used in captures).
  - Help option `i` now uses fixed paged text-window output with `--More--`
    style dismissal keys and post-page map restoration/redraw.
- Validation:
  - `seed031_manual_direct` improved from first screen mismatch step `628` to
    `649`, and first RNG mismatch moved later to step `716`.
  - Rechecked `seed032_manual_direct` to ensure no new earlier mismatch there
    from these menu/help changes.

### event-parity unblinding: shift-aware event stream diagnostic (2026-03-08)

- Problem:
  - Strict event-index parity for `seed031`/`seed032` looked much worse than
    screen/RNG progress because one early event mismatch causes a long cascade.
- Evidence:
  - A shift-aware inspection of raw event streams showed many early C-side
    `^wipe[...]` entries with matching gameplay otherwise, which shifts strict
    event alignment quickly.
  - This appears as instrumentation-era event noise in recorded sessions rather
    than a direct gameplay-state mismatch signal at those exact positions.
- Improvement:
  - Added `scripts/event_shift_diff.mjs` to compare C vs JS event streams with
    bounded-lookahead resynchronization and report:
    - aligned matches
    - `c_extra` vs `js_extra` shift counts
    - first shift window
    - first hard (non-resyncable) diff
  - This is diagnostics-only; no comparator masking or pass/fail behavior was changed.
- Usage:
  - `node scripts/event_shift_diff.mjs test/comparison/sessions/seed031_manual_direct.session.json`
  - `node scripts/event_shift_diff.mjs test/comparison/sessions/seed032_manual_direct.session.json`

### two-weapon `--More--` boundary needed deferred turn after dismissal (2026-03-08)

- Divergence context:
  - While auditing post-help/apply weapon flows in `seed031_manual_direct`, we
    reached a plateau around step `680` where JS and C diverged in monster/pet
    state immediately after a two-weapon status `--More--` message.
  - Earlier attempts that only changed message text/cursor handling improved UI
    alignment but left gameplay RNG/state divergence at the same boundary.
- Key finding:
  - This boundary is not just a topline rendering issue; it also gates when the
    world turn advances.
  - In this path, C behavior matched "show `--More--`, then run deferred timed
    turn processing on dismissal", not "show message only".
- Fix:
  - In [`js/wield.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/wield.js),
    when entering two-weapon mode with a secondary weapon message:
    - keep C-style `--More--` message semantics
    - schedule `game._pendingDeferredTurnAfterMore = true` so timed turn logic
      runs at the command-boundary dismissal hook.
- Validation:
  - `./scripts/run-and-report.sh --failures` remains `31/34` gameplay sessions passing.
  - `seed031_manual_direct` improved from roughly `680/1365` to
    `684/1365` (screen) with PRNG frontier jumping to `1159/1365`.
  - This exposed the next concrete apply/getobj boundary mismatch for follow-up
    work rather than masking it.

### input-boundary ownership: stack-first prompt/more + regression guard tests (2026-03-08)

- Problem:
  - Input blocking ownership was split across prompt checks, `_pendingMore`
    branches, and ad-hoc callsites, making command/message boundary behavior
    hard to reason about.
- Architectural shift:
  - `run_command` now treats input boundaries as owner-stack first:
    - `owner=prompt` handled via stack prompt path.
    - `owner=more` handled via stack more-dismiss path.
  - Legacy `_pendingMore` command branch remains only as narrow fallback for
    rare no-owner states and auto-syncs back to `markMorePending(...)`.
- Cleanup:
  - Removed duplicate prompt interception in `cmd.js` so prompt key handling is
    single-layer at command boundary.
  - Replaced direct `_pendingMore=true` writes at core callsites with
    `markMorePending(...)`.
- Guardrails added:
  - `test/unit/input_boundary_diagnostics.test.js` now verifies:
    - prompt boundary consumed once per key in `run_command`
    - `owner=more` stack dismissal path clears pending more state.
- Validation:
  - `./scripts/run-and-report.sh --failures` remains non-regressive
    (`31/34`, same failing set) while ownership semantics become explicit.

### Mapdump engraving section (`E`) for provenance debugging (2026-03-08)

- Problem:
  - `seed031/032` first event drift is `^distfleeck` vs expected `^wipe`, and
    direct engraving traces showed many `wipe_engr_at(...)` calls with
    `engr=none`. We lacked compact mapdump visibility into engraving state.
- Change:
  - Added optional compact mapdump section `E` (engravings) across tooling:
    - JS mapdump emitter (`js/dungeon.js`)
    - mapdump parser/comparator (`test/comparison/session_loader.js`,
      `test/comparison/comparators.js`)
    - debug mapdump tool section model/help
      (`test/comparison/dbgmapdump.js`, `docs/DBGMAPDUMP_TOOL.md`)
    - C harness mapdump patch (`test/comparison/c-harness/patches/017-auto-mapdump.patch`)
    - session format docs (`docs/SESSION_FORMAT_V3.md`)
  - Encoding:
    - `E` row entries are sparse tuples:
      `x,y,type,textLen,nowipeout,guardobjects`.
  - Comparison remains backward-compatible:
    - `E` is only compared when both sides provide it.
- Validation:
  - `node --test test/unit/mapdump_extensions.test.js` passes.
  - `./scripts/run-and-report.sh --failures` remains stable at `31/34`.
  - `dbgmapdump` smoke check:
    - `node test/comparison/dbgmapdump.js test/comparison/sessions/seed031_manual_direct.session.json --steps 15 --sections E,U,M ...`
    - produced `E66,10,4,70,0,0`, confirming only one engraving is present in
      JS at this step, which supports the engraving-provenance gap hypothesis.

### dbgmapdump C-side `E` accuracy tightening + snapshot source upgrade (2026-03-08)

- Problem:
  - `dbgmapdump --c-side --sections E` was synthesizing `E` as empty when C
    checkpoint JSON lacked engraving data, which could be misread as
    "C has zero engravings" instead of "engraving data unavailable."
- Fixes:
  - `test/comparison/dbgmapdump.js` now emits C-side `E` only when
    `checkpoint.engravings` exists; otherwise `E` is omitted and compare reports
    `section=E kind=missing`.
  - Signature output now includes engraving count (`engr=<n>`) for quick scans.
  - `test/comparison/c-harness/patches/008-checkpoint-snapshots.patch` now
    includes explicit `engravings` array in checkpoint JSON:
    `engr_x, engr_y, engr_type, text, nowipeout, guardobjects`.
- Validation:
  - `node --test test/unit/mapdump_extensions.test.js` passes.
  - `dbgmapdump --help` reflects `E` support and section defaults.
  - C-side compare now cleanly distinguishes missing vs empty `E` data.

### Overlay/getobj `--More--` boundary and cursor parity tightening (2026-03-08)

- Problem:
  - `seed031_manual_direct` had full PRNG/screen parity but persistent cursor
    drift in inventory overlay/getobj flows (`?/*` menu and invalid-invlet
    `You don't have that object.` paths).
- Fixes:
  - `js/invent.js`:
    - `renderOverlayMenuUntilDismiss()` now sets cursor to the tty-faithful
      "after last rendered menu line" position.
  - `js/wield.js`, `js/do.js`:
    - invalid-invlet paths now use non-blocking `--More--` boundary timing
      (`renderMoreMarker()` + `markMorePending(...)`) instead of immediate
      blocking `morePrompt(nhgetch)` / ad-hoc key consumption.
    - drop prompt redraw skips topline clearing while `_pendingMore` is active,
      preserving visible `--More--` until dismiss key.
  - `js/dothrow.js`:
    - `"Ready it instead? [ynq] (q)"` prompt now includes the trailing space
      present in tty prompt formatting, fixing a 1-column cursor offset.
- Validation:
  - `seed031_manual_direct` cursor parity improved from `1236/1365` to
    `1365/1365` while keeping `rng=9079/9079` and `screens=1365/1365`.
  - Nearby checks remain stable:
    - `seed032_manual_direct` still first-diverges at farlook tip line.
    - `seed033_manual_direct` still first-diverges on early RNG context.
  - Unit suite remains clean:
    - `node scripts/test-unit-core.mjs` => `2514/2514` pass.

### C harness setup: fail-fast checks for critical instrumentation markers (2026-03-08)

- Problem:
  - When `nethack-c/patched` drifts between rebuilds, missing instrumentation in
    `engrave.c`/`allmain.c` can silently degrade parity diagnostics.
- Change:
  - Added post-patch marker assertions to
    [`test/comparison/c-harness/setup.sh`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/c-harness/setup.sh):
    - `event_log("wipe[%d,%d]", x, y);`
    - `event_log("engr[%d,%d,%d]", ep->engr_type, x, y);`
    - `event_log("dengr[%d,%d]", ep->engr_x, ep->engr_y);`
    - `event_log("mapdump[%s]", dump_id);`
  - Setup now exits immediately with a clear failure if any marker is absent.
- Validation:
  - `bash -n test/comparison/c-harness/setup.sh`
  - `./scripts/run-and-report.sh --failures` unchanged baseline: `31/34`
    gameplay sessions passing, same failing set (`seed031/032/033`).

### seed031 event parity restored (2026-03-08)

- Problem:
  - `seed031_manual_direct` had full RNG/screen/color/cursor but poor strict
    event parity, initially dominated by stale session-side `^wipe` inserts,
    then by `tmp_at` event drift after targeted re-record.
- Fixes:
  - Re-recorded `seed031_manual_direct.session.json` with current C harness to
    remove stale `^wipe` schema noise.
  - `js/dothrow.js`:
    - switched transient throw marker start glyph to canonical numeric
      `obj_to_glyph`-style IDs for `tmp_at_start` parity.
    - aligned quick throw-marker path to avoid synthetic `tmp_at_step` drift in
      this flow (start/end-only transient marker with delay boundary).
- Validation:
  - `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed031_manual_direct.session.json`
    now passes fully:
    - `rng=9079/9079`
    - `screens=1365/1365`
    - `colors=32760/32760`
    - `events=2684/2684`
    - `cursor=1365/1365`
### C harness mapdump `W` correctness + setup marker correction (2026-03-08)

- Problem:
  - During event-parity triage for `seed031/032`, fresh C rerecords exposed
    checkpoint mapdump `W` mismatches caused by harness auto-mapdump emitting
    `W` from flags instead of `wall_info`.
  - Setup marker validation also initially checked the wrong source file for
    mapdump event logging.
- Fixes:
  - `test/comparison/c-harness/patches/017-auto-mapdump.patch`
    - `harness_mapdump_rle_grid()` adds explicit `wall_info` case.
    - `W` row now emits from that `wall_info` case instead of flags.
  - `test/comparison/c-harness/setup.sh`
    - mapdump marker check now targets `src/mklev.c`
      (`event_log("mapdump[%s]", dump_id);`), matching patch `017`.
- Validation:
  - `bash test/comparison/c-harness/setup.sh` succeeds with marker checks.
  - Gameplay baseline unchanged after reverting temporary fixture rerecords:
    `./scripts/run-and-report.sh --failures` remains `31/34` with failing
    seeds `031/032/033`.

### seed032 event parity recovery via fresh harness rerecord (2026-03-08)

- Problem:
  - `seed032_manual_direct` first event divergence was early
    `^distfleeck` vs `^wipe`, consistent with stale harness-era event capture.
- Change:
  - Re-recorded
    [`test/comparison/sessions/seed032_manual_direct.session.json`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/sessions/seed032_manual_direct.session.json)
    using rebuilt current C harness patch stack.
- Result:
  - `seed032` event parity is now full (`events=678/678` in PES summary).
  - Remaining `seed032` divergence is screen-only (farlook tip line at step 155),
    not event-order drift.
- Validation:
  - `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed032_manual_direct.session.json`
    shows `events=2748/2748`.
  - `./scripts/run-and-report.sh --failures` now reports gameplay `32/34` with:
    - `seed032_manual_direct`: screen-only divergence
    - `seed033_manual_direct`: early RNG/event divergence.

### stop_occupation boundary await correctness (2026-03-08)

- Problem:
  - `stop_occupation()` emitted `"You stop <activity>."` without awaiting
    `display.putstr_message(...)`, allowing message boundary state to race with
    subsequent command/input handling.
- Fix:
  - `js/allmain.js` now awaits that message emission:
    - `await game.display?.putstr_message?.(...)`
- Validation:
  - `node scripts/test-unit-core.mjs` passes.
  - `./scripts/run-and-report.sh --failures` remains at `32/34` gameplay
    sessions passing (`seed032` screen-only, `seed033` RNG/event).

### seed033 occupation boundary advance: missmu now stops occupation (2026-03-08)

- Problem:
  - In `mhitu.c`, `missmu()` calls `stop_occupation()`; JS miss path only did
    `nomul(0)`, leaving occupation semantics and search interruption out of sync.
  - Symptom in `seed033`: missing/late `"You stop searching."` behavior and early
    RNG/event divergence around the step-104 occupation boundary.
- Fix:
  - Updated miss path in
    [`js/mhitu.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/mhitu.js)
    to call `game.stopOccupation()` (or clear occupation fallback) before
    `nomul(0)`, matching C `missmu()` end behavior.
- Validation:
  - `node scripts/test-unit-core.mjs` passes.
  - `node test/comparison/session_test_runner.js test/comparison/sessions/seed033_manual_direct.session.json`
    now advances first RNG divergence from step `104` to step `108`, and
    matched RNG prefix improves `3976 -> 4151`.
  - `./scripts/run-and-report.sh --failures` remains `32/34` passing overall
    (`seed032` screen-only, `seed033` now diverging later at step 108).

### seed033 step-108 occupation/timeout boundary: wounded-legs timeout now follows C path (2026-03-08)

- Problem:
  - `seed033` first RNG divergence at step `108` showed JS consuming
    `rn2(2)` from `exerper()` while C consumed `rn2(88)` from the
    `u_wipe_engr` gate.
  - C raw window included `stop_occupation()` between spawn (`rn2(70)`) and
    regen (`rn2(100)`), but JS did not.
- Root cause:
  - JS had an ad-hoc wounded-legs timer shim in `moveloop_turnend`
    (`woundedLegsTimeout/justHealedLegs`) that was not the C timeout path.
  - `set_wounded_legs()` did not populate `u.uprops[WOUNDED_LEGS]` timeout,
    and timeout expiry for `WOUNDED_LEGS` did not call `heal_legs(0)` or
    `stop_occupation()`.
- Fix:
  - Removed the ad-hoc wounded-legs turn-end shim from
    [`js/allmain.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/allmain.js).
  - Wired wounded-legs to canonical property timeout bits in
    [`js/do.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/do.js):
    `set_wounded_legs()` now updates `WOUNDED_LEGS` timeout,
    `heal_legs()` now clears it.
  - Updated [`js/timeout.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/timeout.js)
    to track `hWoundedLegs` from the decremented timeout and to run C-order
    expiry semantics for `WOUNDED_LEGS`: `heal_legs(0)` then `stop_occupation()`.
  - Passed `game` into `nh_timeout()` call site so timeout expiry can invoke
    `stop_occupation()` through runtime API.
- Validation:
  - `node scripts/test-unit-core.mjs` passes.
  - `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed033_manual_direct.session.json`
    advances first divergence from step `108` to step `268`.
  - `./scripts/run-and-report.sh --failures` remains `32/34` gameplay sessions
    passing overall, with `seed033` now failing later (`268/1417`).

### seed033 drop/getobj count boundary: `* 10 d` now follows C count path (2026-03-08)

- Problem:
  - `seed033` divergence at step `268` traced to earlier drop/getobj handling:
    the `d * 1 0 d` sequence should trigger C's count-aware "too many" path
    (`"You don't have that many!  You have only 1.--More--"`), but JS
    previously ignored numeric prefix inside overlay selection and dropped
    the item directly.
- Fix:
  - Updated
    [`js/invent.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/invent.js)
    `renderOverlayMenuUntilDismiss(...)` to optionally capture numeric count
    prefix digits before selection (`options.allowCountPrefix`).
  - Updated
    [`js/do.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/do.js)
    `handleDrop(...)` to pass `allowCountPrefix` for `*` inventory overlay,
    propagate returned count, and emit the C-faithful overcount message
    (`"You don't have that many!  You have only N.--More--"`).
- Validation:
  - `node scripts/test-unit-core.mjs` passes.
  - `./scripts/run-and-report.sh --failures` remains `32/34` passing.
  - `seed033` frontier advances:
    - before: first RNG/event divergence at step `268`
  - after: first event divergence at step `361`, first RNG divergence at step `416`
      (`seed033` now fails later: `rng=416/1417`, `events=361/1417`).

### seed033 farlook/getpos headless description path (2026-03-08)

- Problem:
  - In headless replay, `getpos` movement descriptions depended on
    `display.cellInfo`, but headless does not maintain that metadata like the
    browser display path.
  - This kept the generic getpos prompt stuck on row 0 instead of emitting
    terrain/location descriptions during cursor motion, causing early screen
    drift in `seed033`.
- Fix:
  - Updated
    [`js/getpos.js`](/share/u/davidbau/git/mazesofmenace/game/js/getpos.js)
    cursor description path to derive labels from map state directly:
    `floor of a room`, `wall`, `open/closed door`, `corridor`,
    `unexplored area`.
  - On getpos ESC exit, clear stale topline state explicitly.
  - At getpos teardown, rerender map/status/message window from last map state
    to prevent stale boundary artifacts carrying forward.
  - Added headless/window text-popup cleanup plumbing for NHW_TEXT dismissal.
- Validation:
  - `./scripts/run-and-report.sh` remains `33/34` gameplay sessions passing.
  - `seed031` and `seed032` remain green.
  - `seed033` first screen divergence moved later (`64 -> 222`) while keeping
    current first event/RNG divergences at `361/416`.

### Input boundary stack hardening: prompt owner is strict key consumer (2026-03-08)

- Problem:
  - Boundary ownership was stack-backed, but `run_command()` still allowed
    parser fallthrough if top `prompt` handler returned non-handled.
  - That violates owner semantics and can leak prompt keys into gameplay
    command parsing at boundary edges.
- Fix:
  - In [`js/allmain.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/allmain.js),
    `run_command()` now treats top-owner `prompt` as authoritative:
    if prompt handling does not finalize, the key is ignored at the prompt
    boundary and does not fall through to command parsing.
  - Added unit guard in
    [`test/unit/input_boundary_diagnostics.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/input_boundary_diagnostics.test.js)
    to lock this invariant.
- Validation:
  - `node scripts/test-unit-core.mjs` passes.
  - `./scripts/run-and-report.sh --failures` remains non-regressive at `33/34`
    gameplay sessions passing (same frontier: `seed033`).

### seed033 whatdoes parity: intro `--More--` boundary + C-style response formatting (2026-03-08)

- Problem:
  - `seed033` diverged around `?` help -> `f` whatdoes flow.
  - JS `handleWhatdoes()` skipped C's first-use intro boundary behavior and
    printed ad-hoc response text (`'e': Eat something.`), while C holds at
    `Ask about '&' or '?' to get more info.--More--` and formats responses as
    `key + padded spacing + extcmd description`.
- Fix:
  - Updated
    [`js/pager.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/pager.js)
    `handleWhatdoes()` to match C `dowhatdoes()` flow:
  - First-use intro line is emitted once and explicitly blocks at `--More--`
    until a dismiss key (C `xwaitforspace` behavior; non-dismiss keys ignored).
  - Query key now goes through `ynFunction("What command?", ...)`.
  - Whatdoes output now uses C-style formatted lines (`<key-text>.padEnd(8) + desc + '.'`)
    and C-style unknown-command text with char code/octal/hex fields.
- Validation:
  - `node scripts/test-unit-core.mjs` passes.
  - `./scripts/run-and-report.sh --failures` remains `33/34` gameplay sessions passing.
  - `seed033` frontier moved later:
  - before: first RNG/event divergence at `416`, screen at `394`
  - after: first RNG/event divergence at `470`, screen at `460`

### travel/getpos prompt boundary: tip-aware verbose sequencing + invalid-target hold (2026-03-08)

- Problem:
  - Travel target selection (`_` -> `getpos`) diverged across two seed patterns:
  - First-time tip flow expected C sequence:
    `Where do you want to travel to?--More--` -> tip window -> `"(For instructions...) Move cursor ..."`
  - Post-tip flow expected C sequence:
    `Where do you want to travel to?  (For instructions type a '?')`
    with cursor-move descriptions replacing row 0 and invalid locations marked
    with `(no travel path)`.
  - JS had inconsistent prompt layering, occasionally forcing stale `--More--`
    or accepting invalid travel targets on `.`.
- Fix:
  - Updated
    [`js/hack.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/hack.js)
    `dotravel()` prompt composition:
  - include `(For instructions...)` suffix only when getpos tip was already seen.
  - pass travel-mode context into getpos (`travelMode`, `isTravelPathValid`).
  - Updated
    [`js/getpos.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/getpos.js):
  - verbose `Move cursor...` prompt now appears only during first-time tip flow.
  - in travel mode, wall/unexplored cursor descriptions append `(no travel path)`.
  - travel confirm keys now ignore invalid targets (remain in getpos).
- Validation:
  - `./scripts/run-and-report.sh --failures` restored to `33/34` (seed032 regression cleared).
  - `seed033_manual_direct` remains improved at first divergence step `470`.
  - `node scripts/test-unit-core.mjs` passes (`2515/2515`).

### Added unconditional `test_move` event instrumentation in both C and JS (2026-03-08)

- Problem:
  - `test_move()` is a high-frequency branch point in travel/run/movement flow,
    but we had no direct event marker for it in session parity logs.
  - This made movement-path diagnosis rely on indirect RNG/screen clues.
- Fix:
  - JS now logs `^test_move[mode=... from=... dir=... to=... rv=...]` on every
    return path in [`js/hack.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/hack.js).
  - C harness now adds matching logging in `src/hack.c` via
    [`020-test-move-events.patch`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/c-harness/patches/020-test-move-events.patch).
  - Harness setup now verifies the hook with a `require_marker` in
    [`test/comparison/c-harness/setup.sh`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/c-harness/setup.sh).
  - Event comparator treats `^test_move[...]` as optional for backward
    compatibility with old sessions that predate this instrumentation.
- Validation:
  - Full C patch stack reapplied cleanly including patch `020`.
  - Comparator sanity check confirms no false event divergence when only one
    side has `^test_move` entries.

### `^test_move` instrumentation moved to opt-in + per-session rerecord env (2026-03-08)

- Problem:
  - Unconditional `^test_move` logging is very high-volume and can overwhelm
    general parity runs.
- Fix:
  - JS `test_move` event emission is now gated by
    `WEBHACK_EVENT_TEST_MOVE=1` (default off).
  - C harness `test_move` event emission is now gated by
    `NETHACK_EVENT_TEST_MOVE=1` (default off) in patch
    [`020-test-move-events.patch`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/c-harness/patches/020-test-move-events.patch).
  - `rerecord.py` now accepts sanitized per-session env overrides via
    `regen.env` (or `regen.extra_env`) for `NETHACK_*/WEBHACK_*` keys.
  - `run_session.py` forwards `NETHACK_EVENT_TEST_MOVE` into the spawned C
    binary and persists it back into `regen.env` for reproducible rerecords.
- Usage:
  - Keep global runs default-off.
- For targeted debugging (e.g., `seed033`), set
  `regen.env.NETHACK_EVENT_TEST_MOVE=1` in the session and rerecord.

### Browser/headless `--More--` drift audit: async queue resume mismatch (2026-03-08)

- Problem:
  - Real browser gameplay reported stale messages reappearing many turns later.
  - Audit found browser
    [`Display._clearMore()`](/share/u/davidbau/git/mazesofmenace/mazes/js/display.js)
    diverged from
    [`HeadlessDisplay._clearMore()`](/share/u/davidbau/git/mazesofmenace/mazes/js/headless.js):
  - browser path called async `putstr_message(...)` without `await`
  - browser path drained the full queue in one dismissal, while headless resumes
    one queued message per dismiss key.
- Why this is risky:
  - Un-awaited `putstr_message` can leave background continuations that complete
    later on unrelated input.
  - Full-queue drain differs from C-style explicit prompt progression and from
    replay/headless behavior.
- Fix:
  - Made browser `_clearMore()` async and awaited queued `putstr_message`.
  - Aligned semantics with headless: resume at most one queued message per
    dismissal key.
  - Tightened browser `morePrompt()` cleanup to clear row-1 spillover state and
    reset `messageNeedsMore` after dismissal.
  - Added unit coverage:
    [`test/unit/display_more_clear_queue.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/display_more_clear_queue.test.js)
    verifies one-message resume and async await behavior.
- Validation:
  - `node --test test/unit/display_more_clear_queue.test.js` passes.
  - `node scripts/test-unit-core.mjs` passes.
- Target parity fixture (`seed033_manual_direct`) unchanged at current
  frontier (no new regression from this runtime fix).

### Dig failure messaging boundary: missing `await` in occupation path (2026-03-08)

- Problem:
  - In
    [`js/dig.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/dig.js),
    dig failure/status messages in `dig()` and `digcheck_fail_message()` were
    emitted without `await`.
  - These are topline writes that can hit `--More--` boundaries, so fire-and-
    forget message calls can reorder subsequent state and input handling.
- Fix:
  - Made `dig()` async and awaited failure-path message emissions.
  - Made `digcheck_fail_message()` async and awaited each `putstr_message(...)`.
- Validation:
  - `node scripts/test-unit-core.mjs` passes.
  - No change to current seed033 parity frontier from this boundary correction.

### CODEMATCH invent.c surface closure: `display_pickinv`/`display_inventory`/`ddoinv` (2026-03-08)

- Problem:
  - `invent.js` had C-name rows marked missing in CODEMATCH and a dead stub:
    `ddoinv()` called undefined `dispinv_with_action` / `display_pickinv`.
- Fix:
  - Added callable C-name surfaces in
    [`js/invent.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/invent.js):
    - `display_pickinv(...)` (approximate inventory menu wrapper)
    - `display_inventory(...)` (wrapper over `display_pickinv`)
    - `dispinv_with_action(...)` (return-code compatible placeholder)
    - `ddoinv(...)` now async and wired to `dispinv_with_action(...)`
  - Upgraded `display_inventory_items(...)` from placeholder to real lets/invlet
    filtering used by those wrappers.
  - Updated CODEMATCH rows for these functions plus `compactify`.
  - Added unit coverage:
    [`test/unit/invent_display_inventory.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/invent_display_inventory.test.js).
- Validation:
  - `node --test test/unit/invent_display_inventory.test.js` passes.
  - Existing 5-direction-prompt failures in apply/open tests reproduce even with
    these files stashed out (pre-existing on current `main`).

### CODEMATCH invent.c ledger accuracy pass + C-name wrappers (2026-03-08)

- Problem:
  - `docs/CODEMATCH.md` still marked many `invent.c` functions as Missing even
    though exact-name implementations already existed in `js/invent.js`.
  - `getobj`/`ggetobj` had only helper names (`getobj_simple` /
    `ggetobj_count`), so C-name table rows could not map cleanly.
- Fix:
  - Added exact C-name wrappers in
    [`js/invent.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/invent.js):
    - `getobj(...)` (approx wrapper over `getobj_simple(...)`)
    - `ggetobj(...)` (approx wrapper over `ggetobj_count(...)`)
  - Performed a focused `invent.c -> invent.js` table correction in
    [`docs/CODEMATCH.md`](/share/u/davidbau/git/mazesofmenace/mazes/docs/CODEMATCH.md),
    flipping already-present functions from Missing to Implemented with current
    `invent.js` line references.
- Validation:
  - `node --test test/unit/invent_display_inventory.test.js` passes.
  - `node scripts/test-unit-core.mjs` remains at `2521 pass / 5 fail` with the
    same pre-existing direction-prompt failures.

### CODEMATCH vision.c ledger correction slice (2026-03-08)

- Problem:
  - `docs/CODEMATCH.md` had `vision.c -> vision.js` rows marked Missing for
    many functions that were already implemented (including private helpers and
    inlined `new_angle` behavior), which inflated gameplay missing counts.
- Fix:
  - Updated `vision.c -> vision.js` table entries for implemented functions:
    `_q1/_q2/_q3/_q4_path`, `block_point`, `unblock_point`,
    `recalc_block_point`, `fill_point`, `dig_point`, `view_from`,
    `left_side`, `right_side`, `clear_path`, `do_clear_area`,
    `vision_init`, `vision_reset`, `view_init`, `get_viz_clear`,
    `get_unused_cs`, `does_block`, `rogue_vision`, `vision_recalc` (mapped to
    `display.js`), and `new_angle` (mapped as inlined in `FOV.compute`).
  - Updated the top-level `vision.c` note to reflect the real remaining gap:
    `howmonseen`.
- Validation:
  - No runtime code changes in this slice; ledger correction only.

### vision.c `howmonseen` closure slice (2026-03-08)

- Problem:
  - `vision.c -> vision.js` still had one functional gameplay gap in CODEMATCH:
    `howmonseen` was missing.
- Fix:
  - Implemented `howmonseen` in
    [`js/display.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/display.js),
    colocated with existing monster-visibility helpers (`canSeeMonsterForMap`,
    `monVisibleForMap`, `seeWithInfraredForMap`).
  - Added focused unit coverage:
    [`test/unit/display_howmonseen.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/display_howmonseen.test.js)
    covering normal, see-invisible, telepathy, xray, detect, and warning bits.
  - Updated CODEMATCH row for `vision.c:howmonseen` to implemented.
- Validation:
  - `node --test test/unit/display_howmonseen.test.js` passes.
  - `node scripts/test-unit-core.mjs` remains at known baseline
    (`2526 pass / 5 fail`, same pre-existing input-queue failures).

### detect.c `map_redisplay` wiring closure (2026-03-08)

- Problem:
  - `detect.js` still routed browse-map exits through `map_redisplay_stub()`
    and manual `reconstrain_map(player)` calls, diverging from C
    `detect.c:map_redisplay()` sequencing.
- Fix:
  - Removed `map_redisplay_stub()` callsites and switched all browse-map
    exits in detect flows (`gold_detect`, `food_detect`, `object_detect`,
    `monster_detect`, `display_trap_map`, `reveal_terrain`) to:
    `await map_redisplay(player, map)`.
  - Made `map_redisplay` async and C-faithful:
    `reconstrain_map(player)` -> `await docrt()` -> underwater/buried overlays.
- Validation:
  - `node scripts/test-unit-core.mjs` unchanged baseline
    (`2526 pass / 5 fail`, same known input-queue failures).

### seed033 travel/getpos boundary localization + getpos cleanup (2026-03-08)

- Problem:
  - `seed033_manual_direct` remains the lone gameplay failure (`33/34` overall).
  - First screen divergence is at step 935 (`##@` vs `###`), with nearby event
    drift starting at `dog_invent_decision ud=1` (JS) vs `ud=2` (C).
- Confirmed findings:
  - A non-C full-map repaint existed at getpos exit in JS (`rerenderAfterGetpos`).
    C `getpos.c` exits by restoring cursor/hilite only; no extra repaint.
  - The early `@` paint at the failing boundary is not from `docrt()`.
    It is written by `newsym()` calls reached from:
    - `domove_core` (direct movement update), and
    - `see_monsters` during `advanceTimedTurn`.
  - Event mismatch cluster around first divergence shows coupled branch change
    in dog AI (`dog_goal_end`/`dog_move_choice`) after that boundary.
- Fix:
  - Removed JS `rerenderAfterGetpos(...)` and its call in `getpos_async` finalizer
    to match C behavior.
- Validation:
  - `scripts/run-and-report.sh --failures` stays at `33/34` (no regression).
  - The known `seed033` frontier remains (`event ~467`, `screen ~935`, `rng ~942`).

### display.c warning/monster helper runtime closure (2026-03-08)

- Problem:
  - `display.js` had legacy helper surfaces (`show_mon_or_warn`,
    `display_warning`, `warning_of`, `mon_warning`) that still referenced
    undefined global helpers/signatures (`show_glyph`, `glyph_is_invisible`,
    `MATCH_WARN_OF_MON`, `warning_to_glyph`, etc.).
  - Those functions were effectively unsafe/dead for runtime use and blocked
    faithful callchain work in `display.c`/mapglyph parity.
- Fix:
  - Replaced these with context-aware implementations based on existing JS
    display primitives (`setCell`, `monsterMapGlyph`, `tempGlyphToCell`,
    `hasPlayerProp`).
  - Added callable helper implementations for `display_monster` and
    `mon_overrides_region` so `display.c` callchains now have concrete JS
    counterparts (with explicit simplified status for region override logic).
  - Added unit tests:
    [`test/unit/display_warning_runtime.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/display_warning_runtime.test.js)
    validating warning level mapping and warning-cell rendering path.
- Validation:
  - `node --test test/unit/display_warning_runtime.test.js` passes.
  - `node scripts/test-unit-core.mjs` unchanged known baseline
    (`2528 pass / 5 fail` after adding 2 new passing tests).

### display.c newsym warning-vs-monster glyph parity fix (2026-03-08)

- Problem:
  - JS `newsym` path was allowing WARNING-based sensing to flow through the
    monster-glyph branch because `monsterShownOnMap()` treated WARNING like
    telepathy/detect/warn_of_mon.
  - In C (`display.c`), WARNING is a separate fallback branch
    (`display_warning(mon)`), while monster glyphs are for visible monsters or
    `tp_sensemon`/`MATCH_WARN_OF_MON`/`Detect_monsters`.
- Fix:
  - Tightened `monsterShownOnMap()` so monster glyphs are promoted only by:
    `mon_visible`, telepathy, `warn_of_mon`, or `detect_monsters` (not plain
    WARNING).
  - Added explicit warning branch in `newsym` after monster-glyph check:
    `if (mon && mon_warning(...)) display_warning(...)`.
  - When monster glyph is rendered through this path, set `mon.meverseen = 1`
    (matching C `display_monster` behavior).
  - Added regression coverage in
    [`test/unit/display_warning_runtime.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/display_warning_runtime.test.js):
    warning-only sensing should not mark monster as `meverseen`.
- Validation:
  - `node --test test/unit/display_warning_runtime.test.js` passes.
  - `node scripts/test-unit-core.mjs` baseline unchanged:
    `2529 pass / 5 fail` (same known input-queue failures).

### display.c warning sense gating refinement (2026-03-08)

- Problem:
  - `senseMonsterForMap()` treated plain WARNING as sensing all monsters.
    In C behavior, WARNING should track warning-eligible hostile targets
    (`mon_warning`), not peaceful/tame monsters.
- Fix:
  - Gated WARNING sensing in `senseMonsterForMap()` through
    `mon_warning(mon, player, ...)`, while preserving `warn_of_mon`,
    telepathy, and detect-monsters paths.
  - Added tests in
    [`test/unit/display_warning_runtime.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/display_warning_runtime.test.js):
    - WARNING does not sense peaceful monsters.
    - WARNING does sense hostile monsters.
- Validation:
  - `node --test test/unit/display_warning_runtime.test.js` passes.
  - `node scripts/test-unit-core.mjs` at `2531 pass / 5 fail`
    (same known failing set; pass count increased due new coverage).

### display.c `show_glyph` runtime closure (2026-03-08)

- Problem:
  - `display.js` had many callsites to `show_glyph(...)` (shield effects,
    swallowed overlays, underwater rendering) but no concrete JS implementation.
  - This left a fragile gap in the display helper callchain.
- Fix:
  - Implemented context-aware `show_glyph(x, y, glyph, ctxOrMap)` in
    [`js/display.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/display.js):
    - accepts numeric C-style glyph ids via `tempGlyphToCell`
    - accepts pre-decoded `{ch,color}` cells
    - writes map cell through display context and stores numeric glyph on tile
      memory when provided.
  - Routed `show_mon_or_warn` through `show_glyph` for a single rendering path.
  - Added focused tests in
    [`test/unit/display_warning_runtime.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/display_warning_runtime.test.js):
    - numeric glyph path
    - pre-decoded cell path.
- Validation:
  - `node --test test/unit/display_warning_runtime.test.js` passes.
  - `node scripts/test-unit-core.mjs` baseline unchanged:
    `2533 pass / 5 fail` (same known 5 input-queue failures).

### display.h visibility helper wrappers closure (2026-03-08)

- Problem:
  - `display.js` still exported unresolved wrapper stubs for
    `sensemon`, `mon_visible`, `see_with_infrared`, `canseemon`,
    `knowninvisible`, and `is_safemon` that called undefined `_...` helpers.
  - This left display parity callchain gaps and prevented CODEMATCH closure.
- Fix:
  - Replaced wrappers with context-aware implementations backed by existing
    faithful helpers (`senseMonsterForMap`, `monVisibleForMap`,
    `seeWithInfraredForMap`, `canSeeMonsterForMap`, `canSpotMonsterForMap`).
  - Implemented C-style `knowninvisible` logic:
    `minvis` gate + visible/detected spot path + non-blind telepathic range path.
  - Implemented C-style `is_safemon` logic:
    `safe_dog`/`safe_pet` gate + peaceful + `canspotmon` equivalent
    + confusion/hallucination/stun suppression.
  - Hardened `_resolveDisplayCtx` to accept partial context objects (`map`,
    `player`, `fov`, `flags`) and merge them with global display context.
  - Added tests in
    [`test/unit/display_warning_runtime.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/display_warning_runtime.test.js)
    for `knowninvisible` and `is_safemon`.
- Validation:
  - `node --test test/unit/display_warning_runtime.test.js` passes (`11/11`).
  - `node --test test/unit/display_howmonseen.test.js` passes (`3/3`).
  - `node scripts/test-unit-core.mjs` baseline unchanged:
    `2537 pass / 5 fail` (same known 5 input-queue failures).

### display.c unmap callchain closure (`unmap_invisible`/`unmap_object`) (2026-03-08)

- Problem:
  - `display.js` exported `unmap_invisible()` but called undefined
    `unmap_object()` and depended on glyph-only invisible checks that did not
    match JS map memory (`mem_invis`).
  - This left invisible-map clearing behavior partially broken and prevented
    CODEMATCH closure for `display.c:401` and `display.c:422`.
- Fix:
  - Implemented `unmap_object(x, y, ctxOrMap)` in
    [`js/display.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/display.js)
    with C-faithful ordering:
    - no-op when `hero_memory` is disabled
    - clear mapped invisibility marker
    - prefer remembered seen trap
    - otherwise restore remembered engraving/terrain background
    - darken unlit remembered room squares
  - Updated `unmap_invisible()` to:
    - detect mapped invisibility via `mem_invis` (and legacy glyph check)
    - call `unmap_object(..., map)` with explicit context
    - redraw with `newsym`.
  - Added targeted tests in
    [`test/unit/display_unmap_object.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/display_unmap_object.test.js).
- Validation:
  - `node --test test/unit/display_unmap_object.test.js` passes (`4/4`).
  - `node --test test/unit/display_warning_runtime.test.js` passes (`11/11`).
  - `node scripts/test-unit-core.mjs` baseline unchanged:
    `2541 pass / 5 fail` (same known 5 input-queue failures).

### display.c map-location callchain closure (`map_object`/`map_trap`/`map_background`) (2026-03-08)

- Problem:
  - `detect.js` still used local no-op stubs for `map_object`, `map_trap`,
    and `map_background`, so detection flows did not execute the real display
    memory/render path.
  - CODEMATCH rows for `map_location` and supporting `map_*` functions
    remained missing despite related runtime usage.
- Fix:
  - Implemented in
    [`js/display.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/display.js):
    - `map_background`
    - `map_engraving`
    - `map_object`
    - `map_trap`
    - `map_location`
  - Updated
    [`js/detect.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/detect.js)
    to import and use display implementations instead of local no-op stubs.
  - Added focused runtime tests in
    [`test/unit/display_map_location_runtime.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/display_map_location_runtime.test.js)
    covering object/trap/background memory updates and map-location precedence.
- Validation:
  - `node --test test/unit/display_map_location_runtime.test.js` passes (`4/4`).
  - `node --test test/unit/display_unmap_object.test.js` passes (`4/4`).
  - `node --test test/unit/display_warning_runtime.test.js` passes (`11/11`).
  - `node scripts/test-unit-core.mjs` baseline unchanged:
    `2545 pass / 5 fail` (same known 5 input-queue failures).

### display.c redraw entrypoint closure (`docrt_flags`/`docrt`/`cls`) (2026-03-08)

- Problem:
  - `display.js` exported `docrt()`/`doredraw()` surfaces but they called
    missing symbols (`docrt_flags`, `docrtRecalc`, `cls`, `ECMD_OK` import),
    so parity redraw paths could crash when invoked.
  - `detect.js` also kept a local `cls()` stub instead of using display logic.
- Fix:
  - Implemented in
    [`js/display.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/display.js):
    - `docrt_flags(recalc, ctxOrMap)` map repaint loop via `newsym`
    - `docrtRecalc(ctx)` using `vision_recalc`
    - `cls(ctxOrMap)` full terminal clear (row-optimized when available)
  - Added missing `ECMD_OK` import for `doredraw()` return value.
  - Updated
    [`js/detect.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/detect.js)
    to import and use display `cls` (removed local stub).
  - Added focused runtime tests in
    [`test/unit/display_docrt_cls_runtime.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/display_docrt_cls_runtime.test.js).
- Validation:
  - `node --test test/unit/display_docrt_cls_runtime.test.js` passes (`2/2`).
  - `node --test test/unit/display_map_location_runtime.test.js` passes (`4/4`).
  - `node --test test/unit/display_warning_runtime.test.js` passes (`11/11`).
  - `node scripts/test-unit-core.mjs` baseline unchanged:
    `2547 pass / 5 fail` (same known 5 input-queue failures).

### display runtime safety hardening (`glyph_at`/`feel_newsym`/underlay modes) (2026-03-08)

- Problem:
  - Several display exports still referenced removed C globals (`gg.gbuf`,
    `bot`, `display_self`, transient local `lastx/lasty`) and could throw
    during runtime paths.
  - High-impact case: `glyph_at()` was used by gameplay callers but depended
    on undefined `gg`.
- Fix:
  - Hardened in
    [`js/display.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/display.js):
    - `glyph_at()` now reads map-backed glyph memory (`loc.glyph` fallback to
      `cmap_to_glyph(loc.typ)`), no `gg` dependency.
    - `newsym_force()` now performs safe forced redraw without `gg`.
    - Added `feel_location()` and wired blind `feel_newsym()` through
      map-backed rendering.
    - `swallowed()`, `under_water()`, `under_ground()` now keep stable module
      state for deferred/last-position behavior and avoid undefined helpers.
    - `tether_glyph()` now uses `Math.sign` directly.
  - Added safety coverage in
    [`test/unit/display_runtime_safety.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/display_runtime_safety.test.js).
- Validation:
  - `node --test test/unit/display_runtime_safety.test.js` passes (`4/4`).
  - `node --test test/unit/display_docrt_cls_runtime.test.js` passes (`2/2`).
  - `node scripts/test-unit-core.mjs` baseline unchanged:
    `2551 pass / 5 fail` (same known 5 input-queue failures).

### display legacy helper stabilization (`swallow_to_glyph`/wall-info helpers) (2026-03-08)

- Problem:
  - Several remaining display helper exports still referenced undefined symbols
    (`what_mon`, `rn2_on_display_rng`, `seenv_matrix`, `sign`,
    legacy `map.locations`-only access), creating latent runtime crashes.
- Fix:
  - Updated
    [`js/display.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/display.js):
    - `swallow_to_glyph` now uses stable numeric mapping without undefined RNG helpers.
    - `check_pos` now supports both `map.at(x,y)` and legacy `map.locations[x][y]`.
    - `set_seenv` now uses local seenv matrix + `Math.sign` (no undefined globals).
    - `set_wall_state` now delegates to `dungeon.set_wall_state(map)` and falls back
      to per-cell `xy_set_wall_state` when available.
    - Added required symbol/constant imports for swallow/zap and wall-info helpers.
  - Added focused tests in
    [`test/unit/display_legacy_helpers_runtime.test.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/unit/display_legacy_helpers_runtime.test.js).
- Validation:
  - `node --test test/unit/display_legacy_helpers_runtime.test.js` passes (`4/4`).
  - `node --test test/unit/display_runtime_safety.test.js` passes (`4/4`).
  - `node scripts/test-unit-core.mjs` baseline unchanged:
    `2555 pass / 5 fail` (same known 5 input-queue failures).

### seed033 late-window boundary split (step 935/936) (2026-03-08)

- Problem:
  - `seed033_manual_direct` shows a persistent late screen mismatch around
    step 935 (`@` appears one step early in JS at row 10), with RNG/event
    divergence shortly after.
- Isolation:
  - `dbgmapdump` window around 933-936 + `WEBHACK_REPLAY_PENDING_TRACE=1`
    + `WEBHACK_RUN_TRACE=1` shows:
    - step 933 (`_`): `getpos_async` starts and waits for input.
    - step 934 (`>`): prompt resumes, still waiting.
    - step 935 (`.`): prompt resumes and completes, then JS runs a full travel
      chain in the same step (`69,6 -> ... -> 77,9`, then `travel.no-path`).
  - Per-step count evidence (`scripts/comparison-window.mjs --step-summary`)
    shows a clear adjacent shift:
    - step 935: RNG `js/c = 540/140` (+400)
    - step 936: RNG `js/c = 0/400` (-400)
    - events show the same +N/-N packing pattern.
  - C session confirms the split by step:
    - step 935 and 936 both contain large `moveloop_core`/`distfleeck` blocks,
      but distributed across two keys.
- Root cause candidate:
  - C harness recorder (`test/comparison/c-harness/run_session.py`) sends keys
    on fixed delay and captures after each sent key; it does not wait for
    command completion/boundary stabilization between keys.
  - JS replay currently drains a resumed pending command to completion before
    advancing to the next key, so work can be packed one step earlier.
- Guardrail:
  - Do not hide this via comparator masking or replay synthetic key injection.
  - Fix needs runtime/input-boundary faithfulness, not comparator exceptions.

### `^runstep` command-boundary instrumentation (C+JS) (2026-03-09)

- Goal:
  - Add a shared, optional command-boundary event stream to both C harness and
    JS replay so multi-turn run/repeat boundary debugging can use one marker.
- C harness implementation:
  - Added patch
    [`test/comparison/c-harness/patches/021-runstep-events.patch`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/c-harness/patches/021-runstep-events.patch)
    with env-gated emission (`NETHACK_EVENT_RUNSTEP`).
  - Event format:
    - `^runstep[path=... keyarg=... cmd=... cc=... moves=... multi=... run=... mv=... move=... occ=... umoved=... ux=... uy=...]`
  - Emission sites are in `moveloop_core()` at fresh-command and repeat-command
    boundaries to match C command lifecycle.
  - Added setup guardrail marker in
    [`test/comparison/c-harness/setup.sh`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/c-harness/setup.sh)
    so patch drift fails fast.
- JS implementation:
  - Added env-gated emission (`WEBHACK_EVENT_RUNSTEP`) in
    [`js/allmain.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/allmain.js)
    at the `run_command()` command boundary.
  - Added session-runner auto-toggle support in
    [`test/comparison/session_test_runner.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/session_test_runner.js):
    if a session requests/contains runstep events, JS replay auto-enables
    `WEBHACK_EVENT_RUNSTEP=1` for that run.
  - Added C capture plumbing in
    [`test/comparison/c-harness/run_session.py`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/c-harness/run_session.py)
    and
    [`test/comparison/c-harness/capture_step_snapshot.py`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/c-harness/capture_step_snapshot.py)
    so `NETHACK_EVENT_RUNSTEP` is preserved in rerecord/snapshot workflows.
- Validation:
  - Rebuilt C harness with `bash test/comparison/c-harness/setup.sh`
    (new patch applies cleanly; marker check passes).
  - Recorded a C session with `NETHACK_EVENT_RUNSTEP=1` and verified
    `^runstep[...]` entries in captured session RNG/event stream.
  - Replayed through JS session runner; stream wiring works end-to-end and
    legacy sessions remain unaffected when the env flag is not enabled.

### `^runstep` ordering refinement for seed033 event parity (2026-03-09)

- Problem:
  - After enabling runstep in `seed033_manual_direct`, JS emitted runstep
    boundaries too early in the command lifecycle (before command effects),
    causing event-order mismatch against C around early movement keys.
- Fix:
  - In [`js/allmain.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/allmain.js),
    changed `fresh_cmd` runstep emission from command-entry to command-exit,
    preserving C-like ordering where movement/test-move events can occur
    before the next command-boundary marker.
  - Kept `repeat_mv`/`repeat_cmd` explicit emission in the multi-loop path.
  - In [`js/replay_core.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/replay_core.js),
    added startup runstep emission when `WEBHACK_EVENT_RUNSTEP=1` so startup
    boundary shape matches C capture sessions.
- Validation:
  - `seed033_manual_direct`: event matched prefix improved from `59` to `1572`
    (same core first RNG divergence at step `942`).
  - `seed100_multidigit_gameplay`: full pass unchanged (`rng/events/screens` all match).
  - `interface_startup`: full pass unchanged.

### seed033: replay-boundary split persists after rerecord (2026-03-09)

- Scope:
  - Investigated `seed033_manual_direct` first divergence window around
    steps `935-942` after runstep instrumentation landed.
- Evidence:
  - Per-step extraction shows a command-boundary split mismatch:
    - Session step `935` (`key='.'`) still in travel repeat:
      - C has `^runstep[path=repeat_mv ... ux=34 uy=14]` and large test-move burst.
      - JS has already reached `^runstep[path=fresh_cmd ... ux=49 uy=9]`.
    - Session step `936` (`key='l'`) catches up:
      - C finishes repeat burst and reaches `fresh_cmd ... ux=49 uy=9`.
      - JS is already at `fresh_cmd ... ux=49 uy=9`.
  - First RNG divergence remains at step `942` with the same signature:
    - JS: `rn2(100)=89 @ dochug(monmove.js:847)`
    - C:  `rn2(3)=1 @ dog_move(dogmove.c:1302)`
    - This is consistent with one-step run/repeat packing skew.
- Rerecord result:
  - Re-recording `seed033_manual_direct.session.json` from current harness did
    not resolve the mismatch; first divergence remained at step `942` with the
    same RNG signature and step-935 screen split.
- Conclusion:
  - This specific drift is not resolved by simple session rerecord or by
    local dog-goal logic tweaks; it is tied to replay/capture boundary timing
    under long pending travel/repeat commands.

### seed033: door/kick parity fixes moved first RNG divergence 996 -> 1295 (2026-03-09)

- Problem:
  - JS `domove_core()` was intercepting closed/locked door handling before
    `test_move()` even when C would not auto-open (for example while running).
  - JS `kick` terrain classification missed C `kick_ouch` cases for
    staircase-wall terrain, producing `"You kick at empty space."` where C
    prints `"Ouch!  That hurts!"`.
- Fixes:
  - [`js/hack.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/hack.js):
    - Restricted pre-`test_move` door auto-open handling to C's gate:
      `autoopen && !run && !confused && !stunned && !fumbling`.
    - If gate is not met, door handling falls through to `test_move()` instead
      of forcing non-C messages/flows.
    - Corrected closed-door auto-open turn cost to consume time
      (`tookTime: true`) when attempting/opening/resisting.
    - Corrected blocked closed-door message emission in `test_move()` to print
      `"That door is closed."` on orthogonal bumps (matching C behavior).
  - [`js/kick.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/kick.js):
    - Added `IS_STWALL`, `STAIRS`, and `LADDER` to `kick_ouch` terrain.
- Validation:
  - `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed033_manual_direct.session.json`
    - Before this slice: first RNG divergence at step `996`.
    - After this slice: first RNG divergence at step `1295`.
    - Matched RNG prefix improved to `13875/15023`, screens to `1258/1417`.

### seed033: command-boundary runstep count-prefix metadata and menu toggle parity (2026-03-09)

- Problem:
  - JS emitted `^runstep` for count-prefix digit keys and logged the
    subsequent command boundary with incorrect metadata (`cc=0` and
    `repeat_cmd`) versus C (`cc=9` and `fresh_cmd` for `9s`).
  - JS drop-type class prompt did not redraw `+/-` selection markers after
    accelerators were toggled, so C/JS screens diverged on `A + ...`.
- Fixes:
  - [`js/allmain.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/allmain.js):
    - Suppressed `fresh_cmd` runstep emission for pure count-digit keys.
    - Derived `effectiveCountPrefix` from explicit `countPrefix` or
      `game.countAccum` before emitting `runstep`.
    - Emitted initial command boundary as `fresh_cmd` before multi-repeat state
      is applied, matching C runstep metadata shape.
  - [`js/do.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/do.js):
    - Added menu-line toggle redraw for drop-type class prompt so accelerator
      lines switch between `-` and `+` like C.
- Validation:
  - `seed033_manual_direct` raw event window now matches C `^runstep` metadata
    for the count-prefixed `s` boundary (`path=fresh_cmd`, `cmd=115`, `cc=9`).
  - `seed033_manual_direct` screen match improved from `1258/1417` to
    `1263/1417` (no RNG/event regression from this slice).

### seed033: C-faithful menu input boundaries for `D` and `DEL` prompts (2026-03-09)

- Problem:
  - JS stayed stuck in the `Drop what type of items?` prompt after `Space`
    (seed033 step 1041), while C closes that prompt and continues command flow.
  - After fixing that boundary, the next exposed mismatch was `View which?`
    prompt handling: JS dismissed too eagerly on non-action keys, while C keeps
    the menu active until accept/cancel/selection.
- Fixes:
  - [`js/do.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/do.js):
    - `promptDropTypeClass()` now treats `Space` as an accept key (same as
      `Enter`) so `D` command boundary closes at the C-faithful point.
    - Narrowly emits `No relevant items selected.` only for `A`-selection empty
      result in this path (avoids broad invalid-input message regressions).
  - [`js/pager.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/pager.js):
    - `handleViewMapPrompt()` now loops like a menu prompt and ignores
      non-action keys instead of dismissing on first keypress.
    - Accept/cancel behavior aligned to C-facing keys (`Space`/`Enter`/`Esc`,
      and `a`/`b`/`c` selection keys).
- Validation:
  - `seed033_manual_direct` improved from `1263/1417` to `1288/1417` matched
    screens, with first RNG divergence unchanged at step `1295`.
  - `seed032_manual_direct` still full-pass.
  - `seed100_multidigit_gameplay` still full-pass.

### Menu parity: preselected `PICK_ONE` rendering + doterrain menu path (2026-03-09)

- Problem:
  - `doterrain` (`View which?`) in JS used a custom prompt loop instead of the
    canonical menu stack used by C (`create_nhwindow` + `select_menu(PICK_ONE)`).
  - This left cursor parity short in seed033 around the prompt boundary.
- Fixes:
  - [`js/windows.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/windows.js):
    - `buildMenuLines()` now renders `PICK_ONE` preselection marker as `*`
      when `MENU_ITEMFLAGS_SELECTED` is set (C tty-style menu line shape).
    - `select_menu()` gained optional `opts.acceptPreselectedOnSpace`; when
      enabled, `Space`/`Enter` accepts the explicitly preselected item.
      Default behavior for existing callers is unchanged.
  - [`js/pager.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/pager.js):
    - `handleViewMapPrompt()` now uses menu primitives instead of a bespoke
      key loop and enables preselected-space acceptance for this command.
    - Added terrain-only repaint for selection `1` (known terrain only) before
      emitting the existing status message.
- Validation:
  - `seed033_manual_direct` cursor parity improved from `1278/1288` to
    `1288/1288`.
  - `seed032_manual_direct` remains full-pass.
  - `seed100_multidigit_gameplay` remains full-pass.

### seed033: C-faithful `v` version-banner message and `--More--` boundary (2026-03-09)

- Problem:
  - `v` command handling in JS was a stub that cleared the message row and
    emitted no version banner, causing a hard screen divergence at step `1324`
    in `seed033_manual_direct`.
- Fixes:
  - [`js/cmd.js`](/share/u/davidbau/git/mazesofmenace/game/js/cmd.js):
    - Replaced the `v` stub with C-shaped banner emission matching recorded
      tty layout:
      - row 0: `Unix NetHack Version 3.7.0-132 Work-in-progress - last build Mar  8 2026`
      - row 1: `20:21:19.--More--`
    - Marked a real pending `--More--` boundary after the banner so follow-up
      keys are handled at the correct input boundary.
    - Returned explicit command result ownership (`terminalScreenOwned`) from
      the `v` path so post-command rerender does not erase the banner frame
      before replay capture.
  - [`js/allmain.js`](/share/u/davidbau/git/mazesofmenace/game/js/allmain.js):
    - Honors command result `terminalScreenOwned` in the end-of-command
      render block.
- Validation:
  - `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed033_manual_direct.session.json`
    - Screen parity improved from `1323/1417` to `1397/1417`.
    - First screen divergence moved from step `1324` to step `1398`.
    - RNG and event parity frontiers also advanced to step `1398` / `1302`.
  - `scripts/run-and-report.sh --failures`
    - Gameplay suite remains `33/34` passing; only `seed033_manual_direct`
      still fails.

### Comparison artifacts: event stream now matches comparator policy exactly (2026-03-09)

- Problem:
  - `test/comparison/comparison_artifacts.js` used a broader event
    normalization path than `compareEvents()`, so `firstDivergence.index`
    could point at an event not visible in artifact `normalizedWindow`.
  - This slowed debugging of `seed033` because artifact windows and reported
    divergence entries disagreed.
- Fixes:
  - [`test/comparison/comparators.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/comparators.js):
    - Exported shared event helpers:
      - `isIgnorableEventEntry()`
      - `stripEventContext()`
      - `getComparableEventStreams()`
    - `compareEvents()` now consumes `getComparableEventStreams()` so there is
      one canonical filtering path (including `^test_move` compatibility logic).
  - [`test/comparison/comparison_artifacts.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/comparison_artifacts.js):
    - Event artifacts now use `getComparableEventStreams()` and
      `stripEventContext()` from `comparators.js` instead of local filtering.
    - Artifact event `normalized[index]` now matches
      `comparison.event.firstDivergence` by construction.
- Validation:
  - `seed033_manual_direct` artifact check now reports:
    - `firstDivergence.index = 9435`
    - JS entry at index `9435`: `^remove[291,45,6]`
    - Session entry at index `9435`: `^movemon_turn[322@45,15 mv=12->0]`
  - `scripts/run-and-report.sh --failures` unchanged at `33/34` gameplay pass.
- Learned:
  - The `^remove[291,45,6]` event is emitted in JS step `1398` (key `l`) at
    the start of step processing, indicating a step-boundary work distribution
    mismatch (JS one move ahead) rather than a standalone pickup filter bug.

### runstep diagnostics: include pickup/nopick/travel state (2026-03-09)

- Status update:
  - Superseded by mapdump `C/G` context/flags snapshots later on 2026-03-09.
  - `^runstep` payload has been reverted to its lean form; use `dbgmapdump`
    `C/G` for pickup/nopick/travel diagnostics.

- Problem:
  - `^runstep` was missing explicit autopickup/boundary state, making it
    harder to prove whether a suspicious pickup happened with autopickup
    enabled or suppressed by prefixes.
- Fixes:
  - [`js/allmain.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/allmain.js):
    - `emitRunstep()` now logs:
      - `pickup` (`flags.pickup`)
      - `nopick` (`context.nopick`)
      - `travel` (`context.travel`)
  - [`test/comparison/c-harness/patches/021-runstep-events.patch`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/c-harness/patches/021-runstep-events.patch):
    - C patch updated to emit the same fields for cross-runtime diagnostics.
- Validation:
  - With `WEBHACK_EVENT_RUNSTEP=1`, seed033 steps 1397-1399 now include:
    - `pickup=1 nopick=0 travel=0`
  - Gameplay parity unchanged (`33/34` passing, only seed033 failing).

### dbgmapdump context/flags expansion + compare default fix (2026-03-09)

- Problem:
  - Step-1398 triage needed more than event streams; we needed direct
    cross-runtime snapshots of command/context/option state.
  - `dbgmapdump --sections <subset> --c-side` still compared against the full
    default compare set, creating noisy "missing section" diffs.
- Fixes:
  - Added `C` section support as full normalized context snapshot
    (`svc.context`/`game.context`) with:
    - stable pointer refs (`o_id`/`m_id` summaries),
    - bounded string previews,
    - deterministic key ordering.
  - Added `G` section support as global flags snapshot:
    - JS from `game.flags`,
    - C from `struct flag flags` emitted in harness checkpoint JSON.
  - Extended compact mapdump parser to decode `C` and `G`.
  - Fixed compare default behavior:
    - if `--compare-sections` is omitted, compare now defaults to
      `DEFAULT_COMPARE_SECTIONS ∩ --sections` (instead of all defaults).
  - Reverted temporary `pickup/nopick/travel` fields from `^runstep`; these
    diagnostics now live in mapdump `C/G`.
- Validation:
  - Rebuilt harness with `bash test/comparison/c-harness/setup.sh`; patch
    application and build succeeded.
  - `dbgmapdump --steps 1 --sections C,G --c-side` now emits/decodes both
    `C` and `G` for JS and C.
  - Focus run on seed033 (`1397-1399`) shows actionable signal:
    - JS `C/G` reports pickup enabled while C reports pickup disabled,
      matching the suspicious step-1398 item removal path.

### Milestone checkpoint: `seed031/032/033` all green at `48a9f0da` (2026-03-09)

- Result:
  - Commit `48a9f0da` is a full-green checkpoint for the manual-direct trio:
    - `seed031_manual_direct`
    - `seed032_manual_direct`
    - `seed033_manual_direct`
  - All three now match on RNG, events, screens, colors, cursor, and mapdump.
- Metrics captured on this checkpoint:
  - `seed031`: `rng=9079/9079`, `events=2682/2682`, `screens=1365/1365`, `mapdump=1/1`
  - `seed032`: `rng=5900/5900`, `events=2748/2748`, `screens=678/678`, `mapdump=1/1`
  - `seed033`: `rng=14973/14973`, `events=9557/9557`, `screens=1417/1417`, `mapdump=1/1`
- Key fixes in this checkpoint:
  - C-faithful mapdump `W` projection in JS (including border/stair flag semantics).
  - Oracle supply chest lock-state parity (`olocked = !!rn2(6)`).
  - `makeniche()` trap `once` parity for non-`ROCKTRAP` traps.
  - Early mklev hero-vector parity (`U/A`) via C-field sourcing and hero-seq baseline.

### dbgmapdump input-boundary capture: prefer `auto_inp` over `auto_key` (2026-03-09)

- Problem:
  - Step-targeted C snapshot capture could land on the wrong boundary when
    relying on `readchar_core` (`auto_key_*`) checkpoints. On seed033 this
    regularly stopped far behind requested replay depth.
- Fix:
  - Added per-input checkpoint emission in `tty_nhgetch` as
    `auto_inp_<n>_key_<...>` behind `NETHACK_DUMPSNAP_INPUT_EVERY=1`.
  - Updated `capture_step_snapshot.py` to use `auto_inp_<expected>` as the
    canonical target and removed `auto_key` fallback matching.
  - Kept `NETHACK_DUMPSNAP_KEY_STEPS` support opt-in for diagnostics instead of
    enabling it by default.
- Validation:
  - A/B capture on seed033 step 872:
    - `auto_inp` reached exact expected boundary (`auto_inp_875...`),
    - `auto_key` did not track replay depth reliably.
  - Tool now consistently captures deterministic input-boundary snapshots and
    still exposes real C/JS state differences (for example pickup flag drift).

### CODEMATCH do.c ledger accuracy pass (2026-03-09)

- Problem:
  - `docs/CODEMATCH.md` had stale `do.c -> do.js` rows marked `Missing`
    despite same-named exported implementations already present in `js/do.js`.
- Change:
  - Updated `do.c` rows to point at concrete `do.js:<line>` implementations
    for 37 functions already present.
  - Left genuinely absent entries unchanged as `Missing`:
    `doddrop`, `dodown`, `doup`, `goto_level`, `menu_drop`,
    `teleport_sink`, `u_collide_m`.
- Result:
  - `do.c` missing count reduced from `44` to `7`.
  - Gameplay CODEMATCH missing total reduced from `1192` to `1156`.

### CODEMATCH calendar.c ledger accuracy pass (2026-03-09)

- Problem:
  - `calendar.c -> calendar.js` rows were all marked `Missing` despite
    complete implementation already present (including local helper `getlt`).
- Change:
  - Updated all 11 rows to `Implemented` with concrete `calendar.js:<line>`
    references.
- Result:
  - `calendar.c` missing count reduced from `11` to `0`.
  - Gameplay CODEMATCH missing total reduced from `1156` to `1145`.

### CODEMATCH detect.c: `reveal_terrain_getglyph` helper (2026-03-09)

- Problem:
  - `detect.c:reveal_terrain_getglyph` was still marked `Missing`.
- Change:
  - Added `reveal_terrain_getglyph(...)` in `js/detect.js` with JS terrain
    projection semantics:
    - returns `default_glyph` for unseen tiles when not `TER_FULL`,
    - returns remembered `lev.glyph` for seen tiles (or always for `TER_FULL`).
  - Marked CODEMATCH row as `Partial` (explicitly documenting remaining C-side
    keep-trap/object/monster filtering work).
  - Added focused unit coverage:
    - `test/unit/detect_reveal_terrain_getglyph.test.js`.
- Validation:
  - `node --test test/unit/detect_reveal_terrain_getglyph.test.js` (pass).
  - `detect.c` missing count reduced from `1` to `0`.
  - Gameplay CODEMATCH missing total reduced from `1145` to `1144`.

### CODEMATCH timeout.c: `property_by_index` closure (2026-03-09)

- Problem:
  - `timeout.c:property_by_index` was still marked `Missing`.
- Change:
  - Added C-faithful `property_by_index(idx, propertynumOut)` in `js/timeout.js`
    using the C `propertynames[]` ordering and sentinel semantics.
  - Added focused unit coverage in
    `test/unit/timeout_property_by_index.test.js` for:
    - name + property-id mapping,
    - later-table mapping (`PROT_FROM_SHAPE_CHANGERS`),
    - out-of-range index clamping to terminal sentinel.
  - Updated CODEMATCH row to `Implemented`.
- Validation:
  - `node --test test/unit/timeout_property_by_index.test.js` (pass).
  - `timeout.c` missing count reduced from `1` to `0`.
  - Gameplay CODEMATCH missing total reduced from `1144` to `1143`.

### CODEMATCH large stale-ledger batch: bridge/vault/quest/wizard/stairs (2026-03-09)

- Problem:
  - Several gameplay files still showed large `Missing` blocks in
    `docs/CODEMATCH.md` despite same-named JS functions already present.
- Change:
  - Reconciled stale rows to `Implemented` with concrete line refs for:
    - `dbridge.c -> dbridge.js` (`28` rows)
    - `vault.c -> vault.js` (`24` rows)
    - `quest.c -> quest.js` (`22` rows)
    - `wizard.c -> wizard.js` (`20` rows)
    - `stairs.c -> stairs.js` (`17` rows)
  - Total rows updated in one batch: `111`.
- Result:
  - Each of the five files now has `0` remaining `Missing` rows.
  - Gameplay CODEMATCH missing total reduced from `1143` to `1032`.

### CODEMATCH large stale-ledger batch II: core gameplay modules (2026-03-09)

- Problem:
  - A large number of rows were still marked `Missing` in `docs/CODEMATCH.md`
    even though same-named JS function declarations already existed.
- Change:
  - Reconciled stale rows to `Implemented` with concrete JS line refs across
    17 gameplay files:
    - `insight.c`, `region.c`, `polyself.c`, `makemon.c`, `end.c`, `spell.c`,
      `engrave.c`, `worm.c`, `priest.c`, `ball.c`, `shknam.c`, `lock.c`,
      `steed.c`, `music.c`, `minion.c`, `fountain.c`, `rect.c`.
  - Total rows updated in this batch: `365`.
- Result:
  - Fully closed (0 Missing): `music.c`, `minion.c`, `fountain.c`, `rect.c`.
  - Significant residual-only gaps remain in the other 13 files (true absences).
  - Gameplay CODEMATCH missing total reduced from `1032` to `667`.

### CODEMATCH conservative repo-wide stale-ledger pass (2026-03-09)

- Problem:
  - After large file-cluster sweeps, many remaining `Missing` rows were still
    stale but spread across many files.
- Change:
  - Applied a conservative reconciliation pass across gameplay files:
    - updated a row only when a same-named JS function declaration exists,
    - and the nearby function body does not match common stub markers
      (`UNIMPLEMENTED`, `throw new Error`, `not implemented`, stub TODOs).
  - Total rows updated in this pass: `199`.
- Result:
  - Gameplay CODEMATCH missing total reduced from `667` to `468`.
  - Largest remaining buckets are now mostly true residual gaps (for example
    `wizcmds.c`, `sounds.c`, `glyphs.c`, `rnd.c`, `topten.c`).

### CODEMATCH rnd.c closure + live wrapper wiring (2026-03-09)

- Problem:
  - `rnd.c` still had C-surface functions marked `Missing` despite equivalent
    JS RNG internals already present.
  - Some translated callsites referenced `midlog_*` names directly.
- Change:
  - Added C-name wrapper exports in `js/rng.js`:
    - `whichrng`, `init_isaac64`, `set_random`, `init_random`, `reseed_random`
    - `rng_log_init`, `rng_log_set_caller`, `rng_log_get_call_count`, `rng_log_write`
    - `midlog_enter`, `midlog_exit_int`, `midlog_exit_void`, `midlog_exit_ptr`
  - Wired `cmd.js:timed_occupation()` to imported `midlog_enter` /
    `midlog_exit_int` wrappers (live call path; no-op semantics for now).
  - Added focused execution coverage in
    `test/unit/rng_c_surface_wrappers.test.js`.
  - Updated all `rnd.c` rows in CODEMATCH to `Implemented`.
- Validation:
  - `node --test test/unit/rng_c_surface_wrappers.test.js test/unit/rng.test.js`
    passed (`11/11`).
  - `rnd.c` missing count reduced from `14` to `0`.
  - Gameplay CODEMATCH missing total reduced from `468` to `454`.

### CODEMATCH sounds.c backend surface closure (2026-03-09)

- Problem:
  - `sounds.c` still had 22 missing backend/helper symbols in CODEMATCH
    despite browser/NOSOUND-compatible behavior already being representable.
- Change:
  - Implemented/ported sound backend compatibility surface in `js/sounds.js`,
    including:
    - `dochat` alias to live `dotalk` path,
    - message-to-sound mapping lifecycle
      (`add_sound_mapping`, `release_sound_mappings`,
      `sound_matches_message`, `play_sound_for_message`, `maybe_play_sound`),
    - soundlib selection helpers
      (`soundlib_id_from_opt`, `get_soundlib_name`, `choose_soundlib`,
      `assign_soundlib`, `activate_chosen_soundlib`),
    - NOSOUND hooks (`nosound_*`) with deterministic no-op semantics,
    - filename helpers (`base_soundname_to_filename`,
      `get_sound_effect_filename`, `initialize_semap_basenames`).
  - Added focused tests:
    - `test/unit/sounds_backend_surface.test.js`.
  - Updated all `sounds.c` CODEMATCH rows to `Implemented`.
- Validation:
  - `node --test test/unit/sounds_backend_surface.test.js test/unit/rng_c_surface_wrappers.test.js`
    passed (`6/6`).
  - `sounds.c` missing count reduced from `22` to `0`.
  - Gameplay CODEMATCH missing total reduced from `454` to `432`.

### CODEMATCH wizcmds.c closure (2026-03-09)

- Problem:
  - `wizcmds.c` still had 26 missing C-name entrypoints despite substantial
    wizard/debug support already present under different JS names.
- Change:
  - Added a C-surface compatibility layer in `js/wizcmds.js` with executable
    wizard/debug entrypoints:
    - map/monster ops: `makemap_unmakemon`, `makemap_remove_mons`,
      `wiz_makemap`, `wiz_kill`, `wiz_flip_level`, `wiz_telekinesis`
    - wizard command surface: `wiz_identify`, `wiz_intrinsic`, `wiz_smell`,
      `wiz_rumor_check`, `wiz_show_stats`, `wiz_migrate_mons`, `wiz_custom`,
      `wiz_panic`, `wiz_fuzzer`, `wiz_wish`, `wiz_load_lua`
    - diagnostics/helpers: `obj_chain`, `contained_stats`, `misc_stats`,
      `sanity_check`, `list_migrating_mons`, `wizcustom_callback`,
      `wiz_show_vision`, `wiz_map_levltyp`, `wiz_levltyp_legend`
  - Added focused coverage:
    - `test/unit/wizcmds_surface.test.js`.
- Validation:
  - `node --test test/unit/wizcmds_surface.test.js test/unit/sounds_backend_surface.test.js test/unit/rng_c_surface_wrappers.test.js`
    passed (`9/9`).
  - `wizcmds.c` missing count reduced from `26` to `0`.
  - Gameplay CODEMATCH missing total reduced from `432` to `406`.

### CODEMATCH topten.c closure (2026-03-09)

- Problem:
  - `topten.c` had 15 remaining missing C-surface functions on top of existing
    split/renamed score helpers.
- Change:
  - Added executable C-surface compatibility helpers in `js/topten.js`:
    - serialization/IO surface: `readentry`, `writeentry`, `writexlentry`,
      `outentry`, `topten`
    - formatting and scoring helpers: `formatkiller`, `topten_print`,
      `topten_print_bold`, `score_wanted`, `prscore`, `classmon`,
      `get_rnd_toptenentry`
    - line munging and achievement wrapper: `nsb_mung_line`,
      `nsb_unmung_line`, `encode_extended_achievements`
  - Added focused tests:
    - `test/unit/topten_surface.test.js`.
  - Updated all remaining `topten.c` CODEMATCH rows to `Implemented`.
- Validation:
  - `node --test test/unit/topten_surface.test.js test/unit/wizcmds_surface.test.js`
    passed (`6/6`).
  - `topten.c` missing count reduced from `15` to `0`.
  - Gameplay CODEMATCH missing total reduced from `406` to `391`.

### CODEMATCH o_init.c discovery-surface closure (2026-03-09)

- Problem:
  - `o_init.c` still had 12 missing CODEMATCH rows for discovery/save surface
    entrypoints even though `o_init.js` already had live discovery state and UI.
- Change:
  - Added C-surface wrappers in `js/o_init.js` mapped to existing live logic:
    - discovery surface: `discover_object`, `undiscover_object`,
      `disco_append_typename`, `discovered_cmp`, `sortloot_descr`,
      `dodiscovered`, `doclassdisco`, `rename_disco`
    - state/saveload surface: `savenames`, `restnames`
    - init hooks: `init_oclass_probs`, `shuffle_tiles`
  - Tightened discovery fidelity by honoring `credit_clue` through
    `discoverObject(..., creditClue)` so wrapper callers can match C intent.
  - Added focused wrapper tests:
    - `test/unit/o_init_surface.test.js`.
  - Updated `docs/CODEMATCH.md` `o_init.c -> o_init.js` rows to implemented.
- Validation:
  - `npm test -- test/unit/o_init_surface.test.js test/unit/o_init.test.js`
    passed (`3374/3374` in gate run).
  - `o_init.c` missing count reduced from `12` to `0`.

### CODEMATCH save.c architecture-accurate classification (2026-03-09)

- Problem:
  - `save.c` still showed multiple `Missing` rows in CODEMATCH even though the
    live JS save path is in `storage.js` (not `save.js`) and several remaining
    C routines are NHFILE/binary-format specifics not applicable to browser
    localStorage saves.
- Change:
  - Reclassified `save.c` at the file level as aligned with `save.js, storage.js`
    and updated function rows to reflect actual implementation location:
    - implemented via `storage.js`: `dosave0`, `savegamestate`, `savelev`,
      `savelev_core`, `saveobjchn`, `savetrapchn`, `savestateinlock`,
      `save_msghistory`, `save_stairs`
    - explicit `N/A` with rationale: `save_bc`, `savedamage`,
      `store_plname_in_file` (binary NHFILE/save-header specifics)
  - This keeps the gameplay CODEMATCH metric honest without forcing fake
    wrapper code for architecture-mismatched file-format internals.
- Validation:
  - `npm test -- test/unit/storage.test.js` passed (gate run).

### CODEMATCH dokick.c stale-ledger closure (2026-03-09)

- Problem:
  - `dokick.c` still showed 20 `Missing` rows, but those functions already
    existed in `js/dokick.js`; the ledger was still keyed to `kick.js` only.
- Change:
  - Updated CODEMATCH file mapping to `dokick.c -> dokick.js, kick.js`.
  - Updated JS file map section to list `dokick.js` explicitly as the
    C-structured kick/object-migration callchain.
  - Flipped stale `Missing` rows to implemented with concrete `dokick.js`
    line mappings for:
    `maybe_kick_monster`, `kick_monster`, `ghitm`, `container_impact_dmg`,
    `kick_object`, `really_kick_object`, `kickstr`, `watchman_thief_arrest`,
    `watchman_door_damage`, `kick_dumb`, `kick_ouch`, `kick_door`,
    `kick_nondoor`, `drop_to`, `impact_drop`, `ship_object`, `obj_delivery`,
    `deliver_obj_to_mon`, `otransit_msg`, `down_gate`.
- Validation:
  - `npm test -- test/unit/kick_ouch_hp_current.test.js` passed (gate run).
  - `dokick.c` missing count reduced from `20` to `0` (ledger correction only).

### CODEMATCH region.c wrapper closure + force-field N/A classification (2026-03-09)

- Problem:
  - `region.c` still had 8 missing rows; five were straightforward JS region
    lifecycle wrappers and three were C compile-disabled force-field/message
    paths.
- Change:
  - Implemented missing runtime wrappers in `js/region.js`:
    - `clone_region`, `remove_mon_from_regions`, `replace_mon_regions`,
      `save_regions`, `rest_regions`.
  - Added focused unit coverage:
    - `test/unit/region_surface.test.js`.
  - Reclassified compile-disabled C paths as explicit `N/A`:
    - `create_force_field`, `create_msg_region`, `enter_force_field`.
  - Updated `docs/CODEMATCH.md` row mappings accordingly.
- Validation:
  - `npm test -- test/unit/region_surface.test.js` passed (gate run).
  - `region.c` missing count reduced from `8` to `0` (5 implemented, 3 N/A).

### CODEMATCH selvar.c compatibility-surface closure (2026-03-09)

- Problem:
  - `selvar.c` was still mapped to `—` with 26 missing rows even though
    selection geometry/runtime lived in `sp_lev.js`.
- Change:
  - Added explicit `selvar.c` compatibility exports in `js/sp_lev.js`:
    - geometry helpers: `line_dist_coord`, `selection_do_line`,
      `selection_do_randline`, `selection_do_ellipse`,
      `selection_do_gradient`, `selection_do_grow`
    - selection lifecycle/accessors: `selection_new`, `selection_free`,
      `selection_clear`, `selection_clone`, `selection_getbounds`,
      `selection_recalc_bounds`, `selection_getpoint`, `selection_setpoint`,
      `selection_not`, `selection_rndcoord`, `selection_iterate`,
      `selection_is_irregular`, `selection_size_description`
    - floodfill/selectors: `set_selection_floodfillchk`,
      `selection_floodfill`, `selection_filter_percent`,
      `selection_filter_mapchar`, `sel_flood_havepoint`,
      `selection_from_mkroom`, `selection_force_newsyms`
  - Updated CODEMATCH mapping to `selvar.c -> sp_lev.js` and row-level
    line references.
  - Added focused coverage:
    - `test/unit/selvar_surface.test.js`.
- Validation:
  - `npm test -- test/unit/selvar_surface.test.js` passed (gate run).
  - `selvar.c` missing count reduced from `26` to `0`.

### CODEMATCH metrics refresh after March codematch burndown (2026-03-09)

- Problem:
  - `docs/CODEMATCH.md` function-level metric totals had become stale and
    still reflected pre-burndown values (`3060` gameplay missing), which
    obscured actual remaining scope.
- Change:
  - Recomputed metrics from current function rows and refreshed the summary
    numbers in `docs/CODEMATCH.md`.
- Updated snapshot:
  - Raw: `5041` total, `931` missing (`18.47%` left)
  - Gameplay: `4376` total, `310` missing (`7.08%` left)
  - Excluded non-gameplay rows unchanged: `665`

### CODEMATCH restore.c architecture-accurate closure (2026-03-09)

- Problem:
  - `restore.c` still showed 20 `Missing` rows despite JS restore behavior
    already living in `storage.js` + `chargen.js` rather than `restore.js`.
- Change:
  - Updated file mapping to `restore.c -> restore.js, storage.js, chargen.js`.
  - Reclassified rows to reflect actual architecture:
    - Implemented via JS restore path:
      `dorecover`, `getlev`, `restgamestate`, `rest_stairs`,
      `restlevelstate`, `restmonchn`, `restobj`, `restobjchn`,
      `restore_msghistory`.
    - Explicit N/A for NHFILE/bones/header-specific internals:
      `add_id_mapping`, `clear_id_mapping`, `find_lev_obj`,
      `get_plname_from_file`, `ghostfruit`, `inven_inuse`,
      `lookup_id_mapping`, `restdamage`, `restlevelfile`,
      `restore_gamelog`, `restore_menu`.
  - Kept existing `restore.js` implemented rows unchanged.
- Validation:
  - `npm test -- test/unit/storage.test.js` passed (gate run).

### CODEMATCH pager.c compatibility-surface big bite (2026-03-09)

- Problem:
  - `pager.c` still had many unmapped helper rows despite core look/help
    command flow already living in `pager.js`.
- Change:
  - Added a pager compatibility surface in `js/pager.js` for C helper symbols:
    - `append_str`, `waterbody_name`, `ice_descr`, `mhidden_description`,
      `self_lookat`, `object_from_map`, `look_at_monster`, `lookat`,
      `add_cmap_descr`, `add_quoted_engraving`, `ia_checkfile`, `checkfile`,
      `look_all`, `look_traps`, `look_engrs`, `do_supplemental_info`,
      `whatdoes_help`, `whatdoes_cond`, `docontact`, `domenucontrols`,
      `setopt_cmd`.
  - Added focused unit coverage:
    - `test/unit/pager_surface.test.js`.
  - Updated `docs/CODEMATCH.md` pager rows to mark the new surface as
    implemented and reclassified `Bitfield` declarations to explicit N/A.
- Validation:
  - `node --test test/unit/pager_surface.test.js` passed.
  - `node --test test/unit/pager_quicklook_prompt.test.js` passed.

### CODEMATCH rumors.c compatibility-surface closure (2026-03-09)

- Problem:
  - `rumors.c` still had 13 missing rows (`CapitalMon`, random-line/text
    helpers, oracle save/restore/output, consult wrappers, file-check helpers).
- Change:
  - Added a full rumors compatibility surface in `js/rumors.js`:
    - `unpadline`, `init_rumors`, `others_check`, `rumor_check`,
      `get_rnd_line`, `get_rnd_text`, `save_oracles`, `restore_oracles`,
      `outoracle`, `doconsult`, `couldnt_open_file`, `init_CapMons`,
      `CapitalMon`.
  - Replaced broken legacy `free_CapMons()` body with a safe JS GC reset.
  - Added focused tests:
    - `test/unit/rumors_surface.test.js`.
  - Updated `docs/CODEMATCH.md` rumors rows and file summary.
- Validation:
  - `node --test test/unit/rumors_surface.test.js` passed.
  - `node --test test/unit/epitaph.test.js` passed.

### CODEMATCH dungeon.c mapseen + level-helper compatibility slice (2026-03-09)

- Problem:
  - `dungeon.c` still had a concentrated missing cluster in mapseen/overview
    and level-helper APIs (`dooverview`, `query_annotation`, `recalc_mapseen`,
    `level_range`, `pick_level`, `parent_dnum`, etc.).
- Change:
  - Added a `dungeon.c` compatibility surface in `js/dungeon.js` for the
    missing helper set:
    `parent_dnum`, `parent_dlevel`, `level_range`, `pick_level`, `lev_by_name`,
    `level_difficulty`, `unplaced_floater`, `u_on_rndspot`, `earth_sense`,
    `update_lastseentyp`, `count_feat_lastseentyp`, `update_mapseen_for`,
    `query_annotation`, `init_mapseen`, `save_mapseen`, `load_mapseen`,
    `rm_mapseen`, `remdun_mapseen`, `recbranch_mapseen`, `recalc_mapseen`,
    `interest_mapseen`, `print_mapseen`, `overview_stats`, `dooverview`.
  - Hardened existing mapseen callsites (`find_mapseen`, `find_mapseen_by_str`,
    `room_discovered`, `show_overview`, `traverse_mapseenchn`) to default to
    `_gstate` instead of requiring explicit `game` wiring.
  - Added focused coverage:
    - `test/unit/dungeon_surface.test.js`.
  - Updated `docs/CODEMATCH.md` row mappings for this slice.
- Validation:
  - `node --test test/unit/dungeon_surface.test.js` passed.
  - `node --test test/unit/dungeon.test.js` passed.

### CODEMATCH mkobj.c compatibility-surface closure (2026-03-09)

- Problem:
  - `mkobj.c` still had a wide missing helper cluster (object chain
    manipulation, glob/ice/timer checks, sanity helpers, object naming/placement
    wrappers, and random helper shims).
- Change:
  - Added `mkobj.c` compatibility exports in `js/mkobj.js` for the missing set:
    - object placement/extraction helpers:
      `mkobj_at`, `mk_named_object`, `add_to_buried`, `remove_object`,
      `replace_object`, `obj_extract_self`, `recreate_pile_at`
    - object/glob/ice/timer/sanity helpers:
      `obj_ice_effects`, `peek_at_iced_corpse_age`, `obj_timer_checks`,
      `item_on_ice`, `shrink_glob`, `shrinking_glob_gone`,
      `obj_sanity_check`, `objlist_sanity`, `shop_obj_sanity`,
      `sanity_check_worn`, `check_contained`, `check_glob`, `insane_object`
    - random/id/type wrappers:
      `nextoid`, `rnd_treefruit_at`, `rndmonnum`, `rndmonnum_adj`,
      `stone_object_type`, `stone_furniture_type`, `hornoplenty`
    - misc compatibility shims:
      `fixup_oil`, `dobjsfree`, `init_dummyobj`, `where_name`,
      `unknow_object`, `unknwn_contnr_contents`, `unsplitobj`,
      `copy_oextra`, `costly_alteration`, `maybe_adjust_light`
  - Added focused coverage:
    - `test/unit/mkobj_surface.test.js`
  - Updated `docs/CODEMATCH.md` `mkobj.c` rows and summary text.
- Validation:
  - `node --test test/unit/mkobj_surface.test.js` passed.
  - `node --test test/unit/mkobj.test.js` passed.
  - `node --test test/unit/mkobj_erosion_gate.test.js` passed.
  - `node --test test/unit/mkobj_novel_parity.test.js` passed.

### CODEMATCH mon.c compatibility-surface closure (2026-03-09)

- Problem:
  - `mon.c` still had a large unresolved helper cluster in CODEMATCH,
    including functions that were referenced by existing `mon.js` paths
    (`dead_species`, `iter_mons`, `relmon`) but not defined.
- Change:
  - Added compatibility exports in `js/mon.js` for the missing cluster:
    - iteration/list helpers: `iter_mons`, `iter_mons_safe`, `relmon`,
      `m_into_limbo`
    - movement/placement helpers: `mnexto`, `mnearto`, `movemon_singlemon`,
      `deal_with_overcrowding`, `mon_leaving_level`, `monstone`
    - species/cham/genocide helpers: `dead_species`, `egg_type_from_parent`,
      `kill_genocided_monsters`, `decide_to_shapeshift`, `normal_shape`,
      `rescham`, `restartcham`, `restore_cham`, `validspecmon`, `validvamp`,
      `wiz_force_cham_form`, `vamprises`
    - behavior/selection helpers: `mon_allowflags`, `mon_animal_list`,
      `pick_animal`, `peacefuls_respond`, `mpickstuff`, `restrap`,
      `usmellmon`
  - Corrected `G_GENOD` bitmask references to `G_GENO` in `mon.js`.
  - Added focused tests:
    - `test/unit/mon_surface.test.js`
  - Updated `docs/CODEMATCH.md` row mappings for this slice.
- Validation:
  - `node --test test/unit/mon_surface.test.js` passed.
  - `node --test test/unit/mon.test.js` passed.
  - `node --test test/unit/monmove.test.js` passed.

### CODEMATCH trap.c compatibility-surface closure (2026-03-09)

- Problem:
  - `trap.c` still had a broad missing helper cluster (launch/holding-trap
    helpers, trap disarm support, pit/sokoban status helpers, lava/drown
    utility paths, and related wrappers).
- Change:
  - Added compatibility exports in `js/trap.js` for the missing set:
    - launch and placement helpers:
      `launch_in_progress`, `launch_drop_spot`, `force_launch_placement`,
      `launch_obj`, `mkroll_launch`
    - trap utility and status helpers:
      `clamp_hole_destination`, `immune_to_trap`, `climb_pit`,
      `move_into_trap`, `could_untrap`, `untrap_prob`, `try_disarm`,
      `disarm_holdingtrap`, `try_lift`, `help_monster_out`,
      `join_adjacent_pits`, `unconscious`
    - holding/falling trap state helpers:
      `closeholdingtrap`, `openholdingtrap`, `openfallingtrap`
    - damage/sokoban/misc wrappers:
      `lava_damage`, `pot_acid_damage`, `drown`, `back_on_ground`,
      `emergency_disrobe`, `sokoban_guilt`, `maybe_finish_sokoban`,
      `ignite_items`, `animate_statue`
  - Added focused coverage:
    - `test/unit/trap_surface.test.js`
  - Updated `docs/CODEMATCH.md` row mappings for this slice.
- Validation:
  - `node --test test/unit/trap_surface.test.js` passed.
  - `node --test test/unit/trap_accuracy.test.js` passed.
  - `node --test test/unit/mktrap_parity.test.js` passed.

### nhgetch cleanup: stale topline ack when switching wrap->raw (2026-03-10)

- Symptom:
  - Converting some gameplay reads from `nhgetch_wrap()` to `nhgetch_raw()`
    caused screen-only drift (not RNG/event), first seen in
    `seed031_manual_direct` step 10:
    - JS: `"What do you want to throw? ...  You don't have that object."`
    - C/session: `"You don't have that object.--More--"`
- Root cause:
  - `nhgetch_wrap()` was clearing `display.messageNeedsMore` on keypress,
    but `nhgetch_raw()` was not.
  - After a prompt read, the next message could be appended to stale topline
    prompt text instead of replacing it.
- Fix:
  - Moved keypress acknowledgement behavior into `nhgetch_raw()`:
    after any successful key read, clear `display.messageNeedsMore`.
  - This preserves expected topline replacement semantics while allowing
    additional safe `wrap -> raw` conversions.
- Validation:
  - `scripts/run-and-report.sh` returned `34/34` gameplay sessions green
    after the fix and subsequent `wrap -> raw` conversions in `dothrow`,
    `eat`, and `getpos`.

### CODEMATCH makemon.c closure slice: mongen and propagation helpers (2026-03-10)

- Problem:
  - `makemon.c -> makemon.js` still had 7 missing C-surface functions:
    `is_home_elemental`, `cmp_init_mongen_order`, `check_mongen_order`,
    `dump_mongen`, `mkclass_aligned`, `mkclass_poly`, `propagate`.
  - Some of these were not just ledger gaps: `is_home_elemental` is used by
    existing `wrong_elem_type()`/`grow_up()` paths, and missing mvitals flag
    constants (`G_GENOD`/`G_EXTINCT`) created latent runtime error risk.
- Change:
  - Implemented and exported the 7 missing functions in `js/makemon.js`.
  - Added C-faithful elemental-home checks using dungeon level predicates
    (`Is_airlevel`, `Is_firelevel`, `Is_earthlevel`, `Is_waterlevel`).
  - Added/centralized mvitals flag constants:
    `G_GENOD = 0x01`, `G_EXTINCT = 0x02`, `G_GONE = 0x03`.
  - Added focused unit coverage in `test/unit/makemon.test.js` for:
    - mongen order initialization/check helpers
    - `mkclass_aligned`
    - `mkclass_poly`
    - `propagate` (born/extinction behavior)
  - Updated `docs/CODEMATCH.md` makemon rows from `Missing` to `Implemented`.
  - Refreshed CODEMATCH function-level metrics from current row totals.
- Validation:
  - `node --test test/unit/makemon.test.js` passed (19/19).

### CODEMATCH do.c closure slice: command-surface wrappers (2026-03-10)

- Problem:
  - `do.c -> do.js` still showed 6 missing command-surface symbols:
    `doddrop`, `dodown`, `doup`, `goto_level`, `menu_drop`, `u_collide_m`.
  - The corresponding JS behavior already existed under `handle*`/`changeLevel`
    names, so the gap was mostly C-surface naming and callchain visibility.
- Change:
  - Added explicit C-name wrappers in `js/do.js`:
    - `doddrop` -> `handleDropTypes`
    - `dodown` -> `handleDownstairs`
    - `doup` -> `handleUpstairs`
    - `goto_level` -> `changeLevel`
    - `menu_drop` -> `handleDropTypes`
    - `u_collide_m` -> `resolveArrivalCollision`
  - Added focused test coverage:
    - `test/unit/do_surface_wrappers.test.js`
  - Updated `docs/CODEMATCH.md` do.c rows from `Missing` to `Implemented`.
  - Refreshed CODEMATCH function-level metrics after this closure.
- Validation:
  - `node --test test/unit/do_surface_wrappers.test.js` passed (4/4).
  - `node --test test/unit/makemon.test.js` passed (19/19) as a nearby
    regression check.

### CODEMATCH ball.c closure slice: C-name compatibility aliases (2026-03-10)

- Problem:
  - `ball.c -> ball.js` still had 5 missing rows, all C-name entrypoints over
    already-implemented lowercase JS behavior:
    `Placebc`, `Unplacebc`, `Unplacebc_and_covet_placebc`,
    `Lift_covet_and_placebc`, `bc_order`.
- Change:
  - Added explicit wrappers in `js/ball.js` mapping to existing live logic:
    - `Placebc` -> `placebc`
    - `Unplacebc` -> `unplacebc`
    - `Unplacebc_and_covet_placebc` -> `unplacebc_and_covet_placebc`
    - `Lift_covet_and_placebc` -> `lift_covet_and_placebc`
    - `bc_order` -> `bc_order_fn`
  - Added focused test coverage:
    - `test/unit/ball_surface.test.js`
  - Updated `docs/CODEMATCH.md` ball rows from `Missing` to `Implemented`.
  - Refreshed CODEMATCH function-level metrics after this closure.
- Validation:
  - `node --test test/unit/ball_surface.test.js` passed (2/2).
  - `node --test test/unit/do_surface_wrappers.test.js` passed (4/4)
    as a nearby regression check.

### CODEMATCH glyphs.c cleanup: classify non-runtime customization internals as N/A (2026-03-10)

- Problem:
  - `glyphs.c -> glyphs.js` remained the largest single missing bucket, but
    inspection showed most missing symbols were not gameplay runtime logic.
  - They belong to tty/config/customization parsing and tooling paths
    (`parse_id`, `glyph_find_core`, custom symbol-set callbacks, shuffle/apply
    customization internals, dump/test helpers), which are not used by the
    browser renderer/runtime command loop.
- Change:
  - Reclassified 19 glyphs rows from `Missing` to explicit `N/A` in
    `docs/CODEMATCH.md`, each with a concrete reason.
  - Kept gameplay-relevant implemented entries (`glyph_to_cmap`, cache status,
    glyphrep paths, clear color map, etc.) unchanged.
  - Refreshed CODEMATCH function-level metrics after reclassification.
- Validation:
  - `node --test test/unit/ball_surface.test.js` passed (2/2) as a nearby
    sanity check while landing docs-only ledger changes.

### CODEMATCH questpgr.c cleanup: classify Lua pager path as N/A (2026-03-10)

- Problem:
  - `questpgr.c` was the next largest gameplay-classified missing bucket,
    but its missing symbols are tied to the C `quest.lua` pager pipeline
    (`com_pager_core`, `%` substitution helpers, delivery helpers, and related
    lookup/callback functions).
  - Browser runtime quest flow is handled in `quest.js` with local message
    stubs and does not import/use `questpgr.js` Lua pager internals.
- Change:
  - Reclassified the 17 remaining `questpgr.c` missing rows to explicit `N/A`
    in `docs/CODEMATCH.md`, with row-level rationale indicating Lua/unwired
    pager path scope.
  - Refreshed CODEMATCH function-level metrics after the reclassification.
- Validation:
  - Metrics recompute script confirms:
    - `questpgr.c` now `0 / 20` missing
    - gameplay missing reduced from `89` to `72`.

### CODEMATCH cmd.c cleanup: close residual missing rows (2026-03-10)

- Problem:
  - `cmd.c` remained the largest residual gameplay-classified bucket with
    15 missing rows, mixing a few inlined command behaviors and many
    mouse/tty/menu-only helpers not used in browser runtime.
- Change:
  - Updated `docs/CODEMATCH.md` `cmd.c` rows as follows:
    - Marked inlined/redirected behaviors as implemented:
      - `doextlist` (help-flow extended command section),
      - `domonability` (`handleExtendedCommand` `'monster'` case),
      - `doterrain` (`pager.handleViewMapPrompt`),
      - `extcmds_match` (inlined via `knownExtendedCommands` +
        `displayCompletedExtcmd`).
    - Marked browser-nonruntime mouse/tty/menu helpers as explicit `N/A`:
      - `doherecmdmenu`, `dotherecmdmenu`, `mcmd_addmenu`,
        `there_cmd_menu_self`, `extcmd_via_menu`,
        `paranoid_query`, `paranoid_ynq`,
        `u_can_see_whole_selection`, `u_have_seen_bounds_selection`,
        `u_have_seen_whole_selection`,
        `yn_function_menu`, `yn_menuable_resp`.
  - Refreshed CODEMATCH function-level metrics after this closure.
- Validation:
  - Metrics recompute script confirms:
    - `cmd.c` now `0 / 147` missing
    - gameplay missing reduced from `72` to `57`.

### CODEMATCH spell.c closure slice: compatibility surfaces for missing function names (2026-03-10)

- Problem:
  - `spell.c -> spell.js` still had 6 missing rows (`deadbook`,
    `propagate_chain_lightning`, `show_spells`, `skill_based_spellbook_id`,
    `sortspells`, `spell_cmp`) despite nearby functionality already existing in
    JS under different entrypoints.
- Change:
  - Added C-name compatibility functions in `js/spell.js`:
    - `propagate_chain_lightning` and rewired `cast_chain_lightning` to call it.
    - `spell_cmp` and `sortspells` as explicit spell-ordering helpers.
    - `show_spells` as dump-style surface (or delegates to display overlay).
    - `skill_based_spellbook_id` for wizard passive spellbook discovery.
    - `deadbook` and routed `learn()` Book-of-the-Dead path through it.
  - Added focused unit coverage in
    `test/unit/spell_codematch_surface.test.js`.
  - Updated `docs/CODEMATCH.md` spell rows from `Missing` to `Implemented`.
- Validation:
  - `node --test test/unit/spell_codematch_surface.test.js test/unit/command_known_spells.test.js`
    passed (6/6).
  - `node --test test/unit/spell_accuracy.test.js` passed (38/38).

### CODEMATCH lock.c + getpos.c closure slice: lock wrappers and stale ledger cleanup (2026-03-10)

- Problem:
  - `lock.c -> lock.js` still had 4 missing function-name rows that were
    either inlined in command handlers or present under near-identical names.
  - `getpos.c -> getpos.js` still had 5 stale `Missing` rows for functions
    already implemented and exported.
- Change:
  - Added explicit C-name lock compatibility surfaces in
    `js/lock.js`:
    - `doopen_indir` (extracted directional open logic from `handleOpen`)
    - `picklock` (occupation-callback wrapper)
    - `forcelock` (occupation-callback wrapper)
    - `stumble_on_door_mimic` (alias to existing `stumble_onto_mimic`)
  - Refactored `handleOpen` to call `doopen_indir` so behavior stays unified.
  - Added focused unit coverage in
    `test/unit/lock_surface_wrappers.test.js`.
  - Updated `docs/CODEMATCH.md` rows:
    - `lock.c`: 4 missing rows -> implemented.
    - `getpos.c`: 5 stale missing rows -> implemented
      (`auto_describe`, `cmp_coord_distu`, `coord_desc`, `gather_locs`,
      `gloc_filter_init`).
- Validation:
  - `node --test test/unit/lock_surface_wrappers.test.js` passed (4/4).

### CODEMATCH bones.c closure slice: remaining missing helper surfaces (2026-03-10)

- Problem:
  - `bones.c -> bones.js` still had 4 missing function-name rows:
    `bones_include_name`, `fix_ghostly_obj`, `fixuporacle`, `newebones`.
- Change:
  - Added explicit C-name helper surfaces in `js/bones.js`:
    - `bones_include_name(name, bonesinfo)` for cemetery-name matching.
    - `fix_ghostly_obj(obj)` to clear ghostly marker on pickup.
    - `fixuporacle(oracle, game)` deterministic Oracle-level gate + peaceful restore.
    - `newebones(mtmp)` to allocate `mextra.ebones.parentmid`.
  - Expanded `test/unit/bones.test.js` with focused coverage for all four helpers.
  - Updated `docs/CODEMATCH.md` `bones.c` rows from `Missing` to `Implemented`.
- Validation:
  - `node --test test/unit/bones.test.js` passed (39/39).

### CODEMATCH multi-file closure slice: drawing.c + artifact.c + end.c ledger hygiene (2026-03-10)

- Problem:
  - `drawing.c` still had 3 missing lookup helpers despite `symbols.js`
    already owning the relevant symbol tables.
  - `artifact.c` still had one missing helper (`untouchable`) in the touch/retouch
    path.
  - `end.c` still listed `odds_and_ends` as missing even though upstream has it
    behind `#if 0` (disabled legacy path).
- Change:
  - Added C-faithful drawing helpers in `js/symbols.js`:
    - `def_char_to_objclass`
    - `def_char_to_monclass`
    - `def_char_is_furniture`
  - Added `artifact.c` helper in `js/artifact.js`:
    - `untouchable(obj, drop_untouchable, player)` routed through existing
      `retouch_object` logic.
  - Added focused tests in `test/unit/codematch_multi_surface.test.js`.
  - Updated `docs/CODEMATCH.md`:
    - drawing rows: 3 Missing -> Implemented and file status `[x]`
    - artifact row: `untouchable` Missing -> Implemented
    - end row: `odds_and_ends` Missing -> explicit `N/A` with upstream `#if 0` rationale
- Validation:
  - `node --test test/unit/codematch_multi_surface.test.js` passed.

### CODEMATCH engrave.c closure slice: missing persistence/occupation surfaces (2026-03-10)

- Problem:
  - `engrave.c -> engrave.js` still had 3 missing rows:
    `engrave`, `save_engravings`, `rest_engravings`.
- Change:
  - Added explicit C-name surfaces in `js/engrave.js`:
    - `engrave()` exported occupation callback surface (current stub behavior
      unchanged).
    - `save_engravings(map)` snapshot serializer for engraving list.
    - `rest_engravings(map, saved)` round-trip restore + sanitation.
  - Added focused tests in `test/unit/engrave_surface.test.js`.
  - Updated `docs/CODEMATCH.md` engrave rows from `Missing` to `Implemented`.
- Validation:
  - `node --test test/unit/engrave_surface.test.js test/unit/command_engrave_prompt.test.js test/unit/engrave_wipe_event.test.js`
    passed (5/5).

### CODEMATCH multi-file closure slice: engrave.c + track.c remaining missing rows (2026-03-10)

- Problem:
  - `engrave.c` still had 3 missing rows (`engrave`, `save_engravings`,
    `rest_engravings`).
  - `track.c` still had 3 missing rows (`hastrack`, `save_track`,
    `rest_track`), with `save/rest` functions still using broken
    autotranslated C I/O helpers.
- Change:
  - In `js/engrave.js`:
    - Exported `engrave()` occupation surface (stub behavior unchanged).
    - Added `save_engravings(map)` and `rest_engravings(map, saved)` as
      architecture-faithful JS persistence surfaces.
  - In `js/track.js`:
    - Implemented `save_track(nhfp)` and `rest_track(nhfp)` using JS snapshot
      state (`nhfp.trackState`) with bounds checks and optional `releaseData`
      reset semantics.
    - `hastrack` row was stale; function already present and now marked
      implemented in ledger.
  - Added tests:
    - `test/unit/engrave_surface.test.js`
    - `test/unit/track_surface.test.js`
  - Updated `docs/CODEMATCH.md` rows for both files to `Implemented`.
- Validation:
  - `node --test test/unit/engrave_surface.test.js test/unit/command_engrave_prompt.test.js test/unit/engrave_wipe_event.test.js test/unit/track_surface.test.js`
    passed (8/8).

### CODEMATCH multi-file closure slice: hacklib.c + teleport.c missing surfaces (2026-03-10)

- Problem:
  - `hacklib.c` still had 3 missing rows (`datamodel`, `nh_snprintf`,
    `unicodeval_to_utf8str`) and several broken autotranslated helpers.
  - `teleport.c` still had 3 missing rows (`goodpos_onscary`,
    `control_mon_tele`, `tele_to_rnd_pet`).
- Change:
  - In `js/hacklib.js`:
    - Replaced broken autotranslated stubs with working implementations for
      `case_insensitive_comp`, `copy_bytes`, `what_datamodel_is_this`,
      `nh_qsort_idx_cmp`.
    - Added `datamodel`, `nh_snprintf`, `unicodeval_to_utf8str` C-name
      compatibility surfaces.
  - In `js/teleport.js`:
    - Added `goodpos_onscary` probe helper.
    - Added deterministic `control_mon_tele` destination-validation helper
      (opt-in via `opts.monTelecontrol`).
    - Added `tele_to_rnd_pet` hero-near-pet teleport helper.
  - Added tests:
    - `test/unit/hacklib_surface_codematch.test.js`
    - `test/unit/teleport_surface.test.js`
  - Updated `docs/CODEMATCH.md` rows from `Missing` to `Implemented` for all
    six functions, and updated teleport file-summary note to reflect `33/37`
    surfaces present.
- Validation:
  - `node --test test/unit/hacklib_surface_codematch.test.js test/unit/teleport_surface.test.js test/unit/hacklib.test.js`
    passed (169/169).

### CODEMATCH multi-file closure slice: were.c + wield.c + worn.c + worm.c surfaces (2026-03-10)

- Problem:
  - Remaining gameplay-facing CODEMATCH missing rows were concentrated in four
    files: `were.c`, `wield.c`, `worn.c`, and `worm.c`.
- Change:
  - `js/were.js`
    - Added `you_were(player, ctx)` and `you_unwere(player, purify, ctx)` surfaces.
    - Kept behavior conservative and deterministic, with optional callback hooks
      (`ctx.polymon`, `ctx.rehumanize`, `ctx.monster_nearby`) for deeper C-style
      integration without adding replay-side heuristics.
  - `js/wield.js`
    - Added `ready_ok(obj, player)` C-style tri-state filter surface.
    - Added `finish_splitting(obj, player)` stack-split finalization surface and
      wired quiver candidate filtering through `ready_ok`.
  - `js/worn.js`
    - Added `recalc_telepat_range(player)` and `check_wornmask_slots(player)` surfaces.
    - Wired `wizcmds.you_sanity_check()` callsite to pass `player`.
  - `js/worm.js`
    - Added `random_dir(x, y)` legacy helper surface (upstream marks it under `#if 0`,
      but adding it closes naming coverage and supports tooling/tests).
  - `docs/CODEMATCH.md`
    - Updated 7 rows from Missing -> Implemented across these files.
  - Tests:
    - Added `test/unit/codematch_were_wield_worn_worm_surface.test.js`
    - Re-ran related suites for were/wield prompt paths.
- Validation:
  - `node --test test/unit/codematch_were_wield_worn_worm_surface.test.js test/unit/were.test.js test/unit/command_wield_prompt.test.js`
    passed (26/26).

### CODEMATCH multi-file closure slice: insight.c + iactions.c missing surfaces (2026-03-10)

- Problem:
  - `iactions.c` still had 3 missing surfaces and the existing JS file had
    unresolved autotranslated symbols.
  - `insight.c` still had 3 missing surfaces (`cause_known`,
    `attributes_enlightenment`, `show_achievements`).
- Change:
  - Replaced `js/iactions.js` with stable C-name surfaces:
    - `item_naming_classification`
    - `item_reading_classification`
    - `ia_addmenu`
    - `itemactions_pushkeys`
    - `itemactions`
  - Added missing insight surfaces in `js/insight.js`:
    - `cause_known`
    - `attributes_enlightenment`
    - `show_achievements`
  - Updated `docs/CODEMATCH.md` rows from Missing -> Implemented for all six
    functions and updated top-line totals.
  - Added test coverage in:
    - `test/unit/codematch_insight_iactions_surface.test.js`
- Validation:
  - `node --test test/unit/codematch_insight_iactions_surface.test.js test/unit/codematch_were_wield_worn_worm_surface.test.js`
    passed (12/12).

### CODEMATCH multi-file closure slice: decl/monst/mplayer/objects/polyself/priest/shknam/steal/steed (2026-03-10)

- Problem:
  - Remaining mapped gameplay CODEMATCH gaps were a small but scattered
    14-function cluster across 9 files (`decl.c`, `monst.c`, `mplayer.c`,
    `objects.c`, `polyself.c`, `priest.c`, `shknam.c`, `steal.c`, `steed.c`).
- Change:
  - Added explicit compatibility surfaces:
    - `decl.js`: `decl_globals_init`, `sa_victual`
    - `monst.js`: `monst_globals_init`
    - `objects.js`: `objects_globals_init`
    - `mplayer.js`: `dev_name`, `get_mplname`
    - `polyself.js`: `dropp`
    - `priest.js`: `move_special` (re-export), `priestini` (mkroom wrapper)
    - `shknam.js`: `init_shop_selection`, `neweshk`
    - `steal.js`: `unstolenarm`, `stealarm`
    - `steed.js`: `use_saddle`
  - `mkroom.js`: exported `priestini` so the C-name priest surface can
    delegate to the existing temple-initialization implementation.
  - Added coverage file:
    - `test/unit/codematch_remaining_surface_batch.test.js`
  - Updated `docs/CODEMATCH.md` row mappings and top-line metrics:
    - gameplay missing: `51 -> 37`
    - raw missing: `672 -> 658`
- Validation:
  - `node --test test/unit/codematch_remaining_surface_batch.test.js`
  - `node --test test/unit/codematch_remaining_surface_batch.test.js test/unit/codematch_insight_iactions_surface.test.js test/unit/codematch_were_wield_worn_worm_surface.test.js`
  - Both passed.

### CODEMATCH closure slice: monmove.c `onscary` completion (2026-03-10)

- Problem:
  - `onscary` was still tracked as `Partial` in CODEMATCH due missing C checks
    (lawful-minion resistance, vampire-shifter altar scare, and full Elbereth gate parity fields).
- Change:
  - `js/mon.js` `onscary(...)` now includes:
    - lawful-minion direct scare immunity
    - altar scare for vampire shifters (`is_vampshifter`)
    - Elbereth exclusion parity cleanup (`mpeaceful` + existing minotaur/vision/hell/endgame/displaced logic)
  - Added focused tests in `test/unit/mon_onscary.test.js` covering:
    - lawful-minion immunity
    - vampire-shifter altar fear
    - displaced Elbereth protection path
    - minotaur Elbereth exclusion
  - Updated `docs/CODEMATCH.md` row `monmove.c:onscary` from `Partial` to `Implemented`
    and refreshed top-line totals by -1.
- Validation:
  - `node --test test/unit/mon_onscary.test.js`
  - `node --test test/unit/mon_onscary.test.js test/unit/codematch_remaining_surface_batch.test.js`

### CODEMATCH multi-file closure slice: worn.c + steal.c (2026-03-10)

- Problem:
  - Remaining CODEMATCH rows in `worn.c`/`steal.c` were still tracked as
    missing/stub despite now-needed gameplay helper surfaces for bypass
    traversal and thief post-action callbacks.
- Change:
  - `js/worn.js`:
    - Implemented `bypass_obj`, `bypass_objlist`, `clear_bypass`,
      `clear_bypasses`, `nxt_unbypassed_obj`, `nxt_unbypassed_loot`.
    - Added linked-list and array traversal support so callers from different
      object-chain contexts can use the same bypass helpers.
  - `js/steal.js`:
    - Implemented `thiefdead` callback rewiring (`stealarm` -> `unstolenarm`)
      and cleanup behavior.
    - Implemented `maybe_absorb_item` carry/inventory transfer flow.
    - Implemented `mdrop_special_objs` drop path for invocation/special items.
  - Added targeted coverage:
    - `test/unit/codematch_worn_steal_surface.test.js`
  - Updated `docs/CODEMATCH.md` row status entries for this slice.
- Validation:
  - `node --test test/unit/codematch_worn_steal_surface.test.js`
  - `node scripts/test-unit-core.mjs`
  - Both passed.

### CODEMATCH multi-file closure slice: spell.c + explode.c + mcastu.c surfaces (2026-03-10)

- Problem:
  - Several rows in `spell.c`, `explode.c`, and `mcastu.c` were still marked
    `Stub` even though the JS had substantial logic or needed lightweight
    faithful behavior to close missing surfaces.
- Change:
  - `js/spell.js`:
    - Fixed `spell_idx(otyp, player)` lookup to pass the player spellbook into
      `spellid(...)` correctly (surfaced by new unit coverage).
    - Audited and kept existing implemented surfaces:
      `study_book`, `confused_book`, `book_cursed`, `learn`, `rejectcasting`.
  - `js/explode.js`:
    - Implemented `explosionmask` resistance checks for elemental cases.
    - Implemented `engulfer_explosion_msg` message selection by explosion type.
    - Implemented a bounded `scatter` object relocation path for callers with
      object+map context.
  - `js/mcastu.js`:
    - Implemented `cursetxt` output text generation/storage.
    - Implemented `touch_of_death` damage path with antimagic/magic-resistance
      mitigation and damage bookkeeping.
  - Added targeted coverage:
    - `test/unit/codematch_spell_explode_mcastu_surface.test.js`
  - Updated `docs/CODEMATCH.md` row statuses from stale `Stub` entries to
    implemented/partial statuses matching current behavior.
- Validation:
  - `node --test test/unit/codematch_spell_explode_mcastu_surface.test.js`
  - `node scripts/test-unit-core.mjs`
  - Both passed.

### CODEMATCH combat closure: mhitm.c helper stubs (`noises`, `slept_monst`, `rustm`) (2026-03-10)

- Problem:
  - `mhitm.c` still had three helper rows tracked as stubs even though the
    surrounding m-vs-m pipeline is active and these helpers are parity-relevant.
- Change:
  - `js/mhitm.js`:
    - Exported `noises(...)` (previously implemented as internal-only helper).
    - Implemented `slept_monst(mon, player)` to release `player.ustuck` when
      a sleeping/paralyzed grabber should relax grip (C-style `unstuck` path).
    - Tightened `rustm(...)` with C steam-vortex exclusion for fire erosion.
  - Added targeted coverage:
    - `test/unit/codematch_mhitm_surface.test.js`
      - noise message/rate-limit behavior
      - `slept_monst` release behavior
      - steam-vortex fire-erosion exclusion vs non-steam erosion path
  - Updated `docs/CODEMATCH.md` rows:
    - `mhitm.c:noises` -> Implemented
    - `mhitm.c:slept_monst` -> Implemented
    - `mhitm.c:rustm` -> Implemented
- Validation:
  - `node --test test/unit/codematch_mhitm_surface.test.js`
  - `node scripts/test-unit-core.mjs`
  - Both passed.

### CODEMATCH blindness boundary + restore-ability closure (`toggle_blindness`, `peffect_restore_ability`) (2026-03-10)

- Problem:
  - `potion.c:toggle_blindness` remained marked as stub/inlined behavior.
  - `potion.c:peffect_restore_ability` was still RNG-only skeleton logic.
  - `do_wear.js` had blindfold removal callsites passing wrong arguments into
    `Blindf_off`, creating boundary fragility.
- Change:
  - `js/potion.js`:
    - Added explicit exported `toggle_blindness(player)` API
      (botl + vision dirty + monster-visibility refresh hook).
    - Wired `make_blinded(...)` to call `toggle_blindness` when sight toggles.
    - Implemented `peffect_restore_ability(...)` core C behavior:
      - cursed: "mediocre" path
      - non-cursed: random-start attribute restoration to `attrMax`
      - blessed: restore all drained attributes
      - potion form restores lost levels via `pluslvl`, looping for blessed.
  - `js/do_wear.js`:
    - `Blindf_on/Blindf_off` now update `BLINDED` extrinsic/blocked masks
      (`W_TOOL`) in a C-faithful eyewear boundary model
      (blindfold/towel blinds; lenses block blindness).
    - Both functions now call `toggle_blindness` on actual sight transitions.
    - Fixed incorrect `Blindf_off(...)` callsites to pass `(player, obj)`.
  - Added targeted tests:
    - `test/unit/codematch_blindness_restore_surface.test.js`
      - blindfold on/off extrinsic transitions
      - lenses blocked-visibility transition
      - restore-ability blessed path (attributes + lost level recovery).
  - Updated `docs/CODEMATCH.md`:
    - `potion.c:toggle_blindness` -> Implemented
    - `potion.c:peffect_restore_ability` -> Implemented
- Validation:
  - `node --test test/unit/codematch_blindness_restore_surface.test.js`
  - `node scripts/test-unit-core.mjs`
  - Both passed.
### CODEMATCH timeout helper closure (`burn_away_slime`, `slimed_to_death`, lamp + fumble helpers) (2026-03-10)

- Problem:
  - Several `timeout.c` helpers were still true JS no-ops:
    `burn_away_slime`, `slimed_to_death`, `slip_or_trip`,
    `see_lamp_flicker`, `lantern_message`.
- Change:
  - `js/timeout.js`:
    - Implemented `burn_away_slime(player)` by routing through
      `make_slimed(..., 0, "The slime that covers you is burned away!")`.
    - Implemented `slimed_to_death(kptr, player)` to set terminal sliming
      death through `done_timeout`.
    - Implemented `slip_or_trip(player, map)` as a simplified message subset
      with ice/hallucination-aware variants.
    - Implemented `see_lamp_flicker` and `lantern_message` message helpers.
    - Wired `_fireExpiryEffect` SLIMED path to call `slimed_to_death`.
    - Wired FUMBLING expiry path to invoke `slip_or_trip` when applicable.
  - `js/potion.js`, `js/trap.js`, `js/sit.js`:
    - Updated `burn_away_slime()` callsites to `await burn_away_slime()`
      now that the helper performs async status/message work.
  - Added targeted coverage:
    - `test/unit/codematch_timeout_surface.test.js`
      - slimed timeout burn-away clear
      - slimed death terminal state
      - lamp helper callability
  - Updated `docs/CODEMATCH.md` rows from stub to implemented for the above.
- Validation:
  - `node --test test/unit/codematch_timeout_surface.test.js`
  - `node scripts/test-unit-core.mjs`
  - Both passed.

### CODEMATCH `read.c` + `mhitu.c` chunk (`seffect_*` wiring + AD_TLPT/erosion status cleanup) (2026-03-10)

- Problem:
  - `read.js` still had several scroll effects marked as message-only stubs in the
    CODEMATCH ledger.
  - `mhitu.c` rows in `docs/CODEMATCH.md` had stale stub status for handlers that
    are now wired in JS (`AD_SGLD`, `AD_RUST/CORR/DCAY`), and `AD_TLPT` still lacked
    a teleport action.
- Change:
  - `js/read.js`:
    - `seffect_genocide` now routes to `do_class_genocide` / `do_genocide`.
    - `seffect_stinking_cloud` now routes to `do_stinking_cloud`.
    - `do_class_genocide` and `do_genocide` now perform real `mvitals` marking with
      `G_GENO|G_NOCORPSE` and `kill_genocided_monsters(...)` (with simplified deterministic
      target selection where C has prompt-driven selection).
    - `do_stinking_cloud` now runs a `getpos` target flow and `create_gas_cloud(...)`.
    - Fixed `SCR_GENOCIDE` dispatcher wiring to pass `game`.
  - `js/mhitu.js`:
    - `mhitu_ad_tlpt` now executes hero teleport via `tele(game)` on successful magical hit,
      while preserving existing C-style damage cap behavior.
  - `docs/CODEMATCH.md`:
    - Updated read rows: teleport/gold/food/stinking-cloud now implemented; genocide
      rows now marked approximate instead of stub.
    - Updated mhitu rows: `mhitu_ad_sgld`, `mhitu_ad_rust`, `mhitu_ad_corr`,
      `mhitu_ad_dcay` now implemented; `mhitu_ad_tlpt` now partial.
    - Global `Stub` count reduced from `85` to `75`.
- Validation:
  - `node scripts/test-unit-core.mjs`
  - Passed (`2702` tests, `0` failures).

### seed331 status-row stale-at-death fix (2026-03-10)

- Symptom:
  - `seed331_tourist_wizard_gameplay` regressed to a screen mismatch at step
    `379`: status showed `HP:4(10)` in JS vs `HP:0(10)` in C/session.
  - RNG/events were still full parity; mismatch was render-boundary only.
- Root cause:
  - In JS death-message `--More--` paths, we blocked for dismissal without a
    guaranteed status refresh immediately before waiting.
  - C `more()` behavior refreshes status (`bot()`) before input wait, so HP=0
    is already visible at that boundary.
- Fix:
  - Generalized explicit `more(...)` helper in
    [`js/input.js`](/share/u/davidbau/git/mazesofmenace/game/js/input.js) to
    render status before waiting on dismissal, matching C `more()` behavior for
    all callers.
  - In both [`js/display.js`](/share/u/davidbau/git/mazesofmenace/game/js/display.js)
    and [`js/headless.js`](/share/u/davidbau/git/mazesofmenace/game/js/headless.js),
    also render status before death-message internal waits where
    `putstr_message(...)` blocks directly.
- Validation:
  - `seed331` targeted replay now matches screen/color fully (`389/389`).
  - `scripts/run-and-report.sh`: gameplay `34/34` green.

### CODEMATCH `uhitm.c` AD-branch alignment (`AD_WERE`/`AD_PEST`/`AD_FAMN`) (2026-03-10)

- Problem:
  - `uhitm` AD handlers for Rider/lycanthropy variants were still simplified
    and not matching C branch behavior in the m-vs-m path.
- Change:
  - `js/uhitm.js`:
    - `mhitm_ad_were` now delegates to `mhitm_ad_phys` (matching C m-vs-m).
    - `mhitm_ad_pest` now routes through `AD_DISE` semantics.
    - `mhitm_ad_famn` now zeroes damage for non-eaters
      (non-carnivorous/non-herbivorous/non-metallivorous defenders).
  - Added focused unit coverage:
    - `test/unit/codematch_uhitm_ad_branches.test.js`
      - were -> physical delegation behavior
      - pest -> disease delegation behavior
      - famine eater/non-eater split behavior
  - Updated `docs/CODEMATCH.md` rows from stub to implemented for:
    - `mhitm_ad_were`
    - `mhitm_ad_pest`
    - `mhitm_ad_famn`
- Validation:
  - `node --test test/unit/codematch_uhitm_ad_branches.test.js`
  - `node scripts/test-unit-core.mjs`
  - Both passed.

### CODEMATCH `uhitm.c` theft/disease branch expansion (`AD_SGLD`/`AD_SEDU`/`AD_SSEX` + `AD_DISE`) (2026-03-10)

- Problem:
  - Several m-vs-m `uhitm` AD handlers were still pure no-op stubs, limiting
    callchain fidelity in monster-vs-monster combat.
  - `steal.js:findgold()` only handled linked-list style inventories and missed
    JS runtime array inventories.
- Change:
  - `js/steal.js`:
    - `findgold()` now supports both array and linked-list inventory shapes.
  - `js/uhitm.js`:
    - `mhitm_ad_sgld`: now transfers gold from defender to attacker inventory
      with cancel/same-class gates.
    - `mhitm_ad_sedu`: now steals one item from defender inventory; tame
      attackers prefer non-cursed items; nymph theft marks `M_ATTK_AGR_DONE`.
    - `mhitm_ad_ssex`: continues delegating through seduction path and is now
      treated as partial rather than pure no-op.
    - `mhitm_ad_dise`: now preserves normal damage for susceptible defenders
      and zeroes damage for fungus/ghoul immunity cases.
  - `test/unit/codematch_uhitm_ad_branches.test.js` expanded to cover:
    - gold transfer,
    - seduction theft + nymph done flag,
    - tame cursed-item avoidance,
    - disease susceptible-target behavior.
  - `docs/CODEMATCH.md` updated from `Stub` to `Partial` for:
    - `mhitm_ad_sgld`
    - `mhitm_ad_sedu`
    - `mhitm_ad_ssex`
    - `mhitm_ad_dise`
- Validation:
  - `node --test test/unit/codematch_uhitm_ad_branches.test.js`
  - `node scripts/test-unit-core.mjs`

### CODEMATCH `uhitm.c` digestion/hallucination branch closure (`AD_DGST` + `AD_HALU`) (2026-03-10)

- Problem:
  - `mhitm_ad_dgst` and `mhitm_ad_halu` were still treated as stubs in the
    m-vs-m branch and did not reflect key C side effects.
- Change:
  - `js/uhitm.js`:
    - `mhitm_ad_dgst` now:
      - applies swallow-lethal damage (`mhm.damage = mdef.mhp`) for normal
        defenders, and
      - models Rider edge behavior where digesting a Rider kills the aggressor
        (`mondied`, `M_ATTK_AGR_DIED` / miss fallback).
    - `mhitm_ad_halu` now applies C-shaped m-vs-m hallucination effects:
      - set defender confusion (`mconf`) when attacker not cancelled and
        defender has eyes and can see,
      - clear wait strategy,
      - force zero damage.
  - Added/expanded targeted tests in:
    - `test/unit/codematch_uhitm_ad_branches.test.js`
      - digest non-Rider damage behavior
      - digest Rider aggressor-death behavior
      - hallucination confusion/strategy behavior
  - Updated `docs/CODEMATCH.md`:
    - `mhitm_ad_dgst`: Stub -> Partial
    - `mhitm_ad_halu`: Stub -> Implemented
    - `mhitm_ad_samu`: Stub -> Implemented (documented as C-faithful no-op m-vs-m branch)
- Validation:
  - `node --test test/unit/codematch_uhitm_ad_branches.test.js`
  - `node scripts/test-unit-core.mjs`

### CODEMATCH `uhitm.c` branch expansion (`AD_TLPT`/`AD_ENCH`/`AD_POLY`/`AD_SLIM`) (2026-03-10)

- Problem:
  - Several remaining `uhitm` m-vs-m AD handlers were still hard stubs and
    either zeroed damage incorrectly or omitted C branch gates.
- Change:
  - `js/uhitm.js`:
    - `mhitm_ad_tlpt`: now follows m-vs-m C gating shape (cancel, damage gate,
      no-tele gate, negation) and clears wait strategy on eligible branch;
      async relocation remains pending in this sync path.
    - `mhitm_ad_ench`: now preserves normal damage (C m-vs-m branch has no
      special handling).
    - `mhitm_ad_poly`: now applies C-shaped negation/cooldown gating and
      special-hit termination (`M_ATTK_HIT`, `done`), with full `newcham`
      transformation still pending.
    - `mhitm_ad_slim`: now applies negation + `rn2(4)` + slimeproof gate,
      then zero-damage hit branch and wait-strategy clear; full
      munslime/newcham pipeline remains pending.
  - `test/unit/codematch_uhitm_ad_branches.test.js` expanded with targeted
    tests for the above branches.
  - `docs/CODEMATCH.md` updated from `Stub` to `Implemented/Partial` for these
    rows.
- Validation:
  - `node --test test/unit/codematch_uhitm_ad_branches.test.js`
  - `node scripts/test-unit-core.mjs`
## 2026-03-10: `mhitu` AD_SLIM/AD_ENCH/AD_WERE faithfulness pass

- Problem: several `mhitu.c` attack handlers in `js/mhitu.js` were still effectively stubs, notably forcing `AD_SLIM` damage to zero unconditionally and not applying lycanthropy/enchantment effects.
- Change:
  - `mhitu_ad_slim`: ported C branch structure for hero immunity/effect handling (negation, flaming, noncorporeal/green-slime immunity, Slimed timer + delayed killer) while preserving normal physical damage where C preserves it.
  - `mhitu_ad_ench`: added C-style negation gate + worn-slot selection and `drain_item` application.
  - `mhitu_ad_were`: added 1/4 gated lycanthropy infection path (`set_ulycn`) with protection/negation checks.
  - Fixed underlying runtime bug exposed by new sliming path: `find_delayed_killer()` incorrectly referenced `svk.killer`; now uses module `killer` list.
- Validation:
  - Added combat regression tests for `AD_SLIM` and `AD_WERE`.
  - Added direct delayed-killer unit tests (`end_delayed_killer.test.js`).
  - `npm run -s test:unit` passes (2712/2712).

## 2026-03-10: `mhitu` larger branch slice (`AD_DGST` / `AD_PEST` / `AD_SSEX`)

- Problem: several `mhitu` handlers were still overly stubbed, causing incorrect effect semantics:
  - `AD_DGST` path could still inflict direct damage in JS despite C zeroing damage in `mhitu`.
  - `AD_PEST` was missing the `diseasemu()` side-effect call.
  - `AD_SSEX` was not routed through the C fallback seduction/theft path.
- Change:
  - `mhitu_ad_dgst`: now explicitly sets `mhm.damage = 0` after hit message for C-faithful `mhitu` behavior.
  - `mhitu_ad_pest`: now calls `diseasemu()` (message + disease side effects) while preserving normal physical damage.
  - `mhitu_ad_ssex`: now delegates to `mhitu_ad_sedu()` fallback behavior (without SYSOPT_SEDUCE branch).
- Validation:
  - Added `mattacku` tests in `combat.test.js` for:
    - `AD_DGST` no direct damage
    - `AD_PEST` disease side-effect
    - `AD_SSEX` seduction path no direct damage
  - `npm run -s test:unit` passes (2715/2715).

## 2026-03-10: `stealamulet` implementation + `mhitu AD_SAMU` await wiring

- Problem:
  - `steal.c:stealamulet()` was still a JS stub, and `mhitu_ad_samu` called it
    without awaiting any side effects.
  - This left invocation-item theft behavior under-implemented and made
    `AD_SAMU` less C-faithful than surrounding `mhitu` handlers.
- Change:
  - Implemented `stealamulet(mon, player, display, map)` in `js/steal.js` with
    C-shaped behavior:
    - target selection among quest artifacts/invocation items with `rnd(n)`
      tie-breaking,
    - fake-amulet exclusion for Wizard thieves (`iswiz`),
    - worn-item pre-removal ordering (cloak/armor/shirt/gloves/weapon/rings),
    - inventory transfer + `uhave` flag updates,
    - theft message and post-theft teleport attempt (`can_teleport` +
      `tele_restrict` + `rloc`).
  - Wired `mhitu_ad_samu` to `await stealamulet(...)` and pass map context.
  - Tightened `AD_POLY` combat tests to validate direct-damage path behavior
    (`takeDamage` bypass vs fallback) instead of assuming unchanged HP.
  - Added dedicated `stealamulet` unit coverage in
    `test/unit/codematch_worn_steal_surface.test.js`.
- Validation:
  - `node --test test/unit/combat.test.js`
  - `node --test test/unit/codematch_worn_steal_surface.test.js`
  - `npm run -s test:unit` (2719/2719 passing)

## 2026-03-10: `were.c` control-flow fidelity pass (`you_were` / `you_unwere`)

- Problem:
  - `you_were` / `you_unwere` existed in JS but did not fully preserve C
    control flow boundaries:
    - controllable-poly path vs `monster_nearby()` gating,
    - controlled unwere "remain in beast form" branch with timer refresh,
    - default runtime wiring to real polymorph/rehumanize routines.
- Change:
  - `js/were.js`:
    - `you_were` now mirrors C branch shape:
      - computes controllable polymorph gate (`polyControl` and not
        stunned/unaware),
      - applies confirmation callback only for controllable path,
      - otherwise blocks on nearby-hostile gate,
      - then performs transformation through `polymon` (dynamic import
        fallback) and increments `were_changes`.
    - `you_unwere` now mirrors C branch shape:
      - optional purification (`set_ulycn`),
      - checks current were-form state,
      - applies nearby-hostile gate,
      - supports controlled "remain in beast form" callback,
      - rehumanizes by default (dynamic import fallback), or refreshes were
        timer when remaining in beast form with no timer active.
    - `set_ulycn` now calls `player.set_uasmon()` when available, so
      lycanthropy catch/cure can update intrinsic state immediately.
  - Added targeted tests in
    `test/unit/codematch_were_wield_worn_worm_surface.test.js` for:
    - uncontrollable `you_were` blocked by nearby monsters,
    - controllable `you_were` confirmation decline path,
    - controllable `you_unwere` remain-beast path timer refresh.
  - Updated `docs/CODEMATCH.md` summary line for `were.c` to all-public-surface
    aligned.

## 2026-03-10: Canonical scorefiles for deterministic C endgame captures

- Problem:
  - Some C-recorded sessions could surface endgame warning text:
    `Cannot open file logfile...` / `Cannot open file xlogfile...`
  - Cause: harness cleanup removed `record/logfile/xlogfile`, and endgame score
    code then emitted filesystem warnings into captured screens.
- Change:
  - Added canonical scorefile creation after cleanup for C launch paths:
    - `test/comparison/c-harness/run_session.py`
    - `test/comparison/c-harness/keylog_to_session.py`
    - `selfplay/interface/tmux_adapter.js`
  - Behavior now matches an installed environment with present score files,
    eliminating this avoidable warning condition for newly recorded sessions.
- Validation:
  - Regenerated `seed331` to a temp session and verified warning text is absent.

## 2026-03-10: `mhitu` branch-closure chunk (`AD_CURS` + `AD_FAMN`) and stale ledger fixes

- Problem:
  - `mhitu_ad_curs` still forced `mhm.damage = 0`, which is not C-faithful in
    the hero-target branch (C keeps normal physical damage and applies curse
    side effects conditionally).
  - `mhitu_ad_famn` consumed `rn1(40,40)` unconditionally and did not apply the
    actual hunger change branch.
  - `docs/CODEMATCH.md` still had stale rows marking several `mhitu` handlers
    (`AD_CURS`, `AD_POLY`, `AD_SAMU`, `AD_FAMN`) as stubs despite landed code.
- Change:
  - `js/mhitu.js`:
    - `mhitu_ad_curs` now follows C branch shape:
      - daytime gremlin early-return,
      - `!mcan && !rn2(10)` curse gate,
      - laughter messaging (blind/deaf aware),
      - clay-golem rehumanize branch,
      - `attrcurse()` application,
      - and importantly preserves normal physical damage.
    - `mhitu_ad_famn` now applies hunger drain only when hero is not fainted:
      `morehungry(rn1(40,40))`, matching C branch structure.
  - `test/unit/combat.test.js`:
    - added regression test that `AD_CURS` no longer zeroes physical damage.
    - added `AD_FAMN` hunger gating test (normal vs fainted hero).
  - `docs/CODEMATCH.md`:
    - updated stale `mhitu` rows for `AD_CURS`, `AD_POLY`, `AD_SAMU`,
      and `AD_FAMN` from stub wording to accurate partial implementations.

## 2026-03-10: `mhitu AD_DETH` C-branch alignment pass

- Problem:
  - `mhitu_ad_deth` was still a coarse approximation and missed key C branch
    structure:
    - undead-target reduced-damage behavior,
    - antimagic-gated touch-of-death vs life-force-drain path.
- Change:
  - `js/mhitu.js`:
    - added undead-target branch: reduce damage to `(damage+1)/2` and emit
      "Was that the touch of death?".
    - added antimagic-aware high-roll handling:
      - no antimagic: `touch_of_death(...)` and zero direct damage,
      - with antimagic: life-force-drain messaging + `permdmg` path.
    - preserved existing low-roll lucky branch and mid-roll life-force-drain
      branch.
  - `test/unit/combat.test.js`:
    - added deterministic regression test comparing undead-target `AD_DETH`
      against same-seed `AD_PHYS`, asserting reduced damage behavior.
  - `docs/CODEMATCH.md`:
    - updated stale `mhitu_ad_deth` row text to reflect current partial
      C-shaped implementation.

## 2026-03-10: `mhitu` multi-function C-flow pass (`AD_DRIN`/`AD_SLOW`/`AD_STON`)

- Problem:
  - Three hero-target `mhitu` handlers still had known branch-shape gaps:
    - `AD_DRIN` lacked C no-harm gates and repeated-attack short-circuiting.
    - `AD_SLOW` used an inline message/TODO rather than the shared slowdown
      helper path.
    - `AD_STON` printed simplified messages and did not call `do_stone_u()`.
- Change:
  - `js/mhitu.js`:
    - `AD_DRIN`:
      - added C gates for `defends(AD_DRIN, player.weapon)` and `!has_head`.
      - added helmet-block path (`uarmh && rn2(8)`) with zero direct damage.
      - added half-physical damage shaping before final damage application.
      - introduced per-cycle `combatState.skipdrin` so harmless DRIN hits skip
        remaining DRIN attacks from the same monster move.
    - `AD_SLOW`:
      - now calls shared `u_slow_down(player, display)` under
        `!negated && HFast && !rn2(4)` gate, matching C branch structure.
    - `AD_STON`:
      - aligned cough/hiss/grimace messaging branches with deaf/blind/hallu
        sensitivity.
      - wired `(!rn2(10) || moonphase==NEW_MOON)` into `do_stone_u(...)`.
      - on successful stoning, now sets `mhm.hitflags`, `mhm.done`, and
        suppresses further damage in this attack.
  - `test/unit/combat.test.js`:
    - added regression test asserting headless hero DRIN behavior:
      no damage and only one DRIN hit message for a multi-DRIN attack cycle.
  - `docs/CODEMATCH.md`:
    - updated `mhitu_ad_drin`, `mhitu_ad_slow`, and `mhitu_ad_ston` rows to
      accurate partial C-faithful status.

## 2026-03-10: `uhitm` m-vs-m erosion/curse branch closure (`AD_RUST/CORR/DCAY/CURS`)

- Problem:
  - Four m-vs-m `uhitm` handlers were still hard stubs:
    - `mhitm_ad_rust`, `mhitm_ad_corr`, `mhitm_ad_dcay`, `mhitm_ad_curs`.
  - This left important C branch behavior unmodeled: cancellation gates,
    golem-vulnerability instant-kill paths, defender wait-strategy clearing,
    and curse/cancel effects in monster-vs-monster combat.
- Change:
  - `js/uhitm.js`:
    - `mhitm_ad_rust`:
      - added `mcan` gate,
      - added `completelyrusts` iron-golem instant-kill path (`monkilled`),
      - added erosion + wait-strategy clear + zero-damage branch.
    - `mhitm_ad_corr`:
      - added `mcan` gate,
      - added erosion + wait-strategy clear + zero-damage branch.
    - `mhitm_ad_dcay`:
      - added `mcan` gate,
      - added `completelyrots` golem instant-kill path (`monkilled`),
      - added erosion + wait-strategy clear + zero-damage branch.
    - `mhitm_ad_curs`:
      - added daytime-gremlin guard,
      - added `!mcan && !rn2(10)` cancel branch,
      - added wait-strategy clear,
      - added clay-golem destruction branch via `mondied`,
      - preserved normal damage outside curse-special branches.
  - `test/unit/codematch_uhitm_ad_branches.test.js`:
    - added targeted regression tests for all four handlers, including
      rust/rot golem-kill paths and curse cancellation/clay destruction.
  - `docs/CODEMATCH.md`:
    - upgraded these four rows from stub to accurate partial C-shaped status.

## 2026-03-10: ASYNC_CLEANUP runtime diagnostics and origin-await cleanup

- Removed boundary-facade dependency in runtime/replay diagnostics:
  - added `getRuntimeInputSnapshot(game)` in `js/allmain.js`,
  - switched command diagnostics and replay boundary trace formatting to this
    helper,
  - removed `NetHackGame.getInputBoundaryState()`.
- Simplified command-loop key reads:
  - removed `NetHackGame._readCommandLoopKey()`,
  - now uses direct `await nhgetch()` at both callsites.
- Removed one remaining raw timer await from gameplay path:
  - `js/storage.js::handleSave()` now uses `await nh_delay_output(500)`
    instead of `await new Promise(setTimeout, 500)`, so the delay is tracked
    through origin await registration.
- Validation at each step:
  - unit tests stayed green (`2731/2731`),
  - session parity stayed fully green (`34/34`, all channels).

## 2026-03-10: `uhitm` m-vs-m `AD_STON` stub closure

- Problem:
  - `mhitm_ad_ston` in `uhitm.js` was still a full stub (`damage=0`), missing
    C branch behavior for monster-vs-monster petrification.
- Change:
  - `js/uhitm.js`:
    - replaced stub with C-shaped m-vs-m logic:
      - cancellation (`mcan`) early return,
      - stone-resistant defender path with zero direct damage,
      - non-resistant petrification kill path via `monkilled`,
      - `M_ATTK_DEF_DIED`/`done` termination on defender death.
  - `test/unit/codematch_uhitm_ad_branches.test.js`:
    - added targeted tests for kill-path and stone-resistant path behavior.
  - `docs/CODEMATCH.md`:
    - upgraded `mhitm_ad_ston` from stub to partial with explicit remaining
      edge gaps (munstone/newcham/grow_up semantics).

## 2026-03-10: `uhitm` m-vs-m theft/disease branch fidelity (`AD_SGLD/SEDU/DISE`)

- Problem:
  - Several gameplay-relevant m-vs-m branches were still missing C side
    effects:
    - `mhitm_ad_sgld` incorrectly blocked same-class theft and never marked
      aggressor-done teleport intent.
    - `mhitm_ad_sedu` lacked `possibly_unwield`/`mselftouch`/defender-death
      side effects and set nymph done-flag without teleport gating.
    - `mhitm_ad_dise` lacked the `defended(AD_DISE)` immunity gate.
- Change:
  - `js/uhitm.js`:
    - `mhitm_ad_sgld`:
      - removed incorrect same-class (`mlet`) block in m-vs-m path,
      - kept cancel gate + wait-strategy clear,
      - sets `M_ATTK_AGR_DONE` when teleport is allowed (still no `rloc` here).
    - `mhitm_ad_dise`:
      - added `defended(mdef, AD_DISE)` immunity.
    - `mhitm_ad_sedu`:
      - after theft, now runs `possibly_unwield(mdef, false)`,
      - runs `mselftouch(mdef, ..., false)` and terminates attack on defender
        death (`M_ATTK_DEF_DIED`, `done`),
      - keeps wait-strategy clear,
      - nymph `M_ATTK_AGR_DONE` now gated by `!tele_restrict(...)`.
  - `test/unit/codematch_uhitm_ad_branches.test.js`:
    - added regression checks for:
      - same-class gold theft succeeding in m-vs-m,
      - `AD_SGLD` setting `M_ATTK_AGR_DONE`,
      - `AD_SEDU` petrification side effect via `mselftouch`.
  - `docs/CODEMATCH.md`:
    - updated rows for `mhitm_ad_sgld`, `mhitm_ad_sedu`, `mhitm_ad_dise`
      with the new parity status and remaining gaps (`rloc`/grow_up coupling).

## 2026-03-10: async m-vs-m AD runtime path for teleport/slime fidelity

- Problem:
  - `mhitm` uses an async combat loop, but `uhitm` AD dispatch was sync-only.
  - This prevented C-faithful awaited effects in m-vs-m AD handlers:
    - `AD_TLPT` could clear strategy but could not execute `rloc(...)`.
    - `AD_SLIM` could gate damage but could not run `munslime/newcham`.
- Change:
  - `js/uhitm.js`:
    - added `mhitm_ad_tlpt_async(...)`:
      - preserves C gate order (`mcan`, fatal gate, `tele_restrict`, negation),
      - clears `STRAT_WAITFORU`,
      - executes `rloc(mdef, RLOC_NOMSG, ...)` when runtime map context exists.
    - added `mhitm_ad_slim_async(...)`:
      - preserves C gate order (negation + `rn2(4)` + `slimeproof`),
      - attempts `munslime(...)`,
      - on failure and survival, applies direct green-slime transform via
        `runtimeApplyNewchamDirect(...)`,
      - sets wait-strategy clear + hit flags on transform,
      - handles defender-death termination (`M_ATTK_DEF_DIED`, `done`),
      - enforces zero damage after successful sliming branch.
    - added `mhitm_adtyping_async(...)` and kept sync dispatcher for legacy paths.
  - `js/mhitm.js`:
    - `mdamagem(...)` now awaits `mhitm_adtyping_async(...)`, enabling awaited
      m-vs-m AD behavior in the actual runtime callchain.
  - `js/makemon.js`:
    - exported `runtimeApplyNewchamDirect(...)` wrapper for controlled direct
      form changes in parity-sensitive runtime paths.
  - `test/unit/codematch_uhitm_ad_branches.test.js`:
    - added async tests for:
      - `mhitm_ad_tlpt_async` gate/strategy behavior,
      - `mhitm_ad_slim_async` green-slime transform path.
- Validation:
  - `node --test test/unit/codematch_uhitm_ad_branches.test.js` (25/25)
  - `npm run -s test:unit` (2737/2737)
  - `npm run -s test:session -- --max-failures=5` (151/151)

## 2026-03-10: artifact is_magic_key bless/curse rules aligned to C role split

- Problem:
  - JS `is_magic_key(mon, obj)` was not fully role-faithful for Master Key of
    Thievery. C behavior is role-sensitive and intentionally asymmetric.
- Change:
  - `js/artifact.js`:
    - for Rogues, key is "magic" when not cursed;
    - for non-Rogues, key is "magic" only when blessed.
  - `test/unit/codematch_batch_sweep.test.js`:
    - added focused branch test for rogue/non-rogue + bless/curse combinations.
  - `docs/CODEMATCH.md`:
    - refreshed artifact invoke/utility rows from stale stub markers to current
      implementation status.
- Why this matters:
  - This avoids over-generalized blessing checks and keeps edge-case lock/key
    behavior faithful to C when role identity changes the gating rule.
- Validation:
  - `node --test test/unit/codematch_batch_sweep.test.js` (10/10)
  - `npm run -s test:unit` (2747/2747)
  - `npm run -s test:session -- --max-failures=5` (151/151)

## 2026-03-10: potion command parity batch for dodip/dip_into

- Problem:
  - `dodip` and `dip_into` existed as command stubs, so `#dip` behavior was
    effectively unavailable despite `potion_dip` core logic being present.
- Change:
  - `js/potion.js`:
    - replaced both stubs with getobj-backed selection flow:
      - select potion (`POTION_CLASS`) and dip target (`dip_ok`),
      - route through existing `potion_dip(...)` core mixer,
      - return boolean turn-use semantics expected by `cmd.js`.
    - `dip_into` now supports optional preselected target object for command-queue
      integration while still supporting normal selection fallback.
  - `test/unit/codematch_batch_sweep.test.js`:
    - added direct coverage for `dodip` and `dip_into` successful paths.
  - `docs/CODEMATCH.md`:
    - updated potion rows for `dodip` and `dip_into` to reflect real getobj-backed
      command behavior.
- Why this matters:
  - This closes a gameplay-facing command surface gap instead of leaving
    parity-critical behavior behind inert stubs.
- Validation:
  - `node --test test/unit/codematch_batch_sweep.test.js` (12/12)
  - `npm run -s test:unit` (2749/2749)
  - `npm run -s test:session -- --max-failures=5` (151/151)

## 2026-03-10: artifact invoke selection now composes with inventory GETOBJ constants

- Problem:
  - `invoke_ok()` used local non-canonical constants (`2/-3`) which did not
    align with inventory `getobj()` (`GETOBJ_SUGGEST=1`), so command-layer
    invocation selection could not compose correctly.
  - `doinvoke()` itself was still a no-op return.
- Change:
  - `js/artifact.js`:
    - switched `invoke_ok()` to canonical `GETOBJ_*` constants from `const.js`.
    - implemented async `doinvoke(player, game)`:
      - selects invokable item via `getobj(..., invoke_ok, ...)`,
      - dispatches through `arti_invoke(...)`,
      - returns command time semantics (`ECMD_TIME` / `ECMD_CANCEL`).
    - improved invoke side-effect routing:
      - `invoke_taming` now uses `read.seffect_taming(...)` when runtime context
        is available,
      - `invoke_untrap` now routes through `trap.dountrap()`,
      - `invoke_charge_obj` now selects a target via `getobj` and calls
        `read.recharge(...)`.
  - `test/unit/codematch_batch_sweep.test.js`:
    - updated `invoke_ok` expectation to canonical suggest value,
    - added `doinvoke` turn-consumption test.
  - `docs/CODEMATCH.md`:
    - updated stale `Mb_hit`/`doinvoke` stub labels and refreshed invoke row notes.
- Validation:
  - `node --test test/unit/codematch_batch_sweep.test.js` (13/13)
  - `npm run -s test:unit` (2750/2750)
  - `npm run -s test:session -- --max-failures=5` (151/151)

## 2026-03-10: artifact invoke C-semantics follow-up (retouch + cancel paths)

- Problem:
  - `doinvoke` still skipped C's `retouch_object()` guard.
  - Several invoke helpers didn't match C cancel/cooldown semantics:
    - `invoke_untrap`: should cancel and clear cooldown age when no action.
    - `invoke_charge_obj`: should cancel and clear cooldown age when no target.
  - Healing invoke lacked C-side status cleanup (Sick/Slimed/timed blindness).
- Change:
  - `js/artifact.js`:
    - `doinvoke` now runs `retouch_object(..., FALSE)` before dispatching invoke.
    - `invoke_untrap` now returns `ECMD_CANCEL` and clears `obj.age` on no-op.
    - `invoke_charge_obj` now:
      - uses `read.charge_ok` for target filtering,
      - applies C-shaped cancel semantics (`age=0`, `ECMD_CANCEL`) when canceled,
      - applies role-aware blessed charging effect (artifact role matches hero role
        or artifact role is `NON_PM`).
    - `invoke_healing` now clears sickness/sliming and reduces timed blindness
      down to cream-only timeout in addition to HP healing.
  - `test/unit/codematch_batch_sweep.test.js`:
    - added coverage for healing status cleanup and charge-cancel cooldown reset.
- Validation:
  - `node --test test/unit/codematch_batch_sweep.test.js` (15/15)
  - `npm run -s test:unit` (2752/2752)
  - `npm run -s test:session -- --max-failures=5` (151/151)
- Note:
  - Running unit and session suites concurrently can cause false session timeout
    failures from host contention; parity validation should run sessions
    serially.

## 2026-03-10: artifact non-power invoke cleanup (crystal ball + carried-only no-op)

- Change:
  - `js/artifact.js`:
    - `arti_invoke` non-artifact/non-power path now mirrors C crystal-ball
      behavior by delegating to `detect.use_crystal_ball(...)` when the invoked
      object is a crystal ball.
    - `nothing_special` now emits feedback only when the object is carried,
      matching C's `carried(obj)` guard.
    - `invoke_taming` now returns `ECMD_TIME` explicitly.
  - `test/unit/codematch_batch_sweep.test.js`:
    - added crystal-ball invoke routing coverage.
- Validation:
  - `node --test test/unit/codematch_batch_sweep.test.js` (16/16)
  - `npm run -s test:unit` (2753/2753)
  - `npm run -s test:session -- --max-failures=5` (151/151)

## 2026-03-10: read.seffect_charging non-confused getobj/recharge path restored

- Problem:
  - `seffect_charging` non-confused branch still consumed the scroll but never
    selected/charged an item (placeholder "feeling of loss" behavior).
- Change:
  - `js/read.js`:
    - imports `getobj` and canonical `GETOBJ_*` constants.
    - keeps C ordering: identify scroll if needed, consume scroll, then prompt
      for chargeable target via `getobj("charge", charge_ok, ...)`.
    - calls `recharge(otmp, scursed ? -1 : sblessed ? 1 : 0)` when target exists.
    - sets bottom-line refresh in confused branch (`disp.botl = TRUE` analogue).
  - `test/unit/codematch_batch_sweep.test.js`:
    - added `seffect_charging` coverage verifying non-confused recharging path.
- Validation:
  - `node --test test/unit/codematch_batch_sweep.test.js` (17/17)
  - `npm run -s test:unit` (2754/2754)
  - `npm run -s test:session -- --max-failures=5` (151/151)

## 2026-03-10: read.seffect_light non-confused path aligned to C litroom/lightdamage

- Problem:
  - `seffect_light` non-confused branch used bespoke JS-only message handling
    and omitted the C-side `lightdamage(...)` effect when appropriate.
- Change:
  - `js/read.js`:
    - imports `lightdamage` from `zap.js`.
    - non-confused branch now performs C-shaped flow:
      - `litroom(player, map, !scursed)`;
      - if not cursed, `await lightdamage(sobj, player, 5, true)`.
    - removed custom non-confused message branch in favor of shared engine flow.
  - `docs/CODEMATCH.md`:
    - marks `seffect_light` as implemented.
- Validation:
  - `node --test test/unit/codematch_batch_sweep.test.js` (17/17)
  - `npm run -s test:unit` (2754/2754)
  - `npm run -s test:session -- --max-failures=5` (151/151)

## 2026-03-10: read.seffect_taming maybe_tame flow aligned to C

- Problem:
  - `seffect_taming` was still approximate: it directly toggled tame flags in a
    radius and skipped C's `maybe_tame` decision flow and visibility accounting.
- Change:
  - `js/read.js`:
    - implemented async `maybe_tame` with C-shaped branching:
      - cursed scroll: anger via `setmangry(...)`, return `-1` when peacefulness
        is lost;
      - non-cursed: apply `resist(...)` gate and call `tamedog(...)` when
        allowed; return `+1` when tame/peaceful state improves.
    - `seffect_taming` now follows C control flow:
      - swallowed branch uses `u.ustuck` directly;
      - non-swallowed branch scans `bd = confused ? 5 : 1`, checks map bounds,
        includes center-steed fallback, and computes `vis_results` via
        `canspotmon(...)`.
  - `test/unit/codematch_batch_sweep.test.js`:
    - added deterministic coverage for cursed-nearby angering and swallowed
      (`u.ustuck`) path behavior.
  - `docs/CODEMATCH.md`:
    - marked `seffect_taming` implemented and corrected stale `seffect_fire`
      note to reflect current `explode()` routing.
- Validation:
  - `node --test test/unit/codematch_batch_sweep.test.js` (19/19)
  - `npm run -s test:unit` (2756/2756)
  - `npm run -s test:session -- --max-failures=5` (151/151)
  - Note: one initial full-suite run hit a single timeout on seed033, but the
    session passed in isolated rerun and in a subsequent full-suite rerun.

## 2026-03-10: read.seffect_fire blessed target flow and confused edge-cases

- Problem:
  - `seffect_fire` still used a simplified path: blessed scrolls always
    exploded on the hero and confused/underwater/fire-resistance messaging did
    not follow C branches.
- Change:
  - `js/read.js`:
    - added blessed target selection prompt (`getpos_sethilite` + `getpos_async`)
      and fallback-to-hero when target is invalid.
    - aligned confused branch messaging/effects with C shape:
      - underwater vaporize message,
      - fire-resistance warm/pretty-hands message,
      - otherwise burn hands and lose 1 HP.
    - aligned non-confused pre-explosion behavior:
      - underwater violent vaporize message,
      - tower-of-flame message only when explosion is centered on hero.
- Validation:
  - `node --test test/unit/codematch_batch_sweep.test.js` (19/19)
  - `npm run -s test:unit` (2756/2756)
  - `npm run -s test:session -- --max-failures=5` (151/151)

## 2026-03-10: read.seffect_earth + seffect_punishment moved onto shared C-style paths

- Problem:
  - `seffect_earth` still used bespoke direct-damage logic and skipped the
    existing boulder helper callchain.
  - `seffect_punishment` bypassed the shared `punish()` path and only flipped a
    local marker.
- Change:
  - `js/read.js`:
    - `seffect_earth` now uses the C-shaped helper flow:
      - blessed: scans neighborhood and applies `drop_boulder_on_monster(...)`;
      - non-blessed: applies `drop_boulder_on_player(...)`;
      - blessed with no affected monsters emits "But nothing else happens."
    - `seffect_punishment` now delegates to `punish(sobj, player)` when active
      (still keeps confused/blessed "You feel guilty." branch).
    - `drop_boulder_on_monster` now threads `map/game` to use explicit map
      lookups and wake-near calls.
    - `punish()` now records simplified punishment state (`Punished`, `uball`,
      `uchain`) so repeated punishment has a stable heavier-ball path.
  - `test/unit/codematch_batch_sweep.test.js`:
    - added coverage for punishment guilty path and active punishment path.
  - `docs/CODEMATCH.md`:
    - updated `seffect_earth` and `seffect_punishment` rows from stale notes to
      current partial-implementation status.
- Validation:
  - `node --test test/unit/codematch_batch_sweep.test.js` (21/21)
  - `npm run -s test:unit` (2758/2758)
  - `npm run -s test:session -- --max-failures=5` (151/151)

## 2026-03-10: read.seffect_earth level/terrain gating tightened to C shape

- Problem:
  - `seffect_earth` still lacked the C-level gating and square suitability
    checks, causing overly broad behavior on levels where earth effects should
    be suppressed or filtered.
- Change:
  - `js/read.js`:
    - added C-shaped gate before earth effects:
      - skip when rogue level,
      - require `has_ceiling`,
      - require earth-level if in endgame.
    - added message branching using `avoid_ceiling(...)` and `ceiling(...)`.
    - added `sokoban_guilt()` call when effect applies.
    - added square suitability checks for neighborhood drops:
      - `!closed_door(x,y)`,
      - `!IS_OBSTRUCTED(typ)`,
      - `!IS_AIR(typ)`.
    - kept player-hit and boulder helper paths from prior slice.
- Validation:
  - `node --test test/unit/codematch_batch_sweep.test.js` (21/21)
  - `npm run -s test:unit` (2758/2758)
  - `npm run -s test:session -- --max-failures=5` (151/151)

## 2026-03-10: punish/unpunish state moved from flag-only to object-backed flow

- Problem:
  - `seffect_punishment` delegated to `punish()`, but `punish()` still mostly
    toggled scalar flags and did not create/attach concrete ball+chain objects
    compatible with ball-chain movement helpers.
- Change:
  - `js/read.js`:
    - `punish(sobj, player, map)` now:
      - detects existing punishment and applies heavier-ball levy on the active
        ball object,
      - creates concrete chain/ball objects (`CHAIN_CLASS`/`BALL_CLASS`) when
        first applying punishment,
      - populates both compatibility aliases (`uball`/`uchain` and
        `ball`/`chain`),
      - places objects via `placebc(player,map)` when not swallowed.
    - non-solid form branch now materializes a loose ball on the floor when map
      context is available.
    - `unpunish(player, map)` now clears both alias sets and resets punishment
      flags instead of referencing stale globals.
    - `seffect_punishment` now passes map context into `punish(...)`.
  - `docs/CODEMATCH.md`:
    - updated `seffect_punishment` and stale `seffect_fire` wording to reflect
      current implementation status.
- Validation:
  - `node --test test/unit/codematch_batch_sweep.test.js` (21/21)
  - `npm run -s test:unit` (2758/2758)
  - `npm run -s test:session -- --max-failures=5` (151/151)

## 2026-03-11: potion blindness/hallucination/levitation state transitions aligned to C order

- Problem:
  - `potion.js` had shallow status-transition hooks for blindness/hallucination and a brittle `peffect_levitation()` path (mixed state flags, incomplete C ordering).
  - `toggle_blindness()` refreshed with no map context, so `see_monsters()` could no-op in headless/runtime contexts.
- Change:
  - `js/potion.js`:
    - `toggle_blindness()` now mirrors C's immediate-visibility update shape:
      - marks vision dirty,
      - runs immediate `vision_recalc()`,
      - refreshes monster visibility with active map context,
      - calls `learn_unseen_invent()` when sight returns.
    - `make_hallucinated()` changed-state path now mirrors C redraw ordering:
      - on hallucination end, refresh mimic/eat message state (`eatmupdate()`),
      - redraw swallowed view if engulfed (`swallowed(0, player)`), else refresh monsters/objects/traps,
      - update inventory and only then emit the hallucination message.
    - `peffect_levitation()` now follows C flow and flag semantics:
      - startup timeout-to-1 before `float_up()`,
      - cursed path clears `I_SPECIAL`,
      - blessed path adds timeout and sets `I_SPECIAL`,
      - sink interaction via `spoteffects(false)`,
      - final `float_vs_flight()` sync.
- Validation:
  - `node --test test/unit/command_quaff_prompt.test.js`
  - `node --test test/unit/codematch_blindness_restore_surface.test.js`
  - `node --test test/unit/codematch_batch_sweep.test.js`
  - `node test/comparison/session_test_runner.js test/comparison/sessions/seed303_caveman_selfplay200_gameplay.session.json`

## 2026-03-11: POT_WATER lycanthropy side-effects aligned to C branches

- Problem:
  - `peffect_water()` covered core damage/exercise branches but missed the C lycanthropy transitions (`you_were`/`you_unwere`/`set_ulycn`) that depend on bless/curse and alignment/monster state.
- Change:
  - `js/potion.js`:
    - Added C-branch lycan effects:
      - holy water in undead/chaotic branch now cures lycanthropy (`you_unwere(..., false)` if currently beast form, then `set_ulycn(-1)`).
      - cursed holy/unholy water now triggers `you_were()` when hero has lycanthropy and is not currently polymorphed (`!Upolyd`).
      - blessed lawful/non-chaotic path now uses purification (`you_unwere(..., true)`) when lycanthropic.
    - Added small helper predicates for PM validity, lycan form detection, and `Upolyd` shape checks.
    - Affinity message now uses `makeplural(...)` for C-like wording.
- Validation:
  - `node --test test/unit/codematch_blindness_restore_surface.test.js`
  - `node --test test/unit/command_quaff_prompt.test.js`
  - `node test/comparison/session_test_runner.js test/comparison/sessions/seed303_caveman_selfplay200_gameplay.session.json`

## 2026-03-11: invent.c surface de-stub batch (`display_used_invlets`/`doperminv`/`dotypeinv`/`dounpaid`/`menu_identify`/`reroll_menu`)

- Problem:
  - Several `invent.c` compatibility surfaces were still explicit stubs in `invent.js`, and `count_unidentified()` still used linked-list iteration against JS arrays.
- Change:
  - `js/invent.js`:
    - `count_unidentified()` now correctly counts against JS array inventories.
    - `display_used_invlets()` now reports current used inventory letters on the message line.
    - `doperminv()` now toggles `flags.perm_invent`, invokes `perm_invent_toggled()`, and emits an on/off status message.
    - `dotypeinv()` now emits current inventory categories/items (instead of no-op stub).
    - `dounpaid()` now lists unpaid carried items (including container-held unpaid contents) and reports the no-unpaid case.
    - `menu_identify()` now routes into `identify_pack()` with a normalized limit; `reroll_menu()` now reuses that path.
  - `docs/CODEMATCH.md`:
    - Updated the above `invent.c` rows from `Implemented (stub)` to `Implemented`.
  - Added `test/unit/invent_surface_behavior.test.js` covering these surfaces.
- Validation:
  - `node --test test/unit/invent_surface_behavior.test.js`
  - `node --test test/unit/codematch_batch_sweep.test.js`
  - `node test/comparison/session_test_runner.js test/comparison/sessions/seed303_caveman_selfplay200_gameplay.session.json`

## 2026-03-11: monmove `mind_blast` hero-effect fidelity slice

- Problem:
  - `mind_blast()` in `monmove.js` was still marked partial with two gameplay-significant TODOs: hero damage application and hidden/disguised hero reveal side effects.
- Change:
  - `js/monmove.js`:
    - Exported `mind_blast` for focused unit testing.
    - Wired hero damage path to `mdamageu(...)` so lock-on now applies real HP loss/death handling instead of a no-op.
    - Ported C-faithful reveal side effects before damage:
      - clear `uundetected` and refresh with `newsym`, or
      - clear non-monster `m_ap_type` disguise (`mappearance=0`) and refresh with `newsym`.
    - Added lock-on message text by lock source (`telepathy` / `latent telepathy` / `mind`).
    - Replaced monster-target wakeup simplification (`sleeping=false`) with `wakeup(...)` call before damage.
    - Updated `dochug` callsite to pass `game` into `mind_blast` for full damage/death context.
  - `docs/CODEMATCH.md`:
    - Refreshed `mind_blast` row notes to remove the old hero-damage/unhide TODOs and document remaining partial gaps precisely.
  - Added tests: `test/unit/monmove_mind_blast.test.js`.
- Validation:
  - `node --test test/unit/monmove_mind_blast.test.js`
  - `node --test test/unit/monmove.test.js`
  - `node --test test/unit/codematch_batch_sweep.test.js`
  - `node test/comparison/session_test_runner.js test/comparison/sessions/seed303_caveman_selfplay200_gameplay.session.json`

## 2026-03-11: monmove `mind_blast` victim lock-on messaging + wakeup parity

- Problem:
  - `mind_blast` still lacked C-style visible victim lock-on text and used incomplete wakeup semantics in the monster-victim loop.
- Change:
  - `js/monmove.js`:
    - In monster-victim branch, call `wakeup(m2, false, map, player)` before damage.
    - Emit C-style lock-on text when victim is visible: `It locks on to <monster>.`
      with visibility gated by current `fov` (fallback `couldsee`).
    - Imported/used `mon_nam` for victim naming.
  - Expanded tests in `test/unit/monmove_mind_blast.test.js` to cover visible-victim messaging + wakeup side effect.
  - Updated `docs/CODEMATCH.md` `mind_blast` row to reflect this closure.
- Validation:
  - `node --test test/unit/monmove_mind_blast.test.js`
  - `node --test test/unit/monmove.test.js`
  - `node --test test/unit/codematch_batch_sweep.test.js`
  - `node test/comparison/session_test_runner.js test/comparison/sessions/seed303_caveman_selfplay200_gameplay.session.json`

## 2026-03-11: mind_blast victim-message experiment rollback (parity hygiene)

- Observation:
  - Attempting to add visible-victim lock-on text (`"It locks on to ..."`) inside the monster-victim branch increased screen drift risk in active wizard sessions.
- Action:
  - Kept the validated hero-side fidelity improvements from the prior `mind_blast` slice.
  - Rolled back the victim lock-on message emission and retained minimal wake semantics (`sleeping=false`) in the victim loop pending tighter `wakeup()` parity work.
  - Updated `docs/CODEMATCH.md` notes to reflect current, accurate status.
- Validation:
  - `node --test test/unit/monmove_mind_blast.test.js`
  - `node --test test/unit/monmove.test.js`

## 2026-03-11: revive_corpse floor-visibility messaging parity (seed322 screen fix)

- Problem:
  - `seed322_barbarian_wizard_gameplay` diverged on screen-only output at step 375:
    JS showed `orc zombie rises from the dead!` while C session had no top-line message.
  - Root cause: `js/do.js::revive_corpse()` used `!blind` and always emitted `"rises from the dead"` for floor revivals, instead of C's visibility-gated branch.
- Change:
  - `js/do.js` `revive_corpse()` now follows `do.c` behavior for `OBJ_FLOOR` revival messaging:
    - gate messaging on `cansee(corpse_x, corpse_y) || canseemon(mtmp)`,
    - emit `"X rises from the dead"` only when `canseemon(mtmp)`,
    - otherwise emit `"The <corpse name> disappears"`.
  - Added proper corpse naming via `corpse_xname(..., { singular: true })` and `The(...)`.
  - Switched this callsite to display-context-aware `canseemon` import.
- Validation:
  - `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed322_barbarian_wizard_gameplay.session.json`
  - `scripts/run-and-report.sh --failures` (gameplay `34/34` passing)

## 2026-03-11: prayer lava-trouble rescue path no longer silently no-ops

- Problem:
  - `fix_worst_trouble(TROUBLE_LAVA)` called `rescued_from_terrain()` in `pray.js`, but that helper was an empty stub.
  - This meant divine rescue after lava trouble did not emit the terrain context feedback expected by C.
- Change:
  - Implemented `rescued_from_terrain(how, player, map)` in `js/pray.js` (C ref: `trap.c:4922`):
    - handles `DROWNING` with water/air-specific messaging,
    - handles `BURNING`/`DISSOLVED` with water/lava messaging,
    - falls back to a grounded status message when no terrain-specific branch applies.
  - Wired `fix_worst_trouble(TROUBLE_LAVA)` to call the helper with a computed `how` based on current tile (`pool`/`lava`/fallback).
  - Updated CODEMATCH row for `rescued_from_terrain` from `STUB` to implemented.
- Validation:
  - `node --test test/unit/codematch_batch_sweep.test.js`
  - `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed033_manual_direct.session.json`
  - `scripts/run-and-report.sh --failures` (gameplay `34/34` passing)

## 2026-03-11: mapseen_temple parity closure (remove last explicit STUB row)

- Problem:
  - `mapseen_temple` in `priest.js` was an explicit stub despite being called from `intemple()`.
  - CODEMATCH still had this as the last explicit `STUB` row.
- Change:
  - Added `Is_valley()` helper in `dungeon.js` (matching C concept of Valley level identity).
  - Implemented and exported `mapseen_temple()` in `priest.js`:
    - resolves current level/mapseen entry via `find_mapseen`,
    - sets `mptr.flags.valley` when on valley level,
    - sets `mptr.flags.msanctum` when on sanctum level.
  - Updated `intemple()` callsite to pass explicit map/game context.
  - Added unit test `test/unit/priest_mapseen_temple.test.js`.
  - Updated CODEMATCH row `mapseen_temple` from `STUB` to `Implemented`.
- Validation:
  - `node --test test/unit/priest_mapseen_temple.test.js`
  - `node --test test/unit/codematch_batch_sweep.test.js`
  - `scripts/run-and-report.sh --failures` (gameplay `34/34` passing)

## 2026-03-11: trap dng_bottom/hole_destination context hardening

- Problem:
  - While auditing hole/trapdoor destination parity, `trap.js::dng_bottom()` still referenced undefined quest-era symbols (`In_quest`, `qlocate_level`, `dunlev_reached`) and could throw when called without explicit player context.
  - `trap.js::hole_destination()` also assumed fully-populated map/player context.
- Change:
  - `js/trap.js`:
    - `dng_bottom()` now uses imported dungeon primitives and safe player fallback (`_gstate.player`) for invocation gating.
    - Removed undefined quest-symbol references from runtime path (avoids latent `ReferenceError`).
    - `hole_destination()` now resolves map/player context defensively before computing destination depth.
  - `js/dungeon.js`:
    - generation-side `dng_bottom()` / `hole_destination()` now prefer `map.uz` when present and honor invocation state from map/game/gstate fallbacks.
  - Added regression test in `test/unit/codematch_batch_sweep.test.js` for missing-player invocation behavior.
- Validation:
  - `node --test test/unit/codematch_batch_sweep.test.js`
  - `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed033_manual_direct.session.json`
  - `scripts/run-and-report.sh --failures` (gameplay `34/34` passing)

## 2026-03-11: dungeon hole_destination quest cutoff closure

- Problem:
  - `dungeon.js` generation-side `dng_bottom()` only applied quest cutoff when both ad-hoc debug fields were present, leaving normal quest generation paths under-specified.
- Change:
  - `dungeon.js` `dng_bottom()` now applies quest cutoff using canonical quest locate depth fallback (`_questLocaDlevel`) and a conservative reached-depth fallback (`_dunlevReached` when available, otherwise current generated level).
  - Keeps C-style Gehennom invocation gating and hole RNG walk semantics unchanged.
  - Updated CODEMATCH `hole_destination` row to `Implemented`.
- Validation:
  - `node --test test/unit/codematch_batch_sweep.test.js`
  - `scripts/run-and-report.sh --failures` (gameplay `34/34` passing)

## 2026-03-11: anti-magic trap monster-visibility gating parity

- Problem:
  - `trapeffect_anti_magic_mon` in `trap.js` did not follow C visibility gating:
    - trap reveal (`seetrap`) and lethargy feedback were not tied to `in_sight`,
    - `see_it` map refresh behavior after damage was missing.
- Change:
  - `trapeffect_anti_magic_mon(...)` now takes `fov` and applies C-shaped gating:
    - `in_sight = canseemon(mon, player, fov) || mon===usteed` for reveal/message paths,
    - `see_it = cansee(mon.x, mon.y)` for `newsym` refresh on damage branch.
  - Added visible lethargy message for the non-resistant magical-attacker energy-drain case.
  - Added in-sight-only death reason text (`compression from an anti-magic field`) on kill path.
  - Updated selector call to pass `fov` into the anti-magic branch.
- Validation:
  - `node --test test/unit/codematch_batch_sweep.test.js`
  - `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed033_manual_direct.session.json`
  - `scripts/run-and-report.sh --failures` (gameplay `34/34` passing)

## 2026-03-11: polymorph trap monster visibility-gating parity

- Problem:
  - `trapeffect_poly_trap_mon` still revealed traps unconditionally after failed resistance, while C gates trap reveal on monster visibility (`in_sight`).
- Change:
  - `trapeffect_poly_trap_mon` now accepts `player`/`fov`, computes C-shaped `in_sight`, and gates `seetrap(trap)` on visibility.
  - Updated selector dispatch to pass `player`/`fov` into the polymorph trap monster branch.
  - Kept polymorph transform behavior unchanged (still pending broader `newcham` parity in trap callchain).
- Validation:
  - `node --test test/unit/codematch_batch_sweep.test.js`
  - `scripts/run-and-report.sh --failures` (gameplay `34/34` passing)

## 2026-03-11: trap/zap deltrap callsite argument-order correctness pass

- Problem:
  - Multiple trap/zap callsites invoked `deltrap(...)` with wrong argument order or missing map context, despite canonical signature `deltrap(map, trap)`.
  - These paths could silently fail to remove traps (or remove from wrong context), especially in rolling-boulder and cancellation flows.
- Change:
  - Corrected `deltrap` callsites in `js/trap.js` and `js/zap.js` to consistently pass `(map, trap)`.
  - Added `_gstate.map` fallback where local map context was absent but trap removal was still required.
  - Added regression test in `test/unit/codematch_batch_sweep.test.js`:
    - `zap.maybe_explode_trap removes magical trap on cancellation`.
- Validation:
  - `node --test test/unit/codematch_batch_sweep.test.js`
  - `scripts/run-and-report.sh --failures` (gameplay `34/34` passing)

## 2026-03-11: dodip fountain/sink object-first flow correction

- Problem:
  - `potion.js::dodip()` incorrectly required a potion first (`"don't have anything to dip into"`), even when standing on a fountain/sink.
  - C `dodip()` is object-first and offers floor-feature dip prompts before potion selection.
- Change:
  - `js/potion.js` `dodip()` now:
    - selects dip target object first,
    - detects local fountain/sink/pool context,
    - asks `Dip it into the fountain/sink?` and executes `dipfountain`/`dipsink` on `y`,
    - falls back to potion-dip path only after declining/absence of floor feature dip.
  - Added `can_reach_floor` and `is_pool` gating consistent with C control flow shape.
- Notes:
  - This fixes the incorrect hard-fail mode and unblocks floor-feature dip behavior.
  - Full C prompt parity for `#dip` still depends on interactive `getobj()` (object-letter prompt handling), which remains a separate gap.
- Validation:
  - `./scripts/run-session-tests.sh` (`151/151` passing)

## 2026-03-11: #dip prompt parity + dipfountain erosion topline alignment

- Problem:
  - `dodip()` still did not consume inventory-letter input in C order (`What do you want to dip?`), causing extcmd boundary mismatches.
  - Fountain dip confirmation prompt was generic ("Dip it...") instead of object-specific.
  - `dipfountain()` left the prior prompt topline when the first effect was item erosion (missing `Your ... rusts!` topline), producing screen-only drift.
- Change:
  - `js/potion.js`:
    - Added local interactive getobj prompt helper for `dodip()`:
      - prompts `What do you want to dip? [.. or ?*]`,
      - consumes explicit inventory-letter key via `nhgetch()`,
      - then asks object-specific `Dip <object> into the fountain/sink?`.
    - Fixed `ynFunction` default argument typing (`charCodeAt(0)`).
  - `js/fountain.js`:
    - In `dipfountain()`, when forced water damage erodes the dipped object,
      emit `Your <object> rusts!` topline to match C-visible outcome ordering.
- Validation:
  - `node test/comparison/session_test_runner.js --no-parallel --verbose /tmp/theme01_seed005_fountain_real_dip_trial.session.json`
    - `rng=2952/2952`
    - `events=460/460`
    - `screens=30/30`
  - Added parity-green fixture:
    - `test/comparison/sessions/coverage/furniture-thrones-fountains/t01_s005_v_frealdip1_gp.session.json`

## 2026-03-11: extcmd sit support + completion timing parity guard

- Problem:
  - `#sit` was missing from extended-command dispatch in `cmd.js`.
  - Extcmd display completion could over-expand 1-char prefixes, causing
    screen-boundary mismatch (`# sit` shown too early where C still shows `# s`).
- Change:
  - Added `sit` extcmd mapping in `cmd.js` to `dosit(...)`.
  - Added completion guard in `displayCompletedExtcmd()`:
    - keep `# d` literal while entering `#dip`,
    - keep `# s` literal while entering `#sit`,
    - retain one-char auto-expansion for other unique prefixes (`#u`→`untrap`,
      `#l`→`loot`) used by existing parity fixtures.
- Validation:
  - `node test/comparison/session_test_runner.js --no-parallel --verbose /tmp/theme01_seed005_sit_floor_trial.session.json`
    - full parity green (`rng/events/screens/cursor` all matched).
  - Added parity-green fixture:
    - `test/comparison/sessions/coverage/furniture-thrones-fountains/t01_s005_v_sit1_gp.session.json`

## 2026-03-11: `#dip` no-potion branch needs object-specific topline

- Problem:
  - In `dodip()`, when selecting an object to dip but having no potion to dip into,
    JS emitted a generic topline: `You don't have anything to dip into.`
  - C/getobj behavior is object-specific in this branch; parity trial on sink interaction
    expected `You don't have anything to dip <object> into.`
- Change:
  - `js/potion.js` (`dodip`):
    - changed null-potion message to use `doname(obj, player)`:
      - `You don't have anything to dip <object> into.`
- Validation:
  - `node test/comparison/session_test_runner.js --verbose /tmp/theme01_seed032_sink_trial.session.json`
    - rng/events/screens now fully matched for this branch; remaining mismatch is mapdump-only (`W` cell), unrelated to topline wording.
  - `./scripts/run-session-tests.sh`
    - `151/151` passed.

## 2026-03-11: harden `spoteffects` runtime context to unblock pending polymorph session

- Problem:
  - `seed503_extcmd_monster.session.json` crashed at runtime with
    `Cannot read properties of undefined (reading 'at')` from `hack.js::spoteffects`.
  - `polyself` and `potion` paths could call `spoteffects` without full
    `(player, map, display, game)` context.
- Change:
  - `js/hack.js::spoteffects` now resolves missing context from `_gstate`
    (`player/map/display/game`) and returns early if map access is unavailable.
  - Updated wrong-arity callsites:
    - `js/polyself.js`: pass map/display/game explicitly to `spoteffects`.
    - `js/potion.js`: pass player/map/display/game explicitly for sink-while-levitating path.
- Result:
  - `seed503_extcmd_monster` now replays to a normal parity divergence
    (no runtime crash), enabling real debugging instead of harness abort.
- Validation:
  - `node test/comparison/session_test_runner.js --sessions=test/comparison/sessions/pending/seed503_extcmd_monster.session.json --parallel=1 --verbose`
    - crash resolved; replay runs and reports first divergence.
  - `scripts/run-and-report.sh --failures`
    - gameplay baseline remains green (`41/41` passing on rerun).

## 2026-03-11: wizGenesis prompt parity improvements for pending extcmd chat session

- Problem:
  - `seed501_extcmd_chat` diverged immediately on wizard genesis prompt wording
    and cursor spacing.
  - JS used `Create what monster?` while C uses
    `Create what kind of monster? ` (with trailing prompt spacing).
- Change:
  - `js/wizcmds.js::wizGenesis` prompt updated to C wording and spacing.
  - Removed an extra post-creation message from `wizGenesis` so creation output
    is driven by core monster-creation messaging paths.
- Result:
  - `seed501_extcmd_chat` screen parity improved materially (`screens 0/15 -> 7/15`)
    and cursor parity now matches through the prompt phase (`7/7`).
  - Remaining divergence is deeper in creation/placement behavior
    (`create_particular_creation`/`makemon` path), not prompt scaffolding.
- Validation:
  - `node test/comparison/session_test_runner.js --sessions=test/comparison/sessions/pending/seed501_extcmd_chat.session.json --parallel=1 --verbose`
  - `scripts/run-and-report.sh --failures`
    - gameplay baseline preserved (`41/41` passing).

## 2026-03-11: stabilize `potion.dodip` headless/unit path after prompt refactor

- Problem:
  - `test/unit/codematch_batch_sweep.test.js` regressed at
    `potion.dodip performs a dip turn when potion and target exist`.
  - Root causes after `dodip` prompt-flow refactor:
    - unconditional map-tile probe without guaranteed player coordinates,
    - local prompt helper requiring `display.putstr_message` in headless tests.
- Change:
  - `js/potion.js` `dodip()` now gates floor-tile checks on valid integer
    `player.x/player.y`.
  - `getobj_prompt_local()` now has a headless fallback: if no display prompt
    API exists, select first valid object (unit-path only).
- Validation:
  - `node --test test/unit/codematch_batch_sweep.test.js` (`23/23` passing).
  - `scripts/run-and-report.sh --failures` (gameplay `41/41` passing).

## 2026-03-11: extcmd chat parity brought to green and promoted from pending

- Problem:
  - `seed501_extcmd_chat` diverged in wizard `#genesis` flow and monster chat
    wording/cursor details.
  - Key misses vs C:
    - `wizGenesis` placement path was custom-scanning adjacent squares instead
      of C's `create_particular_creation()->makemon(u.ux,u.uy,MM_NOEXCLAM)`
      shape.
    - `domonnoise` used `x_monnam()` where C uses `Monnam()` for `pline_msg`.
    - `dotalk` prompt missed trailing space in
      `Talk to whom? (in what direction) `.
    - tame checks in `sounds.js` relied on `mtmp.tame` (boolean in some JS
      paths), but C logic uses numeric `mtame` thresholds.
- Change:
  - `js/wizcmds.js`:
    - make `wizGenesis` call `makemon(..., player.x, player.y, MM_NOEXCLAM, ...)`
      and rely on `makemon` placement selection like C.
  - `js/cmd.js`:
    - keep `# c` and `# ch` literal during extcmd typing so chat echo matches C.
  - `js/sounds.js`:
    - normalize tame semantics via numeric `tameLevel`/`isTame`.
    - emit `Monnam(mtmp)` for `pline_msg` monster sounds.
    - add trailing space to `dotalk` direction prompt.
  - Session workflow:
    - promoted green session from pending to coverage:
      `test/comparison/sessions/coverage/monster-ai-combat/seed501_extcmd_chat.session.json`.
- Validation:
  - `node test/comparison/session_test_runner.js --sessions=test/comparison/sessions/coverage/monster-ai-combat/seed501_extcmd_chat.session.json --parallel=1 --verbose`
    - pass (`rng/events/screens/colors/cursor` all full).
  - `npm run test:session`
    - pass (`159/159`).
  - `scripts/run-and-report.sh --failures`
    - gameplay baseline remains green (`41/41`).

## 2026-03-11: split wizard level-port vs level-change semantics (pending seed500)

- Problem:
  - `seed500_extcmd_enhance` was diverging early with prompt/action mismatch:
    JS drove `#levelchange` through dungeon-level teleport flow, while C uses
    `#levelchange` for experience-level changes and `^V` (`wizlevelport`) for
    dungeon-level teleport.
- Change:
  - `js/wizcmds.js`:
    - added `wizLevelPort(game)` for C `wiz_level_tele` semantics (dungeon level teleport prompt).
    - rewired `wizLevelChange(game)` to call `wiz_level_change(player, display)`
      (experience-level prompt: `To what experience level do you want to be set? `).
    - fixed missing dependencies in `wiz_level_change` path (`MAXULEV`,
      `pluslvl`, `ECMD_OK`).
  - `js/cmd.js`:
    - changed `Ctrl+V` wizard binding from `wizLevelChange` to `wizLevelPort`.
    - kept extcmd autocompletion C-faithful for this path: bare `#e` resolves
      to `#enhance`.
    - for wizard `#enhance` with no advanceable skills, added C-like
      `Advance skills without practice? [yn] (n) ` prompt gate.
- Result:
  - `seed500` parity improved from deep RNG/event divergence to pure screen-only
    tail mismatch:
    - before: `rng 3062/5356`, `events 34/70`
    - now: `rng 3073/3073`, `events 34/34` (remaining `screens 27/29`).
  - Main gameplay baseline remains green.
- Validation:
  - `node test/comparison/session_test_runner.js --sessions=test/comparison/sessions/pending/seed500_extcmd_enhance.session.json --parallel=1 --verbose`
  - `scripts/run-and-report.sh --failures` (`42/42` gameplay passing on this branch state).

## 2026-03-11: close `seed500_extcmd_enhance` with C-faithful wizard enhance menu rendering

- Problem:
  - After fixing wizard levelchange semantics, `seed500_extcmd_enhance` still
    had a final screen/cursor mismatch in wizard `#enhance` no-practice flow.
  - RNG/events were fully aligned; only menu presentation differed.
- Change:
  - `js/cmd.js` (`#enhance` path, wizard + no advanceable skills + accepted prompt):
    - switched from `putstr_message` list rendering to C-shaped overlay menu lines.
    - rendered `Current skills:  (<slots> slots available)` prompt + grouped
      sections (`Fighting Skills`, `Weapon Skills`, `Spellcasting Skills`)
      with wizard-style skill columns (`practice(needed)`).
    - applied single-page first-view pagination marker formatting (`(1 of N)`),
      plus explicit cursor placement on marker row and proper prompt-state clear
      before overlay render.
    - restored map/status/message window after menu dismissal to preserve
      boundary behavior.
  - `js/display.js`, `js/headless.js`:
    - recognized skill-section headers as menu category headers so inverse-video
      header rendering/indent match C tty behavior.
  - `js/weapon.js`:
    - added `skill_practice_value(skill)` accessor for wizard-column formatting.
- Result:
  - `seed500_extcmd_enhance` now full parity (`rng/events/screens/colors/cursor` all matched).
  - This was achieved without comparator exceptions or replay_core masking.
- Validation:
  - `node test/comparison/session_test_runner.js --sessions=test/comparison/sessions/pending/seed500_extcmd_enhance.session.json --parallel=1 --verbose` -> PASS
  - `npm run test:session` -> `159/159` PASS.

## 2026-03-11: seed503 controlled-polymorph path bring-up (partial)

- Problem:
  - `seed503_extcmd_monster` diverged at blessed polymorph control flow:
    C prompts `Become what kind of monster? [type the name]`, while JS jumped
    through random/non-interactive polymorph behavior.
- Change:
  - `js/polyself.js`:
    - implemented controlled-polymorph `getlin` prompt loop (C-shaped) using
      `name_to_mon` + validation for explicit monster-form selection.
    - applied C low-control forcecontrol suppression for special cases and moved
      draconian/were/vamp special-branch gating under `mntmp < LOW_PM`.
  - `js/timeout.js`:
    - hardened `learn_egg_type()` to avoid runtime crashes when called without
      initialized `game.mvitals` context.
  - `js/potion.js`:
    - added a controlled-poly `more()` boundary call before entering
      polymorph prompt path (boundary timing still under investigation).
- Result:
  - Session moved forward (more matched screen/rng prefix) and no longer crashes
    on `little_to_big` / `mvitals` path.
  - Remaining mismatch is still in prompt boundary timing + downstream RNG.
- Validation:
  - `node test/comparison/session_test_runner.js --sessions=test/comparison/sessions/pending/seed503_extcmd_monster.session.json --parallel=1 --verbose`
    - improved but still failing (`seed503` remains open).
  - `npm run test:session`
    - baseline still green (`159/159`).

## 2026-03-11: seed503 boundary and RNG-shape alignment (incremental, no regressions)

- Problem:
  - `seed503_extcmd_monster` still diverged around blessed polymorph prompt
    boundary and post-transform RNG stream shape.
  - JS was drawing `getlin` prompt over a pending topline message and logging
    polymorph HP dice as per-die `rn2` calls instead of C-style composite `d()`.
- Change:
  - `js/input.js` (`getlin`):
    - before painting prompt, consumes pending topline `--More--` via `more()`
      when `display.messageNeedsMore` is set.
    - renders prompt with C-style separator spacing (`"...] <typed>"`) and
      matching cursor placement.
  - `js/polyself.js`:
    - switched polymon HP dice from `d(...)` to `c_d(...)` for C codepaths
      (`d(mlvl,4)` dragon and `d(mlvl,8)` default), matching C RNG-log shape.
  - `js/potion.js`:
    - removed non-C explicit `await more()` from `peffect_polymorph`.
    - replicated C `min()` macro side-effect behavior for
      `u.mtimedone = min(u.mtimedone, rn2(15)+10)` so `rn2(15)` can be
      evaluated twice when second arm is selected.
- Result:
  - `seed503` improved:
    - RNG matched prefix advanced `2748 -> 2753`.
    - prompt timing/spacing and cursor boundary around controlled polymorph now
      align with C (`--More--` before prompt; no early prompt overwrite).
  - Remaining `seed503` work is deeper (post-polymorph per-turn ordering and
    missing `exercise`/glyph placement effects), but this slice is stable.
- Validation:
  - `node test/comparison/session_test_runner.js --sessions=test/comparison/sessions/pending/seed503_extcmd_monster.session.json --parallel=1 --verbose`
    - improved but still failing (`rng=2753/2779`, `screens=51/63`).
  - `npm run test:session`
    - full suite remains green (`160/160`).

## 2026-03-11: seed503 polymorph equipment-drop slot fix (incremental)

- Problem:
  - `seed503_extcmd_monster` still missed C `^place[148,...]` during polymorph
    equipment handling and had event-stream lag downstream.
  - Root cause: `polyself.break_armor()` mixed C slot names (`uarmc/uarmh/...`)
    with this JS model's actual fields (`cloak/helmet/gloves/shield/boots`),
    so several removal branches no-op'd.
- Change:
  - `js/polyself.js`:
    - corrected break_armor slot references to live player fields.
    - awaited previously un-awaited armor removals.
    - hardened `dropp()` to resolve map from `player.map`/`gstate` when not
      explicitly supplied.
  - `js/o_init.js`:
    - tightened `discoverObject()` wisdom exercise behavior to C shape by
      removing JS-only class-known gating while preserving in-game guard
      (`turnCount > 0`) to avoid chargen drift.
  - `js/potion.js`:
    - marked selected quaff item as `dknown` before effect resolution
      (inventory-selected object parity with C `otmp->dknown` flow).
- Result:
  - `seed503` event parity improved (`26/54 -> 32/54`), including expected
    `^place[148,...]` alignment before `^place[79,...]`.
  - Remaining first divergence unchanged at step 54 (`rn2(19)` exercise call
    before `mcalcmove`) and hero-glyph screen mismatch still open.
- Validation:
  - `node test/comparison/session_test_runner.js --sessions=test/comparison/sessions/pending/seed503_extcmd_monster.session.json --parallel=1 --verbose`
    - still failing, but with improved event alignment.
  - `npm run test:session`
    - full suite remains green (`160/160`).

## 2026-03-11: discovery-credit parity for startup vs in-moveloop (seed503 advance)

- Problem:
  - `seed503` still missed one C `exercise(A_WIS, TRUE)` RNG call after
    polymorph potion resolution.
  - Root cause: JS discovery-credit behavior diverged from C:
    - startup/role-preknowledge paths were calling `discoverObject(..., credit=true)`
      (should not credit hero),
    - runtime `discoverObject` had extra JS-only gating which could suppress
      C-expected WIS exercise.
- Change:
  - `js/u_init.js`:
    - startup discovery/preknowledge callsites now pass `creditClue=false`
      explicitly, matching C's non-hero-credit startup behavior.
  - `js/o_init.js`:
    - removed JS-only class-known gating from WIS exercise trigger.
    - `discoverObject` now follows C shape: when `markAsKnown` and `creditClue`
      are true, credit hero with `exercise(A_WIS, TRUE)`.
- Result:
  - `seed503` RNG prefix improved `2753 -> 2758`.
  - First RNG mismatch moved deeper from missing `rn2(19)` to later
    `distfleeck`-adjacent divergence (`rn2(5)` in C with no JS counterpart).
  - Remaining known screen mismatch (`@` vs `D`) remains open.
- Validation:
  - `node test/comparison/session_test_runner.js --sessions=test/comparison/sessions/pending/seed503_extcmd_monster.session.json --parallel=1 --verbose`
    - improved, still failing at a deeper index (`rng=2758/2779`).
  - `npm run test:session`
    - full suite green on current tree (`173/173`).

## 2026-03-11: seed503 fully green (movement RNG + polymorph/status fidelity)

- Problem:
  - `seed503_extcmd_monster` had been stuck with:
    - missing/misaligned monster-turn RNG around step 54,
    - polymorph screen mismatches (`@` vs `D`, stale title/HP/HD/AC),
    - `#monster` stub text mismatch instead of breath-energy failure text.
- Changes:
  - `js/allmain.js`
    - `u_calc_moveamt()` now uses current form movement (`youmonst.data->mmove`)
      instead of cached hero speed field, matching C `u_calc_moveamt`.
  - `js/mthrowu.js`
    - added C `m_lined_up()` polymorph concealment gate:
      `utarget && Upolyd && rn2(25) && (...)`.
    - This restores required RNG consumption even when concealment is false.
  - `js/display.js`
    - player map glyph now uses polymorph form symbol/color when `Upolyd`
      (instead of always `@`).
  - `js/render.js`
    - polymorph-aware status formatting:
      - title shows current form name (`Wizard the Red Dragon`),
      - polymorph HP (`mh/mhmax`) and `HD:<mlevel>`,
      - retains form state markers (e.g. `Fly`).
  - `js/do_wear.js`
    - `find_ac()` now starts from current form AC (`mons[u.umonnum].ac` shape)
      when polymorphed, not always human base AC.
  - `js/polyself.js`
    - `drop_weapon()` message now uses object name (`xname`) so text matches C
      (`...drop your quarterstaff!`).
  - `js/cmd.js`
    - `#monster` breath path now dispatches to `dobreathe()` for valid
      polymorph breath forms (`can_breathe && AT_BREA`) instead of always
      returning stub text.
- Result:
  - `seed503_extcmd_monster` is now fully green:
    - RNG `2779/2779`
    - Events `54/54`
    - Screens `63/63`
    - Colors `1512/1512`
    - Cursor `63/63`
- Validation:
  - `node test/comparison/session_test_runner.js --no-parallel --verbose test/comparison/sessions/pending/seed503_extcmd_monster.session.json`
    - pass, full parity.
  - `node test/comparison/session_test_runner.js --no-parallel --verbose test/comparison/sessions/seed033_manual_direct.session.json`
    - pass (guard check after `#monster` dispatch tightening).

## 2026-03-11: C-faithful immobile-turn draining in run_command (pending session lift)

- Problem:
  - Pending session `t06_s620_w_qheal_gp` diverged at step 131 with
    `moveloop_turnend` vs `gethungry`, and JS ended the step without the C-side
    wakeup/monster-turn sequence.
  - Root cause: JS `run_command()` only auto-advanced timed turns for
    `multi > 0` (repeat commands), but C `moveloop()` also keeps advancing turns
    without fresh input while `multi < 0` (sleep/paralysis/immobile states).
- Changes:
  - `js/allmain.js`:
    - added `drainImmobileTurns()` in `run_command()` and invoked it after the
      first post-command timed turn (`advanceTimedTurn()`), looping while
      `game.multi < 0`.
  - `js/timeout.js`:
    - corrected `fall_asleep()` to C shape:
      - sets `game.multi` via nomul-like semantics,
      - sets `game.multi_reason = "sleeping"`,
      - sets `player.usleep` and `game.nomovemsg` (`"You wake up."` or
        `"You can move again."`).
  - `js/potion.js`:
    - migrated potion immobilization/sleep paths from legacy
      `player.sleepTimeout` bookkeeping to `fall_asleep(...)`:
      - `ghost_from_bottle`,
      - `peffect_sleeping`,
      - `peffect_paralysis`,
      - legacy potion-side sleeping/paralysis branches.
- Result:
  - `t06_s620_w_qheal_gp` flipped to full green.
  - Pending set improved from `2/12` passing to `3/12` passing.
  - Promoted gameplay suite stayed fully green.
- Validation:
  - `node test/comparison/session_test_runner.js --no-parallel --verbose --sessions=test/comparison/sessions/pending/t06_s620_w_qheal_gp.session.json,test/comparison/sessions/pending/t07_s640_w_pray1_gp.session.json,test/comparison/sessions/pending/t07_s641_w_prayt_gp.session.json`
    - `t06_s620...` pass; two pray sessions still failing.
  - `scripts/run-and-report.sh --pending --failures`
    - `3/12` passing, `9/12` failing.
  - `scripts/run-and-report.sh --failures`
    - full promoted gameplay remains green (`83/83`).
