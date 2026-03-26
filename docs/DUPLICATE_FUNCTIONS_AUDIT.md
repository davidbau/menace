# Duplicate Functions Audit

Tracking document for systematically consolidating multiply-defined functions.

**Goal**: For each duplicate, place the function in the JS file that matches
its C source file, use C-faithful snake_case naming, eliminate stale versions,
verify all sessions pass.

**Policy**: Circular function imports between game files are fine (ESM resolves
lazily). See `docs/MODULES.md`. Do not use wrapper/registration patterns.

## Status Key
- [ ] Not started
- [~] In progress
- [x] Consolidated and verified

## Audit Table

| # | Function | C source | JS natural home | Currently also in | Action | Status |
|---|----------|----------|----------------|-------------------|--------|--------|
| 1 | `inv_cnt` | hack.c:4448 | hack.js | invent.js:2705 (swapped args!) | Fix hack.js to match C; delete invent.js version | [ ] |
| 2 | `dolook` | invent.c:4321 | invent.js | pager.js:393 | Keep invent.js; audit pager.js version | [ ] |
| 3 | `can_carry` | mon.c:1975 | mon.js | dogmove.js:275 (all importers use this) | Audit mon.js vs C; consolidate to mon.js | [ ] |
| 4 | `Monnam` | do_name.c:1074 | do_name.js | mondata.js:380 (wrapper) | Switch 2 importers; delete mondata.js wrapper | [ ] |
| 5 | `mon_nam` | do_name.c:1042 | do_name.js | mondata.js:376 (wrapper) | Switch 1 importer; delete mondata.js wrapper | [ ] |
| 6 | `x_monnam` | do_name.c:827 | do_name.js | mondata.js:386 (wrapper) | Delete mondata.js wrapper (0 importers) | [ ] |
| 7 | `y_monnam` | do_name.c:1117 | do_name.js | mondata.js:368 (wrapper) | Switch 2 importers; delete mondata.js wrapper | [ ] |
| 8 | `YMonnam` | do_name.c:1133 | do_name.js | mondata.js:372 (wrapper) | Delete mondata.js wrapper (0 importers) | [ ] |
| 9 | `movemon` | mon.c:1311 | mon.js | monmove.js:136 (facade, 1 importer) | Audit; consolidate to mon.js | [ ] |
| 10 | `mineralize` | mklev.c:1451 | mklev.js | dungeon.js:4801 + sp_lev.js:6208 | Move to mklev.js; update importers | [ ] |
| 11 | `rndmonnum` | mkobj.c:389 | mkobj.js | makemon.js:592 (all importers use this) | Audit mkobj.js vs C; consolidate to mkobj.js | [ ] |
| 12 | `def_char_to_monclass` | drawing.c:108 | symbols.js | const.js:3772 + makemon.js:802 | Keep symbols.js; delete const.js + makemon.js | [ ] |
| 13 | `age_spells` / `ageSpells` | spell.c:669 | spell.js | (same file, dual names) | Rename to `age_spells`; delete camelCase | [ ] |
| 14 | `inside_shop` / `insideShop` | shk.c:509 | shk.js | (same file, dual defs) | Keep `inside_shop` (C name); delete `insideShop` | [ ] |
| 15 | `getCost` / `get_cost` | shk.c:2818 | shk.js | ~~getCost deleted~~ | — | [x] done |

## Detailed Notes

### #1 inv_cnt — SWAPPED PARAMETER ORDER
- C: `inv_cnt(boolean incl_gold)` in hack.c — uses global `u.usteed` etc.
- hack.js: `inv_cnt(player, incl_gold)` — checks `obj.oclass !== COIN_CLASS`
- invent.js: `inv_cnt(incl_gold, player)` — checks `obj.invlet !== GOLD_SYM`
- **C-faithful home**: hack.js (matches hack.c)
- **Action**: Fix hack.js version to match C logic. Update all callers
  (invent.js internal calls + pickup.js) to import from hack.js. Delete
  invent.js version.

### #2 dolook
- C: `dolook()` in invent.c — the "/look at what is here" command
- invent.js: `dolook(player, map)` — thin wrapper around `look_here()`
- pager.js: `dolook(game)` — full look command with terrain descriptions
- **C-faithful home**: invent.js (matches invent.c)
- **Action**: Audit pager.js version — it may actually be the `/` look-around
  command vs. the `:` look-here command. These may be intentionally different
  C functions (`dolook` vs `look_here`).

### #3 can_carry — DIFFERENT LOGIC
- C: `can_carry(struct monst *, struct obj *)` in mon.c
- mon.js: `can_carry(mtmp, otmp, player)` — general monster logic
- dogmove.js: `can_carry(mon, obj, player=null)` — pet-specific conditions
- **C-faithful home**: mon.js (matches mon.c)
- **Action**: Audit mon.js implementation against C's mon.c:1975. If mon.js
  is faithful, update dogmove.js/muse.js/monmove.js to import from mon.js.
  Delete dogmove.js version.

### #4-8 Monster naming — all belong in do_name.js
- C defines Monnam, mon_nam, x_monnam, y_monnam, YMonnam in do_name.c
- do_name.js has full implementations — these are the correct versions
- mondata.js has thin wrappers calling internal `monNam()` function
- 3 files import from mondata.js: weapon.js (Monnam), shk.js (y_monnam,
  mon_nam), mon.js (y_monnam, Monnam)
- **Action**: Switch those imports to do_name.js. Delete all mondata.js
  wrappers. Circular imports are fine.

### #9 movemon — belongs in mon.js
- C: `movemon()` in mon.c
- mon.js has the full implementation with options
- monmove.js has a facade that hardcodes the options
- **Action**: Export from mon.js directly. Update allmain.js to import from
  mon.js. The monmove.js facade may still be useful if it sets the right
  default options — audit before removing.

### #10 mineralize — belongs in mklev.js
- C: `mineralize()` in mklev.c
- Currently in dungeon.js and sp_lev.js
- **Action**: Move to mklev.js to match C. Update importers.

### #11 rndmonnum — belongs in mkobj.js
- C: `rndmonnum()` in mkobj.c
- makemon.js has working version; mkobj.js has stale version
- **Action**: Fix mkobj.js version to match C. Update mkmaze.js to import
  from mkobj.js. Delete makemon.js version.

### #12 def_char_to_monclass — belongs in symbols.js
- C: `def_char_to_monclass()` in drawing.c (JS equivalent: symbols.js)
- Three copies: symbols.js, const.js, makemon.js
- Only makemon.js version is imported (by sp_lev.js)
- **Action**: Keep symbols.js version. Update sp_lev.js to import from
  symbols.js. Delete const.js and makemon.js versions.

### #13 age_spells — rename to match C
- C: `age_spells()` in spell.c
- JS has both `ageSpells(player)` (used) and `age_spells()` (unused)
- **Action**: Rename `ageSpells` to `age_spells` with player param. Delete
  the empty `age_spells` stub. Update allmain.js import.

### #14 inside_shop — consolidate to C name
- C: `inside_shop(x, y)` in shk.c
- JS has `insideShop(map, x, y)` (internal, used) and `inside_shop(x, y, map)`
  (exported, unused)
- **Action**: Rename `insideShop` to `inside_shop`. Export it. Delete the
  stale exported version.

### #15 getCost / get_cost — COMPLETED
- getCost was an older version missing glass gem pricing
- Replaced caller to use `get_cost`. Deleted getCost and `roundScaled`.

## Process for Each Entry
1. Read C source to confirm correct file and logic
2. Read both JS implementations and compare with C
3. Put the C-faithful version in the correct JS file
4. Update all importers (circular imports are fine)
5. Run full session suite: `node test/comparison/session_test_runner.js --parallel=8`
6. Delete the stale version
7. Run suite again to confirm
8. Mark [x] in table above
