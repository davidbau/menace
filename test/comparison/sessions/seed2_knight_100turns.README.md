# Seed 2 Knight Gameplay Session (100+ turns)

## Overview
This session captures a Knight character playing NetHack with seed 2 for 111 turns (exceeding the 100 turn requirement). The session includes full C NetHack RNG traces, screen states at each step, and terrain grids.

## Session Details
- **Seed**: 2
- **Character**: Knight (human, male, lawful)
- **Character Name**: Wizard
- **Total Steps**: 111 (111 turns)
- **File**: `seed2_knight_100turns.session.json`
- **File Size**: ~303 KB

## Session Contents

### Startup Phase
- **RNG Calls**: 2,583 calls during character creation and initial level generation
- **Screen Capture**: Initial game state
- **Terrain Grid** (`typGrid`): Complete dungeon level 1 terrain

### Gameplay Steps (111 steps)
Each step contains:
1. **Key**: The keystroke sent to the game
2. **Action**: Description of the action (e.g., "move-west", "search", "wait")
3. **RNG Trace**: Array of RNG calls with:
   - Function name (e.g., `rn2(7)`)
   - Return value
   - Call site (file:line, e.g., `uhitm.c:473`)
4. **Screen**: 24 lines of game output including:
   - Messages (line 0)
   - Map view (lines 1-21)
   - Status lines (lines 22-23)

### RNG Statistics
- **Total RNG calls** (excluding startup): 1,617
- **Average per step**: 14.6 RNG calls
- **Startup RNG calls**: 2,583

### Movement Pattern
The session follows this exploration pattern:
- 10 moves west (h)
- 10 moves east (l)
- 10 moves south (j)
- 10 moves north (k)
- 8 moves northwest (y)
- 8 moves northeast (u)
- 8 moves southwest (b)
- 8 moves southeast (n)
- Additional exploration and waiting
- Total: 111 turns

## Example RNG Trace Entry
```json
{
  "rng": [
    "rn2(7)=2 @ do_attack(uhitm.c:473)",
    "rn2(12)=7 @ mcalcmove(mon.c:1146)",
    "rn2(12)=3 @ mcalcmove(mon.c:1146)"
  ]
}
```

## Example Screen State
```
Wizard the Gallant             St:15 Dx:8 Co:11 In:7 Wi:16 Ch:18 Lawful
Dlvl:1 $:0 HP:16(16) Pw:5(5) AC:3 Xp:1
```

## Usage
This session can be used for:
1. **RNG verification**: Compare JS port RNG behavior against C implementation
2. **Gameplay replay**: Reproduce exact game state at any turn
3. **Testing**: Validate game mechanics implementation
4. **Debugging**: Trace RNG divergence points between implementations

## Generation Method
Generated using:
- **C NetHack binary**: Built from patched NetHack source with RNG tracing
- **Harness**: `test/comparison/c-harness/run_session.py`
- **Script**: `gen_knight_session_simple.py`

The session captures the authoritative C NetHack behavior, including all RNG calls made during gameplay.
