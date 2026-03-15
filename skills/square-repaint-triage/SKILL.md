---
name: square-repaint-triage
description: Use watched-cell repaint tracing when a parity bug is localized to one screen square and you need the runtime write order for that exact terminal cell across a short step range.
---

# Square Repaint Triage

Use this after first divergence is already localized and the remaining question
is runtime repaint order for one terminal cell.

Read [`docs/SQUARE_REPAINT_TRACE.md`](/share/u/davidbau/git/mazesofmenace/mazes/docs/SQUARE_REPAINT_TRACE.md)
for the exact command syntax and guardrails.

## When To Use

Use it when:

1. RNG/events already match, or the visible bug is clearly local
2. `dbgmapdump` has narrowed the issue to one square or a tiny cluster
3. you need to know which runtime write last touched the bad cell

Do not use it as a first-pass localization tool. Use:

1. `session_test_runner`
2. `dbgmapdump`
3. repaint traces

first.

## Core Command

```bash
node scripts/debug/repaint_square_trace.mjs <session.json> --cell <col,row> --steps <from-to> --stack
```

This uses the real active display runtime:

1. [`js/headless.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/headless.js)
   during parity/session replay
2. [`js/display.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/display.js)
   during browser/runtime debugging

## Interpretation

- `kind=write`: a changed cell payload was written
- `prev=... next=...`: the visible overwrite happened here
- `kind=cursor`: cursor ownership moved onto the watched cell
- `caller=...`: use this to identify the owning runtime path

## Standard Workflow

1. find first bad screen step
2. capture nearby settled state with `dbgmapdump`
3. watch the exact bad screen cell over `step-1 .. step+1`
4. identify the final wrong writer
5. fix core JS runtime/display behavior

## Guardrails

1. keep the trace range short
2. watch one cell unless there is a strong reason not to
3. do not patch harness/comparator based on this output
4. remove any temporary extra diagnostics once the root cause is proven
