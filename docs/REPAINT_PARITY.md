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

## Tools

The repaint campaign is only useful if people can answer boundary questions
quickly.  For `--More--` and prompt-ownership bugs, use these tools in this
order.

### 1. Headline localization

Start by identifying whether the first meaningful divergence is:

1. gameplay (`rng` / `event`)
2. visible output only (`screen` / `cursor`)
3. a cross-step boundary drift where totals are conserved but work moved to a
   later or earlier gameplay step

Useful commands:

```bash
node test/comparison/session_test_runner.js --verbose <session>
node scripts/pes-report.mjs
```

### 2. Step-boundary ownership summary

Use the step-boundary summary first when the question is:

- “which gameplay step owns this pending `--More--`?”
- “did JS finish this step earlier than C?”
- “is the next key being admitted before a pending message boundary is done?”

Command:

```bash
node scripts/step-boundary-context.mjs <session> --step <N> --window 2
```

This is usually the fastest way to see:

1. the step key
2. whether the step is tagged `[more-dismiss: ...]`
3. whether `messageNeedsMore` / `topMessage` are still active
4. whether C and JS are redistributing work across adjacent steps

### 3. Ordered event/RNG comparison

When the step summary says “same family of work, wrong step ownership,” drill
into the ordered streams:

```bash
node scripts/comparison-window.mjs <session> --channel rng --view filtered-raw --raw-step
node scripts/comparison-window.mjs <session> --channel event --view normalized
```

Use this when you need to answer:

1. what is the first ordered entry that moved?
2. did `^more_key` / `^more_return` happen before or after monster/pet tail?
3. is the issue repaint-only, or did gameplay ownership drift too?

### 4. Repaint-only ordered diff

When RNG/events already match and only visible timing is wrong:

```bash
node test/comparison/repaint_step_diff.js <session> --steps=<N>
```

Use this to compare:

1. `^repaint[...]` event ordering
2. prompt entry versus `more()` versus `flush_screen()` ownership
3. status-line redraw timing

### 5. JS-side boundary tracing

For JS-side “is `more()` taking my keys?” debugging, use the targeted debug
traces:

1. `WEBHACK_REPAINT_DEBUG=1`
   - emits `^repaintdbg[...]` owner/context information
2. `WEBHACK_MORE_TRACE=1`
   - emits stderr diagnostics for `more()` enter/key/return
3. `WEBHACK_MORE_TRACE_STEP=<N>`
   - restricts the `more()` trace to one gameplay step

Typical usage:

```bash
WEBHACK_MORE_TRACE=1 WEBHACK_MORE_TRACE_STEP=1055 \
node test/comparison/session_test_runner.js --verbose <session>
```

This is the best direct JS tool for questions like:

1. did `more()` actually start waiting here?
2. which step finally produced the dismiss key?
3. did `more()` return in the same gameplay step or much later?

### 6. C-side owner trace

For C truth, use repaint debug logs:

1. `NETHACK_REPAINT_DEBUG=1`
2. rerecord through the C harness
3. read the emitted `<output>.repaintdbg.log`

For keylog-backed sessions, the harness path is now:

```bash
python3 test/comparison/c-harness/keylog_to_session.py ...
```

and it forwards repaint-debug settings into the C binary and copies the log to:

```text
<output>.repaintdbg.log
```

Important owner lines for `--More--` debugging:

1. `owner=tty.topl.more.await`
2. `owner=tty.topl.more.key`
3. `owner=tty.topl.more.return`
4. `owner=tty.topl.update_topl.pre_more`
5. `owner=tty.topl.update_topl.concat_fit`

Those are the authoritative C answers to:

1. when did tty start waiting?
2. which key dismissed the wait?
3. when did tty return from `more()`?
4. was the boundary caused by concat overflow or a fresh topline?

## `--More--` Ownership Workflow

Use this workflow when the question is “is `more()` taking my keys?” or “which
step owns the pending message?”

### A. Establish whether the bug is really a `more()` bug

Do not assume a visible `--More--` marker means the bug is in `more()`.
Often the real bug is earlier:

1. JS entered a prompt/message path too early
2. JS returned to the command boundary too early
3. monster or pet tail work got redistributed across steps

Start with:

```bash
node scripts/step-boundary-context.mjs <session> --step <N> --window 3
```

If C and JS are already doing different gameplay work before any `^more_key`,
fix gameplay ownership first.

### B. Compare JS `more()` timing directly

Run the JS trace on the suspicious corridor:

```bash
WEBHACK_MORE_TRACE=1 WEBHACK_MORE_TRACE_STEP=<N> \
node test/comparison/session_test_runner.js --verbose <session>
```

Read these in order:

1. `[MORE step=N] enter ...`
2. `[MORE step=M] key ...`
3. `[MORE step=M] return ...`

Interpretation:

1. `enter` with no later `key/return`
   - JS entered the boundary but never dismissed it during the inspected
     corridor
2. `enter` at step `N`, `key/return` at step `N+1`
   - normal one-step delayed dismissal pattern
3. `enter` at step `N`, `key/return` much later
   - strong sign that JS let unrelated outer-loop work or fresh commands
     advance while the old message stayed pending

### C. Compare the C owner path

Rerecord the same corridor with:

```bash
NETHACK_REPAINT_DEBUG=1 python3 test/comparison/c-harness/rerecord.py <session>
```

or directly through `keylog_to_session.py` for keylog sessions.

Then inspect:

```bash
rg 'tty\\.topl\\.more\\.(await|key|return)|tty\\.topl\\.update_topl' <output>.repaintdbg.log
```

This tells you whether C:

1. blocked in `more()` immediately
2. returned from `more()` before later monster/pet/timed-turn work
3. never called `more()` there at all, meaning JS is blocking too early

### D. Decide where to fix it

Use these rules:

1. If JS enters `more()` and C does not:
   - fix the message/prompt owner that called `more()`
   - do not patch replay
2. If both enter `more()`, but JS returns much later:
   - fix outer-loop ownership around that boundary
   - do not change key comparators
3. If both return at the same point, but screen state still differs:
   - fix repaint ownership (`flush_screen`, `bot`, cursor, prompt entry)

## Current Relevant Signals

For modern `--More--` debugging, the most relevant signals are:

1. `topMessage`
2. `messageNeedsMore`
3. `messageNeedsMoreBoundary`
4. `moreMarkerActive`
5. `display.toplin`
6. C `tty.topl.more.await/key/return`
7. JS `WEBHACK_MORE_TRACE` enter/key/return

If a report about a `more()` bug does not mention at least some of those, it
is usually still too vague.

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

## Practical Notes

1. For keylog-backed sessions, `rerecord.py` may route through
   `keylog_to_session.py` rather than `run_session.py`.  Repaint-debug support
   must exist on that path too.
2. Do not debug `more()` ownership by changing `js/replay_core.js`.
   If `more()` is taking the wrong keys, the fix belongs in:
   - prompt ownership
   - message ownership
   - or outer-loop boundary ownership
3. Keep JS debug traces diagnostic-only.  Do not commit `WEBHACK_MORE_TRACE`
   output into session artifacts.
4. Prefer short focused rerecords or truncated keylogs when validating the C
   debug log pipeline before attempting a full long session.
