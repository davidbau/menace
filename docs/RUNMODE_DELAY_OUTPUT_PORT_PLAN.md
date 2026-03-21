# Runmode Delay Output Port Plan

## Background

Current `main` is at commit `fecf9f28d` in `/tmp/mazes_main_compare`.

The active gameplay parity blocker is:
- `test/comparison/sessions/seed031_manual_direct.session.json`
- first RNG divergence: step `933`
- first event divergence: step `934`

This frontier was reached after validated fixes to:
- special-level Mines/Rogue `mkmap()` level-flag transitions
- branch-aware turn-end spawn depth

Those fixes were real and moved the session materially later. The remaining seam is not in monster-generation rules or pet-specific AI formulas. It is now localized to the travel/contact corridor after `_` travel target confirmation.

## Problem Statement

At step `933`, JS packs too much travel and monster work into the `.` key that finishes `getpos()` for the `_` travel command.

Observed baseline JS behavior:
- step `933` performs hero travel hops:
  - `22,14 -> 23,13`
  - `23,13 -> 24,13`
  - `24,13 -> 25,13`
  - `25,13 -> 26,13`
  - then attempts hostile contact at `27,13`
- monster 27 (gas spore) gets processed multiple times inside the same step
- by step `934`, monster 27 reaches `distfleeck()` with `mux/muy=(26,13)` and logs:
  - `^distfleeck[27@27,13 in=1 near=1 ...]`

Observed C behavior:
- C step `933` does not drain that much travel inside the same command slice
- monster 27's corresponding first later turn reaches `distfleeck()` with a non-adjacent apparent target and logs:
  - `^distfleeck[27@27,13 in=1 near=0 ...]`

The first RNG mismatch is therefore not caused by `distfleeck()` itself. It is caused by JS reaching a later hero/monster state too early.

## Why `runmode_delay_output()` Matters

`runmode_delay_output()` looks display-oriented, but in C it is part of gameplay-visible control flow because of where it sits in the loop structure.

C implementation summary:
- `cmd.c:dotravel_target()` arms travel state:
  - `context.travel = 1`
  - `context.travel1 = 1`
  - `context.run = 8`
  - `context.nopick = 1`
  - `context.mv = TRUE`
  - `gm.multi = max(COLNO, ROWNO)` if unset
  - then calls `domove()`
- `allmain.c:moveloop_core()` later handles repeat slices in the once-per-player-input phase
- in the `gm.multi > 0` branch, C executes:
  1. `lookaround()`
  2. `runmode_delay_output()`
  3. if still active, one repeated `domove()` or `rhack()`

So in C, `runmode_delay_output()` is the exact boundary before the next repeated travel slice. It is not just a cosmetic delay. It is part of the slice ownership that determines how much hero movement and monster work happen before the command yields.

## C Structure To Match

### Outer loop

`allmain.c:moveloop()`:
- calls `moveloop_core()` forever

### `moveloop_core()` phases

`moveloop_core()` has two major phases:

1. **Actual-time-passed phase** if `context.move`
- decrements `u.umovement`
- runs the "hero can't move this turn" loop
- runs monster movement until hero can act or monsters are out of steam
- when both hero and monsters are out of steam, performs once-per-turn updates
- handles negative `gm.multi < 0` here

2. **Once-per-player-input phase**
- `clear_splitobjs()`
- amulet wish check
- `find_ac()`
- hallucination / telepathy / warning visibility refresh
- `bot()` / cursor update as needed
- `m_everyturn_effect()`
- `context.move = 1`
- occupation branch
- positive `gm.multi > 0` branch
- otherwise fresh command branch `rhack(0)`

### Positive repeat branch in C

In the once-per-player-input phase:

- if `gm.multi > 0`:
  - `RUNSTEP_EVENT(...)`
  - `lookaround()`
  - `runmode_delay_output()`
  - if `!gm.multi`, set `context.move = 0` and return
  - if `context.mv`:
    - if `gm.multi < COLNO && !--gm.multi`, `end_running(TRUE)`
    - `domove()`
  - else:
    - `--gm.multi`
    - `rhack(gc.cmd_key)`

Critically:
- this is **one repeat slice per `moveloop_core()` call**
- the outer `moveloop()` re-enters `moveloop_core()` again later
- C does **not** drain an unbounded `while (gm.multi > 0)` loop inside command execution

## Current JS Structure

Relevant current JS files:
- `js/allmain.js`
- `js/hack.js`

Current JS behavior:
- `run_command()` executes the command
- if the command took time, it calls:
  - `finalizeTimedCommand()`
  - then `repeatLoop()`
- `repeatLoop()` does:
  - `while (game.multi > 0)`
  - for travel/repeat movement, repeatedly:
    - `lookaround()`
    - `domove()`
    - `advanceTimedTurn()`

This means one command execution can drain many positive-`multi` repeat slices before returning.

That is the core structural mismatch.

## Evidence Supporting This Diagnosis

### 1. Baseline step packing

`movement-propagation` and `RUN_TRACE` show JS step `933` contains multiple repeated travel slices and repeated monster turns that C spreads across later steps.

### 2. Monster 27 target refresh happens too early in JS

`MONMOVE_TRACE` around step `933/934` shows JS gas spore 27 reaches:
- step `933`: `set_apparxy ... new=(24,13)`
- later step `933`: `set_apparxy ... new=(26,13)`
- step `934`: `set_apparxy ... old=(26,13) new=(26,13)`

This makes `near=1` inevitable at step `934`.

### 3. `distfleeck()` and `monnear()` are not the bug

C and JS both compute:
- `near = inrange && monnear(mon, mux, muy)`

`monnear()` itself also matches C.

So the mismatch is upstream in when and how `mux/muy` are refreshed.

### 4. Failed broad rewrite clarified the real constraint

A prior attempt moved positive-`multi` ownership out of `run_command()` too aggressively and regressed `seed031` from step `933` back to step `163`.

That failure showed:
- the repeat ownership must move in a way that preserves the full C frame around it
- especially the split between:
  - actual-time-passed phase
  - once-per-player-input phase
  - outer `moveloop()` re-entry

## Design Goal

Port JS so that positive `multi` repeat travel is owned by the JS equivalent of C's **once-per-player-input** phase, with **one repeat slice per outer re-entry**, not by a `while (multi > 0)` loop inside command execution.

The purpose is not to "add delay".
The purpose is to match the exact C slice boundary where `runmode_delay_output()` occurs.

## Proposed JS Port

### 1. Introduce a JS helper for C's once-per-player-input phase

Add a helper in `js/allmain.js` that models the C block after the actual-time-passed phase and before waiting for fresh input.

This helper should own:
- `clear_splitobjs()` equivalent
- amulet wish check
- `find_ac()`
- visibility refresh rules
- status/cursor update conditions
- `m_everyturn_effect()`
- `context.move = 1`
- occupation handling
- positive `multi > 0` handling
- fresh-command fallback

It should execute **one** repeat slice when `multi > 0`, then return.

### 2. Remove positive-`multi` draining from `run_command()`

`run_command()` should remain responsible for:
- command parsing/execution
- immediate timed finalization from the just-executed command
- negative `multi` and occupation work directly caused by that command, where already validated

It should stop owning:
- `while (multi > 0)` repeat draining

### 3. Re-enter the once-per-player-input helper from outer runtime drivers

The browser loop (`_gameLoopStep()`) and replay path (`replayStep()` / `executeReplayStep()`) should re-enter the once-per-player-input helper exactly the way C re-enters `moveloop_core()` from `moveloop()`.

That means:
- one no-input continuation slice per re-entry
- not one command-owned `while` drain

### 4. Preserve current `runmode_delay_output()` body semantics

The JS body in `hack.js` is already close enough in spirit:
- awaitable
- `tport` suppression
- leap/crawl behavior

Headless/test behavior should remain effectively `0ms` delay.
Interactive deployed behavior can keep a tiny awaitable delay.

The main port target is **call-site semantics**, not the delay body's milliseconds.

## Non-Goals

This plan does **not** propose:
- changing `distfleeck()` formula
- changing `monnear()`
- adding replay compensation logic
- masking the session or comparator
- special-casing `seed031`

## Validation Plan

Primary target:
- `test/comparison/sessions/seed031_manual_direct.session.json`

Guardrails:
- `test/comparison/sessions/coverage/covmax-round7/t11_s755_w_covmax9_gp.session.json`
- `test/comparison/sessions/coverage/monster-generation/t11_s756_w_covmax10_gp.session.json`
- `test/comparison/sessions/coverage/artifact-use/theme15_seed986_wiz_artifact-wish_gameplay.session.json`
- `test/comparison/sessions/coverage/round8-scrolls-potions/theme35_seed2320_wiz_artifact-combat2_gameplay.session.json`

Success criteria:
- `seed031` first RNG divergence moves later than `933`
- no larger regressions on the current guardrails
- no replay/comparator masking

## Review Questions For Another Engineer

1. Does the C control-flow summary above match your reading of `allmain.c`, `cmd.c`, and `hack.c`?
2. Do you agree that the structural mismatch is specifically JS `run_command()` owning a `while (multi > 0)` repeat drain?
3. Do you agree the correct JS analogue is a once-per-player-input helper re-entered one slice at a time, rather than another local patch inside `repeatLoop()`?
4. Are there any additional C invariants around `u.umovement`, `context.move`, or `vision/status` ordering that should be carried into the first rewrite?

