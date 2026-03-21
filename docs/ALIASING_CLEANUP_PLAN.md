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

## Guiding Principle

**Standardize on C-canonical names for gameplay logic.** This makes the
codebase greppable and makes C-to-JS comparison straightforward. When C
uses `u.ux`, JS should use `u.ux` (not `player.x`). When C uses
`mtmp->mpeaceful`, JS should use `mon.mpeaceful` (not `mon.peaceful`).

## Completed Cleanups (2026-03-21)

| Old name | New name (C canonical) | Files changed | Status |
|----------|----------------------|--------------|--------|
| `mon.peaceful` | `mon.mpeaceful` | 17 | Done |
| `mon.sleeping` | `mon.msleeping` | 15+ | Done |
| `mon.tame` | `mon.mtame` | 12+ | Done |
| `mon.confused` | `mon.mconf` | 7 | Done |
| `mon.stunned` | `mon.mstun` | 5 | Done |

## Remaining Issues

### Priority 1: Monster naming functions (CRITICAL — active bug source)

**Problem**: `mon_nam`, `Monnam`, `y_monnam`, `x_monnam`, `YMonnam` are
defined in BOTH `mondata.js` and `do_name.js` with different implementations.

| Function | do_name.js (C-faithful) | mondata.js (stub) |
|----------|------------------------|-------------------|
| `x_monnam` | Full impl: article, adjective, suppress, called | Lightweight wrapper over `monNam()` |
| `mon_nam` | Wraps `x_monnam(ARTICLE_THE)` | Wraps `monNam({article:'the'})` |
| `Monnam` | Capitalizes `mon_nam` | Wraps `monNam({capitalize:true})` |
| `y_monnam` | Smart "your"/"the" based on mtame | Just calls `monNam()` |
| `YMonnam` | Capitalizes `y_monnam` | Wraps `monNam({capitalize:true})` |

**Files importing from wrong source (mondata.js instead of do_name.js)**:
- `mon.js`: imports `y_monnam, Monnam`
- `shk.js`: imports `y_monnam`
- `weapon.js`: imports `Monnam`

**Canonical**: `do_name.js` (C-faithful implementation, used by 45 files)

**Fix**: Remove stubs from `mondata.js`. Fix 3 files to import from
`do_name.js`. Verify no behavioral change (the stubs may produce different
output for edge cases like hallucination, invisibility, adjectives).

**Scope**: 3 import fixes + remove 5 stub functions from mondata.js

### Priority 2: Hero reference (`game.u` vs `game.player`)

**Problem**: Hero object accessed as both `game.u` and `game.player` with
defensive fallback `(game.u || game.player)` used 73+ times.

**Architecture** (from allmain.js):
- `game.player` = stored property (Player class instance, line 1596)
- `game.u` = getter/setter alias (lines 1609-1614)

**C canonical**: `u` (struct you). C accesses the hero as `u.ux`, `u.ualign`,
etc. — always through the global `u`.

**Decision**: Standardize on **`game.u`** (matches C convention).
- Shorter, greppable, matches C source references
- `game.player` becomes a deprecated alias via getter
- The 73 defensive `(game.u || game.player)` patterns simplify to `game.u`

**Scope**: 73 defensive fallbacks + scattered direct `game.player` references.
Large but mechanical change.

### Priority 3: Map reference (`game.map` vs `game.lev`)

**Problem**: Game map accessed as both `game.map` and `game.lev` with
defensive fallback `(game.lev || game.map)` used 53+ times.

**Architecture** (from allmain.js):
- `game.map` = stored property (GameMap instance, line 1597)
- `game.lev` = getter/setter alias (lines 1615-1620)

**C canonical**: C uses `levl[x][y]` for individual cells and the `level`
global for level-wide state. Neither maps perfectly to `map` or `lev`.

**Decision**: Standardize on **`game.map`** (already the stored property,
more descriptive).
- `game.lev` remains as deprecated getter
- The 53 defensive `(game.lev || game.map)` patterns simplify to `game.map`

**Scope**: 53 defensive fallbacks + 4 direct `game.lev` references.

### Priority 4: Player coordinates (`.x`/`.y` — no change needed)

**Current state**: Player class defines `this.x` and `this.y` (player.js
lines 42-43). There are NO `.ux`/`.uy` properties or getters on Player.

**C canonical**: `u.ux`, `u.uy`

**Decision**: **No change**. The Player class uses `.x`/`.y` and all 977
references use this consistently. Adding `.ux`/`.uy` would be a large
rename with no practical benefit since `.x`/`.y` is already uniform. The
C convention `u.ux` is matched by the access pattern `game.u.x` which
reads naturally as "the u (hero) x coordinate."

If we later standardize on `game.u`, then `game.u.x` is close enough to
C's `u.ux` for easy cross-reference.

### Priority 5: Monster `blind` vs `mblinded`

**Problem**: Two separate monster fields with different semantics:
- `mon.blind` — boolean, "is currently blind" (used in ~39 places)
- `mon.mblinded` — integer counter, turns of blindness remaining (~30 places)

**C canonical**: `mtmp->mblinded` (unsigned counter). C checks blindness
via `(!mtmp->mcansee)` which is separate from `mblinded`. C also has
`Blinded` (capital B) for the player.

**Decision**: These are **NOT aliases** — they're semantically different
(boolean vs counter). Both should stay. However, verify that:
- `mon.blind` is always equivalent to `!!mon.mblinded || !mon.mcansee`
- No code writes `mon.blind` without updating `mon.mblinded`

**Scope**: Audit only, no migration needed unless desync found.

### Priority 6: Display flags — NOT aliases (closed)

**Finding**: Three genuinely separate data objects:
- `game.flags` — game-wide options (152 occurrences, C: `flags`)
- `map.flags` — level-specific flags (C: `level.flags`)
- `game.display.flags` — display rendering state (1 occurrence)

**Decision**: **No change**. These are separate data, not aliases.

### Priority 7: Context naming — NOT aliases (closed)

**Finding**: `game.context` is a getter that proxies to `game.svc.context`.
`ctx` is used as a local variable name, never as a field alias. No `game.ctx`
exists.

**Decision**: **No change**. Local variable naming convention only.

## Implementation Order

| Order | Issue | Scope | Risk | Approach |
|-------|-------|-------|------|----------|
| 1 | Monster naming functions | 3 imports + 5 stub removals | Low | Fix imports, remove stubs, test |
| 2 | `game.u` standardization | 73+ fallbacks | Medium | Replace fallbacks, keep getter |
| 3 | `game.map` standardization | 53+ fallbacks | Medium | Replace fallbacks, keep getter |
| 4 | `blind`/`mblinded` audit | Audit only | Low | Verify no desync |

Items 6 and 7 are closed (not aliases). Item 4 (coordinates) needs no change.

## Approach

For each cleanup:
1. Verify the alias relationship (are they truly the same data?)
2. Choose the canonical name (prefer C convention for game logic)
3. Keep the deprecated alias as a getter (for gradual migration)
4. Replace defensive `(a || b)` patterns with the canonical name
5. Run full test suite between each batch
6. After all callers are migrated, consider removing the deprecated getter
