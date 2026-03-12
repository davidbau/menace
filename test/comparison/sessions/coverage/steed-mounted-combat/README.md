# Theme: steed-mounted-combat

Status: active

Target codepaths:
- `js/steed.js`: `doride`, `dismount_steed`, `landing_spot`, mounted state transitions
- `js/mhitu.js`: mounted `mattacku` steed diversion branch (`rn2(is_orc ? 2 : 4)`)
- `js/mhitm.js`: mounted retaliation path via `mattackm`
- `js/allmain.js` + `js/hack.js`: mounted move budget (`u_calc_moveamt` + `u.umoved`)

Session plan:
1. `t03_s725_w_ride1_rs_gp` (accepted)
- exercise `#ride` mount + move + mounted combat + voluntary dismount in one deterministic path.
2. `t03_seed7xx_w_ride_thrown`
- force thrown/fell dismount path to cover `landing_spot(..., forceit=1)` and leg-damage messaging.
3. `t03_seed7xx_w_ride_speed`
- cover repeated mounted movement to exercise `u_calc_moveamt` mounted branch and steed speed budget transitions.
4. `t03_seed7xx_w_ride_retaliate2`
- drive repeated adjacent monster attacks while mounted to cover multiple steed-retaliation outcomes.

Accepted sessions:
1. `t03_s725_w_ride1_rs_gp.session.json`

Validation gates:
1. New session passes replay parity:
`node test/comparison/session_test_runner.js --no-parallel --sessions=<session> --verbose`
2. Default gameplay failures suite remains green after promotion:
`scripts/run-and-report.sh --failures`
3. Coverage refresh shows measurable gain in one or more of:
`js/steed.js`, `js/mhitu.js`, `js/mhitm.js`.

Issue links:
- Planning: https://github.com/davidbau/menace/issues/339
- Recording/parity/verification: tracked in #339 comments

Completion criteria:
1. Sessions recorded and committed.
2. New sessions parity-green.
3. Baseline parity remains green.
4. Coverage delta captured in docs/metrics snapshot and diff.
