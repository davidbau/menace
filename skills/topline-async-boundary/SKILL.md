---
name: topline-async-boundary
description: Use this skill to debug and fix parity bugs caused by message boundary ordering, especially when putstr_message can trigger --More-- and must be awaited.
---

# Topline Async Boundary

## When To Use
Use this when:
- RNG/events are aligned but screen diverges around topline updates.
- A call path emits a message (`putstr_message`/`pline`) and then mutates state.
- A likely `--More--` boundary can appear between those operations.

## Core Rule
Every topline message is potentially blocking.

If a callsite emits a message and then performs state updates that affect
rendering/ordering, treat that message as async and `await` it. Then thread
`async/await` through callers as needed.

Do not avoid this because it looks invasive. Correct boundary ordering is worth
the async propagation.

## Workflow
1. Reproduce one failing session:
   - `node test/comparison/session_test_runner.js --verbose <session>`
2. Localize first screen divergence step and nearby logic.
   - If the boundary is prompt-heavy or the same command appears to do the
     right total work in the wrong order, inspect:
     - `node scripts/comparison-window.mjs <session> --channel event --view normalized`
     - `node scripts/comparison-window.mjs <session> --channel rng --view filtered-raw --raw-step`
   - Use event normalized output for first localization, then RNG
     gameplay-filtered raw for same-step ownership/order diagnosis. Do not rely
     on normalized output alone when debugging `--More--`, `yn`, direction
     prompts, or stacked input boundaries.
3. Inspect C order at the matching function and keep that order in JS.
4. Find message call(s) in JS at that boundary.
5. Convert boundary function to `async` and add `await` to message call(s).
6. Thread `async/await` through direct callers until boundary is preserved.
7. Re-run:
   - target session
   - `node scripts/test-unit-core.mjs`
8. Confirm mismatch is eliminated or moved later for a different reason.

## Guardrails
- No comparator masking.
- No replay compensation/queue injection in `js/replay_core.js`.
- No synthetic auto-dismiss behavior.
- Keep behavior faithful to C ordering, not “JS convenience ordering.”

## Practical Notes
- A fixed boundary bug often shifts first divergence to a later textual mismatch.
- If divergence shifts from map glyph timing to message wording, the ordering fix
  likely worked; then debug naming/state fidelity next.
