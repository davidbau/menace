# Theme: furniture-thrones-fountains

Status: in_progress (sessions 2 captured and parity-green)

Target codepaths:
- `js/sit.js` (`dosit`, throne branches, seat-context branches)
- `js/fountain.js` (`drinkfountain`, `dipfountain`, `drinksink`, `dipsink`,
  `dryup`, spawn/loot side effects)
- supporting interactions in `js/kick.js` (furniture-adjacent outcomes)

Coverage baseline (2026-03-11 parity-session run):
- `sit.js`: 9.00% lines
- `fountain.js`: 11.22% lines

Session plan:
1. `theme01_seed005_valk_fountain-drink3_gameplay` (captured)
- Spawn near accessible fountain via wizard mode setup.
- Execute repeated `q`/`d` interaction with fountain:
  - drink while normal state (done)
  - dip at least two object classes (pending)
  - trigger at least one dry-up/loot-warning path (pending)
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

Checkpoint reconnaissance helper:
1. Use `node scripts/checkpoint_feature_scan.mjs <session.json> [checkpoint-id]`
   to list typ-value hotspots and sample coordinates before planning movement
   to fountains/sinks/room features.

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

Captured sessions:
1. `theme01_seed005_valk_fountain-drink3_gameplay.session.json`
2. `theme01_seed005_valk_fountain-gush3_gameplay.session.json`
