# Theme: quest-special-levels

Status: active

Target codepaths:
- `js/levels/knox.js`
- `js/dungeon.js` irregular special-room filling
- `js/sp_lev.js` special-level room lighting/presentation
- `js/vault.js` ordinary vault guard flow
- `js/monmove.js` special-monster routing for guards

Session plan:
1. `hi16_seed1200_wiz_knox_gp.session.json` exercises `wizload knox` entry generation.
2. `hi17_seed700_w_vault-guard_gp.session.json` exercises ordinary vault guard summon, interrogation, and compliant gold drop.
3. Follow with deeper quest interactions once the special-level baseline is stable.

Issue links:
- Planning / tracking: `#374`

Completion criteria:
1. Knox session stays parity-green.
2. Vault guard session stays parity-green.
3. Baseline parity remains green.
4. Coverage delta is captured in `docs/metrics/session_parity_coverage_latest.json`.
