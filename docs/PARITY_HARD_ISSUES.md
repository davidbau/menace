# Parity Hard Issues — Design & Plan

This document covers the remaining difficult parity issues that block
pending sessions and improve code quality. Each issue has investigation
findings, a concrete fix plan, phasing, and risk analysis.

Status as of 2026-03-16: **262/262 sessions passing**, 12 pending.

---

## Issue 1: Exercise Timing — `exerchk` Moves Offset

**Sessions affected:** s746, s748, s749, s751, s752, s753 (6 sessions)

### Root cause (REVISED after investigation)

Previous theory was "fundamental turn-processing order difference."
Deep investigation reveals:

1. **Monster iteration order is CORRECT** — JS uses `unshift()` (prepend)
   and iterates index 0 onwards, matching C's `fmon` linked-list prepend
   and head-to-tail traversal.

2. **The `turnCount + 1` offset is INTENTIONAL** — documented at
   allmain.js:271, insight.js:619. JS `turnCount` is initialized to 0
   while C's `svm.moves` starts at 1. After increment, the +1 offset
   produces the same absolute value C uses.

3. **The REAL issue** is not the moves value — it's that exerchk fires
   at a different point in the RNG stream relative to command execution.
   In C, the entire moveloop_core is one function: turn-end processing
   (with exerchk) happens, then rhack reads input and executes command.
   In JS, rhack executes first, THEN turn-end fires. Any RNG consumed
   during command execution shifts the exerchk RNG relative to C.

### The actual divergence mechanism

When a command consumes RNG (e.g., inventory paging with `--More--`),
the exerchk modulo gates (`moves % 5`, `moves % 10`) fire with the
same moves value as C, but at a different position in the RNG stream
because the command's RNG was consumed before vs after exerchk.

Example: Turn N where `N % 10 == 0`:
- **C**: exerchk consumes rn2 for exercise → then rhack runs command
- **JS**: rhack runs command (consumes rn2) → then exerchk consumes rn2
- The exercise rn2 calls get DIFFERENT values from the stream.

### Fix plan

**Phase 1 — Measure the gap** (tooling)
- Add a diagnostic mode to `rng_step_diff.js` that logs the exact
  RNG index when exerchk fires in both JS and C sessions.
- Compare divergent sessions to confirm the mechanism above.

**Phase 2 — Restructure turn-end ordering**
The fix requires running turn-end processing BEFORE the next command,
not AFTER the current one. This means:

```
Current JS flow:
  rhack(key)          // execute command
  moveloop_core()     // monsters + turn-end (exerchk here)

Target JS flow:
  moveloop_core()     // monsters + turn-end (exerchk here)
  rhack(key)          // execute command
```

Implementation approach:
1. On game start (or level entry), run the first `moveloop_core()` to
   set up the initial turn-end state (matches C's moveloop_core being
   called first, which blocks on nhgetch inside rhack).
2. After rhack returns, DON'T run turn-end. Instead, store the
   `tookTime` flag and process it at the START of the next run_command.
3. This requires a `game.pendingTurnEnd` flag.

**Concerns:**
- Screen captures happen between commands. C captures AFTER turn-end
  and BEFORE rhack. JS currently captures AFTER rhack and AFTER turn-end.
  Reordering turn-end changes when the screen snapshot happens relative
  to hunger messages, exercise effects, etc.
- Multi-turn commands (travel, repeated moves) call advanceTimedTurn
  inline — these would need the same reordering.
- Occupation draining (eating, lock-picking) runs between turns.

**Phase 3 — Validate**
- Run all 262 sessions + the 6 exercise-divergent pending sessions.
- If the 6 sessions now pass, promote them.

### Risk: HIGH
This touches the core game loop. Extensive testing required.
Recommend doing this work on a branch with a worktree.

### Gate: Phase 1 diagnostic tooling must confirm the mechanism
before attempting Phase 2. If the divergence is NOT explained by
command-relative RNG position, there's another cause.

---

## Issue 2: Dual `canseemon()` Definitions

**Sessions affected:** None directly confirmed, but affects correctness
for infrared vision and worm visibility.

### Root cause

Two implementations exist:
- **display.js:1690** — Full C-parity version. Checks worm segments,
  infrared fallback (`seeWithInfraredForMap`), proper `Blind` check
  (uppercase + lowercase), `hasPlayerProp` for SEE_INVIS.
- **mondata.js:1948** — Simplified version. No infrared, no worms,
  only `player.blind` (lowercase), direct `player.seeInvisible`.

C's `canseemon` macro (display.h:117-120):
```c
#define _canseemon(mon) \
    ((mon->wormno ? worm_known(mon) \
                  : (cansee(mon->mx, mon->my) || see_with_infrared(mon))) \
     && mon_visible(mon))
```

display.js is faithful. mondata.js is incomplete.

### Import distribution (7 files each)

**From display.js (correct):** topten, zap, mthrowu, muse, do, weapon, mhitu
**From mondata.js (incomplete):** were, priest, hack, dig, quest, shk, region

### Fix plan

**Phase 1 — Switch imports** (LOW RISK)
For each of the 7 files importing from mondata.js, change to:
```javascript
import { canseemon } from './display.js';
```

The display.js version accepts 1-4 parameters with optional player/fov/map
args that resolve from context when omitted. So existing 2-3 parameter
call sites will work — they'll resolve player/fov/map from `_resolveDisplayCtx`.

**Phase 2 — Remove mondata.js `canseemon`**
Delete lines 1948-1955 from mondata.js.

**Phase 3 — Verify no circular import issues**
display.js already imports from mondata.js. mondata.js does NOT import
from display.js. Adding this import would create a circular dependency.

HOWEVER: we don't need mondata.js to import from display.js. We're
changing 7 OTHER files to import from display.js instead of mondata.js.
No new circular dependency is created.

**Phase 4 — Test**
Run full test suite. The behavioral difference (infrared + worms) could
change message output in sessions where those conditions apply.

### Risk: LOW-MEDIUM
The display.js version is strictly more correct. The main risk is that
the context resolution (`_resolveDisplayCtx`) might not find the right
map/player in all call sites. Need to verify each call site has the
runtime context available.

### Recommended: Do this before the exercise timing fix, as it's
simpler and validates the testing pipeline.

---

## Issue 3: `bhitpos` Dual Tracking

**Sessions affected:** Potentially any session involving thrown objects
returning to player (boomerangs, Mjollnir), monster wand zaps, or
kicked objects.

### Root cause

C has ONE global `gb.bhitpos` (coord struct in `instance_globals_b`).
JS has THREE separate tracking locations:

| Location | Module | Lines | Type |
|----------|--------|-------|------|
| `const bhitpos = {x:0, y:0}` | muse.js | 128-129 | Module-local |
| `game.bhitpos = {x, y}` | dothrow.js, dokick.js | 999, 1114, 517 | Game property |
| `game.gb.bhitpos` | dothrow.js (READ) | 1470-1471 | GB struct |
| `gb.bhitpos` (bare) | mon.js | 2707 | UNDEFINED global |

**Critical bugs found:**
1. dothrow.js WRITES `game.bhitpos` but READS `game.gb.bhitpos` —
   these are different objects. Boomerang/Mjollnir return path reads
   stale or undefined data.
2. mon.js uses bare `gb.bhitpos` — this is an undefined global in JS.
   The `see_nearby_monsters` function silently fails to set bhitpos.
3. muse.js keeps a module-local bhitpos that is never shared. Monster
   wand zaps track hit position locally but other code can't read it.

### Fix plan

**Phase 1 — Ensure `game.gb` exists with `bhitpos`**
In the Game constructor (allmain.js), ensure:
```javascript
this.gb = { bhitpos: { x: 0, y: 0 } };
this.gn = { notonhead: false };
```

**Phase 2 — Unify all writes to `game.gb.bhitpos`**
- dothrow.js:999 — change `game.bhitpos = {x, y}` to
  `game.gb.bhitpos.x = x; game.gb.bhitpos.y = y;`
- dothrow.js:1114 — same pattern
- dokick.js:517 — same pattern
- muse.js:1634+ — change local `bhitpos` to use `game.gb.bhitpos`
  (requires passing `game` to `mbhit` or using `_gstate`)
- mon.js:2707-2708 — change `gb.bhitpos` to `game.gb.bhitpos`
  and `gn.notonhead` to `game.gn.notonhead`

**Phase 3 — Remove `game.bhitpos` top-level property**
After unifying, grep for any remaining `game.bhitpos` (without `.gb.`)
and update them.

**Phase 4 — Test**
Focus on sessions involving thrown weapons (especially returning ones),
kicked objects, and monster wand usage.

### Risk: MEDIUM
The muse.js change requires threading `game` through `mbhit()` which
may already have it available. The mon.js bare global is likely dead
code (see_nearby_monsters may not be called in current sessions).
dothrow.js is the most impactful fix — boomerang returns currently
read from the wrong location.

---

## Issue 4: `costly_alteration()` Stub

**Sessions affected:** None (no RNG consumed).

### Root cause

`mkobj.js:2308` returns false unconditionally. C's version (mkobj.c:753)
bills the shopkeeper when player modifies shop inventory (enchant,
curse, etc.). It's complex (80+ lines) involving shop room detection,
billing, and messages, but consumes NO RNG.

### Fix plan

**Phase 1 — Implement the function**
Port C's costly_alteration() faithfully. It needs:
- `carried(obj)` / `obj.unpaid` check (early return if not shop item)
- `get_obj_location` / `costly_spot` for floor items
- `billable()` to check if shopkeeper cares
- `bill_dummy_object()` for billing updates
- Message output for shopkeeper complaints

**Phase 2 — Test**
Only affects shop interaction scenarios. Low priority since no RNG impact.

### Risk: LOW
No RNG impact means no session regressions possible. Pure message/billing
correctness. Can be deferred indefinitely.

---

## Issue 5: FOG_CLOUD Gas Cloud

**Sessions affected:** s751 (partially — divergence may have other causes)

### Investigation result: NO FIX NEEDED

C's `m_everyturn_effect` for FOG_CLOUD (monmove.c:657-662) does NOT
check `!mtmp->mcan`. The JS code matches C exactly. The earlier
suggestion to add a `!mon.mcan` gate was incorrect.

The s751 divergence likely stems from the exercise timing issue (Issue 1)
or monster iteration order differences in a different code path.

---

## Issue 6: Monster Iteration Order in `allocateMonsterMovement`

**Sessions affected:** Previously believed to affect 6 exercise sessions.

### Investigation result: ORDER IS CORRECT

JS uses `Array.unshift()` (prepend) matching C's linked-list prepend
(`mtmp->nmon = fmon; fmon = mtmp`). Both iterate newest-first.

The exercise divergence is NOT caused by monster iteration order.
It's caused by the turn-processing order (Issue 1).

---

## Prioritization & Phasing

### Phase A: Quick wins (LOW RISK, do first)
1. **canseemon unification** (Issue 2) — 7 import changes + delete
2. **bhitpos unification** (Issue 3) — 4-5 file changes

### Phase B: Core fix (HIGH RISK, do on branch)
3. **Exercise timing restructure** (Issue 1) — game loop rewrite

### Phase C: Low priority (defer)
4. **costly_alteration** (Issue 4) — no RNG impact

### Not needed:
5. FOG_CLOUD (Issue 5) — confirmed correct
6. Monster iteration (Issue 6) — confirmed correct

---

## Tooling Needed

### 1. Exercise timing diagnostic
Add to `rng_step_diff.js`:
```
--exercise-trace    Log RNG index at each exerchk/exerper call
```
This lets us confirm the RNG stream position difference between JS and C
at the exact point of exercise divergence.

### 2. bhitpos assertion mode
Add a debug assertion in dothrow.js that warns if `game.gb?.bhitpos`
differs from `game.bhitpos` after writes. This catches any remaining
divergence during development.

### 3. canseemon audit helper
A one-off script that replays sessions and logs every `canseemon` call
with both implementations, flagging cases where they return different
results. This measures the real-world impact of the unification.

---

## Advice on Overcoming Difficult Parts

### Exercise timing (hardest)
- **Don't try to rewrite the game loop in one shot.** Instead:
  1. First, add a `game.deferredTurnEnd` flag mechanism that can be
     toggled on/off.
  2. When OFF, behavior is unchanged (current flow).
  3. When ON, turn-end runs at start of next command.
  4. Test with the flag OFF first (no regression), then ON (new behavior).
  5. This lets you A/B test the change incrementally.
- **Use worktree isolation** (`/isolation: worktree/`) for the branch.
- **The screen capture timing is the key subtlety.** When turn-end moves
  earlier, hunger/timeout messages appear in a different screen snapshot.
  The session comparison framework may need adjustment to account for
  this. Check if mapdump timing is affected.
- **Multi-turn commands are the second subtlety.** Travel, running, and
  occupation loops all call advanceTimedTurn inline. These need to
  maintain the same relative ordering. Map out every call site of
  moveloop_core / moveloop_turnend before starting.

### canseemon (moderate)
- **The risk is context resolution.** The display.js version uses
  `_resolveDisplayCtx()` which reads from module-level state. If any
  call site runs before the display context is established (e.g., during
  level generation), canseemon would return false for all monsters.
- **Mitigation:** Check each of the 7 call sites to verify they only
  run during active gameplay (not during level gen).

### bhitpos (moderate)
- **The mon.js bare `gb` access is the trickiest.** It's in
  `see_nearby_monsters` which may receive `game` as a parameter.
  Check the function signature and thread `game` through.
- **muse.js `mbhit` needs game access.** Check if `_gstate` is
  available in muse.js (it likely is since other functions use it).
  If so, use `_gstate.gb.bhitpos` for the module-level replacement.
