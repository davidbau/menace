# Coverage Design: C-Parity Sessions

## Goal

Measure JS code coverage using only deterministic C-parity session replays, not
unit tests.

Coverage progress credit policy:
- Credit is awarded only for code executed by C-recorded parity sessions.
- Ordinary unit-test coverage does not count toward parity coverage goals.
- To raise this metric, add/improve C-recorded sessions that exercise real
  gameplay paths.

This coverage signal is intended to answer:
- "How much of the JS gameplay code is exercised by tests with C-grounded
  behavior expectations?"

It is explicitly **not** intended to measure:
- total project coverage from all tests,
- unit-test-only path coverage.

Phase 3 objective:
- reach and hold session-parity coverage north of 90%,
- while keeping parity green on the established baseline core sessions,
- and keeping newly added themed parity sessions green as they are introduced.

## Scope

Coverage input:
- `test/comparison/session_test_runner.js` session replay suite
- default filter: `--type=gameplay`
- optional: all session types (`--all-types`) or explicit `--type=...`

Coverage exclusions by design:
- `test:unit`
- other standalone script/test harnesses not executed through session replay

Authoritative discipline:
- use C-grounded session traces to exercise codepaths,
- do not inflate coverage using non-parity-only synthetic tests,
- fix JS behavior for divergences exposed by new sessions instead of masking.

## Runner

Script:
- [run-session-parity-coverage.sh](/share/u/davidbau/git/mazesofmenace/game/scripts/run-session-parity-coverage.sh)

NPM command:
- `npm run coverage:session-parity`
- `npm run coverage:session-parity:report`
- `npm run coverage:session-parity:snapshot`
- `npm run coverage:session-parity:diff -- --base <snapshot.json>`
- `npm run coverage:session-parity:refresh`

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

Useful options:
```bash
node scripts/session-parity-coverage-diff.mjs --base old.json --head new.json --top 30
node scripts/session-parity-coverage-diff.mjs --base old.json --json
node scripts/session-parity-coverage-diff.mjs --base old.json --show-zero
```

One-shot refresh (coverage + snapshot + report + diff-vs-previous):

```bash
npm run coverage:session-parity:refresh
```

## Metrics and Gates

Primary metrics:
- statement/branch/function/line coverage from parity sessions only
- per-file low-coverage ranking (gameplay-relevant files)
- parity pass/fail status for baseline and newly added themed sessions

Required gates for each themed batch:
1. baseline parity sessions remain green
2. new themed sessions are green
3. coverage snapshot improves or remains justified (with explicit rationale)
4. no comparator/harness masking used to hide gameplay mismatches

Campaign target:
- session-parity line coverage `>= 90%` with all parity suites green

## Targeted Session Checklist (Priority Order)

Use this checklist to create new deterministic parity sessions that raise
coverage where C-grounded exercise is currently sparse.

1. Furniture + throne/fountain/sink interactions
   - Primary files: `js/sit.js`, `js/fountain.js`, `js/kick.js`
   - Session goal: trigger multiple `#sit` outcomes, fountain/sink interactions, and furniture kicks.
   - Stop condition: at least 10 distinct interaction outcomes captured.

2. Locking + container + pickup flow
   - Primary files: `js/lock.js`, `js/pickup.js`, `js/do_wear.js`
   - Session goal: unlock/lock doors and boxes with multiple tools; mix pickup/drop/unpaid-like flows.
   - Stop condition: exercise door + container paths and at least two failure prompts.

3. Mount/steed behavior (wizard-assisted)
   - Primary files: `js/steed.js`
   - Session goal: mount, dismount, move mounted, and hit at least one forced dismount scenario.
   - Stop condition: session includes successful mount and dismount transitions.

4. Maze/mines topology and digging
   - Primary files: `js/mkmaze.js`, `js/mkmap.js`, `js/extralev.js`, `js/dig.js`
   - Session goal: traverse maze/mines branch transitions and perform multiple dig actions.
   - Stop condition: branch transition + at least three dig outcomes captured.

5. Shopkeeper economy stress
   - Primary files: `js/shk.js`, `js/pickup.js`, `js/steal.js`
   - Session goal: buy/sell/unpaid interactions, drop/take in shop, payment prompts.
   - Stop condition: at least one full purchase and one non-trivial unpaid resolution.

6. Spellbook/read/zap item effects
   - Primary files: `js/spell.js`, `js/read.js`, `js/potion.js`, `js/zap.js`
   - Session goal: read multiple scroll/spellbook types; cast/zap with directional and prompt paths.
   - Stop condition: at least one confusion-adjacent or failure branch plus one successful cast/zap branch.

7. Prayer + altar + conduct-sensitive behavior
   - Primary files: `js/pray.js`, `js/attrib.js`, `js/end.js`
   - Session goal: include timing-sensitive prayer outcomes and altar interaction paths.
   - Stop condition: at least one favorable and one unfavorable prayer-related outcome.

8. Monster AI + combat complexity
   - Primary files: `js/monmove.js`, `js/mhitu.js`, `js/mhitm.js`, `js/muse.js`
   - Session goal: sustained combat with pets/hostiles/traps/ranged actions in one run.
   - Stop condition: multiple monster behavior modes observed (move, attack, item/spell use).

9. Quest/special-level traversal by role
   - Primary files: `js/chargen.js`, `js/extralev.js`, `js/special_levels.js`
   - Session goal: role-specific branch entry and level transitions with quest/special hooks.
   - Stop condition: quest/special level transitions represented in replay.

10. Inventory/name/write long-form flow
   - Primary files: `js/invent.js`, `js/do_name.js`, `js/write.js`, `js/objnam.js`
   - Session goal: name objects/monsters, write/engrave flows, complex inventory menu operations.
   - Stop condition: at least one long prompt flow and one rename/write action chain.

## Theme Organization and Session Layout

Organize new sessions under a theme-based tree so progression is explicit and
auditable:

```text
test/comparison/sessions/
  coverage/
    furniture-thrones-fountains/
    locks-containers-pickup/
    steed-mounted-combat/
    maze-mines-digging/
    shops-economy/
    spells-reads-zaps/
    prayer-altars/
    monster-ai-combat/
    quest-special-levels/
    inventory-naming-writing/
```

Rules:
- each theme directory should include a short README describing target codepaths
  and completion criteria
- sessions should remain deterministic (seed, fixed datetime, canonical options)
- avoid blending many unrelated themes into one long session unless necessary
- prefer a few high-yield sessions per theme over many low-signal sessions

Recommended naming:
- `themeNN_seedXXX_<role>_<intent>.session.json`
- example: `theme04_seed512_valkyrie_digging-branch-transition.session.json`

## Coverage Campaign Plan (Theme-Driven)

1. Run parity-only coverage and produce the actionable low-coverage report.
2. Pick the top 1-2 under-covered themes/files with highest gameplay impact.
3. Record C sessions for that theme and add them under `sessions/coverage/<theme>/`.
4. Run parity suite for baseline + new theme sessions; fix JS parity divergences.
5. Refresh coverage snapshot and diff results.
6. Repeat until 90%+ coverage is reached and stable.

### Session Authoring Rules

- Keep sessions deterministic and replay-stable (seed + fixed datetime + canonical options).
- Prefer C-faithful behavior exercise over synthetic harness tricks.
- Validate new sessions with `npm run test:session` before using them for coverage deltas.
- After adding sessions, run:
  - `npm run coverage:session-parity:refresh`
  - inspect `coverage/session-parity-diff.txt`

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
