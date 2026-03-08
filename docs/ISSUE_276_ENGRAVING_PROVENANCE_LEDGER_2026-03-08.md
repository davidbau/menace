# Issue #276 Gate-1 Ledger: Engraving Provenance vs Wipe Event Drift

Date: 2026-03-08
Related issues: #276, #260, #213

## Problem statement
In `seed031_manual_direct` and `seed032_manual_direct`, first event mismatch is:
- JS: `^distfleeck[...]`
- C/session: `^wipe[x,y]`

At the same boundary:
- RNG parity is full
- screen parity is full for `seed031`

This indicates an event/state provenance gap (engravings/wipe path), not an RNG-order drift.

## Repro baseline
- `./scripts/run-and-report.sh --failures`
  - Stable baseline: `31/34` passing
  - Failing gameplay sessions: `seed031_manual_direct`, `seed032_manual_direct`, `seed033_manual_direct`

Target runs:
- `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed031_manual_direct.session.json`
- `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed032_manual_direct.session.json`

Engraving trace:
- `WEBHACK_ENGR_TRACE=1 node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed031_manual_direct.session.json`

Observed in trace:
- `wipe_engr_at(...)` is called at C-expected coordinates, but JS logs `engr=none` repeatedly.

## Current JS engraving creation inventory

`make_engr_at(...)` callsites:
- `js/dungeon.js`
  - ordinary-room graffiti path (`mark`)
  - grave creation path (`headstone`)
- `js/sp_lev.js`
  - special-level `des.engraving(...)`
- `js/mklev.js`
  - dust engraving generation around generation-side paths
- `js/zap.js`
  - wand engraving effects (`mark`)
- `js/engrave.js`
  - player engraving command / grave helper usage

Wipe paths:
- `js/monmove.js`: monster turn wipe (`wipe_engr_at(map, mon.mx, mon.my, 1)`)
- `js/allmain.js`: player-turn wipe (`wipe_engr_at(..., rnd(3), false)`)
- `js/engrave.js`: additional explicit wipe callsites

## Known non-solution
Attempted synthetic `^wipe` fallback emission in `dochug` when `engr=none`.
- Effect: broad event regressions (`2/34` passing)
- Outcome: reverted immediately

Conclusion: do not synthesize wipe events; fix engraving provenance.

## Hypothesis space (ordered)
1. Missing engraving creation from one or more level-gen/theming paths in JS.
2. Engraving coordinate/state placement mismatch (present but not discoverable by `wipe_engr_at` lookup).
3. C session captures wipe markers from engraving sources not currently represented in JS map state.

## Gate-1 outputs required before code edits
- Build a per-source ledger for engraving creation in JS startup path for seed031/032:
  - source path, trigger condition, coordinate policy, type, wipeability (`nowipeout`), and event emission behavior.
- Verify whether early-level themed generation path can create wipeable engravings at monster-heavy coordinates where C logs `^wipe`.
- Identify first missing creation source with concrete step/callsite evidence.

## Edit guardrails
- No comparator masking.
- No replay_core event synthesis.
- No synthetic wipe emission to chase event order.
- Keep RNG parity unchanged in target seeds while moving event frontier later.
