/**
 * main.js — Game initialization and main loop for Rogue 3.6 JS port.
 * Ported from main.c.
 */

import { game, setGame } from './gstate.js';
import { srand, rnd } from './rng.js';
import { clear, draw, mvwaddch, winat } from './curses.js';
import { BEFORE, AFTER, WANDERTIME, MACE, BOW, ARROW, RING_MAIL, PLAYER, FLOOR, ISKNOW } from './const.js';
import { GameState } from './game.js';
import { new_item } from './list.js';
import { init_player, init_things, init_names, init_colors, init_stones, init_materials } from './init.js';
import { do_rooms, roomin } from './rooms.js';
import { do_passages } from './passages.js';
import { new_monster, randmonster, wanderer, wake_monster, cansee, find_mons, genocide, _setMonsterDeps } from './monsters.js';
import { new_level, _setNewlevelDeps } from './newlevel.js';
import { light, do_move, do_run, be_trapped, rndmove, diag_ok, show, _setMoveDeps } from './move.js';
import { runners, runto, _setChaseDeps } from './chase.js';
import { fight, attack, swing, check_level, save, save_throw, raise_level, is_magic, killed,
         _setFightDeps } from './fight.js';
import { inv_name, new_thing, money, drop, dropcheck, _setThingsDeps } from './things.js';
import { add_pack, inventory, pick_up, picky_inven, get_item, _setPackDeps } from './pack.js';
import { init_weapon, fall, fallpos, missile, do_motion, hit_monster, wield, newgrp, resetGrpnum, _setWeaponsDeps } from './weapons.js';
import { daemon, kill_daemon, fuse, lengthen, extinguish, do_fuses } from './daemon.js';
import { doctor, swander, rollwand, unconfuse, unsee, sight, nohaste, stomach,
         resetBetween, _setDaemonsDeps } from './daemons.js';
import { command, quit, d_level, u_level, help, identify, _setCommandDeps } from './command.js';
import { msg, addmsg, endmsg, status, readchar, step_ok, wait_for, resetStatus } from './io.js';
import { look, search, eat, chg_str, is_current, get_dir, find_obj, aggravate, add_haste, _setMiscDeps } from './misc.js';
import { rnd_room, rnd_pos, _setRoomsDeps } from './rooms.js';
import { fix_stick, do_zap, _setSticksDeps } from './sticks.js';
import { wear, take_off, _setArmorDeps } from './armor.js';
import { ring_on, ring_off, _setRingsDeps } from './rings.js';
import { quaff, _setPotionsDeps } from './potions.js';
import { read_scroll, _setScrollsDeps } from './scrolls.js';
import { death, total_winner, killname } from './rip.js';
import { pack_char } from './pack.js';
import { option, loadOptions } from './options.js';
import { saveGame, loadGameState, hasSave, clearSave, registerDaemon } from './save.js';
import { wizard_cmds, _setWizardDeps } from './wizard.js';

// ===== Private helper functions =====

function step_ok_fn(ch) { return step_ok(ch); }

function ISWEARING(type) {
  const g = game();
  return (g.cur_ring[0] && g.cur_ring[0].o_which === type) ||
         (g.cur_ring[1] && g.cur_ring[1].o_which === type);
}

function ISRING(side, type) {
  const g = game();
  return g.cur_ring[side] && g.cur_ring[side].o_which === type;
}

function teleport() {
  const g = game();
  let pos = { x: 0, y: 0 };
  let rm;
  do {
    rm = rnd_room();
    rnd_pos(g.rooms[rm], pos);
  } while (winat(pos.y, pos.x) !== FLOOR);
  const oldpos = { x: g.player.t_pos.x, y: g.player.t_pos.y };
  mvwaddch(g.cw, oldpos.y, oldpos.x, g.cw[oldpos.y][oldpos.x]);
  g.player.t_pos.x = pos.x; g.player.t_pos.y = pos.y;
  light(g.player.t_pos);
  mvwaddch(g.cw, pos.y, pos.x, PLAYER);
  g.running = false;
}

async function waste_time() {}


function detach_from_pack(item) {
  const g = game();
  if (item.l_prev) item.l_prev.l_next = item.l_next;
  else g.pack = item.l_next;
  if (item.l_next) item.l_next.l_prev = item.l_prev;
  item.l_prev = item.l_next = null;
}

function detach_from_lvl(item) {
  const g = game();
  if (item.l_prev) item.l_prev.l_next = item.l_next;
  else g.lvl_obj = item.l_next;
  if (item.l_next) item.l_next.l_prev = item.l_prev;
  item.l_prev = item.l_next = null;
}

function discard(item) {
  item.l_next = item.l_prev = null;
}


function mk_obj_data() {
  return {
    o_type: ' ', o_pos: { x: 0, y: 0 }, o_count: 1, o_which: 0,
    o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
    o_damage: '0d0', o_hurldmg: '0d0', o_ac: 11, o_launch: 100,
    o_charges: 0,
  };
}

// ===== Starting equipment =====

export async function giveStartingEquipment(g) {
  // Mace +1,+1
  const mace_item = new_item(mk_obj_data());
  const mace = mace_item.l_data;
  mace.o_type = ')';
  mace.o_which = MACE;
  init_weapon(mace, MACE);
  mace.o_hplus = 1; mace.o_dplus = 1; mace.o_flags |= ISKNOW;
  await add_pack(mace_item, true);
  g.cur_weapon = mace;

  // Bow +1,+0
  const bow_item = new_item(mk_obj_data());
  const bow = bow_item.l_data;
  bow.o_type = ')'; bow.o_which = BOW;
  init_weapon(bow, BOW);
  bow.o_hplus = 1; bow.o_dplus = 0; bow.o_flags |= ISKNOW;
  await add_pack(bow_item, true);

  // Arrows (25 + rnd(15))
  const arr_item = new_item(mk_obj_data());
  const arr = arr_item.l_data;
  arr.o_type = ')'; arr.o_which = ARROW;
  init_weapon(arr, ARROW);
  arr.o_count = 25 + rnd(15);
  arr.o_hplus = 0; arr.o_dplus = 0; arr.o_flags |= ISKNOW;
  await add_pack(arr_item, true);

  // Ring mail armor
  const arm_item = new_item(mk_obj_data());
  const arm = arm_item.l_data;
  arm.o_type = ']'; arm.o_which = RING_MAIL;
  arm.o_ac = g.a_class[RING_MAIL] - 1; arm.o_flags |= ISKNOW;
  g.cur_armor = arm;
  await add_pack(arm_item, true);

  // Food
  const food_item = new_item(mk_obj_data());
  const food = food_item.l_data;
  food.o_type = ':'; food.o_count = 1; food.o_which = 0;
  await add_pack(food_item, true);
}

// ===== Dependency wiring =====

/**
 * wireGameDeps(g): wire up all cross-module dependencies.
 * Called once after game state is created.
 * Exported so test infrastructure can use it directly.
 */
export function wireGameDeps(g) {
  // Register daemon functions for save/restore
  registerDaemon('doctor',    doctor);
  registerDaemon('swander',   swander);
  registerDaemon('rollwand',  rollwand);
  registerDaemon('unconfuse', unconfuse);
  registerDaemon('unsee',     unsee);
  registerDaemon('sight',     sight);
  registerDaemon('nohaste',   nohaste);
  registerDaemon('stomach',   stomach);
  registerDaemon('runners',   runners);

  _setRoomsDeps(new_monster, randmonster, new_thing);

  _setMonsterDeps({
    msg, runto, save, unconfuse, fuse, lengthen, attack,
    ISWEARING, step_ok: step_ok_fn, cansee,
  });

  _setNewlevelDeps({
    status, do_rooms, do_passages, light, new_thing,
  });

  _setChaseDeps({
    attack, step_ok: step_ok_fn, rndmove,
  });

  _setFightDeps({
    msg, addmsg, endmsg, status, runto, save, ISWEARING, ISRING,
    chg_str, death,
    check_level, fall, light, fallpos, new_item,
    inv_name, discard, detach: detach_from_pack, init_weapon,
  });

  _setMoveDeps({
    msg, fight, pick_up, be_trapped, step_ok: step_ok_fn,
    diag_ok, rndmove, light, new_level, status, save, swing, death,
    ISWEARING, chg_str, fall, teleport, new_item, init_weapon, wake_monster,
  });

  _setThingsDeps({
    msg, addmsg, endmsg, init_weapon, fix_stick, newgrp,
    ISRING, extinguish, unsee, light, get_item, dropcheck,
    inv_name, detach_pack: detach_from_pack, discard, chg_str, waste_time,
  });

  _setPackDeps({
    msg, addmsg, inv_name, money, find_obj, detach: detach_from_lvl,
    discard, readchar, draw, wait_for, inventory,
  });

  _setWeaponsDeps({
    msg, get_item, dropcheck, is_current, fight, fall, light, cansee, show, inv_name,
    addmsg, endmsg,
  });

  _setDaemonsDeps({
    msg, addmsg, ISRING, daemon, kill_daemon, fuse, extinguish, wanderer, light,
  });

  _setMiscDeps({
    msg, addmsg, wake_monster, readchar, wait_for, ISWEARING, ISRING, teleport,
  });

  _setArmorDeps({
    msg, addmsg, endmsg, get_item, waste_time, inv_name, pack_char, dropcheck,
  });

  _setRingsDeps({
    msg, get_item, is_current, chg_str, light, aggravate, inv_name, dropcheck,
    status, readchar,
  });

  _setPotionsDeps({
    msg, get_item, chg_str, fuse, lengthen, unconfuse, sight, unsee, light,
    add_haste, raise_level, look, status, inv_name, ISWEARING,
    detach: detach_from_pack, discard, readchar,
  });

  _setScrollsDeps({
    msg, addmsg, endmsg, get_item, light, look, status, inv_name,
    detach: detach_from_pack, discard, readchar,
    aggravate, genocide, new_monster, randmonster, new_item, teleport,
    roomin, chg_str, raise_level, find_mons, step_ok: step_ok_fn,
  });

  _setSticksDeps({
    msg, addmsg, endmsg, get_item, step_ok: step_ok_fn, find_mons,
    new_monster, rnd_room, rnd_pos, do_motion, hit_monster,
    save_throw, save, runto, fight, light,
    roomin, cansee, killed,
  });

  _setWizardDeps({
    msg, add_pack, check_level, teleport,
    new_level, status, inv_name, readchar,
    fix_stick, init_weapon,
    a_class: game().a_class,
  });

  _setCommandDeps({
    msg, addmsg, readchar, status, look, do_move, do_run, fight, pick_up,
    inventory, picky_inven, drop, quaff, read_scroll,
    eat, wield, wear, take_off,
    ring_on, ring_off,
    option,
    get_item, total_winner,
    d_level, u_level, help, identify, search, do_zap,
    get_dir, missile, teleport, new_level, draw, ISRING, quit,
    save_game: saveGame,
    wizard_cmds,
  });
}

// ===== Game state initialization =====

/**
 * startGameState(g, seed): seed RNG, initialize data, first level, daemons, equipment.
 * Exported so test infrastructure can call it directly.
 */
export async function startGameState(g, seed) {
  resetStatus(); resetGrpnum(); resetBetween();

  srand(seed);
  g.seed = seed;
  g.dnum = seed;

  init_player();
  init_things();
  init_names();
  init_colors();
  init_stones();
  init_materials();

  clear();

  // Draw first level (C main.c order: new_level before equipment)
  await new_level();

  // Start daemons and fuses (after new_level, C main.c order)
  daemon(doctor, 0, AFTER);
  fuse(swander, 0, WANDERTIME, AFTER);
  daemon(stomach, 0, AFTER);
  daemon(runners, 0, AFTER);

  // Give starting equipment (after new_level, C main.c order)
  await giveStartingEquipment(g);
}

// ===== Main game loop =====

export async function playit() {
  const g = game();
  g.oldpos = { x: g.player.t_pos.x, y: g.player.t_pos.y };
  while (g.playing) {
    await command();
  }
}

// ===== Entry point for browser =====

export async function initGame(seed, display, input_obj) {
  const g = new GameState();
  g.display = display;
  g.input = input_obj;
  g.rawRngLog = null;  // disabled in browser
  setGame(g);

  wireGameDeps(g);

  // Check URL params for wizard mode
  const params = new URLSearchParams(window.location?.search || '');
  if (params.get('wizard') !== null) {
    g.wizard = true;
    g.waswizard = true;
  }

  // Load saved options (name, fruit, terse, etc.)
  loadOptions();

  // Offer save restore if one exists
  if (hasSave()) {
    await msg('Restore saved game? (y/n) ');
    draw(g.cw);
    const ch = await readchar();
    await msg('');
    if (ch === 'y' || ch === 'Y') {
      resetStatus(); resetGrpnum(); resetBetween();
      if (loadGameState(g)) {
        draw(g.cw);
        clearSave();
        await playit();
        return;
      }
      // If restore failed, fall through to new game
      await msg('Restore failed, starting new game.');
    }
  }

  await startGameState(g, seed);
  await playit();
}
