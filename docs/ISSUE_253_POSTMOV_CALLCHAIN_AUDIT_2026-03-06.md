# Issue 253 Callchain Audit (2026-03-06)

## Scope
Audit C-vs-JS faithfulness for the callchain around:
- `monmove.c:m_move()`
- `monmove.c:postmov()`
- `trap.c:mintrap()` / `teleport.c:mtele_trap()`
- `dig.c:mdig_tunnel()`

JS files audited:
- `js/monmove.js`
- `js/trap.js`
- `js/teleport.js`
- `js/dig.js`

## C Reference Callchain (baseline)
1. `dochug()` phase-3 movement path calls `m_move()`.
2. `m_move()` chooses movement target and returns via `postmov(...)`.
3. `postmov()` order for `MMOVE_MOVED` is:
   - `mintrap(...)`
   - door/bars handling
   - `mdig_tunnel(...)`
   - post-move display/swallow updates
   - object/hide/web/shopkeeper follow-up
4. Teleport traps use `mtele_trap()` and relocation completes within the same trap effect path.

## Audit Findings

### F1 (Fixed): async teleport trap effect was not awaited in JS
- Location: `js/trap.js` (`trapeffect_telep_trap_mon`)
- Previous behavior: called async `mtele_trap(...)` without `await`, then immediately returned `Trap_Moved_Mon`.
- Risk: relocation race in `mintrap_postmove` flow (state may be observed before teleport completes).
- Fix landed: `trapeffect_telep_trap_mon` is now async and awaits `mtele_trap`; selector now awaits this branch too.

### F2 (Open): `postmov()` parity logic is split and partially duplicated
- C location: `nethack-c/patched/src/monmove.c:postmov(...)`
- JS locations:
  - `js/monmove.js:m_move(...)` (contains partial postmov behavior)
  - `js/monmove.js:dochug(...)` (contains additional postmove/trap/pickup/hide behavior)
  - `js/monmove.js:postmov(...)` exported function exists but is simplified and not used by `m_move()`.
- Risk: ordering drift and branch inconsistencies (especially `mintrap` vs `mdig_tunnel`).
- Progress (2026-03-06):
  - Introduced shared `dochug` postmove helper in JS (`apply_dochug_postmove`) and switched both pet/non-pet callers to it.
  - This is a behavior-preserving structural step (no intentional sequencing change yet), reducing duplication before deeper ordering fixes.

### F3 (Open): `mdig_tunnel` ordering mismatch on key paths
- C baseline: `postmov()` runs `mintrap()` before `mdig_tunnel()`.
- JS current: `m_move()` runs `mdig_tunnel()` before `dochug()` performs `mintrap_postmove()` in non-pet movement path.
- Evidence: seed325 first RNG split signature (`rnd(12)` JS vs `rnd(79)` C relocation path).

### F4 (Fixed 2026-03-06): missing Tengu special teleport branch in JS `m_move`
- C has explicit early Tengu teleport branch before `not_special` movement block.
- JS now includes a C-ordered early `PM_TENGU` branch:
  - gate: `!rn2(5) && !mcan && !tele_restrict`
  - low-HP/peaceful/coinflip branch teleports with `rloc(..., RLOC_MSG)`
  - otherwise attempts adjacent relocation (`enexto` + `rloc_to`) with `rloc` fallback.
- Risk: RNG/control-flow drift for sessions involving Tengu.

### F5 (Open): pet postmove sequencing differs structurally from C
- C: `m_move()` pet path calls `postmov(..., dog_move(...), ...)`.
- JS: pet path is handled directly in `dochug()` with hand-inlined postmove sequence.
- Risk: hard-to-prove equivalence and ordering regressions.

## Guardrails for Fixes
1. Avoid broad global reorder edits across `dochug` and `m_move` in one patch.
2. Patch one branch family at a time with seed evidence.
3. Re-run `seed325/327/328` after each patch and ensure no replay hangs/timeouts.
4. Keep comparator/harness unchanged.

## Current JS vs C Branch Matrix (non-pet path)

Target C sequence (`postmov` moved case):
1. `newsym(oldpos)`
2. `mintrap`
3. door/bars handling
4. `mdig_tunnel`
5. moved-cell redraw/update
6. moved/done tail: object consumption/pickup, `maybe_spin_web`, hide-under

Current JS sequence (non-pet path, split across `m_move` + `dochug`):
1. `m_move`: position update + `newsym(old/new)`
2. `m_move`: `maybe_spin_web`
3. `m_move`: `mdig_tunnel`
4. `m_move`: limited door-open handling
5. `dochug`: `m_postmove_effect` (old position gases)
6. `dochug`: `mintrap_postmove`
7. `dochug`: pickup + hide-under

Known mismatch points:
- `mintrap` happens after `mdig_tunnel` in JS (C does opposite).
- `maybe_spin_web` runs earlier in JS than C moved/done tail.
- Postmove responsibility is split across two functions, which increases branch drift risk.

## Attempted Direct Reorder Result (2026-03-06)

- A direct non-pet reorder attempt (`mintrap` moved into `m_move` before door/dig) repeatedly introduced a replay timeout:
  - `seed325_knight_wizard_gameplay` timeout at step `257` (`key="b"`).
- Change was reverted; no regressing code remains.
- Conclusion: we need a more constrained migration path with explicit per-step gates, not a broad in-place reorder.

## Faithful Port Plan (gated)

1. Introduce one authoritative `postmov` helper for non-pet movement, preserving current behavior first.
   - Gate: seeds `325/327/328` unchanged; no timeouts.
2. Move `mintrap` into that helper, but keep `mdig_tunnel` order unchanged in same patch.
   - Gate: no timeout; if timeout appears, keep helper and revert only order delta.
3. Move door/bars + `mdig_tunnel` into same helper in C order (`mintrap` before dig), keep `maybe_spin_web` position unchanged.
   - Gate: no timeout on 325; RNG step can move, but execution must remain stable.
4. Move `maybe_spin_web` to C moved/done tail location and verify object/hide interactions.
   - Gate: no timeout + no new infinite-loop prompts on 325.
5. Apply same helper call pattern to pet flow (`dog_move -> postmov helper`) with C-equivalent status mapping.
   - Gate: no regression on 325/327/328 and core unit suite pass.

## Next Implementation Slices
1. Complete gated step (1): authoritative non-pet postmov helper with no behavior change.
2. Execute gated step (2): `mintrap` relocation into helper with rollback-safe delta.
3. Continue through steps (3)-(5) only if each gate remains timeout-free.
