# Main Gameplay Blockers - 2026-03-18

Purpose: coordinate main-suite parity work before recording or tuning more
coverage sessions.

## Status

Authoritative run:

`node test/comparison/session_test_runner.js --type=gameplay --session-timeout-ms=120000`

Result on commit `e69217ff` after the quest-monster patch:

- Gameplay sessions: `434`
- Passed: `421`
- Failed: `13`

The main comparison sessions are still not green. Do not treat session
generation as the active priority until these blockers are reduced.

## Landed In This Batch

Core parity fix implemented:

- `js/questpgr.js`
  - added faithful `qt_montype()`
  - added per-role quest enemy mapping from C `role.c`
  - uses C ordering:
    - `rn2(5)` selects enemy1 vs enemy2 branch
    - if specific enemy is available, another `rn2(5)` gates direct use
    - genocided monsters are rejected via `G_GENOD`
    - fallback is `mkclass(enemy_sym, 0)`
- `js/makemon.js`
  - `rndmonst_adj()` now uses the real quest override:
    - `In_quest(current_generation_level) && rn2(7) && qt_montype()`
  - generation branch/depth comes from `_genDnum/_genDlevel` when available,
    then falls back to current `uz`

This patch is C-faithful, but it was neutral with respect to the current
13-session failure set.

Validated follow-up correctness fix:

- `js/sp_lev.js`
  - scripted `appear_as` on special-level monsters now populates runtime
    mimic fields:
    - `m_ap_type`
    - `mappearance`
  - covers `obj:`, `mon:`, and `ter:` forms
  - also preserves the same state on the queued non-immediate path
- `test/unit/sp_lev.test.js`
  - added a regression test proving `minend-1` scripted mimics keep object
    disguise runtime state during special-level generation

Validation:

- `node --test test/unit/sp_lev.test.js` passes

Important outcome:

- This fix is correct, but it was **neutral** for
  `t11_s755_w_covmax9_gp.session.json`.
- Isolated reproduction proves `minend-1` generation itself produces mimics
  with the correct object disguise state, and `saveLev/restLev` preserves it.
- Therefore the `t11_s755` checkpoint mismatch is **later than level
  generation and later than basic level save/restore**.

## Current High-Signal Blockers

### 1. `theme25_seed1328_wiz_quaff-utility_gameplay.session.json`

Current state:

- RNG: full match
- Events: full match
- Cursor: full match
- Failure is screen/color only

First divergence:

- step `72`
- JS:
  - `You feel wise!  You feel self-knowledgeable...--More--`
- C:
  - `You're already as smart as you can get.  You feel wise!--More--`

Conclusion:

- This does **not** look like a gameplay-state or RNG bug.
- It also does **not** look like an attribute-init bug; at the divergence
  point the hero INT is already capped at `18`.
- The likely issue is top-line/message ownership:
  - JS is advancing the `--More--` boundary too early and showing the next
    message page (`You feel self-knowledgeable...`) on the same visible page
    where C is still showing the previous page.
- Focus area:
  - `js/display.js`
  - `js/windows.js`
  - `js/input.js`
  - especially `putstr_message()`, `display_nhwindow(WIN_MESSAGE, ...)`,
    and `more()`

Constraint:

- No `aftermore`-style queueing, continuation tokens, replay-core synthetic
  compensation, or comparator masking. The fix must preserve the single-threaded
  C model of message/input ownership.

### 2. `hi10_seed1090_wiz_potion-deep_gameplay.session.json`

Current state:

- Still fails after the quest patch
- First RNG divergence:
  - index `2401`
  - C: `rn2(12)=10 @ mcalcmove(mon.c:1146)`
  - step `506`
- Visible mismatch near the dip prompt is downstream noise, not the root cause

Conclusion:

- Not addressed by quest monster logic
- Treat as a later monster-movement/event ordering issue

### 3. Manual regressions: `seed031`, `seed032`, `seed033`

These remain major blockers and are unrelated to the quest patch.

Representative anchors:

- `seed031_manual_direct.session.json`
  - first RNG divergence at step `152`
  - JS: `rn2(8)=0 @ impaired_movement(...)`
  - C: `rn2(19)=11 @ exercise(attrib.c:506)`
  - earlier visible mismatch already appears in inventory category labeling
- `seed032_manual_direct.session.json`
  - first RNG divergence at step `91`
  - dog movement path
- `seed033_manual_direct.session.json`
  - first RNG divergence at step `197`
  - JS trap/turn flow versus C exercise path

Conclusion:

- These are not close to green and should be worked as independent regressions,
  not folded into the topline-message investigation.

## Additional Checks Performed

I spot-checked covmax failures to see whether the quest patch helped them:

- `t11_s742_w_covmax1_gp.session.json`
- `t11_s752_w_covmax6_gp.session.json`

Both still fail in unrelated RNG paths. The quest patch did not move those
first divergences.

## Recommended Coordination

Work in this order:

1. Treat the current fail set as the authoritative target, not the older
   13-session snapshot in this document.
2. For `t11_s755`, continue after the point where special-level generation and
   `saveLev/restLev` have already been ruled out; the remaining seams are:
   - later runtime mimic reveal/state clearing
   - live monster-position drift with RNG/events conserved
3. Continue dedicated work on `seed031` / `seed032` / `seed033`.

Do not start new session-capture work until the main comparison sessions are
materially healthier.
