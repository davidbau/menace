# Stringent Ordering Branch Plan

## Vision

Create a branch where we **increase test stringency and reduce code degrees of
freedom** to force faster convergence to a faithful C port. The current approach
allows "close enough" parity by tolerating screen timing differences, duplicate
data structures, and fallback patterns. This plan removes those escape hatches.

## Philosophy

Overfitting to tests happens when the code has degrees of freedom that allow
passing test cases without matching C's actual behavior. Two sources:

1. **Test leniency**: comparators that tolerate screen-boundary shifts, ignore
   event ordering, or skip mapdump field comparison. These let incorrect
   ordering pass.

2. **Code degrees of freedom**: duplicate state (`player` vs `u`, `map` vs
   `lev`, `context` vs `svc.context`), fallback chains (`game.u || game.player`),
   duplicate functions (14+ pairs), and alias re-exports. These let the code
   "work" via a different path than C, hiding divergence.

The stringent branch eliminates both: stricter tests AND simpler code.

## Branch Strategy

- **Branch name**: `stringent-ordering`
- **Base**: current `main` (439/442)
- **Expected initial regression**: WIDE — possibly 300+ sessions. This is
  expected and acceptable. The branch does NOT need to pass the suite initially.
- **Merge criteria**: passes full suite with stricter comparison AND has fewer
  code degrees of freedom than main.
- **Work discipline**: each commit either tightens a test OR removes a degree
  of freedom, never both at once. This makes regressions attributable.

## Phase 1: Tighten Test Comparison (no code changes)

Goal: make the comparator catch more real divergences without changing game code.

### 1a. Per-step screen comparison with monster-message ownership

Currently the screen comparator allows timing shifts where monster messages
appear one step early or late. Tighten: require row 0 message content to
match at each step, including `--More--` boundaries.

**Expected regressions**: any session where Phase B monster messages appear at
a different step than C (estimated: 3-10 sessions from Gate 2 work, plus more
from existing pre-Gate-2 timing bugs).

### 1b. Mapdump field-level comparison

Currently mapdump comparison checks a signature hash. Tighten: compare
individual fields — monster HP, monster position, object locations, object
properties (dknown, bknown, etc.) — and report the FIRST field mismatch.

**Expected regressions**: sessions where monster stats or object properties
diverge even though the map looks identical.

### 1c. Event ordering strictness

Currently some events are filtered as "ignorable" (`^place`, `^remove`,
`^wipe`, etc.). Review each filter: if C reliably emits the event, JS
should too. Remove ignorable filters one at a time and fix the JS code
to emit the correct events.

### 1d. Cursor position and visibility

Currently cursor comparison has tolerance. Tighten to exact match
(column, row, visibility flag).

## Phase 2: Unify Duplicate State (code simplification)

Goal: remove the degrees of freedom that allow overfitting.

### 2a. Unify `player` → `u`

**Problem**: 178 occurrences of `(game.u || game.player)`. C uses `u` (a global).
The dual reference allows code to work with either, masking initialization bugs.

**Fix**:
1. Choose one canonical property: `game.u` (matches C naming)
2. Set `game.player` as a read-only alias: `Object.defineProperty(game, 'player', { get() { return this.u; } })`
3. Update all `(game.u || game.player)` to just `game.u`
4. Update all function signatures that take `player` parameter to take `u`
   (or accept either for backward compat but log a deprecation warning)

**Risk**: HIGH. Touches 178+ locations across the entire codebase.
**Approach**: automated find-replace + manual review, commit per file.

### 2b. Unify `map` → `lev`

**Problem**: 97 occurrences of `(game.lev || game.map)`. Same issue.

**Fix**: same pattern as 2a. Choose `game.lev` (matches C's `level` struct).

### 2c. Unify `context` → `svc.context`

**Problem**: 71+ direct accesses to `game.svc.context.X` vs `game.context`.
The `hack.js:340` line overwrites the alias, breaking synchronization.

**Fix**: make `game.context` a getter that returns `game.svc.context`. Remove
all `game.svc.context` direct access — use `game.context` everywhere.

### 2d. Remove duplicate function implementations

**Problem**: 14+ function pairs with the same name in different files.

**Critical pairs to resolve**:
| Function | File A | File B | Resolution |
|----------|--------|--------|------------|
| `Fixed_abil` | attrib.js (real) | pray.js (stub) | Remove pray.js stub, import from attrib.js |
| `doname` | mkobj.js | objnam.js | Audit which is canonical, remove the other |
| `xname` | mkobj.js | objnam.js | Same |
| `can_carry` | pickup.js | invent.js | Unify |
| `count_unpaid` | shk.js | pickup.js | Unify |
| `erosion_matters` | trap.js | mkobj.js | Unify |

**Approach**: for each pair, determine which matches C, keep it, import from
the canonical location.

### 2e. Remove CamelCase alias re-exports

**Problem**: 72+ bidirectional alias pairs via `setAliasPair`. Both the
camelCase and snake_case names work, doubling the API surface.

**Fix**: Choose one naming convention per module. For C-parity files, use
C names (snake_case). For JS-only infrastructure, use camelCase. Remove
the bidirectional sync.

## Phase 3: Game Loop Ordering (from gate2-phase-b)

Goal: match C's `moveloop_core` iteration structure.

### 3a. Phase B at top of `_gameLoopStep`

Merge the gate2-phase-b work: move `advanceTimedTurn` from bottom of
`run_command` to top of `_gameLoopStep`. Set `context.move` only for
timed commands.

**Current result**: 436/442, seed031 step 635→710. 3 screen regressions
from capture timing shift (expected).

### 3b. Fix screen capture at Phase B `--More--` boundaries

The 3 screen regressions (hi15, hi17, t06) are from `more()` clearing the
message before the screen capture. Fix: when `more()` fires during Phase B
(monster turn), preserve the message for the screen capture at the following
`nhgetch`.

### 3c. Move repeat dispatch to `_gameLoopStep`

Replace `repeatLoop` internal loop with `_gameLoopStep` Phase E handler.
Each repeat step returns to the outer loop, which runs Phase B (monsters)
before the next repeat — matching C's one-iteration-per-repeat model.

### 3d. `nomul`/`afternmv` timing for armor removal

Re-attempt the armoroff change (reverted from main) once the game loop
reorder is stable. `nomul(delay)` + `afternmv` is C's model for multi-turn
armor removal.

## Phase 4: Display Parity

### 4a. `newsym` / `vision_recalc` rendering match

Ensure JS's `newsym` calls match C's exactly — same cells updated at the
same points. Currently JS calls `docrt` / `postRender` after every command,
while C relies on targeted `newsym` + `flush_screen`.

### 4b. Running display buffering

C's RUN_LEAP mode (`svm.moves % 7 == 0`) doesn't flush every step. JS
always renders. This causes seed032's screen divergence. Fix: track
"unflushed" cells and only render them when C would flush.

## Catalog of Systematic Problems

| # | Problem | Occurrences | Files | Impact |
|---|---------|-------------|-------|--------|
| 1 | `(game.u \|\| game.player)` fallback | 178 | 20+ | Masks init bugs |
| 2 | `(game.lev \|\| game.map)` fallback | 97 | 15+ | Masks init bugs |
| 3 | Duplicate functions (14 pairs) | 28+ | 10+ | Wrong impl selected |
| 4 | `context` vs `svc.context` | 71 | 8+ | State desync |
| 5 | CamelCase alias re-exports | 72 | 3 | Double API surface |
| 6 | `Fixed_abil` stub in pray.js | 1 | 1 | Prayer divergence |
| 7 | Game loop ordering (Phase B) | 1 | 1 | seed031/033 |
| 8 | Display buffering (RUN_LEAP) | 1 | 1 | seed032 |
| 9 | `more()` clears before capture | 3 | 1 | Screen shift |
| 10 | Parameter passing inconsistency | 200+ | 20+ | Hidden dependencies |

## Execution Order

1. Create branch from main
2. Phase 2d first (duplicate functions) — highest impact, localized
3. Phase 1b (mapdump field comparison) — catches hidden divergences
4. Phase 3a (game loop Phase B) — already validated on gate2-phase-b
5. Phase 2a (player → u) — biggest refactor, do after loop is stable
6. Phase 2b (map → lev) — same pattern
7. Phase 1a (screen message ownership) — after loop reorder
8. Phase 3b (Phase B `--More--` fix) — after screen comparison tightened
9. Phase 3c (repeat dispatch) — after Phase B is stable
10. Phase 4 (display parity) — last, depends on everything above

## Success Criteria

The branch is ready to merge when:
1. Full test suite passes with ALL Phase 1 comparison tightening active
2. No `(game.u || game.player)` or `(game.lev || game.map)` fallbacks remain
3. No duplicate function implementations
4. Game loop matches C's Phase B → C → D → E → F ordering
5. seed031 passes (or diverges only at monmove, not game loop boundary)
6. seed032 screen parity improved
7. seed033 passes (or diverges only at monmove)

## Risk

**Very high.** This branch changes foundational structures (player state,
map state, context state, game loop ordering, test comparison) simultaneously.
The initial regression will be massive. The work should take multiple sessions
and should NOT be rushed to merge.

The payoff is a codebase that converges faster because overfitting is harder:
every test failure has a real cause, and every fix addresses the real cause
rather than finding an alternative path that happens to pass.
