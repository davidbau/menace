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
   - `git pull`
1. **Check issue labels** before diving into a session. Divergences in
   `dochug`/`monmove`/`makemon` are often labeled `agent:game` and owned by
   the game engine agent. `agent:mazes` issues are ours. Don't duplicate work.
2. **Survey all failing sessions** with the PES report (most informative view):
   - `scripts/run-and-report.sh` — runs all gameplay sessions, then shows a
     color-coded table of PRNG/Event/Screen first-divergence step per session.
     `--failures` filters to failing rows only. `--why` adds AI diagnosis labels.
   - `node scripts/pes-report.mjs` — instant replay of last results without re-running.
   - `npm test` — runs all test categories (unit/chargen/map/gameplay/special) and
     prints first-divergence JSON blobs for failing sessions. Note: `npm test` runs
     34 gameplay sessions; the pre-push hook runs all 150.
3. **Pick a session and reproduce** with verbose output:
   - `node test/comparison/session_test_runner.js --verbose <session-path>`
   - `node scripts/run-test-gates.mjs <seed>` — alternative: shows per-step
     failure details for a specific seed across all test categories.
4. If RNG diverges, localize first mismatch window:
   - `node test/comparison/rng_step_diff.js <session-path> --step <N> --window 8`
5. Confirm expected behavior in C source under `nethack-c/patched/src/`.
6. Patch JS core behavior to match C semantics.
7. Re-run the same session, then a targeted set:
   - `node test/comparison/session_test_runner.js --verbose <session-path>`
   - `node test/comparison/session_test_runner.js --type gameplay --sessions=<seedA,...>`
8. Record durable learning in `docs/LORE.md`.

## Guardrails (Non-Negotiable)
- Do not add comparator exceptions/masking to hide mismatches.
- Do not add replay compensation logic in `js/replay_core.js`:
  - no synthetic queueing
  - no deferred/auto key injection
  - no auto-dismiss for prompts
  - no timing compensation that changes semantic input stream
- Do not "fix" parity by modifying session expectations to match JS output.
- Fix behavior in core JS game logic to match C.

## Quick Triage Heuristics
- If RNG diverges first: find the first branch/function-call mismatch and fix that root cause.
- If RNG/events match but screen diverges: inspect message timing/capture boundaries, animation boundaries, and display-state updates.
- If RNG/events match 100% but mapdump section M fails with mhp=0 entries on
  the session side: C's `fmon` list retains dead/failed monsters until
  `dmonsfree()`, which runs after `harness_auto_mapdump()`. This is a C harness
  artifact, not a game logic bug — filter mhp=0 from both lists before comparing.
- Prefer earliest shared drift signal over downstream cascades.

## Done Criteria
- First divergence is eliminated or moved later with evidence.
- Target failing session is green or measurably improved.
- No harness/comparator/replay compensation hacks were introduced.
- `docs/LORE.md` updated with what changed and why.

## Commit/Push Cadence
- Once a regression fix is verified (target session and relevant targeted checks), commit promptly.
- Push validated increments promptly to keep other agents synchronized.
- Do not leave validated fixes stranded locally for long-running batching.
- If push fails, resolve and retry until successful.
