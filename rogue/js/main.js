/**
 * main.js — Game initialization and main loop for Rogue 3.6 JS port.
 * Ported from main.c.
 */

import { game, setGame } from './gstate.js';
import { srand, rnd } from './rng.js';
import { wclear, clear, draw, mvwaddch } from './curses.js';
import { BEFORE, AFTER, WANDERTIME, MACE, BOW, ARROW, RING_MAIL, PLAYER } from './const.js';
import { GameState } from './game.js';
import { new_item, _attach } from './list.js';
import { init_player, init_things, init_names, init_colors, init_stones, init_materials } from './init.js';
import { do_rooms } from './rooms.js';
import { do_passages } from './passages.js';
import { new_monster, randmonster, wanderer, wake_monster, cansee, _setMonsterDeps } from './monsters.js';
import { new_level, put_things, _setNewlevelDeps } from './newlevel.js';
import { light, do_move, do_run, be_trapped, trap_at, rndmove, diag_ok, show, _setMoveDeps } from './move.js';
import { runners, do_chase, runto, chase, _setChaseDeps } from './chase.js';
import { fight, attack, swing, check_level, roll_em, killed, is_magic, save, save_throw,
         str_plus, add_dam, raise_level, hit, miss_msg, thunk, bounce, prname,
         _setFightDeps } from './fight.js';
import { inv_name, new_thing, pick_one, money, drop, dropcheck, _setThingsDeps } from './things.js';
import { add_pack, inventory, pick_up, picky_inven, get_item, pack_char, _setPackDeps } from './pack.js';
import { init_weapon, fall, fallpos, missile, do_motion, hit_monster, num, wield,
         _setWeaponsDeps } from './weapons.js';
import { daemon, kill_daemon, do_daemons, fuse, lengthen, extinguish, do_fuses } from './daemon.js';
import { doctor, swander, rollwand, unconfuse, unsee, sight, nohaste, stomach,
         _setDaemonsDeps } from './daemons.js';
import { command, quit, d_level, u_level, help, identify, _setCommandDeps } from './command.js';
import { msg, addmsg, endmsg, status, readchar, step_ok, wait_for, resetStatus, _setIODeps } from './io.js';
import { look, search, secretdoor, find_obj, eat, chg_str, vowelstr, is_current, get_dir,
         _setMiscDeps } from './misc.js';
import { _setRoomsDeps } from './rooms.js';

/**
 * step_ok_fn: helper for checking if a tile is walkable.
 */
function step_ok_fn(ch) {
  return step_ok(ch);
}

/**
 * ISWEARING(ring_type): check if player wears a ring.
 */
function ISWEARING(type) {
  const g = game();
  return (g.cur_ring[0] && g.cur_ring[0].o_which === type) ||
         (g.cur_ring[1] && g.cur_ring[1].o_which === type);
}

/**
 * ISRING(side, type): check specific ring slot.
 */
function ISRING(side, type) {
  const g = game();
  return g.cur_ring[side] && g.cur_ring[side].o_which === type;
}

/**
 * teleport(): teleport hero to random spot.
 */
function teleport() {
  const g = game();
  const { rnd_room, rnd_pos } = require('./rooms.js');
  const { winat } = require('./curses.js');
  const { FLOOR } = require('./const.js');
  let pos = { x: 0, y: 0 };
  let rm;
  do {
    rm = rnd_room();
    rnd_pos(g.rooms[rm], pos);
  } while (winat(pos.y, pos.x) !== FLOOR);
  // Move hero
  const oldpos = { x: g.player.t_pos.x, y: g.player.t_pos.y };
  mvwaddch(g.cw, oldpos.y, oldpos.x, g.cw[oldpos.y][oldpos.x]);
  g.player.t_pos.x = pos.x; g.player.t_pos.y = pos.y;
  light(g.player.t_pos);
  mvwaddch(g.cw, pos.y, pos.x, PLAYER);
  g.running = false;
}

/**
 * waste_time(): spend a turn doing nothing (armor removal).
 */
async function waste_time() {
  // Just a turn spent removing armor
}

/**
 * newgrp(): new group number.
 */
let _grpnum = 0;
function newgrp() { return ++_grpnum; }

/**
 * fix_stick(cur): set up stick charges.
 */
function fix_stick(cur) {
  const g = game();
  cur.o_charges = rnd(5) + 3;
  if (cur.o_which !== undefined) {
    // ws_type[0] = 'staff', ws_type[1] = 'wand', etc.
    cur.o_type = 'WS_TYPE_INDEX';  // placeholder
  }
}

/**
 * detach(list_head, item): detach from a linked list.
 */
function detach(list_head_ref, item) {
  const g = game();
  if (item.l_prev) item.l_prev.l_next = item.l_next;
  else {
    // need to update the head — caller passes the actual ref
    // This is tricky; for pack, we update g.pack; for lvl_obj, g.lvl_obj
  }
  if (item.l_next) item.l_next.l_prev = item.l_prev;
  item.l_prev = item.l_next = null;
}

function detach_from_pack_fn(item) {
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

/**
 * initGame(seed, display, input): initialize the game state and start.
 */
export async function initGame(seed, display, input_obj) {
  const g = new GameState();
  g.display = display;
  g.input = input_obj;
  setGame(g);

  // Set up dependencies between modules
  _setIODeps({ game: () => game() });

  _setMonsterDeps({
    msg, runto, save, unconfuse, fuse, lengthen, attack,
    ISWEARING, step_ok: step_ok_fn, cansee,
  });

  _setRoomsDeps(new_monster, randmonster, new_thing);

  _setNewlevelDeps({
    status, do_rooms, do_passages, light, new_thing,
  });

  _setChaseDeps({
    attack, step_ok: step_ok_fn, rndmove,
  });

  _setFightDeps({
    msg, addmsg, endmsg, status, runto, save, ISWEARING, ISRING,
    chg_str, death: (who) => { g.playing = false; },
    check_level, fall, light, fallpos, new_item,
    inv_name, discard, detach: detach_from_pack_fn, init_weapon,
  });

  _setMoveDeps({
    msg, fight, pick_up, be_trapped, step_ok: step_ok_fn,
    diag_ok, rndmove, light, new_level, status, save, swing, death: (who) => {},
    ISWEARING, chg_str, fall, teleport, new_item, init_weapon, wake_monster,
  });

  _setThingsDeps({
    msg, addmsg, endmsg, init_weapon, fix_stick, newgrp,
    ISRING, extinguish, unsee, light, get_item, dropcheck,
    inv_name, detach_pack: detach_from_pack_fn, discard, chg_str, waste_time,
  });

  _setPackDeps({
    msg, addmsg, inv_name, money, find_obj, detach: detach_from_pack_fn, discard,
    readchar, draw, wait_for,
    inventory,
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

  _setCommandDeps({
    msg, addmsg, readchar, status, look, do_move, do_run, fight, pick_up,
    inventory, picky_inven, drop, quaff: async () => {}, read_scroll: async () => {},
    eat, wield, wear: async () => {}, take_off: async () => {},
    ring_on: async () => {}, ring_off: async () => {},
    option: async () => {}, call: async () => {},
    d_level, u_level, help, identify, search, do_zap: async () => {},
    get_dir, missile, teleport, new_level, draw, ISRING, quit,
    save_game: async () => false,
  });

  // Seed RNG
  srand(seed);
  g.seed = seed;
  g.dnum = seed;

  // Initialize game data
  init_player();
  init_things();
  init_names();
  init_colors();
  init_stones();
  init_materials();

  // Clear display
  clear();

  // Start daemons and fuses
  daemon(doctor, 0, AFTER);
  fuse(swander, 0, WANDERTIME, AFTER);
  daemon(stomach, 0, AFTER);
  daemon(runners, 0, AFTER);

  // Give player starting equipment
  await giveStartingEquipment(g);

  // Draw first level
  await new_level();

  // Start main loop
  await playit();
}

async function giveStartingEquipment(g) {
  // Mace +1,+1
  const mace_item = new_item(mk_obj_data());
  const mace = mace_item.l_data;
  mace.o_type = ')'; // WEAPON
  mace.o_which = MACE;
  init_weapon(mace, MACE);
  mace.o_hplus = 1;
  mace.o_dplus = 1;
  mace.o_flags |= 0x04; // ISKNOW
  await add_pack(mace_item, true);
  g.cur_weapon = mace;

  // Bow +1,+0
  const bow_item = new_item(mk_obj_data());
  const bow = bow_item.l_data;
  bow.o_type = ')';
  bow.o_which = BOW;
  init_weapon(bow, BOW);
  bow.o_hplus = 1;
  bow.o_dplus = 0;
  bow.o_flags |= 0x04;
  await add_pack(bow_item, true);

  // Arrows (25 + rnd(15))
  const arr_item = new_item(mk_obj_data());
  const arr = arr_item.l_data;
  arr.o_type = ')';
  arr.o_which = ARROW;
  init_weapon(arr, ARROW);
  arr.o_count = 25 + rnd(15);
  arr.o_hplus = 0;
  arr.o_dplus = 0;
  arr.o_flags |= 0x04;
  await add_pack(arr_item, true);

  // Ring mail armor
  const arm_item = new_item(mk_obj_data());
  const arm = arm_item.l_data;
  arm.o_type = ']'; // ARMOR
  arm.o_which = RING_MAIL;
  arm.o_ac = g.a_class[RING_MAIL] - 1;
  arm.o_flags |= 0x04;
  g.cur_armor = arm;
  await add_pack(arm_item, true);

  // Food
  const food_item = new_item(mk_obj_data());
  const food = food_item.l_data;
  food.o_type = ':'; // FOOD
  food.o_count = 1;
  food.o_which = 0;
  await add_pack(food_item, true);
}

function mk_obj_data() {
  return {
    o_type: ' ', o_pos: { x: 0, y: 0 }, o_count: 1, o_which: 0,
    o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
    o_damage: '0d0', o_hurldmg: '0d0', o_ac: 11, o_launch: 100,
    o_charges: 0,
  };
}

/**
 * playit(): the main game loop.
 */
export async function playit() {
  const g = game();
  g.oldpos = { x: g.player.t_pos.x, y: g.player.t_pos.y };
  // oldrp initialized by new_level

  while (g.playing) {
    await command();
  }
}
