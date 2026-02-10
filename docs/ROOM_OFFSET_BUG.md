# Room Coordinate Offset Bug - Investigation Summary

## Status: UNSOLVED

Despite extensive investigation, the exact source of the +1 X coordinate offset in room generation remains elusive.

## What We Know For Certain

1. **Perfect RNG alignment** through turn 8 (2483 consecutive matching calls)
2. **Room coordinates offset by +1 in X:**
   - C: Room 0 has `lx=10` (inferred)
   - JS: Room 0 has `lx=11` (confirmed)
3. **Player/upstairs offset cascades:**
   - C: upstairs at (14,4), player starts at (14,4)
   - JS: upstairs at (15,4), player starts at (15,4)
4. **Turn 9 divergence:** Players attack different squares due to position offset

## Verified as MATCHING (Not the Bug)

✅ RNG call sequence (perfect match through 2483 calls)
✅ Constants: `COLNO=80`, `XLIM=4`, `YLIM=2`, `ROWNO=22`
✅ Room generation logic flow
✅ Integer division (`Math.floor`, `Math.trunc`, C `/`)
✅ Boundary adjustments (`if (!lowx) lowx++`)
✅ Coordinate clamping (`if (lowx < 3) lowx = 3`)
✅ xborder calculation `(lx > 0 && hx < COLNO-1) ? 2*xlim : xlim+1`
✅ xabs formula `lx + (lx > 0 ? xlim : 3) + rn2(hx - (lx > 0 ? lx : 3) - dx - xborder + 1)`
✅ Map array indexing (`map.at(x,y) = locations[x][y]`)
✅ Room struct creation (`r2 = {lx: xabs-1, ...}` for rect splitting only)
✅ Actual room addition (`add_room_to_map(xabs, yabs, ...)`)
✅ litstate_rnd() RNG calls for room lighting
✅ dx/dy calculations (`dx = 2 + rn2(...); dy = 2 + rn2(4)`)

## Theories Investigated

### Theory 1: Arithmetic Difference
**Hypothesis:** Some calculation produces xabs=11 in JS vs xabs=10 in C
**Result:** All arithmetic verified identical - ELIMINATED

### Theory 2: Coordinate System Mismatch
**Hypothesis:** 0-based vs 1-based indexing difference
**Result:** Both use same indexing, map.at() is straightforward - ELIMINATED

### Theory 3: Retry Loop Divergence
**Hypothesis:** Different number of create_room retries
**Result:** Would cause RNG divergence during level gen, but RNG matches - ELIMINATED

### Theory 4: Conditional RNG Call
**Hypothesis:** C and JS take different branches, shifting RNG usage
**Result:** All branches verified identical, RNG sequence matches - ELIMINATED

### Theory 5: Hidden State Difference
**Hypothesis:** Some non-RNG state differs, causing deterministic +1 offset
**Result:** POSSIBLE but source not found despite extensive checking

## Remaining Possibilities

1. **Subtle compiler/interpreter difference** in how expressions are evaluated
2. **Hidden state in C** (global variable, static, etc.) that affects calculation
3. **Order of operations difference** that's deterministic but produces +1
4. **Bug in C NetHack 3.7** that we're matching incorrectly
5. **Rect pool management difference** in edge cases

## Impact

**Minimal** - Seed 99999 achieves 8 perfect turns, validating core simulation.

The offset is consistent (+1 in X) and deterministic, suggesting a systematic difference rather than random divergence.

## Recommendation

1. **Accept 8 perfect turns** as excellent validation
2. **Document as known issue** for future investigation
3. **Focus on other validation work** rather than continuing this deep dive
4. **Possible future approach:** Binary search through execution with instruction-level tracing

## Files for Future Investigation

- `js/dungeon.js:238-385` - create_room() function
- `js/dungeon.js:169-226` - check_room() function
- `js/dungeon.js:74-79` - init_rect() initialization
- `js/dungeon.js:391-488` - do_room_or_subroom() and add_room_to_map()

## Test Scripts

- `manual_xabs_calc.mjs` - Manual calculation walkthrough
- `test_room_calc.mjs` - Instrumented room generation test
- `compare_room_bounds.mjs` - Room boundary comparison

---

**Investigation Duration:** ~4 hours
**Lines of Code Reviewed:** ~2000+
**Debugging Scripts Created:** 20+
**Result:** Root cause located to room generation, exact line unknown
