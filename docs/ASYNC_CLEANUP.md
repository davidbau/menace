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

### Core Invariant: One Active Blocking Gameplay Origin

At runtime, at most one **blocking gameplay origin await** may be active. This
is the JS equivalent of C's single thread of execution.

This does **not** mean only one JS `await` expression can exist in a stack.
Inner helper awaits that are part of the currently active origin are fine.
The forbidden case is two competing gameplay origins (for example two pending
input waits) trying to own control at once.

Concretely:

- `run_command()` begins a command execution epoch (`beginCommandExec`).
- Within that epoch, the command may `await` zero or more times (reading keys,
  showing animations, dismissing --More--, loading data).
- Each `await` suspends the command. While suspended, no other command may
  begin.
- When the await resolves, the command resumes from exactly where it left off.
- `endCommandExec()` closes the epoch.

Allowed exceptions (outside gameplay-origin accounting):
- startup/bootstrap before game instance is initialized,
- test harness scaffolding outside the gameplay loop,
- telemetry/logging that does not influence gameplay state.

### Game State Singleton (`gstate.js`)

All runtime tracking lives in `gstate.js`: the game instance reference,
command epoch tracking (currently `exec_guard.js`), and origin await
bookkeeping (currently `suspend.js`). This consolidation means:

- Origin primitives (`nhgetch`, `display_sync`, etc.) are zero-argument —
  they read `game` from `gstate.js` internally rather than requiring callers
  to pass it.
- `exec_guard.js` and `suspend.js` are folded into `gstate.js` and deleted.
- One module, one source of truth for runtime state.
- Keep test/debug injection points explicit (for example runtime overrides in
  test harnesses) so origin helpers remain verifiable without global monkey
  patching.

### Origin Primitives

Every `await` in gameplay code must flow through one of these primitives.
Each primitive registers itself with `gstate.js` before suspending and
unregisters when it resumes. This is where suspension tracking lives — not
at callsites, not in wrappers, but inside the small number of functions that
actually create Promises.

| Primitive | Origin Type | Promise Source | C Equivalent |
|---|---|---|---|
| `nhgetch()` | `input` | resolved by `pushInput()` | `nhgetch()` blocks on terminal read |
| `nh_delay_output(ms)` | `delay` | `setTimeout(ms)` | `delay_output()` calls `napms()` |
| `display_sync()` | `display_sync` | `setTimeout(0)` | *(browser rendering policy; no direct C gameplay equivalent)* |
| `nhimport(specifier)` | `import` | `import(specifier)` | *(none — C has no dynamic loading)* |
| `nhfetch(url, opts)` | `fetch` | `fetch(url, opts)` | *(none — C reads files synchronously)* |
| `nhload(key)` | `load` | IndexedDB read | *(none — C reads files synchronously)* |

That's 6 primitives. Every other `await` in gameplay code is a function that
internally calls one of these. The registration happens once, inside the
primitive, not at each of the dozens of callsites.

All primitives are zero-argument (except `nh_delay_output(ms)`,
`nhimport(specifier)`, `nhfetch(url, opts)`, and `nhload(key)` which take
their operational parameters). None take `game` — they read it from `gstate`.

**Rule**: All pre-game imports must be static. `nhimport` is only for
lazy-cold-path imports during gameplay when `game` is guaranteed to exist in
`gstate`.

### Functions That Use Primitives (Not Origins Themselves)

These functions `await` but only because they call `nhgetch()` internally:

- **`more()`** — shows "--More--", loops `nhgetch()` until a dismiss key
  (space, escape, enter). Replaces the current `display.morePrompt()` /
  `awaitDisplayMorePrompt()` / `nhgetch_wrap` --More-- paths. Matches C's
  `more()` / `xwaitforspace()`. Zero-argument (reads display from `gstate`).
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

### Input Boundary Stack (Current — To Be Simplified, Then Removed if Safe)

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

**Likely unnecessary long-term.** The JS `pushInput`/`nhgetch()` Promise pattern
already provides natural call-stack routing:

```javascript
// Browser side — just enqueue, no dispatch:
document.onkeydown = (e) => game.input.pushInput(charCode);

// Game loop — simple pull loop, like C:
async function gameLoop() {
    while (!game.gameOver) {
        const ch = await nhgetch();          // suspends until pushInput
        const result = await rhack(ch);
        if (result.tookTime) await moveloop_core();
        await display_sync();
    }
}
```

Inside commands, `getdir()` does `await nhgetch()` and gets the next key.
`more()` does `await nhgetch()` in a loop. The async call stack routes keys
exactly like C's synchronous call stack — no boundary dispatch needed.

The long-term target is to remove the full boundary stack. However, a minimal
owner model may be retained temporarily if prompt/menu semantics need it during
migration. The plan below includes a fallback checkpoint before hard deletion.

### display_sync: Why It Exists

In C, the terminal paints automatically whenever the program blocks on input
(`nhgetch`). The display is always current when the player sees it.

In JS/browser, writes go to a virtual display buffer and the browser only
paints when JS yields the event loop. During multi-step commands (travel,
repeated actions), the game processes many turns without yielding. Without
`display_sync`, the player would see only the final position, not
intermediate frames.

`display_sync()` flushes the display state (FOV, map, status, cursor) and
yields via `setTimeout(0)` so the browser can paint. It's skippable in
headless mode (no browser to paint for). It has no C equivalent — it exists
purely to compensate for the browser's asynchronous rendering model.

`display_sync()` is callable both from the outer game loop (after
`moveloop_core`) and from inside multi-step commands (travel, repeated
actions) that need intermediate frame rendering. Commands like travel call
`display_sync()` in their inner loop to show each step.

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

- **Scattered runtime tracking**: Command epoch tracking lives in
  `exec_guard.js`, suspension type tracking in `suspend.js`, game state in
  `gstate.js` — three modules for one concern.

- **Cycle-breaker dynamic imports**: 10 `await import()` calls existed solely
  to break circular module dependencies. **Now resolved** — all converted to
  static imports (ES module circular imports work fine for hoisted function
  declarations).

### Target State

- **Simple game loop**: The browser just calls `pushInput(ch)` on keystroke
  events. The game loop is a simple `while` loop that pulls keys via
  `await nhgetch()` and dispatches commands via `rhack()`. Like C.

- **No boundary stack (target)**: remove `withInputBoundary`,
  `peekInputBoundary`, `clearInputBoundary`, and owner dispatch routing once
  prompt/menu behavior is proven stable under direct `nhgetch` ownership.

- **No `run_command` key dispatch**: `run_command` is simplified to just
  `rhack()` + `moveloop_core()` + `display_sync()`. Or it may be inlined
  into the game loop entirely.

- **One `nhgetch()`**: `nhgetch_raw` is renamed to `nhgetch`. `nhgetch_wrap`
  is eliminated. It registers itself as an `input` origin internally.

- **`more()`**: A simple zero-argument function that shows "--More--" and
  loops `nhgetch()` until a dismiss key. Replaces `awaitDisplayMorePrompt`,
  `display.morePrompt()`, `consumePendingMore`, and the nhgetch_wrap
  auto-more path. Matches C's `more()`.

- **No `awaitInput`/`awaitMore`/`awaitAnim`**: These wrappers are eliminated.
  Callsites `await` primitives directly.

- **`display_sync()`**: Replaces the `onTimedTurn` callback. Called after
  `moveloop_core` and inside multi-step command loops (travel, repeated
  actions). Registers as a `display_sync` origin. Zero-argument.

- **`nhimport(specifier)`**: Thin wrapper around `import()` that registers as
  an `import` origin. Replaces bare `await import()` at the remaining
  dynamic import sites. Only used during gameplay (pre-game imports are
  static).

- **`nhfetch(url, opts)`**: Thin wrapper around `fetch()` that registers as a
  `fetch` origin. Replaces bare `await fetch()` at the 3 fetch sites.

- **`nhload(key)`**: Wrapper for IndexedDB reads that registers as a `load`
  origin.
- **Save semantics split**:
  - autosave may be fire-and-forget for performance,
  - explicit user-triggered save must await completion and report errors.

- **Unified `gstate.js`**: All runtime tracking consolidated — game instance,
  command epochs, origin await bookkeeping. `exec_guard.js` and `suspend.js`
  are deleted.

## Cleanup Plan

### Validation Commands (Run At Each Phase Gate)

Use the same checks at each phase boundary so progress/regression is explicit:

1. Unit + integration:
   - `npm test -- --runInBand`
2. Gameplay parity:
   - `./scripts/run-and-report.sh --failures`
3. Focused replay sanity after control-flow changes:
   - run at least one direct replay of a known sensitive manual session
     (for example `seed031/032/033`) and verify first divergence does not
     move earlier.
4. Browser smoke:
   - start browser game, verify command input, prompt input, and `--More--`
     dismissal still behave correctly.

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

### Phase 2: Origin primitives (expand–migrate–contract)

This phase uses the **expand–migrate–contract** pattern so that every
intermediate state passes tests. New primitives are created alongside old
ones, callsites are migrated one file at a time, then old mechanisms are
deleted.

#### Phase 2a: Consolidate runtime tracking into gstate.js

**Relationship to current state**: Command epoch tracking lives in
`exec_guard.js`, suspension type tracking in `suspend.js`, game state in
`gstate.js`. These are three modules for one concern.

**What changes**:
- Move `beginCommandExec`/`endCommandExec` from `exec_guard.js` into
  `gstate.js`.
- Move `beforeTypedSuspend`/`afterTypedSuspend` from `suspend.js` into
  `gstate.js`.
- Add `beginOriginAwait(type, meta)` and `endOriginAwait(token)` to
  `gstate.js`. These record the origin type (`input`, `delay`,
  `display_sync`, `import`, `fetch`, `load`). No `game` parameter — they
  read it from `gstate`.
- Re-export from `exec_guard.js` and `suspend.js` temporarily for backwards
  compatibility during migration.

**What goes away** (eventually): `exec_guard.js` and `suspend.js` as
separate modules.

**Gate**: All tests pass. All gameplay sessions pass.

**QC check**: `grep -r 'beginOriginAwait\|endOriginAwait' js/` shows only
`gstate.js` (definition) and temporary re-exports.

#### Phase 2b: Create new primitives (expand)

Create all new primitives alongside old ones. Nothing changes for existing
callsites.

**What's created**:

1. **`nhgetch()` origin registration**: Add `beginOriginAwait`/
   `endOriginAwait` with type `'input'` inside the existing `nhgetch_raw`.
   No rename yet — `nhgetch_raw` keeps its name, `nhgetch_wrap` is untouched.

2. **`more()`**: New function matching C's `more()`:
   ```javascript
   export async function more() {
       const display = gstate.game?.display;
       if (display) display.showMore();
       while (true) {
           const ch = await nhgetch_raw();
           if (isMoreDismissKey(ch)) {
               if (display) display.clearMore();
               return ch;
           }
       }
   }
   ```
   Coexists with `display.morePrompt()` and `awaitDisplayMorePrompt()`.

3. **`nh_delay_output(ms)` origin registration**: Add
   `beginOriginAwait`/`endOriginAwait` with type `'delay'` inside the
   existing function. Callsites unchanged.

4. **`display_sync()`**: New function:
   ```javascript
   export async function display_sync() {
       const game = gstate.game;
       if (game?.display) {
           game.fov.compute(game.map, game.player.x, game.player.y);
           game.display.renderMap(game.map, game.player, game.fov, game.flags);
           game.display.renderStatus(game.player);
           game.display.cursorOnPlayer(game.player);
       }
       if (!game?.headless) {
           const token = beginOriginAwait('display_sync');
           try { await new Promise(r => setTimeout(r, 0)); }
           finally { endOriginAwait(token); }
       }
   }
   ```
   Coexists with `onTimedTurn` callback.

5. **`nhimport(specifier)`**, **`nhfetch(url, opts)`**, **`nhload(key)`**:
   Thin wrappers with origin registration. Coexist with bare
   `await import()`/`await fetch()`.

**Gate**: All tests pass. All gameplay sessions pass. New primitives exist
but are not yet used by any callsite.

**QC check**: Each new primitive has at least one unit test verifying origin
registration fires.

#### Phase 2c: Migrate callsites (migrate)

Convert callsites from old wrappers to new primitives, one file at a time.
Tests pass after each file.

**Migration rules**:

| Before | After |
|---|---|
| `await awaitInput(game, nhgetch_raw(), {site})` | `await nhgetch_raw()` |
| `await awaitInput(game, nhgetch_wrap(), {site})` | `await nhgetch_raw()` (+ `await more()` where --More-- was needed) |
| `await awaitDisplayMorePrompt(game, display, ...)` | `await more()` |
| `await awaitAnim(game, setTimeout(0), ...)` | `await display_sync()` |
| `await awaitMore(game, readKey(), ...)` | `await nhgetch_raw()` |
| bare `await import('./foo.js')` | `await nhimport('./foo.js')` |
| bare `await fetch(url)` | `await nhfetch(url)` |

The 3 `awaitInput` callsites in `run_command` that wrap
`topBoundary.onKey()` and `game._pendingPromptTask` are left for Phase 3
(boundary elimination).

**Do this incrementally**, in order of decreasing callsite count:
1. `chargen.js` (14 callsites) — chargen tests catch regressions
2. `options.js` (8) — options UI tests
3. `invent.js` (6), `do_wear.js` (5) — inventory/wear tests
4. `cmd.js` (5), `pager.js` (5) — command/pager tests
5. Remaining files (1–3 callsites each)

**Gate per file**: All tests pass. Full gameplay session suite passes after
each batch.

Progress note (2026-03-10):
- Migrated `allmain.js` off `awaitMore`/`awaitAnim` wrappers.
- Migrated `more_keys.js` off `awaitMore` wrapper.
- Added canonical `display_sync()` origin primitive in `origin_awaits.js` and
  switched `allmain` timed-turn UI yields to use it.
- Migrated safe `nhgetch_wrap({handleMore:false})` reads to `nhgetch_raw()` in
  `allmain._readCommandLoopKey` and `input.readBoundaryKey` (explicit `more()`
  ownership retained).
- Removed `input.more()` fallback delegation to `display.morePrompt()` so
  `--More--` dismissal now uses a single explicit key loop path.
- Validation: `scripts/run-and-report.sh` remains 34/34 passing.
- Removed boundary-owner shim APIs from `NetHackGame` (`withInputBoundary`,
  `peekInputBoundary`, `clearInputBoundary`, `clearInputBoundariesByOwner`);
  `run_command` now routes prompt ownership directly via `pendingPrompt.onKey`.
- Removed `run_command` callback plumbing (`onTimedTurn`, `onBeforeRepeat`);
  timed-turn UI sync now uses direct `display_sync()` and repeat interruption
  is handled in `run_command` via `showRepeatInterruptMore`.
- Deleted legacy wrapper modules `js/suspend.js` and `js/exec_guard.js`;
  `allmain` and `synclock` tests now import guard APIs directly from
  `gstate.js`.
- Updated replay startup settling to rely on explicit `pendingPrompt` handling
  (no boundary-stack probing).
- Validation: `npm run -s test:unit` and `scripts/run-and-report.sh` both green
  after this cleanup pass.

Progress note (2026-03-10, follow-up):
- Migrated gameplay/UI callsites from `nhgetch_raw()` to canonical `nhgetch()`
  across command/input flows (`apply/do/dothrow/do_wear/getpos/invent/lock/pager/...`).
- Kept `nhgetch_raw()` as an internal low-level primitive inside `input.js`;
  no external JS modules call it directly now.
- Revalidated parity and tests after migration:
  `npm run -s test:unit` green, `scripts/run-and-report.sh` green (34/34).
- Replay driver Phase 3d full inversion (`_gameLoopStep + pushInput` start path)
  remains deferred: an attempted switch introduced a late screen-only mismatch
  in `seed331` despite RNG/event parity; reverted to keep gameplay parity fully
  green while continuing cleanup incrementally.

#### Phase 2d: Delete old mechanisms (contract)

Once zero callsites remain for old wrappers:

**What goes away**:
- `nhgetch_wrap` — deleted. `nhgetch_raw` renamed to `nhgetch`.
- `awaitInput`, `awaitMore`, `awaitAnim`, `awaitDisplayMorePrompt` — deleted.
- `display.morePrompt()`, `consumePendingMore()` — deleted.
- `onTimedTurn` callback parameter from `run_command` API — deleted.
- `suspend.js` — deleted (functionality already in `gstate.js`).
- `exec_guard.js` — deleted (functionality already in `gstate.js`).

**Gate**: All tests pass. All gameplay sessions pass.

**QC checks**:
- `grep -r 'nhgetch_raw\|nhgetch_wrap' js/` returns zero hits.
- `grep -r 'awaitInput\|awaitMore\|awaitAnim\|awaitDisplayMorePrompt' js/`
  returns zero hits.
- `grep -r "from './suspend'" js/` returns zero hits.
- `grep -r "from './exec_guard'" js/` returns zero hits.
- `grep -r 'onTimedTurn' js/` returns zero hits.
- `grep -r 'consumePendingMore\|display\.morePrompt' js/` returns zero hits.
- Every `await` in gameplay code (`js/*.js`, excluding `test/` and build
  scripts) flows through one of the 6 origin primitives. Verify:
  `grep -n 'await ' js/*.js | grep -v 'await nhgetch\|await nh_delay\|await display_sync\|await nhimport\|await nhfetch\|await nhload\|await more'`
  should return only non-primitive awaits (functions that transitively call a
  primitive).

### Phase 3: Eliminate boundary stack and simplify game loop

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
async function gameLoop() {
    while (!game.gameOver) {
        const ch = await nhgetch();   // suspends until pushInput resolves it
        await rhack(ch);              // command runs, may nhgetch() internally
        if (tookTime) {
            await moveloop_core();
            await display_sync();
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

**Note on count prefix handling**: C handles numeric count prefixes inside
`rhack()`, which calls `nhgetch()` in a loop to accumulate digits. In the
target architecture this "just works" — `rhack()` calls `nhgetch()`, keys
arrive via `pushInput()`, no special handling needed in the game loop.

#### Phase 3a: Verify boundaries are dead (or identify minimal fallback)

After Phase 2d, all --More-- goes through `more()` (which calls `nhgetch()`
directly) and all prompts call `nhgetch()` directly. No boundaries should
ever be pushed.

**What changes**: Add a warning/assertion when `withInputBoundary` is called.
Run all tests.

**Gate A (preferred)**: All tests pass with zero boundary pushes (stack is dead).
**Gate B (fallback)**: Boundary pushes remain only in a minimal, explicit
prompt/menu shim with no `more` ownership and no key-dispatch multiplexer.

#### Phase 3b: Remove dead boundary code (or collapse to minimal shim)

**What goes away**:

| Component | Lines (approx) | Location |
|---|---|---|
| `withInputBoundary()` | ~15 | allmain.js |
| `clearInputBoundary()` | ~10 | allmain.js |
| `clearInputBoundariesByOwner()` | ~5 | allmain.js |
| `peekInputBoundary()` | ~5 | allmain.js |
| `getRuntimeInputSnapshot()` (direct runtime diagnostics) | ~25 | allmain.js |
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

Total target removal: ~290 lines (or reduced if minimal shim retained
temporarily under Gate B).

**Gate**: All tests pass. All gameplay sessions pass.

#### Phase 3e: Remove `_pendingMore` / queued-more fallback (active cleanup)

`_pendingMore`, `_pendingMoreNoCursor`, and `_messageQueue` are legacy
non-blocking fallback state. They were useful while replay/harness paths still
dispatched keys through boundary owners, but they are no longer aligned with
the strict async single-threaded model.
This phase is explicit cleanup work: removing historical compatibility/fallback
paths so `more()` and `nhgetch()` are the only gameplay input boundaries.

**Target state**:

1. `Display.putstr_message()` and `HeadlessDisplay.putstr_message()` always
   resolve message boundaries synchronously by awaiting key dismissal at the
   exact `--More--` point (no deferred queueing).
2. No command-loop/prompt path checks `display._pendingMore` before reading
   keys.
3. `more()` is the only explicit `--More--` wait helper.
4. `replay_core` startup settlement does not mutate `_pendingMore`.

**Removal scope**:

- display/headless fields and branches:
  - `_pendingMore`
  - `_pendingMoreNoCursor`
  - `_messageQueue`
  - `markMorePending(...)`
  - `_clearMore()` queue-resume fallback
- input/allmain/replay checks and fallback paths that branch on `_pendingMore`.

**Progress update (2026-03-10):**

- Command-loop key reads now go through unified `nhgetch()` (`allmain._readCommandLoopKey`)
  rather than calling `nhgetch_raw()` directly.
- Dead `allowPendingMore` plumbing was removed from `nhgetch()`.
- `input.more()` is now the single `--More--` wait implementation used by
  gameplay code and display/headless message paths; duplicate display/headless
  wait helpers were removed.

**Gate**:

- `npm test --silent` passes.
- `scripts/run-and-report.sh` remains `34/34` green.

#### Phase 3c: Simplify run_command

**What `run_command` becomes**:

```javascript
async function run_command(ch) {
    const token = beginCommandExec();
    try {
        const result = await rhack(ch);
        if (result.tookTime) {
            await moveloop_core();
            await display_sync();
        }
    } finally {
        endCommandExec(token);
    }
}
```

**Gate**: All tests pass. All gameplay sessions pass.

#### Phase 3d: Game loop inversion and replay harness

**This is the highest-risk step.** The control flow changes from "harness
calls `run_command(game, key)` per keystroke" to "game loop pulls via
`nhgetch()`, harness feeds keys via `pushInput()`."

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
        await run_command(ch);
    }
}

// Browser wiring (in init):
document.addEventListener('keydown', (e) => {
    this.input.pushInput(e.key.charCodeAt(0));
});
```

**What changes in the replay harness**:

`drainUntilInput()` in `replay_core.js` currently calls
`run_command(game, key)` directly per key. In the target architecture:

1. The game loop is started once (runs as a long-lived async function).
2. The harness feeds keys via `pushInput(ch)` instead of calling
   `run_command` directly.
3. The harness waits for the game to block on the next `nhgetch()` using
   the existing `waitForInputWait`/`isWaitingInput` API on the input runtime.

The detection mechanism (`waitForInputWait`/`isWaitingInput`) is unchanged.
The change is mechanical: `run_command(game, key)` → `pushInput(key)` in the
replay driver loop.

**Gate**: All tests pass. All 34 gameplay sessions pass. Browser smoke test:
play a few turns, verify --More-- works, menus work, direction prompts work,
travel renders intermediate frames.

## Risk Analysis

### Where the risk is concentrated

**Phases 1 and 2 are low risk.** Phase 1 is done. Phase 2 uses
expand–migrate–contract: new code is created alongside old code (2b), then
callsites are migrated one file at a time with tests after each (2c), then
old code is deleted only after zero callsites remain (2d). At no point is
functionality removed before its replacement is working.

**Phase 3a–3c are low risk.** Phase 3a just adds an assertion to confirm
boundaries are never pushed (if the assertion fires, something was missed in
Phase 2 — fix it before proceeding). Phase 3b deletes confirmed-dead code.
Phase 3c simplifies `run_command` by removing branches that are already
unreachable.

**Phase 3d is the only high-risk step.** It inverts the control flow:

- **Before**: The harness/browser calls `run_command(game, key)` per
  keystroke. The caller controls when keys enter the game.
- **After**: The game loop runs as a long-lived coroutine pulling keys via
  `await nhgetch()`. The harness/browser feeds keys via `pushInput()`.

This is a fundamental change in who drives the loop. The risks:

1. **Replay harness breakage.** All 34 gameplay session tests depend on
   `replay_core.js` driving the game. The harness must switch from calling
   `run_command` to calling `pushInput` + waiting for the next `nhgetch()`
   suspension. The `waitForInputWait`/`isWaitingInput` detection API already
   exists and should work, but the timing of when the game loop starts vs
   when the first key is fed must be correct. If the game loop hasn't
   reached its first `await nhgetch()` before the harness calls `pushInput`,
   the key is buffered (fine — the input queue handles this). But if the
   harness waits for `isWaitingInput` before feeding the first key, and the
   game loop hasn't started yet, it deadlocks.

2. **Game loop lifecycle.** The game loop is a single long-lived async
   function. Errors inside it (uncaught exceptions in commands) would
   previously be caught per-`run_command` call. In the target architecture,
   an uncaught error kills the game loop coroutine entirely. The `try/catch`
   inside `run_command` must be robust, or the game loop needs its own
   top-level error handler that logs and continues.

3. **Browser tab close / game over.** When the game ends or the tab closes,
   the game loop is suspended at `await nhgetch()` with a Promise that will
   never resolve. This is fine for tab close (the page is gone) and for game
   over (set `gameOver = true` and resolve the pending `nhgetch` to break
   the loop). But the shutdown path must be implemented explicitly.

### Mitigations

- **Do Phase 3d in two sub-steps**: First, change the replay harness to use
  `pushInput` while keeping the browser game loop using the old
  `run_command` path. Run all 34 sessions. Then change the browser game
  loop. This isolates replay-harness risk from browser-UI risk.
- **Add a game-loop error handler** that catches, logs, and continues (or
  re-throws fatal errors). Do not let one bad command kill the loop.
- **Add a `shutdown()` method** that resolves the pending `nhgetch` Promise
  with a sentinel value (e.g., `null` or a special EOF character) so the
  game loop can exit cleanly.

**QC checks**:
- `grep -r 'withInputBoundary\|clearInputBoundary\|peekInputBoundary\|InputBoundary' js/`
  returns zero hits.
- `grep -r 'pendingPrompt' js/` returns zero hits (or only the simplified
  game state field, no boundary setter).
- `grep -r 'handleMoreBoundaryKey\|consumePendingMore\|markMorePending' js/`
  returns zero hits.
- `grep -r 'onTimedTurn\|onBeforeRepeat' js/` returns zero hits.
- `run_command` function body is under 20 lines.
- The game loop (`gameLoop` or `_gameLoopStep`) is under 15 lines.

---

## Callsite Inventory

### 1. nhgetch Callsite Inventory (Current)

After cleanup, all of these become plain `await nhgetch()` calls.

- Total callsites: 104
- `nhgetch_raw` callsites: 79 (→ `nhgetch`)
- `nhgetch_wrap` callsites: 25 (→ `nhgetch`, with --More-- handled by `more()`)
- Marked `--More--` boundary callsites: 24 (→ `await more()`)

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
| js/zap.js:1154 | dobuzz | Beam/zap frame pacing |

### 3. Remaining Dynamic Import Callsites

After cycle-breaker elimination, 14 dynamic imports remain. All become
`await nhimport()` calls. All run during gameplay when `game` exists in
`gstate`.

| File:Line | Classification | Rationale |
|---|---|---|
| js/allmain.js:2396 | lazy-cold-path | Travel command helper loaded on travel path |
| js/mplayer.js:106 | lazy-cold-path | `verbalize` for monster-player message |
| js/pager.js:740 | runtime-adapter | Node-only `node:fs/promises` fallback |
| js/pickup.js:1888 | lazy-cold-path | Shop payment helper for in-shop pickup |
| js/read.js:1773 | lazy-cold-path | Map-position helper for scroll effects |
| js/read.js:1790 | lazy-cold-path | Region helper for gas-cloud effect |
| js/read.js:1807 | lazy-cold-path | Object-placement for boulder-drop |
| js/sounds.js:1149 | lazy-cold-path | `#chat` handler path lazy import |
| js/sounds.js:1150 | lazy-cold-path | `#chat` direction constants lazy import |
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

Autosave writes (`js/storage.js:1034`) may be fire-and-forget for
performance. Explicit user save (`js/nethack.js:34`) remains awaited with
explicit error reporting to the player.

### 6. display_sync Callsites

Currently implemented as `onTimedTurn` callback with inline `setTimeout(0)`.
Become `await display_sync()` calls inside `run_command` and inside
multi-step command loops (travel, repeated actions).

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
