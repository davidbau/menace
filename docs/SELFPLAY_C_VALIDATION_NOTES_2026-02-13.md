# Selfplay C Validation Notes (2026-02-13)

## Summary
- We confirmed that meaningful agent evaluation must be done against the C NetHack runner (`selfplay/runner/c_runner.js`), not only JS headless runs.
- We fixed a runner/harness stability issue and a command-path bug, then validated C baseline metrics.

## Validated Fixes
- `selfplay/runner/headless_runner.js`
  - Added delayed prompt-rescue input fallback in `HeadlessAdapter.sendKey` to prevent deadlocks under suppressed-output automation.
- `js/commands.js`
  - Fixed kick handling path to pass `game` into `handleKick(...)` so `game.flags.verbose` access is valid.

Note: When replaying onto current `main`, the `js/commands.js` kick-context fix was already present upstream; only the headless-runner delta remained to apply.

## C Held-Out Baseline (600 turns)
Seeds: `2,5,10,50,200,1000,2000,3000,5000,7000`

Observed aggregate:
- Mean max depth: `1.4`
- Median max depth: `1`
- Dlvl 2+: `40%` (4/10)
- Dlvl 3+: `0%` (0/10)
- Death rate: `10%` (1/10)

## Candidate Policy Changes Tried (and reverted)
All candidates below were tested on C development seeds and then held-out where appropriate. None improved held-out aggregate metrics, so they were reverted:
- Prioritize door handling before systematic frontier sweeps when stuck.
- Restrict systematic frontier sweeping to deeper levels only.

## Process Notes
- Continue using dev-seed tuning first, then held-out aggregate check.
- Keep strict acceptance rule: no commit of agent policy changes unless held-out average improves.
