# Theme: quest-special-levels

Status: active

Target codepaths:
- `js/levels/knox.js`
- `js/dungeon.js` irregular special-room filling
- `js/sp_lev.js` special-level room lighting/presentation

Session plan:
1. `hi16_seed1200_wiz_knox_gp.session.json` exercises `wizload knox` entry generation.
2. Follow with deeper special-level / quest interactions once the Knox baseline is stable.

Issue links:
- Planning / tracking: `#374`

Completion criteria:
1. Knox session stays parity-green.
2. Baseline parity remains green.
3. Coverage delta is captured in `docs/metrics/session_parity_coverage_latest.json`.
