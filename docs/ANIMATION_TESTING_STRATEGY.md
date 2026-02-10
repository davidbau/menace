# Animation Testing Strategy

## Goal
Capture C NetHack's animation behavior in a reproducible format that can be used to validate the JavaScript port's animation system.

## Challenges

1. **Visual/Temporal Nature**: Animations are about timing and display, not game state
2. **No Existing Traces**: Standard session captures only record game state changes
3. **Verification Needed**: Must verify glyph sequences, positions, timing, and cleanup

## Strategy Overview

### Phase 1: Instrument C NetHack

Modify `src/display.c:tmp_at()` to log all animation calls to a JSON file.

#### Instrumentation Approach

Add logging to `tmp_at()` function:

```c
// In display.c, add at top:
#ifdef ANIMATION_TRACE
static FILE *anim_trace_file = NULL;
static struct timeval last_anim_time = {0, 0};
#endif

// In tmp_at() function, log each call:
#ifdef ANIMATION_TRACE
void log_animation_call(int mode, coordxy x, coordxy y, int glyph) {
    if (!anim_trace_file) {
        char filename[256];
        sprintf(filename, "animation_trace_%ld.json", (long)time(NULL));
        anim_trace_file = fopen(filename, "w");
        fprintf(anim_trace_file, "[\n");
        gettimeofday(&last_anim_time, NULL);
    }
    
    struct timeval now;
    gettimeofday(&now, NULL);
    long elapsed_ms = (now.tv_sec - last_anim_time.tv_sec) * 1000 
                    + (now.tv_usec - last_anim_time.tv_usec) / 1000;
    
    fprintf(anim_trace_file,
        "  {\"call\": \"tmp_at\", \"mode\": %d, \"x\": %d, \"y\": %d, "
        "\"glyph\": %d, \"elapsed_ms\": %ld},\n",
        mode, x, y, glyph, elapsed_ms);
    
    last_anim_time = now;
}
#endif
```

#### Compilation

```bash
cd nethack-c
make clean
make CFLAGS="-DANIMATION_TRACE" install
```

### Phase 2: JSON Trace Format

Each animation trace will be a JSON array of events:

```json
{
  "scenario": "throw_dagger_straight",
  "seed": 12345,
  "initial_state": {
    "player_pos": {"x": 40, "y": 11},
    "direction": {"dx": 1, "dy": 0},
    "object": "dagger",
    "range": 10
  },
  "animation_events": [
    {
      "call": "tmp_at",
      "mode": -4,
      "mode_name": "DISP_FLASH",
      "x": null,
      "y": null,
      "glyph": 2456,
      "glyph_name": "dagger",
      "elapsed_ms": 0,
      "timestamp": 0
    },
    {
      "call": "tmp_at",
      "mode": null,
      "x": 41,
      "y": 11,
      "glyph": null,
      "elapsed_ms": 0,
      "timestamp": 0
    },
    {
      "call": "delay_output",
      "elapsed_ms": 50,
      "timestamp": 50
    },
    {
      "call": "tmp_at",
      "mode": null,
      "x": 42,
      "y": 11,
      "glyph": null,
      "elapsed_ms": 0,
      "timestamp": 50
    },
    {
      "call": "delay_output",
      "elapsed_ms": 50,
      "timestamp": 100
    },
    {
      "call": "tmp_at",
      "mode": -7,
      "mode_name": "DISP_END",
      "x": 0,
      "y": 0,
      "glyph": null,
      "elapsed_ms": 0,
      "timestamp": 150
    }
  ],
  "final_state": {
    "object_position": {"x": 50, "y": 11},
    "object_broke": false
  }
}
```

#### Event Types

1. **tmp_at(mode, glyph)** - Initialize animation
   - `mode`: DISP_BEAM (-1), DISP_FLASH (-4), DISP_TETHER (-3), etc.
   - `glyph`: The symbol to display

2. **tmp_at(x, y)** - Display at position
   - `x`, `y`: Coordinates
   - Inherits current mode/glyph

3. **delay_output()** - Timing delay
   - Records actual elapsed time

4. **tmp_at(DISP_END, flags)** - Cleanup
   - `flags`: 0 (normal) or BACKTRACK (-1)

### Phase 3: Test Scenarios

Create controlled scenarios with known inputs/outputs:

#### Scenario 1: Straight Throw
```
Action: Throw dagger east
Expected: 10 squares, DISP_FLASH, 50ms each
```

#### Scenario 2: Diagonal Throw
```
Action: Throw dagger northeast
Expected: ~7 squares diagonal, DISP_FLASH, 50ms each
```

#### Scenario 3: Beam Ray
```
Action: Zap wand of striking east
Expected: 7-13 squares, DISP_BEAM, trail visible, 50ms each
```

#### Scenario 4: Tethered Weapon
```
Action: Throw aklys (wielded)
Expected: DISP_TETHER, outbound + BACKTRACK return
```

#### Scenario 5: Breaking Object
```
Action: Throw potion at wall
Expected: DISP_FLASH to impact point, then single flash at break
```

#### Scenario 6: Boomerang
```
Action: Throw boomerang
Expected: Curved path via boomhit(), return animation
```

### Phase 4: Capture Process

#### Step 1: Prepare Test Environment
```bash
cd nethack-c
make clean
make CFLAGS="-DANIMATION_TRACE" install

# Create test save with specific setup
./nethack -u TestPlayer -D
```

#### Step 2: Execute Scenarios
For each scenario:
1. Load controlled save state
2. Execute action (throw, zap, etc.)
3. Animation trace auto-saves to JSON
4. Verify trace completeness

#### Step 3: Post-Process Traces
```bash
# Add metadata and clean up traces
python3 tools/process_animation_traces.py animation_trace_*.json
```

### Phase 5: Validation Approach

#### JavaScript Testing
```javascript
// Load C trace
const c_trace = require('./test/animations/throw_dagger_straight.json');

// Execute same action in JS
const js_events = await captureAnimation(() => {
    player.throw('dagger', {dx: 1, dy: 0});
});

// Compare
assert.equal(js_events.length, c_trace.animation_events.length);
for (let i = 0; i < js_events.length; i++) {
    const c_event = c_trace.animation_events[i];
    const js_event = js_events[i];
    
    // Verify event type
    assert.equal(js_event.call, c_event.call);
    
    // Verify positions
    if (c_event.x !== null) {
        assert.equal(js_event.x, c_event.x);
        assert.equal(js_event.y, c_event.y);
    }
    
    // Verify timing (allow 5ms tolerance)
    if (c_event.call === 'delay_output') {
        assert.closeTo(js_event.elapsed_ms, c_event.elapsed_ms, 5);
    }
}
```

## Implementation Plan

### Tools Needed

1. **C Code Instrumentation**
   - Modify `src/display.c`
   - Add `#ifdef ANIMATION_TRACE` guards
   - Log tmp_at() and nh_delay_output() calls

2. **Trace Post-Processor**
   - `tools/process_animation_traces.py`
   - Clean up JSON formatting
   - Add human-readable names
   - Validate trace structure

3. **JS Capture Harness**
   - `test/animations/capture.js`
   - Intercept tmp_at() calls
   - Record timing
   - Export to same JSON format

4. **Comparison Test Framework**
   - `test/animations/compare.test.js`
   - Load C and JS traces
   - Assert equivalence
   - Report differences

### Directory Structure

```
test/
  animations/
    traces/
      c/
        throw_dagger_straight.json
        throw_dagger_diagonal.json
        zap_wand_striking.json
        throw_aklys_tethered.json
        throw_potion_break.json
        throw_boomerang.json
      js/
        (generated during tests)
    capture.js          # JS animation capture
    compare.test.js     # Comparison tests
    
tools/
  process_animation_traces.py
  gen_animation_sessions.py
  
nethack-c/
  src/display.c         # Modified with ANIMATION_TRACE
  src/zap.c            # Modified with ANIMATION_TRACE
  win/tty/termcap.c    # Modified with ANIMATION_TRACE
```

## Success Criteria

- [ ] C NetHack successfully logs all tmp_at() calls
- [ ] JSON traces capture timing with millisecond precision
- [ ] All 6 test scenarios produce valid traces
- [ ] Traces are deterministic (same seed = same trace)
- [ ] Post-processor adds human-readable metadata
- [ ] JS capture harness produces compatible format

## Next Steps

1. Create instrumentation patch for C NetHack
2. Build instrumented version
3. Create test scenarios and capture traces
4. Build post-processor
5. Validate trace format with sample data

## Notes

- **Determinism**: Use fixed seeds to ensure reproducible traces
- **Minimal Modification**: Keep C changes minimal to avoid affecting behavior
- **Cleanup**: Ensure traces don't clutter build directory
- **Performance**: Logging should not significantly slow down execution
