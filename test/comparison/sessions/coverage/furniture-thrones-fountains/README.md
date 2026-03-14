# Theme: furniture-thrones-fountains

Status: in_progress (sessions 9 captured and parity-green)

Target codepaths:
- `js/sit.js` (`dosit`, throne branches, seat-context branches)
- `js/fountain.js` (`drinkfountain`, `dipfountain`, `drinksink`, `dipsink`,
  `dryup`, spawn/loot side effects)
- supporting interactions in `js/kick.js` (furniture-adjacent outcomes)

Coverage baseline (2026-03-11 parity-session run):
- `sit.js`: 9.00% lines
- `fountain.js`: 11.22% lines

Session plan:
1. `t01_s005_v_fdrink3_gp` (captured)
- Spawn near accessible fountain via wizard mode setup.
- Execute repeated `q`/`d` interaction with fountain:
  - drink while normal state (done)
  - alternate drink branch ("cool draught refreshes you") (done)
  - dip at least two object classes (done)
  - trigger at least one dry-up/loot-warning path (pending)
2. `t01_s005_v_fdrink2r_gp` (captured)
- Same deterministic route to fountain, but ends after the second drink branch.
- Adds a parity-green capture of the refresh variant without entering the
  currently divergent dry-up/monster ordering window.
3. `t01_s005_v_frealdip1_gp` (captured)
- Exercises C-faithful `#dip` flow at a fountain:
  - `What do you want to dip? [..]`
  - object-specific fountain confirmation prompt
  - real `dipfountain` erosion result (`Your spear rusts!`)
4. `t01_s005_v_sit1_gp` (captured)
- Exercises C-faithful `#sit` extcmd flow on regular floor:
  - extcmd entry echo timing (`# s` → `# sit`) parity
  - `dosit()` base branch (`Having fun sitting on the floor?`)
5. `t01_s940_v_sinkmix2_gp` (captured)
- Extends a known-green seed940 exploration route to a reachable sink on Dlvl:1.
- Exercises:
  - sink terrain look text (`There is a sink here.`)
  - sink `#sit` branch (`You sit on the sink.  Your rump gets wet.`)
  - `drinksink` branch family, including:
    - awful-tasting water with `--More--`
    - warm water
    - ring discovery branch
  - `dipsink` carried-item erosion path with C-faithful `^place` event ordering
6. `theme01_seed543_knight_throne-sit-branches`
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
1. `t01_s005_v_fdrink3_gp.session.json`
2. `t01_s005_v_fgush3_gp.session.json`
3. `t01_s005_v_fdip2_gp.session.json`
4. `t01_s005_v_fdrink2r_gp.session.json`
5. `t01_s005_v_frealdip1_gp.session.json`
6. `t01_s005_v_sit1_gp.session.json`
7. `t01_s650_w_sit_gp.session.json`
8. `t01_s651_w_sit2_gp.session.json`
9. `t01_s940_v_sinkmix2_gp.session.json`

Current blockers:
1. Dry-up/monster follow-up branch from the seed5 fountain path currently
   enters a known gameplay divergence window (`distfleeck near/brave` family)
   before the branch can be kept parity-green as a fixture.
2. Throne-specific `#sit` coverage is still missing; the previously attempted
   deep-level seed543 setup immediately enters the known deep-level
   `distfleeck near/brave` divergence window before the throne interaction can
   be used as a green fixture.
