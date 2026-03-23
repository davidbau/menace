# Init RNG Alignment

## Problem

JS and C consume startup RNG in slightly different orders, causing ISAAC
stream misalignment for sessions with roles that lack gods (Priest).
This blocks 8+ sessions from passing and prevents the moveloop_preamble
timing fix from landing.

## Background

C's startup order in `newgame()` (allmain.c:889-966):
```
init_objects()          — 198 ISAAC values (o_init.c shuffles)
role_init()             — pantheon rn2(13) for Priest (role.c:2068)
init_dungeons()         — dungeon generation
init_artifacts()        — artifact setup
u_init()                — player initialization + inventory
[level gen]             — mklev()
welcome(TRUE)           — nhlib shuffle rn2(3)+rn2(2) via l_nhcore_call
moveloop_preamble()     — rnd(9000) + set_wear + rnd(30)
```

JS's startup order in `game.init()` → `initFirstLevel()`:
```
[character setup]       — no RNG
[moon/friday13]         — no RNG (change_luck only)
initLevelGeneration()   — init_objects (198) + init_dungeons
[u_init equivalent]     — player init + inventory
[level gen]             — mklev()
nhlib shuffle           — rn2(3)+rn2(2) (in initFirstLevel)
rnd(9000)               — rndencode (in initFirstLevel)
rnd(30)                 — seerTurn (in initFirstLevel)
```

## Key Differences

### 1. Missing pantheon assignment (Priest only)

C's `role_init()` (role.c:2064-2078) checks if the role has gods. Only
Priest has `lgod == NULL`. For Priest, C calls `randrole(FALSE)` =
`rn2(SIZE(roles)-1)` = `rn2(13)` in a loop until finding a role with gods.

JS doesn't have this. Instead, the lore construction in `allmain.js:1940-1945`
has a fallback: `rn2(roles.length)` = `rn2(13)` when `godForRoleAlign`
returns null. This `rn2(13)` fires at a DIFFERENT ISAAC position (during
step 0 lore display, not during init_objects/role_init).

**Evidence**: C session seed3 (Priest) has `rn2(13)=4 @ randrole(role.c:726)`
at normalized index 198 (immediately after init_objects's 198 entries). JS
produces `rn2(13)` during lore construction, ~2350 ISAAC values later.

### 2. rnd(9000) + rnd(30) step timing

C's `moveloop_preamble()` consumes `rnd(9000)` and `rnd(30)` at step 1
(after the first key press, which dismisses lore --More--). JS consumes
them during `initFirstLevel()` at step 0 (during init, before lore display).

For 540/563 passing sessions, the ISAAC values happen to match at both
positions. For 8 failing sessions (3 interface, seed3, theme03, theme34,
seed307, theme12_943), the values differ because the ISAAC stream
diverged at an earlier point.

**Evidence**: Moving rnd(9000)+rnd(30) to `_gameLoopStep` preamble fixes
3 interface sessions (+3) but regresses seed3 (-1) because the Priest
pantheon rn2(13) is at the wrong position.

## ISAAC Position Verification

For seed 3 (Priest, neutral):
```
C norm[0-197]:  init_objects     — 198 entries (shuffles + gem colors)
C norm[198]:    randrole(FALSE)  — rn2(13)=4 (pantheon for Priest)
C norm[199-200]: nhlib shuffle   — rn2(3)+rn2(2) (alignment shuffle)
C norm[201+]:   init_dungeons    — dungeon generation
```

JS's `init_objects()` also produces exactly 198 entries (3 gem + 194
shuffle + 1 WAN_NOTHING). Verified via code inspection.

Raw ISAAC verification: consuming 198 dummy `rn2(100)` calls then
`rn2(13)` at seed 3 produces value 4, matching C. This confirms the
ISAAC engine is identical — the issue is purely call-order alignment.

## Investigation Finding

An attempt to place the pantheon `rn2(13)` between `init_objects()` and
`init_dungeons()` in `initLevelGeneration()` (dungeon.js) produced
`rn2(13)=2` instead of C's `rn2(13)=4` at `rngCallCount=199`. Despite
the count suggesting ISAAC index 198, the VALUE differs.

**Possible explanations**:
1. `rngCallCount` includes composite `rnd()` calls that also consume
   ISAAC — making the actual ISAAC consumption higher than 198
2. Something between `init_objects()` and the pantheon placement in JS
   consumes ISAAC values that C doesn't
3. JS's `initRng()` consumes startup ISAAC values for initialization
   that C's `init_random()` doesn't

**Next diagnostic**: Add a raw ISAAC value dump at index 198 in both JS
and C to verify the stream is identical at that point.

## Fix Plan

### Phase 1: Verify ISAAC alignment at init_objects boundary
- Add `console.log` of raw ISAAC value (before modulo) at index 198 in JS
- Add `event_log` of raw rn2 value at the randrole call in C
- Compare: if values match, ISAAC is aligned and the issue is in
  intermediate calls. If values differ, find where they diverge.

### Phase 2: Implement pantheon at correct ISAAC position
- Place `rn2(13)` pantheon call in `initLevelGeneration` between
  `init_objects()` and `init_dungeons()` (dungeon.js:4961+)
- Only for Priest (check `role.gods[0]`)
- Use `rn2(roles.length)` = `rn2(13)` matching C's `rn2(SIZE(roles)-1)`
- Store result in `player.pantheonIdx`

### Phase 3: Update lore construction
- Remove `rn2(roles.length)` fallback from allmain.js lore display
- Use `player.pantheonIdx` to look up god names via `godForRoleAlign`
- No RNG consumed during lore construction

### Phase 4: Move rnd(9000) + rnd(30) to _gameLoopStep preamble
- Remove from `initFirstLevel` (u_init.js)
- Add to `_gameLoopStep` (allmain.js) with `_preambleDone` guard
- nhlib shuffle `rn2(3)+rn2(2)` stays in `initFirstLevel` (step 0)
  matching C's `welcome()` timing

### Phase 5: Validate
- All 540 previously-passing sessions still pass
- seed3 (Priest) passes or improves
- 3 interface sessions pass (rnd(9000) at step 1)
- theme03/theme34 may improve
- No regressions on any channel

## Roles Without Gods

Only Priest (index 6) has `gods: [null, null, null]`. All other 12 roles
have gods. This was verified via runtime inspection:
```
0 Archeologist    Quetzalcoatl, Camaxtli, Huhetotl
1 Barbarian       Mitra, Crom, Set
2 Caveman         Anu, _Ishtar, Anshar
3 Healer          _Athena, Hermes, Poseidon
4 Knight          Lugh, _Brigit, Manannan Mac Lir
5 Monk            Shan Lai Ching, Chih Sung-tzu, Huan Ti
6 Priest          [null, null, null] ← only godless role
7 Rogue           Issek, Mog, Kos
8 Ranger          Mercury, _Venus, Mars
9 Samurai         _Amaterasu Omikami, Raijin, Susanowo
10 Tourist        Blind Io, _The Lady, Offler
11 Valkyrie       Tyr, Odin, Loki
12 Wizard         Ptah, Thoth, Anhur
```
