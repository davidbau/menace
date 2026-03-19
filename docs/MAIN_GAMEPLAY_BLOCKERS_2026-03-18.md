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

Useful new diagnostic:

- `node scripts/movement-propagation.mjs <session> --step-from <N> --step-to <M>`
  - replays JS with `^runstep[...]` plus `[RUN_TRACE]`
  - groups the replay back into gameplay steps
  - prints the selected step window with:
    - C movement-related step entries
    - JS movement-related step entries
    - JS run-trace lines
  - use this first when the question is how `run/mv/dx/dy/multi` ownership
    propagates across a step window
  - for `manual-direct-live`, it now uses the same comparison view as
    `session_test_runner`, so gameplay step numbering matches the authoritative
    parity view instead of the raw fixture step array
  - when you also pass `--monmove-trace`, `--mon-id`, or `--mndx`, it enables:
    - ordinary-monster `^mfndpos[...]` detail events
    - `[MONMOVE_TRACE]`
    - `[MONMOVE_PHASE3]`
  - use that focused mode first for ordinary `dochug` / `m_move` /
    `distfleeck` / `mfndpos` seams before adding ad hoc logging

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
  - first RNG divergence now at step `407`
  - JS: `rnd(2)=2 @ promptDirectionAndThrowItem(dothrow.js:245)`
  - C: `rn2(5)=1 @ distfleeck(monmove.c:539)`
  - remaining root is now later pet object-choice / `dog_goal_obj` drift
- `seed032_manual_direct.session.json`
  - first RNG divergence at step `91`
  - dog movement path
- `seed033_manual_direct.session.json`
  - first RNG divergence at step `184`
  - JS trap/turn flow versus C exercise path

Conclusion:

- These are not close to green and should be worked as independent regressions,
  not folded into the topline-message investigation.

Update after `cb87b897`:

- `seed031_manual_direct`
  - faithful improvement landed in `js/pickup.js` for the mixed-class
    container loot menu:
    - item page now follows container-chain order rather than raw array order
    - class headers are rendered per contiguous item class instead of using a
      fake hardcoded `Comestibles` header
    - loot menu display now calls `observeObject()` before naming items, which
      matches C `loot_classify()`/`query_objlist()` behavior
  - validated effect:
    - first RNG divergence moved later from step `147` to step `175`
    - first event divergence moved later from step `147` to step `175`
    - early loot-screen mismatch narrowed from wrong header/content grouping to
      residual screen-area clearing on the right side of the menu block
- `seed032_manual_direct`
  - no measurable change from the loot-menu fix
- `seed033_manual_direct`
  - no measurable change from the loot-menu fix
- canary validation:
  - `seed504_extcmd_loot` remains fully green after narrowing the ordering
    change to mixed-class loot pages only

Conclusion:

- the mixed-class container loot screen was a real `seed031` bug and a real
  parity improvement, but it is not the shared root cause for the
  `seed031/032/033` cluster
- after this fix, `seed031` is still primarily blocked by later monster-turn
  divergence (`distfleeck`/pet movement neighborhood), not by the early loot UI

Update after `142b03cfc` + current worktree:

- `seed031_manual_direct`
  - another faithful improvement landed in `js/cmd.js` / `js/hack.js` for
    `m.` / `m s` handling:
    - JS had been leaving the `m` prefix live after a wait/search command
    - C treats `iflags.menu_requested` as a one-command prefix for `donull()`
      / `dosearch0()`
    - fix:
      - snapshot `m` prefix state for the current wait/search command
      - clear it before execution
      - use the snapshot only to bypass `cmd_safety_prevention()` for that one
        command
  - validated effect:
    - first RNG divergence moved later from step `175` to step `375`
    - first event divergence moved later from step `175` to step `373`
  - remaining first-drift shape:
    - JS: later pet/monster-turn path in `dochug()` / `distfleeck()`

Update after `3325b7ac6` tooling follow-up:

- `scripts/movement-propagation.mjs` now has a raw-window mode:
  - `--raw-from <N> --raw-to <M> --raw-find-mismatch`
  - prints side-by-side C raw key/topline versus JS raw key/topline
  - this is specifically useful for manual-direct sessions where the
    authoritative transformed gameplay view hides the owning raw bundle
- current `seed031_manual_direct` conclusion from that raw-window view:
  - the late `f/j` throw bundle is not the earliest owner
  - the later camera placeholder is also not the earliest owner
  - the earliest currently localized raw drift in the live region is:
    - raw step `463`
    - C key `u`
    - JS key `l`
  - by raw step `468`, C is still on the `u`/`l` pre-stairs movement bundle
    while JS has already reached `>`
  - by raw `478..490`, JS is already through the downstairs combat/loot bundle
    while C is still in:
    - repeated `l`
    - stair descent `>`
    - post-descent `--More--`
    - immediate gnome fight / dart pickup

Conclusion:

- the live `seed031` root is earlier than the later throw/camera symptoms
- it is now best framed as a hidden raw command-bundle drift in the pre-stairs
  movement sequence, not as a pet-AI-local or camera-local bug

Update after `c2de70382` tool hardening:

- `movement-propagation` step-window mode now prints:
  - the C raw key range for the same comparison-step bundle
  - the JS raw keys consumed for that same bundle
- this is the required discipline for manual-direct debugging:
  - compare the same input owner on both sides
  - do not compare arbitrary equal raw offsets after drift

Current anchored `seed031` fact at the live authoritative seam:

- comparison step `407`
  - key: `h`
  - C raw bundle: `[422..422]`, key `h`
  - JS raw bundle: key `h`
- so the live step-407 divergence is **not** caused by the wrong input key
  being consumed for that comparison step
- the bug at that seam is different work being attributed to the same key:
  - C stays in monster-turn / pet-turn work
  - JS later reaches `promptDirectionAndThrowItem(...)` on the same step path

Conclusion:

- the active step-407 theory should now be framed as same-key ownership drift,
  not key-offset drift
    - C: `newhp(exercise)` / dog-move neighborhood
- `seed032_manual_direct`
  - no measurable change from the wait-prefix consumption fix
- `seed033_manual_direct`
  - no measurable change from the wait-prefix consumption fix

Conclusion:

- the wait/no-op seam in `seed031` was a real C-faithfulness bug
- it was not the shared root cause for `seed032` / `seed033`
- the next `seed031` seam is substantially later and now looks like a
  distinct pet/monster-turn ordering issue

Update after current worktree XP fix:

- `seed031_manual_direct`
  - re-anchored on commit `9acf1008` after pulling the latest notes
  - the old local `dogmove` floor-object filter experiment was ruled out and
    abandoned:
    - restricting scans to `where===OBJ_FLOOR` did not move the session
    - do not keep chasing that branch
  - current authoritative first divergences remain:
    - RNG: step `407`
      - JS: `rnd(2)=2 @ promptDirectionAndThrowItem(dothrow.js:245)`
      - C: `rn2(5)=1 @ distfleeck(monmove.c:539)`
    - event: step `406`
      - JS: `^dog_goal_obj[M37 oid=153@14,8 food=4 skip=apc]`
      - C: `^dog_goal_obj[M37 oid=91@12,7 food=6 skip=inf]`
  - new high-confidence conclusion:
    - the `dog_goal_obj` mismatch is downstream, not the primary root
    - on the bad JS command bundle, a newly split/thrown dart is being placed
      on the floor at `14,8` before pet scanning, and the pet then sees it as
      an apport candidate
    - comparison artifacts for the same failing bundle do not show the C pet
      scanning a corresponding object at `14,8` before `distfleeck`
  - practical guidance:
    - do not patch `dog_goal()` ordering in isolation as the next move
    - the next investigation point is the upstream `#fire` / throw-command
      bundle feeding this state:
      - `js/dothrow.js`
      - key ownership around the prompt bundle
      - split/throw/landing visibility timing before monster turns

Update after fixing the `#apply ?` bundle in `seed031`:

- the old `seed031` blocker was not a camera-effect-local bug and not a
  monster-turn ownership bug in isolation
- the real root in that bundle was `js/apply.js` prompt ownership:
  - C `a ? k b` means:
    - open `#apply`
    - show an inventory menu
    - select `k - an expensive camera`
    - choose direction `b`
  - JS was incorrectly implementing `?` as repeated one-line inventory pages
    behind `--More--`
  - that caused the later `k` / `b` keys to be consumed as list dismissals
    instead of `select camera` then `choose direction`
- the fix was:
  - use the shared overlay-menu selection flow for `#apply ?`
  - wire the camera branch to consume time and emit the flash `tmp_at` path
- validated effect:
  - `seed031_manual_direct`
    - first RNG divergence moved from step `407` to step `466`
    - first event divergence moved from step `406` to step `463`
  - targeted controls stayed green:
    - `t08_s984_w_camera_gp`
    - `t08_s977_w_applykey_gp`
    - `theme25_seed1320_wiz_apply-stethoscope_gameplay`

Current `seed031` frontier after that fix:

- the next first divergence is no longer in the `#apply` camera bundle
- it is now later, around descent / level change:
  - event: step `463`
    - JS: `^makemon[322@48,5]`
    - C: `^makemon[165@71,5]`
  - RNG: step `466`
    - JS: `rn2(5)=2 @ mklev(dungeon.js:5206)`
    - C: `rn2(3)=2 @ random src=nhlib.lua:8 parent=shuffle(nhlib.lua:19)`

Conclusion:

- the former `seed031` `a ? k b` blocker is resolved enough to stop treating
  it as the active frontier
- the next work should move to the later `changeLevel()` / level-generation
  ownership path

Update after correcting the manual-direct step-view workflow:

- the older `seed031` note that framed the live seam as a concrete `f` / `j`
  bundle is stale
- the authoritative source is the fresh `.comparison.json` artifact produced by
  `session_test_runner`, not ad hoc raw-step replay probes
- keep using the transformed comparison view for `manual-direct-live` sessions;
  raw fixture step numbering is not reliable enough for blocker localization

Update after inspecting the current `.comparison.json` artifact directly:

- the most reliable evidence is now the artifact raw window, not the earlier
  ad hoc raw replay probes
- current authoritative RNG window around first divergence:
  - JS and C still match through:
    - pet `dog_goal_*`
    - pet move from `16,5 -> 15,5`
    - shopkeeper `distfleeck()`
    - `mcalcmove`
    - end-of-turn `rn2(70)`, `rn2(200)`, `rn2(20)`, `rn2(76)`
  - immediately after that matched tail:
    - JS consumes `rnd(2)=2 @ promptDirectionAndThrowItem(dothrow.js:245)`
    - C continues with monster-turn work (`^tmp_at_start[mode=-1,glyph=4081]`,
      then another pet `movemon_turn`)
- the critical geometric fact from the artifact:
  - the C `DISP_BEAM` path is `13,6 -> 12,7 -> 11,8`
  - that path originates from the hero square at `14,5`
  - so the missing C-side `tmp_at` sequence is a hero-originating beam /
    projection tail, not a remote monster projectile
- current authoritative JS raw event sequence at the seam:
  - `rnd(2)=2 @ promptDirectionAndThrowItem(...)`
  - `^tmp_at_start[mode=-4,glyph=3472]`
  - `^tmp_at_step[14,6,3472]`
  - `^tmp_at_step[14,7,3472]`
  - `^tmp_at_step[14,8,3472]`
  - `^tmp_at_end[flags=0]`
  - `rn2(100)=76 @ breaktest(...)`
  - `^place[24,14,8]`
  - only after that does the pet re-enter `dog_goal()` and notice
    `oid=153@14,8`
- implication:
  - `oid=153@14,8` is a real JS state mutation, not just a later pet-scan
    artifact
  - but the likely root is still earlier than `dog_goal()` and earlier than
    dart-landing semantics in isolation: JS is accepting the `#fire` bundle at
    a point where C is still in the single-threaded monster-turn stream
  - this is now best framed as a turn/input ownership seam that manifests as an
    extra thrown dart on the floor
  - additional corroboration from C source:
    - C `dothrow.c` uses `tmp_at(DISP_FLASH, ...)` for thrown projectiles
    - the raw C artifact at the seam is `^tmp_at_start[mode=-1,...]`
      (`DISP_BEAM`), not `DISP_FLASH`
    - so that C-side `tmp_at` sequence is not the player's thrown dart
      animation, which makes the ownership/handoff explanation stronger than a
      throw-only explanation
  - the fresh artifact still reports the first RNG divergence at step `407`,
    but do not over-interpret the displayed step key; the comparison payload
    itself is the reliable source

Practical next move:

- inspect the handoff from timed monster work back to command input around:
  - `advanceTimedTurn()` / `finalizeTimedCommand()` in `js/allmain.js`
  - `rhack()` / `handleFire()` in `js/cmd.js` and `js/dothrow.js`
- do not patch `dog_goal()` or `throwit()` first
- if a code fix is attempted, validate it first against:
  - the raw RNG window around `rnd(2)=2 @ promptDirectionAndThrowItem(...)`
  - the raw event sequence containing `^place[24,14,8]`
  - then rerun full `seed031_manual_direct`

Conclusion:

- `seed031` is now localized to an upstream throw-command seam whose first
  visible symptom is the pet scanning an extra floor dart.
- The next debugging pass should start at the command bundle around
  `promptDirectionAndThrowItem()` / `throwit()`, not with another
  `dog_goal()`-only patch.

- `seed031_manual_direct`
  - another faithful improvement landed in `js/uhitm.js`:
    - hero kills were still using a simplified XP formula
      `((m_lev + 1) ^ 2)` inside `handleMonsterKilled()`
    - C `xkilled()` instead uses:
      - `experience(mon, nk)`
      - `more_experienced(tmp, 0)`
      - `newexplevel()`
    - fix:
      - switch `handleMonsterKilled()` to the faithful `experience()` /
        `more_experienced()` path before `newexplevel()`
  - validated effect:
    - first RNG divergence moved later from step `375` to step `407`
    - first event divergence moved later from step `373` to step `406`
  - new first-drift shape:
    - JS: later ranged-command / pet-goal seam
    - C: pet `distfleeck()` / `dog_goal_obj` neighborhood
- `seed032_manual_direct`
  - no measurable change from the kill-XP fix

Conclusion:

- the post-kill level-up seam in `seed031` was another real C-faithfulness bug
- it also was not the shared root cause for `seed032`
- `seed031` is now blocked by a later pet object-choice seam after the level-up

Update after `seed032` run-ownership experiment:

- C-side conclusion remains firm:
  - ordinary run/rush ownership really does belong in the single-threaded
    `moveloop_core()` path, not in an inline JS loop inside `do_run()`
  - evidence:
    - `cmd.c set_move_cmd(...)`
    - `rhack()` DOMOVE_RUSH branch in `cmd.c`
    - `repeat_mv` branch in `allmain.c`
- however, a direct JS switch to that model regressed badly and was reverted
  immediately:
  - making `do_run()` seed `ctx.mv` + `multi` and perform only one `domove()`
    caused:
    - an initial timeout around step `167`
    - then, after a partial repair, an early regression at step `19`
  - both code changes were reverted from the worktree after validation
- highest-signal reason the experiment failed:
  - current JS `repeatLoop()` movement branch is still effectively
    travel-shaped
  - it assumes repeated movement can re-enter `domove([0,0])`
  - that is valid for travel because `domove_core()` recalculates from
    `travel1` / `findtravelpath()`
  - it is not valid for ordinary run/rush, where C relies on stored `u.dx/u.dy`
    plus `lookaround()`-driven direction updates
- concrete reproduction from the failed experiment:
  - step `168` produced:
    - first move to `(7,8)`
    - then repeated `domove_target from=7,8 to=7,8`
  - this confirmed that JS `repeat_mv` currently lacks the ordinary-run notion
    of "next direction comes from the stored movement vector"
- practical coordination rule:
  - do not retry this by only changing `do_run()`
  - the next faithful attempt must treat these as one bundle:
    - command-side seeding of repeated movement state
    - `repeat_mv` using stored `dx/dy` for ordinary run/rush
    - `lookaround()` becoming the owner of direction updates / stop decisions
      for ordinary run, not just a travel-adjacent precheck
- current authoritative state after the revert:
  - `seed032_manual_direct` is back to the pre-experiment baseline:
    - first RNG divergence: step `91`
    - first event divergence: step `91`
    - JS event:
      `^dog_invent_decision[32@56,17 ud=72 act=0 otyp=-1 carry=0 rv=0]`
    - C event:
      `^dog_invent_decision[32@56,17 ud=65 act=0 otyp=-1 carry=0 rv=0]`

Conclusion:

- the architectural hypothesis was good:
  - ordinary run ownership belongs in the C `moveloop` model
- but JS is not ready for that switch yet because `repeat_mv` and ordinary-run
  direction ownership are still incomplete
- for now, keep using the existing inline `do_run()` behavior while localizing
  the missing C state handoff more precisely

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

# 2026-03-18: remove `timed_turn_more_ack` continuation path

Summary:
- The repo policy now explicitly requires the single-threaded C execution model:
  - one active input owner at a time
  - no deferred continuation tokens to resume gameplay later
- JS still had one remaining continuation-style path in `js/allmain.js`:
  - `result.deferTimedTurnUntilMore`
  - `pendingPrompt.type = "timed_turn_more_ack"`
- That path was introduced to keep `#sit` green, but it encoded a non-C control
  handoff model.

What changed:
- Removed the generic `timed_turn_more_ack` pending-prompt path from
  `js/allmain.js`.
- Moved the `#sit` `--More--` acknowledgement back into the owning command in
  `js/cmd.js`:
  - if `dosit()` leaves a visible `--More--`, the command now consumes it
    synchronously via `more(...)`
  - only after that does normal timed-turn finalization proceed

Why this is more faithful:
- In C, the command owns that acknowledgement inline; control does not pass back
  to a synthetic continuation prompt which later resumes the timed turn.
- This keeps one active input owner at a time and removes one more piece of
  aftermore-like queueing from core gameplay flow.

Validation:
- `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/coverage/furniture-thrones-fountains/t01_s005_v_sit1_gp.session.json`
  - PASS
- `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/coverage/furniture-thrones-fountains/t01_s650_w_sit_gp.session.json`
  - PASS
- `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/coverage/furniture-thrones-fountains/t01_s651_w_sit2_gp.session.json`
  - PASS
- `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/coverage/covmax-round7/t11_s755_w_covmax9_gp.session.json`
  - PASS

Current conclusion:
- This cleanup is architecturally correct and validated.
- It does not materially move `seed031_manual_direct`; the live `seed031` seam
  remains the later command-vs-monster ownership problem around the `f` / `j`
  bundle and the downstream extra dart at `14,8`.

# 2026-03-19: `seed032` run-corner fix via `last_str_turn` reset

Summary:
- `seed032_manual_direct` had been failing first at step `91` inside an
  uppercase-direction run bundle (`K`).
- Movement-propagation evidence showed:
  - JS and C stayed aligned through most of the step-91 monster-turn stream
  - JS then terminated the `K` command early after reaching `(51,10)`
  - C kept the same run command alive and continued feeding later movement /
    monster-turn cycles in the same gameplay step
- This was not a pet-AI-local bug.

Faithful C anchor:
- In `cmd.c`, when `DOMOVE_RUSH` first enters the command path, C resets:
  - `u.last_str_turn = 0;`
- JS was only resetting `last_str_turn` for travel, not for ordinary run/rush.

Fix:
- `js/hack.js`
  - `do_run()` now resets `player.last_str_turn = 0` before ordinary run/rush
    processing begins

Why this is correct:
- This is not a heuristic. It matches the C `rhack()` / `DOMOVE_RUSH`
  first-entry behavior for both:
  - uppercase direction run commands
  - rush/run-prefix movement commands
- It stays inside the single-threaded C model: no queueing, no replay
  compensation, no ownership tricks.

Validation:
- `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed032_manual_direct.session.json`
  - improved from:
    - first RNG divergence at step `91`
    - first event divergence at step `91`
  - to:
    - RNG fully green (`29881/29881`)
    - first event divergence now at step `150`
- stability checks:
  - `seed031_manual_direct` unchanged at its later throw/pet seam
  - `seed033_manual_direct` unchanged
  - `seed301_archeologist_selfplay200_gameplay` unchanged
  - `t11_s755_w_covmax9_gp` still PASS

Current conclusion:
- the old `seed032` step-91 run-corner failure was a real C-faithfulness bug in
  run state initialization
- the remaining `seed032` blocker is later and event-only:
  - first event divergence now at step `150`
  - JS missing later C monster-turn work:
    - C first unmatched event:
      `^movemon_turn[116@52,7 mv=12->0]`

# 2026-03-19: `seed031` branch/fill-level path restored; latent chain-inventory debt flushed out

Summary:
- `seed031_manual_direct` had been blocked before the real level-generation seam.
- The useful correction was to make level generation branch-aware when callers
  already know the target `(dnum, dlevel)`:
  - `js/allmain.js`
  - `js/u_init.js`
  - now pass absolute depth via `dungeonDepth({ dnum, dlevel })` into `mklev()`
- Then `js/dungeon.js` was extended to honor branch-wide generation metadata:
  - `protofile`
  - `lvlfill`
- This restored the C-style branch/fill path for Mines / Vlad's Tower instead of
  falling through to generic procedural generation.

What that exposed:
- Once the fill-level path became live again, JS immediately hit a series of
  latent bugs where monster inventory was still treated as a JS array instead of
  a C-style `nobj` chain.
- Those were real core-code placeholders, not comparator issues.

Fixes landed in this batch:
- `js/mkobj.js`
  - import missing `merged()` so `add_to_minv()` / `add_to_container()` work on
    the real object-chain path
- `js/invent.js`
  - add shared helpers:
    - `objChainItems(head)`
    - `removeObjFromChain(head, target)`
  - make monster/container inventory display and `addToMonsterInventory()`
    representation-safe for both arrays and linked chains
- `js/muse.js`
  - move monster-item-use logic onto `objChainItems()`
  - make `m_useup()` chain-safe
- `js/worn.js`
  - make `extract_from_minvent()` chain-safe
- `js/weapon.js`
  - make monster weapon selection / inventory scans chain-safe
- `js/monmove.js`
  - make key/load/search heuristics chain-safe
- `js/mon.js`
  - make monster-load computation chain-safe
- `js/mondata.js`
  - make saddle / amulet follower checks chain-safe

Additional faithful ownership fix:
- `js/do.js`
  - removed `waitForStairMessageAck()` from stair traversal
- Why:
  - C owns level generation on the `>` / `<` command itself
  - JS had been consuming an extra `--More--` acknowledgement before calling
    `changeLevel()`, which shifted new-level generation onto the following space
    key
- Evidence:
  - after removal, `seed031` step `467` now matches C ownership better:
    - `>` owns the `^place[...]` burst on both sides
    - the following space no longer owns the level-generation work in JS

Validation:
- `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed031_manual_direct.session.json`
  - no longer crashes in monster inventory / weapon / movement code
  - current first event divergence: step `463`
    - JS: `^makemon[165@31,8]`
    - C:  `^makemon[165@71,5]`
  - current first RNG divergence: step `467`
    - JS: `rn2(100)=81 @ sp_amask_to_amask(...)`
    - C:  `rn2(3)=1 @ induced_align(dungeon.c:2006)`
  - matched RNG prefix improved versus the pre-stair-fix branch-state run:
    - `21405 -> 21438`
- stability checks:
  - `seed032_manual_direct` unchanged at its current step-150 event blocker
  - `t08_s984_w_camera_gp` still PASS

Current conclusion:
- This batch is a real forward step because it restores the intended branch
  generation path and clears a coherent class of latent C-vs-JS representation
  bugs that had been masking the real blocker.
- The live `seed031` blocker is now inside fill-level special generation, not in
  the old downstream throw/pet seam.
- The current high-signal frontier is:
  - minefill generation is active on both sides
  - `>` now owns the level-generation work correctly
  - JS still diverges during scripted monster creation / alignment selection:
    - `sp_amask_to_amask()` / `induced_align()`
- Next work should focus on why JS is consuming the `rn2(100)` alignment gate in
  a place where C reaches the unconditional `rn2(3)` fallback.

## 2026-03-19: `seed031` `Is_stronghold()` RNG leak localized and fixed

Validated code fix:
- `js/special_levels.js`
  - added `getSpecialLevelMeta(dnum, dlevel)` for metadata-only special-level
    lookup that does not consume RNG by selecting a variant
- `js/dungeon.js`
  - `Is_stronghold()` now uses `getSpecialLevelMeta()` instead of
    `getSpecialLevel()`
- `js/makemon.js`
  - branch-sensitive monster-generation level helper now prefers generation
    metadata and no longer blindly trusts `map.uz`
  - gnome candle gate now matches C:
    - `rn2((In_mines(&u.uz) && gi.in_mklev) ? 20 : 60)`

What this proved:
- The earlier `rnd(7)` under `Is_stronghold(...)` in `seed031` was a real RNG
  leak from a predicate path, not a stale-level-context bug.
- `runtimeSpecialLevelFor()` itself is clean; the leak came from calling
  `getSpecialLevel()` inside `Is_stronghold()`, which can choose a level
  variant and consume RNG.
- In the live `seed031` descent bundle, `makemon()` is using the correct
  generation context:
  - `inMklev=true`
  - `mapGen=1:3`
  - `levelRef=1:3`
  - so the remaining mismatch is no longer about which level is being queried.

Validation:
- `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed031_manual_direct.session.json`
  - improved:
    - RNG matched `21416 -> 21582`
    - events matched `10130 -> 10131`
  - new first RNG divergence:
    - step `467`
    - JS: `rn2(2)=0 @ createMonster(...)`
    - C:  `rn2(2)=1 @ makemon(makemon.c:1281)`
  - new first event divergence:
    - step `464`
    - JS: `^pickup[166@48,9,83]`
    - C:  `^makemon[166@48,9]`
- guardrails stayed green:
  - `test/comparison/sessions/t04_s705_w_minefill_gp.session.json`
  - `test/comparison/sessions/coverage/shops-economy/hi15_seed42_barb_minetn5_shop-pay_gp.session.json`

Current frontier after this fix:
- `seed031` is still inside the integrated minefill `>` bundle.
- The next live seam is later in monster creation, after the predicate leak is
  gone:
  - JS now first diverges on a later `rn2(2)` in `createMonster(...)`
  - event side shows JS giving the next generated gnome-lord an item where C
    still only logs `^makemon[...]`
- Next work should stay on step `467` and compare the next generated
  `create_monster()` call after the no-RNG `Is_stronghold()` fix.

## 2026-03-19: `seed031` minefill depth/alignment context fixed again; frontier moved later

Validated code fixes:
- `js/dungeon.js`
  - separate C `depth()` from `ledger_no()`
  - add branch-derived `_dungeonDepthStartByDnum`
  - compute child dungeon `depth_start` from branch topology using the C
    `init_dungeon_set_depth()` formula
  - restore `ledger_no()` to use ledger numbering, not gameplay depth
- `js/sp_lev.js`
  - for random special-level alignment, prefer the live current dungeon context
    before falling back to `finalizeContext.dnum`
- `js/makemon.js`
  - add `WEBHACK_MAKEMON_TRACE=1` diagnostic logging for `adj_lev()/newmonhp()`
    inputs during parity investigation

What this proved:
- JS had a real structural bug in dungeon bookkeeping:
  - `depth()` was using ledger starts
  - that made branch levels absurdly deep for gameplay logic
  - sanity check before fix:
    - Mines 1 -> `50`
    - Mines 3 -> `52`
    - Sokoban 1 -> `63`
  - sanity check after fix:
    - Mines 1 -> `4`
    - Mines 3 -> `6`
    - Sokoban 1 -> `2`
- The old `seed031` seam at
  - JS: `rn2(100)=81 @ sp_amask_to_amask(...)`
  - C:  `rn2(3)=1 @ induced_align(...)`
  was real but downstream of that broken context.
- `WEBHACK_MAKEMON_TRACE=1` was useful here because it made the bad generation
  inputs obvious:
  - before the depth fix:
    - `mndx=166 "gnome lord" base=3 depth=50 adj=4`
  - after the depth fix:
    - `mndx=166 "gnome lord" base=3 depth=3 adj=3`

Validation:
- `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed031_manual_direct.session.json`
  - improved:
    - RNG matched `21582 -> 21809`
    - events matched `10131 -> 10152`
  - new first RNG divergence:
    - step `467`
    - JS: `rn2(8)=2 @ mon_arrive(dog.js:463) <= changeLevel(do.js:1668)`
    - C:  `rn2(79)=72 @ place_lregion(mkmaze.c:396)`
  - new first event divergence:
    - step `464`
    - JS: `^movemon_turn[32@29,10 mv=12->0]`
    - C:  `^movemon_turn[32@72,5 mv=12->0]`
- guardrails stayed green:
  - `test/comparison/sessions/t04_s705_w_minefill_gp.session.json`
  - `test/comparison/sessions/coverage/shops-economy/hi15_seed42_barb_minetn5_shop-pay_gp.session.json`
- nearby failing session stayed stable at its existing blocker:
  - `seed032_manual_direct` unchanged on step-150 event drift

Current conclusion:
- the old `sp_amask_to_amask()/induced_align()` frontier in `seed031` is now
  superseded
- the remaining live seam is later, after generation, in
  `changeLevel()`/arrival ownership:
  - JS reaches `mon_arrive(...)`
  - C is still in `place_lregion(...)`
- next work should stay on this later step-467 arrival/levregion boundary, not
  reopen the older minefill alignment theory

## 2026-03-19: `seed031` integrated Mines seam is still unresolved; current contradiction is in level identity

Validated observations:
- authoritative current failure is still:
  - `seed031_manual_direct`
  - first RNG divergence at step `467`
  - JS: `rn2(8)=2 @ mon_arrive(dog.js:463) <= changeLevel(do.js:1668)`
  - C: `rn2(79)=72 @ place_lregion(mkmaze.c:396)`
- `scripts/movement-propagation.mjs` confirms step `467` is the same `>` bundle
  on both sides; this is not a wrong-key problem
- `DEBUG_MINERALIZE=1` on `seed031` shows JS does reach `mineralize()` for the
  new level:
  - `mineralize depth=3 dnum=1 dlevel=3 skip=false`
  - then immediately:
    - `mineralize: SKIP (... special=true oracle=false mines=true town=true)`
- `WEBHACK_WIZLOAD_FIXUP_TRACE=1` on the same session shows JS special-level
  finalize state for that generated map as:
  - `^wizfixup[name=minefill dnum=1 dlevel=3 isBranch=0 nroom=0 regions=0 placed=0 addedBranch=0 fallback=0 ...]`

What this currently proves:
- JS believes the generated map at `(dnum=1,dlevel=3)` is `minefill` when
  running `fixupSpecialLevel()`
- but `mineralize()` classifies the same coordinates as a Mines town special
  (`special=true`, `town=true`) and skips the minefill post-topology pass
- that contradiction is upstream of the step-467 `mon_arrive()` drift and is a
  better live target than follower migration itself

Failed local experiment (reverted, do not retry blindly):
- I tried preserving an `_generatedSpecialName` marker onto the generated map
  and teaching `mineralize()` to trust that actual generated-level identity
  before coordinate-based runtime metadata
- this regressed both established Mines guardrails and was fully reverted:
  - `test/comparison/sessions/t04_s705_w_minefill_gp.session.json`
  - `test/comparison/sessions/coverage/maze-mines-digging/t04_s706_w_minetn1_gp.session.json`

Guardrail status after reverting the experiment:
- `t04_s705_w_minefill_gp`: PASS
- `t04_s706_w_minetn1_gp`: PASS
- worktree restored to clean validated state before continuing

Current best next target:
- localize why integrated gameplay reaches the contradictory state
  `fixupSpecialLevel(name=minefill)` + `mineralize(town=true)` on the same
  generated level
- likely owners to inspect next:
  - runtime special-level mapping for the active role/seed
  - the `makelevel()` special-vs-`lvlfill` selection path
  - any divergence between branch-local generation identity and
    coordinate-based `runtimeSpecialLevelFor(dnum,dlevel)` during integrated
    Mines descent

## 2026-03-19: `seed031` canonical-proto coordinate leak fixed; frontier moved later again

Validated core fix in `js/dungeon.js`:

- `load_special_by_protofile(protofile, dnum, dlevel, depth)` had been using
  the canonical registry coordinates returned by `findSpecialLevelByProto()`
  as the live generation/finalize coordinates.
- That is wrong for branch filler protofiles such as Mines `lvlfill=minefill`:
  the registry entry lives at canonical Mines `dlevel 3`, but the live branch
  entry in `seed031` is Mines `dlevel 1`.
- Fix:
  - use the proto registry only to choose the generator
  - preserve the actual requested generation coordinates for:
    - `withFinalizeContext(...)`
    - `withSpecialLevelDepth(...)`
    - `specialMap._genDnum/_genDlevel`
    - tutorial/branch classification

New reusable diagnostic added:

- env-gated makelevel trace:
  - `WEBHACK_TRACE_LEVEL_SELECT=1`
- useful output on the live `seed031` bundle:
  - `^lvlselect[depth=3 dnum=1 dlevel=1 depthOnly=0 runtime=- town=0 special=-]`
  - `^lvlselect_fallback[dnum=1 dlevel=1 proto=- lvlfill=minefill]`

What this proved:

- the integrated `seed031` descent was correctly generating a branch-entry
  Mines filler level at `dnum=1,dlevel=1`
- the old bad state came later, when `load_special_by_protofile('minefill', ...)`
  leaked canonical registry coordinates into the generated map:
  - old bad event:
    - `^wizfixup[name=minefill dnum=1 dlevel=3 isBranch=0 ...]`

Validation after the fix:

- `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed031_manual_direct.session.json`
  - improved:
    - RNG matched `21809 -> 22472`
    - events matched `10152 -> 10188`
  - new first RNG divergence:
    - step `467`
    - JS: `rnd(3)=2 @ Module.finalize_level(sp_lev.js:7086) <= async generate(minefill.js:64) <= dungeon.js:1772`
    - C:  `rnd(2)=1 @ mineralize(mklev.c:1528)`
  - new first event divergence:
    - step `464`
    - JS: `^movemon_turn[32@74,6 mv=12->0]`
    - C:  `^movemon_turn[32@72,5 mv=12->0]`
  - corrected fixup/mapdump identity:
    - `^wizfixup[name=minefill dnum=1 dlevel=1 isBranch=1 ...]`
    - mapdump checkpoint now `d1l1_003` instead of stale `d1l3_003`
- canaries stayed green:
  - `test/comparison/sessions/t04_s705_w_minefill_gp.session.json`
  - `test/comparison/sessions/coverage/maze-mines-digging/t04_s706_w_minetn1_gp.session.json`

Current conclusion:

- the earlier `minefill@dlevel3` integrated descent state was a real core bug
- it is now fixed
- `seed031` remains blocked in the same branch-entry bundle, but the next live
  seam is later minefill finalization (`finalize_level` / `mineralize`) rather
  than misidentified branch coordinates

## 2026-03-19: `seed031` mineralize gem-count depth bug fixed; frontier moved to step 480

Validated core fix in `js/dungeon.js`:

- JS `mineralize()` was using absolute depth for both:
  - probability scaling
  - gem-count quantity via `rnd(2 + depth/3)`
- C uses two different depth notions:
  - `goldprob`: `depth(&u.uz)` (absolute depth)
  - gem count at `mklev.c:1529`: `rnd(2 + dunlev(&u.uz) / 3)` (branch-local level)
- On the live `seed031` branch-entry Mines filler level this mattered:
  - JS had `depth=5`, `dlevel=1`, so it called `rnd(3)`
  - C called `rnd(2)`
- Fix:
  - preserve absolute depth for probability scaling
  - use `map._genDlevel` (`dunlev`) for gem-count quantity

Validation:

- `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed031_manual_direct.session.json`
  - improved:
    - RNG matched `22472 -> 23197`
    - events matched `10188 -> 10800`
  - old step-467 minefill finalization seam is gone
  - new first RNG divergence:
    - step `480`
    - JS: `rn2(16)=6 @ dochug(monmove.js:847)`
    - C:  `rn2(12)=6 @ m_move(monmove.c:1979)`
  - new first event divergence:
    - step `477`
    - JS: `^distfleeck[166@63,10 ...]`
    - C:  `^distfleeck[166@63,8 ...]`

Guardrails:

- `t04_s705_w_minefill_gp`: PASS
- `t04_s706_w_minetn1_gp`: PASS

Current conclusion:

- the remaining `seed031` blocker is no longer in branch-entry level
  generation/finalization
- the live seam has moved later to post-entry monster movement (`distfleeck` /
  `m_move` / `mfndpos`)

## 2026-03-19: `m_balks_at_approaching()` must respect `m_canseeu()` and `mux/muy`

- `seed031_manual_direct` had a real post-entry monster movement bug in the
  gnome-line bundle after the branch-entry Mines fixes.
- The failing gnome lord was entering `m_move()` with `appr=-1` on the JS side
  even though:
  - `turn-start ... flee=0`
  - `distfleeck ... flee=0`
- Direct JS trace showed the flip happened before item-search, inside
  `m_balks_at_approaching()`.
- Root cause:
  - JS `m_balks_at_approaching()` was using the hero's real coordinates rather
    than `mux/muy`
  - and it lacked the C early return on `!m_canseeu(mtmp)`
- C behavior (`monmove.c:1198-1217`) is:
  - compute `edist` against `mux/muy`
  - leave `appr` unchanged when the monster cannot currently see the hero
- Fix:
  - [`js/monmove.js`](/share/u/davidbau/git/mazesofmenace/game/js/monmove.js)
    now uses `mux/muy` for `edist` and returns early when `!m_canseeu(mon)`
- Validation:
  - `node test/comparison/session_test_runner.js --verbose test/comparison/sessions/seed031_manual_direct.session.json`
    - improved:
      - RNG matched `23197 -> 23297`
      - events matched `10800 -> 10804`
    - old frontier removed:
      - no more gnome-lord retreat drift at step `479/480`
  - guardrails stayed green:
    - `test/comparison/sessions/t04_s705_w_minefill_gp.session.json`
    - `test/comparison/sessions/coverage/maze-mines-digging/t04_s706_w_minetn1_gp.session.json`
- New live frontier:
  - later slow-monster post-move `distfleeck()` seam around step `484`
  - current visible mismatch:
    - C:  `^distfleeck[44@38,10 ... brave=0 ...]`
    - JS: `^distfleeck[44@38,10 ... brave=1 ...]`
Update after camera flash parity investigation on `seed031_manual_direct`:

- `apply.js` / `uhitm.js` camera flash path had a real C-faithfulness bug:
  - JS `flash_hits_mon()` was still a simplified placeholder
  - it consumed non-C RNG (`rnd(50)`, extra `rn2(4)`, `rnd(100)`) before the
    post-camera monster stream
- localized evidence at the authoritative `a ? k b` bundle:
  - C before monster turns:
    - `^tmp_at_start[mode=-1,glyph=4081]`
    - `rn2(4)=0 @ flash_hits_mon(...)`
  - old JS before monster turns:
    - `^tmp_at_start[mode=-1,glyph=4006]`
    - `rnd(50)`, extra `rn2(4)`, `rnd(100)`
- the camera fix now makes the step-484 bundle materially align on the
  C-visible sequence:
  - `rn2(4)=0` at camera flash time
  - matching downstream dog/monster movement RNG through that bundle
- important interpretation:
  - this is a real correctness improvement even though `seed031` does not yet
    produce a net later first-divergence prefix
  - the patch removes a known placeholder path and exposes a different earlier
    live seam rather than masking one

## 2026-03-19: `seed031` thrown-kill corpse freshness and post-kill ownership batch

- Validated fixes in this batch:
  - `js/mkobj.js`
    - `newobj()` now seeds `age` from current move count instead of hardcoding `1`
  - `js/dothrow.js`
    - thrown multishot count is now computed before stack splitting
    - thrown-kill handling no longer treats the missile as gone just because the target died
  - `js/mon.js`
    - `xkilled()` now awaits `newexplevel()`
    - `mondead()` now increments `mvitals[mndx].died`
  - `js/makemon.js`
    - makemon player context falls back to `_gstate.u`
- Guardrails validated:
  - `node --test test/unit/mkobj.test.js`
  - `theme33_seed2102_wiz_eat-various_gameplay`: PASS
  - `t08_s984_w_camera_gp`: PASS
  - `t04_s705_w_minefill_gp`: PASS
- `seed031_manual_direct` results after this batch:
  - events matched `10804 -> 10840`
  - first event divergence moved later within step `479`
    - old live seam: pet corpse classification / wrong `dog_goal_obj` target scan
    - new live seam:
      - JS: `^dog_move_choice[32@66,6 pick=65,6 chi=1 do_eat=0 cnt=6 appr=1]`
      - C:  `^dog_move_choice[32@66,6 pick=67,7 chi=5 do_eat=0 cnt=6 appr=1]`
  - first RNG divergence still at step `488`
    - JS: `rn2(5)=1 @ rndmonnum_adj(...) <= rndmonnum(...)`
    - C:  `rn2(2)=0 @ rndmonst_adj(makemon.c:1714)`
- Most important conclusion:
  - C `dothrow.c thitmonst()` does not directly own `xkilled()`
  - JS still lacks a faithful `hmon()`-style thrown-hit owner
  - the safe local rule is:
    - JS may perform kill resolution inside `thitmonst()` as an interim compromise
    - but it must not mark the thrown object as gone just because the target died
    - the later missile mulch/landing branch still owns object disposition
- Next target:
  - localize the remaining post-kill step-479/488 seam so the pet move choice
    and later monster-turn RNG realign without relying on the `thitmonst()`
    shortcut as the final architecture

## 2026-03-19: `seed031` runtime special-level identity fix for protofile branch fillers

- Validated fixes in this batch:
  - `js/dungeon.js`
    - protofile-loaded special levels now register runtime special-level identity
      at their actual `(dnum,dlevel)` coordinates
    - added `getRuntimeSpecialLevelMeta()` and `level_align()` so runtime code
      can ask the C-faithful question:
      - "is the current live level a special level, and if so what align does it use?"
  - `js/makemon.js`
    - `align_shift()` now derives level alignment from the current runtime level
      rather than the stale `_dungeonAlign` cache
- What this fixed:
  - branch-filler special levels such as `minefill` were invisible to runtime
    `Is_special`-style logic
  - on `seed031`, that made corpse placeholder monster selection use branch
    alignment weighting on a special level where C uses `AM_NONE`
- Validation:
  - `seed031_manual_direct`
    - improved:
      - RNG matched `23265 -> 23269`
      - events preserved at `10840`
    - first RNG divergence moved from:
      - JS: `rn2(5)=1 @ rndmonnum_adj(...)`
      - to: `rn2(3)=1 @ rndmonnum_adj(...)`
    - first event divergence stayed at the existing pet-choice seam:
      - `^dog_move_choice[32@66,6 ...]`
  - guardrails stayed green:
    - `t04_s705_w_minefill_gp`
    - `t04_s706_w_minetn1_gp`
- Important negative result:
  - a separate `js/mkobj.js` depth-source patch was tested in the same area
  - that moved the RNG seam farther, but regressed the first event earlier to:
    - `^distfleeck[32@66,6 ... brave=0]`
  - do not reintroduce that mixed patch without fixing the pet-side regression
- Current frontier after the clean fix:
  - event: step `479`
    - JS: `^dog_move_choice[32@66,6 pick=65,6 chi=1 do_eat=0 cnt=6 appr=1]`
    - C:  `^dog_move_choice[32@66,6 pick=67,7 chi=5 do_eat=0 cnt=6 appr=1]`
  - RNG: step `488`
    - JS: `rn2(3)=1 @ rndmonnum_adj(...)`
    - C:  `rn2(2)=0 @ rndmonst_adj(makemon.c:1714)`

## 2026-03-19: restore C thrown-hit `hmon()` ownership in `seed031`

- Validated fixes in this batch:
  - `js/uhitm.js`
    - `hmon_hitmon_weapon()` now uses the C thrown-vs-melee predicate instead of
      the simplified "all ammo/missiles are ranged" shortcut
    - `hmon()` now owns the actual C death call:
      - `xkilled(mon, XKILL_NOMSG)` for poison kills
      - `killed(mon)` for ordinary hero kills
  - `test/unit/uhitm_weapon_dispatch.test.js`
    - regression test: thrown ammo with a matching launcher must use the melee
      damage branch
- What this fixed:
  - upstream `dothrow` cleanup exposed two missing C behaviors in JS:
    - thrown ammo with the proper launcher was still taking `rnd(2)` ranged
      damage instead of `dmgval()`
    - even when `hmon()` marked a monster destroyed, JS returned to
      `thitmonst()` without performing the C death owner
- Validation:
  - `node --test test/unit/uhitm_weapon_dispatch.test.js`
  - `seed031_manual_direct`
    - improved from the current-main regression:
      - RNG matched `23211 -> 23269`
      - events matched `10811 -> 10840`
    - restored the earlier frontier:
      - event: `^dog_move_choice[32@66,6 pick=65,6 ...]` vs
        `^dog_move_choice[32@66,6 pick=67,7 ...]`
      - RNG: `rn2(3)=1 @ rndmonnum_adj(...)` vs
        `rn2(2)=0 @ rndmonst_adj(...)`
  - guardrails stayed green:
    - `t04_s705_w_minefill_gp`
    - `t04_s706_w_minetn1_gp`
    - `t08_s984_w_camera_gp`
- Most important conclusion:
  - the right architecture is the C one:
    - `thitmonst()` calls `hmon()`
    - `hmon()` owns death resolution before returning
  - do not reintroduce a `thitmonst()`-local kill shortcut for thrown hits
- Current frontier after the fix:
  - event: step `479`
    - JS: `^dog_move_choice[32@66,6 pick=65,6 chi=1 do_eat=0 cnt=6 appr=1]`
    - C:  `^dog_move_choice[32@66,6 pick=67,7 chi=5 do_eat=0 cnt=6 appr=1]`
  - RNG: step `488`
    - JS: `rn2(3)=1 @ rndmonnum_adj(...)`
    - C:  `rn2(2)=0 @ rndmonst_adj(makemon.c:1714)`
