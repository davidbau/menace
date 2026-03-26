# C Harness Patch Reorganization

## Purpose

This document is the cleanup spec for the `test/comparison/c-harness/patches/`
series that is applied by `test/comparison/c-harness/setup.sh`.

The current patch directory reflects historical debugging order rather than
clean architecture. Multiple concerns are interleaved, several patches overlap
heavily in `src/rnd.c`, `src/cmd.c`, `src/allmain.c`, and TTY files, and the
numbering is no longer a reliable guide to dependency order.

The goal of the rewrite is:

1. Preserve harness behavior exactly.
2. Reorganize patches by theme, not debugging chronology.
3. Keep deterministic gameplay-affecting changes separate from test hooks.
4. Keep core recording/testability hooks separate from optional diagnostics.
5. Make the resulting patch series parse-clean and easy to maintain.

## Sources Examined

The current reorganization plan is based on:

1. Direct `git diff` against `nethack-c/`.
2. The patch application model in [setup.sh](/share/u/davidbau/git/mazesofmenace/game/test/comparison/c-harness/setup.sh).
3. The existing patch inventory under `test/comparison/c-harness/patches/`.

## Current Problems

The current series has these structural issues:

1. Theme mixing:
   deterministic runtime changes, recorder hooks, and deep-debug logging are
   interleaved.
2. Overlap hot spots:
   `src/rnd.c`, `src/cmd.c`, `src/allmain.c`, `src/nhlua.c`,
   `win/tty/wintty.c`, and `win/tty/topl.c` are modified by many patches.
3. Numbering drift:
   there are duplicate logical numbers (`011`, `032`) and gaps.
4. Patch-format drift:
   some files were manually edited enough that hunk metadata and grouping have
   become fragile.
5. Semantic ambiguity:
   some patches are true behavior changes for determinism, while others are
   pure observability. They should not be reviewed or validated the same way.

## Behavioral Classification

These are the accumulated changes grouped by intent.

### A. Deterministic Reproducibility

These are the smallest set of changes that alter C runtime behavior in support
of reproducible recording.

1. Fixed RNG seed via `NETHACK_SEED` in `sys_random_seed()`.
2. Fixed wall-clock time via `NETHACK_FIXED_DATETIME` in `getnow()`.
3. `ubirthday` routed through `getnow()` in `u_init.c`.
4. Lua `math.randomseed()` seeded from `NETHACK_SEED`.
5. Deterministic replacement for libc `qsort()`.
6. Compiler pin to `clang` in `setup.sh`.
7. Optional suppression of the wizard-only "very tricky wizard" message for
   deterministic replay.

Notes:

1. Items 1-5 are true NetHack source modifications.
2. Item 6 is not a NetHack patch; it belongs in harness build/setup policy.
3. Item 7 is a visible-output behavior change, but it exists solely to remove
   replay noise and should be reviewed alongside the determinism tier.

### B. Core Testability And Recording

These changes add recording hooks or deterministic capture facilities but
should not change gameplay logic.

1. Automatic checkpoint emission around level generation and special-level
   finalize points.
2. Key logging in `tty_nhgetch()`.
3. Optional animation delay suppression via `NETHACK_NO_DELAY`.
4. NOMUX shadow-framebuffer capture.
5. Base RNG logging.
6. Lua caller-context propagation into RNG logs.
7. Runstep/key-step metadata that ties logs back to replay step identity.

Notes:

1. RNG logging belongs here, not in the deep-debug tier, because replay and
   parity tooling fundamentally depend on it.
2. Delay suppression is not gameplay logic; it is a capture/runtime aid.
3. NOMUX is capture infrastructure and should stay isolated from unrelated
   display diagnostics.
4. `#dumpmap`, `#dumpobj`, and manual `#dumpsnap` are intentionally excluded
   from the clean canonical stack because keystroke-entered probing perturbs
   event ordering and should not be part of parity-grade validation.

### C. Debugging And Differential Diagnostics

These are optional or parity-debug-oriented diagnostics. They should be the
last tier in the series.

1. Mid-level entry/exit tracing (`midlog_*` plus macro wrappers).
2. Generic `event_log()` infrastructure.
3. Object/monster/trap/engraving lifecycle event logs.
4. Dog AI diagnostic logs.
5. `mcalcmove` and monster movement logs.
6. `test_move` event logs.
7. `runstep` state logs.
8. Display-RNG logs (`~drn2`).
9. Repaint trace logs.
10. Repaint debug logs and step-keyed repaint debug context.
11. Experience trace logs.
12. Fog/cloud trace logs.
13. Catchup trace logs.
14. Cosmic display ownership/newsym/maploc/menu logs.

Notes:

1. Many of these are useful, but they should be clearly separable from the
   minimum harness needed for recording and parity replay.
2. The cosmic logs are the deepest and most specialized observability tier and
   should be last.

## Direct Diff Inventory

The current direct `nethack-c/` working-tree changes touch:

1. `sys/unix/unixmain.c`
2. `src/calendar.c`
3. `src/u_init.c`
4. `src/nhlua.c`
5. `src/hacklib.c`
6. `src/rnd.c`
7. `include/extern.h`
8. `include/hack.h`
9. `src/cmd.c`
10. `src/mklev.c`
11. `src/sp_lev.c`
12. `win/tty/wintty.c`
13. `src/allmain.c`
14. `src/detect.c`
15. `src/do.c`
16. `src/dogmove.c`
17. `src/end.c`
18. `src/engrave.c`
19. `src/hack.c`
20. `src/makemon.c`
21. `src/mhitu.c`
22. `src/mkmaze.c`
23. `src/mkobj.c`
24. `src/mkroom.c`
25. `src/mon.c`
26. `src/monmove.c`
27. `src/mthrowu.c`
28. `src/steal.c`
29. `src/trap.c`

Additional behavior present only in patch files, not in the direct working
tree diff, currently includes:

1. `win/tty/topl.c` repaint/more-key instrumentation.
2. `win/tty/termcap.c` delay suppression.
3. `src/display.c`, `include/display.h`, `src/potion.c` cosmic display logs.
4. `src/dog.c` catchup trace.
5. `src/region.c` fog/cloud trace support.

## Proposed Clean Series

The rewritten series should be renumbered from scratch and grouped like this.

### Tier 1: Determinism

`001-deterministic-runtime.patch`

1. `sys/unix/unixmain.c`
2. `src/calendar.c`
3. `src/u_init.c`
4. `src/nhlua.c`
5. `src/end.c`

Contents:

1. `NETHACK_SEED`
2. `NETHACK_FIXED_DATETIME`
3. `ubirthday = getnow()`
4. Lua `math.randomseed()` from harness seed
5. deterministic replay suppression of the wizard-only message

`002-deterministic-qsort.patch`

1. `include/extern.h`
2. `include/hack.h`
3. `src/hacklib.c`

Contents:

1. `nh_deterministic_qsort()`
2. `qsort` macro override

Non-patch harness companion:

1. Keep the `clang` requirement in `setup.sh`.
2. Do not try to encode compiler policy inside a NetHack source patch.

### Tier 2: Core Harness Capture

`003-rng-log-core.patch`

1. `include/extern.h`
2. `include/hack.h`
3. `src/rnd.c`
4. `sys/unix/unixmain.c`

Contents:

1. `rng_log_init`
2. caller macros
3. `rng_log_write`
4. `rng_log_get_call_count`

`004-rng-log-lua-context.patch`

1. `src/nhlua.c`

Contents:

1. Lua stack introspection for RNG caller attribution

`006-checkpoint-autodump.patch`

1. `src/mklev.c`
2. `src/mkmaze.c`
3. `src/sp_lev.c`
4. `src/cmd.c`
5. `include/extern.h` if required by the final auto-only helper layout

Contents:

1. env-driven or silent `harness_dump_checkpoint()`
2. JSON escaping helpers
3. automatic checkpoint emission around generation/finalization
4. no keystroke-entered command surface
5. do not include `#dumpmap` / `#dumpobj`

`007-input-keylog.patch`

1. `src/cmd.c`
2. `win/tty/wintty.c`

Contents:

1. `NETHACK_KEYLOG`
2. `NETHACK_KEYLOG_DELAY_MS`

`008-no-delay-capture.patch`

1. `win/tty/termcap.c`
2. `include/unixconf.h` if the macOS timed-delay guard is still needed

## Verification Status

Current validation against `seed031_manual_direct.session.json`:

1. The clean stack builds successfully through
   [setup-clean.sh](/share/u/davidbau/git/mazesofmenace/game/test/comparison/c-harness/setup-clean.sh).
2. Current tmux rerecord vs legacy fixture:
   - same step count: `1366`
   - same checkpoints: `4`
   - `events`, `typgrid`, `topline`, `status`, and `messages` match
   - remaining `rng` differences examined so far are caller line-number drift
     only, for example:
     - `u_init_misc(u_init.c:1027)` vs `u_init_misc(u_init.c:1026)`
     - `moveloop_core(allmain.c:240)` vs `moveloop_core(allmain.c:286)`
     - `dochug(monmove.c:924)` vs `dochug(monmove.c:928)`
   - remaining `screen` / `cursor` drift is terminal-surface formatting
     (prompt reset placement and DEC graphics reset placement), not event/state
     drift
3. Current tmux rerecord vs current NOMUX rerecord:
   - same step count: `1366`
   - same checkpoints: `4`
   - `rng`, `events`, `typgrid`, `topline`, `status`, and `messages` now match
   - the previous NOMUX-selected-menu seam (`q * do nothing`) was fixed by
     mirroring the selected marker into the NOMUX framebuffer
   - the previous late NOMUX RNG-loss seam was fixed by waiting for RNG-log
     settle before NOMUX capture
   - remaining `screen` / `cursor` drift is limited to terminal encoding
     representation such as ANSI color placement and `\x0e` / `\x0f` DEC
     graphics boundaries

Practical conclusion:

1. The clean patch stack now preserves the substantive replay surface for
   `031`.
2. Remaining non-identity is capture-format noise, not gameplay/event/state
   divergence.

Contents:

1. `NETHACK_NO_DELAY`
2. `WEBHACK_NO_DELAY`
3. flush-before-return behavior for no-delay mode

`009-nomux-capture.patch`

1. `include/wintty.h`
2. `win/tty/termcap.c`
3. `win/tty/wintty.c`
4. `win/tty/topl.c`
5. any other NOMUX support files required by the final version

Contents:

1. shadow framebuffer
2. direct screen serialization
3. cursor capture

`010-runstep-step-context.patch`

1. `src/allmain.c`
2. any files exporting repaint debug step accessors

Contents:

1. runstep state/event logging that is foundational for replay step identity
2. step index/path/key accessors used by later repaint debug patches

### Tier 3: Diagnostics

`011-midlog-core.patch`

1. `include/extern.h`
2. `include/hack.h`
3. `src/rnd.c`
4. files that define `MIDLOG_IN_*`
5. files that manually wrap early-return functions

Contents:

1. `midlog_enter/exit_*`
2. wrapper macros
3. targeted explicit wrappers where macros are insufficient

`012-event-log-core.patch`

1. `include/extern.h`
2. `src/rnd.c`

Contents:

1. `event_log()`

`013-world-event-hooks.patch`

1. `src/allmain.c`
2. `src/engrave.c`
3. `src/makemon.c`
4. `src/mkobj.c`
5. `src/mon.c`
6. `src/steal.c`
7. `src/trap.c`

Contents:

1. object/monster/trap/engraving lifecycle events
2. movement allocation event if still useful

`014-dog-ai-diagnostics.patch`

1. `src/dogmove.c`
2. `src/monmove.c` if dog-related movement hooks remain there

Contents:

1. dog goal
2. dog inventory decisions
3. dog movement entry/exit
4. eat traces

`015-monmove-and-testmove-diagnostics.patch`

1. `src/monmove.c`
2. `src/hack.c`
3. `src/do.c`
4. `src/allmain.c` if `mcalcmove` logs remain separate

Contents:

1. `m_move`
2. `mcalcmove`
3. `test_move`
4. safety-prevention or occupation logs if still useful

`016-repaint-trace.patch`

1. `include/extern.h`
2. `src/rnd.c`
3. `src/display.c`
4. `src/botl.c`
5. `win/tty/topl.c`
6. `win/tty/wintty.c`

Contents:

1. `repaint_log()`
2. display/bot/more/yn/mark instrumentation

`017-repaint-debug-step-context.patch`

1. `include/extern.h`
2. `src/rnd.c`
3. `win/tty/wintty.c`
4. any file that exports step-index accessors

Contents:

1. `repaint_debug_log()`
2. step/path/key tagging
3. more-key-return diagnostics

`018-exp-trace.patch`

1. `include/extern.h`
2. `src/rnd.c`
3. `src/exper.c`
4. `src/do.c`
5. `src/hack.c`
6. `src/mon.c`

Contents:

1. `exp_log()`
2. experience/level-up trace points

`019-fog-catchup-trace.patch`

1. `src/dog.c`
2. `src/monmove.c`
3. `src/region.c`

Contents:

1. monster catchup trace
2. fog cloud trace
3. region creation trace

`020-cosmic-display-logs.patch`

1. `include/display.h`
2. `include/extern.h`
3. `src/display.c`
4. `src/potion.c`
5. `src/rnd.c`
6. `win/tty/wintty.c`

Contents:

1. cosmic owner stack
2. newsym/maploc ownership logs
3. menu show/draw/hide/erase logs
4. display RNG ownership correlation

## Old-To-New Mapping

This is the intended migration map from the current historical series.

1. `001-deterministic-seed.patch` -> `001-deterministic-runtime.patch`
2. `002-fixed-datetime-for-replay.patch` -> `001-deterministic-runtime.patch`
3. `011-fix-ubirthday-with-getnow.patch` -> `001-deterministic-runtime.patch`
4. `013-suppress-tricked-message.patch` -> `001-deterministic-runtime.patch`
5. `006-deterministic-qsort.patch` -> `002-deterministic-qsort.patch`
6. `004-prng-logging.patch` -> `003-rng-log-core.patch`
7. `010-lua-rnglog-caller-context.patch` -> `004-rng-log-lua-context.patch`
8. `003-map-dumper.patch` -> retired from canonical series
9. `005-obj-dumper.patch` -> retired from canonical series
10. `008-checkpoint-snapshots.patch` -> `006-checkpoint-autodump.patch` with
    the keystroke-entered command path removed
11. `017-auto-mapdump.patch` -> `006-checkpoint-autodump.patch` only if the
    final env-driven autodump path remains parity-safe after review; otherwise
    retire it
12. `007-keylog-input-tracing.patch` -> `007-input-keylog.patch`
13. `019-suppress-animation-delays.patch` -> `008-no-delay-capture.patch`
14. `011-disable-timed-delay-macos.patch` -> `008-no-delay-capture.patch`
15. `032-nomux-capture.patch` -> `009-nomux-capture.patch`
16. `021-runstep-events.patch` -> `010-runstep-step-context.patch`
17. `009-midlog-infrastructure.patch` -> `011-midlog-core.patch`
18. `012-event-logging.patch` -> `012-event-log-core.patch`
19. `014-dog-move-logging.patch` -> `014-dog-ai-diagnostics.patch`
20. `016-dog-distfleeck-events.patch` -> `014-dog-ai-diagnostics.patch`
21. `018-dog-goal-tmp-at-events.patch` -> `014-dog-ai-diagnostics.patch`
22. `015-movemon-mcalcmove-logging.patch` -> `015-monmove-and-testmove-diagnostics.patch`
23. `020-test-move-events.patch` -> `015-monmove-and-testmove-diagnostics.patch`
24. `023-rng-display-logging.patch` -> `016-repaint-trace.patch` or `020-cosmic-display-logs.patch`
25. `024-repaint-trace.patch` -> `016-repaint-trace.patch`
26. `026-tty-more-key-return.patch` -> `017-repaint-debug-step-context.patch`
27. `032-step-keyed-repaint-debug.patch` -> `017-repaint-debug-step-context.patch`
28. `025-exp-trace.patch` -> `018-exp-trace.patch`
29. `029-fog-cloud-trace.patch` -> `019-fog-catchup-trace.patch`
30. `031-catchup-trace.patch` -> `019-fog-catchup-trace.patch`
31. `030-cosmic-display-logs.patch` -> `020-cosmic-display-logs.patch`

## Cleanup Rules For The Rewrite

When rewriting the series, follow these rules.

1. Do not preserve old numbering.
2. Do not preserve old patch boundaries where a cleaner thematic boundary is
   available.
3. Keep one concern per patch whenever the dependency graph allows it.
4. Prefer fewer overlapping edits to `src/rnd.c`, `src/cmd.c`, and
   `win/tty/wintty.c`.
5. Keep deterministic behavior patches first and debug patches last.
6. Keep compiler/build-policy changes in `setup.sh`, not in NetHack source
   patches.
7. Preserve the `git apply --recount` compatible unified-diff format used by
   `setup.sh`.
8. Validate both syntax and behavior:
   `git apply --check` on each patch, then full harness equivalence testing.

## Required Final Validation

After the new series is written, validation must prove behavioral equivalence.

1. Build C harness with the original patch series.
2. Record a long session such as `031-manual`.
3. Build C harness with the cleaned series.
4. Record the same session again.
5. Verify the resulting session artifacts are byte-identical, or if they are
   not byte-identical, localize and explain the exact channel drift before
   accepting the rewrite.

The cleanup is not done until the reorganized series produces the same
recording behavior as the old one.
