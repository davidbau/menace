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
