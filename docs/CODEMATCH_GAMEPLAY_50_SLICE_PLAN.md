# CODEMATCH Gameplay 50-Slice Plan

Goal: drive gameplay-relevant CODEMATCH to 100% (0 gameplay Missing rows) with parallel, C-faithful slices.

Baseline (2026-03-08):
- Gameplay rows: 4335
- Gameplay missing: 3060 (70.59% left)
- Non-gameplay excluded: 665 rows under 21 `[N/A]` files (blacklisted in `docs/CODEMATCH.md`)

## Slice Model

- Target: ~50 slices (average ~61 gameplay rows per slice).
- Allowed slice size:
  - Small: 20-40 rows
  - Medium: 40-80 rows
  - Large: 80-140 rows
- Default branch/PR granularity: one slice per commit unless split for risk.

## 50 Gameplay Slices

1. `allmain.c` turn loop parity: `moveloop*`, `newgame`, `stop_occupation`, `u_calc_moveamt`.
2. `cmd.c` dispatch core: `rhack` edge commands, prefix/repeat/state transitions.
3. `cmd.c` extended commands and command availability gates.
4. `options.c` option parse/apply core.
5. `options.c` option UI/menu and persistence alignment.
6. `botl.c` full statusline recompute path.
7. `attrib.c` attribute math core (`acurr`, poison/restore, gain/loss).
8. `attrib.c` innate/exercise integration (`exerchk`, redistribution paths).
9. `role.c` selection and validation complete parity.
10. `u_init.c` startup inventory/stat init edge cases.
11. `do_name.c` naming/call flows, ownership and known-state side effects.
12. `objnam.c` remaining wish/name edge semantics.
13. `invent.c` object selection pipeline (`getobj`/`askchain` full behavior).
14. `invent.c` inventory reorganize, perminv, and identification paths.
15. `pickup.c` floor pickup selection and count flows.
16. `pickup.c` container pickup/loot integration parity.
17. `do_wear.c` wear/takeoff edge cases and cursed handling.
18. `wield.c` wield/swap/quiver edge parity.
19. `weapon.c` skill/enhancement tables and progression.
20. `apply.c` stethoscope/whistle/mirror/camera command-family parity.
21. `apply.c` lamp/candle/candelabrum/bell/tool action parity.
22. `apply.c` leash/jump/pole/grapple action parity.
23. `eat.c` full edible selection and action resolution.
24. `eat.c` tinning/tin-open/sacrifice-adjacent eat paths.
25. `potion.c` `dodrink` -> `peffects` full routing.
26. `potion.c` potion throw/dip/mix and vapor side effects.
27. `read.c` scroll/spellbook integration and unpaid/known-state parity.
28. `zap.c` `weffects` and floor-interaction matrix (`zap_over_floor`).
29. `zap.c` self/steed/monster effect matrices (`zapyourself`, `bhitm`).
30. `trap.c` player-side `dotrap` core path.
31. `trap.c` advanced player trap consequences and object interactions.
32. `hack.c` movement/running/rush edge paths.
33. `hack.c` travel setup/execute and obstruction corner cases.
34. `mon.c` movement lifecycle gaps and corpse/death side effects.
35. `mondata.c` missing predicates impacting behavior branches.
36. `monmove.c` remaining postmove dataflow and edge branches.
37. `dog.c` pet transfer/migration/keepdogs/losedogs.
38. `dogmove.c` remaining pet AI edge paths (`quickmimic`, etc.).
39. `mhitu.c` remaining AD_* and special attack path parity.
40. `uhitm.c` remaining hero-attack pipeline branches.
41. `mhitm.c` remaining monster-vs-monster special paths.
42. `mthrowu.c`/`mcastu.c` ranged/spell edge behaviors.
43. `muse.c` item-use AI completion.
44. `dungeon.c` dungeon graph, branch, and level property gaps.
45. `mklev.c`/`mkroom.c` room generation and placement edge behavior.
46. `mkmaze.c`/`mkmap.c` maze/map generation edge behavior.
47. `display.c` mapglyph/windowport detail parity.
48. `vision.c` remaining FOV helpers (`block_point`, `dig_point`, `rogue_vision`).
49. `light.c` light-source system parity.
50. `shk.c` shopkeeper economy and interaction completion (split internally into wave A/B if needed).

## Quality Plan (Mandatory Per Slice)

1. Scope gate:
- One callchain/file cluster only.
- No comparator masking, no `replay_core` compensating behavior.

2. C-source gate:
- Link exact C functions/branches touched.
- Confirm ordering/dataflow from C before coding.

3. Implementation gate:
- Implement in core JS gameplay modules.
- Preserve deterministic behavior and existing controls.

4. Unit gate:
- Add/adjust targeted unit tests for touched branches.
- Run targeted test file(s) and relevant domain tests.

5. Session gate:
- Run at least one affected deterministic session.
- For parity-impacting slices, run `scripts/run-and-report.sh --failures` snapshot.

6. Regression gate:
- If frontier regresses, keep C-faithful change and identify coupled bug(s);
  do not revert only to satisfy short-term tests.

7. Evidence gate:
- Update `docs/LORE.md` with what changed, why, and validation commands/results.
- Update `docs/CODEMATCH.md` rows touched (line refs + status).

8. GitHub gate:
- Track each slice in issue comments/checklists.
- Include `Blocked by`/`Blocks` when applicable.
- Keep one active `agent:*` label per issue.

9. Landing gate:
- Commit validated slice.
- `git -c rebase.autoStash=true pull --rebase`.
- Push to `main`.

## Parallelization Rules

- Safe to run in parallel:
  - Different files with no shared callchain side effects.
  - Read-only audit slices.
- Coordinate/handoff required:
  - Shared hot files: `hack.c`, `mon*.c`, `trap.c`, `zap.c`, `display.c`, `invent.c`, `apply.c`, `shk.c`.
- Lock convention for hot files:
  - One active agent per hot file slice at a time.

## Done Condition

Gameplay CODEMATCH is complete when all are true:
1. Gameplay missing rows in `docs/CODEMATCH.md` = 0.
2. No comparator/harness exceptions were added to hide behavior gaps.
3. Session parity trend is stable/improving on maintained suites.
4. Each landed slice includes LORE evidence and issue traceability.
