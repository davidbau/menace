# Checkpoint Snapshots for Special-Level Session Generation

This document specifies the checkpoint snapshot stream emitted by the C harness
and captured into generated special-level session JSON.

## Goal

Record deterministic generation checkpoints (indexed by RNG call count) so map
parity debugging can compare not only final `typGrid` but also intermediate
state at key phase boundaries.

## C Harness Emission

When `NETHACK_DUMPSNAP` is set, the C harness appends JSON lines (JSONL) to the
target file via `harness_dump_checkpoint(phase)`.

Each line is a single object with:

- `phase`: checkpoint tag string.
- `rngCallCount`: PRNG log call count at checkpoint time.
- `dnum`, `dlevel`: current dungeon coordinates.
- `typGrid`: `21 x 80` terrain type grid (`levl[x][y].typ`).
- `flagGrid`: `21 x 80` terrain flags grid (`levl[x][y].flags`).
- `wallInfoGrid`: `21 x 80` wall info grid (`levl[x][y].wall_info`).
- `traps`: list of `{x, y, ttyp}` in deterministic y/x scan order.
- `monsters`: list of `{x, y, mnum, mhp, mpeaceful}` in deterministic y/x scan.
- `nroom`: room count.
- `rooms`: room metadata (`lx,ly,hx,hy,rtype,orig_rtype,rlit,doorct,fdoor,irregular`).
- `doorindex`: active door count.
- `doors`: list of `{x, y}` for the first `doorindex` doors.
- `stairs`: list of stair records with destination dungeon coords.
- `updest`, `dndest`: destination region rectangles.

## Phase Hooks

Current automatic checkpoints in special-level generation:

- `after_level_init` (`lspo_level_init`)
- `after_map` (`lspo_map`)
- `after_levregions_fixup` (`fixup_special`)
- `after_wallification` (`lspo_finalize_level`, `load_special`)
- `after_finalize` (`lspo_finalize_level`, `load_special`)

Also available manually in wizard mode:

- `#dumpsnap` prompts for a phase tag and appends one snapshot.

## Session JSON Integration

`gen_special_sessions.py` sets `NETHACK_DUMPSNAP` and `NETHACK_RNGLOG` by default
for every run, attaching captured entries to each generated level object:

- `levels[i].checkpoints`: ordered list of checkpoint objects emitted during
  generation of that captured level. Each checkpoint includes `rngCallCount`
  for correlation with the RNG log.

Entries are sliced by JSONL line cursor between level captures, so each level
gets only newly appended checkpoints.

## Usage

```bash
# Regenerate all special-level sessions with checkpoints and RNG call counts
python3 -u test/comparison/c-harness/gen_special_sessions.py --all --seeds 1,42,100
```

No environment variables needed — checkpoints and RNG logging are enabled by default.
