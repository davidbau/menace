# Aliasing Cleanup Plan

## Problem

The codebase has accumulated naming inconsistencies from its evolution from
a direct C port to a modern JS architecture. The same data is accessed via
multiple names, creating:

1. **Desync bugs**: Writing one name doesn't update the other (seed329's
   `peaceful`/`mpeaceful` bug — COURT flip set one but mapdump read the other)
2. **Grep confusion**: Can't search for "all monster confusion code" because
   it's split between `mon.confused` and `mon.mconf`
3. **Defensive fallback patterns**: Code like `(game.u || game.player)` that
   exists only because nobody standardized on one name

## Completed Cleanups (2026-03-21)

| Old name | New name | Files changed | Status |
|----------|----------|--------------|--------|
| `mon.peaceful` | `mon.mpeaceful` | 17 | Done |
| `mon.sleeping` | `mon.msleeping` | 15+ | Done |
| `mon.tame` | `mon.mtame` | 12+ | Done |
| `mon.confused` | `mon.mconf` | 7 | Done |
| `mon.stunned` | `mon.mstun` | 5 | Done |

## Remaining Issues

### Priority 1: Monster naming functions (CRITICAL)

**Problem**: `mon_nam`, `Monnam`, `y_monnam`, `x_monnam`, `YMonnam` are
defined in BOTH `mondata.js` and `do_name.js` with different implementations.

- `do_name.js`: Full C-style implementation with ARTICLE_NONE constants,
  proper adjective/suppress handling. Used by 40+ files.
- `mondata.js`: Lightweight wrappers over generic `monNam()` function.
  Used by `weapon.js` (possibly by accident).

**Risk**: `weapon.js` imports `Monnam` from `mondata.js` instead of
`do_name.js`, potentially producing different monster name formatting.

**Fix**: Remove duplicate definitions from `mondata.js`. All callers should
import from `do_name.js`. Fix `weapon.js` import.

### Priority 2: Map reference (`game.map` vs `game.lev`)

**Problem**: Game map is accessed as both `game.map` and `game.lev` with
defensive fallback `(game.lev || game.map)` in 10+ locations.

- `game.map` is set in `allmain.js` init
- `game.lev` may be an alias or a separate reference
- 5+ files use both with fallback patterns

**Fix**: Standardize on `game.map` (the canonical GameMap instance). Add
`get lev()` getter that returns `this.map` for backward compat, then
migrate callers.

### Priority 3: Player reference (`game.u` vs `game.player`)

**Problem**: Hero object accessed as both `game.u` (C convention) and
`game.player` (JS convention). Defensive pattern `(game.u || game.player)`
used 100+ times.

- `game.player` is the Player class instance
- `game.u` may be an alias set in the constructor

**Assessment**: Both work via defensive fallback. Low risk but high noise.
Standardize on `game.u` (matches C convention, shorter) or `game.player`
(clearer in JS). Consider adding a getter.

### Priority 4: Player coordinates (`.x`/`.y` vs `.ux`/`.uy`)

**Problem**: Player position accessed as both `player.x`/`player.y`
(JS class properties) and `player.ux`/`player.uy` (C field names).
247 occurrences of `.ux`/`.uy` across 32 files.

- Player class defines `this.x` and `this.y`
- Code references `.ux`/`.uy` which may or may not be aliased

**Fix**: Add `.ux`/`.uy` getters to Player class if not present, OR migrate
all code to `.x`/`.y`.

### Priority 5: Monster `blind` vs `mblinded`

**Problem**: Similar to the other monster field aliases. `blind` is used for
both player and monster contexts, making it hard to grep.

- C uses `mtmp->mblinded` (integer, turns remaining) for monsters
- C uses `Blind` macro / `u.uBlinded` for player
- JS uses `mon.blind` (boolean) for monsters in ~39 places
- JS uses `mon.mblinded` in ~30 places

**Complication**: C's `mblinded` is a COUNTER (turns remaining), not a
boolean. `blind` might be the boolean "is blind right now" while `mblinded`
is the turn counter. These are semantically different, not true aliases.

**Fix**: Investigate whether `blind` and `mblinded` serve different purposes.
If `blind` is always `!!mblinded`, remove `blind` and use `!!mblinded`.

### Priority 6: Display flags namespace

**Problem**: Three access patterns for flags:
- `game.flags` (game-level options)
- `game.display.flags` (display options)
- `map.flags` (level-specific flags like `is_maze_lev`)

**Assessment**: These may be genuinely different namespaces. Need
investigation to determine if any are true aliases vs separate data.

### Priority 7: Context naming (`ctx` vs `context`)

**Problem**: Both `ctx` and `context` used as variable names for the game
context object. 692 occurrences across 57 files.

**Assessment**: These are local variable names, not field aliases. Low risk.
Standardize naming convention in new code but don't churn existing code.

## Approach

For each cleanup:
1. Verify the alias relationship (are they truly the same data?)
2. Choose the canonical name (prefer C convention for game logic)
3. Add deprecation getter/setter if needed for gradual migration
4. Migrate callers file by file
5. Run full test suite between each batch
6. Remove the deprecated alias after all callers are migrated
