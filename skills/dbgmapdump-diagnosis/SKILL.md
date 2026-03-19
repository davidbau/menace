# Skill: Using dbgmapdump to Diagnose Hidden State Divergences

## When to Use

When RNG entries match per-step but game outcomes differ (e.g., a monster
dies in JS but survives in C with the same damage roll), the root cause is
a **hidden variable** like monster HP, player stats, or object properties
that diverged at an earlier step. Use `dbgmapdump` to inspect these.

## Key Capability

`dbgmapdump` captures a **full snapshot of game state** at any gameplay
step during JS replay. The snapshot includes:

| Section | Content | Key Use |
|---------|---------|---------|
| **N** | Monster details: id, x, y, mndx, **HP, maxHP**, tame, peaceful, etc. | Track when monster HP diverges |
| **M** | Monster positions (sparse) | Compare monster positions JS vs C |
| **O** | Floor objects (sparse) | See which objects are where (pet AI depends on this) |
| **Q** | Object details: otyp, quan, **owt**, cursed, blessed, etc. | Check object properties |
| **U** | Hero vector: position, HP, attributes, **Luck**, etc. | Verify player stats match |
| **C** | Context: moves counter, dungeon level, etc. | Check turn counters |
| **T** | Terrain grid (typGrid) | Verify map layout |

## Workflow

### 1. Identify the step where outcomes diverge

Use `step-count-diff` to find the step. Then check: do the RNG VALUES
match but game outcomes differ? If so, a hidden variable has diverged.

### 2. Capture JS state at key steps

```bash
node test/comparison/dbgmapdump.js <session.json> \
  --steps 245,250,255,260 \
  --sections N,O,U
```

### 3. Read monster HP timeline

Monster detail format (N section):
`N<id>,<x>,<y>,<mndx>,<hp>,<maxhp>,...`

Example timeline:
```
Step 245: N96,29,5,160,7,8  → HP=7/8 (took 1 damage)
Step 255: N96,29,5,160,4,8  → HP=4/8 (3 more damage)
Step 260: N96,29,5,160,2,8  → HP=2/8 (1 more damage)
Step 261: (monster gone)     → killed (rnd(2)=2)
```

### 4. Compare with C (when checkpoints available)

```bash
node test/comparison/dbgmapdump.js <session.json> \
  --steps 245,260 \
  --sections N,O,U \
  --c-side
```

If C checkpoints aren't available at those steps, use the C session's
existing checkpoints:
```bash
# Find available C checkpoints
grep 'checkpointId' <session.json> | head
```

### 5. Diagnose the divergence source

If monster HP differs, work backwards:
- Same damage rolls → different `tmp` in hit calculation → check Luck,
  find_mac, uhitinc, ulevel
- Different damage rolls → RNG shifted earlier → check step-count-diff
  for earlier mismatches
- Monster at different position → object/monster position divergence
  from earlier monster movement parity gaps

## What This Reveals That RNG Traces Don't

RNG traces show WHAT random numbers were consumed and by which functions.
But they don't show:

- **Monster HP** at each step (crucial for determining if a hit kills)
- **Floor object distribution** (determines how many obj_resists calls
  the pet AI makes)
- **Player stats** (Luck, STR, etc. affect hit/damage calculations)
- **Monster positions** (affect pet search range and movement decisions)

`dbgmapdump` surfaces all of these as concrete numbers that can be
compared step-by-step.

## Practical Tips

- Use `--sections N` for monster-only snapshots (fast, small output)
- Use `--sections O,Q` for floor objects with details
- Use `--steps` with comma-separated values for a timeline
- The JS capture works at ANY step; C capture requires pre-recorded
  checkpoints in the session file
- Monster HP is field 5 (0-indexed field 4) in the N section
