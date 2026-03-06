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

## Next Implementation Slices
1. Establish a single authoritative JS postmove helper used by both pet/non-pet paths, preserving current behavior first.
2. Move `mintrap`/`mdig_tunnel` ordering toward C in the narrowest branch that reproduces seed325 step-238 mismatch.
3. Add Tengu branch parity in `m_move` after sequencing stabilization.
