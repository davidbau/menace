# Special Levels Implementation Plan

> *"You feel the mass of scripted levels pressing on your mind."*

## Overview

NetHack 3.7 uses Lua scripts to define ~40 special level layouts across 8 dungeon
branches. Currently the JS port only generates procedural (random room/corridor)
levels via `makelevel()`. This plan covers:

1. **Collecting C traces** for every special level to use as ground truth
2. **Implementing the `des.*` API** (sp_lev.c equivalent) in JavaScript
3. **Porting Lua level definitions** to JS (per Decision 11)
4. **Branch-aware level generation** so the game knows when to use special vs procedural
5. **Testing** each special level against C traces for map fidelity

## Dungeon Structure

NetHack has 8 dungeon branches (+ Tutorial). Each has a set of named special levels:

| Branch | # | Special Levels |
|--------|---|----------------|
| Dungeons of Doom | 0 | rogue, oracle, bigroom, medusa, castle |
| Gehennom | 1 | valley, sanctum, juiblex, baalzebub, asmodeus, wizard1-3, orcus, fakewiz1-2 |
| Gnomish Mines | 2 | minetown (variants), mines end (variants) |
| The Quest | 3 | quest-start, quest-locate, quest-goal (per-role) |
| Sokoban | 4 | soko1-4 (each has 2 variants, random pick) |
| Fort Ludios | 5 | knox |
| Vlad's Tower | 6 | tower1, tower2, tower3 |
| Elemental Planes | 7 | astral, water, fire, air, earth |

Total: ~40 unique named levels, plus per-role quest variants (13 roles × 3 levels = 39).

## Phase 1: C Trace Collection

### 1a. Build C binary (if not already built)
Run `test/comparison/c-harness/setup.sh` to clone NetHack 3.7 C source and build.

### 1b. Extend gen_map_sessions.py for special levels
The current script uses wizard-mode `Ctrl+V` level teleport which only goes to depths
in the main dungeon. For special levels in branches, we need to:
- Teleport to the branch entry depth first
- Then use branch-specific teleport or `#goto` to reach the branch
- Capture the typGrid for each special level

Alternatively, create a new script `gen_special_sessions.py` that:
- For each seed, starts the game
- Uses wizard-mode commands to reach each special level
- Captures typGrid via `#dumpmap`
- Records the level identity (branch + level number + level name)

### 1c. Session format extension
Current session format has `levels[].depth` (integer). For special levels, extend to:
```json
{
  "depth": 6,
  "branch": "mines",
  "branchLevel": 3,
  "levelName": "minetown",
  "typGrid": [[...], ...]
}
```

### 1d. Seeds and coverage
- Use existing seeds (42, 1, 100, etc.) for variety
- Need multiple seeds per special level since some have random variants (Sokoban,
  Mines End, Minetown)
- Capture at least 3 seeds per special level for test coverage

## Phase 2: des.* API Foundation

The `des.*` API is the set of functions that Lua level scripts call to build levels.
These map to `sp_lev.c` functions in C. Create `js/sp_lev.js`:

### Core functions (priority order):
1. `des.level_init()` — Initialize level (mazewalk, solidfill, etc.)
2. `des.level_flags()` — Set level properties (noteleport, hardfloor, etc.)
3. `des.map()` — Place a fixed ASCII map region
4. `des.terrain()` — Set terrain at position(s)
5. `des.region()` — Define rectangular regions with properties
6. `des.room()` — Create rooms with contents callbacks
7. `des.door()` — Place doors
8. `des.stair()` — Place stairs (up/down, branch connections)
9. `des.ladder()` — Place ladders
10. `des.monster()` — Place monsters
11. `des.object()` — Place objects
12. `des.trap()` — Place traps
13. `des.altar()` — Place altars
14. `des.fountain()` — Place fountains
15. `des.gold()` — Place gold
16. `des.engraving()` — Place engravings
17. `des.grave()` — Place graves
18. `des.random_corridors()` — Connect regions with corridors
19. `des.wallify()` — Fix wall types
20. `des.mazewalk()` — Generate maze from a starting point
21. `des.non_diggable()` / `des.non_passwall()` — Mark regions

### Selection API:
- `selection.new()` — Create empty selection
- `selection.area(x1,y1,x2,y2)` — Rectangular selection
- `selection.rect(x1,y1,x2,y2)` — Perimeter of rectangle
- `selection.line(x1,y1,x2,y2)` — Line between points
- `selection.rndcoord(sel)` — Random coordinate from selection
- `selection.negate(sel)` — Complement
- `selection.percentage(sel, pct)` — Random subset
- `selection.grow(sel)` — Expand by one cell
- `selection.floodfill(x,y)` — Flood fill from point
- `selection.match(str)` — Match terrain pattern
- `selection.filter_mapchar(sel, ch)` — Filter by map character
- Set operations: `|` (union), `&` (intersection), `~` (complement)

### Helper functions:
- `percent(n)` — `rn2(100) < n`
- `d(n, sides)` — Roll n dice of given sides
- `nh.mon_generation_info()` — Monster class generation data
- `montype_from_name(name)` — Lookup monster by name

## Phase 3: Level File Porting (by branch)

Port each Lua level definition to JavaScript. Start with the simplest, build up:

### Tier 1 — Simple fixed maps (start here):
- **Sokoban** (soko1a/b, soko2a/b, soko3a/b, soko4a/b) — Pure ASCII maps, minimal logic
- **Vlad's Tower** (tower1, tower2, tower3) — Small fixed maps
- **Fort Ludios** (knox) — One fixed map

### Tier 2 — Medium complexity:
- **Oracle** — Fixed room layout with oracle NPC
- **Mines** (minetown variants: town, orcish, bazaar; mines end variants)
- **Valley of the Dead** — Fixed layout
- **Wizard levels** (wizard1, wizard2, wizard3)

### Tier 3 — Procedural special levels:
- **Castle** — Mix of fixed map + procedural elements
- **Medusa** — Procedural with fixed boss
- **Rogue level** — Emulates Rogue game aesthetics
- **Bigroom** — Large open room variants

### Tier 4 — Complex / Per-role:
- **Quest levels** (13 roles × 3 levels) — Role-specific maps and monsters
- **Gehennom demon levels** (juiblex, baalzebub, asmodeus, orcus)
- **Elemental Planes** (astral, water, fire, air, earth)
- **Sanctum** — Final temple

## Phase 4: Branch-Aware Level Generation

Modify the game to use special levels at appropriate depths:

### 4a. Level identity system
- `makelevel()` takes `(dnum, dlevel)` instead of just `depth`
- Lookup table: which `(dnum, dlevel)` maps to which special level file
- Fall through to procedural generation for non-special levels

### 4b. Branch connections
- Stairs/ladders that connect branches
- Branch entry points placed during main dungeon generation
- Level teleport recognizes branch structure

## Phase 5: Testing Strategy

### Per-level comparison tests
For each special level with a C trace:
1. Initialize RNG with same seed
2. Call the level generation function
3. Extract typGrid
4. Compare cell-by-cell against C trace
5. Report mismatches with terrain type names

### Structural validation
- All special levels have correct dimensions (COLNO×ROWNO)
- Stairs connect properly between levels
- Required features present (altars, fountains, monsters, etc.)

## Implementation Order

The recommended order prioritizes getting testable results quickly:

1. Build C binary and create trace collection script
2. Collect C traces for Sokoban (simplest special levels)
3. Implement minimal des.* API (des.map, des.terrain, des.level_init)
4. Port Sokoban levels and verify against traces
5. Collect C traces for remaining branches
6. Expand des.* API as needed for each level tier
7. Port levels tier by tier, testing against traces after each

## Lessons Learned

*(This section will be updated as we work through the implementation)*

---

## Reference

- C source: `nethack-c/dat/*.lua` (special level Lua files)
- C API: `nethack-c/src/sp_lev.c` (des.* implementation)
- JS dungeon: `js/dungeon.js` (current level generation)
- JS display: `js/display.js` (rendering)
- Test infra: `test/comparison/` (session comparison framework)
- Decision 11: `docs/DECISIONS.md` (Lua porting rationale)
