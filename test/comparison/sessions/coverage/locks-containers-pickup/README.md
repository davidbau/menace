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
4. `t02_s704_w_forcebox_gp.session.json`
5. `t02_s704_w_force2_gp.session.json` (repeat `#force` on already-broken lock)
6. `t02_s704_w_forceblade2_gp.session.json` (`#force` with uncursed dagger path)
7. `t02_s714_w_cardbox_gp.session.json` (`credit card` container lock/unlock path)
8. `t02_s993_w_cardcombo_gp.session.json` (high-density `credit card` combo: door open/close + door lock-attempt + chest unlock + chest relock-attempt)
9. `t02_s993_w_carddoorlock_gp.session.json` (`credit card` door lock-attempt path)
10. `t02_s993_w_skelkey_gp.session.json` (`skeleton key` door lock/unlock path)
11. `t02_s993_w_lockpick_gp.session.json` (`lock pick` door lock/unlock path)
12. `t02_s704_w_forceblunt_gp.session.json` (blunt `#force` chest-destruction path; exercises `breakchestlock(..., destroyit=true)`)
13. `t02_s993_wiz_close_gp.session.json` (wizard close-door branch coverage: `already open` -> `closes` -> repeated `already closed`)

Coverage impact (2026-03-11 refreshes):
1. First addition: `js/lock.js` line coverage `23.58% -> 38.43%` (`+14.85`).
2. Second addition: `js/lock.js` line coverage `38.43% -> 38.70%` (`+0.27`).
3. Third addition (`#force` flow): `js/lock.js` line coverage `38.70% -> 47.43%` (`+8.73`).
4. Fourth addition (`#force` repeat on broken lock): `js/lock.js` line coverage `47.43% -> 48.15%` (`+0.72`).
5. Fifth addition (`#force` blade path): `js/lock.js` line coverage `48.15% -> 48.96%` (`+0.81`).
6. Overall parity coverage after five additions: lines `53.20%`, branches `59.57%`, functions `34.72%`.
7. Sixth addition (`skeleton key` door lock/unlock path): `js/lock.js` lines `49.23% -> 59.92%` (`+10.69`), branches `43.37% -> 44.44%` (`+1.07`), functions `62.96% -> 74.07%` (`+11.11`).

Issue links:
- Theme tracker: https://github.com/davidbau/menace/issues/338

Completion criteria:
1. Sessions recorded and committed.
2. New sessions parity-green.
3. Baseline parity remains green.
4. Coverage delta captured in docs/metrics snapshot and diff.
