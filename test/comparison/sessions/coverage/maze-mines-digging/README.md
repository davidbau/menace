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
5. `t04_s703_w_wizbury_gp` (captured)
- wizard debug burial command (`#wizbury`) with both branches:
  `1 object buried.` then `No objects here or adjacent to bury.`
- targets `dig.js` buried-object callchain (`bury_an_obj`, `bury_objs`,
  `buried_ball`, `unearth_objs`) and command plumbing via `cmd.js`.

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
5. `t04_s703_w_wizbury_gp.session.json`

Pending sessions (not yet parity-green):
1. `test/comparison/sessions/pending/t04_s705_w_minefill_gp.session.json`
- C-harness wizload preflight for high-yield minefill coverage.
- Re-recorded on 2026-03-12 with current harness; stale early prelude mismatch
  is resolved.
- Current blocker tracked in issue #352:
  - remaining drift is in special-level finalize ordering:
    `place_lregion(mkmaze.c)` trial RNG appears in C before JS
    `finalize_level()` mineralize RNG.
2. `test/comparison/sessions/pending/t04_s706_w_minetn1_gp.session.json`
- C-harness wizload preflight for Mine Town variant generation coverage.
- JS previously rejected this valid C level name (`Cannot find level: minetn-1`).
  `wizloaddes` name resolution now accepts `.lua` suffixes and special-level
  registry names (including `minetn-*`), so parity can proceed to real
  gameplay/finalize drift instead of early command rejection.
- Current first divergence is deeper in special-level generation/finalize
  ordering (issue #352/#353 family), not command routing.
