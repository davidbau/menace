# Selfplay C Strategy Notes (2026-02-13)

## Goal
Improve progression on C NetHack using held-out aggregate metrics, not JS-only signals.

## Held-Out Baseline (C, 600 turns)
Seeds: `2,5,10,50,200,1000,2000,3000,5000,7000`

- Mean depth: `1.4`
- Median depth: `1.0`
- Dlvl 2+: `4/10`
- Dlvl 3+: `0/10`
- Deaths: `1/10`

## What Failed (Reverted)
- Earlier/lower-threshold door-priority adjustments.
- Frontier-loop-only tuning without fixing root stall cause.

These changed behavior but did not improve held-out aggregate.

## Root Cause Found
On C, some Dlvl 1 seeds were spending hundreds of turns in secret-search candidate navigation (`heading to search candidate`) even though secret-door searching is intended for deeper levels.

Example symptom (seed 42):
- Turn ~200 to 600: repeatedly navigating search candidates on Dlvl 1.
- No downstairs found, no depth progress.

## Fix Kept
In `selfplay/agent.js`, gate secret-search candidate flows to Dlvl 3+:
- Opportunistic wall-search candidate routing now requires `currentDepth > 2`.
- Systematic search-candidate mode now requires `currentDepth > 2`.

## Result (Held-Out, C, 600 turns, confirmed twice)
- Mean depth: `1.5` (up from `1.4`)
- Median depth: `1.5` (up from `1.0`)
- Dlvl 2+: `5/10` (up from `4/10`)
- Dlvl 3+: `0/10` (unchanged)
- Deaths: `0/10` (improved from `1/10`)

## Next Strategy
1. Keep C-first validation loop: dev seeds -> held-out aggregate.
2. Focus next on early Dlvl 1 survival/escape against canine/reptile threats.
3. Improve downstairs discovery on shallow levels without triggering secret-search behavior.

## Update: Dlvl2 Retreat Loop Fix (2026-02-13, later session)

### Additional Root Cause
On some C seeds, once on Dlvl2 the agent would hit `levelStuckCounter > 50` and ascend back to Dlvl1 before exhausting reachable frontier. This created a Dlvl1<->Dlvl2 loop and blocked Dlvl3 progression.

Also, abandoned-level bookkeeping was being re-marked every turn, resetting cooldown repeatedly and creating prolonged "skip descent" loops.

### Fixes Kept
In `selfplay/agent.js`:
- Restrict the `stuck > 50` "give up and ascend" fallback from `currentDepth > 1` to `currentDepth > 2`, so Dlvl2 keeps exploring for downstairs instead of prematurely retreating.
- Guard abandoned-level marking with `if (!this.abandonedLevels.has(currentDepth))` so cooldown timestamps are not continuously reset.

### Held-Out Validation (C, 600 turns, 10 seeds)
Same held-out seeds: `2,5,10,50,200,1000,2000,3000,5000,7000`

Previous best baseline:
- Mean depth: `1.5`
- Median depth: `1.5`
- Dlvl 2+: `5/10`
- Dlvl 3+: `0/10`
- Deaths: `0/10`

After these fixes:
- Mean depth: `1.6`
- Median depth: `1.5`
- Dlvl 2+: `5/10`
- Dlvl 3+: `1/10`
- Deaths: `0/10`
- Abandon marks: reduced from noisy triple-digit intermediate behavior to `3` in held-out run

### Longer-Horizon Spot Check (C, 2000 turns)
Representative seeds:
- Seed `2`: depth `3`, survived
- Seed `1000`: depth `2`, survived
- Seed `3000`: depth `4`, survived

Interpretation:
- This is a real progression improvement (first held-out Dlvl3 breakthrough and higher mean depth) without survival regression.
