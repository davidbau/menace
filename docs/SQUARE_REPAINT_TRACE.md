# Square Repaint Trace

Use square repaint trace when parity is already localized to a small visible area
and you need the runtime write order for one terminal cell.

This is a runtime-display diagnostic, not a comparator workaround.

## When To Use

Use it only after:

1. first divergence is already known
2. gameplay parity is already exact, or close enough that the visible bug is
   clearly local
3. `dbgmapdump` or repaint traces have narrowed the problem to one square or a
   tiny cluster

Good examples:

1. one stale glyph on the map while RNG and events match
2. one square flipping between monster/object/trap glyphs across adjacent steps
3. one cursor-owned prompt square with unclear ownership timing

## What It Does

With env vars enabled, the active display runtime emits diagnostic stderr lines
for a watched terminal cell:

- [`js/headless.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/headless.js)
  for parity/session replay
- [`js/display.js`](/share/u/davidbau/git/mazesofmenace/mazes/js/display.js)
  for browser/runtime debugging

- every changed `setCell(...)` write
- cursor placement when the cursor lands on that cell
- current replay step when available
- previous and next cell payloads
- optional caller stack

Format:

```text
^celltrace[kind=write step=1610 cell=34,18 prev="\""/7/0 next="s"/5/0 caller=NetHackDisplay.renderMap (...)]
^celltrace[kind=cursor step=1611 cell=34,18 caller=NetHackDisplay.setCursor (...)]
```

## Driver Script

Run the helper:

```bash
node scripts/debug/repaint_square_trace.mjs <session.json> --cell <col,row> [--steps <from-to>] [--stack]
```

Example:

```bash
node scripts/debug/repaint_square_trace.mjs \
  test/comparison/sessions/pending/t11_s754_w_covmax8_gp.session.json \
  --cell 34,18 \
  --steps 1609-1611 \
  --stack
```

The script runs `session_test_runner`, enables the watched-cell env vars, and
prints only:

1. `^celltrace[...]`
2. session fail summary lines
3. final JSON summary line

## Env Vars

Direct manual use is also allowed:

- `WEBHACK_TRACE_CELL=col,row`
- `WEBHACK_TRACE_CELL_STEPS=from-to`
- `WEBHACK_TRACE_CELL_STACK=1`

Example:

```bash
WEBHACK_TRACE_CELL=34,18 \
WEBHACK_TRACE_CELL_STEPS=1609-1611 \
WEBHACK_TRACE_CELL_STACK=1 \
node test/comparison/session_test_runner.js \
  --sessions=test/comparison/sessions/pending/t11_s754_w_covmax8_gp.session.json \
  --fail-fast --verbose
```

## Workflow

1. localize first divergence with `session_test_runner`
2. use `dbgmapdump` to confirm nearby settled state
3. use square repaint trace for the exact terminal cell
4. compare write order against C repaint evidence
5. fix core JS display/runtime behavior, not the harness

## Example Win

On `t11_s754_w_covmax8_gp`, watching cell `34,18` over `1609-1611` produced:

```text
^celltrace[kind=write step=1610 cell=34,18 prev="s"/5/0 next="\""/7/0 caller=show_glyph (...)]
^celltrace[kind=write step=1610 cell=34,18 prev="\""/7/0 next="s"/5/0 caller=putMapCell (...)]
```

That proved the bad square was a runtime repaint-order issue on one map cell,
not a generic replay artifact or a settled-state trap flag mismatch.

## Guardrails

1. keep the watched area to one cell if possible
2. keep the step range tight
3. remove any temporary extra tracing after the bug is understood
4. do not use this to justify replay compensation or comparator masking
