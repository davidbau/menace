# Debug Mapdump Tool

`dbgmapdump` captures compact mapdump snapshots at selected gameplay steps
and can compare them against peer mapdumps (including optional C-side
snapshots). It is intended for parity debugging around first divergence.

## Command

```bash
node test/comparison/dbgmapdump.js <session.json> (--steps <spec> | --first-divergence) [options]
```

Use built-in help for the authoritative flag list:

```bash
node test/comparison/dbgmapdump.js --help
```

## Key Options

- `--steps <spec>`: gameplay step selector (`89`, `88-92`, `88-92,140`)
- `--first-divergence`: auto-pick first divergence step (RNG, then event, then screen)
- `--window <N>`: expand selected steps by `+/- N`
- `--sections <list>`: restrict written sections (`T,F,H,L,R,W,U,A,O,Q,M,N,K,J,E`)
- `--context <N>`: include RNG/event context around each captured raw replay step
- `--adjacent-diff`: compare each captured JS step to the previous captured JS step
- `--c-side`: also capture C-side snapshots via `capture_step_snapshot.py`
- `--compare <DIR>`: compare JS captures against mapdumps in `DIR`
- `--compare-sections <list>`: section set used by compare

## Output Layout

`--out-dir` defaults to `tmp/dbgmapdump/<session>_<timestamp>`.

- `<out-dir>/index.json`: summary, signatures, context, compare details
- `<out-dir>/replay_keys.json`: normalized replay key stream used for JS/C alignment
- `<out-dir>/js/stepNNNN.mapdump`: JS compact mapdump per selected step
- `<out-dir>/c/stepNNNN.mapdump`: C-derived compact mapdump (with `--c-side`)
- `<out-dir>/c/stepNNNN.snapshot.json`: raw C checkpoint JSON (with `--c-side`)

## Typical Workflows

1. Capture around first divergence:

```bash
node test/comparison/dbgmapdump.js \
  test/comparison/sessions/seed033_manual_direct.session.json \
  --first-divergence --window 1 --adjacent-diff
```

2. Capture JS and C snapshots, then compare:

```bash
node test/comparison/dbgmapdump.js \
  test/comparison/sessions/seed031_manual_direct.session.json \
  --steps 164-167 --c-side --compare-sections M,N,O,Q,K,J,E,T,F,W
```

3. Focus only on a subset of state sections:

```bash
node test/comparison/dbgmapdump.js \
  test/comparison/sessions/seed032_manual_direct.session.json \
  --steps 20-24 --sections T,F,W,U,M,N --adjacent-diff
```

## Notes

- Step indices are gameplay/session steps (1-based), not raw replay key indices.
- The tool is diagnostic only; it does not modify fixtures or comparator logic.
- C-side capture uses session-aligned fixed datetime for determinism.
- `E` (engraving) is emitted for C-side only when the C snapshot includes
  engraving records; absent `E` means unavailable data, not necessarily zero.
