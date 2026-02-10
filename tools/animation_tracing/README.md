# Animation Tracing Instrumentation

This directory contains patches to instrument C NetHack for capturing animation traces.

## Files

- `display_instrumentation.patch` - Adds logging to `src/display.c:tmp_at()`
- `termcap_instrumentation.patch` - Adds logging to `win/tty/termcap.c:tty_delay_output()`
- `build_instrumented.sh` - Script to apply patches and build
- `clean_instrumentation.sh` - Script to revert patches

## Usage

### Build Instrumented NetHack

```bash
cd tools/animation_tracing
./build_instrumented.sh
```

This will:
1. Apply instrumentation patches to `nethack-c/`
2. Compile with `-DANIMATION_TRACE` flag
3. Create output directory `test/animations/traces/c/`

### Capture Animation Traces

```bash
cd nethack-c
./nethack -u TestPlayer -D

# In game, execute actions:
# - Throw dagger: t (direction)
# - Zap wand: z (select wand) (direction)
# - etc.

# Traces are auto-saved to test/animations/traces/c/anim_trace_*.json
```

### Clean Up

```bash
cd tools/animation_tracing
./clean_instrumentation.sh
```

## Trace Format

Each trace file contains:

```json
{
  "animation_events": [
    {
      "call": "tmp_at",
      "type": "init",
      "mode": -4,
      "glyph": 2456,
      "elapsed_ms": 0,
      "timestamp": 0
    },
    {
      "call": "tmp_at",
      "type": "display",
      "x": 41,
      "y": 11,
      "elapsed_ms": 0,
      "timestamp": 0
    },
    {
      "call": "delay_output",
      "elapsed_ms": 50,
      "timestamp": 50
    }
  ]
}
```

## Notes

- Patches use `#ifdef ANIMATION_TRACE` guards to keep changes minimal
- Timing uses `gettimeofday()` for millisecond precision
- Traces are flushed after each event for safety
- Output directory must exist before running instrumented nethack
