/**
 * newlevel.js — New level generation for Rogue 3.6 JS port.
 * Ported from newlevel.c.
 */

import { game } from './gstate.js';
import { rnd } from './rng.js';

function logEvent(name) {
  const g = game();
  if (g && g.rawRngLog) g.rawRngLog.push(`^{${name}}[]`);
}
import { wclear, clear, mvaddch, mvwaddch, wmove, waddch, winat } from './curses.js';
import {
  FLOOR, STAIRS, TRAP, TRAPDOOR, BEARTRAP, SLEEPTRAP,
  ARROWTRAP, TELTRAP, DARTTRAP, PLAYER, MAXTRAPS, MAXOBJ,
  AMULET,
} from './const.js';
import { rnd_pos, rnd_room } from './rooms.js';
import { _free_list, new_item, _attach } from './list.js';

// Injected dependencies
let _status = null;
let _do_rooms = null;
let _do_passages = null;
let _light = null;
let _new_thing = null;
let _put_things = null;

export function _setNewlevelDeps(deps) {
  _status = deps.status;
  _do_rooms = deps.do_rooms;
  _do_passages = deps.do_passages;
  _light = deps.light;
  _new_thing = deps.new_thing;
}

/**
 * new_level(): Dig and draw a new level.
 */
export async function new_level() {
  const g = game();

  if (g.level > g.max_level) g.max_level = g.level;

  wclear(g.cw);
  wclear(g.mw);
  clear();
  if (_status) _status();

  // Free monsters from last level
  const mlistRef = { val: g.mlist };
  _free_list(mlistRef);
  g.mlist = mlistRef.val;

  logEvent('do_rooms');
  _do_rooms();
  logEvent('do_passages');
  _do_passages();
  g.no_food++;
  logEvent('put_things');
  put_things();
  logEvent('stairs');

  // Place stairs
  let rm, stairs = { x: 0, y: 0 };
  do {
    rm = rnd_room();
    rnd_pos(g.rooms[rm], stairs);
  } while (winat(stairs.y, stairs.x) !== FLOOR);
  mvaddch(stairs.y, stairs.x, STAIRS);
  logEvent('traps');

  // Place traps
  if (rnd(10) < g.level) {
    g.ntraps = rnd(Math.floor(g.level / 4)) + 1;
    if (g.ntraps > MAXTRAPS) g.ntraps = MAXTRAPS;
    let i = g.ntraps;
    while (i--) {
      do {
        rm = rnd_room();
        rnd_pos(g.rooms[rm], stairs);
      } while (winat(stairs.y, stairs.x) !== FLOOR);
      let ch;
      switch (rnd(6)) {
        case 0: ch = TRAPDOOR; break;
        case 1: ch = BEARTRAP; break;
        case 2: ch = SLEEPTRAP; break;
        case 3: ch = ARROWTRAP; break;
        case 4: ch = TELTRAP; break;
        case 5: ch = DARTTRAP; break;
        default: ch = TRAPDOOR;
      }
      mvaddch(stairs.y, stairs.x, TRAP);
      g.traps[i] = { tr_type: ch, tr_flags: 0, tr_pos: { x: stairs.x, y: stairs.y } };
    }
  }
  logEvent('hero');

  // Place hero
  let hero = { x: 0, y: 0 };
  do {
    rm = rnd_room();
    rnd_pos(g.rooms[rm], hero);
  } while (winat(hero.y, hero.x) !== FLOOR);

  g.player.t_pos = { x: hero.x, y: hero.y };
  if (_light) _light(g.player.t_pos);
  wmove(g.cw, hero.y, hero.x);
  waddch(g.cw, PLAYER);
}

/**
 * put_things(): place potions and scrolls on this level.
 */
export function put_things() {
  const g = game();

  // Free old level objects
  const lvl_ref = { val: g.lvl_obj };
  _free_list(lvl_ref);
  g.lvl_obj = lvl_ref.val;

  // Once you have amulet, only get new stuff going deeper
  if (g.amulet && g.level < g.max_level) return;

  // MAXOBJ attempts
  for (let i = 0; i < MAXOBJ; i++) {
    if (rnd(100) < 35) {
      const item = _new_thing();
      const listp = { val: g.lvl_obj };
      _attach(listp, item);
      g.lvl_obj = listp.val;
      const cur = item.l_data;
      let tp = { x: 0, y: 0 };
      let rm;
      do {
        rm = rnd_room();
        rnd_pos(g.rooms[rm], tp);
      } while (winat(tp.y, tp.x) !== FLOOR);
      mvaddch(tp.y, tp.x, cur.o_type);
      cur.o_pos = { x: tp.x, y: tp.y };
    }
  }

  // Place amulet if level > 25 and not found yet
  if (g.level > 25 && !g.amulet) {
    const item = new_item(mk_obj_data());
    const listp = { val: g.lvl_obj };
    _attach(listp, item);
    g.lvl_obj = listp.val;
    const cur = item.l_data;
    cur.o_hplus = cur.o_dplus = 0;
    cur.o_damage = cur.o_hurldmg = '0d0';
    cur.o_ac = 11;
    cur.o_type = AMULET;
    let tp = { x: 0, y: 0 };
    let rm;
    do {
      rm = rnd_room();
      rnd_pos(g.rooms[rm], tp);
    } while (winat(tp.y, tp.x) !== FLOOR);
    mvaddch(tp.y, tp.x, cur.o_type);
    cur.o_pos = { x: tp.x, y: tp.y };
  }
}

function mk_obj_data() {
  return {
    o_type: ' ',
    o_pos: { x: 0, y: 0 },
    o_count: 1,
    o_which: 0,
    o_hplus: 0,
    o_dplus: 0,
    o_flags: 0,
    o_group: 0,
    o_damage: '0d0',
    o_hurldmg: '0d0',
    o_ac: 11,
    o_launch: 100,
  };
}
