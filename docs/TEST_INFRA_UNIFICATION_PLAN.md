# Test Infrastructure Unification Plan (Best-of-Both)

## Purpose

This document merges:

1. The architectural rigor and governance of the unification plan.
2. The concrete API and migration details from `CLEANUP_PLAN.md`.

It is both a design doc and a practical implementation guide.

## Executive Decisions (Non-Negotiable)

1. There are only **three official ways of running tests**:
   - `unit`
   - `e2e`
   - `session`
2. Session tests may have multiple logical subtypes (chargen, gameplay, map, special, interface, option), but they must run through **one session runner path**.
3. Session infrastructure must not re-implement game behavior.
4. NetHack behavior must live in game code; test code should drive and compare.

## Why This Cleanup Is Necessary

Current testing has drifted into a dual-engine model:

1. Users run `NetHackGame` in browser.
2. Session tests run a separate `HeadlessGame` implementation in `test/comparison/session_helpers.js`.

That causes:

1. Split bug fixes (fixing one path can leave the other broken).
2. Lower confidence (tests can pass while production behavior diverges).
3. Increased maintenance cost.

## Clarification: Categories vs Entry Points

You can keep many logical session categories for organization and reporting.

Examples:

1. `chargen`
2. `gameplay`
3. `map`
4. `special`
5. `interface`
6. `options`

But operationally, those are all submodes of one `session` test entrypoint.

## Observed Problem Areas (Current Repo)

1. `js/nethack.js` mixes core game logic with browser boot and URL/lifecycle concerns.
2. `js/input.js` is browser-global by default.
3. `test/comparison/session_helpers.js` contains duplicated turn and level logic.
4. `test/comparison/session_test_runner.js` duplicates chargen/menu rendering logic.
5. Multiple headless/runtime variants exist:
   - `test/comparison/session_helpers.js`
   - `test/comparison/headless_game.js`
   - `selfplay/runner/headless_runner.js`
   - `selfplay/interface/js_adapter.js` (partial overlap)
6. Legacy runner paths still exist and overlap.

## Target Architecture

## Mental model

The game owns behavior; tests own orchestration and comparison.

## Runtime layers

1. **Core game engine** (reusable, no hard browser assumptions).
2. **Runtime adapters**:
   - Browser adapter
   - Headless adapter
3. **Session runner**:
   - Load/normalize session file
   - Drive core through headless adapter
   - Compare outputs

## Data flow

1. C harness captures canonical session artifacts.
2. Session loader normalizes format to one internal schema.
3. Unified runner replays via core APIs.
4. Comparison utilities report divergence.

## Core API Direction (Concrete)

## Constructor with injected dependencies

```js
class NetHackGame {
  constructor(options = {}, deps = {}) {
    // options: seed, wizard, role/race/gender/align/name, flags
    // deps: display, input, storage, lifecycle, hooks
  }
}
```

### Recommended `options` shape

```js
{
  seed: 42,
  wizard: true,
  enableRngLog: false,
  name: "Wizard",
  role: "Valkyrie",
  race: "human",
  gender: "female",
  align: "neutral",
  flags: {
    DECgraphics: true,
    autopickup: false,
    time: false,
    verbose: true
  },
  startup: {
    startDepth: 1,
    startDnum: 0,
    startDlevel: 1,
    tutorialMode: false
  }
}
```

### Recommended `deps` shape

```js
{
  display, // Display-compatible implementation
  input: {
    nhgetch,
    getlin,
    pushInput, // optional helper for replay
  },
  storage: {
    loadSave,
    saveGame,
    deleteSave,
    loadFlags,
    saveFlags,
  },
  lifecycle: {
    restart,           // browser reload equivalent
    replaceUrlParams,  // browser history equivalent
  },
  hooks: {
    onStartup,
    onStep,
    onLevelGenerated,
  }
}
```

## Core methods to add or formalize

These preserve the useful concreteness from `CLEANUP_PLAN.md` while fitting the adapter architecture.

1. `async initInteractive()`
   - Browser-first startup flow (current user-facing behavior).
2. `async parityInit(sessionOptions)`
   - Non-interactive startup for session replay.
3. `async feedKey(key)`
   - Inject a key and process one replay step.
4. `getTypGrid()`
   - Read current terrain grid from core map state.
5. `getRngLog()`
   - Return current RNG trace (or snapshot delta helper).
6. `async wizardLevelTeleport(targetDepth)`
   - Programmatic equivalent of wizard level teleport path.
7. `snapshotScreen()`
   - Canonical screen capture from active display adapter.

### `parityInit(sessionOptions)` expected behavior

1. Set seed and initialize RNG.
2. Apply character options directly (skip interactive chargen UI).
3. Apply wizard mode/flags.
4. Initialize level generation in C-faithful order.
5. Generate and place player on first level.
6. Run post-level initialization.
7. Emit startup hook snapshot.

### `feedKey(key)` expected behavior

1. Inject key via input adapter (`pushInput` or equivalent).
2. Process command through core command path.
3. Run any resulting turn effects through core turn logic.
4. Capture delta artifacts (RNG/screen/typGrid when relevant).
5. Emit step hook snapshot.

## Hook contract (from core)

Hooks should be emitted by game code, not synthesized by tests.

1. `onStartup(snapshot)`
   - `{ rng, screen, typGrid, turn, depth, checkpoints? }`
2. `onStep(snapshot)`
   - `{ key, action, rng, screen, typGrid?, turn, depth }`
3. `onLevelGenerated(snapshot)`
   - `{ depth, dnum?, dlevel?, typGrid, flagGrid, wallInfoGrid, checkpoints }`

## Headless Display Contract (Concrete)

Create a shared `HeadlessDisplay` implementation in game/runtime code, not test-only duplication.

Recommended location:

1. `js/runtime/headless_display.js` (preferred)

Alternative (acceptable transitional):

1. `js/headless_display.js`

Required methods:

1. `putstr(col, row, text, color, attr?)`
2. `putstr_message(msg)`
3. `clearRow(row)`
4. `clearScreen()`
5. `setCell(col, row, ch, color, attr?)`
6. `renderMap(map, player, fov, flags)`
7. `renderStatus(player)`
8. `renderChargenMenu(lines, isFirstMenu)`

Test-support methods:

1. `getScreenLines()`
2. `getScreenAnsi()` (optional if needed for ANSI parity workflows)
3. `setScreenLines(lines)` (optional for compatibility/testing only)

## Session Format Strategy

## Normalize first, replay second

Create a normalization module that maps v1/v2/v3 session files into one canonical internal schema.

Why:

1. Keeps format complexity out of gameplay execution.
2. Reduces runner conditionals.
3. Makes unsupported edge cases explicit.

### Canonical internal schema

```js
{
  meta: {
    version,
    source,
    seed,
    type,
    options,
  },
  startup: {
    rng,
    screen,
    screenAnsi,
    typGrid,
    checkpoints,
  },
  steps: [
    {
      key,
      action,
      rng,
      screen,
      screenAnsi,
      typGrid,
      checkpoints,
    }
  ]
}
```

## Session Runner Design

## Runner responsibilities

1. Load + normalize sessions.
2. Build headless runtime.
3. Construct and initialize `NetHackGame` via `parityInit`.
4. Replay all steps via `feedKey`.
5. Compare actual vs expected via pure comparator utilities.
6. Produce summary and per-session divergence details.

## Runner non-responsibilities

1. No duplicated turn scheduling.
2. No duplicated level transition logic.
3. No duplicated chargen menu construction logic.

## Logical grouping behavior

Keep grouping for filtering/reporting only:

1. `--group=chargen`
2. `--group=map`
3. `--group=gameplay`
4. `--group=special`
5. `--group=interface`
6. `--group=options`

But all groups run through one runner path.

## Test Command Contract (Three Official Ways)

Canonical commands:

1. `npm run test:unit`
2. `npm run test:e2e`
3. `npm run test:session`

Transitional compatibility:

1. Keep `npm run test:sessions` as alias to `test:session` until migration completes.
2. Keep `npm test` / `npm run test:all` only as wrappers around the three canonical commands.

## Proposed script end-state

```json
{
  "scripts": {
    "test:unit": "node --test test/unit/*.test.js",
    "test:e2e": "node --test --test-concurrency=1 test/e2e/*.test.js",
    "test:session": "node --test test/comparison/sessions.test.js",
    "test:sessions": "npm run test:session",
    "test": "npm run test:unit && npm run test:session",
    "test:all": "npm run test:unit && npm run test:session && npm run test:e2e"
  }
}
```

## Phased Plan

### Phase 0: Baseline and safety rails

Motivation:

1. Protect parity while refactoring internals.

Tasks:

1. Capture baseline pass/fail/runtime for unit/e2e/session.
2. Add temporary old-vs-new session runner diff checks.
3. Freeze session corpus during core extraction.

Exit criteria:

1. Baseline artifacts captured.
2. Diff signal available for migration PRs.

### Phase 1: Extract reusable core from `js/nethack.js`

Motivation:

1. Session replay should target actual game engine code.

Tasks:

1. Split browser bootstrap from core game class.
2. Export core class/module.
3. Move browser URL and lifecycle behavior to adapter.

Exit criteria:

1. Browser gameplay unchanged.
2. Core constructible in Node without DOM boot.

### Phase 2: Introduce dependency injection runtime

Motivation:

1. Eliminate hard browser assumptions from core command loop.

Tasks:

1. Refactor input path to support injected input provider.
2. Formalize display dependency contract.
3. Wire lifecycle callbacks instead of direct browser reload/history calls.

Exit criteria:

1. Core path works without direct `window`/`document` dependency.
2. e2e tests remain green.

### Phase 3: Implement concrete parity APIs

Motivation:

1. Session runner needs stable core entrypoints.

Tasks:

1. Add/complete `parityInit(sessionOptions)`.
2. Add/complete `feedKey(key)`.
3. Add `getTypGrid()` and `getRngLog()` helpers.
4. Add `wizardLevelTeleport(targetDepth)` wrapper over core transition logic.

Exit criteria:

1. Runner can drive game entirely through these APIs.

### Phase 4: Shared `HeadlessDisplay` + runtime package

Motivation:

1. Replace duplicated display/runtime shims.

Tasks:

1. Create shared headless display/runtime module.
2. Port session runner to shared runtime.
3. Port selfplay runner to shared runtime.

Exit criteria:

1. One shared headless runtime implementation in repo.

### Phase 5: Session loader normalization layer

Motivation:

1. Prevent schema complexity from contaminating replay execution.

Tasks:

1. Build normalizer for v1/v2/v3 session files.
2. Move compatibility quirks into normalizer.
3. Keep replay loop schema-agnostic.

Exit criteria:

1. One canonical internal session shape.

### Phase 6: Rewrite session runner as orchestrator only

Motivation:

1. Remove game logic from test infrastructure.

Tasks:

1. Replace category-specific game behavior branches.
2. Keep only orchestration + comparison.
3. Move comparators into pure utility modules.

Exit criteria:

1. Session runner has no duplicated turn/level behavior.

### Phase 7: Wizard fidelity and map/depth workflows

Motivation:

1. C parity workflows depend heavily on wizard operations.

Tasks:

1. Verify wizard commands and level teleport flows in unified runner.
2. Add session fixtures for wizard transitions.
3. Ensure typGrid/flagGrid/wallInfo checkpoints are emitted consistently.

Exit criteria:

1. Wizard sessions pass through unified runner with no special harness path.

### Phase 8: Canonicalize scripts/docs and remove legacy paths

Motivation:

1. Prevent future tool fragmentation.

Tasks:

1. Enforce three official run paths in scripts/docs.
2. Remove deprecated runner files and duplicated helpers.
3. Keep temporary aliases only where needed for transition.

Exit criteria:

1. No alternate session runner path remains.
2. Docs match implemented command contract.

## File-Level Refactor Map

## Core/runtime

1. `js/nethack.js`
   - extract core and adapter boundaries
   - add/finish parity APIs
2. `js/input.js`
   - separate browser listener from injectable queue/provider
3. `js/runtime/headless_display.js` (or `js/headless_display.js`)
   - shared display implementation
4. `js/runtime/browser_adapter.js` (new)
   - browser boot/url/lifecycle wiring
5. `js/runtime/headless_adapter.js` (new)
   - replay/selfplay wiring

## Session infra

1. `test/comparison/session_test_runner.js`
   - orchestrator only
2. `test/comparison/session_helpers.js`
   - pure parse/compare utilities only
3. `test/comparison/session_loader.js` (new)
   - normalization layer
4. `test/comparison/comparison_utils.js` (new or extracted)
   - RNG/grid/screen comparators
5. `test/comparison/sessions.test.js`
   - wrapper around unified runner output

## Selfplay

1. `selfplay/runner/headless_runner.js`
   - consume shared runtime
2. `selfplay/interface/js_adapter.js`
   - keep adapter responsibilities; remove overlapping engine logic

## Likely deletions

1. `test/comparison/headless_game.js`
2. duplicated `HeadlessGame` logic in `test/comparison/session_helpers.js`
3. `test/comparison/session_runner.test.js`
4. `test/comparison/interface_test_runner.js`
5. `test/comparison/interface_test_runner.test.js`

## Risks and Mitigations

1. Risk: parity regressions while extracting core.
   - Mitigation: side-by-side runner diff checks through migration.
2. Risk: hidden browser dependencies remain.
   - Mitigation: explicit runtime boundary checks and targeted tests.
3. Risk: legacy sparse sessions need quirks.
   - Mitigation: put quirks in loader normalization only.
4. Risk: migration churn for contributors.
   - Mitigation: keep temporary command aliases and clear deprecation timeline.

## Open Questions (Resolved Direction)

1. Where should `HeadlessDisplay` live?
   - Direction: `js/runtime/` (shared runtime code, not test-only).
2. Should `feedKey` be async?
   - Direction: yes, always async to support prompt-driven commands.
3. Should `parityInit` consume startup RNG faithfully even when skipping UI?
   - Direction: yes; parity mode must preserve RNG ordering semantics.
4. One unified `sessions.test.js` or many suite files?
   - Direction: one runner path; multiple suite wrappers optional for reporting only.

## Acceptance Criteria

Complete means all are true:

1. Official command contract is exactly three run categories (`unit`, `e2e`, `session`).
2. Session logical subtypes exist only as grouping/filtering, not separate execution paths.
3. Session infrastructure does not duplicate game turn or level logic.
4. Core game can run in both browser and headless via dependency injection.
5. Shared headless runtime is used by session and selfplay.
6. Wizard mode and level teleport workflows are covered in unified session replay.
7. Legacy runner duplicates are removed.

## Verification Checklist

After each migration phase:

1. `npm run test:unit` passes or expected diffs are explained.
2. `npm run test:e2e` passes or expected diffs are explained.
3. `npm run test:session` parity trend is stable or improved.
4. Runtime is not regressing materially for session runs.
5. Browser interactive gameplay still boots and accepts input.

## Recommended PR Sequence

1. PR 1: Runtime boundary extraction (core vs browser).
2. PR 2: Injected input/display/lifecycle contracts.
3. PR 3: Add concrete parity APIs (`parityInit`, `feedKey`, helpers).
4. PR 4: Shared headless display/runtime modules.
5. PR 5: Session normalization loader + pure comparators.
6. PR 6: Replace session runner internals with unified orchestrator.
7. PR 7: Migrate selfplay to shared runtime.
8. PR 8: Script/docs canonicalization and legacy cleanup.

