# Debug Mapdump Tool

`dbgmapdump` captures compact mapdump snapshots at selected gameplay steps
during JS replay. It is designed for parity debugging when you need rich state
visibility exactly at or around a first divergence step.

## Command

```bash
node test/comparison/dbgmapdump.js <session.json> --steps <spec> [--window N] [--out-dir DIR]
```

Examples:

```bash
node test/comparison/dbgmapdump.js \
  test/comparison/sessions/seed032_manual_direct.session.json \
  --steps 89 \
  --window 1

node test/comparison/dbgmapdump.js \
  test/comparison/sessions/seed033_manual_direct.session.json \
  --steps 120-130,200
```

Step spec:
- Comma-separated indices and ranges (`89`, `88-92`, `88-92,140`).
- Steps are 1-based gameplay step indices (startup is not counted).

`--window N` expands each selected step to `step-N .. step+N`.

## Output

The tool writes files under `tmp/dbgmapdump/...` (or `--out-dir`):
- `stepXXXX_rawYYYY.mapdump` (compact mapdump payload)
- `index.json` (capture metadata and file list)

Mapdump payload format matches the compact checkpoint schema:
- Grid sections: `T/F/H/L/R/W`
- Vector sections: `U/A`
- Sparse sections: `O/Q/M/N/K/J`

## Typical Workflow

1. Find first divergence:
```bash
node test/comparison/session_test_runner.js --verbose <session.json>
```
2. Capture state around that step:
```bash
node test/comparison/dbgmapdump.js <session.json> --steps <first-step> --window 1
```
3. Inspect deltas:
```bash
diff -u <stepA.mapdump> <stepB.mapdump>
rg -n '^(U|A|M|N|K|J)' <step*.mapdump>
```

## Interpretation Tips

- If mapdumps are identical across divergence-adjacent steps, mismatch is
  likely ordering/control-flow/RNG-call alignment, not terrain/object mutation.
- `U`/`A` quickly tell whether hero position/timing state changed.
- `N`/`J` often expose monster/trap state transitions that are otherwise hard
  to infer from screen-only diffs.

## Scope

- This tool snapshots **JS replay** state only.
- It is intentionally diagnostic and does not alter comparator behavior or
  session fixtures.
