/**
 * things.js — Item creation and naming for Rogue 3.6 JS port.
 * Ported from things.c.
 */

import { game } from './gstate.js';
import { rnd } from './rng.js';
import { mvaddch, mvwaddch, mvwinch, waddch } from './curses.js';
import {
  SCROLL, POTION, FOOD, WEAPON, ARMOR, RING, STICK, AMULET,
  LEFT, RIGHT, GOLD, FLOOR, PASSAGE,
  R_PROTECT, R_ADDSTR, R_ADDHIT, R_ADDDAM, R_AGGR, R_TELEPORT, R_SEEINVIS,
  ISKNOW, ISCURSED, ISMANY, ISMISL,
  S_SCARE, CALLABLE,
  NUMTHINGS, MAXPOTIONS, MAXSCROLLS, MAXRINGS, MAXSTICKS, MAXWEAPONS, MAXARMORS,
} from './const.js';
import { new_item, _attach } from './list.js';
import { roomin } from './rooms.js';

// Injected deps
let _msg = null;
let _addmsg = null;
let _endmsg = null;
let _pick_one = null;
let _init_weapon = null;
let _fix_stick = null;
let _newgrp = null;
let _ISRING = null;
let _extinguish = null;
let _unsee = null;
let _light = null;
let _get_item = null;
let _dropcheck = null;
let _inv_name = null;
let _detach_pack = null;
let _discard = null;
let _chg_str = null;
let _waste_time = null;
let _cmov = null;
let _find_obj = null;

export function _setThingsDeps(deps) {
  _msg = deps.msg;
  _addmsg = deps.addmsg;
  _endmsg = deps.endmsg;
  _init_weapon = deps.init_weapon;
  _fix_stick = deps.fix_stick;
  _newgrp = deps.newgrp;
  _ISRING = deps.ISRING;
  _extinguish = deps.extinguish;
  _unsee = deps.unsee;
  _light = deps.light;
  _get_item = deps.get_item;
  _dropcheck = deps.dropcheck;
  _inv_name = deps.inv_name;
  _detach_pack = deps.detach_pack;
  _discard = deps.discard;
  _chg_str = deps.chg_str;
  _waste_time = deps.waste_time;
  _cmov = deps.cmov;
  _find_obj = deps.find_obj;
}

/**
 * inv_name(obj, drop): return inventory name string for an object.
 */
export function inv_name(obj, drop) {
  const g = game();
  let prbuf = '';

  switch (obj.o_type) {
    case SCROLL:
      if (obj.o_count === 1) prbuf = 'A scroll ';
      else prbuf = `${obj.o_count} scrolls `;
      if (g.s_know[obj.o_which]) prbuf += `of ${g.s_magic[obj.o_which].mi_name}`;
      else if (g.s_guess[obj.o_which]) prbuf += `called ${g.s_guess[obj.o_which]}`;
      else prbuf += `titled '${g.s_names[obj.o_which]}'`;
      break;
    case POTION:
      if (g.p_know[obj.o_which]) {
        if (obj.o_count === 1) prbuf = 'A potion ';
        else prbuf = `${obj.o_count} potions `;
        prbuf += `of ${g.p_magic[obj.o_which].mi_name}(${g.p_colors[obj.o_which]})`;
      } else if (g.p_guess[obj.o_which]) {
        if (obj.o_count === 1) prbuf = 'A potion ';
        else prbuf = `${obj.o_count} potions `;
        prbuf += `called ${g.p_guess[obj.o_which]}(${g.p_colors[obj.o_which]})`;
      } else if (obj.o_count === 1) {
        const col = g.p_colors[obj.o_which];
        prbuf = `A${vowelstr(col)} ${col} potion`;
      } else {
        prbuf = `${obj.o_count} ${g.p_colors[obj.o_which]} potions`;
      }
      break;
    case FOOD:
      if (obj.o_which === 1) {
        if (obj.o_count === 1) prbuf = `A${vowelstr(g.fruit)} ${g.fruit}`;
        else prbuf = `${obj.o_count} ${g.fruit}s`;
      } else {
        if (obj.o_count === 1) prbuf = 'Some food';
        else prbuf = `${obj.o_count} rations of food`;
      }
      break;
    case WEAPON:
      if (obj.o_count > 1) prbuf = `${obj.o_count} `;
      else prbuf = 'A ';
      if (obj.o_flags & ISKNOW) {
        prbuf += `${num(obj.o_hplus, obj.o_dplus)} ${g.w_names[obj.o_which]}`;
      } else {
        prbuf += g.w_names[obj.o_which];
      }
      if (obj.o_count > 1) prbuf += 's';
      break;
    case ARMOR:
      if (obj.o_flags & ISKNOW) {
        prbuf = `${num(g.a_class[obj.o_which] - obj.o_ac, 0)} ${g.a_names[obj.o_which]}`;
      } else {
        prbuf = g.a_names[obj.o_which];
      }
      break;
    case AMULET:
      prbuf = 'The Amulet of Yendor';
      break;
    case STICK: {
      const wstype = g.ws_type[obj.o_which];
      prbuf = `A ${wstype} `;
      if (g.ws_know[obj.o_which]) {
        prbuf += `of ${g.ws_magic[obj.o_which].mi_name}${charge_str(obj)}(${g.ws_made[obj.o_which]})`;
      } else if (g.ws_guess[obj.o_which]) {
        prbuf += `called ${g.ws_guess[obj.o_which]}(${g.ws_made[obj.o_which]})`;
      } else {
        prbuf = `A ${g.ws_made[obj.o_which]} ${wstype}`;
      }
      break;
    }
    case RING: {
      const stone = g.r_stones[obj.o_which];
      if (g.r_know[obj.o_which]) {
        prbuf = `A${ring_num(obj)} ring of ${g.r_magic[obj.o_which].mi_name}(${stone})`;
      } else if (g.r_guess[obj.o_which]) {
        prbuf = `A ring called ${g.r_guess[obj.o_which]}(${stone})`;
      } else {
        prbuf = `A${vowelstr(stone)} ${stone} ring`;
      }
      break;
    }
    default:
      prbuf = `Something bizarre ${obj.o_type}`;
  }

  if (obj === g.cur_armor) prbuf += ' (being worn)';
  if (obj === g.cur_weapon) prbuf += ' (weapon in hand)';
  if (obj === g.cur_ring[LEFT]) prbuf += ' (on left hand)';
  else if (obj === g.cur_ring[RIGHT]) prbuf += ' (on right hand)';

  if (drop && prbuf[0] >= 'A' && prbuf[0] <= 'Z') {
    prbuf = prbuf[0].toLowerCase() + prbuf.slice(1);
  } else if (!drop && prbuf[0] >= 'a' && prbuf[0] <= 'z') {
    prbuf = prbuf[0].toUpperCase() + prbuf.slice(1);
  }
  if (!drop) prbuf += '.';
  return prbuf;
}

function vowelstr(str) {
  if (!str) return '';
  switch (str[0]) {
    case 'a': case 'e': case 'i': case 'o': case 'u': return 'n';
    default: return '';
  }
}

function num(n1, n2) {
  if (n1 === 0 && n2 === 0) return '+0';
  if (n2 === 0) return `${n1 < 0 ? '' : '+'}${n1}`;
  return `${n1 < 0 ? '' : '+'}${n1},${n2 < 0 ? '' : '+'}${n2}`;
}

function charge_str(obj) {
  return obj.o_charges !== undefined ? `(${obj.o_charges})` : '';
}

function ring_num(obj) {
  if (obj.o_ac === 0) return '';
  return ` ${obj.o_ac < 0 ? '' : '+'}${obj.o_ac}`;
}

/**
 * money(): add gold to character's purse.
 */
export async function money() {
  const g = game();
  for (const rp of g.rooms) {
    if (rp.r_gold && rp.r_gold.y === g.player.t_pos.y && rp.r_gold.x === g.player.t_pos.x) {
      if (g.notify) {
        if (!g.terse) _addmsg('You found ');
        await _msg(`${rp.r_goldval} gold pieces.`);
      }
      g.purse += rp.r_goldval;
      rp.r_goldval = 0;
      // cmov(rp.r_gold); addch(FLOOR);
      mvaddch(rp.r_gold.y, rp.r_gold.x, FLOOR);
      return;
    }
  }
  await _msg('That gold must have been counterfeit');
}

/**
 * drop(): put something down.
 */
export async function drop() {
  const g = game();
  const ch = mvwinch(g.stdscr, g.player.t_pos.y, g.player.t_pos.x);
  if (ch !== FLOOR && ch !== PASSAGE) {
    await _msg('There is something there already');
    return;
  }
  const obj_item = await _get_item('drop', 0);
  if (obj_item === null) return;
  const op = obj_item.l_data;
  if (!dropcheck(op)) return;

  let item = obj_item;
  if (op.o_count >= 2 && op.o_type !== WEAPON) {
    const nobj = new_item(Object.assign({}, op, { o_count: 1 }));
    op.o_count--;
    item = nobj;
    if (op.o_group !== 0) g.inpack++;
  } else {
    if (_detach_pack) _detach_pack(item);
  }
  g.inpack--;

  const listp = { val: g.lvl_obj };
  _attach(listp, item);
  g.lvl_obj = listp.val;
  mvaddch(g.player.t_pos.y, g.player.t_pos.x, item.l_data.o_type);
  item.l_data.o_pos = { x: g.player.t_pos.x, y: g.player.t_pos.y };
  await _msg(`Dropped ${inv_name(item.l_data, true)}`);
}

/**
 * dropcheck(op): check if dropping/unwielding is ok.
 */
export function dropcheck(op) {
  const g = game();
  if (op === null) return true;
  if (op !== g.cur_armor && op !== g.cur_weapon &&
      op !== g.cur_ring[LEFT] && op !== g.cur_ring[RIGHT]) return true;
  if (op.o_flags & ISCURSED) {
    _msg("You can't.  It appears to be cursed.");
    return false;
  }
  if (op === g.cur_weapon) {
    g.cur_weapon = null;
  } else if (op === g.cur_armor) {
    if (_waste_time) _waste_time();
    g.cur_armor = null;
  } else if (op === g.cur_ring[LEFT] || op === g.cur_ring[RIGHT]) {
    const side = op === g.cur_ring[LEFT] ? LEFT : RIGHT;
    switch (op.o_which) {
      case R_ADDSTR:
        if (_chg_str) _chg_str(-op.o_ac);
        break;
      case R_SEEINVIS:
        g.player.t_flags &= ~0x10000; // CANSEE
        if (_extinguish && _unsee) _extinguish(_unsee);
        if (_light) _light(g.player.t_pos);
        mvwaddch(g.cw, g.player.t_pos.y, g.player.t_pos.x, '@');
        break;
    }
    g.cur_ring[side] = null;
  }
  return true;
}

/**
 * new_thing(): create a new item.
 */
export function new_thing() {
  const g = game();
  const item = new_item(mk_obj_data());
  const cur = item.l_data;
  cur.o_hplus = cur.o_dplus = 0;
  cur.o_damage = cur.o_hurldmg = '0d0';
  cur.o_ac = 11;
  cur.o_count = 1;
  cur.o_group = 0;
  cur.o_flags = 0;

  const kind = g.no_food > 3 ? 2 : pick_one(g.things, NUMTHINGS);

  switch (kind) {
    case 0: // POTION
      cur.o_type = POTION;
      cur.o_which = pick_one(g.p_magic, MAXPOTIONS);
      break;
    case 1: // SCROLL
      cur.o_type = SCROLL;
      cur.o_which = pick_one(g.s_magic, MAXSCROLLS);
      break;
    case 2: // FOOD
      g.no_food = 0;
      cur.o_type = FOOD;
      cur.o_which = rnd(100) > 10 ? 0 : 1;
      break;
    case 3: { // WEAPON
      cur.o_type = WEAPON;
      cur.o_which = rnd(MAXWEAPONS);
      if (_init_weapon) _init_weapon(cur, cur.o_which);
      const k = rnd(100);
      if (k < 10) {
        cur.o_flags |= ISCURSED;
        cur.o_hplus -= rnd(3) + 1;
      } else if (k < 15) {
        cur.o_hplus += rnd(3) + 1;
      }
      break;
    }
    case 4: { // ARMOR
      let j = 0;
      const k = rnd(100);
      for (; j < MAXARMORS; j++) {
        if (k < g.a_chances[j]) break;
      }
      if (j === MAXARMORS) j = 0;
      cur.o_type = ARMOR;
      cur.o_which = j;
      cur.o_ac = g.a_class[j];
      const k2 = rnd(100);
      if (k2 < 20) {
        cur.o_flags |= ISCURSED;
        cur.o_ac += rnd(3) + 1;
      } else if (k2 < 28) {
        cur.o_ac -= rnd(3) + 1;
      }
      break;
    }
    case 5: { // RING
      cur.o_type = RING;
      cur.o_which = pick_one(g.r_magic, MAXRINGS);
      switch (cur.o_which) {
        case R_PROTECT:  // 0
        case R_ADDSTR:   // 1
        case R_ADDHIT:   // 7
        case R_ADDDAM:   // 8
          cur.o_ac = rnd(3);
          if (cur.o_ac === 0) { cur.o_ac = -1; cur.o_flags |= ISCURSED; }
          break;
        case R_AGGR:     // 6
        case R_TELEPORT: // 11
          cur.o_flags |= ISCURSED;
          break;
      }
      break;
    }
    case 6: // STICK
      cur.o_type = STICK;
      cur.o_which = pick_one(g.ws_magic, MAXSTICKS);
      if (_fix_stick) _fix_stick(cur);
      break;
    default:
      cur.o_type = FOOD;
      cur.o_which = 0;
  }
  return item;
}

/**
 * pick_one(magic, nitems): pick an item from probability table.
 */
export function pick_one(magic, nitems) {
  const i = rnd(100);
  for (let j = 0; j < nitems; j++) {
    if (i < magic[j].mi_prob) return j;
  }
  return 0; // fallback
}

function mk_obj_data() {
  return {
    o_type: ' ', o_pos: { x: 0, y: 0 }, o_count: 1, o_which: 0,
    o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
    o_damage: '0d0', o_hurldmg: '0d0', o_ac: 11, o_launch: 100,
    o_charges: 0,
  };
}
