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

Next target inside `t11_s755`:

- inspect replay boundary ownership between:
  - resumed `pendingCommand` capture in `js/replay_core.js`
  - `more()`/message ownership
  - animation flush visibility in `js/animation.js` / `js/headless.js`
- the goal is to assign the resumed monster-turn chunk to the same consumed key
  that C uses, without replay-core queueing, continuation-token logic, or
  comparator masking
