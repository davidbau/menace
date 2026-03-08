/**
 * scrolls.js — Scroll effects for Rogue 3.6 JS port.
 * Ported from scrolls.c.
 */

import { game } from './gstate.js';
import { rnd } from './rng.js';
import {
  S_CONFUSE, S_MAP, S_LIGHT, S_HOLD, S_SLEEP, S_ARMOR, S_IDENT,
  S_SCARE, S_GFIND, S_TELEP, S_ENCH, S_CREATE, S_REMOVE, S_AGGR,
  S_NOP, S_GENOCIDE,
  SCROLL, ISDARK, FLOOR, PLAYER, CANHUH, ISHELD, ISRUN, ISCURSED,
  SLEEPTIME, LINES, COLS,
} from './const.js';
import { mvwinch, mvwaddch, winat } from './curses.js';

// Injected deps
let _msg = null;
let _addmsg = null;
let _endmsg = null;
let _get_item = null;
let _light = null;
let _look = null;
let _status = null;
let _inv_name = null;
let _detach = null;
let _discard = null;
let _readchar = null;
let _aggravate = null;
let _genocide = null;
let _new_monster = null;
let _randmonster = null;
let _new_item = null;
let _teleport = null;
let _roomin = null;
let _chg_str = null;
let _raise_level = null;
let _find_mons = null;
let _step_ok = null;

export function _setScrollsDeps(deps) {
  _msg = deps.msg;
  _addmsg = deps.addmsg;
  _endmsg = deps.endmsg;
  _get_item = deps.get_item;
  _light = deps.light;
  _look = deps.look;
  _status = deps.status;
  _inv_name = deps.inv_name;
  _detach = deps.detach;
  _discard = deps.discard;
  _readchar = deps.readchar;
  _aggravate = deps.aggravate;
  _genocide = deps.genocide;
  _new_monster = deps.new_monster;
  _randmonster = deps.randmonster;
  _new_item = deps.new_item;
  _teleport = deps.teleport;
  _roomin = deps.roomin;
  _chg_str = deps.chg_str;
  _raise_level = deps.raise_level;
  _find_mons = deps.find_mons;
  _step_ok = deps.step_ok;
  _inv_name = deps.inv_name;
}

/**
 * read_scroll(): read a scroll and apply its effect.
 */
export async function read_scroll() {
  const g = game();
  const item = await _get_item('read', SCROLL);
  if (item === null) return;
  const obj = item.l_data;
  if (obj.o_type !== SCROLL) {
    if (!g.terse) await _msg('There is nothing on it to read');
    else await _msg('Nothing to read');
    return;
  }
  await _msg('As you read the scroll, it vanishes.');

  if (obj === g.cur_weapon) g.cur_weapon = null;

  switch (obj.o_which) {
    case S_CONFUSE:
      // Scroll of monster confusion — give player CANHUH
      await _msg('Your hands begin to glow red');
      g.player.t_flags |= CANHUH;
      break;

    case S_LIGHT: {
      g.s_know[S_LIGHT] = true;
      const rp = _roomin(g.player.t_pos);
      if (rp === null) {
        await _msg('The corridor glows and then fades');
      } else {
        _addmsg('The room is lit');
        if (!g.terse) _addmsg(' by a shimmering blue light.');
        await _endmsg();
        rp.r_flags &= ~ISDARK;
        _light(g.player.t_pos);
        mvwaddch(g.cw, g.player.t_pos.y, g.player.t_pos.x, PLAYER);
      }
      break;
    }

    case S_ARMOR:
      if (g.cur_armor !== null) {
        await _msg('Your armor glows faintly for a moment');
        g.cur_armor.o_ac--;
        g.cur_armor.o_flags &= ~ISCURSED;
      }
      break;

    case S_HOLD: {
      // Stop monsters within 2 spaces
      for (let x = g.player.t_pos.x - 2; x <= g.player.t_pos.x + 2; x++) {
        for (let y = g.player.t_pos.y - 2; y <= g.player.t_pos.y + 2; y++) {
          if (y > 0 && x > 0) {
            const mch = g.mw[y] && g.mw[y][x];
            if (mch >= 'A' && mch <= 'Z') {
              const mon = _find_mons(y, x);
              if (mon !== null) {
                const th = mon.l_data;
                th.t_flags &= ~ISRUN;
                th.t_flags |= ISHELD;
              }
            }
          }
        }
      }
      break;
    }

    case S_SLEEP:
      g.s_know[S_SLEEP] = true;
      await _msg('You fall asleep.');
      g.no_command += 4 + rnd(SLEEPTIME);
      break;

    case S_CREATE: {
      // Create a monster near player
      let appear = 0;
      let mp = null;
      for (let y = g.player.t_pos.y; y <= g.player.t_pos.y + 1; y++) {
        for (let x = g.player.t_pos.x; x <= g.player.t_pos.x + 1; x++) {
          if (y === g.player.t_pos.y && x === g.player.t_pos.x) continue;
          if (_step_ok(winat(y, x))) {
            if (rnd(++appear) === 0) mp = { y, x };
          }
        }
      }
      if (appear) {
        const titem = _new_item({
          o_type: ' ', o_pos: { x: 0, y: 0 }, o_count: 1, o_which: 0,
          o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
          o_damage: '0d0', o_hurldmg: '0d0', o_ac: 11, o_launch: 100, o_charges: 0,
        });
        _new_monster(titem, _randmonster(false), mp);
      } else {
        await _msg('You hear a faint cry of anguish in the distance.');
      }
      break;
    }

    case S_IDENT:
      await _msg('This scroll is an identify scroll');
      g.s_know[S_IDENT] = true;
      await whatis(g);
      break;

    case S_MAP: {
      g.s_know[S_MAP] = true;
      await _msg('Oh, now this scroll has a map on it.');
      // Reveal structural cells (walls, floors, doors, passages) but not items
      for (let i = 0; i < LINES; i++) {
        for (let j = 0; j < COLS; j++) {
          const ch = g.stdscr[i][j];
          let reveal = false;
          switch (ch) {
            case '-': case '|': case '+': case '#': case '%': case ' ':
              reveal = true; break;
            case '&': // SECRETDOOR
              g.stdscr[i][j] = '+';
              g.cw[i][j] = '+';
              reveal = true; break;
          }
          if (reveal && g.cw[i][j] === ' ') g.cw[i][j] = ch;
        }
      }
      break;
    }

    case S_GFIND: {
      // Gold detection
      let gtotal = 0;
      for (let i = 0; i < g.rooms.length; i++) {
        gtotal += g.rooms[i].r_goldval;
      }
      if (gtotal) {
        g.s_know[S_GFIND] = true;
        await _msg('You begin to feel greedy and you sense gold.');
      } else {
        await _msg('You begin to feel a pull downward');
      }
      break;
    }

    case S_TELEP: {
      const cur_room = _roomin(g.player.t_pos);
      const rm = _teleport();
      const new_room = _roomin(g.player.t_pos);
      if (cur_room !== new_room) g.s_know[S_TELEP] = true;
      break;
    }

    case S_ENCH:
      if (g.cur_weapon === null) {
        await _msg('You feel a strange sense of loss.');
      } else {
        g.cur_weapon.o_flags &= ~ISCURSED;
        if (rnd(100) > 50)
          g.cur_weapon.o_hplus++;
        else
          g.cur_weapon.o_dplus++;
        await _msg(`Your ${g.w_names[g.cur_weapon.o_which]} glows blue for a moment.`);
      }
      break;

    case S_SCARE:
      // Reading a scare monster scroll just produces laughter
      await _msg('You hear maniacal laughter in the distance.');
      break;

    case S_REMOVE:
      if (g.cur_armor !== null) g.cur_armor.o_flags &= ~ISCURSED;
      if (g.cur_weapon !== null) g.cur_weapon.o_flags &= ~ISCURSED;
      if (g.cur_ring[0] !== null) g.cur_ring[0].o_flags &= ~ISCURSED;
      if (g.cur_ring[1] !== null) g.cur_ring[1].o_flags &= ~ISCURSED;
      await _msg('You feel as if somebody is watching over you.');
      break;

    case S_AGGR:
      _aggravate();
      await _msg('You hear a high pitched humming noise.');
      break;

    case S_NOP:
      await _msg('This scroll seems to be blank.');
      break;

    case S_GENOCIDE:
      await _msg('You have been granted the boon of genocide');
      await _genocide();
      g.s_know[S_GENOCIDE] = true;
      break;

    default:
      await _msg('What a puzzling scroll!');
      return;
  }

  await _look(true);
  _status();

  if (g.s_know[obj.o_which] && g.s_guess[obj.o_which]) {
    g.s_guess[obj.o_which] = null;
  } else if (!g.s_know[obj.o_which] && g.askme && g.s_guess[obj.o_which] === null) {
    await _msg(g.terse ? 'Call it: ' : 'What do you want to call it? ');
    const buf = await get_str(_readchar);
    if (buf !== null) g.s_guess[obj.o_which] = buf;
  }

  // Consume the scroll
  g.inpack--;
  if (obj.o_count > 1) {
    obj.o_count--;
  } else {
    _detach(item);
    _discard(item);
  }
}

/**
 * whatis(): identify an item from the pack (S_IDENT scroll effect).
 * Player selects a pack item; we mark its type as known.
 */
async function whatis(g) {
  const item = await _get_item('identify', 0);
  if (item === null) return;
  const obj = item.l_data;
  switch (obj.o_type) {
    case SCROLL:
      g.s_know[obj.o_which] = true;
      if (g.s_guess[obj.o_which]) g.s_guess[obj.o_which] = null;
      break;
    case '!':  // POTION
      g.p_know[obj.o_which] = true;
      if (g.p_guess[obj.o_which]) g.p_guess[obj.o_which] = null;
      break;
    case '/':  // STICK
      g.ws_know[obj.o_which] = true;
      obj.o_flags |= 0o000002; // ISKNOW
      if (g.ws_guess[obj.o_which]) g.ws_guess[obj.o_which] = null;
      break;
    case ')':  // WEAPON
    case ']':  // ARMOR
      obj.o_flags |= 0o000002; // ISKNOW
      break;
    case '=':  // RING
      g.r_know[obj.o_which] = true;
      obj.o_flags |= 0o000002; // ISKNOW
      if (g.r_guess[obj.o_which]) g.r_guess[obj.o_which] = null;
      break;
  }
  await _msg(_inv_name(obj, false));
}

async function get_str(readchar) {
  let buf = '';
  for (;;) {
    const ch = await readchar();
    if (ch === '\r' || ch === '\n') return buf;
    if (ch === '\x1b') return null;
    if (ch === '\x7f' || ch === '\x08') {
      if (buf.length > 0) buf = buf.slice(0, -1);
    } else {
      buf += ch;
    }
  }
}
