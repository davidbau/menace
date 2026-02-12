# Minefill Parity Checkpoint (2026-02-12)

## Summary

This checkpoint captures a substantial RNG-parity improvement for C-vs-JS special-level generation in `minefill`, focused on monster creation and class/name resolution order in `sp_lev`/`makemon`.

The goal is not complete parity yet; it is a validated step that pushes the first divergence materially later and removes several known non-C behaviors.

## What Was Fixed

1. **`makemon` group logic gating (`anymon`)**
- JS was applying `G_SGROUP`/`G_LGROUP` group checks for explicitly requested monsters.
- C only does this group-formation path for random-monster (`anymon`) creation.
- JS now matches C on this gate.

2. **`makemon` ordering**
- Group-formation logic is now ordered like C (before inventory setup).

3. **`sp_lev` named monster parity (`find_montype` behavior)**
- Added C-style named-monster resolution for special-level placement.
- Includes gender resolution effects for names and avoids spurious random gender selection in known gendered aliases (for example, `lord` / `lady` forms).

4. **`sp_lev` class monster ordering**
- For class-based entries (`"G"`/`"h"` style), parity ordering was corrected to match C:
  - `induced_align` first
  - class resolution (`mkclass`) next
  - coordinate selection (`get_location`) after

5. **`mkclass` invocation flags**
- Special-level class lookup now uses C-equivalent `G_NOGEN` behavior in this path.

6. **`m_initweap` dwarf path parity**
- Corrected several dwarf equipment-branch conditions and item ordering to match C behavior.

## Measured Effect

Using aligned filler parity comparisons (seed 1 and seed 100), first divergence moved later:

- Seed 1: **1862 -> 2272**
- Seed 100: **2010 -> 2461**

This confirms a significant forward move in RNG-sequence fidelity through the monster-placement segment.

## Current Known Frontier

The next high-signal divergence appears in trap placement timing/order after location resolution:

- C reaches `traptype_rnd` (`rnd(25)`) while JS is still consuming additional `getLocation` retries.
- This suggests remaining mismatch in coordinate accept/reject semantics or deferred trap-generation parity around this handoff.

## Test Snapshot

- `node --test test/unit/storage.test.js`: **pass**
- `node test/unit/special_levels_comparison.test.js`: overall suite still broad WIP (`pass 5 / fail 43`), but minefill RNG frontier is significantly advanced as above.

