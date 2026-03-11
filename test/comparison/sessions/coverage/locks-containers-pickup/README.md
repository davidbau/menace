# Theme: locks-containers-pickup

Status: active

Target codepaths:
- `js/lock.js` key-based lock/unlock container flow at hero square (`pick_lock` container branch)
- `js/apply.js` key/pick/card apply dispatch into lock core
- `js/do.js` drop+encumbrance transition messaging around heavy containers

Session plan:
1. Add deterministic wizard-assisted lock/chest sessions that stay parity-green.
2. Keep only sessions with measured `js/lock.js` coverage gain.

Accepted sessions:
1. `t08_s701_w_apply2_gp.session.json` (existing baseline)
2. `t02_s704_w_lockbox_gp.session.json`
3. `t02_s701_b_lockbox_gp.session.json`

Coverage impact (2026-03-11 refreshes):
1. First addition: `js/lock.js` line coverage `23.58% -> 38.43%` (`+14.85`).
2. Second addition: `js/lock.js` line coverage `38.43% -> 38.70%` (`+0.27`).
3. Overall parity coverage after both additions: lines `53.13%`, branches `59.57%`, functions `34.58%`.

Issue links:
- Theme tracker: https://github.com/davidbau/menace/issues/338

Completion criteria:
1. Sessions recorded and committed.
2. New sessions parity-green.
3. Baseline parity remains green.
4. Coverage delta captured in docs/metrics snapshot and diff.
