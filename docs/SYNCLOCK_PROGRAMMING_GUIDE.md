# SYNCLOCK Programming Guide

This guide documents how to write gameplay code that preserves the SYNCLOCK
single-thread execution contract.

## Core Rule

Inside gameplay command execution, only typed suspension wrappers are allowed:

1. `awaitInput(...)`
2. `awaitMore(...)`
3. `awaitAnim(...)`
4. `awaitDisplayMorePrompt(...)` (central helper for `display.morePrompt`)

Do not add raw `await nhgetch()` or direct `display.morePrompt(nhgetch)` in
gameplay modules.

## Boundary Ownership Model

1. Input boundaries are explicit owners on a stack (`allmain.js`):
   - `withInputBoundary(owner, onKey, meta)`
   - `clearInputBoundary(token)`
   - `peekInputBoundary()`
2. `display/headless` use `markMorePending(...)` to register owner=`more`.
3. `run_command()` consumes keys through boundary ownership.
4. A pending `--More--` without owner is a violation (`boundary.more.owner-missing`):
   strict mode ignores the key; default mode currently auto-syncs for compatibility.

## Approved Patterns

### Prompt key wait

```js
const ch = await awaitInput(game, nhgetch(), { site: 'module.action.prompt' });
```

### `--More--` via centralized helper

```js
await awaitDisplayMorePrompt(game, display, () => nhgetch(), {
  site: 'module.action.morePrompt',
});
```

### Animation delay

```js
await awaitAnim(game, nh_delay_output(), { site: 'module.action.anim' });
```

## Anti-Patterns

1. `const ch = await nhgetch();`
2. `await display.morePrompt(nhgetch);`
3. Comparator/harness masking to hide ordering bugs.
4. Replay-side synthetic key compensation.

## Diagnostics and Audit

Run:

```bash
node scripts/synclock_audit.mjs --strict
```

Expected strict-zero metrics:

1. `raw_await_nhgetch`
2. `raw_settimeout0_await`
3. `display_moreprompt_nhgetch`

Tracking metric (S1 centralization):

1. `direct_moreprompt_calls`
2. Session result counters:
   - `boundary.more.owner-missing`
   - `boundary.more.fallback-no-owner`

## Testing Workflow

1. Run focused unit tests for touched command paths.
2. Run `node scripts/synclock_audit.mjs --strict`.
3. Run `./scripts/run-and-report.sh` and confirm non-regression.
4. Update issue `#277` with metric deltas and validation evidence.

## Notes for Porting

1. Prefer fail-loud ownership diagnostics over silent auto-sync.
2. Keep behavior fixes in core gameplay code, not comparator/replay masking.
3. Maintain C-faithful ordering at message/input boundaries.
