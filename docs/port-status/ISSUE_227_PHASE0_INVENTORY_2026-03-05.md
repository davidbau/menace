# Issue 227 Phase 0 Inventory (2026-03-05)

This is the committed Phase-0 inventory artifact for issue `#227`.
See also the Phase-0 baseline artifact:
[`docs/port-status/ISSUE_227_PHASE0_BASELINE_2026-03-05.md`](/share/u/davidbau/git/mazesofmenace/game/docs/port-status/ISSUE_227_PHASE0_BASELINE_2026-03-05.md)

## Raw inventory files

1. Top-level `register*()` call inventory  
   [`docs/metrics/issue227_phase0_inventory_register_calls_2026-03-05.txt`](/share/u/davidbau/git/mazesofmenace/game/docs/metrics/issue227_phase0_inventory_register_calls_2026-03-05.txt)  
   Count: `2`

2. `set*Context` / `set*Player` wiring call inventory (candidate occurrences)  
   [`docs/metrics/issue227_phase0_inventory_context_player_calls_2026-03-05.txt`](/share/u/davidbau/git/mazesofmenace/game/docs/metrics/issue227_phase0_inventory_context_player_calls_2026-03-05.txt)  
   Count: `53`

3. Capitalized exports outside the target leaf set (`const/objects/monsters/version/game`)  
   [`docs/metrics/issue227_phase0_inventory_caps_exports_outside_leaf_2026-03-05.txt`](/share/u/davidbau/git/mazesofmenace/game/docs/metrics/issue227_phase0_inventory_caps_exports_outside_leaf_2026-03-05.txt)  
   Count: `1217`

## Commands used

```bash
rg -n "^\s*register[A-Z][A-Za-z0-9_]*\(" js | sort \
  > docs/metrics/issue227_phase0_inventory_register_calls_2026-03-05.txt

rg -n "set[A-Za-z0-9_]*(Context|Player)\(" js | sort \
  > docs/metrics/issue227_phase0_inventory_context_player_calls_2026-03-05.txt

rg -n "export (const|let|var|function|class) [A-Z]" js \
  | rg -v "^js/(const|objects|monsters|version|game)\.js:" \
  > docs/metrics/issue227_phase0_inventory_caps_exports_outside_leaf_2026-03-05.txt
```

## Notes

- The context/player inventory is intentionally broad (candidate occurrences)
  to prevent missing init-wiring sites.
- Bootstrap/UI registration in `js/nethack.js` is expected and treated
  separately from gameplay-module cleanup.
