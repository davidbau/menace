# Duplicate Functions Audit

Tracking document for systematically consolidating multiply-defined functions.

**Goal**: For each duplicate, place the function in the JS file that matches
its C source file, use C-faithful snake_case naming, eliminate stale versions,
verify all sessions pass.

**Policy**: Circular function imports between game files are fine (ESM resolves
lazily). See `docs/MODULES.md`. Do not use wrapper/registration patterns.

**IMPORTANT**: The mondata.js monster naming wrappers (Monnam, mon_nam, etc.)
produce DIFFERENT output from do_name.js implementations. The mondata.js
versions use a simplified `monNam()` function that always adds articles;
do_name.js versions use `x_monnam()` with full C-style logic including
`canspotmon`, `type_is_pname`, and name suppression flags. Before switching
imports, the do_name.js x_monnam MUST be audited to ensure it matches C output
for all callers. Naive import switching causes 131 session regressions.

## Status Key
- [ ] Not started
- [~] In progress — needs x_monnam audit before switching
- [x] Consolidated and verified

## Audit Table

| # | Function | C source | JS natural home | Currently also in | Status |
|---|----------|----------|----------------|-------------------|--------|
| 1 | `inv_cnt` | hack.c:4448 | hack.js | ~~hack.js:2559 deleted~~ | [x] stale copy deleted |
| 2 | `dolook` | invent.c:4321 | pager.js (full impl) | ~~invent.js:2835 deleted~~ | [x] thin wrapper deleted |
| 3 | `can_carry` | mon.c:1975 | dogmove.js (used) | ~~mon.js:2311 deleted~~ | [x] dead copy deleted |
| 4-8 | `Monnam`/`mon_nam`/`x_monnam`/`y_monnam`/`YMonnam` | do_name.c | do_name.js | ~~mondata.js wrappers deleted~~ | [x] imports switched + canspotmon fix + mhitm/muse article fixes |
| 9 | `movemon` | mon.c:1311 | mon.js (impl) | monmove.js:136 (facade) | [x] intentional — facade binds dochug |
| 10 | `mineralize` | mklev.c:1451 | dungeon.js (impl) | sp_lev.js:6209 (des API facade) | [x] intentional — facade reads levelState |
| 11 | `rndmonnum` | mkobj.c:389 | makemon.js (impl) | ~~mkobj.js:2399 deleted~~ | [x] dead wrapper deleted; internal refs → makemon_rndmonnum |
| 12 | `def_char_to_monclass` | drawing.c:108 | symbols.js | ~~const.js + makemon.js deleted~~ | [x] sp_lev switched to symbols.js |
| 13 | `age_spells`/`ageSpells` | spell.c:669 | spell.js | ~~ageSpells renamed~~ | [x] renamed + stub deleted |
| 14 | `inside_shop`/`insideShop` | shk.c:509 | shk.js | ~~insideShop renamed~~ | [x] renamed + stale export deleted |
| 15 | `getCost`/`get_cost` | shk.c:2818 | shk.js | ~~getCost deleted~~ | [x] done |

## Lesson Learned

Attempted consolidation of #4-8 (monster naming imports) caused 131 session
regressions. The mondata.js `monNam()` wrapper produces articles ("the kitten",
"your kitten") unconditionally, while do_name.js `x_monnam()` has logic paths
that can drop articles (e.g., `type_is_pname` check, `canspotmon` check,
`name_at_start` logic). Before any import switching, do_name.js's x_monnam
must be audited against C's x_monnam to ensure correct article handling for
all monster types and visibility conditions.
