# Session Harness Simplification Plan

> *"The harness should drive and compare; the game should behave."*

## Purpose

Eliminate game-awareness from the session test harness by pushing behavior
into the core game. The harness becomes a **dumb replay engine** that:

1. Loads session data
2. Sends keys to the game
3. Captures output (screen, typGrid, RNG trace)
4. Compares against expected values
5. Reports divergences

All game-specific logic—startup, level generation, character creation,
command semantics, turn boundaries—lives in the core game, not the harness.

## Motivation

The current session stack contains game-aware behavior in test infrastructure
(`test/comparison/session_runtime.js`). This creates three problems:

1. **Duplication risk**: Behavior can diverge between gameplay code and replay code.
2. **Trust risk**: A failing session can come from harness emulation, not game behavior.
3. **Maintenance drag**: Parity fixes require touching test runtime AND core game paths.

For faithful C parity work, we need one source of behavior truth: core game runtime.

---

## Hard Goals

The end state must satisfy all of these:

1. One official session run path: `npm run test:session`
2. Session execution for all types driven by one core stepping API
3. Harness modules do not implement turn logic, prompt logic, or command semantics
4. PRNG, typGrid, and screen comparisons stay granular and deterministic
5. Replay debugging remains rich enough to pinpoint first divergence with context
6. No transitional replay modes or feature-flag split paths in final state

## Simplicity and Transparency Constraints

Design guardrails, not optional:

1. One headless replay module as execution entrypoint for session tests
2. Harness code easy to audit: load session, call core step API, compare, report
3. Do not hide behavior behind caching that changes replay semantics
4. Do not skip PRNG/typGrid/screen work to improve runtime
5. Favor clear data flow over clever indirection

---

## Current State

| File | Lines | Role |
|------|-------|------|
| `js/headless_runtime.js` | 977 | Core game: HeadlessGame, HeadlessDisplay |
| `test/comparison/session_runtime.js` | 1457 | **Game-aware test code (target for elimination)** |
| `test/comparison/session_helpers.js` | 41 | Re-exports (game-unaware) |
| `test/comparison/comparators.js` | ~150 | Pure comparison functions (game-unaware) |
| `test/comparison/session_loader.js` | ~200 | Session file loading (game-unaware) |

**Target**: Delete `session_runtime.js` by pushing functionality into
`js/headless_runtime.js` (game behavior) or keeping only pure comparison
logic in test utilities.

## Game-Aware Code in session_runtime.js

### 1. Map Generation (lines ~195-440)

```javascript
generateMapsSequential(seed, maxDepth)
generateMapsWithRng(seed, maxDepth)
```

Custom map generation loop that manually calls `initLevelGeneration()`,
`makelevel()`, etc. Should use wizard mode teleport instead.

### 2. Startup Generation (lines ~480-565)

```javascript
generateStartupWithRng(seed, session)
```

Manually constructs Player, Map, HeadlessGame. Should be `HeadlessGame.start()`.

### 3. Session Replay (lines ~566-1312)

```javascript
async replaySession(seed, session, opts = {})
```

750+ lines implementing turn logic, prompt handling, monster movement, FOV.
Should become a simple key-send loop calling core API.

### 4. Structural Validators (lines ~1313-1457)

```javascript
checkWallCompleteness(map)
checkConnectivity(map)
checkStairs(map, depth)
```

**These are appropriate for harness**—keep in test utilities, but operate
on game-provided data.

---

## Target Architecture

### 1. Core Owns Replay Semantics

`js/headless_runtime.js` exposes replay-safe APIs:

```javascript
class HeadlessGame {
    // Initialization
    static async start(seed, options);  // Full startup with all options

    // Replay stepping
    async sendKey(key);                 // Execute one command/turn
    async sendKeys(keys);               // Execute multiple keys

    // State capture
    getTypGrid();                       // Current level typGrid (21x80)
    getScreen();                        // Current terminal screen (24x80)
    getAnsiScreen();                    // ANSI-encoded screen string

    // RNG instrumentation
    enableRngLogging();
    getRngLog();
    clearRngLog();

    // Wizard mode (for map sessions)
    teleportToLevel(depth);             // Ctrl+V equivalent
    revealMap();                        // Ctrl+F equivalent

    // Debugging
    checkpoint(phase);                  // Capture full state snapshot
}
```

### 2. Harness Becomes Thin

`test/comparison/session_test_runner.js` only:

1. Loads and normalizes session data
2. Constructs game with requested options
3. Feeds keys through core replay API
4. Compares expected vs actual
5. Emits diagnostics and results

**No gameplay simulation in harness.**

Target harness code:

```javascript
async function replaySession(session) {
    const game = await HeadlessGame.start(session.seed, session.options);
    const results = { startup: captureState(game), steps: [] };

    for (const step of session.steps.slice(1)) {
        game.clearRngLog();
        await game.sendKey(step.key);
        results.steps.push(captureState(game));
    }

    return results;
}

function captureState(game) {
    return {
        rng: game.getRngLog(),
        screen: game.getScreen(),
        typGrid: game.getTypGrid(),
    };
}
```

### 3. Comparators Stay Focused

`test/comparison/comparators.js` remains pure comparison logic.
May format diffs, but does not interpret gameplay behavior.

---

## Fidelity Model

Fidelity checked in three channels, all preserved:

### PRNG

Per startup and per step:
- Compare RNG calls (source tags normalized)
- Preserve first divergence: step index, RNG index, expected call, actual call

### typGrid

For map/special sessions:
- Compare per-level grid with exact cell diffs
- Keep deterministic regeneration check

### Screen

Per step:
- Compare normalized screen rows
- Keep row-level first mismatch reporting
- Preserve ANSI normalization support

---

## Debuggability Requirements

When a session fails, output must answer:

1. Where did divergence start?
2. Is it startup or gameplay?
3. Is it RNG, grid, screen, or multiple channels?
4. What was the last matching step/key?

Required outputs:
- Machine-readable JSON results bundle
- Human summary with first divergence
- Optional verbose trace mode by session/type filter
- No-loss evidence: failed runs retain same fidelity as passing runs

---

## Implementation Phases

### Phase 0: Baseline Snapshot

1. Capture current session failure signatures and runtime timings
2. Freeze sentinel sessions (chargen, gameplay, map, special)
3. Capture baseline insight-speed metrics

**Exit**: Baseline artifact exists for regression comparison.

### Phase 1: Define Core Replay Contract

1. Specify structured replay-step return schema
2. Add unit tests for replay-step invariants
3. Document API contract

**Exit**: Core exposes stable replay API.

### Phase 2: Move Step Semantics into Core

Move behavior currently in harness into core:
- Pending input/prompt continuation
- Count-prefix handling
- Staircase transition timing
- Message boundary behavior

**Exit**: Harness no longer contains these semantics.

### Phase 3: Unify Session Types on Core Path

1. Chargen, gameplay, map, special all use one execution primitive
2. Wizard navigation (teleport, reveal) stays in core

**Exit**: Type branching in harness is only comparison policy, not behavior.

### Phase 4: Delete session_runtime.js

1. Remove gameplay logic from `session_runtime.js`
2. Keep only adapters to call core replay APIs
3. Move structural validators to `test/comparison/validators.js`

**Exit**: `session_runtime.js` removed or reduced to thin wiring (<100 lines).

### Phase 5: Harden Comparators and Diagnostics

1. Keep strict PRNG/typGrid/screen checks
2. Improve first-divergence diagnostics
3. Add single-session debug mode for rapid iteration

**Exit**: Failure reports at least as actionable as before.

### Phase 6: Cleanup and Docs

1. Delete obsolete harness compatibility paths
2. Update docs to describe core replay architecture
3. Remove any temporary migration toggles

**Exit**: No harness game-awareness detritus remains.

---

## Performance

Keep it simple:

1. **Parallel execution**: Run sessions concurrently via worker threads
2. **Report failures immediately**: Don't wait for entire suite to finish

Avoid clever optimizations that obscure what the harness is doing.

---

## Risks and Mitigations

### Risk: Refactor reduces diagnostic quality

Mitigation:
- Keep existing result bundle schema stable
- Add parity checks for diagnostic fields before deleting old paths

### Risk: Hidden coupling in current replay heuristics

Mitigation:
- Port behavior incrementally with sentinel sessions
- Land small steps that keep one replay path live at all times

### Risk: Core API churn breaks selfplay

Mitigation:
- Move selfplay onto shared replay-safe runtime in parallel
- Add adapter contract tests in `test/unit`

---

## Acceptance Criteria (Final)

All must be true:

1. `npm run test:session` runs all session types through one core replay path
2. Harness does not implement game turn logic or command semantics
3. PRNG, typGrid, and screen diffs retain per-step granularity
4. Determinism checks remain for map generation replay
5. Debug output identifies first divergence with step-level context
6. No feature-flagged replay split remains in final code
7. `session_runtime.js` deleted or <100 lines of pure wiring

---

## Immediate Next Tasks

1. Add replay-step contract test file under `test/unit`
2. Move one harness heuristic (count-prefix or pending prompt) into core
3. Verify no regression in sentinel sessions

---

## Non-Goals

- Changing session file format (v3 is stable)
- Requiring full green parity before refactor completion
- Rewriting all historical diagnostic scripts immediately

## References

- `js/headless_runtime.js` (977 lines) - Core game headless support
- `test/comparison/session_runtime.js` (1457 lines) - Target for elimination
- `docs/SESSION_FORMAT_V3.md` - Session file format specification
- `CORE_REPLAY_PLAN.md` - Original design document (to be deleted after merge)
