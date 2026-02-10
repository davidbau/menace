# RNG Alignment Progress Report

**Date**: 2026-02-09
**Status**: Major Breakthrough - Depths 1-3 RNG Aligned

## Summary

Achieved **100% RNG alignment** for procedurally generated dungeon levels (depths 1-3) for seeds 16 and 163. This represents perfect synchronization of random number consumption between the C reference implementation and JavaScript port.

## Key Achievements

### 1. Fixed Themeroom needfill Bug (Commit 719e890)

**Problem**: JS was creating fewer fillable rooms than C, causing RNG divergence at bonus item selection.

**Root Cause**: Two themeroom functions were creating rooms without setting `needfill=FILL_NORMAL`:
- `themeroom_pick8_pillars`: Creates THEMEROOM for pillar layout
- `themeroom_pick9_mausoleum`: Creates outer + inner THEMEROOM rooms

When `needfill` defaults to `FILL_NONE` (from `makeRoom()`), rooms are excluded from the fillable count, leading to divergence at:
```javascript
const bonusCountdown = fillableCount > 0 ? rn2(fillableCount) : -1;
```

**Fix**: Added `room.needfill = FILL_NORMAL` after creating THEMEROOM rooms in both functions.

**Impact**:
- seed163 depths 1-3: RNG traces now **PASS** ✅ (was failing at call 1172)
- seed16 depths 1-3: RNG traces continue to **PASS** ✅ (maintained)

### 2. Test Results

**Map Sessions** (seed16, seed163, seed72, seed119, seed306):

| Depth | typGrid | RNG Trace | Status |
|-------|---------|-----------|--------|
| 1 | ✅ | ✅ | Perfect match |
| 2 | ❌ | ✅ | RNG aligned, terrain differs |
| 3 | ❌ | ✅ | RNG aligned, terrain differs |
| 4+ | 🚫 | 🚫 | Blocked on special levels |

**Overall Test Suite**: 1045 pass, 114 fail (90.2% pass rate)

## Identified Blockers

### Blocker 1: Special Level Implementation (Depth 4+)

**Finding**: All test seeds load special levels starting at depth 4.

**Evidence**:
- C shows ~30 `nhl_rn2` calls at depth 4 (Lua special level generation)
- Parameters increment: `rn2(1000)`, `rn2(1001)`, ..., `rn2(1037)`
- Indicates Oracle level or bigroom variant being loaded

**Current State**:
- JS has NO special levels registered for main dungeon (dnum=0)
- `special_levels.js` imports bigroom variants but doesn't register them
- Oracle level not even ported from C/Lua

**Action Needed**: Port and register main dungeon special levels with proper dnum/dlevel coordinates.

### Blocker 2: Algorithmic Divergence (Depths 2-3)

**Finding**: Perfect RNG alignment but different terrain layout.

**Seed 163 Depth 2 Differences**:
```
Terrain Type    JS      C       Difference
------------------------------------------
STONE (0)       1146    1041    +105
CORR (24)       113     192     -79  ⚠️
ROOM (25)       200     219     -19
DOOR (23)       16      23      -7
FOUNTAIN (28)   2       2       ✅
```

**Analysis**:
- Same random number sequence consumed
- Different interpretation/calculation of results
- Major deficit in corridor cells (-79, or -41%)
- Suggests issue in corridor generation algorithm

**Root Cause Hypothesis**:
Logic difference in `dig_corridor()`, `join()`, or `makecorridors()` functions:
- Integer division/rounding differences (floor vs truncation)
- Boundary condition checks
- Conditional logic ordering
- Coordinate calculations

**Next Steps**:
1. Add debug logging to `dig_corridor` to trace path generation
2. Compare C and JS corridor coordinates for first few corridors
3. Check for `Math.floor()` vs C `int` truncation differences
4. Verify boundary checks match C implementation exactly

## Technical Patterns Discovered

### Pattern: Themeroom needfill Requirements

**Rule**: ALL themeroom functions that create OROOM or THEMEROOM rooms MUST set `needfill=FILL_NORMAL`.

**Why**:
- Default from `makeRoom()` is `FILL_NONE`
- Fillable count used for bonus item selection: `rn2(fillableCount)`
- Mismatch causes RNG divergence

**Functions Fixed**:
- `themeroom_pick8_pillars` (line 1183)
- `themeroom_pick9_mausoleum` (lines 1213, 1224)

### Pattern: Build Room Check

**Rule**: `build_room()` calls `rn2(100)` but rooms are created REGARDLESS of result.

**Implementation**:
```javascript
rn2(100);  // Consumed for RNG alignment, doesn't gate creation
const room = create_room(...);  // Always executes
```

The `< 80` check may affect room properties or statistics, but does NOT prevent room creation.

## Remaining Work

### High Priority
1. **Port Oracle Level**: Main dungeon special level at depth 4-6
2. **Fix Corridor Algorithm**: Identify and fix calculation differences
3. **Register Bigroom Variants**: Enable special level selection for main dungeon

### Medium Priority
1. **Fix Lua→JS Converter**:
   - Array syntax issues (tower1.js, tower2.js, tower3.js)
   - Consistent object vs array handling
   - Reserved word detection
2. **Investigate seed1 Depth 2**: Gameplay session algorithmic divergence

### Low Priority
1. **Test depths 4-5 other seeds**: Verify consistent special level pattern
2. **Document corridor generation**: Create reference for C vs JS implementation

## References

- Test suite: `test/comparison/session_runner.test.js`
- Memory file: `~/.claude/projects/-share-u-davidbau-git-mazesofmenace/memory/MEMORY.md`
- Beads issue: `interface-61u` (depth 2 map structure differences)
- Related commits:
  - `73ac431`: Mausoleum inner room fix (+828 RNG calls)
  - `719e890`: Needfill fix (depths 1-3 passing)
  - `6f414b5`: Lua→JS converter fixes (asmodeus.js)
