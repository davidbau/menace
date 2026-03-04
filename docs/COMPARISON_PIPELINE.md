# Recorder/Comparator Pipeline

> Active campaign context: [Operation Crystal Replay](CRYSTAL_REPLAY_CAMPAIGN.md)
> is the current parity strategy for replay/session evidence hardening.

This project now treats session parity as a two-phase pipeline:

1. **Recorder phase**: run JS from captured C inputs and record raw JS outputs.
2. **Comparator phase**: compare the raw JS recording to the C session with policy-controlled rules.

This separation keeps replay/runtime execution free of comparison heuristics.

## Why This Split Exists

`replay_core` should only execute game logic and capture what happened.
It should not decide whether sparse boundary shifts are acceptable.

Sparse/special boundary tolerance belongs in comparator policy code, where
matching rules can evolve without changing runtime behavior.

## Modules

### Recorder

- [`test/comparison/session_recorder.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/session_recorder.js)
  - `recordGameplaySessionFromInputs(session, opts?)`
  - `buildGameplayReplayFlags(session)`

Recorder output is a raw replay trace (startup + steps with RNG/screen data).

### Comparator

- [`test/comparison/session_comparator.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/session_comparator.js)
  - `compareRecordedGameplaySession(session, replay, options?)`

This orchestrates result metrics (`rng/screen/color/event`) from recorded trace
vs C session data.

### Comparator Policy

- [`test/comparison/comparator_policy.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/comparator_policy.js)
  - `createGameplayComparatorPolicy(session, options?)`

Policy owns comparison behavior for:
- RNG stream comparison and divergence step attribution
- step-level screen comparison normalization
- color comparison
- event comparison

If sparse-boundary allowances are needed, implement them in policy methods.

## Tooling Entry Points

### Main parity gate

- `npm test`
- Runs [`scripts/run-test-gates.mjs`](/share/u/davidbau/git/mazesofmenace/mazes/scripts/run-test-gates.mjs)
- Uses [`test/comparison/session_test_runner.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/session_test_runner.js)

### Session runner

- [`test/comparison/session_test_runner.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/session_test_runner.js)
- Gameplay flow is explicitly:
  1. recorder (`recordGameplaySessionFromInputs`)
  2. comparator (`compareRecordedGameplaySession`)

By default, session runs now also emit merged `.comparison.json` artifacts under:

- `tmp/session-comparisons/<run-id>/`
- latest run pointer: `tmp/session-comparisons/LATEST`

Each artifact contains:
- C session + JS replay merged channel data
- normalized RNG/event streams + raw index maps
- first-divergence metadata

This makes repeated divergence inspection cheap without regenerating traces.

### Single-session debug replay

- [`test/comparison/test_session_replay.js`](/share/u/davidbau/git/mazesofmenace/mazes/test/comparison/test_session_replay.js)
- Useful for targeted per-session inspection.

### Replay dump CLI

- [`scripts/dump-js-replay.mjs`](/share/u/davidbau/git/mazesofmenace/mazes/scripts/dump-js-replay.mjs)
- Dump a JS replay trace JSON from a C session capture.

```bash
npm run replay:dump -- test/comparison/sessions/seed208_ranger_wizard_gameplay.session.json --out /tmp/seed208.js-replay.json
```

### Session compare CLI

- [`scripts/compare-sessions.mjs`](/share/u/davidbau/git/mazesofmenace/mazes/scripts/compare-sessions.mjs)
- Compare C session vs JS replay file (or generate replay on the fly).

```bash
# Compare against generated replay
npm run session:compare -- test/comparison/sessions/seed208_ranger_wizard_gameplay.session.json

# Compare against previously dumped replay
npm run session:compare -- test/comparison/sessions/seed208_ranger_wizard_gameplay.session.json --js /tmp/seed208.js-replay.json --json
```

### Comparison window CLI

- [`scripts/comparison-window.mjs`](/share/u/davidbau/git/mazesofmenace/game/scripts/comparison-window.mjs)
- Inspect windows from `.comparison.json` in the latest artifacts directory.

```bash
# list latest run artifacts
node scripts/comparison-window.mjs --list

# show default (first-divergence) RNG window for a specific session
node scripts/comparison-window.mjs seed208_ranger_wizard_gameplay.session.json --channel rng --window 6

# inspect event channel at explicit normalized index
node scripts/comparison-window.mjs seed208_ranger_wizard_gameplay.session.json --channel event --index 623 --window 4
```

## Implementation Rule

When parity disagreements involve step-boundary interpretation, do **not** patch
runtime execution to force a match. Add or adjust comparator policy instead.
