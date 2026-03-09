# Phase 4: Gameplay Parity Burndown

Date: 2026-03-09
Status: **Complete.** Full green at commit `48a9f0da` — 151/151 sessions passing, 34/34 gameplay, all channels (RNG, events, screens, colors, cursor, mapdump).

---

## The Full Story

### What Phase 4 Was

Phase 4 was the final push to achieve 100% gameplay parity between the JavaScript port of NetHack 3.7.0 and the original C implementation. "Parity" means: given the same seed and the same sequence of keystrokes, the JS game produces the exact same RNG call sequence, the exact same screen output, the exact same event stream, the exact same cursor positions, and the exact same level state (mapdump) as the C game. Not approximately — exactly.

This required ~3,964 commits over approximately 5 weeks (early February through March 9, 2026), by a team of AI agents and a human coordinator, working across three repositories (`ux`, `game`, `mazes`). The path was not straight. Several major strategic pivots were required, and hard lessons were learned about what works and what doesn't when pursuing bit-exact behavioral fidelity in a complex codebase.

### Where It Started

The project had three earlier phases:

- **Phase 1 (PRNG Alignment)**: Port ISAAC64 from C to JS using BigInt, verify golden reference values. Achieve identical terrain grids for any seed at depth 1.
- **Phase 2 (Gameplay Alignment)**: Extend parity to live gameplay — 66 turns of a human-played session on seed 1, every RNG call matching. Ported the turn loop, monster AI, pet behavior, vision, combat.
- **Phase 3 (Multi-Depth Alignment)**: Multi-depth dungeon generation across seeds, fixing test isolation failures and depth-dependent divergences. Reached ~91% map-generation pass rate.

Phase 4 began with the infrastructure in place but substantial gaps remaining: ~124/150 sessions passing (26 failing), with the dominant failure class being `dochug` monster-movement / pet-AI divergence (~14 sessions). The goal: drive everything to 100% with no comparator masking.

---

## The Major Strategic Pivots

### Pivot 1: "What does parity mean?" — Turn-based vs. Key-based

The earliest and most fundamental confusion was about the unit of comparison. The C test harness records one "step" per keystroke, capturing the screen and RNG trace at each key boundary. But a single C keystroke can execute multiple game turns (running, counted commands, occupation continuations), and a single game turn can consume multiple keystrokes (`--More--` dismissals, multi-key prompts).

The initial approach tried to make the JS replay engine produce RNG in step-sized chunks matching C's screen-frame boundaries. This led to `replay_core.js` growing to ~1,700 lines of complexity — RNG-count-driven loops, deferred boundary carrying, sparse move handling, step-consumption lookahead — all to match artifacts of C's tmux capture timing that had nothing to do with game logic.

**The resolution**: Move ALL flexibility out of the recorder and into the comparator. The recorder became a simple key-replayer: feed keys to the game engine, capture whatever output it produces. The comparator does post-hoc flat-stream comparison, using C step boundaries only for diagnostic context ("divergence near step 42"), not as loop-control signals. This took several hours to get right but was the single most important architectural decision of the campaign.

The LORE captures this as: *"Don't contort the game engine to produce output shaped for comparison. Run the game naturally, collect a flat log, and compare post-hoc."*

### Pivot 2: Operation Iron Parity — The Failed Autotranslation Campaign

In late February 2026, the team launched **Operation Iron Parity** — an ambitious attempt to close the remaining ~3,242 missing C function rows through mechanical C-to-JS translation. The thesis: build a rule-driven translator that could safely batch-translate hundreds of functions, dramatically accelerating coverage.

The translator infrastructure grew substantial: rule tables, policy manifests, annotation-driven mixed-file controls, safety linting, candidate filtering, batch stitching modes. Multiple translator commits landed (dozens of `translator:` prefixed commits in the Feb 15-Mar 4 window).

**Why it failed:**

1. **String pointer semantics**: C pointer mutation idioms (`p++`, in-place char writes, NUL termination) produced syntactically-valid but semantically-wrong JS. Functions like `hacklib.c` string helpers could pass structural safety checks yet still hang unit tests.

2. **Baseline instability**: The translator work itself created churn — tool/source-path drift, compiled-data fixture drift, broad replay regressions. This reduced the signal quality needed to validate whether translated code was correct.

3. **Upstream regressions**: One translator commit (`63975ea2`) dropped the passing session count from 28 to 2 by changing display blocking timing. The team learned that other agents pushing to `main` can break gameplay sessions, and you must always check full session count after `git pull --rebase`.

4. **Wrong leverage point**: With 68% of failing sessions tracing back to stubbed level generation (where JS consumed RNG but didn't create objects), debugging individual pet AI or combat differences was fighting symptoms. The translator was producing lots of code, but not the *right* code for the actual failure modes.

**The pivot (March 4, 2026)**: Iron Parity was declared "unsuccessful as the repository's primary execution strategy." The IRON_PARITY_PLAN.md was moved to archived-guidance mode. The team pivoted to **Operation More Needed** — direct gameplay parity burndown, fixing real divergences one at a time.

### Pivot 3: Operation More Needed — `--More--` and Session Re-recording

The next campaign, **Operation More Needed**, focused on a specific insight: many parity failures came from `--More--` prompt handling. C gameplay pauses until the player presses a key at `--More--`. The JS port was approximating this — queueing messages, batching output, suppressing some prompt events — producing timing and display divergences that cascaded.

Key changes:

1. **Sessions re-recorded**: All 42 gameplay sessions re-recorded with `record_more_spaces=true` and richer event logging (`^distfleeck`, `^movemon_turn`, `^dog_move`, etc.)
2. **Async `pline` paths**: Message display paths refactored to be async-capable so gameplay can pause exactly when C does.
3. **Erroneous C-side patch corrected**: The C harness had been auto-clearing `--More--` during replay, which changed gameplay behavior during instrumentation.
4. **Comparator simplification**: Removed col-shift compensation, pad/no-pad fallback matching, and other heuristics that hid real bugs.

This moved the team from ~124/150 to a stable base for the final burndown.

---

## The Burndown: From 124/150 to 151/151

### Phase 4A: Broad Session Coverage (Feb 24 – Mar 5)

The first push focused on getting more sessions green through systematic C-faithful fixes. The commit history shows dense activity: ~500 commits in this window.

**Major fix categories:**

1. **Level generation parity**: `fill_ordinary_room` amulet gates, niche trap/object placement, grave headstone engravings, bubble bounds, hole/trapdoor destinations. The key lesson: *"Port large-scale logic before entering bug burndown."* When 13/19 failing sessions trace back to stubbed level-gen, fixing individual AI bugs is fighting symptoms.

2. **Monster movement and pet AI**: Pet AI (`dog_move` in `dogmove.c`) was called "the final boss of RNG parity" in the LORE. A single missed RNG call in pet decision-making cascades through every subsequent turn. Fixes included:
   - `mfndpos` pet occupied-square gating
   - `m_search_items` intent filtering (M2_COLLECT vs M2_GREEDY)
   - `dochug` phase ordering (wield gate, scared gate, noattacks check)
   - `mattacku` combat semantics (multi-attack sequencing, knockback)
   - `thrwmu` retreat gating using pre-command hero position
   - Monster trap migration (`MMOVE_DIED` status codes)

3. **Command handler fidelity**: Every `getobj`-style command handler needed PICK_ONE overlay menu support. The JS `renderOverlayMenuUntilDismiss` consumed non-matching keys silently; C's menu reads one key and exits. Fifteen command handlers were fixed: read, quaff, zap, eat, wear, puton, takeoff, remove, fire, engrave, quiver, adjust, call, throw, wield.

4. **`--More--` boundary ordering**: Trapdoor fall messages needed to defer post-turn processing to the dismissal key step. Combat messages needed separate `pline` calls (not string concatenation) to allow `--More--` gating. Erosion messages needed verbose follow-up lines.

5. **State initialization**: `regen_hp` encumbrance gate, `player.umoved` reset per turn, `owornmask` sync in equip paths, `acurr()` vs raw attribute reads, `adj_abon` writing to `abon[]` not `attributes[]`.

**Progress during this period:**
- 124/150 → 135/150 → 136/150 (broad sessions)
- seed306: step 71 → step 105 → step 115 → full green
- seed311: fixed by `weapon_hit_bonus` P_NONE special case
- seed302: `rng 2922→6041→7901` via trapdoor fall + deferred goto
- seed322: deep campaign through zombify timeout, erosion timing, passive rust

### Phase 4B: Constant Canonicalization Campaign (Mar 7-8)

A focused effort on constants proved highly effective. The codebase had accumulated redundant and inconsistent constant definitions across dozens of files:

1. **`PM_*` dual constants**: `const.js` exported `PM_KNIGHT=4` (role array indices 0-12), while `monsters.js` exported `PM_KNIGHT=335` (monster table indices 331-343). Wrong import source = dead code that never matches. This was identified as one of the most insidious bugs: code that looks correct but silently never triggers.

2. **`_CLASS` values**: `_CLASS` constants in `const.js` were 0-16, but C values are 1-17. This caused widespread misclassification. `MAXMCLASSES` was 34 instead of C's 61.

3. **`ROCK_CLASS` dual constants**: `objects.js` exports `ROCK_CLASS=13`, `const.js` exports `ROCK_CLASS=14`. Object data uses 13.

4. **Stale hardcoded indices**: Files had hardcoded class indices (like `obj.oclass === 4` instead of `WEAPON_CLASS`) that silently broke when constants were corrected.

The fix campaign (`gen_symbols.py` wired to emit C-canonical constants, `PM_CAVEMAN→PM_CAVE_DWELLER`, `PM_PRIEST→PM_CLERIC`) recovered 207 unit tests (2925→3134 passing) and fixed ~12 latent ReferenceError bugs.

**The lesson**: Constants seem boring, but inconsistent constants are silent killers. A function that checks `otyp === PM_KNIGHT` using the wrong import will compile, run, and silently never match, causing behavioral divergence that's extremely hard to diagnose from RNG traces.

### Phase 4C: The Final Three Seeds (Mar 5-9)

The last frontier was three "manual-direct" sessions — `seed031`, `seed032`, `seed033` — recorded by a human player making real gameplay decisions. These were harder than selfplay sessions because human play exercises more diverse code paths (container looting, reading scrolls, travel commands).

**seed031**: Fixed by `#loot` take-out menu key-capture (container `o` handling) + findtravelpath GUESS-mode fixes. The container bug was consuming unrelated future gameplay keys. The findtravelpath fixes addressed four BFS bugs: hero cell initialization, distance metric (TARGET-relative, not hero-relative), missing visited-check oscillation guard, and parentIsTarget against original target.

**seed032**: Fixed by the same findtravelpath GUESS-mode fixes + `find_offensive`/`use_offensive` pre-attack check in `mattacku`. Advanced from failing to passing alongside seed031.

**seed033**: The most stubbornly difficult session. Progress was measured in RNG index increments:
- Step 470 index 6510 → step 471 index 6660 (BFS tiebreaking fix)
- → step 935 index 10774 (savedRun fix, travelcc clearing)
- → step 942 index 11291 (dotravel cursor, confdir fix)
- → step 1398 index 14811 (getobj PICK_ONE menu, dochug fixes)
- → 14973/14973 = 100% RNG match (various cursor/display fixes)

Even with 100% RNG match, seed033 failed on **mapdump** — a level-state checkpoint comparison. This revealed three mapdump encoding bugs:
1. **W section (wall_info)**: C's `rm` struct uses a union where `wall_info`, `doormask`, `stairdir` alias the same bits. JS stores them separately. The mapdump encoder wasn't reading `loc.wall_info` at all for IS_STWALL cells.
2. **Q section (object details)**: `obj.where` in JS is the string `'OBJ_FLOOR'`, not the number `1`. And `chest.olocked = !rn2(6)` was wrong — C source has `!!(rn2(6))` (locked 5/6 of the time), not `!rn2(6)` (locked 1/6 of the time). A single `!` vs `!!` difference.
3. **J section (trap details)**: `makeniche()` was missing `ttmp.once = 1` for non-ROCKTRAP niche traps.

---

## What Worked

### 1. The "Chase First Divergence" Methodology

The single most effective strategy. Every debugging session started by finding the first mismatch in the first channel, reading the C source for that exact call site, and implementing a faithful fix. Later mismatches are almost always cascades. This is stated as Cardinal Rule #3 in the LORE: *"Chasing divergence #47 when divergence #1 is unsolved is like fighting the Wizard of Yendor while the Riders watch — dramatic, but unproductive."*

### 2. Strict No-Masking Policy

The non-negotiable rule against comparator masking forced every fix to be a real behavioral correction. This was painful — many times it would have been easier to add a comparator exception — but it meant every green session was genuinely green, building confidence incrementally.

### 3. Incremental, Evidence-Backed Fixes

Small commits with immediate session validation. The commit messages tell the story: each includes the session name, the step/index numbers before and after, and what changed. Example: *"seed302 improved: rng 6041→7901, screens 106→166, events 858→2134."* This made regressions immediately detectable and bisectable.

### 4. Event Parity as a Bug Finder

Adding `^event` annotations (monster death, pickup, drop, corpse creation, trap creation, engraving wipe) to both C and JS RNG streams exposed real behavioral gaps that RNG alone didn't make obvious. In seed113, driving event sequence parity directly led to full RNG parity. The LORE records: *"Full RNG parity can still hide real behavioral gaps; event-stream mismatches often expose missing state transitions that RNG alone does not make obvious."*

### 5. `dbgmapdump` Tool

The mapdump comparison tool, built late in the campaign, proved essential for the final seed033 push. Section-aware state diffs (`T/F/H/L/R/W/U/A/O/Q/M/N/K/J/E`) pinpointed exact field-level differences that RNG traces couldn't localize. Without it, the `!` vs `!!` chest-lock bug and the missing `trap.once` assignment would have been extremely hard to find.

### 6. Constant Canonicalization

The focused constants campaign (Mar 7-8) was high-ROI: systematic rather than reactive, it found entire classes of bugs (dual PM_* constants, wrong _CLASS values, stale hardcoded indices) that would have surfaced as mysterious behavioral divergences later.

### 7. Re-recording Sessions

When C-side capture timing artifacts were suspected, re-recording with the latest harness eliminated false failures without changing game logic. The LORE records multiple cases where re-recording was the correct resolution (seed307, seed204).

---

## What Didn't Work

### 1. Operation Iron Parity (Batch Autotranslation)

The most significant failed strategy. The translator infrastructure was substantial (dozens of commits, policy manifests, safety linting, batch stitching modes), but it produced code that was syntactically correct yet semantically wrong for string/pointer patterns, and the churn it created destabilized the baseline. It was retired as the primary execution strategy on March 4.

**The lesson**: Mechanical translation is a force multiplier when the target state is stable, but it's counterproductive when the baseline is unstable. The translator produced quantity without quality assurance, and each batch stitch risked broad regressions. The project ultimately succeeded through careful, manual, C-source-guided fixes.

### 2. "Close Enough" Stubs

Early in the port, many subsystems were stubbed — consuming the right RNG calls without creating actual game objects or performing full logic. This created an illusion of parity that made individual bugs harder to diagnose. The LORE records: *"When 13 of 19 failing sessions trace back to stubbed level generation, debugging individual pet AI or combat differences is fighting symptoms."*

### 3. replay_core.js Complexity

The early approach of making the replay engine match C step boundaries grew to 1,700 lines of complexity. This was architectural debt that obscured real bugs behind boundary-matching artifacts. The fix was separating game orchestration from comparison — one `run_command()` function used by both browser and tests.

### 4. Bulk `d()` → `c_d()` Conversion

An attempt to convert all `d()` calls (Lua-style, logging individual dice) to `c_d()` calls (C-style, logging composite results) across 20 files caused a regression from 28 to 2 passing sessions and was immediately reverted. The lesson: `d()` and `c_d()` have different RNG logging semantics, and bulk conversion removes entries from the JS stream that the comparator expects.

### 5. Heuristic Comparator Patches

Early comparator code included col-shift compensation, pad/no-pad fallback matching, and other heuristics designed to tolerate rendering differences. These hid real coordinate bugs and created false mixed-row shifts. Removing them (commits `e2deeac2`, `48535727`, `08da1fac`) improved signal quality.

---

## Why It Took So Long

### 1. The Cascade Problem

NetHack's RNG-deterministic architecture means one missed `rn2(100)` anywhere shifts every subsequent random decision. Debugging requires tracing through thousands of calls to find the one that's wrong. A combat miss that should have been a hit changes whether a monster drops a corpse, which changes whether a pet paths toward food, which changes the pet's position next turn, which changes 50 subsequent RNG calls. The surface symptom may appear hundreds of turns after the root cause.

### 2. The Breadth of NetHack

NetHack 3.7.0 has ~5,000 C functions across dozens of files. The CODEMATCH tracker at the start of Phase 4 showed 3,242 missing function rows. Even with the focused burndown strategy, each divergence could lead into any subsystem: combat, pet AI, level generation, inventory management, shopkeeper behavior, trap handling, special levels, spell casting, prayer, polymorph...

### 3. Union Types and Encoding Differences

C's `struct rm` uses unions where multiple field interpretations share the same bits. JS separates these into distinct properties. This creates a constant translation challenge: code that reads `rm->flags` in C may need to read `loc.flags`, `loc.wall_info`, `loc.doormask`, or `loc.stairdir` in JS depending on the cell type. The mapdump encoding bugs that blocked the final seed033 were exactly this class of problem.

### 4. Human vs. Machine-Generated Sessions

Selfplay sessions exercise predictable code paths. Manual-direct sessions, recorded by a human player, exercise diverse paths: container looting, scroll reading, travel commands, count prefixes. The final three sessions (seed031/032/033) were all manual-direct and required fixes to code paths that selfplay never reached.

### 5. Async/Sync Boundary

C blocks synchronously at `--More--` and `getline()`. JS must use `async/await`. This means every code path that can block must be async, and the entire call chain above it. Missing a single `await` can cause the game to proceed past a `--More--` prompt without waiting, consuming the next gameplay key as a dismissal instead.

---

## By The Numbers

- **Total commits (Feb 1 – Mar 9)**: ~3,964
- **Commits per period**: Feb 1-15: ~2,000; Feb 15-Mar 1: ~660; Mar 1-4: ~386; Mar 4-6: ~386 (most intense); Mar 6-8: ~496; Mar 8-9: ~228
- **Session progress**: 124/150 → 135/150 → 136/150 → 149/151 → 150/151 → 151/151
- **Seed033 RNG progress**: index 6510 → 6660 → 10774 → 11291 → 14811 → 14973/14973 (100%)
- **Unit tests recovered by constant canonicalization**: 207 (2925→3134)
- **CODEMATCH function rows resolved**: >1,000 during Phase 4
- **getobj command handlers fixed**: 15

---

## The Team

Phase 4 was executed by a team of Claude AI agents (labeled `agent:ux`, `agent:game`, `agent:mazes` by working directory) coordinated by a human engineer. The agents worked on the same `main` branch, pushing validated increments. The human provided strategic direction, resolved cross-agent conflicts, and made pivot decisions (like retiring Iron Parity).

---

## Key Artifacts

- **LORE.md**: 1,800+ lines of durable porting lessons, the accumulated wisdom of the campaign
- **Cardinal Rules**: (1) RNG is source of truth, (2) Read C code not comments, (3) Follow first divergence
- **dbgmapdump.js**: Section-aware state comparison tool
- **session_test_runner.js**: Authoritative parity metrics per session
- **rng_step_diff.js**: First-divergence window inspection
- **CODEMATCH.md**: Function-level coverage tracker (C functions → JS implementations)
- **IRON_PARITY_PLAN.md**: Archived translator strategy (instructive failure)
- **MORE_NEEDED_CAMPAIGN.md**: The successful pivot campaign

---

## Validation Checkpoint (2026-03-09)

Post-milestone validation on `main`:
- Session tests: `151/151` passing (gameplay `34/34`, special `50/50`, selfplay `67/67`)
- Unit tests: `3345/3345` passing

---

## Exit State

Commit `48a9f0da` (March 9, 2026): **151/151 sessions passing**, all channels green.

The methodology that got us here — chase first divergence, no comparator masking, incremental evidence-backed fixes, explicit C-source audits — is documented and repeatable. Future parity work (new sessions, new features, new seeds) can follow the same playbook.

*You ascend the stairs. The Mazes of Menace stretch out before you — but for the first time, they look the same in every mirror.*
