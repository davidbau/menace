# Test Infrastructure Unification Plan (Tutorial + Execution Guide)

## How To Use This Document

This is both:

1. A design doc for maintainers making architectural changes.
2. A tutorial for contributors who need to understand why these changes are needed and how to execute them safely.

If you are new to this codebase, read sections in order. If you are implementing, jump to the phased plan and file map sections.

## Motivation: Why This Cleanup Matters

Right now, test infrastructure is carrying game behavior that should live in the game itself.

That creates three recurring problems:

1. **Paradoxical failures**: a session test can fail because replay code is wrong even when game code is right.
2. **Slow iteration**: fixes require touching test internals and game internals together.
3. **Drift risk**: multiple headless implementations diverge over time.

For C parity work, this is especially expensive. We need session tests to be a trustworthy probe of core behavior, not a second game engine.

## Clarification: Test Categories vs Test Entry Points

It is fine to keep many *logical* session categories (chargen, gameplay, map, special, interface, options).

But there must be only **three official ways of running tests**:

1. `unit`
2. `e2e`
3. `session`

That means one shared session runner path, even if it reports multiple logical session groups.

## Current State (Observed in Code)

### Symptoms

1. `js/nethack.js` mixes core game lifecycle with browser wiring (`window`, URL params, DOM boot).
2. `js/input.js` assumes browser globals and DOM listeners.
3. `test/comparison/session_helpers.js` includes a large custom `HeadlessGame` with turn processing and level logic.
4. `test/comparison/session_test_runner.js` rebuilds chargen/menu behavior that already exists in game code.
5. Multiple headless implementations exist:
   - `test/comparison/session_helpers.js`
   - `selfplay/runner/headless_runner.js`
   - `test/comparison/headless_game.js`
   - `selfplay/interface/js_adapter.js` (headless display path)
6. Session execution currently fans out into pseudo-categories (`chargen`, `interface`, `map`, `gameplay`, `special`, `other`) with category-specific behavior.
7. Legacy runner paths remain (`test/comparison/session_runner.test.js`, interface runners).

### Why This Is Unstable

When replay logic has to implement command semantics, turn scheduling, and level transitions, the runner is no longer neutral. It becomes another behavior surface that can diverge from `NetHackGame`.

## Target State (Mental Model)

### One sentence model

**The game owns behavior; tests only drive and observe.**

### What changes

1. Core game engine is reusable and injectable.
2. Browser concerns are adapter code.
3. Headless execution uses the same core path as browser gameplay.
4. Session runner becomes: load session -> feed keys -> collect hooks -> compare.
5. Only three official test run commands exist.

### What does not change

1. Logical session purposes can remain varied.
2. Session corpus can migrate incrementally.
3. Existing C harness tooling can remain while runner internals are simplified.

## Design Principles (With Rationale)

1. **Single source of behavior truth**
   - Rationale: prevents replay/game divergence.
2. **Adapters at the edges**
   - Rationale: browser and headless should be wrappers, not alternate engines.
3. **Compatibility in loaders, not in gameplay**
   - Rationale: v1/v2/v3 session differences should be normalized before replay.
4. **Deterministic observability hooks**
   - Rationale: parity debugging needs first-class snapshots (RNG, screen, typ/flag/wall grids).
5. **One session runner path**
   - Rationale: category fan-out should be reporting/filtering only.

## Architecture Plan (Tutorial Walkthrough)

## Step 1: Refactor the core so it can be constructed directly

Today:

1. `NetHackGame` is private to `js/nethack.js`.
2. Startup is coupled to URL parsing and `DOMContentLoaded`.

Target:

1. Export a reusable core module/class.
2. Construct core with explicit options object.
3. Move browser-specific setup into a browser bootstrap adapter.

Why: session and selfplay runners can instantiate real game core directly.

### Step 2: Inject input/output/lifecycle dependencies

Today:

1. Input path depends on DOM listener and `window.gameFlags`.
2. Core invokes browser-only operations (reload/history).

Target:

1. Core consumes injected I/O contract:
   - input provider (`nhgetch`, `getlin`)
   - display provider
   - lifecycle callbacks (reload/reset)
2. Browser adapter supplies DOM-backed implementations.
3. Headless adapter supplies memory-backed implementations.

Why: same game code runs in browser and headless tests.

### Step 3: Build one shared headless runtime

Today:

1. At least three headless/game shims exist.

Target:

1. One shared headless runtime package used by:
   - session runner
   - selfplay runner
   - any replay/debug tooling

Why: eliminates drift and duplicate fixes.

### Step 4: Simplify session runner to driver + comparator

Today:

1. Session replay has many heuristics to emulate behavior.

Target replay contract:

1. Normalize session file schema.
2. Instantiate core + headless adapter with session options.
3. Feed keys exactly in order.
4. Capture per-step hooks from core.
5. Compare captured outputs to expected outputs.

Why: makes session failures attributable to core behavior, not replay implementation details.

### Step 5: Expose capture hooks from core (not test scaffolding)

Add optional hooks that are emitted by core:

1. `onStartup(snapshot)`
2. `onStep({ key, action, rng, screen, turn, depth })`
3. `onLevelGenerated({ depth, typGrid, flagGrid, wallInfoGrid, checkpoints })`

Rationale:

1. Avoids reconstructing state from side effects.
2. Makes C parity diffs immediate and stable.

## API Direction

### Initialization options (command-line equivalent)

Use one canonical options object:

```js
{
  seed: 42,
  wizard: true,
  role: "Valkyrie",
  race: "human",
  gender: "female",
  align: "neutral",
  playerName: "Wizard",
  flags: {
    DECgraphics: true,
    autopickup: false,
    time: false,
    verbose: true
  },
  startup: {
    startDnum: 0,
    startDepth: 1,
    startDlevel: 1,
    tutorialMode: false
  }
}
```

### Dependency contract

```js
{
  input: { nhgetch, getlin },
  display: { /* Display-compatible methods */ },
  storage: { loadSave, saveGame, loadFlags, saveFlags },
  lifecycle: { restart, replaceUrlParams },
  hooks: { onStartup, onStep, onLevelGenerated }
}
```

## Session Loader Strategy (Compatibility Layer)

Keep compatibility logic in one place:

1. Normalize v1/v2/v3 into one internal schema.
2. Normalize fields (`startup` step shape, screens, rng arrays, typGrid/checkpoint placement).
3. Emit explicit unsupported markers for impossible legacy cases.

Do not carry schema-specific branching into game step execution.

## Three Official Test Run Paths

The repo should document these as canonical:

1. `npm run test:unit`
2. `npm run test:e2e`
3. `npm run test:session`

Wrappers like `npm test` or `npm run test:all` are allowed only as aggregators over those three paths. They must not introduce separate session runners.

## Phased Execution Plan (Each Phase Includes Motivation)

### Phase 0: Baseline and guardrails

Motivation:

1. We need confidence that refactor failures are detected quickly.

Tasks:

1. Capture baseline pass/fail and runtime for unit/e2e/session.
2. Add temporary side-by-side old/new session runner diff in CI.
3. Freeze session corpus during core migration.

Exit criteria:

1. Baseline metrics stored.
2. Old/new runner diff report available.

### Phase 1: Extract reusable core from `js/nethack.js`

Motivation:

1. Session runner cannot be simple until game core is constructible without browser boot.

Tasks:

1. Export core class/module from `js/nethack.js` split.
2. Move `DOMContentLoaded` startup into browser bootstrap module.
3. Move URL option parsing and reset URL handling into adapter layer.
4. Replace direct reload/history calls with lifecycle callbacks.

Exit criteria:

1. Browser behavior unchanged.
2. Core can initialize in Node without DOM boot code.

### Phase 2: Introduce injectable I/O runtime

Motivation:

1. Core should never depend directly on `document` or `window` for input flow.

Tasks:

1. Refactor `js/input.js` into reusable queue/input provider + browser listener adapter.
2. Ensure core consumes injected `nhgetch/getlin` path.
3. Keep existing display API but formalize required methods.

Exit criteria:

1. Core runs under in-memory input/display.
2. Browser adapter still passes e2e.

### Phase 3: Build one shared headless runtime

Motivation:

1. Duplicated headless engines are current drift source.

Tasks:

1. Create shared headless runtime package.
2. Port session runner to it.
3. Port selfplay runner to it.
4. Remove local `HeadlessGame` duplicates.

Exit criteria:

1. One headless game path in repository.
2. Session and selfplay use same runtime.

### Phase 4: Rewrite session runner around core hooks

Motivation:

1. Session infra should observe, not emulate.

Tasks:

1. Build normalized session loader.
2. Build single replay driver (feed keys, collect hook outputs).
3. Split pure comparators into helper modules.
4. Remove replay heuristics that implement gameplay logic.

Exit criteria:

1. One session replay path for all session files.
2. No gameplay/turn logic in session helper modules.

### Phase 5: Wizard mode and wizard-only action fidelity

Motivation:

1. Fast C parity work depends on wizard workflows (especially level teleport).

Tasks:

1. Ensure wizard mode is option-driven in core init.
2. Verify wizard commands in unified session flow:
   - level teleport
   - teleport
   - map reveal
   - genesis (as applicable)
3. Add targeted unit/session fixtures for wizard transitions.

Exit criteria:

1. Wizard sessions run through unified runner without custom replay branches.

### Phase 6: Standardize scripts and docs on 3 run paths

Motivation:

1. Tooling confusion remains unless scripts and docs are explicit.

Tasks:

1. Update `package.json` scripts to canonical three categories.
2. Ensure session wrappers delegate to one session runner only.
3. Update docs (`docs/TESTING.md`, `docs/DESIGN.md`).

Exit criteria:

1. Repo docs and CI only advertise `unit`, `e2e`, `session` as primary paths.

### Phase 7: Remove legacy runners and duplicates

Motivation:

1. Keeping old paths invites regression and confusion.

Tasks:

1. Remove deprecated runner files.
2. Remove duplicated chargen/menu reconstruction in session runner.
3. Remove stale interface runner variants.

Exit criteria:

1. No dead alternate session runner paths remain.

## File-Level Refactor Map

### Core and runtime

1. `js/nethack.js`
   - split into core + browser boot adapter
2. `js/input.js`
   - separate reusable queue/provider from browser listener wiring
3. `js/storage.js`
   - URL parsing and browser persistence treated as adapter concerns
4. `js/commands.js`
   - keep wizard commands core-compatible with injected I/O

### Session infrastructure

1. `test/comparison/session_helpers.js`
   - keep parse/compare utilities
   - remove embedded gameplay simulation
2. `test/comparison/session_test_runner.js`
   - replace with unified loader + driver + comparator orchestration
3. `test/comparison/sessions.test.js`
   - wrap unified session runner outputs

### Selfplay

1. `selfplay/runner/headless_runner.js`
   - consume shared headless runtime
2. `selfplay/interface/js_adapter.js`
   - keep adapter role, remove duplicated game-simulation concerns

### Likely legacy removals

1. `test/comparison/session_runner.test.js`
2. `test/comparison/headless_game.js`
3. `test/comparison/interface_test_runner.js`
4. `test/comparison/interface_test_runner.test.js`

## CI and Performance Targets

1. Session runtime should be at or below baseline after migration.
2. Re-runs must be deterministic.
3. Add timing metrics for:
   - total session runtime
   - per-session runtime
   - startup replay/generation time

## Risks and Mitigations

1. Risk: behavior regressions from core extraction.
   - Mitigation: side-by-side old/new session runner checks during migration.
2. Risk: hidden browser assumptions in core path.
   - Mitigation: explicit lint/check policy for `window`/`document` usage in core modules.
3. Risk: legacy sparse captures rely on current replay heuristics.
   - Mitigation: move compatibility to schema normalizer and mark unsupported edge cases explicitly.
4. Risk: contributor confusion during transition.
   - Mitigation: docs and scripts updated in same PR series.

## Acceptance Criteria

Cleanup is complete when all are true:

1. Only three official run categories are documented: `unit`, `e2e`, `session`.
2. Session tests have one execution path.
3. Session infrastructure does not implement game turn mechanics.
4. Core game initializes from explicit options (seed/wizard/role/race/gender/align/flags) without URL dependency.
5. One shared headless runtime is used by session and selfplay.
6. Wizard mode and level teleport are covered in unified session flow.
7. Legacy runner duplicates are removed.

## Recommended PR Sequence

1. PR 1: Core extraction scaffolding + browser bootstrap split.
2. PR 2: Injected input/display/lifecycle interfaces.
3. PR 3: Shared headless runtime introduction.
4. PR 4: Unified session loader + runner (behind switch).
5. PR 5: Switch `test:session` to new runner; keep temporary comparison mode.
6. PR 6: Migrate selfplay to shared runtime.
7. PR 7: Remove old runner paths and finalize docs/scripts.
