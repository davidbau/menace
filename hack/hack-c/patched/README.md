# Hack 1982 Patched C Harness

This directory contains a patched version of the 1982 Hack source code,
modified to produce deterministic JSON sessions for parity testing.

## Building

```bash
# Copy upstream source files first
cp ../upstream/*.c ../upstream/*.h .

# Build
make

# This produces: hack_harness
```

## Running a Session

```bash
python3 run_session.py --seed 42 --keys "hhhljj" --out ../../test/sessions/seed42.json
```

## Patches Applied

1. **Seed control**: `srand(getpid())` → `srand(seed_from_arg)`
2. **Input injection**: `getchar()` → reads from `--keys` argument
3. **Screen capture**: Terminal escape sequences parsed into 80×24 char buffer
4. **Level I/O**: File I/O replaced with in-memory buffers
5. **JSON output**: Each keystroke captures a screen frame → JSON

## Files

- `hack_patch.h` — All macro replacements and harness declarations
- `hack_harness.c` — Harness implementation (screen capture, RNG log, JSON output)
- `rng_log.c` — RNG call instrumentation
- `run_session.py` — Python wrapper for running sessions
- `rerecord.py` — Re-run sessions from regen metadata
- `*.c`, `*.h` — Patched copies of upstream source (to be added by `make setup`)
