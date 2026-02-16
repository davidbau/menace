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

## Decision Record (2026-02-16)

These choices resolve the remaining differences between this plan and `CLEANUP_PLAN.md`.

1. Core startup uses **one init path**.
   - Decision: keep `async init(initOptions)` as the only startup entrypoint; no separate `initInteractive` vs `parityInit`.
   - Rationale: one startup codepath eliminates divergence risk between browser and replay boot.
2. Hooks belong in **dependencies**, not gameplay options.
   - Decision: keep hooks under `deps.hooks`.
   - Rationale: options represent game state/flags (seed, role, wizard); hooks are integration observers and should be runtime-injected.
3. Use a **single headless runtime module**.
   - Decision: `js/headless_runtime.js` is the shared location for headless display/runtime wiring.
4. Standardize immediately on **`test:session`**.
   - Decision: remove `test:sessions` alias from target scripts and docs.
5. No explicit feature-flag rollout; no transition detritus at end state.
   - Decision: use phased rollout with baseline + diff guardrails, then delete temporary migration scaffolding.
6. Keep hard cleanup goals, tied to observed repo state.
   - Baseline observations (current files): `test/comparison/session_helpers.js` is 2250 lines; `test/comparison/session_test_runner.js` is 1133 lines; `test/comparison/headless_game.js` is 615 lines.
   - Decision: enforce measurable reduction targets in acceptance criteria.
7. Use `session_loader.js` + `comparators.js` naming.
   - Decision: canonical split is format normalization (`session_loader.js`) and pure comparison functions (`comparators.js`).
   - Rationale: simpler, role-specific naming than a broad `comparison_utils.js`.

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
   - Headless runtime adapter
3. **Session runner**:
   - Load/normalize session file
   - Drive core through headless adapter
   - Compare outputs

## Data flow

1. C harness captures canonical session artifacts.
2. Session loader normalizes format to one internal schema.
3. Unified runner replays via core `init(...)` + `feedKey(...)` APIs.
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

1. `async init(initOptions)`
   - Single startup path for both interactive and parity modes.
2. `async feedKey(key)`
   - Inject a key and process one replay step.
3. `getTypGrid()`
   - Read current terrain grid from core map state.
4. `getRngLog()`
   - Return current RNG trace (or snapshot delta helper).
5. `async wizardLevelTeleport(targetDepth)`
   - Programmatic equivalent of wizard level teleport path.
6. `snapshotScreen()`
   - Canonical screen capture from active display adapter.

### `init(initOptions)` expected behavior

1. Set seed and initialize RNG.
2. Apply character options directly for parity mode (skip interactive chargen UI).
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

1. `js/headless_runtime.js`

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
3. Construct and initialize `NetHackGame` via `init({ mode: "parity", ... })`.
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
4. `npm test` and `npm run test:all` may remain as wrappers, but they must call only the three canonical categories above.

## Proposed script end-state

```json
{
  "scripts": {
    "test:unit": "node --test test/unit/*.test.js",
    "test:e2e": "node --test --test-concurrency=1 test/e2e/*.test.js",
    "test:session": "node --test test/comparison/sessions.test.js",
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

1. Add/complete one `init(initOptions)` path with parity mode support.
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
3. Remove temporary migration aliases and wrappers not part of final contract.

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
3. `js/headless_runtime.js`
   - shared headless display/runtime implementation
4. `js/runtime/browser_adapter.js` (new)
   - browser boot/url/lifecycle wiring
5. `js/runtime/headless_adapter.js` (new)
   - optional thin replay/selfplay wiring around `js/headless_runtime.js`

## Session infra

1. `test/comparison/session_test_runner.js`
   - orchestrator only
2. `test/comparison/session_helpers.js`
   - pure parse/compare utilities only
3. `test/comparison/session_loader.js` (new)
   - normalization layer
4. `test/comparison/comparators.js` (new)
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
   - Mitigation: keep migration PRs small and update docs/scripts atomically; remove temporary migration glue at end.

## Decision Confirmations

1. `HeadlessDisplay` and headless runtime live in `js/headless_runtime.js`.
2. `feedKey` remains async.
3. Startup RNG ordering must remain faithful in parity-mode `init(...)`.
4. One runner path is required; multiple suite wrappers are optional reporting shells only.

## Acceptance Criteria

Complete means all are true:

1. Official command contract is exactly three run categories (`unit`, `e2e`, `session`).
2. Session logical subtypes exist only as grouping/filtering, not separate execution paths.
3. Session infrastructure does not duplicate game turn or level logic.
4. Core game can run in both browser and headless via dependency injection.
5. Shared headless runtime is used by session and selfplay.
6. Wizard mode and level teleport workflows are covered in unified session replay.
7. Legacy runner duplicates are removed.
8. `test/comparison/headless_game.js` is deleted (current baseline: 615 lines).
9. `test/comparison/session_helpers.js` is reduced from 2250 lines to utility-only scope (target <= 500 lines, no game loop/turn/level emulation).
10. `test/comparison/session_test_runner.js` is reduced from 1133 lines to orchestrator-only scope (target <= 350 lines).
11. `package.json` exposes `test:session` (singular) as the canonical session command and does not include `test:sessions`.

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
3. PR 3: Add concrete parity APIs (`init` parity mode, `feedKey`, helpers).
4. PR 4: Shared headless display/runtime modules.
5. PR 5: Session normalization loader + pure comparators.
6. PR 6: Replace session runner internals with unified orchestrator.
7. PR 7: Migrate selfplay to shared runtime.
8. PR 8: Script/docs canonicalization and legacy cleanup.
