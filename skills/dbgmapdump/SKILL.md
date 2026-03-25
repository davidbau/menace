---
name: dbgmapdump
description: Use dbgmapdump to capture and compare full game state snapshots (monsters, objects, hero, terrain, traps) at specific replay steps, diagnosing hidden variable divergences between C and JS.
---

# dbgmapdump — State Snapshot Diagnosis

## When To Use

- RNG entries match per-step but game outcomes differ (e.g., a monster
  dies in JS but survives in C with the same damage roll)
- Session parity fails and you need to know *which state section changed
  first* (hero/monster/object/trap/terrain)
- RNG diffs alone are noisy and you need concrete state around the boundary

## What It Captures

`dbgmapdump` captures a **full snapshot of game state** at any replay step:

| Section | Content | Key Use |
|---------|---------|---------|
| **N** | Monster details: id, x, y, mndx, **HP, maxHP**, tame, peaceful | Track when monster HP diverges |
| **M** | Monster positions (sparse) | Compare monster positions JS vs C |
| **O** | Floor objects (sparse) | See which objects are where |
| **Q** | Object details: otyp, quan, **owt**, cursed, blessed | Check object properties |
| **U** | Hero vector: position, HP, attributes, **Luck** | Verify player stats match |
| **A** | Hero attributes (detailed) | STR, DEX, CON, etc. |
| **C** | Context: moves counter, dungeon level | Check turn counters |
| **T** | Terrain grid (typGrid) | Verify map layout |
| **F** | Flags grid | Room/corridor/lit flags |
| **W** | Wall info grid | Wall type bits |
| **K/J** | Traps with details | Trap visibility/placement |

## Core Workflow

### 1. Find the divergence step

```bash
node test/comparison/session_test_runner.js --verbose <session.json>
```

### 2. Capture state around the divergence

```bash
node test/comparison/dbgmapdump.js <session.json> \
  --steps 245,250,255,260 \
  --sections N,O,U
```

### 3. Use adjacent-diff to isolate the transition

```bash
node test/comparison/dbgmapdump.js <session.json> \
  --first-divergence --window 2 \
  --adjacent-diff \
  --sections U,A,M,N,O,Q,K,J,T,F,W
```

Inspect `index.json` for first changed section:

```bash
jq '.adjacentComparisons[] | select(.ok==false)' <out-dir>/index.json
```

### 4. Map section to code path

- `U/A`: hero movement/status/order timing
- `M/N`: monster movement/combat/AI
- `O/Q`: object creation/pickup/drop/resistance
- `K/J`: traps/visibility/placement
- `T/F/W`: terrain/flags/wall-info writes

### 5. Compare with C (when checkpoints available)

```bash
node test/comparison/dbgmapdump.js <session.json> \
  --steps 245,260 --sections N,O,U --c-side
```

### 6. Use RNG microscope only after state is localized

```bash
node test/comparison/rng_step_diff.js <session.json> --step <N> --window 12
```

## C Checkpoint Infrastructure

The C binary dumps state snapshots via environment variables:

| Variable | Purpose |
|----------|---------|
| `NETHACK_DUMPSNAP=<file>` | Output JSONL file for checkpoints |
| `NETHACK_DUMPSNAP_KEY_STEPS=N,M,...` | Dump at specific key indices |
| `NETHACK_DUMPSNAP_EVERY_KEY=1` | Dump at every readchar_core() |
| `NETHACK_DUMPSNAP_INPUT_EVERY=1` | Dump at every nhgetch() |

Two trigger points:
1. **TTY input layer** (`wintty.c` patch 007) — phase `auto_inp_<seq>`
2. **Command layer** (`cmd.c` patch 022) — phase `auto_key_<idx>`

Direct C capture: `python3 test/comparison/c-harness/capture_step_snapshot.py <session.json> <step> <output.json>`

## Monster Detail Format (N section)

`N<id>,<x>,<y>,<mndx>,<hp>,<maxhp>,...`

Example timeline:
```
Step 245: N96,29,5,160,7,8  → HP=7/8
Step 255: N96,29,5,160,4,8  → HP=4/8 (3 damage)
Step 261: (gone)             → killed
```

## Interpretation Rules

- If only one transition differs and one section leads, prioritize that callchain
- If adjacent diffs are unchanged but RNG diverges, prioritize control-flow/order issues
- If `U` diverges first, verify movement/attack sequencing before monster AI
- Treat `--c-side` as supportive; rely on JS adjacent-diff + RNG traces as authoritative
- Filter `mhp=0` from both lists (C retains dead monsters until `dmonsfree()`)

## Practical Tips

- `--sections N` for monster-only (fast)
- `--sections O,Q` for floor objects with details
- `--steps` with comma-separated or range (e.g., `245-260`)
- JS capture works at ANY step; C requires pre-recorded checkpoints
- Monster HP is field 5 (0-indexed 4) in N section
