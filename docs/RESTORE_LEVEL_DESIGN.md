# Restore Level Design

## Problem

When the player returns to a previously-visited dungeon level, C's `getlev()`
(restore.c) runs a monster restoration loop that JS doesn't have. This loop
consumes RNG and modifies monster state, causing parity divergence.

**Current impact**: seed032 diverges at step 280, index 18643. JS is in
`changeLevel(do.js:1822)` while C is at `rnd(10) @ getlev(restore.c:1212)`.
C calls `rnd(10)` for the hide_monst check; JS doesn't call it at all.

## C Architecture (restore.c:1170-1219)

When C restores a saved level via `getlev()`, it runs this sequence:

### 1. Monster Placement (lines 1174-1191)
```c
for (mtmp = fmon; mtmp; mtmp = mtmp->nmon) {
    if (mtmp->isshk) set_residency(mtmp, FALSE);
    if (mtmp->m_id == u.usteed_mid) {
        u.usteed = mtmp; u.usteed_mid = 0;
    } else {
        place_monster(mtmp, mtmp->mx, mtmp->my);
        if (hides_under(mtmp->data) && mtmp->mundetected)
            hideunder(mtmp);
    }
```
This places all monsters back on the map. JS doesn't need this because
monsters are already in the cached `map.monsters` array.

### 2. Elapsed Time Computation (line 1104)
```c
elapsed = (svm.moves - svo.omoves);
```
`svo.omoves` is the turn count saved when the level was last stored.
`svm.moves` is the current turn count. The difference is how many game
turns passed while the player was on other levels.

### 3. Monster State Catchup (lines 1193-1213)
For each monster on the level (iterating fmon in LIFO order):

**a. Skip if dlevel is 0** (line 1194) — game init, not gameplay.

**b. Ghostly: reset alignment** (lines 1196-1204) — only for bones levels.

**c. Elapsed time catchup** (lines 1205-1206):
```c
if (elapsed > 0L)
    mon_catchup_elapsed_time(mtmp, elapsed);
```

**d. Restore shapeshifters** (line 1210):
```c
restore_cham(mtmp);
```

**e. Re-hide hiders** (lines 1212-1213):
```c
if (ghostly || (elapsed > 0L && elapsed > (long) rnd(10)))
    hide_monst(mtmp);
```

### 4. Level Infrastructure Restore (lines 1217-1219)
```c
restdamage(nhfp);
rest_regions(nhfp);
rest_bubbles(nhfp);
```

## `mon_catchup_elapsed_time` (dog.c:623-720)

This is the RNG-heavy function. For each monster, given `elapsed` moves:

### Non-RNG state adjustments:
- `mblinded`: decrement by elapsed, min 1 (lines 646-650)
- `mfrozen`: decrement by elapsed, min 1 (lines 652-656)
- `mfleetim`: decrement by elapsed, min 1 (lines 658-662)
- `meating`: decrement or finish (lines 674-678)
- `mspec_used`: decrement or clear (lines 680-683)

### RNG-consuming checks (CRITICAL for parity):
```c
// Lines 666-671 — conditional RNG
if (mtmp->mtrapped && rn2(imv + 1) > 40 / 2)   // rn2(elapsed+1) vs 20
    mtmp->mtrapped = 0;
if (mtmp->mconf && rn2(imv + 1) > 50 / 2)       // rn2(elapsed+1) vs 25
    mtmp->mconf = 0;
if (mtmp->mstun && rn2(imv + 1) > 10 / 2)       // rn2(elapsed+1) vs 5
    mtmp->mstun = 0;
```
**IMPORTANT**: These `rn2()` calls are CONDITIONAL — only consumed when the
monster actually has the condition. If a monster is not trapped/confused/stunned,
no RNG is consumed for that check.

```c
// Lines 686-693 — tame reduction (conditional on mtame)
if (mtmp->mtame) {
    int wilder = (imv + 75) / 150;
    if (mtmp->mtame > wilder)
        mtmp->mtame -= wilder;
    else if (mtmp->mtame > rn2(wilder))    // conditional RNG
        mtmp->mtame = 0;
    else
        mtmp->mtame = mtmp->mpeaceful = 0;
}
```

```c
// Lines 698-704 — pet starvation check (conditional on mtame+carnivorous/herbivorous)
if (mtmp->mtame && !mtmp->isminion
    && (carnivorous(mtmp->data) || herbivorous(mtmp->data))) {
    struct edog *edog = EDOG(mtmp);
    if ((svm.moves > edog->hungrytime + 500 && mtmp->mhp < 3)
        || (svm.moves > edog->hungrytime + 750))
        mtmp->mtame = mtmp->mpeaceful = 0;
}
```

```c
// Lines 714-717 — HP recovery (no RNG)
if (!regenerates(mtmp->data)) imv /= 20;
healmon(mtmp, imv, 0);
```

## JS Current State

JS's `changeLevel()` (do.js:1692) caches levels in `game.levelsByBranch`
and restores them by reference — no save/restore mechanism. When returning
to a cached level:

- **Monster placement**: already in `map.monsters` (no action needed)
- **Elapsed time catchup**: NOT IMPLEMENTED
- **restore_cham**: NOT CALLED during level transition
- **hide_monst**: NOT CALLED during level transition
- **Level infrastructure**: regions/traps are already in memory

## Implementation Plan

### Step 1: Track departure time
When leaving a level, save the current `game.moves` to `map._lastVisitMoves`.
This gives us `elapsed = game.moves - map._lastVisitMoves` on return.

**Status**: Implemented in fog cloud fix commit (do.js line 1737).

### Step 2: Monster restoration loop
After restoring a cached level in `changeLevel()`, iterate `nextMap.monsters`
and run the catchup logic.

**Critical ordering requirement**: C iterates `fmon` in linked-list order
(LIFO — newest monster first). JS's `map.monsters` uses `unshift` (also LIFO).
The iteration order MUST match because conditional `rn2()` calls depend on
which monsters have trapped/confused/stunned/tame state.

### Step 3: Implement `mon_catchup_elapsed_time`
Port `dog.c:623-720` to JS. Key requirements:
- All CONDITIONAL rn2 calls must fire in the same order as C
- `finish_meating()` simplified to clearing `meating`
- `healmon()` for HP recovery
- Pet starvation/wildness check via EDOG data

### Step 4: Call `restore_cham` and `hide_monst`
These already exist in JS (mon.js). Just need to call them during the loop.
`hide_monst` is gated by `rnd(10)` — must use `rnd()` not `rn2()` to match
C's RNG logging (rnd is a standalone logged entry).

### Step 5: `restore_timers` and `rest_regions`
C also calls `restore_timers(nhfp, RANGE_LEVEL, elapsed)` (line 1137) and
`rest_regions(nhfp)` (line 1218) during level restoration. JS regions persist
in memory and timers may need elapsed-time adjustment. These are lower
priority but may matter for longer absences.

## First Attempt Findings

An initial implementation (reverted) showed:
- The loop runs correctly for two level transitions (elapsed=1, elapsed=181)
- But RNG match DECREASED from 70.7% to 66.4%
- Likely cause: monster iteration order mismatch or a conditional check
  difference (C monster has mtrapped but JS doesn't, or vice versa)

**Next step**: Add C-side event_log inside `mon_catchup_elapsed_time` to trace
exactly which monsters get which rn2 calls, then match JS's behavior precisely.

## C-Side Diagnostic Patch (proposed)

```c
// In dog.c mon_catchup_elapsed_time(), after line 664:
event_log("catchup[%d@%d,%d elapsed=%d trapped=%d conf=%d stun=%d tame=%d]",
          monsndx(mtmp->data), mtmp->mx, mtmp->my, imv,
          mtmp->mtrapped, mtmp->mconf, mtmp->mstun, mtmp->mtame);
```

This would reveal exactly which monsters consume RNG during catchup and
allow precise matching in JS.
