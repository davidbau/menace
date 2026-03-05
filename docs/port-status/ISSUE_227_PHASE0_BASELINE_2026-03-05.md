# Issue 227 Phase 0 Baseline (2026-03-05)

This is the committed parity baseline artifact for issue `#227`.
See also the Phase-0 inventory artifact:
[`docs/port-status/ISSUE_227_PHASE0_INVENTORY_2026-03-05.md`](/share/u/davidbau/git/mazesofmenace/game/docs/port-status/ISSUE_227_PHASE0_INVENTORY_2026-03-05.md)

## Baseline artifact

- Full per-session results JSON:
  [`docs/metrics/issue227_phase0_session_baseline_2026-03-05.json`](/share/u/davidbau/git/mazesofmenace/game/docs/metrics/issue227_phase0_session_baseline_2026-03-05.json)
- Captured from commit: `8a930642`
- Captured at: `2026-03-05T22:58:17.304Z`

## Summary

- Total sessions: `150`
- Passed: `140`
- Failed: `10`
- Gameplay subset: `34` sessions
- Gameplay full parity:
  - RNG full: `25/34`
  - Events full: `25/34`
  - Screen window full: `24/34`
  - Cursor full: `32/34`

## Failing sessions (baseline)

1. `seed031_manual_direct.session.json` — first divergence step `41` (`rn2(1)=0` vs `rn2(3)=2`)
2. `seed032_manual_direct.session.json` — first divergence step `19` (`rn2(15)=7` vs `rnd(2)=1`)
3. `seed033_manual_direct.session.json` — first divergence step `153` (`rn2(77)=45` vs `rn2(20)=10`)
4. `seed323_caveman_wizard_gameplay.session.json` — screen divergence step `373` (topline empty vs `Unknown command ' '.`)
5. `seed325_knight_wizard_gameplay.session.json` — first divergence step `218` (`rn2(5)=4` vs `rn2(3)=2`)
6. `seed326_monk_wizard_gameplay.session.json` — first divergence step `199` (`rn2(5)=2` vs `rn2(2)=0`)
7. `seed327_priest_wizard_gameplay.session.json` — first divergence step `226` (`rn2(70)=15` vs `rn2(3)=0`)
8. `seed328_ranger_wizard_gameplay.session.json` — first divergence step `220` (`rn2(24)=3` vs `rn2(20)=19`)
9. `seed331_tourist_wizard_gameplay.session.json` — first divergence (`rn2(5)=0`, C-side entry unavailable)
10. `seed332_valkyrie_wizard_gameplay.session.json` — first divergence step `205` (`rn2(7)=5` vs `rn2(7)=6`)

## Reproduce / refresh

```bash
scripts/session-baseline-capture.sh \
  --output docs/metrics/issue227_phase0_session_baseline_2026-03-05.json
```

## Inspect per-session details

```bash
# Compact pass/fail and channel metrics for every session
jq -r '.results[] | [.session, .passed, .metrics.rngCalls, .metrics.events, .metrics.screenWindow] | @json' \
  docs/metrics/issue227_phase0_session_baseline_2026-03-05.json

# First-divergence details for failing sessions only
jq -r '.results[] | select(.passed!=true) | {session, firstDivergence, firstDivergences}' \
  docs/metrics/issue227_phase0_session_baseline_2026-03-05.json
```
