# Coverage Design: C-Parity Sessions

## Goal

Measure JS code coverage using only deterministic C-parity session replays, not
unit tests.

This coverage signal is intended to answer:
- "How much of the JS gameplay code is exercised by tests with C-grounded
  behavior expectations?"

It is explicitly **not** intended to measure:
- total project coverage from all tests,
- unit-test-only path coverage.

## Scope

Coverage input:
- `test/comparison/session_test_runner.js` session replay suite
- default filter: `--type=gameplay`
- optional: all session types (`--all-types`) or explicit `--type=...`

Coverage exclusions by design:
- `test:unit`
- other standalone script/test harnesses not executed through session replay

## Runner

Script:
- [run-session-parity-coverage.sh](/share/u/davidbau/git/mazesofmenace/game/scripts/run-session-parity-coverage.sh)

NPM command:
- `npm run coverage:session-parity`
- `npm run coverage:session-parity:report`
- `npm run coverage:session-parity:snapshot`
- `npm run coverage:session-parity:diff -- --base <snapshot.json>`

Behavior:
1. Runs `c8` against `node test/comparison/session_test_runner.js`.
2. Forces `--no-parallel` so coverage is collected in a single process path.
3. Applies `--type=gameplay` by default (unless overridden).
4. Writes HTML/text coverage report to `/coverage/`.
5. Applies the NetHack HTML theme used by existing hack/rogue coverage reports.

## Output

Primary artifact:
- `/coverage/index.html`
- `/coverage/coverage-summary.json`

Directory:
- `/coverage/` (repo root)

This is intentionally separate from:
- `hack/coverage/`
- `rogue/coverage/`

## Actionable Report

To list the lowest-covered gameplay-relevant JS files from session-parity
coverage:

```bash
npm run coverage:session-parity:report
```

Useful options:
```bash
node scripts/session-parity-coverage-report.mjs --top 40 --min-lines 100
node scripts/session-parity-coverage-report.mjs --include-levels --include-generated
node scripts/session-parity-coverage-report.mjs --json
```

## Snapshot + Diff Workflow

Create a diff-friendly snapshot in `docs/metrics`:

```bash
npm run coverage:session-parity:snapshot
```

Default output:
- `/docs/metrics/session_parity_coverage_latest.json`

Compare a previous snapshot against the latest:

```bash
npm run coverage:session-parity:diff -- --base docs/metrics/session_parity_coverage_prev.json
```

## Command Examples

Default gameplay-only parity coverage:
```bash
npm run coverage:session-parity
```

All parity session types:
```bash
bash scripts/run-session-parity-coverage.sh --text --all-types
```

Single session:
```bash
bash scripts/run-session-parity-coverage.sh --text --sessions=seed033_manual_direct.session.json
```

## Notes and Limits

- Coverage percentages are "executed by parity sessions," not a claim of full
  behavioral correctness.
- This report is best used alongside parity outcomes (`PRNG/events/screens`) as
  a guidance tool for where C-grounded scenarios are still sparse.
