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

Event search mode:

```bash
node scripts/movement-propagation.mjs <session.json> --event-find '<REGEX>'
```

What it does:

- replays the JS side of a gameplay session
- enables:
  - `WEBHACK_EVENT_RUNSTEP=1`
  - `WEBHACK_RUN_TRACE=1`
- when `--monmove-trace`, `--mon-id`, or `--mndx` is used, it also enables:
  - `WEBHACK_MONMOVE_TRACE=1`
  - `WEBHACK_MONMOVE_PHASE3_TRACE=1`
  - `WEBHACK_MFNDPOS_TRACE=1`
- when `--owner-trace` is used, it also enables:
  - `WEBHACK_DOGMOVE_TRACE=1`
  - `WEBHACK_RNDMON_OWNER_TRACE=1`
  - `WEBHACK_HMON_TRACE=1`
  - `WEBHACK_EXP_TRACE=1`
  - and passes `--mon-id` / `--mndx` through to the owner traces when set
- groups the JS replay back into gameplay steps
- prints, for each selected gameplay step:
  - movement-related C step entries from the recorded session
  - movement-related JS step entries from replay RNG/event output
  - JS `[RUN_TRACE]` lines for that same step window
  - optional JS `[MONMOVE_TRACE]` / `[MONMOVE_PHASE3]` lines for that same step
  - optional JS owner-local state lines for that same step:
    - `[DOGMOVE_TRACE]`
    - `[RNDMON_OWNER]`
    - `[HMON_TRACE]`
    - `[EXP_TRACE]`
  - the corresponding C raw key range for that same comparison-step bundle
  - the JS raw keys consumed for that same comparison-step bundle
- can also print a side-by-side raw replay window:
  - C raw key + top line from the recorded fixture
  - JS raw key + top line from live replay
  - optional first raw key mismatch at or after a chosen index
- can search the authoritative comparison-step view for a specific event family:
  - matching C entries
  - matching JS entries
  - the owning gameplay step and key

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

node scripts/movement-propagation.mjs \
  test/comparison/sessions/seed031_manual_direct.session.json \
  --event-find '^die\\['

node scripts/movement-propagation.mjs \
  test/comparison/sessions/seed031_manual_direct.session.json \
  --step-from 484 --step-to 484 \
  --mndx 44 --mon-id 196 --monmove-trace

node scripts/movement-propagation.mjs \
  test/comparison/sessions/seed031_manual_direct.session.json \
  --step-from 479 --step-to 479 \
  --owner-trace --mndx 32 \
  --grep 'candidate|choice|uncursed'

node scripts/movement-propagation.mjs \
  test/comparison/sessions/seed031_manual_direct.session.json \
  --step-from 488 --step-to 488 \
  --owner-trace \
  --grep 'death-owner|weight=|skip=|selected='
```

Useful flags:

- `--grep <REGEX>`
  - narrow printed entries to a specific family like `dog_goal`, `distfleeck`,
    `runstep`, `domove`, or `lookaround`
- `--all-rng`
  - print all step RNG/event entries instead of the movement-focused subset
- `--event-find <REGEX>`
  - search the comparison-step view for matching C/JS entries
  - useful when a newly exposed seam is known by event family but not yet by owner
- `--mon-id <N>`
  - restrict printed step entries and monmove traces to a specific monster id
- `--mndx <N>`
  - restrict printed step entries and monmove traces to a specific monster species index
- `--monmove-trace`
  - include JS `MONMOVE_TRACE` / `MONMOVE_PHASE3` lines and ordinary-monster
    `^mfndpos[...]` detail events
  - this also surfaces `mdig_tunnel-enter` / `mdig_tunnel-branch` lines with
    `id`, `mndx`, and `pos`, so `--mon-id` / `--mndx` filtering still works
    when the live seam passes through post-move digging logic
- `--owner-trace`
  - include owner-local state traces for the selected step window:
    - `[DOGMOVE_TRACE]`
    - `[RNDMON_OWNER]`
    - `[HMON_TRACE]`
    - `[EXP_TRACE]`
  - this is the high-signal mode when the first visible divergence is downstream
    of pet choice, random-monster selection, or thrown-hit kill ownership
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
- when a new seam is identified by event family rather than step-local motion,
  use `--event-find` first, then a narrow step window around the returned step
- owner traces are best used with a single step and either:
  - `--mon-id` / `--mndx` to narrow to one actor
  - or `--grep` to narrow to one owner subphase
- current owner-trace coverage:
  - `[DOGMOVE_TRACE]`
    - candidate ordering, candidate skips, `uncursedcnt`, and final pick
  - `[RNDMON_OWNER]`
    - difficulty/alignment context plus per-candidate inclusion, exclusion, and
      reservoir-selection rolls
  - `[HMON_TRACE]`
    - thrown-hit damage path, poison/death ownership, and final kill owner
  - `[EXP_TRACE]`
    - `more_experienced()` and `newexplevel()` ownership with caller, move
      count, and threshold state

Artifact note:

- event-step ownership now uses the same comparable-event filtering as
  `compareEvents()`
- this avoids stale first-event step reports when raw `^...` counts include
  ignorable events such as repaint-only entries

Companion tools:

- `node scripts/step-count-diff.mjs <session> --find-entry '<REGEX>'`
  - quick count-shift scan plus targeted event-family search
- `node scripts/step-boundary-context.mjs <session> --step <N>`
  - shows prompt/message/running state when ownership across a step boundary is suspected
- `node scripts/cell-trace.mjs <session> --row <R> --col <C>`
  - traces display-cell writers once gameplay state is aligned and the remaining seam is visual
