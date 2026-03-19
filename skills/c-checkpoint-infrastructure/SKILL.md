# Skill: C Checkpoint Infrastructure for State Comparison

## Overview

The C NetHack binary has instrumentation that dumps full game state snapshots
to a JSONL file at specific points during gameplay. These checkpoints include
monster HP, object properties, terrain, hero stats, and context — enabling
direct JS-vs-C state comparison without modifying game behavior.

**Key principle**: Checkpoints are triggered silently by env variables. Do NOT
inject `#dumpsnap` extended commands during tracing — that changes UI state,
step boundaries, and can pollute game behavior.

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `NETHACK_DUMPSNAP=<file>` | **Required.** Output file for checkpoint JSONL entries | `NETHACK_DUMPSNAP=/tmp/ckpt.jsonl` |
| `NETHACK_DUMPSNAP_INPUT_EVERY=1` | Dump at every `nhgetch()` input (phase: `auto_inp_N`) | Set to `1` to enable |
| `NETHACK_DUMPSNAP_KEY_STEPS=N,M,...` | Dump at specific key indices in `readchar_core()` (phase: `auto_key_N`) | `NETHACK_DUMPSNAP_KEY_STEPS=240,261` |
| `NETHACK_DUMPSNAP_EVERY_KEY=1` | Dump at every `readchar_core()` call | Set to `1` to enable |
| `NETHACK_DUMPSNAP_STEPS=N` | Used by `capture_step_snapshot.py` to target a step | `NETHACK_DUMPSNAP_STEPS=37` |

## Checkpoint Contents

Each checkpoint is one JSON line appended to the `NETHACK_DUMPSNAP` file:

```json
{
  "phase": "auto_inp_261_key_100_getlin_0_moveloop_1",
  "rngCallCount": 10148,
  "dnum": 0, "dlevel": 1,
  "u_ux": 30, "u_uy": 6,
  "context": { "ident": ..., "run": 0, "travel": 0, ... },
  "flags": { "pickup": 1, ... },
  "typGrid": [[0,0,...], ...],
  "flagGrid": [[...], ...],
  "wallInfoGrid": [[...], ...],
  "traps": [{"x": 5, "y": 10, "ttyp": 3}, ...],
  "objects": [{"x": 29, "y": 5, "otyp": 372, "quan": 1, "cursed": 0}, ...],
  "monsters": [
    {
      "x": 29, "y": 5, "m_id": 96, "mnum": 160,
      "mhp": 4, "mpeaceful": 0, "movement": 12,
      "mtame": 0, "msleeping": 0, "mcanmove": 1,
      "minvcount": 0, "minvload": 0, "minvgold": 0,
      "mtrack": [{"x": 0, "y": 0}, ...],
      "minvent": []
    }
  ],
  "rooms": [...],
  "stairs": [...],
  "engravings": [...]
}
```

### Monster data (`monsters` array)
- `mnum`: monster index (PM_* constant, matches JS `mndx`)
- `mhp`: current hit points
- `m_id`: unique monster ID
- `mtame`, `mpeaceful`, `msleeping`, `mcanmove`: status flags
- `movement`: movement points
- `minvent`: inventory items with otyp/oclass/quan/owt/cursed
- `mtrack`: last 4 positions

### Hero data
- `u_ux`, `u_uy`: hero position
- `u_acurrstr`, `u_str`: strength values
- In `context`: `multi`, `umoved`, `run`, `travel`, `move`, `mv`, etc.

## Two Dump Trigger Points

### 1. TTY input layer (`nhgetch` in `wintty.c`, patch 007)
- Controlled by `NETHACK_DUMPSNAP_INPUT_EVERY=1`
- Phase tag: `auto_inp_<seq>_key_<keycode>_getlin_<0|1>_moveloop_<0|1>`
- `seq` is a monotonically increasing counter across ALL nhgetch calls
- Fires for every single key press including --More-- dismissals

### 2. Command layer (`readchar_core` in `cmd.c`, patch 022)
- Controlled by `NETHACK_DUMPSNAP_KEY_STEPS=N,M,...` or `NETHACK_DUMPSNAP_EVERY_KEY=1`
- Phase tag: `auto_key_<idx>_sym_<sym>_getlin_<0|1>_moveloop_<0|1>`
- `idx` is incremented per `readchar_core()` call (cmd-level, not raw TTY)
- Supports comma-separated lists and ranges: `240,255-265,278`

### 3. Level generation milestones (hardcoded)
- `after_map`, `after_wallification`, `after_finalize`, `after_level_init`, etc.
- Always fire during level generation regardless of env settings

## Using with `dbgmapdump.js`

The `dbgmapdump.js` tool wraps this infrastructure:

```bash
# JS-only capture (always works, uses game object directly)
node test/comparison/dbgmapdump.js sessions/seed033.session.json \
  --steps 240,255,261 --sections N,U

# JS + C capture (requires nethack-c binary)
node test/comparison/dbgmapdump.js sessions/seed033.session.json \
  --steps 240,255,261 --sections N,U --c-side
```

The `--c-side` flag uses `capture_step_snapshot.py` which:
1. Launches C nethack in a tmux session with checkpoint env vars
2. Replays keys up to the target step
3. Waits for the `auto_inp_N` checkpoint to appear
4. Reads the checkpoint JSON and converts to compact mapdump format

## Direct C Capture (without dbgmapdump.js)

```bash
python3 test/comparison/c-harness/capture_step_snapshot.py \
  test/comparison/sessions/seed033.session.json \
  260 \
  /tmp/step260_snapshot.json
```

Or run the C binary directly:

```bash
NETHACKDIR=/path/to/install \
NETHACK_SEED=33 \
NETHACK_DUMPSNAP=/tmp/checkpoints.jsonl \
NETHACK_DUMPSNAP_KEY_STEPS=240,255,261 \
NETHACK_RNGLOG=/tmp/rnglog.txt \
./nethack -u player -D
```

Then parse `/tmp/checkpoints.jsonl` — one JSON object per line, `phase` field
identifies which trigger point fired.

## Troubleshooting

### Phase mismatch errors
When `dbgmapdump.js --c-side` reports `phase-mismatch expected=auto_inp_261 got=after_map`:
- The `auto_inp` sequence counter in C doesn't match what `capture_step_snapshot.py` expects
- Usually caused by step numbering differences (C counts raw nhgetch calls; Python counts gameplay steps)
- Try using `NETHACK_DUMPSNAP_KEY_STEPS` instead (targets `readchar_core` in `cmd.c`, not raw TTY)
- Check `checkpointPhasesTail` in the output JSON for what phases were actually emitted

### Missing monster data (mons=0 in summary)
If `dbgmapdump.js` shows `mons=0` but the actual `.mapdump` file has data:
- The `mapdumpSignature()` function checks `parsed.monsters` (M section)
- But monster details are in `parsed.monsterDetails` (N section)
- When using `--sections N` without `M`, the summary shows `mons=0` even though data exists
- Check the actual `.mapdump` file directly for the real data

## Source Locations

- **C checkpoint dump**: `nethack-c/src/cmd.c` — `harness_dump_checkpoint()` function
- **TTY input trigger**: `nethack-c/win/tty/wintty.c` — `nh_keylog_event()` (patch 007)
- **Cmd layer trigger**: `nethack-c/src/cmd.c` — `harness_maybe_auto_key_dumpsnap()` (patch 022)
- **Python wrapper**: `test/comparison/c-harness/capture_step_snapshot.py`
- **JS wrapper**: `test/comparison/dbgmapdump.js`
- **Patches**: `test/comparison/c-harness/patches/007-keylog-input-tracing.patch`, `008-checkpoint-snapshots.patch`, `022-auto-key-dumpsnap.patch`
