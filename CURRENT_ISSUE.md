# Current RNG Alignment Issue

## Status
- **RNG Calls Match**: 1-343 (100% aligned)
- **First Divergence**: Call 344
- **Gap**: 2551 JS vs 2659 C (108 calls difference)
- **Test**: Procedural dungeon seed 3, depth 1

## Problem
RNG calls show Room 2 being created before Room 1 contents execute, but debug logging shows correct execution order.

### C Sequence (calls 340-355)
```
340-343: Room creation (rnd(5), rnd(5), rnd(3), rnd(3)) - position/alignment
344-349: Room contents (rn2(7), rn2(6), rn2(5), rn2(4), rn2(3), rn2(2)) - shuffle
350:     Next room starts (rn2(3) @ rnd_rect)
```

### JS Sequence (calls 340-355)
```
340-343: Room 1 (Pillars) creation (rnd(5), rnd(5), rnd(3), rnd(3))
344-347: Room 2 creation (rnd(5), rnd(5), rnd(3), rnd(3)) ← 4 calls early!
348-353: Room 1 (Pillars) contents (rn2(7), rn2(6), ..., rn2(2)) - shuffle
```

## Investigation (2026-02-10)

### Confirmed Facts
1. **Contents execute immediately**: Debug logging shows:
   ```
   des.room(): created room at (65,2) size 11x11, map.nroom=2
   des.room(): EXECUTING contents callback for room at (65,2)
   Pillars: inner contents() called for room at (65,2), about to shuffle
   Pillars: shuffle complete
   des.room(): FINISHED contents callback for room at (65,2)
   Pillars: outer contents() returning
   [THEN] Room 2 selection starts
   ```

2. **RNG trace contradicts debug logging**: RNG calls 344-347 happen BEFORE shuffle (348-353), but debug shows shuffle happens immediately after room creation

3. **Pillars room structure**:
   - Outer contents(): Calls `des.room({ w: 10, h: 10, contents: inner })`
   - Inner contents(): Calls `shuffle(terr)` then `des.terrain()` in loops
   - shuffle() makes exactly 6 RNG calls: rn2(7), rn2(6), rn2(5), rn2(4), rn2(3), rn2(2)

4. **add_doors_to_room() implemented**: Added after contents execution (sp_lev.js:1447), but doesn't make RNG calls

### Mystery
The 4 RNG calls at positions 344-347 (rnd(5), rnd(5), rnd(3), rnd(3)) appear to be room position/alignment selection, but:
- They happen AFTER Room 1 is created (calls 340-343)
- They happen BEFORE Room 1 contents execute (calls 348-353)
- Debug logging shows Room 2 selection happens AFTER Room 1 contents finish
- No code path exists between room creation and contents execution that makes these calls

### Hypotheses
1. **Nested room creation**: Something inside Pillars inner contents triggers room creation before shuffle?
2. **RNG logging order**: Are RNG calls being logged out of order somehow?
3. **Multiple execution contexts**: Are there parallel/async operations affecting call order?
4. **Incorrect room identification**: Are we tracking the wrong room as "Room 1" vs "Room 2"?

## Next Steps
1. **Trace actual function call stack**: Capture stack traces at RNG calls 344-347 to see what code is making them
2. **Compare with C source**: Re-examine C sp_lev.c lspo_room() to understand expected execution order
3. **Test with different seed**: Try seed with simpler themed room to isolate issue
4. **Check for deferred callbacks**: Search for setTimeout, Promise, or callback queuing that might defer execution
