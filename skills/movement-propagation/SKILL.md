---
name: movement-propagation
description: Use the movement-propagation tool to localize how run/rush/travel state and monster-turn ownership propagate across a gameplay-step window.
---

# Movement Propagation

Use this skill when a parity failure looks like a movement-bundle ownership or
continuation problem rather than a simple local logic bug.

## When To Use

- A session fails inside `run`, `rush`, `travel`, or repeated movement.
- JS and C appear to agree on total work but disagree about which gameplay step
  owns a movement/monster-turn slice.
- You need to inspect:
  - `ctx.run`
  - `ctx.mv`
  - `multi`
  - stored `dx` / `dy`
  - `lookaround()` stop/turn decisions
  - `runmode_delay_output` boundaries

## Tool

```bash
node scripts/movement-propagation.mjs <session.json> --step-from <N> --step-to <M>
```

## Core Workflow

1. Reproduce the failing session and identify the first bad gameplay step.

```bash
node test/comparison/session_test_runner.js --verbose <session.json>
```

2. Compare a narrow gameplay-step window around that step.

```bash
node scripts/movement-propagation.mjs <session.json> \
  --step-from <N-1> --step-to <N+1>
```

3. Read the output in this order:
- C movement-related step entries
- JS movement-related step entries
- JS `[RUN_TRACE]` lines

Manual-direct rule:
- trust the tool's step numbering, not the raw session JSON step array
- the tool uses the same comparison view as `session_test_runner`, so manual-
  direct chargen/setup steps are already folded out of the gameplay window

4. Ask the concrete ownership question:
- Is JS ending the command too early?
- Is JS continuing one step too long?
- Is JS computing the wrong next direction at a corner?
- Is later monster-turn work being attributed to the wrong key?

5. Only after the movement bundle is localized, inspect the specific code path:
- `js/hack.js`
- `js/allmain.js`
- `nethack-c/patched/src/hack.c`
- `nethack-c/patched/src/cmd.c`

## High-Signal Patterns

Run/rush window:

```bash
node scripts/movement-propagation.mjs \
  test/comparison/sessions/seed032_manual_direct.session.json \
  --step-from 89 --step-to 91
```

Filter to one family:

```bash
node scripts/movement-propagation.mjs <session.json> \
  --step-from <N> --step-to <M> \
  --grep 'runstep|distfleeck|dog_goal|runmode_delay_output'
```

Show all replay entries in the window:

```bash
node scripts/movement-propagation.mjs <session.json> \
  --step-from <N> --step-to <M> \
  --all-rng
```

## Interpretation Rules

- If C and JS match through most of a step and then JS stops early, prioritize
  continuation/termination logic over pet AI or combat detail.
- If the mismatch only appears after a corner turn, inspect:
  - `last_str_turn`
  - direction updates
  - `lookaround()` candidate selection
- If the same event families are conserved across adjacent steps, treat the bug
  as ownership/attribution before changing local gameplay logic.
- If there is no run-trace activity in the target window, this is probably not a
  run-ownership bug; switch to a different tool.

## Guardrails

- Do not add replay-core compensation.
- Do not add queue/continuation systems to repair movement timing.
- Preserve the C execution model:
  - single-threaded
  - one active input owner
  - movement and monster turns ordered as in C
- Fix the owning gameplay code, not the comparator.

## Related Docs

- `docs/MOVEMENT_PROPAGATION_TOOL.md`
- `skills/parity-rng-triage/SKILL.md`
- `docs/MAIN_GAMEPLAY_BLOCKERS_2026-03-18.md`
