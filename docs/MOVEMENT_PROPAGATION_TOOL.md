# Movement Propagation Tool

Purpose: localize how repeated movement state propagates across a gameplay-step
window without changing core code.

Tool:

```bash
node scripts/movement-propagation.mjs <session.json> --step-from <N> --step-to <M>
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

Manual-direct sessions:

- the tool uses the same comparison view as `session_test_runner`
- for `manual-direct-live`, chargen/setup is folded into startup via
  `applyManualDirectChargenView()`
- gameplay step numbers therefore match the authoritative parity view rather
  than the raw fixture step array

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
```

Useful flags:

- `--grep <REGEX>`
  - narrow printed entries to a specific family like `dog_goal`, `distfleeck`,
    `runstep`, `domove`, or `lookaround`
- `--all-rng`
  - print all step RNG/event entries instead of the movement-focused subset

Notes:

- this tool is diagnostic only; it does not change replay semantics
- it is intentionally JS-focused:
  - the C side comes from the recorded session entries already stored in the
    fixture
  - the JS side is generated live from replay plus trace instrumentation
- if the targeted window is large, prefer a narrow range first; the output is
  most useful on 1-5 gameplay steps
