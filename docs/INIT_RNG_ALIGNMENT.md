# Init RNG Alignment

## Status: RESOLVED (March 23, 2026)

All phases complete. Priest pantheon rn2(13) placed at correct ISAAC index.
rnd(9000)+rnd(30) moved to _gameLoopStep preamble. 539/563 sessions passing
(+1 from baseline). Zero regressions.

## Background

C's startup order in `newgame()` (allmain.c:889-966):
```
init_objects()          — 198 ISAAC values (o_init.c shuffles)
role_init()             — nemesis gender rn2(100) for Arch/Wiz, then
                          pantheon rn2(13) for Priest (role.c:2060-2078)
init_dungeons()         — dungeon generation
init_artifacts()        — artifact setup
u_init()                — player initialization + inventory
[level gen]             — mklev()
welcome(TRUE)           — nhlib shuffle rn2(3)+rn2(2) via l_nhcore_call
moveloop_preamble()     — rnd(9000) + set_wear + rnd(30)
```

JS's startup order (after fix):
```
initLevelGeneration()   — init_objects (198)
                          + pantheon rn2(13) for Priest (dungeon.js:4983-4992)
                          + init_dungeons (nemesis gender rn2(100) + nhlib shuffle + dungeons)
[u_init equivalent]     — player init + inventory
[level gen]             — mklev()
nhlib shuffle           — rn2(3)+rn2(2) (in initFirstLevel, u_init.js:1281)
[lore display]          — no RNG (uses pantheonIdx from initLevelGeneration)
_gameLoopStep preamble  — rnd(9000) + rnd(30) (allmain.js, once via _preambleDone guard)
```

## Fix Details

### Root Cause 1: Priest pantheon duplicate

`init_dungeons()` (dungeon.js:4396-4400) had a `rn2(roles.length)` call for
Priest (PM_CLERIC), AND `initLevelGeneration()` (dungeon.js:4983-4992) had
a new pantheon rn2(13) loop. Both fired for Priest, consuming rn2(13) twice
at ISAAC indices 198 and 199.

**Fix**: Removed the duplicate from `init_dungeons()`. The pantheon rn2(13)
in `initLevelGeneration` is at the correct ISAAC position (index 198, right
after init_objects). `initLevelGeneration` returns `pantheonIdx`; caller
stores it on the player object. Lore construction uses `pantheonIdx` without
consuming RNG.

### Root Cause 2: rnd(9000)+rnd(30) step timing

C's `moveloop_preamble()` runs at the start of `moveloop()`, AFTER
`welcome(TRUE)` has shown and dismissed lore. In the replay model, this
corresponds to step 1 (after the first key press). JS had these in
`initFirstLevel()` at step 0 (during init).

**Fix**: Moved `rnd(9000)` and `rnd(30)` from `initFirstLevel` (u_init.js)
to `_gameLoopStep` (allmain.js) with a `_preambleDone` flag. The nhlib
shuffle `rn2(3)+rn2(2)` stays in `initFirstLevel` matching C's `welcome()`
timing.

### Results

- seed3 (Priest): rng 0/2354 → 2354/2354 (100%)
- seed327_priest_wizard: rng divergent → 20303/20303 (100%)
- theme34_seed2281_pri_explore: rng divergent → 3271/3271 (100%)
- 3 interface sessions: rng improved to 100% (2547/2547, 2802/2802, 2802/2802)
  (screen failures remain — unrelated display issue at step 1)
- Zero regressions across 563 sessions

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
`rn2(13)` at seed 3 produces value 4, matching C.

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

## Key Lesson: Duplicate RNG Calls

When adding RNG-consuming code to match C's call order, always check if the
same RNG call already exists in a called function. In this case, `init_dungeons`
had bundled several `role_init()` RNG calls (nemesis gender, pantheon, nhlib
shuffle) at its start. Adding the pantheon to `initLevelGeneration` without
removing the one inside `init_dungeons` caused a double consumption.
