# REPAINT_PARITY

## Goal

Match C tty repaint ownership and timing in JS for screen-visible state:

1. status line (`bot()` / `flush_screen()`)
2. topline / `--More--` boundaries
3. prompt ownership transitions (`yn_function`, `getlin`, menu/message boundaries)

This is a diagnostic-first campaign. The purpose is to explain and fix
screen-only divergences where gameplay, RNG, and events already match.

## Why

We have repeatedly hit parity bugs where:

1. underlying gameplay state is correct
2. RNG parity is correct
3. event parity is correct
4. the visible screen still differs because JS redraws at the wrong moment

The recurring pattern is stale-vs-fresh ownership of:

- bot/status refreshes
- pending toplines
- `--More--` pages
- prompt handoff boundaries

`t11_s744_w_covmax2_gp` is the current motivating example:

1. C keeps `HP:1` visible through `You die...--More--`
2. C flips to `HP:0` only at `Die? [yn] (n)`
3. JS currently exposes `HP:0` too early

This is not a gameplay bug. It is repaint ownership mismatch.

## Scope

This campaign adds a new optional diagnostic trace class:

- `^repaint[...]`

Each entry is a midlevel repaint trace line, interleaved in the same ordered
trace stream as RNG and existing `^event[...]` entries.

Examples:

- `^repaint[flush cursor=1 hp=1 botl=1 botlx=0 time=0]`
- `^repaint[bot hp=1 botl=1 botlx=0 time=0]`
- `^repaint[more hp=1 topl=2 row=0 col=23]`
- `^repaint[yn hp=0 topl=3 query="Die?"]`

The exact vocabulary can expand, but the campaign must keep it small and
midlevel. These traces are not low-level cell diffs.

Separate debug-only owner/context traces are also allowed:

- canonical trace: `^repaint[...]`
- debug-only trace: `^repaintdbg[...]`

Debug-only traces must not be recorded into canonical session artifacts. They
exist to answer ownership questions such as:

1. which function/path emitted this repaint?
2. what topline / `messageNeedsMore` state was active?
3. was the repaint owned by prompt entry, `more()`, `flush_screen()`,
   `mark_synch()`, or status rendering?

## Non-Goals

1. Do not gate pass/fail on repaint parity immediately.
2. Do not normalize away screen mismatches by comparator tricks.
3. Do not patch sessions or rerecord broadly before the trace vocabulary is
   stable enough to be useful.
4. Do not flood traces with low-value per-cell or per-glyph noise.

## Initial Instrumentation Targets

### C

Add repaint midlevel logging for the functions that actually own visible
screen refresh:

1. `bot()`
2. `flush_screen()`
3. tty `more()`
4. `tty_yn_function()`
5. `tty_mark_synch()`

Use a dedicated `repaint_log(...)` helper and gate it on
`NETHACK_REPAINT_TRACE=1`.

For owner/context debugging, use a separate `repaint_debug_log(...)` helper
gated on `NETHACK_REPAINT_DEBUG=1`. This must write to stderr only and must
not alter canonical `^repaint[...]` output.

### JS

Add matching diagnostic hooks in the runtime paths that correspond to those C
boundaries:

1. `flush_screen(...)`
2. `renderStatus(...)`
3. `more(...)`
4. `ynFunction(...)`

These must emit `^repaint[...]` entries into the same ordered trace stream as
RNG and existing `^event[...]` entries, with comparator-side filtering keeping
repaint as a separate non-gating diagnostic channel.

For owner/context debugging, JS may emit `^repaintdbg[...]` lines under
`WEBHACK_REPAINT_DEBUG=1`, but those lines are diagnostic-only and should not
be recorded into session artifacts.

## Session Workflow

### Phase A: diagnostic-only

1. record repaint traces as `^repaint[...]` entries in the existing per-step
   trace stream
2. compare them as a separate non-gating metric
3. use first repaint divergence to localize screen-only bugs
4. use `node test/comparison/repaint_step_diff.js <session> --steps=...`
   when you need startup/step-local ordered repaint diffs without dumping the
   full session trace

### Phase B: targeted rerecord

Re-record a small focused set first:

1. `t11_s744_w_covmax2_gp`
2. a few baseline/manual gameplay sessions
3. one or two prior screen-only/stale-cell sessions

### Phase C: maintained channel

Once the vocabulary and boundary ownership are stable:

1. promote repaint parity to a maintained diagnostic channel
2. decide whether selected sessions should gate on it
3. only then consider wider rerecord of the suite

## Matching Standard

The objective is not “similar enough repaint behavior.”

The objective is:

1. same repaint event vocabulary
2. same event ordering
3. same ownership boundary for visible status/topline transitions

When repaint traces disagree, fix JS core display/runtime behavior rather than
teaching the comparator to ignore it.

## First Targets

1. wizard/discover death flow:
   - `You die...--More--`
   - `Die? [yn] (n)`
2. `--More--` boundary transitions after concatenated toplines
3. stale-cell redraw ownership after teleport/corpse/hide-under transitions

## Relationship To Existing Channels

Repaint traces are:

1. more precise than final `screen` diffs for boundary-local bugs
2. less noisy than per-cell redraw logs
3. orthogonal to RNG/events/mapdump

## Debug Scope

When owner tags are still ambiguous, use debug-only caller scope:

1. JS: `WEBHACK_REPAINT_DEBUG=1`
2. C: `NETHACK_REPAINT_DEBUG=1`

Current C debug scope support includes `pline.vpline`, which makes it possible
to distinguish message preflushes from later `more()`-adjacent repaint work
without changing canonical `^repaint[...]` traces.

Use them when:

1. RNG/events already match
2. first divergence is visible output only
3. the real question is “when did C make this state visible?”
