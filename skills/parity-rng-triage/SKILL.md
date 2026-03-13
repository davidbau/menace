---
name: parity-rng-triage
description: Use this skill when debugging C-vs-JS gameplay parity drift in session replay, especially first RNG/event/screen divergence localization and core-JS behavioral fixes.
---

# Parity RNG Triage

## When To Use
Use this for session parity failures where gameplay diverges between C and JS:
- RNG mismatch
- Event log mismatch
- Screen mismatch with matching RNG/events

## Inputs Expected
- Session path (`test/comparison/sessions/...`)
- Current branch/commit
- Latest failure output from `session_test_runner.js`

## Workflow
0. **Pull first** — other agents push frequently; start from current main:
   - `git pull --rebase origin main`
1. **Check issue labels** before diving into a session. Your agent label is
   determined by your working directory name (e.g. `mazesofmenace/ux` →
   `agent:ux`). Divergences in `dochug`/`monmove`/`makemon` are often labeled
   `agent:game` (game engine agent). Don't work on issues labeled for other
   agents — check the label matches your directory before starting.
2. **Survey all failing sessions** with the PES report (most informative view):
   - `scripts/run-and-report.sh` — runs all gameplay sessions, then shows a
     color-coded table of PRNG/Event/Screen first-divergence step per session.
     `--failures` filters to failing rows only. `--why` adds AI diagnosis labels.
     If this script is unavailable in your checkout, use:
     - `npm test`
     - `node scripts/pes-report.mjs`
   - `node scripts/pes-report.mjs` — instant replay of last results without re-running.
   - `npm test` — runs all test categories (unit/chargen/map/gameplay/special) and
     prints first-divergence JSON blobs for failing sessions. Note: `npm test` runs
     34 gameplay sessions; the pre-push hook runs all 150.
3. **Pick a session and reproduce** with verbose output:
   - `node test/comparison/session_test_runner.js --verbose <session-path>`
   - `node --test test/comparison/sessions.test.js` — runs the full session
     comparison suite and prints a pass/fail table with first-divergence JSON
     for each failing session. Faster feedback than `npm test` for gameplay-only
     iteration.
   - `node scripts/run-test-gates.mjs <seed>` — alternative: shows per-step
     failure details for a specific seed across all test categories.
4. If RNG diverges, localize first mismatch window:
   - `node test/comparison/rng_step_diff.js <session-path> --step <N> --window 8`
   - Note: `rng_step_diff.js` replays one step in isolation; use it as a
     microscope only. Treat `session_test_runner.js --verbose` as authoritative
     for true first divergence.
   - For render-side RNG visibility (hallucination glyph/name drift), enable
     display-stream logs with caller tags:
     - `RNG_LOG_DISP=1 RNG_LOG_DISP_CALLERS=1 RNG_LOG_TAGS=1 node test/comparison/session_test_runner.js --sessions=<session-path> --verbose`
     - Keep this diagnostic off by default; C sessions usually do not include
       display-stream RNG entries.
   - To capture C display-stream entries for apples-to-apples analysis, rerecord
     with:
     - `NETHACK_RNGLOG_DISP=1 python3 test/comparison/c-harness/rerecord.py <session.json>`
     - Use this only for diagnostic sessions (often in `/tmp`) unless you intend
       to update fixtures.
5. Capture rich state snapshots around divergence with debug mapdump:
   - `node test/comparison/dbgmapdump.js <session-path> --steps <N> --window 1`
   - Inspect with:
     - `diff -u step00NN_raw*.mapdump step00MM_raw*.mapdump`
     - `rg -n '^(U|A|M|N|K|J)' <mapdump-file>`
   - Use this when screen/RNG evidence is insufficient and you need direct
     monster/object/trap/hero state at exact replay steps.
6. Confirm expected behavior in C source:
   - Use `nethack-c/patched/src/` — this is the primary reference. It is
     `nethack-c/upstream/` plus all instrumentation patches (RNG logging,
     event tracing, harness hooks) that make session recording possible.
   - The ultimate goal is matching vanilla upstream NetHack behavior, but
     `patched/` is the measurable target: it's what generated the sessions.
7. Patch JS core behavior to match C semantics.
8. Re-run the same session, then a targeted set:
   - `node test/comparison/session_test_runner.js --verbose <session-path>`
   - `node test/comparison/session_test_runner.js --type gameplay --sessions=<seedA,...>`
9. Record durable learning in `docs/LORE.md`.

## Guardrails (Non-Negotiable)
- Do not add comparator exceptions/masking to hide mismatches.
- Do not add replay compensation logic in `js/replay_core.js`:
  - no synthetic queueing
  - no deferred/auto key injection
  - no auto-dismiss for prompts
  - no timing compensation that changes semantic input stream
- Do not "fix" parity by modifying session expectations to match JS output.
- Fix behavior in core JS game logic to match C.
- Do not overfit to one seed: before committing, validate the fix on at least
  1-2 additional nearby gameplay sessions.

## Quick Triage Heuristics
- If RNG diverges first: find the first branch/function-call mismatch and fix that root cause.
- If RNG/events match but screen diverges: inspect message timing/capture boundaries, animation boundaries, and display-state updates.
- If one step is short and the next step has a matching surplus in the same
  event families, treat it as **cross-step boundary drift** first:
  - Compare per-step counts with `node scripts/comparison-window.mjs <session> --step-summary --step-from <N> --step-to <M>`.
  - Confirm conservation by event family (for example, `test_move`, `movemon_turn`,
    `dog_*`, `runstep`) across adjacent steps.
  - If conserved, avoid changing gameplay logic first; adjust capture timing and
    rerecord with a targeted pause at the boundary key.
- If RNG/events match 100% but mapdump section M fails with mhp=0 entries on
  the session side: C's `fmon` list retains dead/failed monsters until
  `dmonsfree()`, which runs after `harness_auto_mapdump()`. This is a C harness
  artifact, not a game logic bug — filter mhp=0 from both lists before comparing.
- Prefer earliest shared drift signal over downstream cascades.
- For lower-overhead RNG logs during triage:
  - `RNG_LOG_PARENT=0` shortens caller tags.
  - `RNG_LOG_TAGS=0` disables caller tags entirely.
  - `RNG_LOG_DISP=1` logs JS display RNG calls as `~drn2(...)`.
  - `RNG_LOG_DISP_CALLERS=1` appends caller tags to `~drn2(...)` entries.

## Unit Tests
Run after any core JS change and after every `git pull`:
- `node scripts/test-unit-core.mjs` — fast unit-only run (~8s), clean pass/fail
  count. Prefer this over `npm test` during iteration.
- Upstream pulls sometimes rename fields (e.g. `flee→mflee`, `sleeping→msleeping`);
  unit tests that hardcode old field names will fail and need updating.

## Debug Mapdump Notes
- `dbgmapdump` captures replay-time compact mapdumps without mutating fixtures.
- For syntax and interpretation details, see `docs/DBGMAPDUMP_TOOL.md`.

## Rerecord Timing Advisory
- When capture timing needs to wait for C to finish a complex key (for example
  `_` travel confirmation at `.`), encode the pause in-session:
  - per-step: `steps[i].capture.key_delay_s`
  - or global regen override: `regen.key_delays_s` (1-based gameplay step map)
- Then rerecord via:
  - `python3 test/comparison/c-harness/rerecord.py <session.json>`
- Keep this for true capture-boundary timing only; do not use it to mask core
  gameplay logic mismatches.

## Done Criteria
- First divergence is eliminated or moved later with evidence.
- Target failing session is green or measurably improved.
- No harness/comparator/replay compensation hacks were introduced.
- `docs/LORE.md` updated with what changed and why.

## Caching Note
`analyze_golden.js` caches results keyed on commit hash. Results won't refresh
until you commit — if you need to see whether an uncommitted change affects
session results, use `node --test test/comparison/sessions.test.js` directly
(it always runs live against current code).

## Commit/Push Cadence
- Once a regression fix is verified (target session and relevant targeted checks), commit promptly.
- Push validated increments promptly to keep other agents synchronized.
- Do not leave validated fixes stranded locally for long-running batching.
- If push fails, resolve and retry until successful.
