# NetHack Ephemeral Animation System

## Overview
C NetHack uses a **50 millisecond delay per square** for projectile and ray animations.

## Core Functions

### 1. `tmp_at()` - Temporary Display System
Located in `src/display.c:1165`

**Display Modes:**
- `DISP_BEAM` - Rays/beams (leaves trail visible until end)
- `DISP_FLASH` - Thrown objects (single square visible at a time)
- `DISP_TETHER` - Tethered weapons like aklys (shows connecting line)
- `DISP_ALL` - Everything visible simultaneously
- `DISP_ALWAYS` - Persistent display

### 2. `nh_delay_output()` - Timing Control
Located in `win/tty/termcap.c`

**Implementation:**
```c
void tty_delay_output(void) {
    if (flags.nap) {
        fflush(stdout);
        msleep(50);  /* sleep for 50 milliseconds */
        return;
    }
    // Fallback: padding or cursor movement tricks
}
```

**Key:** 50ms per animation frame

## Animation Patterns

### Pattern 1: Zapped Rays/Beams
From `src/zap.c:dobuzz()`

```c
// Initialize beam display
tmp_at(DISP_BEAM, zapdir_to_glyph(dx, dy, damgtype));

// Animate along path
while (range-- > 0) {
    sx += dx;
    sy += dy;
    
    if (cansee(sx, sy)) {
        tmp_at(sx, sy);      // Show beam at this position
        nh_delay_output();   // Wait 50ms
    }
    
    // Check for hits, reflections, etc.
}

// Cleanup - erase entire beam
tmp_at(DISP_END, 0);
```

**Behavior:** Beam trail stays visible, erased all at once at end

### Pattern 2: Thrown Weapons
From `src/zap.c:bhit()` and `src/dothrow.c:throwit()`

```c
// Initialize projectile display (DISP_FLASH)
tmp_at(DISP_FLASH, obj_to_glyph(obj));

// Animate through bhit()
while (range-- > 0) {
    x += dx;
    y += dy;
    
    if (weapon != ZAPPED_WAND && weapon != INVIS_BEAM) {
        tmp_at(x, y);        // Show projectile here
        nh_delay_output();   // Wait 50ms
    }
    
    // Check for collisions
}

// Cleanup
tmp_at(DISP_END, 0);
```

**Behavior:** Only current position visible (old position erased automatically)

### Pattern 3: Tethered Weapons (Aklys)
From `src/dothrow.c:throwit()`

```c
// Initialize with tether
tmp_at(DISP_TETHER, obj_to_glyph(obj));

// Outbound flight
while (range-- > 0) {
    tmp_at(x, y);
    nh_delay_output();
}

// Return flight with BACKTRACK mode
tmp_at(DISP_END, BACKTRACK);  // Animates return automatically
```

**Behavior:** Shows rope/tether connecting weapon to hero

### Pattern 4: Breaking Objects
From `src/dothrow.c:throwit()`

```c
// Flash at impact point
tmp_at(DISP_FLASH, obj_to_glyph(obj));
tmp_at(impact_x, impact_y);
nh_delay_output();            // 50ms flash
tmp_at(DISP_END, 0);
```

## Timing Details

### Standard Delay: 50ms
- Fast enough to feel responsive
- Slow enough to track visually
- Works well across different machine speeds

### Implementation Options

**Modern systems (TIMED_DELAY defined):**
```c
msleep(50);  // Actual sleep for 50 milliseconds
```

**Legacy systems (no TIMED_DELAY):**
- Terminal padding characters
- Repeated cursor movement commands
- Tuned to terminal baud rate (ospeed)

## Key Design Principles

1. **Consistent Timing**: Every square takes 50ms regardless of content
2. **Interruptible**: Player can see what's happening but game doesn't freeze
3. **Visual Persistence**: Beams leave trails, projectiles don't
4. **Mode-Based**: Different animation styles for different effects
5. **Cleanup Required**: Must call `tmp_at(DISP_END, 0)` to erase

## JavaScript Implementation Notes

For a JS port, you would:

1. **Use RequestAnimationFrame** for smooth 60fps updates
2. **Track elapsed time** to hit 50ms target per square
3. **Queue animations** to prevent blocking
4. **Handle cleanup** in Promise resolution or callback

Example approach:
```javascript
async function animateBeam(path, glyph) {
    for (let pos of path) {
        display.showTempGlyph(pos.x, pos.y, glyph);
        await sleep(50);  // 50ms delay
    }
    // Erase beam trail
    for (let pos of path) {
        display.redraw(pos.x, pos.y);
    }
}
```

## Performance Considerations

- **Range 7-13 squares**: Most projectiles travel ~10 squares
- **Total time ~500ms**: Half a second for typical throw
- **Non-blocking**: Game continues to respond during animation
- **Skippable**: Debug mode can disable delays entirely (`iflags.debug_fuzzer`)
