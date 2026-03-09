# ASYNC_CLEANUP

## Why This Matters

C NetHack is single-threaded. Every function call is synchronous. The command
loop reads one key, dispatches one command, runs monsters, and loops. There is
no concurrency, no reentrancy, no interleaving.

JS NetHack must preserve this property despite running in an async event loop.
Every point where JS `await`s is a point where control returns to the browser
(or Node) event loop. If a second command were dispatched while a first is
suspended, game state would be corrupted — monsters could move twice, RNG
streams would diverge, inventory could be double-modified.

The purpose of this document is to:
1. Define the execution model that keeps suspension points safe.
2. Define the small set of origin primitives where all suspension occurs.
3. Provide a concrete cleanup plan to reach the target architecture.

## Execution Model

### Core Invariant: One Active Await

At runtime, at most one `await` may be active in gameplay code. This is the JS
equivalent of C's single thread of execution. Concretely:

- `run_command()` begins a command execution epoch (`beginCommandExec`).
- Within that epoch, the command may `await` zero or more times (reading keys,
  showing animations, dismissing --More--, loading data).
- Each `await` suspends the command. While suspended, no other command may
  begin.
- When the await resolves, the command resumes from exactly where it left off.
- `endCommandExec()` closes the epoch.

The existing `exec_guard.js` enforces this at the command level. Every `await`
also participates in the origin tracking system (see below), so diagnostics
can report both *which command* is suspended and *why*.

### Origin Primitives

Every `await` in gameplay code must flow through one of these primitives.
Each primitive registers itself with `exec_guard.js` before suspending and
unregisters when it resumes. This is where suspension tracking lives — not
at callsites, not in wrappers, but inside the small number of functions that
actually create Promises.

| Primitive | Origin Type | Promise Source | C Equivalent |
|---|---|---|---|
| `nhgetch()` | `input` | resolved by `pushInput()` | `nhgetch()` blocks on terminal read |
| `nh_delay_output(ms)` | `delay` | `setTimeout(ms)` | `delay_output()` calls `napms()` |
| `display_sync()` | `display_sync` | `setTimeout(0)` | *(none — C terminal paints synchronously)* |
| `nhimport(specifier)` | `import` | `import(specifier)` | *(none — C has no dynamic loading)* |
| `nhfetch(url, opts)` | `fetch` | `fetch(url, opts)` | *(none — C reads files synchronously)* |
| `nhload(key)` | `load` | IndexedDB read | *(none — C reads files synchronously)* |

That's 6 primitives. Every other `await` in gameplay code is a function that
internally calls one of these. The registration happens once, inside the
primitive, not at each of the dozens of callsites.

### Functions That Use Primitives (Not Origins Themselves)

These functions `await` but only because they call `nhgetch()` internally:

- **`more(display)`** — shows "--More--", loops `nhgetch()` until a dismiss
  key (space, escape, enter). Replaces the current `display.morePrompt()` /
  `awaitDisplayMorePrompt()` / `nhgetch_wrap` --More-- paths. Matches C's
  `more()` / `xwaitforspace()`.
- **`ynFunction()`** — shows a yes/no/count prompt, reads via `nhgetch()`.
- **`getdir()`** — direction prompt via `nhgetch()`.
- **`getpos_async()`** — targeting cursor loop via `nhgetch()`.
- **`getlin()`** — line input loop via `nhgetch()`.
- **All menu/inventory selection** — `nhgetch()` key loops.

None of these need origin registration because `nhgetch()` handles it.

### Key Ownership

Only `nhgetch()` consumes keyboard input. Non-input primitives
(`nh_delay_output`, `display_sync`, `nhimport`, `nhfetch`, `nhload`) must not
touch the input queue. If the player types ahead while a delay or import is
active, those keys queue up in the input runtime and are consumed by the next
`nhgetch()` call. This preserves deterministic replay.

### Input Boundary Stack (Current — To Be Removed)

`allmain.js` currently maintains a LIFO stack of input boundary handlers.
When `run_command` receives a key, it checks the top boundary before falling
through to normal command dispatch:

```
Key arrives → peekInputBoundary()
  → owner='more'   → handleMoreBoundaryKey (dismiss or ignore)
  → owner='prompt'  → topBoundary.onKey (direction/menu handler)
  → owner=<custom>  → topBoundary.onKey (custom handler)
  → null            → normal rhack() command dispatch
```

This boundary stack exists because the current architecture inverts control:
the browser calls `run_command(game, key)` for every keystroke, and
`run_command` must figure out who should get it. The boundary stack is a
dispatch table that simulates what C's call stack does naturally.

**This is unnecessary.** The JS `pushInput`/`nhgetch()` Promise pattern
already provides natural call-stack routing:

```javascript
// Browser side — just enqueue, no dispatch:
document.onkeydown = (e) => game.input.pushInput(charCode);

// Game loop — simple pull loop, like C:
async function gameLoop(game) {
    while (!game.gameOver) {
        const ch = await nhgetch();          // suspends until pushInput
        const result = await rhack(ch, game);
        if (result.tookTime) await moveloop_core(game);
        await display_sync(game);
    }
}
```

Inside commands, `getdir()` does `await nhgetch()` and gets the next key.
`more()` does `await nhgetch()` in a loop. The async call stack routes keys
exactly like C's synchronous call stack — no boundary dispatch needed.

The entire boundary stack — `withInputBoundary`, `clearInputBoundary`,
`peekInputBoundary`, the `'more'`/`'prompt'`/custom owner system,
`handleMoreBoundaryKey`, the prompt boundary setter, `pendingPrompt`,
`getAllInputBoundaryState` — is targeted for removal in Phase 5.

### display_sync: Why It Exists

In C, the terminal paints automatically whenever the program blocks on input
(`nhgetch`). The display is always current when the player sees it.

In JS/browser, writes go to a virtual display buffer and the browser only
paints when JS yields the event loop. During multi-step commands (travel,
repeated actions), `run_command` processes many game turns without yielding.
Without `display_sync`, the player would see only the final position, not
intermediate frames.

`display_sync()` flushes the display state (FOV, map, status, cursor) and
yields via `setTimeout(0)` so the browser can paint. It's skippable in
headless mode (no browser to paint for). It has no C equivalent — it exists
purely to compensate for the browser's asynchronous rendering model.

## Current State vs Target State

### Current State

The infrastructure mostly works but relies on ad-hoc discipline and carries
unnecessary complexity:

- **`nhgetch_raw` and `nhgetch_wrap`**: Two variants of key reading.
  `nhgetch_wrap` adds auto-dismissal of pending --More-- before returning a
  command key. This creates a dual --More-- dismissal path (boundary-stack
  path vs nhgetch_wrap path) that's hard to reason about.

- **`awaitInput`/`awaitMore`/`awaitAnim`**: Wrapper functions in `suspend.js`
  that bracket every `await` with `beforeTypedSuspend`/`afterTypedSuspend`
  calls to `exec_guard.js`. There are ~65 `awaitInput` callsites, ~3
  `awaitMore`, and ~2 `awaitAnim`. These wrappers obscure which primitive
  actually blocked.

- **`awaitDisplayMorePrompt` / `display.morePrompt()`**: A separate --More--
  subsystem with its own key-reading closure. 11 callsites.

- **Input boundary stack**: `run_command` receives every keystroke and uses a
  LIFO boundary stack (`withInputBoundary`/`peekInputBoundary`/owner system)
  to dispatch keys to the right handler. This is ~200 lines of complex
  routing logic that replicates what the async call stack already provides
  naturally via `pushInput`/`nhgetch()`.

- **`run_command` as key dispatcher**: `run_command(game, key)` is called
  for every keystroke. It checks boundaries, handles --More--, routes to
  prompts, and only falls through to `rhack()` if nothing else claims the
  key. This inverted control flow is the root cause of the boundary stack's
  existence.

- **`await import()` / `await fetch()`**: Completely uninstrumented — 13
  dynamic imports + 3 fetches that suspend the command with no origin
  tracking.

- **`onTimedTurn` callback**: Browser game loop passes a callback to
  `run_command` that recomputes FOV, renders, and does `setTimeout(0)` to
  yield for browser repaint. This is display plumbing threaded through the
  command API.

- **Cycle-breaker dynamic imports**: 10 `await import()` calls existed solely
  to break circular module dependencies. **Now resolved** — all converted to
  static imports (ES module circular imports work fine for hoisted function
  declarations).

### Target State

- **Simple game loop**: The browser just calls `pushInput(ch)` on keystroke
  events. The game loop is a simple `while` loop that pulls keys via
  `await nhgetch()` and dispatches commands via `rhack()`. Like C.

- **No boundary stack**: No `withInputBoundary`, `peekInputBoundary`,
  `clearInputBoundary`, boundary owners, or key dispatch routing. The async
  call stack routes keys naturally — whoever is `await`ing `nhgetch()` gets
  the next key, just like whoever called `nhgetch()` in C gets the next key.

- **No `run_command` key dispatch**: `run_command` is simplified to just
  `rhack()` + `moveloop_core()` + `display_sync()`. Or it may be inlined
  into the game loop entirely.

- **One `nhgetch()`**: `nhgetch_raw` is renamed to `nhgetch`. `nhgetch_wrap`
  is eliminated. It registers itself as an `input` origin internally.

- **`more(display)`**: A simple function that shows "--More--" and loops
  `nhgetch()` until a dismiss key. Replaces `awaitDisplayMorePrompt`,
  `display.morePrompt()`, `consumePendingMore`, and the nhgetch_wrap
  auto-more path. Matches C's `more()`.

- **No `awaitInput`/`awaitMore`/`awaitAnim`**: These wrappers are eliminated.
  Callsites `await` primitives directly.

- **`display_sync(game)`**: Replaces the `onTimedTurn` callback. Called
  directly after `moveloop_core` when the browser needs to repaint.
  Registers as a `display_sync` origin.

- **`nhimport(specifier)`**: Thin wrapper around `import()` that registers as
  an `import` origin. Replaces bare `await import()` at the 13 remaining
  dynamic import sites.

- **`nhfetch(url, opts)`**: Thin wrapper around `fetch()` that registers as a
  `fetch` origin. Replaces bare `await fetch()` at the 3 fetch sites.

- **`nhload(key)`**: Wrapper for IndexedDB reads that registers as a `load`
  origin. Save operations are fire-and-forget (write-only, no need to await).

- **`suspend.js`**: Shrinks to just `beginOriginAwait`/`endOriginAwait`
  bookkeeping, or gets folded into `exec_guard.js` entirely.

## Cleanup Plan

### Phase 1: Eliminate cycle-breaker dynamic imports ✅ DONE

**What changed**: All 10 cycle-breaker `await import()` calls converted to
static imports. ES module circular imports work fine for function declarations
(hoisted).

**What went away**: 10 unnecessary async suspension points during gameplay.

**Bug fixed**: `zap.js` was destructuring `EXPL_*` constants from
`explode.js` which didn't export them (all were `undefined` at runtime) —
now correctly imported from `const.js`.

**Resolved cycles**:
- `allmain ↔ chargen` (2 sites → static import)
- `dog ↔ dogmove` (2 sites → static import)
- `pickup ↔ lock` (2 sites → static import)
- `do ↔ hack` (1 site → static import)
- `trap ↔ potion` (1 site → static import)
- `zap ↔ explode` (1 site → static import)

**Gate**: All 3421 tests pass. All 34 gameplay sessions pass.

### Phase 2: Add origin registration to exec_guard.js

**Relationship to current state**: `exec_guard.js` currently tracks command
epochs (`beginCommandExec`/`endCommandExec`) and typed suspensions
(`beforeTypedSuspend`/`afterTypedSuspend`). But it doesn't know *which
primitive* caused the suspension. This phase adds that.

**What's new**: Add `beginOriginAwait(game, type, meta)` and
`endOriginAwait(game, token)` to `exec_guard.js`. These record the origin
type (`input`, `delay`, `display_sync`, `import`, `fetch`, `load`) in the
per-game state alongside the existing command token.

**What stays the same**: `beginCommandExec`/`endCommandExec` are unchanged.
Command-level tracking continues to work exactly as before.

**What goes away**: Nothing yet. This phase is additive.

**Deliverable**: `exec_guard.js` exports `beginOriginAwait` /
`endOriginAwait`. When `WEBHACK_STRICT_SINGLE_THREAD=warn`, the log shows
origin type for every suspension.

**Gate**: All 3421 tests pass. All 34 gameplay sessions pass. Verify with
`WEBHACK_STRICT_SINGLE_THREAD=warn` that no new warnings appear.

**QC check**: `grep -r 'beginOriginAwait\|endOriginAwait' js/` shows only
`exec_guard.js` (definition) and `suspend.js` (initial consumer). No
gameplay files import it directly yet.

### Phase 3: Create origin primitives and `more()`

This is the core phase. Each primitive gets internal origin registration, and
`more()` replaces the --More-- subsystem.

**3a: `nhgetch()`**

- **Currently**: `nhgetch_raw()` in `input.js` calls `game.input.nhgetch()`
  directly with no origin registration. `nhgetch_wrap()` adds auto-dismissal
  of pending --More-- before returning. ~79 `nhgetch_raw` callsites, ~25
  `nhgetch_wrap` callsites.
- **Change**: Rename `nhgetch_raw` → `nhgetch`. Add `beginOriginAwait` /
  `endOriginAwait` with type `'input'` inside it.
- **What goes away**: `nhgetch_wrap` is deleted. Its --More-- auto-dismissal
  is replaced by explicit `await more()` calls at the ~12 sites that need it.
  `nhgetch_raw` name is retired.
- **Gate**: All tests pass. All gameplay sessions pass.
- **QC check**: `grep -r 'nhgetch_raw\|nhgetch_wrap' js/` returns zero hits.
  `grep -r 'nhgetch' js/ | grep -v node_modules` shows only `nhgetch()`.

**3b: `more(display)`**

- **Currently**: --More-- is handled by three mechanisms:
  (1) `display.morePrompt()` in `display.js` — async method with internal
      key-reading closure.
  (2) `awaitDisplayMorePrompt()` in `suspend.js` — wrapper that constructs a
      `readMoreKey` closure and calls `display.morePrompt()`. 11 callsites.
  (3) `consumePendingMore()` in `more_keys.js` — called by `nhgetch_wrap` to
      auto-dismiss before returning a command key.
  Plus the boundary-stack path in `run_command` (`handleMoreBoundaryKey`).
- **Change**: Create `more(display)` that matches C's `more()`:
  ```javascript
  async function more(display) {
      display.showMore();
      while (true) {
          const ch = await nhgetch();
          if (isMoreDismissKey(ch)) {
              display.clearMore();
              return ch;
          }
      }
  }
  ```
- **What goes away**: `display.morePrompt()`, `awaitDisplayMorePrompt()`,
  `consumePendingMore()`, the `nhgetch_wrap` auto-more path (already gone
  from 3a). The boundary-stack --More-- path in `run_command` is simplified
  to call `more()`.
- **Gate**: All tests pass. All gameplay sessions pass. Verify --More--
  dismissal works in browser (space, escape, enter dismiss; other keys
  ignored).
- **QC check**: `grep -r 'awaitDisplayMorePrompt\|display\.morePrompt\|consumePendingMore' js/`
  returns zero hits.

**3c: `nh_delay_output(ms)` origin registration**

- **Currently**: `nh_delay_output` in `animation.js` does
  `await new Promise(r => setTimeout(r, ms))` with no origin registration.
  28 callsites call it directly (no wrapper).
- **Change**: Add `beginOriginAwait`/`endOriginAwait` with type `'delay'`
  inside `nh_delay_output`.
- **What goes away**: Nothing. Callsites are unchanged.
- **Gate**: All tests pass. All gameplay sessions pass.
- **QC check**: With `WEBHACK_STRICT_SINGLE_THREAD=warn`, verify delay
  suspensions are logged with origin type.

**3d: `display_sync(game)`**

- **Currently**: Browser game loop passes an `onTimedTurn` callback to
  `run_command` that recomputes FOV, renders, and does `setTimeout(0)`.
  2 callsites in `_gameLoopStep`, wrapped in `awaitAnim`.
- **Change**: Create `display_sync(game)`:
  ```javascript
  async function display_sync(game) {
      if (game?.display) {
          game.fov.compute(game.map, game.player.x, game.player.y);
          game.display.renderMap(game.map, game.player, game.fov, game.flags);
          game.display.renderStatus(game.player);
          game.display.cursorOnPlayer(game.player);
      }
      if (!game?.headless) {
          const token = beginOriginAwait(game, 'display_sync');
          try { await new Promise(r => setTimeout(r, 0)); }
          finally { endOriginAwait(game, token); }
      }
  }
  ```
  Call `display_sync` directly inside `run_command` after `moveloop_core`.
- **What goes away**: `onTimedTurn` callback parameter from `run_command` API.
  `awaitAnim` wrapper (2 callsites). The `onTimedTurn` lambda in
  `_gameLoopStep`.
- **Gate**: All tests pass. All gameplay sessions pass. Verify in browser
  that travel and multi-step commands render intermediate frames (not just
  the final position).
- **QC check**: `grep -r 'onTimedTurn\|awaitAnim' js/` returns zero hits.

**3e: `nhimport(specifier)`, `nhfetch(url, opts)`, `nhload(key)`**

- **Currently**: 13 bare `await import()`, 3 bare `await fetch()`, 1 bare
  `await` IndexedDB read. All uninstrumented.
- **Change**: Create thin wrappers with origin registration:
  ```javascript
  async function nhimport(specifier) {
      const token = beginOriginAwait(game, 'import', { specifier });
      try { return await import(specifier); }
      finally { endOriginAwait(game, token); }
  }
  ```
  Similarly for `nhfetch` (type `'fetch'`) and `nhload` (type `'load'`).
- **What goes away**: Bare `await import()` / `await fetch()` in gameplay
  code. Save await in `storage.js` becomes fire-and-forget.
- **Gate**: All tests pass. All gameplay sessions pass.
- **QC check**: `grep -r 'await import(' js/ | grep -v nhimport` returns only
  non-gameplay files (test harnesses, build scripts).
  `grep -r 'await fetch(' js/ | grep -v nhfetch` returns zero gameplay hits.

### Phase 4: Collapse suspend.js wrappers

**Relationship to current state**: After Phase 3, all origin primitives
register themselves internally. The `awaitInput`/`awaitMore` wrappers in
`suspend.js` are now redundant — they add a second layer of registration
around primitives that already register themselves.

**What changes**: Replace all wrapper callsites with direct `await` of the
primitive:

| Before | After | Count |
|---|---|---|
| `await awaitInput(game, nhgetch_raw(), {site})` | `await nhgetch()` | ~62 |
| `await awaitInput(game, nhgetch_wrap(), {site})` | `await nhgetch()` | ~12 |
| `await awaitMore(game, display._clearMore(), ...)` | `display.clearMore()` | ~1 |
| `await awaitMore(game, readKey(), ...)` | `await nhgetch()` | ~2 |
| `await awaitAnim(game, setTimeout(0), ...)` | `await display_sync(game)` | ~2 |

The 3 `awaitInput` callsites in `run_command` that wrap
`topBoundary.onKey()` and `game._pendingPromptTask` need case-by-case
review. These handlers internally call `nhgetch()`, so origin registration
happens there — the outer `awaitInput` wrapper is redundant.

**What goes away**: `awaitInput`, `awaitMore`, `awaitAnim`,
`awaitDisplayMorePrompt` exports from `suspend.js`. The `suspend.js` module
either shrinks to just `beginOriginAwait`/`endOriginAwait` re-exports (from
`exec_guard.js`) or is deleted entirely.

**Do this incrementally**: One file at a time, in order of decreasing
callsite count:
1. `chargen.js` (14 callsites) — chargen tests catch regressions
2. `options.js` (8) — options UI tests
3. `invent.js` (6), `do_wear.js` (5) — inventory/wear tests
4. `cmd.js` (5), `pager.js` (5) — command/pager tests
5. Remaining files (1–3 callsites each)

**Gate per file**: All tests pass after each file is converted. Full gameplay
session suite passes after each batch.

**Final gate**: All 3421 tests pass. All 34 gameplay sessions pass.

**QC checks**:
- `grep -r 'awaitInput\|awaitMore\|awaitAnim\|awaitDisplayMorePrompt' js/`
  returns zero hits (excluding `suspend.js` definition if kept for
  backwards compat during migration).
- `grep -r "from './suspend'" js/` returns zero hits (or only `exec_guard.js`
  if registration helpers remain there).
- `WEBHACK_STRICT_SINGLE_THREAD=warn` produces no new warnings.
- Every `await` in gameplay code (files matching `js/*.js`, excluding test/
  and build/) is followed by one of: `nhgetch()`, `nh_delay_output()`,
  `display_sync()`, `nhimport()`, `nhfetch()`, `nhload()`, `more()`, or a
  function that transitively calls one of these. This can be verified by
  a static grep: `grep -n 'await ' js/*.js | grep -v 'await nhgetch\|await nh_delay\|await display_sync\|await nhimport\|await nhfetch\|await nhload\|await more'`
  should return only non-primitive awaits (e.g., `await someFunction()` where
  `someFunction` internally uses a primitive).

### Phase 5: Eliminate boundary stack and simplify game loop

This is the architectural payoff. Once `nhgetch()` is the only key-reading
primitive and `more()` uses it directly, the boundary stack becomes dead
code. The game loop can be simplified to match C's structure.

**Relationship to current state**: The current browser game loop works as:

```
browser key event
  → run_command(game, key)
    → peekInputBoundary() — who gets this key?
    → boundary owner='more' → handleMoreBoundaryKey()
    → boundary owner='prompt' → topBoundary.onKey()
    → no boundary → rhack() → command runs → may call nhgetch() → suspends
    → moveloop_core() → display_sync()
```

Every keystroke enters through `run_command`, which is both a dispatcher and
a command executor. The boundary stack (~200 lines) routes keys to the right
suspended context.

**Target architecture**:

```
browser key event → pushInput(ch)   // just enqueue the key

// Game loop (started once at game init, runs until game over):
async function gameLoop(game) {
    while (!game.gameOver) {
        const ch = await nhgetch();   // suspends until pushInput resolves it
        await rhack(ch, game);        // command runs, may nhgetch() internally
        if (tookTime) {
            await moveloop_core(game);
            await display_sync(game);
        }
    }
}
```

The key insight: `pushInput(ch)` resolves the Promise that `nhgetch()` is
awaiting. This is already how `input.js` works — `nhgetch()` creates a
Promise and stores its resolver; `pushInput(ch)` calls that resolver. The
boundary stack just adds a routing layer on top that's unnecessary when the
async call stack does the routing naturally.

When `getdir()` calls `await nhgetch()`, the function is suspended at that
exact point. The next `pushInput(ch)` resolves that specific `nhgetch()`
call, and `getdir()` resumes with the direction key. No dispatch table
needed. Same for `more()` — it's suspended at `await nhgetch()`, and the
next key goes directly to it.

**What goes away**:

| Component | Lines (approx) | Location |
|---|---|---|
| `withInputBoundary()` | ~15 | allmain.js |
| `clearInputBoundary()` | ~10 | allmain.js |
| `clearInputBoundariesByOwner()` | ~5 | allmain.js |
| `peekInputBoundary()` | ~5 | allmain.js |
| `getInputBoundaryState()` / `getAllInputBoundaryState()` | ~20 | allmain.js |
| `_inputBoundaryStack` field + init | ~5 | allmain.js |
| `pendingPrompt` setter (boundary registration) | ~20 | allmain.js |
| `_pendingPromptBoundaryToken` tracking | ~10 | allmain.js |
| Boundary dispatch in `run_command` | ~80 | allmain.js |
| `handleMoreBoundaryKey()` | ~50 | allmain.js |
| `display.markMorePending()` boundary registration | ~15 | display.js |
| `_moreBoundaryToken` tracking | ~10 | display.js |
| `consumePendingMore()` | ~20 | more_keys.js |
| `readBoundaryKey()` | ~15 | input.js |
| Boundary runtime wiring (`withInputBoundary` in runtime) | ~10 | allmain.js |

Total: ~290 lines removed.

**What `run_command` becomes**:

```javascript
async function run_command(game, ch) {
    const token = beginCommandExec(game);
    try {
        const result = await rhack(ch, game);
        if (result.tookTime) {
            await moveloop_core(game);
            await display_sync(game);
        }
    } finally {
        endCommandExec(game, token);
    }
}
```

Or `run_command` is inlined into the game loop and ceases to exist as a
separate function.

**What changes in the browser game loop**:

```javascript
// Before (NetHackGame._gameLoopStep):
//   1. read key via _readCommandLoopKey (nhgetch_wrap)
//   2. handle count prefix
//   3. call run_command(game, ch, { onTimedTurn, onBeforeRepeat, ... })
//   4. recompute FOV, render

// After:
async gameLoop() {
    while (!this.gameOver) {
        const ch = await nhgetch();
        // count prefix handling (if digit, accumulate and read next key)
        await run_command(this, ch);
        // display_sync is called inside run_command, no callback needed
    }
}

// Browser wiring (in init):
document.addEventListener('keydown', (e) => {
    this.input.pushInput(e.key.charCodeAt(0));
});
```

**What changes in the replay harness**:

`drainUntilInput()` in `replay_core.js` races command completion against
the input runtime's wait detection. This still works — `pushInput(ch)` feeds
a key, `nhgetch()` resolves, the command proceeds until it hits the next
`nhgetch()` or completes. The `waitForInputWait` / `isWaitingInput` API on
the input runtime is unchanged.

**Incremental migration path**:

This phase doesn't have to be atomic. The boundary stack can be removed
incrementally:

1. Remove `'more'` boundary owner — `more()` now handles --More-- via direct
   `nhgetch()`. Remove `handleMoreBoundaryKey`, `display.markMorePending`
   boundary registration, `consumePendingMore`.
2. Remove `'prompt'` boundary owner — prompt handlers (`getdir`, menus) now
   `await nhgetch()` directly. Remove `pendingPrompt` setter boundary logic.
3. Remove remaining boundary infrastructure (`withInputBoundary`, etc.).
4. Simplify `run_command` to the minimal form above.
5. Simplify `_gameLoopStep` to a simple pull loop.

**Gate per step**: All 3421 tests pass. All 34 gameplay sessions pass.
Browser manual test: play a few turns, verify --More-- works, menus work,
direction prompts work, travel works.

**Final gate**: All tests pass. All gameplay sessions pass. Browser smoke
test.

**QC checks**:
- `grep -r 'withInputBoundary\|clearInputBoundary\|peekInputBoundary\|InputBoundary' js/`
  returns zero hits.
- `grep -r 'pendingPrompt' js/` returns zero hits (or only the simplified
  game state field, no boundary setter).
- `grep -r 'handleMoreBoundaryKey\|consumePendingMore\|markMorePending' js/`
  returns zero hits.
- `grep -r 'onTimedTurn\|onBeforeRepeat' js/` returns zero hits.
- `run_command` function body is under 30 lines.
- The game loop (`gameLoop` or `_gameLoopStep`) is under 20 lines.

---

## Callsite Inventory

### 1. nhgetch Callsite Inventory (Current)

After cleanup, all of these become plain `await nhgetch()` calls.

- Total callsites: 104
- `nhgetch_raw` callsites: 79 (→ `nhgetch`)
- `nhgetch_wrap` callsites: 25 (→ `nhgetch`, with --More-- handled by `more()`)
- Marked `--More--` boundary callsites: 24 (→ `await more(display)`)

| File:Line | Function | Reader | More? | Purpose | Site |
|---|---|---|---|---|---|
| js/allmain.js:2344 | _consumePendingMoreBoundary | wrap | yes | Dismiss/acknowledge --More-- boundary |  |
| js/allmain.js:2358 | _readCommandLoopKey | wrap | yes | Dismiss/acknowledge --More-- boundary |  |
| js/apply.js:1035 | resolveApplySelection | wrap | no | Choose direction | apply.chop.direction |
| js/apply.js:1047 | resolveApplySelection | wrap | no | Choose direction | apply.lockpick.direction |
| js/apply.js:1129 | fn | wrap | no | Choose direction | apply.use-directional.direction |
| js/apply.js:1179 | fn | wrap | no | Choose item/inventory entry | apply.select.loop |
| js/apply.js:1222 | fn | raw | yes | Dismiss/acknowledge --More-- boundary | apply.inventory-list.morePrompt |
| js/apply.js:1228 | fn | raw | yes | Dismiss/acknowledge --More-- boundary | apply.inventory-list.more-fallback |
| js/apply.js:1258 | fn | raw | yes | Dismiss/acknowledge --More-- boundary | apply.invalid-invlet.morePrompt |
| js/chargen.js:63 | playerSelection | raw | no | Choose item/inventory entry | chargen.playerSelection.autopickPrompt |
| js/chargen.js:158 | showGameOver | raw | no | Character generation/startup menu flow | chargen.showGameOver.dismiss |
| js/chargen.js:210 | showGameOver | raw | no | Character generation/startup menu flow | chargen.showGameOver.playAgain |
| js/chargen.js:254 | enterTutorial | raw | yes | Dismiss/acknowledge --More-- boundary | chargen.enterTutorial.morePrompt |
| js/chargen.js:336 | handleReset | raw | no | Character generation/startup menu flow | chargen.handleReset.noSavedData |
| js/chargen.js:347 | handleReset | raw | no | Character generation/startup menu flow | chargen.handleReset.confirmDelete |
| js/chargen.js:369 | restoreFromSave | raw | no | Character generation/startup menu flow | chargen.restoreFromSave.confirm |
| js/chargen.js:483 | showRoleMenu | raw | no | Choose item/inventory entry | chargen.showRoleMenu.select |
| js/chargen.js:570 | showRaceMenu | raw | no | Choose item/inventory entry | chargen.showRaceMenu.select |
| js/chargen.js:641 | showGenderMenu | raw | no | Choose item/inventory entry | chargen.showGenderMenu.select |
| js/chargen.js:711 | showAlignMenu | raw | no | Choose item/inventory entry | chargen.showAlignMenu.select |
| js/chargen.js:752 | showConfirmation | raw | no | Choose item/inventory entry | chargen.showConfirmation.select |
| js/chargen.js:806 | showLoreAndWelcome | raw | yes | Dismiss/acknowledge --More-- boundary | chargen.showLoreAndWelcome.loreMore |
| js/chargen.js:874 | showLoreAndWelcome | raw | yes | Dismiss/acknowledge --More-- boundary | chargen.showLoreAndWelcome.welcomeMore |
| js/chargen.js:958 | showFilterMenu | raw | no | Character generation/startup menu flow | chargen.showFilterMenu.loop |
| js/cmd.js:789 | queueRepeatExtcmd | raw | no | Command/prompt key input | cmd.handleExtendedCommand.enhance |
| js/cmd.js:931 | readExtendedCommandLine | raw | no | Command/prompt key input | cmd.readExtendedCommandLine |
| js/cmd.js:965 | handleExtendedCommandUntrap | raw | no | Choose direction | cmd.handleExtendedCommandUntrap.direction |
| js/cmd.js:1020 | handleExtendedCommandUntrap | raw | no | Choose item/inventory entry | cmd.handleExtendedCommandUntrap.tool |
| js/cmd.js:1038 | handleExtendedCommandName | raw | no | Choose item/inventory entry | cmd.handleExtendedCommandName.select |
| js/do_name.js:1147 | handleCallObjectTypePrompt | raw | no | Choose item/inventory entry | do_name.handleCallObjectTypePrompt.select |
| js/do_wear.js:1928 | putOnSelectedItem | raw | no | Choose item/inventory entry | do_wear.putOnSelectedItem.ringFinger |
| js/do_wear.js:2191 | showWearHelpList | raw | no | Choose item/inventory entry | do_wear.handleWear.select |
| js/do_wear.js:2273 | showPutOnHelpList | raw | no | Choose item/inventory entry | do_wear.handlePutOn.select |
| js/do_wear.js:2344 | showTakeOffHelpList | raw | no | Choose item/inventory entry | do_wear.handleTakeOff.select |
| js/do_wear.js:2404 | showRemoveHelpList | raw | no | Choose item/inventory entry | do_wear.handleRemove.select |
| js/do.js:688 | showToplineErrorWithMore | raw | yes | Dismiss/acknowledge --More-- boundary | do.handleDrop.moreBoundary |
| js/do.js:703 | showToplineErrorWithMore | wrap | no | Choose item/inventory entry | do.handleDrop.select |
| js/do.js:817 | showDropCandidates | wrap | yes | Dismiss/acknowledge --More-- boundary | do.showDropCandidates.more |
| js/do.js:940 | promptDropTypeClass | wrap | no | Command/prompt key input | do.promptDropTypeClass.input |
| js/do.js:993 | handleDropTypes | wrap | no | Choose item/inventory entry | do.handleDropTypes.select |
| js/dokick.js:1640 | dokick | raw | no | Choose direction | dokick.dokick.direction |
| js/dothrow.js:205 | promptDirectionAndThrowItem | wrap | no | Choose direction | dothrow.promptDirectionAndThrowItem.direction |
| js/dothrow.js:362 | handleThrow | wrap | no | Choose item/inventory entry | dothrow.handleThrow.select |
| js/dothrow.js:452 | handleFire | wrap | no | Choose direction | dothrow.handleFire.bullwhipDirection |
| js/dothrow.js:564 | handleFire | wrap | no | Choose item/inventory entry | dothrow.handleFire.select |
| js/dothrow.js:622 | handleFire | wrap | no | Command/prompt key input | dothrow.handleFire.readyWieldedConfirm |
| js/eat.js:1849 | handleEat | wrap | no | Command/prompt key input | eat.handleEat.floorPrompt |
| js/eat.js:1879 | handleEat | wrap | no | Choose item/inventory entry | eat.handleEat.inventorySelect |
| js/eat.js:1928 | handleEat | wrap | yes | Dismiss/acknowledge --More-- boundary | eat.handleEat.moreDismiss |
| js/engrave.js:408 | read_engr_at | raw | yes | Dismiss/acknowledge --More-- boundary | engrave.read_engr_at.moreDismiss |
| js/engrave.js:599 | handleEngrave | raw | no | Command/prompt key input | engrave.handleEngrave.stylusPrompt |
| js/getpos.js:571 | getpos_async | wrap | yes | Dismiss/acknowledge --More-- boundary | getpos.tip.moreDismiss |
| js/getpos.js:628 | getpos_async | wrap | no | Move targeting cursor / pick map position | getpos.getpos_async.loop |
| js/getpos.js:816 | getpos_async | raw | yes | Dismiss/acknowledge --More-- boundary | getpos.forcefalse.unknown.more |
| js/hack.js:3797 | getdir | raw | no | Choose direction | hack.getdir.read |
| js/input.js:493 | readUnifiedKey | raw | no | Input subsystem internal boundary read |  |
| js/input.js:534 | readBoundaryKey | wrap | yes | Dismiss/acknowledge --More-- boundary |  |
| js/input.js:540 | readBoundaryKey | wrap | yes | Dismiss/acknowledge --More-- boundary |  |
| js/invent.js:270 | renderOverlayMenuUntilDismiss | raw | no | Command/prompt key input | invent.renderOverlayMenuUntilDismiss.loop |
| js/invent.js:349 | handleInventory | raw | no | Choose item/inventory entry | invent.handleInventory.loop |
| js/invent.js:610 | handleInventory | raw | no | Choose item/inventory entry | invent.handleInventory.actionMenu |
| js/invent.js:674 | handleInventory | raw | no | Choose item/inventory entry | invent.handleInventory.adjustLetter |
| js/invent.js:1508 | doorganize | raw | no | Choose item/inventory entry | invent.doorganize.selectItem |
| js/invent.js:1568 | doorganize | raw | no | Choose item/inventory entry | invent.doorganize.selectLetter |
| js/kick.js:50 | handleKick | raw | yes | Dismiss/acknowledge --More-- boundary | kick.handleKick.woundedLegs.morePrompt |
| js/kick.js:57 | handleKick | raw | no | Choose direction | kick.handleKick.direction |
| js/lock.js:519 | pick_lock | raw | no | Choose direction | lock.pick_lock.direction |
| js/lock.js:952 | handleOpen | raw | no | Choose direction | lock.handleOpen.direction |
| js/lock.js:1046 | handleClose | raw | no | Choose direction | lock.handleClose.direction |
| js/mthrowu.js:345 | maybeFlushToplineBeforeMessage | raw | yes | Dismiss/acknowledge --More-- boundary | mthrowu.maybeFlushToplineBeforeMessage.morePrompt |
| js/mthrowu.js:666 | flightBlocked | raw | yes | Dismiss/acknowledge --More-- boundary | mthrowu.m_throw.impact.morePrompt |
| js/o_init.js:685 | handleDiscoveries | raw | no | Command/prompt key input | o_init.handleDiscoveries.pageNav |
| js/options.js:2058 | editDoWhatCountOption | raw | no | Navigate/edit options UI | options.editDoWhatCountOption |
| js/options.js:2105 | editStatusHilitesOption | raw | no | Navigate/edit options UI | options.editStatusHilitesOption |
| js/options.js:2134 | editStatusHilitesOption | raw | no | Navigate/edit options UI | options.editStatusHilitesOption.submenu |
| js/options.js:2175 | editStatusConditionsOption | raw | no | Navigate/edit options UI | options.editStatusConditionsOption |
| js/options.js:2216 | editNumberPadModeOption | raw | no | Navigate/edit options UI | options.editNumberPadModeOption |
| js/options.js:2276 | editAutounlockOption | raw | no | Navigate/edit options UI | options.editAutounlockOption |
| js/options.js:2359 | editPickupTypesOption | raw | no | Navigate/edit options UI | options.editPickupTypesOption |
| js/options.js:2384 | editPickupTypesOption | raw | no | Navigate/edit options UI | options.handleSet.loop |
| js/pager.js:217 | do_look | raw | no | Navigate pager/help text | pager.do_look.identify |
| js/pager.js:357 | dolook | raw | yes | Dismiss/acknowledge --More-- boundary | pager.handleLook.readEngraving.morePrompt |
| js/pager.js:440 | render | raw | no | Navigate pager/help text | pager.showPager.loop |
| js/pager.js:516 | showMoreTextPages | raw | yes | Dismiss/acknowledge --More-- boundary | pager.showMoreTextPages.more |
| js/pager.js:571 | getSearchTerm | raw | no | Navigate pager/help text | pager.getSearchTerm.loop |
| js/pager.js:777 | showTextWindowFile | raw | yes | Dismiss/acknowledge --More-- boundary | pager.showTextWindowFile.more |
| js/pickup.js:1526 | doTakeOut | raw | no | Choose item/inventory entry | pickup.handleUseContainer.classSelect |
| js/pickup.js:1594 | doTakeOut | raw | no | Choose item/inventory entry | pickup.handleUseContainer.takeOutSelect |
| js/pickup.js:1713 | doPutIn | raw | no | Command/prompt key input | pickup.handleUseContainer.menuLoop |
| js/pickup.js:1764 | doPutIn | raw | no | Choose item/inventory entry | pickup.handleUseContainer.stashSelect |
| js/pickup.js:1799 | handleLoot | raw | no | Choose direction | pickup.handleLoot.direction |
| js/potion.js:402 | handleQuaff | raw | no | Command/prompt key input | potion.handleQuaff.fountainConfirm |
| js/potion.js:442 | showQuaffPrompt | raw | no | Choose item/inventory entry | potion.handleQuaff.select |
| js/promo.js:232 | run | wrap | no | Promo/menu scene key handling |  |
| js/read.js:325 | showReadPrompt | wrap | no | Choose item/inventory entry | read.handleRead.select |
| js/read.js:386 | showReadPrompt | raw | no | Command/prompt key input | read.handleRead.refreshKnownSpellConfirm |
| js/read.js:499 | fn | raw | yes | Dismiss/acknowledge --More-- boundary | read.handleRead.invalidInvletMorePrompt |
| js/sounds.js:1152 | dotalk | raw | no | Choose direction | sounds.dotalk.direction |
| js/spell.js:449 | handleKnownSpells | raw | no | Command/prompt key input | spell.handleKnownSpells.dismiss |
| js/spell.js:1048 | getspell | raw | no | Choose item/inventory entry | spell.getspell.select |
| js/wield.js:428 | handleWield | wrap | no | Choose item/inventory entry | wield.handleWield.select |
| js/wield.js:469 | handleWield | raw | yes | Dismiss/acknowledge --More-- boundary | wield.handleWield.invalidInvletMorePrompt |
| js/wield.js:621 | handleQuiver | raw | no | Choose item/inventory entry | wield.handleQuiver.select |
| js/zap.js:550 | showZapPrompt | raw | no | Choose item/inventory entry | zap.handleZap.selectWand |

### 2. nh_delay_output Await Callsites

- Total await callsites: 28
- These already call the primitive directly (no wrapper needed).

| File:Line | Function | Purpose |
|---|---|---|
| js/animation.js:204 | tmp_at_end_async | Animation backtrack pacing |
| js/apply.js:154 | do_blinding_ray | Animation frame delay |
| js/delay.js:17 | delay_output | Compatibility wrapper → `nh_delay_output` |
| js/delay.js:21 | delay_output_raf | Compatibility wrapper → `nh_delay_output` |
| js/detect.js:127 | flash_glyph_at | Animation frame delay |
| js/dig.js:802 | zap_dig | Digging beam pacing |
| js/display.js:1801 | shieldeff | Shield effect animation pacing |
| js/dothrow.js:285 | promptDirectionAndThrowItem | Thrown-projectile frame pacing |
| js/dothrow.js:1107 | boomhit_visual | Thrown-projectile frame pacing |
| js/dothrow.js:1206 | throwit | Thrown-projectile frame pacing |
| js/dothrow.js:1557 | sho_obj_return_to_u | Thrown-projectile frame pacing |
| js/explode.js:124 | explode | Explosion animation frame delay |
| js/hack.js:2883–2888 | runmode_delay_output | Movement pacing (5 callsites) |
| js/mthrowu.js:754,758 | flightBlocked | Monster projectile frame pacing |
| js/muse.js:1690 | mbhit | Monster beam animation pacing |
| js/spell.js:916,926,927 | cast_chain_lightning | Spell visual pacing |
| js/trap.js:827 | trapeffect_rolling_boulder_trap_mon | Trap animation pacing |
| js/uhitm.js:1358,1359 | start_engulf | Engulf animation pacing |
| js/zap.js:1085 | bhit_zapped_wand | Beam/zap frame pacing |
| js/zap.js:1154 | dobuzz | Beam/zap frame pacing |

### 3. Remaining Dynamic Import Callsites

After cycle-breaker elimination, 13 dynamic imports remain. All become
`await nhimport()` calls.

| File:Line | Classification | Rationale |
|---|---|---|
| js/allmain.js:2396 | lazy-cold-path | Travel command helper loaded on travel path |
| js/mplayer.js:106 | lazy-cold-path | `verbalize` for monster-player message |
| js/pager.js:740 | runtime-adapter | Node-only `node:fs/promises` fallback |
| js/pickup.js:1888 | lazy-cold-path | Shop payment helper for in-shop pickup |
| js/read.js:1773 | lazy-cold-path | Map-position helper for scroll effects |
| js/read.js:1790 | lazy-cold-path | Region helper for gas-cloud effect |
| js/read.js:1807 | lazy-cold-path | Object-placement for boulder-drop |
| js/sounds.js:1149 | runtime-adapter | `#chat` handler lazy import |
| js/sounds.js:1150 | runtime-adapter | `#chat` direction constants |
| js/timeout.js:594 | lazy-cold-path | Timeout-revival helper |
| js/timeout.js:600 | lazy-cold-path | Timeout-zombify helper |
| js/timeout.js:606 | lazy-cold-path | Timeout-rot helper |
| js/timeout.js:757 | lazy-cold-path | Leg-heal timeout helper |
| js/timeout.js:893 | lazy-cold-path | Timeout-monster spawn helper |

### 4. Fetch Callsites

All become `await nhfetch()` calls.

| File:Line | Purpose |
|---|---|
| js/nethack.js:50 | Load external keylog JSON for replay |
| js/pager.js:733 | Load help text file |
| js/pager.js:1120 | Load Guidebook text |

### 5. Load Callsite

Becomes `await nhload()`.

| File:Line | Purpose |
|---|---|
| js/allmain.js:1692 | Load autosave if manual save absent |

Save (js/nethack.js:34, js/storage.js:1034) is fire-and-forget — no await
needed for write-only persistence.

### 6. display_sync Callsites

Currently implemented as `onTimedTurn` callback with inline `setTimeout(0)`.
Become `await display_sync(game)` calls inside `run_command`.

| File:Line | Context |
|---|---|
| js/allmain.js:2415 | `onTimedTurn` in Ctrl+A repeat path |
| js/allmain.js:2459 | `onTimedTurn` in normal command path |

### 7. Boundary Callback Awaits (`topBoundary.onKey`)

`topBoundary.onKey` is not an origin. It is a dispatch point for a key
already consumed by `nhgetch`. The boundary handler may internally call
`nhgetch()` (which registers its own origin), but the dispatch await itself
is just propagating that inner suspension.

Flow in `run_command`:
1. Key arrives at `run_command(game, ch)`.
2. `peekInputBoundary()` returns the current owner.
3. `run_command` calls `topBoundary.onKey(chCode, game)`.
4. The handler processes the key (may call `nhgetch()` internally).
5. Handler reports whether it consumed the key.

Notes:
- `animation_examples.js` and `delay_output` wrappers are blacklisted from
  CODEMATCH parity scope.
- `nh_delay_output` is the canonical gameplay delay primitive;
  `delay_output`/`delay_output_raf` are compatibility wrappers in
  `js/delay.js`.
