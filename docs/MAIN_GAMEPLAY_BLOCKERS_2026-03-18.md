# Main Gameplay Blockers - 2026-03-18

Purpose: coordinate main-suite parity work before recording or tuning more
coverage sessions.

## Status

Older baseline run before the fixes below:

`node test/comparison/session_test_runner.js --type=gameplay --session-timeout-ms=120000`

Result on commit `e69217ff` after the quest-monster patch:

- Gameplay sessions: `434`
- Passed: `421`
- Failed: `13`

Current authoritative failures view after the `t11_s755` / `#sit` batch:

`./scripts/run-and-report.sh --failures`

Current result on worktree based on commit `7993a31a` plus the validated fixes
below:

- Gameplay sessions: `436`
- Passed: `432`
- Failed: `4`

Current remaining failures:

- `seed031_manual_direct`
- `seed032_manual_direct`
- `seed033_manual_direct`
- `seed301_archeologist_selfplay200_gameplay`

The main comparison sessions are still not green, but the blocker set is now
narrow and entirely concentrated in the early manual/direct movement cluster.

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

Validated parity fix batch:

- `js/allmain.js`
  - added a narrow deferred-timed-turn `more()` owner for commands that must
    stop on a visible message page before consuming the end-of-turn monster
    work
- `js/cmd.js`
  - `#sit` now marks the specific case where timed-turn finalization must wait
    until the current `--More--` page is actually dismissed
- `js/mon.js`
  - replaced the unfaithful `I_SPECIAL` simplified auto-equip branch with the
    real `m_dowear(mon, false)` path
- `js/worn.js`
  - restored C-style monster auto-wear semantics during live turns:
    - visible `pline_mon("%s puts on ...")` message ordering
    - proper wear delay via `mfrozen`/`mcanmove`
    - C-style naming through `distant_name(..., doname)`
  - kept monster-creation auto-equip synchronous so `makemon()` stays faithful
    to the single-threaded C flow
- `js/makemon.js`
  - creation-time monster auto-equip now stays on the synchronous path

Validation:

- `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/coverage/covmax-round7/t11_s755_w_covmax9_gp.session.json`
  - PASS
- `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed329_rogue_wizard_gameplay.session.json`
  - PASS
- `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/coverage/shops-economy/hi15_seed42_barb_minetn5_shop-pay_gp.session.json`
  - PASS

Outcome:

- `t11_s755_w_covmax9_gp.session.json` is now fully green on gameplay parity.
- The fix was not comparator/replay masking; it was:
  - one real `#sit` message-boundary ownership bug
  - one real monster auto-wear faithfulness bug
- Follow-up guardrail discovery:
  - the first version of the `#sit` deferral gate was too broad and regressed
    plain stair sits by treating any pending top-line text as an owned
    `--More--` prompt
  - narrowing the gate to an actually visible `--More--` marker restored:
    - `t01_s005_v_sit1_gp`
    - `t01_s650_w_sit_gp`
    - `t01_s651_w_sit2_gp`

## Current High-Signal Blockers

### 1. Manual regressions: `seed031`, `seed032`, `seed033`

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

### 2. `seed301_archeologist_selfplay200_gameplay`

Current state from the failures view:

- first RNG divergence: `step 10`
- first event divergence: `step 7`
- first screen divergence: `step 10`
- label from PES report:
  - `kick_door vs kick_door`

This remains the only non-manual-direct session left in the current fail set.

## Recommended Coordination

Work in this order:

1. Treat the current fail set as the authoritative target, not the older
   13-session snapshot in this document.
2. Continue dedicated work on `seed031` / `seed032` / `seed033`.
3. Then isolate `seed301_archeologist_selfplay200_gameplay`.

Do not start new session-capture work until the main comparison sessions are
materially healthier.

## New Findings: `t11_s755` Ordinary-Level Mimic And `more()` Boundary

Additional localization completed after the special-level `appear_as` fix:

- Authoritative session on current worktree:
  - RNG: full green
  - Events: full green
  - mapdump checkpoints: now full green
  - remaining failure:
    - screen step `1787`
    - cursor step `1349`

Corrected conclusions:

1. The old `minend-1` theory was wrong.
   - C snapshot at the failing arrival/checkpoint shows:
     - `dnum=0`
     - `dlevel=7` on arrival
   - This is an ordinary Dungeons of Doom level, not a Mines special level.
   - The earlier `minend-1` probe was a side investigation and should not be
     treated as the root path for this session.

2. There was a real ordinary-mimic state bug in `js/makemon.js`.
   - `set_mimic_sym()` returned string placeholders (`'object'`,
     `'furniture'`) instead of numeric C-style state.
   - `makemon()` stored that directly into `mon.m_ap_type`, leaving ordinary
     mimics with:
     - nonnumeric `m_ap_type`
     - missing `mappearance`
   - This exactly matched the original `t11_s755` checkpoint mismatch where
     JS had `ap_type=0/mappearance=0` and C had object-disguised mimics.

3. That ordinary-mimic state bug is now fixed and validated.
   - `set_mimic_sym()` now returns numeric runtime state:
     - `m_ap_type`
     - `mappearance`
   - `makemon()` stores both fields on ordinary mimics.
   - Added unit regression:
     - `test/unit/makemon.test.js`
     - ordinary mimics created via `makemon()` now get numeric object disguise
       state immediately
   - Validation:
     - `node --test test/unit/makemon.test.js` passes
     - `t11_s755` mapdump improved from `4/5` to `5/5` with RNG/events still
       fully green

4. The remaining `t11_s755` failure is a one-step command-boundary
   redistribution of monster-turn state.
   - Step summary around the failure:
     - step `1787`: RNG `js/c = 50/17` (`+33`)
     - step `1788`: RNG `js/c = 7/33` (`-26`)
     - step `1789`: RNG `js/c = 0/7` (`-7`)
     - cumulative returns to zero by step `1789`
   - Event counts remain fully conserved.
   - Repaint trace around the bad boundary shows:
     - JS does hit `more()` on `Having fun sitting on the floor?`
     - then later in the same resumed flow it flushes animation/message state
       for `The gnome lord shoots 2 crossbow bolts!`
   - `WEBHACK_REPAINT_DEBUG=1` evidence:
     - `headless.more.dismiss` fires at step `1786` on
       `Having fun sitting on the floor?`
     - `headless.flush` then appears at step `1787` with top line
       `The gnome lord shoots 2 crossbow bolts!`
   - `dbgmapdump` evidence:
     - at step `1787`, JS monster positions are one movement ahead of C
     - by step `1788`, the monster positions realign with C
   - Concrete examples from the aligned step-1787 dump comparison:
     - JS has monsters at `23,7`, `24,12`, `51,13`, `69,9`, `15,14`
     - C still has those same monsters at `24,7`, `25,13`, `52,12`, `69,8`,
       `14,13`
   - Interpretation:
     - this is not persistent gameplay drift
     - it is not a special-level bug anymore
     - it is not the `Concurrent nhgetch()` path
     - it is a step-boundary ownership problem where one resumed chunk of
       monster-turn work is being attributed to the wrong consumed key

5. Ruled out during this batch:
   - `js/headless.js` `Concurrent nhgetch()` skip path:
     - env-gated tracing showed it is not firing in `t11_s755`
   - simple C rerecord delay fix:
     - temporary rerecord with `regen.key_delays_s={"1788":0.15,"1789":0.15}`
       did not fix the screen mismatch and introduced unrelated event drift
   - therefore this is not solved by a simple capture-timing annotation alone

Do not re-open:

- revisit/cached-level `hide_monst()` theories for this session
- special-level `minend-*` generator theories for this session
- ordinary mimic runtime-state loss: that part is fixed
- `Concurrent nhgetch()` as the primary `t11_s755` explanation
- simple rerecord-delay-only fixes for the step-1787 boundary

Final `t11_s755` conclusions:

- The step-1787/1788 redistribution was real, but it was not a replay-core
  queueing problem.
- The first part was command-boundary ownership: `#sit` must leave the visible
  `Having fun sitting on the floor?--More--` page on screen before monster-turn
  finalization resumes.
- The second part was faithful monster equipment behavior:
  - monsters taking an `I_SPECIAL` gear turn must route through the real
    `m_dowear()` path
  - visible wear turns need the C `puts on` message and wear delay
  - object naming must use `doname`, not `xname`, inside that message
- After those fixes, the whole session passed without any replay-core or
  comparator special-casing.
