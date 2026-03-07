---
name: dbgmapdump-parity
description: Use dbgmapdump to localize C-vs-JS divergence state transitions around first mismatch steps, especially to isolate whether drift is hero, monster, object, trap, or terrain state.
---

# dbgmapdump Parity Triage

Use this skill when session parity has a first RNG/event/screen divergence and you need state-level localization.

## When To Use

- Session replay fails and first divergence step is known or can be inferred.
- You need to know *which state section changed first* (hero/monster/object/trap/terrain).
- RNG diffs alone are noisy and you need state snapshots around the boundary.

## Core Workflow

1. Find failing session and first divergence step.

```bash
./scripts/run-and-report.sh --failures
node test/comparison/session_test_runner.js --verbose <session.json>
```

2. Capture a tight step window and run adjacent transition diff.

```bash
node test/comparison/dbgmapdump.js <session.json> \
  --first-divergence --window 2 \
  --adjacent-diff \
  --sections U,A,M,N,O,Q,K,J,T,F,W
```

3. Inspect `index.json` for first changed transition and section.

```bash
jq '.adjacentComparisons[] | select(.ok==false)' <out-dir>/index.json
```

4. Map section to code path:
- `U/A`: hero movement/status/order timing
- `M/N`: monster movement/combat/AI
- `O/Q`: object creation/pickup/drop/resistance
- `K/J`: traps/visibility/placement
- `T/F/W`: terrain/flags/wall-info writes

5. Use RNG microscope only after state transition is localized.

```bash
node test/comparison/rng_step_diff.js <session.json> --step <N> --window 12
```

## High-Signal Command Patterns

Capture explicit range:

```bash
node test/comparison/dbgmapdump.js <session.json> --steps 45-49 --adjacent-diff
```

State subset only:

```bash
node test/comparison/dbgmapdump.js <session.json> --steps 150-170 \
  --sections U,M,N,O,Q,K,J --adjacent-diff
```

C-side snapshot comparison (secondary evidence):

```bash
node test/comparison/dbgmapdump.js <session.json> --steps 160-166 --c-side \
  --compare-sections M,N,O,Q,K,J,T,F,W
```

## Interpretation Rules

- If only one transition differs (for example `21 -> 22`) and one section leads (`M`), prioritize that callchain.
- If adjacent diffs are unchanged but RNG diverges, prioritize control-flow/order issues.
- If `U` diverges first, verify movement/attack sequencing before monster AI code.
- Treat `--c-side` as supportive evidence; rely on JS adjacent-diff + RNG/event traces as authoritative when C snapshots look globally offset.

## Guardrails

- Do not alter comparator/harness logic to hide divergence.
- Do not add replay-core compensations.
- Fix core gameplay logic in JS.
- Re-run at least:

```bash
./scripts/run-and-report.sh --failures
```

before committing.
