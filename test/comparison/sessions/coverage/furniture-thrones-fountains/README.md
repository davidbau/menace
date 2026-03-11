# Theme: furniture-thrones-fountains

Status: in_progress

Target codepaths:
- `js/sit.js` (`dosit`, throne branches, seat-context branches)
- `js/fountain.js` (`drinkfountain`, `dipfountain`, `drinksink`, `dipsink`,
  `dryup`, spawn/loot side effects)
- supporting interactions in `js/kick.js` (furniture-adjacent outcomes)

Coverage baseline (2026-03-11 parity-session run):
- `sit.js`: 9.00% lines
- `fountain.js`: 11.22% lines

Session plan:
1. `theme01_seed541_valk_fountain-drink-dip`
- Spawn near accessible fountain via wizard mode setup.
- Execute repeated `q`/`d` interaction with fountain:
  - drink while normal state
  - dip at least two object classes
  - trigger at least one dry-up/loot-warning path
2. `theme01_seed542_tourist_sink-and-kick`
- Reach/force sink cell and exercise:
  - `drinksink` path
  - `dipsink` path
  - nearby kick/furniture interaction branch
3. `theme01_seed543_knight_throne-sit-branches`
- Force throne context and execute `#sit` repeatedly until multiple throne
  outcomes are observed (good + bad branch families).

Determinism settings for recordings:
1. `NETHACK_FIXED_DATETIME=20000110090000`
2. `NETHACK_NO_DELAY=1`
3. Include raw keyspaces for `--More--` dismissal in session steps (no suppression).

Validation gates per session:
1. `node test/comparison/session_test_runner.js --no-parallel --sessions=<new-session>.session.json --verbose`
2. `./scripts/run-session-tests.sh` remains full-green after batch add.
3. Coverage rerun shows net gain in `sit.js` and/or `fountain.js`.

Issue links:
- Planning: https://github.com/davidbau/menace/issues/337
- Recording: https://github.com/davidbau/menace/issues/343
- Parity bring-up: https://github.com/davidbau/menace/issues/345
- Coverage verification: https://github.com/davidbau/menace/issues/342

Completion criteria:
1. Sessions recorded and committed.
2. New sessions parity-green.
3. Baseline parity remains green.
4. Coverage delta captured in docs/metrics snapshot and diff.
