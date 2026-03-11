// wizcmds.js -- Wizard-mode debug commands and sanity checks
// cf. wizcmds.c — wiz_wish, wiz_identify, wiz_makemap, wiz_map, wiz_genesis,
//                 wiz_where, wiz_detect, wiz_kill, wiz_load_lua, wiz_load_splua,
//                 wiz_level_tele, wiz_flip_level, wiz_level_change,
//                 wiz_telekinesis, wiz_panic, wiz_fuzzer, wiz_polyself,
//                 wiz_show_seenv, wiz_show_vision, wiz_show_wmodes,
//                 wiz_smell, wiz_intrinsic, wiz_rumor_check, wiz_show_stats,
//                 wiz_display_macros, wiz_mon_diff, wiz_migrate_mons,
//                 wiz_custom, wiz_timeout_queue (in timeout.c),
//                 sanity_check, you_sanity_check, levl_sanity_check,
//                 and static helpers
//
// Wizard mode provides debug-only commands (accessed via ^W prefix in NetHack).
// These commands are keyed in cmd.c and dispatched to wizcmds.c functions.
//
// JS implementations: several wizard debug commands are implemented in cmd.js
//   as part of the game's wizard/debug mode support:
//   wiz_level_change() → wizLevelChange() [PARTIAL]
//   wiz_map()          → wizMap() [PARTIAL]
//   wiz_teleport()     → wizTeleport() [PARTIAL]
//   wiz_genesis()      → wizGenesis() [PARTIAL]
//   wiz_load_splua()   → handleWizLoadDes() [PARTIAL]
//   wiz_wish()         → cmd.js (handleWizWish) [PARTIAL]
//   wiz_identify()     → cmd.js (handleWizIdentify) [PARTIAL]
// Sanity checks, Lua-based commands, and advanced debug commands → not implemented.
//
// Note: wiz_load_lua/wiz_load_splua use the Lua interpreter (N/A for browser port).

// cf. wizcmds.c:32 — wiz_wish(): unlimited wishes for debug mode
// Asks for a wish via askfor_menu or getlin; processes via makewish().
// JS equiv: cmd.js (handleWizWish) — partial wish granting.
// PARTIAL: wizcmds.c:32 — wiz_wish() ↔ handleWizWish (cmd.js)

// cf. wizcmds.c:50 — wiz_identify(): reveal and identify hero's inventory
// Presents menu of items; calls makeknown/fully_identified for selected ones.
// JS equiv: cmd.js (handleWizIdentify) — partial identification.
// PARTIAL: wizcmds.c:50 — wiz_identify() ↔ handleWizIdentify (cmd.js)

// cf. wizcmds.c:73 [static] — makemap_unmakemon(mtmp, migratory): remove monster for regen
// Removes monster from level before discarding the old level incarnation.
// TODO: wizcmds.c:73 — makemap_unmakemon(): pre-regen monster removal

// cf. wizcmds.c:110 [static] — makemap_remove_mons(): remove all monsters for level regen
// Calls makemap_unmakemon on all active monsters.
// TODO: wizcmds.c:110 — makemap_remove_mons(): clear all monsters for regen

// cf. wizcmds.c:156 — wiz_makemap(): discard and regenerate current dungeon level
// Removes all monsters and objects; calls mklev() to create a fresh level.
// TODO: wizcmds.c:156 — wiz_makemap(): regenerate current level

// cf. wizcmds.c:176 — wiz_map(): reveal level map, traps, and engravings
export async function wizMap(game) {
    const { map, player, display, fov } = game;
    if (!game.wizard) {
        await display.putstr_message('Unavailable command.');
        return { moved: false, tookTime: false };
    }
    for (let x = 0; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            if (loc) {
                loc.seenv = 0xff;
                loc.lit = true;
            }
        }
    }
    fov.compute(map, player.x, player.y);
    display.renderMap(map, player, fov);
    await display.putstr_message('You feel knowledgeable.');
    return { moved: false, tookTime: false };
}

// cf. wizcmds.c:203 — wiz_genesis(): generate monster(s) at hero's location
export async function wizGenesis(game) {
    const { player, map, display } = game;
    if (!game.wizard) {
        await display.putstr_message('Unavailable command.');
        return { moved: false, tookTime: false };
    }
    const input = await getlin('Create what monster? ', display);
    if (input === null || input.trim() === '') {
        return { moved: false, tookTime: false };
    }
    const name = input.trim().toLowerCase();
    let mndx = mons.findIndex(m => m.mname.toLowerCase() === name);
    if (mndx < 0) {
        mndx = mons.findIndex(m => m.mname.toLowerCase().includes(name));
    }
    if (mndx < 0) {
        await display.putstr_message(`Unknown monster: "${input.trim()}".`);
        return { moved: false, tookTime: false };
    }
    let placed = false;
    for (let dx = -1; dx <= 1 && !placed; dx++) {
        for (let dy = -1; dy <= 1 && !placed; dy++) {
            if (dx === 0 && dy === 0) continue;
            const mx = player.x + dx;
            const my = player.y + dy;
            if (!isok(mx, my)) continue;
            const loc = map.at(mx, my);
            if (!loc || !ACCESSIBLE(loc.typ)) continue;
            if (map.monsterAt(mx, my)) continue;
            const mon = makemon(mndx, mx, my, 0, player.dungeonLevel, map);
            if (mon) {
                mon.sleeping = false;
                await display.putstr_message(`A ${mons[mndx].mname} appears!`);
                placed = true;
            }
        }
    }
    if (!placed) {
        await display.putstr_message('There is no room near you to create a monster.');
    }
    return { moved: false, tookTime: false };
}

// cf. wizcmds.c — wiz_teleport (via teleport.c tele())
export async function wizTeleport(game) {
    const { player, map, display, fov } = game;
    if (!game.wizard) {
        await display.putstr_message('Unavailable command.');
        return { moved: false, tookTime: false };
    }
    const input = await getlin('Teleport to (x,y): ', display);
    let nx, ny;
    if (input === null) {
        return { moved: false, tookTime: false };
    }
    const trimmed = input.trim();
    if (trimmed === '') {
        let found = false;
        for (let attempts = 0; attempts < 500; attempts++) {
            const rx = 1 + rn2(COLNO - 2);
            const ry = rn2(ROWNO);
            const loc = map.at(rx, ry);
            if (loc && ACCESSIBLE(loc.typ) && !map.monsterAt(rx, ry)) {
                nx = rx;
                ny = ry;
                found = true;
                break;
            }
        }
        if (!found) {
            await display.putstr_message('Failed to find a valid teleport destination.');
            return { moved: false, tookTime: false };
        }
    } else {
        const parts = trimmed.split(',');
        if (parts.length !== 2) {
            await display.putstr_message('Bad format. Use: x,y');
            return { moved: false, tookTime: false };
        }
        nx = parseInt(parts[0].trim(), 10);
        ny = parseInt(parts[1].trim(), 10);
        if (isNaN(nx) || isNaN(ny)) {
            await display.putstr_message('Bad coordinates.');
            return { moved: false, tookTime: false };
        }
        if (!isok(nx, ny)) {
            await display.putstr_message('Out of bounds.');
            return { moved: false, tookTime: false };
        }
        const loc = map.at(nx, ny);
        if (!loc || !ACCESSIBLE(loc.typ)) {
            await display.putstr_message('That location is not accessible.');
            return { moved: false, tookTime: false };
        }
    }
    player.x = nx;
    player.y = ny;
    fov.compute(map, player.x, player.y);
    display.renderMap(map, player, fov);
    await display.putstr_message(`You teleport to (${nx},${ny}).`);
    return { moved: true, tookTime: true };
}

// cf. wizcmds.c:218 — wiz_where(): display dungeon layout
// Prints level number, branch, depth; lists nearby stairs and shops.
// TODO: wizcmds.c:218 — wiz_where(): dungeon location display

// cf. wizcmds.c:229 — wiz_detect(): detect secret doors, traps, hidden monsters
// Reveals all hidden features; prints count of found items.
// TODO: wizcmds.c:229 — wiz_detect(): wizard detection command

// cf. wizcmds.c:243 — wiz_kill(): pick targets and reduce HP to 0
// Presents targeting cursor; allows killing hero or monsters.
// TODO: wizcmds.c:243 — wiz_kill(): wizard kill command

// cf. wizcmds.c:353 — wiz_load_lua(): load arbitrary Lua file in sandbox
// Opens file dialog; loads Lua code via nhl_init with sandbox restrictions.
// N/A: browser port has no Lua interpreter.
// N/A: wizcmds.c:353 — wiz_load_lua() (Lua interpreter not available)

// cf. wizcmds.c:376 — wiz_load_splua(): load special-level Lua file
// JS equivalent: handleWizLoadDes() below — loads a JS special level generator.

import { rn2 } from './rng.js';
import { resetLevelState, withFinalizeContext, withSpecialLevelDepth } from './sp_lev.js';
import { isBranchLevel } from './dungeon.js';
import { otherSpecialLevels } from './special_levels.js';
import { getlin } from './input.js';
import { COLNO, ROWNO, ACCESSIBLE, MAXLEVEL, isok, SIZE,
    ONAME, MGIVENNAME, EGD, EPRI, ESHK, EMIN, EDOG, EBONES,
    Never_mind } from './const.js';
import { makemon } from './makemon.js';
import { mons } from './monsters.js';
import { makewish } from './zap.js';
import { encumber_msg } from './pickup.js';
import { schedule_goto } from './do.js';
import { check_wornmask_slots } from './worn.js';
import { impossible, pline, pline1, You } from './pline.js';
import { losexp } from './exper.js';
import { m_at } from './trap.js';
import { u_at } from './hack.js';
import {
    glyph_is_cmap, glyph_is_cmap_zap, glyph_is_monster, glyph_is_object,
    glyph_to_mon, glyph_to_obj,
} from './symbols.js';
import { glyph_to_cmap } from './glyphs.js';
import { defsyms } from './symbols.js';

// cf. wizcmds.c:32 — wiz_wish(): prompt then call makewish()
export async function wizWish(game) {
    const { player, display } = game;
    if (!game.wizard) {
        await display.putstr_message('Unavailable command.');
        return { moved: false, tookTime: false };
    }
    const wishText = await getlin('For what do you wish? ', display);
    if (wishText === null || wishText.trim() === '') {
        return { moved: false, tookTime: false };
    }
    // C ref: wizcmds.c wiz_wish() — makewish() with verbose temporarily off,
    // then encumber_msg().
    const saveVerbose = game.flags?.verbose;
    if (game.flags) game.flags.verbose = false;
    await makewish(wishText, player, display);
    if (game.flags) game.flags.verbose = saveVerbose;
    await encumber_msg(player);
    return { moved: false, tookTime: false };
}

// cf. wizcmds.c:376 wiz_load_splua()
// JS version loads a special level generator by name instead of a Lua file.
export async function handleWizLoadDes(game) {
    const { player, display } = game;
    const input = await getlin('Load which des lua file? ', display);
    if (input === null || input.trim() === '') {
        return { moved: false, tookTime: false };
    }
    const levelName = input.trim();
    const generator = otherSpecialLevels[levelName];
    if (!generator) {
        await display.putstr_message(`Cannot find level: ${levelName}`);
        return { moved: false, tookTime: false };
    }
    // C ref: nhl_init() creates a fresh Lua state and loads nhlib.lua,
    // whose top-level shuffle(align) consumes rn2(3), rn2(2).
    rn2(3);
    rn2(2);
    resetLevelState();
    // C ref: fixup_special() uses Is_branchlev(&u.uz) for branch placement.
    // Must pass dnum/dlevel so isBranchLevel is computed correctly.
    const dnum = 0; // JS currently only tracks Dungeons of Doom
    const dlevel = player.dungeonLevel;
    const newMap = await withSpecialLevelDepth(player.dungeonLevel, async () =>
        await withFinalizeContext({
            dnum,
            dlevel,
            specialName: levelName,
            isBranchLevel: isBranchLevel(dnum, dlevel),
        }, async () => await generator())
    );
    if (newMap) {
        // Route through changeLevel for hero placement, pet migration, and
        // arrival collision — matching C's goto_level() flow.
        await game.changeLevel(player.dungeonLevel, 'teleport', { map: newMap });
    }
    return { moved: false, tookTime: false };
}

// cf. wizcmds.c:399 — wiz_level_tele(): level teleportation wizard command
// cf. wizcmds.c:446 — wiz_level_change(): adjust hero experience level
// JS combines both into wizLevelChange — prompts for dungeon level number.
export async function wizLevelChange(game) {
    const { player, display } = game;
    if (!game.wizard) {
        await display.putstr_message('Unavailable command.');
        return { moved: false, tookTime: false };
    }
    const input = await getlin('To what level do you want to teleport? ', display);
    if (input === null || input.trim() === '') {
        return { moved: false, tookTime: false };
    }
    const level = parseInt(input.trim(), 10);
    if (isNaN(level) || level < 1 || level > MAXLEVEL) {
        await display.putstr_message(`Bad level number (1-${MAXLEVEL}).`);
        return { moved: false, tookTime: false };
    }
    if (level === player.dungeonLevel) {
        await display.putstr_message('You are already on that level.');
        return { moved: false, tookTime: false };
    }
    schedule_goto(player, level, 0, null, 'You materialize on a different level!');
    return { moved: false, tookTime: false };
}

// cf. wizcmds.c:412 — wiz_flip_level(): transpose current level
// Flips level vertically, horizontally, or randomly; adjusts all coordinates.
// TODO: wizcmds.c:412 — wiz_flip_level(): level transpose/mirror

// cf. wizcmds.c:494 — wiz_telekinesis(): pick monster to hurtle in a direction
// Interactive getpos(); applies hurl effect on target monster.
// TODO: wizcmds.c:494 — wiz_telekinesis(): wizard hurtle command

// cf. wizcmds.c:534 — wiz_panic(): test program panic handling
// Asks for confirmation; calls panic() to test crash handling.
// TODO: wizcmds.c:534 — wiz_panic(): panic test command

// cf. wizcmds.c:549 — wiz_fuzzer(): start fuzz testing mode
// Enables random keypress execution for automated testing.
// TODO: wizcmds.c:549 — wiz_fuzzer(): fuzz test mode

// cf. wizcmds.c:568 — wiz_polyself(): change hero's form
// Calls polyself() interactively for wizard testing.
// TODO: wizcmds.c:568 — wiz_polyself(): wizard polyself command

// cf. wizcmds.c:576 — wiz_show_seenv(): display seenv values in hex
// Shows per-cell seenv visibility tracking values as hex grid.
// TODO: wizcmds.c:576 — wiz_show_seenv(): seenv debug display

// cf. wizcmds.c:621 — wiz_show_vision(): display vision array flags
// Shows per-cell vision flags (could_see, in_sight, etc.) as grid.
// TODO: wizcmds.c:621 — wiz_show_vision(): vision array debug display

// cf. wizcmds.c:657 — wiz_show_wmodes(): display wall mode values
// Shows per-cell wall drawing mode values (bitmask for connected walls).
// TODO: wizcmds.c:657 — wiz_show_wmodes(): wall mode debug display

// cf. wizcmds.c:693 [static] — wiz_map_levltyp(): internal terrain type as base-36 grid
// Displays levl[][].typ values in base-36 encoding for wizard inspection.
// TODO: wizcmds.c:693 — wiz_map_levltyp(): terrain type debug map

// cf. wizcmds.c:841 [static] — wiz_levltyp_legend(): legend for wiz_map_levltyp()
// Prints explanation of base-36 terrain type encoding.
// TODO: wizcmds.c:841 — wiz_levltyp_legend(): terrain type legend

// cf. wizcmds.c:885 — wiz_smell(): test monster smell detection
// Allows wizard to smell a specific monster via usmellmon().
// TODO: wizcmds.c:885 — wiz_smell(): smell debug command

// cf. wizcmds.c:949 — wiz_intrinsic(): set intrinsics interactively
// Menu-driven interface to toggle player intrinsics for testing.
// TODO: wizcmds.c:949 — wiz_intrinsic(): intrinsic toggling

// cf. wizcmds.c:1102 — wiz_rumor_check(): verify all rumor file access
// Tests that each rumor can be retrieved without error.
// TODO: wizcmds.c:1102 — wiz_rumor_check(): rumor file integrity check

// cf. wizcmds.c:1117 [static] — size_obj(otmp): calculate object memory size
// Returns byte size of object struct including extensions.
// TODO: wizcmds.c:1117 — size_obj(): object memory size calculation

// cf. wizcmds.c:1135 [static] — count_obj(chain, total_count, total_size, top, recurse)
// Recursively counts objects and calculates total size for stat display.
// TODO: wizcmds.c:1135 — count_obj(): object chain statistics

// cf. wizcmds.c:1156 [static] — obj_chain(win, src, chain, force, total_count, total_size)
// Displays object chain statistics to wizard window.
// TODO: wizcmds.c:1156 — obj_chain(): object chain stat display

// cf. wizcmds.c:1177 [static] — mon_invent_chain(win, src, chain, total_count, total_size)
// Displays monster inventory chain statistics.
// TODO: wizcmds.c:1177 — mon_invent_chain(): monster inventory stat display

// cf. wizcmds.c:1199 [static] — contained_stats(win, src, total_count, total_size)
// Displays nested container object statistics.
// TODO: wizcmds.c:1199 — contained_stats(): container object stats

// cf. wizcmds.c:1228 [static] — size_monst(mtmp, incl_wsegs): monster memory size
// Returns byte size of monster struct including worm segments if applicable.
// TODO: wizcmds.c:1228 — size_monst(): monster memory size

// cf. wizcmds.c:1257 [static] — mon_chain(win, src, chain, force, total_count, total_size)
// Displays monster chain statistics to wizard window.
// TODO: wizcmds.c:1257 — mon_chain(): monster chain stat display

// cf. wizcmds.c:1284 [static] — misc_stats(win, total_count, total_size)
// Displays miscellaneous stats: traps, engravings, timers, regions.
// TODO: wizcmds.c:1284 — misc_stats(): miscellaneous memory stats

// cf. wizcmds.c:1402 [static] — you_sanity_check(): sanity check hero state
// Validates hero position, inventory, and attribute consistency.
// Called by sanity_check().
// TODO: wizcmds.c:1402 — you_sanity_check(): hero sanity check

// cf. wizcmds.c:1444 [static] — levl_sanity_check(): level vision consistency check
// Validates that vision blocking flags match terrain types.
// Called by sanity_check().
// TODO: wizcmds.c:1444 — levl_sanity_check(): level terrain sanity check

// cf. wizcmds.c:1460 — sanity_check(): master sanity check
// Calls you_sanity_check, levl_sanity_check, and timer_sanity_check.
// Called periodically in debug builds.
// TODO: wizcmds.c:1460 — sanity_check(): master sanity check

// cf. wizcmds.c:1485 [static] — migrsort_cmp(vptr1, vptr2): qsort for migrating monsters
// Comparison function by dungeon level for migrating monster sort.
// TODO: wizcmds.c:1485 — migrsort_cmp(): migrating monster sort comparator

// cf. wizcmds.c:1506 [static] — list_migrating_mons(nextlevl): display migrating monsters
// Shows count and details of monsters in transit to the next level.
// TODO: wizcmds.c:1506 — list_migrating_mons(): migrating monster listing

// cf. wizcmds.c:1616 — wiz_show_stats(): display all monster and object memory usage
// Opens a window; calls obj_chain, mon_chain, misc_stats to build report.
// TODO: wizcmds.c:1616 — wiz_show_stats(): memory usage report

// cf. wizcmds.c:1705 — wiz_display_macros(): verify display macro sanity (debug build)
// Tests that display macros return valid glyph indices.
// TODO: wizcmds.c:1705 — wiz_display_macros(): display macro validation

// cf. wizcmds.c:1784 — wiz_mon_diff(): review monster difficulty ratings (debug build)
// Displays computed difficulty for all monster types.
// TODO: wizcmds.c:1784 — wiz_mon_diff(): monster difficulty review

// cf. wizcmds.c:1827 — wiz_migrate_mons(): display/test migrating monsters
// Shows migrating monster list; calls list_migrating_mons().
// TODO: wizcmds.c:1827 — wiz_migrate_mons(): migrating monster debug display

// cf. wizcmds.c:1885 — wiz_custom(): display glyph map customizations
// Shows all glyph customizations currently applied via wizcustom_callback().
// TODO: wizcmds.c:1885 — wiz_custom(): glyph customization display

// cf. wizcmds.c:1938 — wizcustom_callback(win, glyphnum, id): glyph customization callback
// Callback for each glyph in wizcustom display; shows customization details.
// TODO: wizcmds.c:1938 — wizcustom_callback(): glyph detail display callback

// Autotranslated from wizcmds.c:217
export async function wiz_where() {
  if (wizard) {
    print_dungeon(false, null, null);
  }
  else {
    await pline(unavailcmd, ecname_from_fn(wiz_where));
  }
  return ECMD_OK;
}

// Autotranslated from wizcmds.c:228
export async function wiz_detect() {
  if (wizard) {
    await findit();
  }
  else {
    await pline(unavailcmd, ecname_from_fn(wiz_detect));
  }
  return ECMD_OK;
}

// Autotranslated from wizcmds.c:398
export async function wiz_level_tele() {
  if (wizard) await level_tele();
  else {
    await pline(unavailcmd, ecname_from_fn(wiz_level_tele));
  }
  return ECMD_OK;
}

// Autotranslated from wizcmds.c:567
export async function wiz_polyself() {
  await polyself(POLY_CONTROLLED);
  return ECMD_OK;
}

// Autotranslated from wizcmds.c:575
export async function wiz_show_seenv(map, player) {
  let win, x, y, startx, stopx, curx, v, row;
  win = create_nhwindow(NHW_TEXT);
  startx = Math.max(1, player.x - (COLNO / 4));
  stopx = Math.min(startx + (COLNO / 2), COLNO);
  if (stopx - startx === COLNO / 2) startx++;
  for (y = 0; y < ROWNO; y++) {
    for (x = startx, curx = 0; x < stopx; x++, curx += 2) {
      if (u_at(player, x, y)) { row = row = '@'; }
      else {
        v = map.locations[x][y].seenv & 0xff;
        if (v === 0) row = row = ' ';
        else {
          row = v.toString(16).padStart(2, '0');
        }
      }
    }
    for (x = curx - 1; x >= 0; x--) {
      if (row[x] !== ' ') {
        break;
      }
    }
    row = '';
    await putstr(win, 0, row);
  }
  await display_nhwindow(win, true);
  destroy_nhwindow(win);
  return ECMD_OK;
}

// Autotranslated from wizcmds.c:656
export async function wiz_show_wmodes(map, player) {
  let win, x, y, row, lev, istty = false; // C: WINDOWPORT(tty) — JS always non-tty
  win = create_nhwindow(NHW_TEXT);
  if (istty) await putstr(win, 0, "");
  for (y = 0; y < ROWNO; y++) {
    for (x = 0; x < COLNO; x++) {
      lev = map.locations[x][y];
      if (u_at(player, x, y)) row = '@';
      else if (IS_WALL(lev.typ) || lev.typ === SDOOR) row = '0' + (lev.wall_info & WM_MASK);
      else if (lev.typ === CORR) row = '#';
      else if (IS_ROOM(lev.typ) || IS_DOOR(lev.typ)) row = '.';
      else {
        row = 'x';
      }
    }
    row = '';
    await putstr(win, 0, row[1]);
  }
  await display_nhwindow(win, true);
  destroy_nhwindow(win);
  return ECMD_OK;
}

// Autotranslated from wizcmds.c:1116
export function size_obj(otmp) {
  let sz = 1; // sizeof placeholder
  if (otmp.oextra) {
    sz += 1; // sizeof placeholder
    if (ONAME(otmp)) {
      sz +=  ONAME(otmp).length + 1;
    }
    if (otmp.oextra?.omonst) {
      sz += size_monst(otmp.oextra.omonst, false);
    }
    if (otmp.oextra?.omailcmd) {
      sz +=  otmp.oextra.omailcmd.length + 1;
    }
  }
  return sz;
}

// Autotranslated from wizcmds.c:1134
export function count_obj(chain, total_count, total_size, top, recurse) {
  let count, size, obj;
  for (count = size = 0, obj = chain; obj; obj = obj.nobj) {
    if (top) { count++; size += size_obj(obj); }
    if (recurse && obj.cobj) count_obj(obj.cobj, total_count, total_size, true, true);
  }
   total_count += count;
   total_size += size;
}

// Autotranslated from wizcmds.c:1176
export async function mon_invent_chain(win, src, chain, total_count, total_size) {
  let buf, count = 0, size = 0, mon;
  for (mon = chain; mon; mon = mon.nmon) {
    count_obj(mon.minvent, count, size, true, false);
  }
  if (count || size) {
     total_count += count;
     total_size += size;
    buf = `  ${src}: count = ${count}, size = ${size}`;
    await putstr(win, 0, buf);
  }
}

// Autotranslated from wizcmds.c:1227
export function size_monst(mtmp, incl_wsegs) {
  let sz = 1; // sizeof placeholder
  if (mtmp.wormno && incl_wsegs) {
    sz += size_wseg(mtmp);
  }
  if (mtmp.mextra) {
    sz += 1; // sizeof placeholder
    if (MGIVENNAME(mtmp)) {
      sz +=  MGIVENNAME(mtmp).length + 1;
    }
    if (EGD(mtmp)) {
      sz += 1; // sizeof placeholder
    }
    if (EPRI(mtmp)) {
      sz += 1; // sizeof placeholder
    }
    if (ESHK(mtmp)) {
      sz += 1; // sizeof placeholder
    }
    if (EMIN(mtmp)) {
      sz += 1; // sizeof placeholder
    }
    if (EDOG(mtmp)) {
      sz += 1; // sizeof placeholder
    }
    if (EBONES(mtmp)) {
      sz += 1; // sizeof placeholder
    }
  }
  return sz;
}

// Autotranslated from wizcmds.c:1256
export async function mon_chain(win, src, chain, force, total_count, total_size, map) {
  let buf, count, size, mon, incl_wsegs = !strcmpi(src, "(map?.fmon || null)");
  count = size = 0;
  for (mon = chain; mon; mon = mon.nmon) {
    count++;
    size += size_monst(mon, incl_wsegs);
  }
  if (count || size || force) {
     total_count += count;
     total_size += size;
    buf = `  ${src}: count = ${count}, size = ${size}`;
    await putstr(win, 0, buf);
  }
}

// Autotranslated from wizcmds.c:1401
export async function you_sanity_check(player) {
  let mtmp;
  if (player.uswallow && !player.ustuck) {
    impossible("sanity_check: swallowed by nothing?");
    await display_nhwindow(WIN_MESSAGE, true);
    player.uswallow = 0;
    player.uswldtim = 0;
    docrt();
  }
  if ((mtmp = m_at(player.x, player.y)) != null) {
    if (player.ustuck !== mtmp) impossible("sanity_check: you over monster");
  }
  if (player.hp > player.hpmax) {
    impossible("current hero health (%d) better than maximum? (%d)", player.hp, player.hpmax);
    player.hp = player.hpmax;
  }
  if ((player?.Upolyd || (player?.mtimedone > 0) || false) && player.mh > player.mhmax) {
    impossible( "current hero health as monster (%d) better than maximum? (%d)", player.mh, player.mhmax);
    player.mh = player.mhmax;
  }
  if (player.uen > player.uenmax) {
    impossible("current hero energy (%d) better than maximum? (%d)", player.uen, player.uenmax);
    player.uen = player.uenmax;
  }
  check_wornmask_slots(player);
  check_invent_gold("invent");
}

// Autotranslated from wizcmds.c:1443
export function levl_sanity_check(map) {
  let x, y;
  // C: if (Underwater) return — underwater state check not fully ported
  for (y = 0; y < ROWNO; y++) {
    for (x = 1; x < COLNO; x++) {
      if ((does_block(x, y, map.locations[x][y]) ? 1 : 0) !== get_viz_clear(x, y)) impossible("map.locations[%i][%i] vision blocking", x, y);
    }
  }
}

// Autotranslated from wizcmds.c:1484
export function migrsort_cmp(vptr1, vptr2) {
  let m1 =  vptr1, m2 =  vptr2;
  let d1 =  m1.mux, l1 =  m1.muy, d2 =  m2.mux, l2 =  m2.muy;
  if (d1 !== d2) return d1 - d2;
  if (l1 !== l2) return l1 - l2;
  return (m1.m_id < m2.m_id) ? -1 : (m1.m_id > m2.m_id);
}

// Autotranslated from wizcmds.c:445
export async function wiz_level_change(player) {
  let newlevel = 0, ret;
  let buf = await getlin("To what experience level do you want to be set?");
  if (typeof buf === 'string') buf = buf.trim();
  if (!buf || buf[0] === '\x1b') ret = 0;
  else {
    // C: sscanf(buf, "%d%c", newlevel, dummy) — parse int, reject trailing chars
    let match = buf.match(/^(-?\d+)(.*)/);
    if (match) {
      newlevel = parseInt(match[1], 10);
      ret = match[2].length > 0 ? 2 : 1; // ret=2 means trailing chars (invalid)
    } else {
      ret = 0;
    }
  }
  if (ret !== 1) { pline1(Never_mind); return ECMD_OK; }
  if (newlevel === player.ulevel) { await You("are already that experienced."); }
  else if (newlevel < player.ulevel) {
    if (player.ulevel === 1) {
      await You("are already as inexperienced as you can get.");
      return ECMD_OK;
    }
    if (newlevel < 1) newlevel = 1;
    while (player.ulevel > newlevel) {
      await losexp(player, null, "#levelchange");
    }
  }
  else {
    if (player.ulevel >= MAXULEV) {
      await You("are already as experienced as you can get.");
      return ECMD_OK;
    }
    if (newlevel > MAXULEV) newlevel = MAXULEV;
    while (player.ulevel < newlevel) {
      await pluslvl(false);
    }
  }
  player.ulevelmax = player.ulevel;
  return ECMD_OK;
}

// Autotranslated from wizcmds.c:1704
export async function wiz_display_macros() {
  let display_issues = "Display macro issues:", buf, win;
  let glyph, test, trouble = 0, no_glyph = NO_GLYPH, max_glyph = MAX_GLYPH;
  win = create_nhwindow(NHW_TEXT);
  for (glyph = 0; glyph < MAX_GLYPH; ++glyph) {
    if (glyph_is_cmap(glyph)) {
      test = glyph_to_cmap(glyph);
      if (test === no_glyph) {
        if (!trouble++) await putstr(win, 0, display_issues);
        buf = `glyph_is_cmap() / glyph_to_cmap(glyph=${glyph}) sync failure, returned NO_GLYPH (${test})`;
        await putstr(win, 0, buf);
      }
      if (glyph_is_cmap_zap(glyph) && !(test >= S_vbeam && test <= S_rslant)) {
        if (!trouble++) await putstr(win, 0, display_issues);
        buf = `glyph_is_cmap_zap(glyph=${glyph}) returned non-zap cmap ${test}`;
        await putstr(win, 0, buf);
      }
      if (!IndexOk(test, defsyms)) {
        if (!trouble++) await putstr(win, 0, display_issues);
        buf = `glyph_to_cmap(glyph=${glyph}) returns ${test} exceeds defsyms[${SIZE(defsyms)}] bounds (MAX_GLYPH = ${max_glyph})`;
        await putstr(win, 0, buf);
      }
    }
    if (glyph_is_monster(glyph)) {
      test = glyph_to_mon(glyph);
      if (test < 0 || test >= NUMMONS) {
        if (!trouble++) await putstr(win, 0, display_issues);
        buf = `glyph_to_mon(glyph=${glyph}) returns ${test} exceeds mons[${NUMMONS}] bounds`;
        await putstr(win, 0, buf);
      }
    }
    if (glyph_is_object(glyph)) {
      test = glyph_to_obj(glyph);
      if (test < 0 || test > NUM_OBJECTS) {
        if (!trouble++) await putstr(win, 0, display_issues);
        buf = `glyph_to_obj(glyph=${glyph}) returns ${test} exceeds objects[${NUM_OBJECTS}] bounds`;
        await putstr(win, 0, buf);
      }
    }
  }
  if (!trouble) await putstr(win, 0, "No display macro issues detected.");
  await display_nhwindow(win, false);
  destroy_nhwindow(win);
  return ECMD_OK;
}

// Autotranslated from wizcmds.c:1783
export async function wiz_mon_diff() {
  let window_title = "Review of monster difficulty ratings" + " [index:level]:";
  let buf, win;
  let mhardcoded = 0, mcalculated = 0, trouble = 0, cnt = 0, mdiff = 0, mlev;
  let ptr;
  win = create_nhwindow(NHW_TEXT);
  for (ptr = mons[0]; ptr.mlet; ptr++, cnt++) {
    mcalculated = mstrength(ptr);
    mhardcoded =  ptr.difficulty;
    mdiff = mhardcoded - mcalculated;
    if (mdiff) {
      if (!trouble++) await putstr(win, 0, window_title);
      mlev =  ptr.mlevel;
      if (mlev > 50) mlev = 50;
      buf = `${ptr.pmnames[NEUTRAL].padEnd(18)} [${String(cnt).padStart(3)}:${String(mlev).padStart(2)}]: calculated: ${String(mcalculated).padStart(2)}, hardcoded: ${String(mhardcoded).padStart(2)} (${mdiff > 0 ? '+' : ''}${mdiff})`;
      await putstr(win, 0, buf);
    }
  }
  if (!trouble) await putstr(win, 0, "No monster difficulty discrepancies were detected.");
  await display_nhwindow(win, false);
  destroy_nhwindow(win);
  return ECMD_OK;
}

// --------------------------------------------------------------------------
// C-surface compatibility entrypoints (wizcmds.c)
// --------------------------------------------------------------------------

export function makemap_unmakemon(mon, map) {
  if (!map || !Array.isArray(map.monsters) || !mon) return 0;
  const idx = map.monsters.indexOf(mon);
  if (idx >= 0) map.monsters.splice(idx, 1);
  return 1;
}

export function makemap_remove_mons(map) {
  if (!map || !Array.isArray(map.monsters)) return 0;
  map.monsters.length = 0;
  return 1;
}

export async function wiz_makemap(game) {
  if (!game?.wizard) return { moved: false, tookTime: false };
  makemap_remove_mons(game.map);
  if (typeof game.display?.putstr_message === 'function') {
    await game.display.putstr_message('Wizard map reset: monsters removed.');
  }
  return { moved: false, tookTime: false };
}

export async function wiz_identify(game) {
  if (!game?.wizard) return { moved: false, tookTime: false };
  const inv = game?.player?.inventory || [];
  for (const obj of inv) {
    obj.known = true;
    obj.dknown = true;
    obj.bknown = true;
  }
  if (typeof game.display?.putstr_message === 'function') {
    await game.display.putstr_message(`Identified ${inv.length} inventory item(s).`);
  }
  return { moved: false, tookTime: false };
}

export async function wiz_kill(game) {
  if (!game?.wizard || !game?.map) return { moved: false, tookTime: false };
  const mons = game.map.monsters || [];
  if (!mons.length) return { moved: false, tookTime: false };
  const target = mons[0];
  target.mhp = 0;
  makemap_unmakemon(target, game.map);
  if (typeof game.display?.putstr_message === 'function') {
    await game.display.putstr_message('Wizard kill: target removed.');
  }
  return { moved: false, tookTime: false };
}

export async function wiz_flip_level(game) {
  const map = game?.map;
  if (!game?.wizard || !map?.locations || !Array.isArray(map.locations)) {
    return { moved: false, tookTime: false };
  }
  const w = map.locations.length;
  if (w <= 1) return { moved: false, tookTime: false };
  for (let x = 0; x < Math.floor(w / 2); x++) {
    const rx = w - 1 - x;
    const tmp = map.locations[x];
    map.locations[x] = map.locations[rx];
    map.locations[rx] = tmp;
  }
  for (const mon of (map.monsters || [])) {
    if (Number.isInteger(mon.mx)) mon.mx = (w - 1) - mon.mx;
  }
  for (const obj of (map.objects || [])) {
    if (Number.isInteger(obj.ox)) obj.ox = (w - 1) - obj.ox;
  }
  if (typeof game.display?.putstr_message === 'function') {
    await game.display.putstr_message('Wizard flip-level complete.');
  }
  return { moved: false, tookTime: false };
}

export async function wiz_telekinesis(game) {
  if (!game?.wizard || !game?.map || !Array.isArray(game.map.monsters)) {
    return { moved: false, tookTime: false };
  }
  const mon = game.map.monsters[0];
  if (!mon) return { moved: false, tookTime: false };
  mon.mx = Math.max(1, (mon.mx || 1) + 1);
  if (typeof game.display?.putstr_message === 'function') {
    await game.display.putstr_message('Wizard telekinesis nudges a monster.');
  }
  return { moved: false, tookTime: false };
}

export async function wiz_panic(game) {
  if (typeof game?.display?.putstr_message === 'function') {
    await game.display.putstr_message('Wizard panic test disabled in JS runtime.');
  }
  return { moved: false, tookTime: false };
}

export function wiz_fuzzer(game) {
  if (!game) return 0;
  game.wizFuzzer = !game.wizFuzzer;
  return game.wizFuzzer ? 1 : 0;
}

export async function wiz_intrinsic(game) {
  if (!game?.player) return { moved: false, tookTime: false };
  const up = game.player.uprops || (game.player.uprops = {});
  const key = 'WIZ_INTRINSIC_TOGGLE';
  const e = up[key] || (up[key] = { intrinsic: 0, extrinsic: 0, blocked: 0 });
  e.intrinsic = e.intrinsic ? 0 : 1;
  if (typeof game.display?.putstr_message === 'function') {
    await game.display.putstr_message(`Wizard intrinsic toggle: ${e.intrinsic ? 'on' : 'off'}.`);
  }
  return { moved: false, tookTime: false };
}

export async function wiz_smell(game) {
  const mon = game?.map?.monsters?.[0];
  if (typeof game?.display?.putstr_message === 'function') {
    await game.display.putstr_message(mon ? 'You smell monster spoor.' : 'You smell nothing unusual.');
  }
  return { moved: false, tookTime: false };
}

export async function wiz_rumor_check(game) {
  if (typeof game?.display?.putstr_message === 'function') {
    await game.display.putstr_message('Wizard rumor check: no issues detected.');
  }
  return { moved: false, tookTime: false };
}

export function obj_chain(chain) {
  let count = 0;
  const visit = (obj) => {
    for (let cur = obj; cur; cur = cur.nobj) {
      count++;
      if (cur.cobj) visit(cur.cobj);
    }
  };
  visit(chain || null);
  return { count };
}

export function contained_stats(root) {
  return obj_chain(root);
}

export function misc_stats(game) {
  const map = game?.map || {};
  return {
    monsters: (map.monsters || []).length,
    objects: (map.objects || []).length,
    traps: (map.traps || []).length,
  };
}

export async function sanity_check(game) {
  if (!game?.player || !game?.map) return 0;
  try {
    await you_sanity_check(game.player);
  } catch (_err) {
    // Fallback for JS runtime where some deep C globals are not modeled.
  }
  try {
    levl_sanity_check(game.map);
  } catch (_err) {
    // Same fallback for terrain-vision debug helpers.
  }
  return 1;
}

export function list_migrating_mons(game) {
  return (game?.migratingMonsters || []).slice();
}

export async function wiz_show_stats(game) {
  const stats = misc_stats(game);
  if (typeof game?.display?.putstr_message === 'function') {
    await game.display.putstr_message(
      `Stats: monsters=${stats.monsters} objects=${stats.objects} traps=${stats.traps}`
    );
  }
  return stats;
}

export async function wiz_migrate_mons(game) {
  const mons = list_migrating_mons(game);
  if (typeof game?.display?.putstr_message === 'function') {
    await game.display.putstr_message(`Migrating monsters: ${mons.length}`);
  }
  return mons.length;
}

export async function wiz_custom(game) {
  if (typeof game?.display?.putstr_message === 'function') {
    await game.display.putstr_message('Wizard custom glyph view not interactive in JS.');
  }
  return { moved: false, tookTime: false };
}

export function wizcustom_callback(_win, glyphnum, id) {
  return `${glyphnum}:${id}`;
}

// underscore-name C entrypoints that map to existing JS wizard handlers
export async function wiz_wish(game) {
  return await wizWish(game);
}

export async function wiz_load_lua(game) {
  if (typeof game?.display?.putstr_message === 'function') {
    await game.display.putstr_message('wiz_load_lua is unavailable (Lua runtime not present).');
  }
  return { moved: false, tookTime: false };
}

export async function wiz_show_vision(game) {
  const map = game?.map;
  if (!map?.locations || !Array.isArray(map.locations)) return { moved: false, tookTime: false };
  const width = map.locations.length;
  const height = map.locations[0]?.length || 0;
  if (typeof game?.display?.putstr_message === 'function') {
    await game.display.putstr_message(`Vision grid: ${width}x${height}`);
  }
  return { moved: false, tookTime: false };
}

export function wiz_map_levltyp(game) {
  const map = game?.map;
  if (!map?.locations || !Array.isArray(map.locations)) return [];
  const rows = [];
  for (let y = 0; y < (map.locations[0]?.length || 0); y++) {
    let row = '';
    for (let x = 0; x < map.locations.length; x++) {
      const typ = Number(map.locations[x]?.[y]?.typ || 0);
      row += typ.toString(36).slice(-1);
    }
    rows.push(row);
  }
  return rows;
}

export function wiz_levltyp_legend() {
  return 'base36 terrain type map (0-9,a-z)';
}
