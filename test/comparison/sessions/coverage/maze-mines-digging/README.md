# Theme: maze-mines-digging

Status: in_progress

Target codepaths:
- `js/dig.js` (`use_pick_axe`, directional dig prompt/edge handling, dig beam
  interactions)
- `js/trap.js` (dig-adjacent trap effects surfaced during dig/wand flows)
- `js/dbridge.js` (bridge/terrain dig interactions where reachable in level-1
  wizard scenarios)

Session plan:
1. `t04_s701_w_digedges_gp` (captured)
- base C-faithful dig edge probes: apply pick-axe + wand of digging in opposite
  directions
2. `t08_s700_w_apply_gp` (captured)
- pick-axe apply boundary and direction prompt path
3. `t08_s972_w_dig_gp` (captured)
- additional dig command path with wished pick-axe
4. `t04_s701_w_digext2_gp` (captured)
- extends `t04_s701` with additional wand directions (`j`, `k`, `y`, `u`,
  `b`, `n`) in one parity session to increase branch coverage without adding
  extra session-count/runtime overhead

Issue links:
- Planning: https://github.com/davidbau/menace/issues/340
- Recording/parity/verification: tracked in the planning issue comments

Completion criteria:
1. Sessions recorded and committed.
2. New sessions parity-green.
3. Baseline parity remains green.
4. Coverage delta captured in docs/metrics snapshot and diff.

Captured sessions:
1. `t04_s701_w_digedges_gp.session.json`
2. `t08_s700_w_apply_gp.session.json`
3. `t08_s972_w_dig_gp.session.json`
4. `t04_s701_w_digext2_gp.session.json`
