# Movement Propagation Tool

Purpose: localize how repeated movement state propagates across a gameplay-step
window without changing core code.

Tool:

```bash
node scripts/movement-propagation.mjs <session.json> --step-from <N> --step-to <M>
```

Raw-window mode:

```bash
node scripts/movement-propagation.mjs <session.json> --raw-from <N> --raw-to <M> --raw-find-mismatch
```

What it does:

- replays the JS side of a gameplay session
- enables:
  - `WEBHACK_EVENT_RUNSTEP=1`
  - `WEBHACK_RUN_TRACE=1`
- groups the JS replay back into gameplay steps
- prints, for each selected gameplay step:
  - movement-related C step entries from the recorded session
  - movement-related JS step entries from replay RNG/event output
  - JS `[RUN_TRACE]` lines for that same step window
  - the corresponding C raw key range for that same comparison-step bundle
  - the JS raw keys consumed for that same comparison-step bundle
- can also print a side-by-side raw replay window:
  - C raw key + top line from the recorded fixture
  - JS raw key + top line from live replay
  - optional first raw key mismatch at or after a chosen index

Manual-direct sessions:

- the tool uses the same comparison view as `session_test_runner`
- for `manual-direct-live`, chargen/setup is folded into startup via
  `applyManualDirectChargenView()`
- gameplay step numbers therefore match the authoritative parity view rather
  than the raw fixture step array
- raw-window mode is still valuable for manual-direct sessions when the hidden
  raw command stream matters:
  - the transformed gameplay view stays authoritative for parity sign-off
  - the raw window explains which hidden command bundle is actually drifting
  - do not compare arbitrary equal raw offsets after drift; raw-window output
    must be interpreted relative to a known comparison-step bundle

This is useful when debugging:

- `run` / `rush` ownership
- `ctx.run` / `ctx.mv` / `multi` propagation
- `dx` / `dy` direction updates
- `lookaround()` stop/turn decisions
- movement-bundle attribution bugs where JS and C disagree about which command
  owns a monster-turn slice

Examples:

```bash
node scripts/movement-propagation.mjs \
  test/comparison/sessions/seed032_manual_direct.session.json \
  --step-from 89 --step-to 91

node scripts/movement-propagation.mjs \
  test/comparison/sessions/seed031_manual_direct.session.json \
  --step-from 404 --step-to 407 --grep dog_goal

node scripts/movement-propagation.mjs \
  test/comparison/sessions/seed031_manual_direct.session.json \
  --raw-from 458 --raw-to 470 --raw-find-mismatch
```

Useful flags:

- `--grep <REGEX>`
  - narrow printed entries to a specific family like `dog_goal`, `distfleeck`,
    `runstep`, `domove`, or `lookaround`
- `--all-rng`
  - print all step RNG/event entries instead of the movement-focused subset
- `--raw-from <N> --raw-to <M>`
  - print a raw C-vs-JS replay window, useful when a manual-direct session has
    hidden raw command bundles inside one gameplay step
- `--raw-find-mismatch`
  - report the first raw key mismatch at or after `--raw-from`

Notes:

- this tool is diagnostic only; it does not change replay semantics
- default step-window mode is the safe mode:
  - it stays anchored on the authoritative comparison-step window
  - it also shows the C raw key range and JS raw keys for that same input bundle
- it is intentionally JS-focused:
  - the C side comes from the recorded session entries already stored in the
    fixture
  - the JS side is generated live from replay plus trace instrumentation
- if the targeted window is large, prefer a narrow range first; the output is
  most useful on 1-5 gameplay steps
- for raw-window work, start with 10-20 raw steps around the suspected seam;
  this is the quickest way to see whether JS is consuming later keys too early
