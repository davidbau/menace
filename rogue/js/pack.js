/**
 * pack.js — Pack management for Rogue 3.6 JS port.
 * Ported from pack.c.
 */

import { game } from './gstate.js';
import { rnd } from './rng.js';
import { mvaddch, wmove, waddch, wprintw, waddstr, waddch as wch, wclear, mvwaddstr } from './curses.js';
import {
  GOLD, POTION, SCROLL, FOOD, WEAPON, ARMOR, RING, AMULET, STICK,
  FLOOR, PASSAGE, LINES, S_SCARE, CALLABLE, ESCAPE, MAXPACK,
} from './const.js';
import { new_item, _attach } from './list.js';
import { roomin } from './rooms.js';

// Injected deps
let _msg = null;
let _addmsg = null;
let _inv_name = null;
let _money = null;
let _find_obj = null;
let _detach = null;
let _discard = null;
let _get_str = null;
let _readchar = null;
let _draw = null;
let _wait_for = null;
let _inventory = null;

export function _setPackDeps(deps) {
  _msg = deps.msg;
  _addmsg = deps.addmsg;
  _inv_name = deps.inv_name;
  _money = deps.money;
  _find_obj = deps.find_obj;
  _detach = deps.detach;
  _discard = deps.discard;
  _get_str = deps.get_str;
  _readchar = deps.readchar;
  _draw = deps.draw;
  _wait_for = deps.wait_for;
  _inventory = deps.inventory;
}

function ISMULT(type) {
  return type === POTION || type === SCROLL || type === FOOD;
}

/**
 * add_pack(item, silent): pick up an object and add to pack.
 */
export async function add_pack(item, silent) {
  const g = game();
  let from_floor = false;

  if (item === null) {
    from_floor = true;
    item = _find_obj ? _find_obj(g.player.t_pos.y, g.player.t_pos.x) : null;
    if (item === null) return;
  }

  const obj = item.l_data;

  // Check for grouped items (arrows, etc)
  if (obj.o_group) {
    for (let ip = g.pack; ip !== null; ip = ip.l_next) {
      const op = ip.l_data;
      if (op.o_group === obj.o_group) {
        op.o_count++;
        if (from_floor) {
          if (_detach) _detach(item);
          mvaddch(g.player.t_pos.y, g.player.t_pos.x,
            roomin(g.player.t_pos) === null ? PASSAGE : FLOOR);
          if (_discard) _discard(item);
        }
        item = ip;
        goto_picked_up(g, obj, silent, item);
        return;
      }
    }
  }

  // Check pack limit
  if (g.inpack === MAXPACK - 1) {
    await _msg("You can't carry anything else.");
    return;
  }

  // Handle scare monster scroll
  if (obj.o_type === SCROLL && obj.o_which === S_SCARE) {
    if (obj.o_flags & 0x40 /* ISFOUND */) {
      await _msg('The scroll turns to dust as you pick it up.');
      if (_detach) _detach(item);
      mvaddch(g.player.t_pos.y, g.player.t_pos.x, FLOOR);
      return;
    } else {
      obj.o_flags |= 0x40; // ISFOUND
    }
  }

  g.inpack++;
  if (from_floor) {
    if (_detach) _detach(item);
    mvaddch(g.player.t_pos.y, g.player.t_pos.x,
      roomin(g.player.t_pos) === null ? PASSAGE : FLOOR);
  }

  // Find insertion point: look for same type, then exact match
  let exact = false;
  let ip = null, lp = null;

  for (ip = g.pack; ip !== null; ip = ip.l_next) {
    const op = ip.l_data;
    if (obj.o_type === op.o_type) break;
    lp = ip;
  }

  if (ip === null) {
    // New type — put at end (after food)
    lp = null;
    for (ip = g.pack; ip !== null; ip = ip.l_next) {
      const op = ip.l_data;
      if (op.o_type !== FOOD) break;
      lp = ip;
    }
  } else {
    // Search for exact match
    let cur_ip = ip;
    while (cur_ip !== null && cur_ip.l_data.o_type === obj.o_type) {
      if (cur_ip.l_data.o_which === obj.o_which) {
        exact = true;
        ip = cur_ip;
        break;
      }
      lp = cur_ip;
      cur_ip = cur_ip.l_next;
      ip = cur_ip;
    }
    if (!exact) ip = cur_ip;
  }

  if (exact && ISMULT(obj.o_type)) {
    ip.l_data.o_count++;
    if (_discard) _discard(item);
    item = ip;
  } else if (ip === null) {
    // Append
    if (g.pack === null) {
      g.pack = item;
      item.l_prev = item.l_next = null;
    } else {
      if (lp) {
        lp.l_next = item;
        item.l_prev = lp;
        item.l_next = null;
      } else {
        item.l_next = g.pack;
        item.l_prev = null;
        if (g.pack) g.pack.l_prev = item;
        g.pack = item;
      }
    }
  } else {
    // Insert before ip
    item.l_prev = ip.l_prev;
    item.l_next = ip;
    if (ip.l_prev !== null) ip.l_prev.l_next = item;
    else g.pack = item;
    ip.l_prev = item;
  }

  await goto_picked_up(g, item.l_data, silent, item);
}

async function goto_picked_up(g, obj, silent, item) {
  obj = item.l_data;
  if (g.notify && !silent) {
    if (!g.terse) _addmsg('You now have ');
    await _msg(`${_inv_name(obj, !g.terse)} (${pack_char(obj)})`);
  }
  if (obj.o_type === AMULET) g.amulet = true;
}

/**
 * inventory(list, type): list what is in the pack.
 */
export async function inventory(list, type) {
  const g = game();
  let n_objs = 0;
  let inv_temp = '';

  let ch = 'a';
  for (let ip = list; ip !== null; ip = ip.l_next, ch = String.fromCharCode(ch.charCodeAt(0) + 1)) {
    const obj = ip.l_data;
    if (type && type !== obj.o_type &&
        !(type === CALLABLE && (obj.o_type === SCROLL || obj.o_type === POTION ||
          obj.o_type === RING || obj.o_type === STICK))) {
      continue;
    }
    switch (n_objs++) {
      case 0:
        inv_temp = `${ch}) ${_inv_name(obj, false)}`;
        break;
      case 1:
        if (g.slow_invent) {
          await _msg(inv_temp);
        } else {
          wclear(g.hw);
          waddstr(g.hw, inv_temp + '\n');
        }
        // fall through
      default:
        if (g.slow_invent) {
          await _msg(`${ch}) ${_inv_name(obj, false)}`);
        } else {
          wprintw(g.hw, `${ch}) ${_inv_name(obj, false)}\n`);
        }
    }
  }

  if (n_objs === 0) {
    if (g.terse) await _msg(type === 0 ? 'Empty handed.' : 'Nothing appropriate');
    else await _msg(type === 0 ? 'You are empty handed.' : "You don't have anything appropriate");
    return false;
  }
  if (n_objs === 1) {
    await _msg(inv_temp);
    return true;
  }
  if (!g.slow_invent) {
    mvwaddstr(g.hw, LINES - 1, 0, '--Press space to continue--');
    if (_draw) _draw(g.hw);
    if (_wait_for) await _wait_for(' ');
  }
  return true;
}

/**
 * pick_up(ch): add something from floor to pack.
 */
export async function pick_up(ch) {
  switch (ch) {
    case GOLD:
      if (_money) await _money();
      break;
    case ARMOR:
    case POTION:
    case FOOD:
    case WEAPON:
    case SCROLL:
    case AMULET:
    case RING:
    case STICK:
    default:
      await add_pack(null, false);
      break;
  }
}

/**
 * picky_inven(): allow player to inventory a single item.
 */
export async function picky_inven() {
  const g = game();
  if (g.pack === null) {
    await _msg("You aren't carrying anything");
  } else if (g.pack.l_next === null) {
    await _msg(`a) ${_inv_name(g.pack.l_data, false)}`);
  } else {
    await _msg(g.terse ? 'Item: ' : 'Which item do you wish to inventory: ');
    g.mpos = 0;
    const mch = await _readchar();
    if (mch === '\x1b' || mch === ESCAPE) {
      await _msg('');
      return;
    }
    let ch = 'a';
    for (let item = g.pack; item !== null; item = item.l_next, ch = String.fromCharCode(ch.charCodeAt(0) + 1)) {
      if (ch === mch) {
        await _msg(`${ch}) ${_inv_name(item.l_data, false)}`);
        return;
      }
    }
    if (!g.terse) await _msg(`'${mch}' not in pack`);
    const lastch = String.fromCharCode(ch.charCodeAt(0) - 1);
    await _msg(`Range is 'a' to '${lastch}'`);
  }
}

/**
 * get_item(purpose, type): pick something from the pack for a purpose.
 */
export async function get_item(purpose, type) {
  const g = game();
  if (g.pack === null) {
    await _msg("You aren't carrying anything.");
    return null;
  }

  for (;;) {
    if (!g.terse) _addmsg('Which object do you want to ');
    _addmsg(purpose);
    if (g.terse) _addmsg(' what');
    await _msg('? (* for list): ');
    const ch = await _readchar();
    g.mpos = 0;

    if (ch === '\x1b' || ch === '\x07' /* CTRL-G */) {
      g.after = false;
      await _msg('');
      return null;
    }

    if (ch === '*') {
      g.mpos = 0;
      if (!(await inventory(g.pack, type))) {
        g.after = false;
        return null;
      }
      continue;
    }

    let och = 'a';
    let obj = null;
    for (let ip = g.pack; ip !== null; ip = ip.l_next, och = String.fromCharCode(och.charCodeAt(0) + 1)) {
      if (ch === och) { obj = ip; break; }
    }

    if (obj === null) {
      await _msg(`Please specify a letter between 'a' and '${String.fromCharCode(och.charCodeAt(0) - 1)}'`);
      continue;
    }
    return obj;
  }
}

/**
 * pack_char(obj): get the pack letter of an object.
 */
export function pack_char(obj) {
  const g = game();
  let c = 'a';
  for (let item = g.pack; item !== null; item = item.l_next) {
    if (item.l_data === obj) return c;
    c = String.fromCharCode(c.charCodeAt(0) + 1);
  }
  return 'z';
}
