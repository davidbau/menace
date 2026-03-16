# Parity Hard Issues — Design & Plan

This document covers the remaining difficult parity issues that block
pending sessions and improve code quality. Each issue has investigation
findings, a concrete fix plan, phasing, and risk analysis.

Status as of 2026-03-16: **262/262 sessions passing**, 12 pending.

**Completed:**
- Issue 2 (canseemon) — DONE: 18 files switched to display.js version
- Issue 3 (bhitpos) — DONE: dothrow.js/mon.js fixed, muse.js local tracked

---

## Issue 1: Exercise Timing — `wiz_identify` Type Discovery Gap

**Sessions affected:** s746, s748, s749, s751, s752, s753 (6 sessions)

### Root cause (REVISED: March 16 deep investigation)

Previous theories:
- ~~"exerchk fires at different RNG stream position"~~ — WRONG.
  The step boundary at `--More--` / `nhgetch` already splits RNG
  correctly via `drainUntilInput()`. Confirmed by deferred-advance
  experiment (163/262 regressions when turn-end was moved, reverted).
- ~~"turn-processing order difference"~~ — WRONG. Same as above.

**The ACTUAL root cause is two interacting bugs:**

#### Bug A: JS wizard identify individual item path skips `discoverObject`

C's `display_pickinv` wizard identify path (invent.c:3393-3404):
```c
// When individual items are selected:
if (not_fully_identified(otmp))
    (void) identify(otmp);
// identify → fully_identify_obj → makeknown(otyp)
// makeknown = discover_object(otyp, TRUE, TRUE, TRUE)
// → sets objects[otyp].oc_name_known = 1
// → calls exercise(A_WIS, TRUE) if type was not already known
```

JS's wizard identify individual item path (invent.js:2441-2453):
```javascript
// BUG: Sets per-object flags WITHOUT calling discoverObject
target.known = true;
target.bknown = true;
target.rknown = true;
target.dknown = true;
// Result: item appears identified, but isObjectNameKnown(otyp)
// stays false — type is NOT globally discovered
```

**Consequence:** Types never become globally known from JS's individual
item wizard identify. At the NEXT wizard identify, these items appear
again in the unid list (because `isObjectNameKnown(otyp)` is false),
and if `discoverObject` is then called with `creditClue=true`, exercise
fires for types that C already knows. Or exercise is suppressed
(creditClue=false) when C expects it to fire.

#### Bug B: JS overlay PICK_ANY menu interprets keystrokes differently from C's tty menu

The same keystroke sequence produces **different item selections** in
C's tty PICK_ANY menu vs JS's overlay PICK_ANY menu. Specifically:

- C's tty menu uses page-based navigation. Pressing an item letter on a
  different page may be ignored or handled differently than in JS.
- JS's overlay menu may select items regardless of which "page" is
  currently displayed.

**Evidence from t11_s754 (step 1243):** C's wizard identify menu has
2 pages. The keystrokes `space, o, l, space` are interpreted as:
- C: page to page 2, then 'o' and 'l' may not produce valid selections
  on page 2 (items 'o' and 'l' are on page 1). No items are identified.
  Status line continues showing "forked wand" (type unknown).
- JS: 'o' selects item 'o' (wand of fire) regardless of page state.
  Item is identified. If `discoverObject` is called, status line changes
  to "wand of fire" (type known).

This is confirmed by C's screen at step 1335 (after wizard identify)
showing "forked wand" — the type remained unknown in C, proving the
wizard identify did NOT actually identify it.

#### How the bugs interact

The two bugs produce opposing effects in different sessions:

| Session | C behavior | JS old behavior | What happens |
|---------|-----------|----------------|--------------|
| s746 | Wizard identify selects items → exercise fires | Individual item path doesn't call discoverObject → exercise suppressed | JS MISSING exercise |
| t11_s754 | Wizard identify doesn't select items (menu key mismatch) → no exercise | Individual item path sets flags, no discoverObject → types stay unknown | Match (both: no exercise) |
| t11_s754 (with fix) | Same as above | Individual item path calls discoverObject → exercise fires for types C never discovered | EXTRA exercise in JS |

**This is why no single `creditClue` change can fix both sessions.**

### C code reference: wiz_identify architecture

C's wizard identify is NOT the simple display shown in `wizcmds.c:50-66`.
The `wiz_identify` function sets `iflags.override_ID` and calls
`display_inventory`, which calls `display_pickinv`. When `wizid` is true,
`display_pickinv` (invent.c:3222-3404):

1. Shows "Debug Identify" header with unidentified items
2. Uses `_` as "identify all" accelerator (backed by `wizid_fakeobj`)
3. Shows unidentified items filtered by `not_fully_identified(otmp)`
4. After menu returns, clears `override_ID` (line 3391)
5. For `wizid_fakeobj` selection: calls `identify_pack(0, FALSE)` (line 3396)
6. For individual items: calls `identify(otmp)` (line 3402)
7. Both paths call `fully_identify_obj → makeknown → discover_object(credit_hero=TRUE)`

**Important:** C's `not_fully_identified` (objnam.c:1790) checks raw
`objects[otyp].oc_name_known`, NOT `iflags.override_ID`. JS's version
calls `isObjectNameKnown(otyp)` which respects `overrideID`. Both produce
the same result here since `overrideID` is not set when the unid list
is built.

### C exercise gate: AVAL saturation

C's `exercise()` (attrib.c:496) has an accumulator saturation check:
```c
if (abs(AEXE(i)) < AVAL)  // AVAL = 50
    AEXE(i) += (inc_or_dec) ? (rn2(19) > ACURR(i)) : -rn2(2);
```
If `|AEXE(A_WIS)| >= 50`, exercise does NOT consume RNG. JS has the
same gate (attrib_exercise.js:67). Investigation confirmed this is NOT
the cause of the divergence — the accumulator value is ~0-1 during
wizard identify in both C and JS for t11_s754.

### Attempted fixes and results

| Approach | Change | t11_s754 | s746 | Reason |
|----------|--------|----------|------|--------|
| Original code | Manual flag setting, creditClue=false | PASS (1866/1866) | FAIL (missing exercise) | Bug A: no discoverObject |
| creditClue=true | identify_pack + identify with creditClue=true | FAIL (rng 7267/20848) | Needs test | Extra exercise from newly-discovered types |
| creditClue=false + identify() | fully_identify_obj(target, false) | rng 100%, screens 1842/1866 | Needs test | Types become known → screen names change |
| Pure display_inventory | setOverrideID + regular inventory | FAIL (hi13 regresses) | N/A | C also has Debug Identify UI |

### Fix plan (REVISED)

**The root fix is Bug B: fix overlay PICK_ANY menu paging to match C's tty menu.**

If the overlay menu handles keystrokes identically to C's tty menu:
- Same items get selected in both C and JS
- Same types get discovered at the same wizard identify steps
- Exercise fires/doesn't fire at the same points
- Screen content matches (type names shown/hidden consistently)

**Phase 1 — Audit C's tty PICK_ANY menu behavior**
Study `nethack-c/src/wintty.c` (or `win/tty/wintty.c`) to understand:
1. How page navigation works (space = next page, on last page = dismiss)
2. How item letter selection works across pages (does pressing 'o' on
   page 2 select item 'o' from page 1, or is it ignored?)
3. How group accelerators (like `_` and ctrl+I) work across pages

**Phase 2 — Fix JS overlay PICK_ANY paging**
Modify `renderOverlayMenuPickAny` in invent.js (or headless.js) to match
C's tty behavior. Key behaviors to match:
- Item letter presses should only toggle items visible on current page
  (OR should toggle regardless — match whichever C does)
- Space should page forward, not dismiss, until the last page
- Group accelerators should work regardless of page

**Phase 3 — Fix individual item path to call `fully_identify_obj`**
Once Bug B is fixed, change the individual item path to:
```javascript
if (target && not_fully_identified(target)) {
    fully_identify_obj(target, true);  // creditClue=true matches C's makeknown
}
```
With matching menu behavior, the same items get identified in both C and JS,
so exercise fires at the same points.

Note: Use `fully_identify_obj` (not `identify`) to avoid `prinv()` output
since JS's wizard identify already displays items in the overlay menu.

**Phase 4 — Validate**
- Run all 262 sessions + the 6 exercise-divergent pending sessions.
- Check screens, RNG, and events for regressions.
- Promote sessions that now pass.

### Risk: MEDIUM-HIGH
Phase 2 (overlay menu paging fix) affects ALL PICK_ANY menus, not just
wizard identify. Needs comprehensive testing. Phase 3 is low-risk once
Phase 2 is correct.

### Gate: Phase 1 audit must determine exactly how C's tty menu handles
cross-page item selection before implementing Phase 2.

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

### Phase A: Quick wins (LOW RISK, do first) — DONE
1. ~~**canseemon unification** (Issue 2)~~ — DONE (18 files, commit 73bedc8bd)
2. ~~**bhitpos unification** (Issue 3)~~ — DONE (commit 4a3995da8)

### Phase B: Core fix (HIGH RISK, do on branch)
3. **Exercise timing restructure** (Issue 1) — game loop rewrite

### Phase C: Low priority (defer)
4. **costly_alteration** (Issue 4) — no RNG impact
5. **Squash `game.g[a-z]` C-ism subobjects** (Issue 7) — cosmetic cleanup

### Not needed:
5. FOG_CLOUD (Issue 5) — confirmed correct
6. Monster iteration (Issue 6) — confirmed correct

---

## Issue 7: Squash `game.g[a-z]` C-ism Subobjects

**Sessions affected:** None (dead code paths).

### Root cause

C groups instance globals alphabetically: `instance_globals_b` → `gb`,
`instance_globals_d` → `gd`, etc. The auto-translator preserved these
as `game.gb`, `game.gd`, `game.gi`, `game.gn` subobjects, but **none
of them are ever initialized** — any access would crash at runtime.

### Current state (4 subobjects, ~18 references)

| Subobject | Property | File | Refs | Status |
|-----------|----------|------|------|--------|
| `game.gb` | `blstats[0/1]` | botl.js | 12 | Dead — hilite thresholds not implemented |
| `game.gd` | `domove_attempting` | cmd.js | 2 | Dead — `game.gb` never created |
| `game.gi` | `item_action_in_progress` | do_wear.js | 2 | Dead — guarded by `game?.gi` |
| `game.gn` | `n_menu_mapped` | options.js | 2 | Dead — menu mapping not implemented |

### Fix plan

**Option A — Flatten to `game.*`** (preferred when features are implemented):
- `game.gb.blstats` → `game.blstats`
- `game.gd.domove_attempting` → `game.domove_attempting`
- `game.gi.item_action_in_progress` → `game.item_action_in_progress`
- `game.gn.n_menu_mapped` → `game.n_menu_mapped`

Initialize these in game constructor or first-use sites.

**Option B — Delete dead code paths** (simpler, if features aren't needed):
Remove the unreachable code that references these subobjects.

### Risk: NONE
All references are dead code. No session impact possible.

### Recommended: Do when implementing hilite/menu-mapping features,
or as a drive-by cleanup. Not urgent.

---

## Tooling Needed

### 1. Exercise timing diagnostic
Add to `rng_step_diff.js`:
```
--exercise-trace    Log RNG index at each exerchk/exerper call
```
This lets us confirm the RNG stream position difference between JS and C
at the exact point of exercise divergence.

### 2. ~~bhitpos assertion mode~~ — RESOLVED
Fixed: unified to `game.bhitpos` everywhere. No assertion needed.

### 3. ~~canseemon audit helper~~ — RESOLVED
Fixed: all consumers now use display.js version. mondata.js version deleted.

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
