# Selfplay C Learnings (2026-02-14)

## Validation protocol
- Evaluate against C NetHack runner: `selfplay/runner/c_runner.js`.
- Use held-out seeds `1..10`, `1200` turns each, fixed harness settings.
- Keep changes only when aggregate outcome improves and no major regression appears.

## Retained, validated improvements
- `b9cd9e4` `agent: break dlvl1 downstairs stall under monster crowding`
  - Added bounded stall-breaker on Dlvl 1 stairs when repeated "unsafe to descend" decisions occur under high HP.
  - Impact on 10-seed set: average max depth improved from about `1.4` to `1.6` in the validated run.
- `eb575aa` `agent: use position-based pet filtering in combat logic`
  - Removed broad pet-char suppression in combat gating; rely on position-confirmed pet evidence.
  - Impact on 10-seed set: depth profile held; survival robustness improved on hostile dog/cat edge cases.

## High-signal non-keepers
- Broad hostile filtering rewrites in combat/retreat paths:
  - Produced regressions on volatile seeds (not retained).
- Aggressive early descent threshold tweaks:
  - Often no net gain; some variants caused survival regressions.
- Dog/cat danger-class reclassification to MEDIUM globally:
  - Increased early deaths on tested seeds (reverted).
- Tactical potion-timing broadening:
  - Caused survival regressions in seed set (reverted).

## Practical takeaways
- Small, tightly scoped policy edits with clear failure bounds work better than large logic rewrites.
- Pet handling must stay position-grounded; glyph-level assumptions are fragile.
- Stair deadlock breaking on Dlvl 1 is a meaningful and repeatable win.
- Human traces (seed 5/6) still indicate a strategic gap: better long-horizon intent and cleaner risk budgeting.

