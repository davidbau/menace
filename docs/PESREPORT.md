# PES Session Test Report

The **PES report** (PRNG / Event / Screen) shows per-session parity metrics
for all gameplay sessions.  For each session it reports the step at which
each channel first diverges from the C reference, expressed as `N/T` where
N = first-divergence step and T = total steps.

## Quick usage

```bash
# Instant — reads from the git note attached to HEAD (no tests needed)
node scripts/pes-report.mjs

# From a specific results file (e.g. oracle/pending.jsonl)
node scripts/pes-report.mjs oracle/pending.jsonl

# Include full AI TL;DR paragraphs below the table
node scripts/pes-report.mjs --diagnose

# Run ALL gameplay sessions first, then show the report
scripts/run-and-report.sh
```

## Columns

| Column   | Source field                     | Meaning |
|----------|----------------------------------|---------|
| **Steps**  | `metrics.screens.total`        | Total gameplay steps compared |
| **PRNG**   | `firstDivergences.rng.step`    | Step of first RNG call mismatch (JS vs C) |
| **Events** | `firstDivergences.event.step`  | Step of first structured-event mismatch |
| **Screen** | `firstDivergences.screen.step` | Step of first screen-content mismatch |

A `✓ N` cell means the channel matched 100% through all N steps.
A `✗ K/N` cell means the first divergence occurred at step K.

All three channels (PRNG, Events, Screen) must match 100% for a session to pass.

## Color coding

| Color  | Meaning |
|--------|---------|
| GREEN  | 100% — no divergence |
| YELLOW | ≥ 80% — diverges late (K/N ≥ 0.80) |
| (plain)| 26–79% |
| RED    | ≤ 25% — diverges early (K/N ≤ 0.25) |

## Data sources

Results come from the standard test-results git note on HEAD:

```
git notes --ref=test-results show HEAD
```

This note is written by `scripts/run-session-tests.sh` (which calls
`test/comparison/session_test_runner.js`) and is attached as a git note by
the pre-commit hook.

The per-session `firstDivergences` object is populated by
`test/comparison/session_test_runner.js` → `setFirstDivergence()`, with step
numbers computed in `test/comparison/comparator_policy.js` via:

- `approximateStepForRngIndex()` — maps RNG call index → step
- `stepForEventIndex()`           — maps event index → step
- screen divergence step is recorded directly (step index of the failing screen)

## Failure diagnoses

The report includes an AI-authored TL;DR for each known failure.  The diagnoses
live in the `DIAGNOSES` map in `scripts/pes-report.mjs`.  Each entry has:

```js
'seed103_caveman_selfplay200': {
    cat: 'category label',
    tldr: 'One-paragraph explanation of what JS and C are doing differently.',
}
```

The key is the session filename without `_gameplay.session.json`.

To add a diagnosis for a new failing session:

1. Run the report and note the session's key (printed as the TL;DR header).
2. Look at the `firstDivergence` entry in the results JSON for the `jsRaw`,
   `sessionRaw`, and `sessionStack` fields.
3. Add an entry to `DIAGNOSES` in `scripts/pes-report.mjs`.

## Typical workflow for parity work

### Step 1 — See current state instantly

```bash
node scripts/pes-report.mjs          # reads existing git note, ~0.1s
```

### Step 2 — Fix a bug, run the full gameplay suite

```bash
scripts/run-and-report.sh            # runs all gameplay sessions + PES report (~10 min)
```

Or run a single session for a quick check:

```bash
node test/comparison/session_test_runner.js \
     seed103_caveman_selfplay200_gameplay.session.json \
  | grep -A5 __RESULTS_JSON__
```

### Step 3 — Run full test suite and commit

```bash
npm test                             # full suite (unit + interface + gameplay)
git add -A && git commit -m "..."    # pre-commit hook attaches results as git note
```

### Step 4 — Read the latest note on the new commit

```bash
node scripts/pes-report.mjs          # now reads the freshly-attached note
```

## Known failure categories (as of 2026-03)

| Category                         | Sessions |
|----------------------------------|----------|
| pet-move / post-combat ordering  | seed103 |
| pet-move / dog_goal ordering     | seed203, seed204, seed208, seed212 |
| pet-move / use_defensive vs flee | seed5 |
| monster-move / apparent-position | seed108 |
| monster-throw / animation-timing | seed110 |
| monster-action / flee vs dig     | seed201 |
| monster-move / state-diverged    | seed210 |
| turn-end / dosounds ordering     | seed205 |
| zap / pet-move ordering          | seed209, seed6 |
| level-gen / sp_lev trap          | seed206 |
| level-gen / fill_zoo gas_cloud   | seed207 |
| level-gen / mineralize           | seed211 |
| tutorial / engrave + mcalcmove   | seed8 |

## Related documents

- `docs/COMPARISON_PIPELINE.md` — recorder/comparator architecture
- `docs/TESTING.md` — overall test strategy
- `docs/RNG_ALIGNMENT_GUIDE.md` — how to trace and fix RNG divergence
