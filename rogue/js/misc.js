/**
 * misc.js — Miscellaneous routines for Rogue 3.6 JS port.
 * Ported from misc.c.
 */

import { game } from './gstate.js';
import { rnd } from './rng.js';
import { mvwinch, wmove, waddch, mvwaddch, winat, mvaddch, getCwyx } from './curses.js';
import {
  SECRETDOOR, DOOR, FLOOR, PASSAGE, TRAP, STAIRS, PLAYER, AMULET,
  LINES, COLS, ISBLIND, ISDARK, ISFOUND,
  LEFT, RIGHT, R_SEARCH, R_TELEPORT, GOLD, WEAPON, ARMOR, POTION,
  SCROLL, RING, STICK, FOOD,
} from './const.js';
import { roomin, inroom } from './rooms.js';
import { find_mons } from './monsters.js';
import { trap_at, show } from './move.js';
import { runto } from './chase.js';

// Injected deps
let _msg = null;
let _addmsg = null;
let _wake_monster = null;
let _readchar = null;
let _wait_for = null;
let _ISWEARING = null;
let _ISRING = null;
let _teleport = null;

export function _setMiscDeps(deps) {
  _msg = deps.msg;
  _addmsg = deps.addmsg;
  _wake_monster = deps.wake_monster;
  _readchar = deps.readchar;
  _wait_for = deps.wait_for;
  _ISWEARING = deps.ISWEARING;
  _ISRING = deps.ISRING;
  _teleport = deps.teleport;
}

/**
 * tr_name(ch): print the name of a trap.
 */
export function tr_name(ch) {
  const g = game();
  switch (ch) {
    case '\x01': /* TRAPDOOR */  return g.terse ? 'A trapdoor.' : 'You found a trapdoor.';
    case '\x02': /* BEARTRAP */  return g.terse ? 'A beartrap.' : 'You found a beartrap.';
    case '\x03': /* SLEEPTRAP */ return g.terse ? 'A sleeping gas trap.' : 'You found a sleeping gas trap.';
    case '\x04': /* ARROWTRAP */ return g.terse ? 'An arrow trap.' : 'You found an arrow trap.';
    case '\x05': /* TELTRAP */   return g.terse ? 'A teleport trap.' : 'You found a teleport trap.';
    case '\x06': /* DARTTRAP */  return g.terse ? 'A dart trap.' : 'You found a poison dart trap.';
    default: return 'A trap.';
  }
}

/**
 * look(wakeup): look around the player.
 */
export async function look(wakeup) {
  const g = game();
  const [oldy, oldx] = getCwCursor(g);
  const oldrp = g.oldrp;
  const oldpos = g.oldpos;

  if (oldrp !== null && (oldrp.r_flags & ISDARK) && !(g.player.t_flags & ISBLIND)) {
    for (let x = oldpos.x - 1; x <= oldpos.x + 1; x++) {
      for (let y = oldpos.y - 1; y <= oldpos.y + 1; y++) {
        if ((y !== g.player.t_pos.y || x !== g.player.t_pos.x) &&
            show(y, x) === FLOOR) {
          mvwaddch(g.cw, y, x, ' ');
        }
      }
    }
  }

  const rp = roomin(g.player.t_pos);
  const inpass = (rp === null);
  const ey = g.player.t_pos.y + 1;
  const ex = g.player.t_pos.x + 1;
  let passcount = 0;

  for (let x = g.player.t_pos.x - 1; x <= ex; x++) {
    if (x < 0 || x >= COLS) continue;
    for (let y = g.player.t_pos.y - 1; y <= ey; y++) {
      if (y <= 0 || y >= LINES - 1) continue;
      const mch = g.mw[y][x];
      if (mch >= 'A' && mch <= 'Z') {
        let it;
        if (wakeup) {
          it = await _wake_monster(y, x);
        } else {
          it = find_mons(y, x);
        }
        if (it) {
          const tp = it.l_data;
          const underlying = g.stdscr[y][x];
          tp.t_oldch = underlying;
          if (tp.t_oldch === TRAP) {
            const trap = trap_at(y, x);
            tp.t_oldch = (trap && (trap.tr_flags & ISFOUND)) ? TRAP : FLOOR;
          }
          if (tp.t_oldch === FLOOR && rp && (rp.r_flags & ISDARK) &&
              !(g.player.t_flags & ISBLIND)) {
            tp.t_oldch = ' ';
          }
        }
      }

      let ch = show(y, x);
      if (ch === SECRETDOOR) ch = secretdoor(y, x);

      if (!(g.player.t_flags & ISBLIND)) {
        if ((y === g.player.t_pos.y && x === g.player.t_pos.x) ||
            (inpass && (ch === '-' || ch === '|'))) continue;
      } else if (y !== g.player.t_pos.y || x !== g.player.t_pos.x) {
        continue;
      }

      mvwaddch(g.cw, y, x, ch);

      if (g.door_stop && !g.firstmove && g.running) {
        switch (g.runch) {
          case 'h': if (x === ex) continue; break;
          case 'j': if (y === g.player.t_pos.y - 1) continue; break;
          case 'k': if (y === ey) continue; break;
          case 'l': if (x === g.player.t_pos.x - 1) continue; break;
          case 'y': if ((x + y) - (g.player.t_pos.x + g.player.t_pos.y) >= 1) continue; break;
          case 'u': if ((y - x) - (g.player.t_pos.y - g.player.t_pos.x) >= 1) continue; break;
          case 'n': if ((x + y) - (g.player.t_pos.x + g.player.t_pos.y) <= -1) continue; break;
          case 'b': if ((y - x) - (g.player.t_pos.y - g.player.t_pos.x) <= -1) continue; break;
        }
        switch (ch) {
          case DOOR:
            if (x === g.player.t_pos.x || y === g.player.t_pos.y) g.running = false;
            break;
          case PASSAGE:
            if (x === g.player.t_pos.x || y === g.player.t_pos.y) passcount++;
            break;
          case FLOOR: case '|': case '-': case ' ': break;
          default: g.running = false; break;
        }
      }
    }
  }

  if (g.door_stop && !g.firstmove && passcount > 1) g.running = false;
  mvwaddch(g.cw, g.player.t_pos.y, g.player.t_pos.x, PLAYER);
  wmove(g.cw, oldy, oldx);
  g.oldpos = { x: g.player.t_pos.x, y: g.player.t_pos.y };
  g.oldrp = rp;
}

function getCwCursor(g) {
  // Return [y, x] of cw cursor
  return getCwyx();
}

/**
 * secretdoor(y, x): what a secret door looks like.
 */
export function secretdoor(y, x) {
  const g = game();
  const cp = { x, y };
  for (const rp of g.rooms) {
    if (inroom(rp, cp)) {
      if (y === rp.r_pos.y || y === rp.r_pos.y + rp.r_max.y - 1) return '-';
      else return '|';
    }
  }
  return 'p';
}

/**
 * find_obj(y, x): find unclaimed object at y, x.
 */
export function find_obj(y, x) {
  const g = game();
  for (let obj = g.lvl_obj; obj !== null; obj = obj.l_next) {
    const op = obj.l_data;
    if (op.o_pos.y === y && op.o_pos.x === x) return obj;
  }
  return null;
}

/**
 * eat(): eat something from the pack.
 */
export async function eat() {
  const g = game();
  const { get_item } = await import('./pack.js');
  const item = await get_item('eat', FOOD);
  if (item === null) return;
  const obj = item.l_data;
  if (obj.o_type !== FOOD) {
    if (!g.terse) await _msg('Ugh, you would get ill if you ate that.');
    else await _msg("That's Inedible!");
    return;
  }
  g.inpack--;
  obj.o_count--;
  if (obj.o_count < 1) {
    // detach and discard
    detach_from_pack(g, item);
  }
  if (obj.o_which === 1) {
    await _msg(`My, that was a yummy ${g.fruit}`);
  } else if (rnd(100) > 70) {
    await _msg('Yuk, this food tastes awful');
    g.player.t_stats.s_exp++;
    const { check_level } = await import('./fight.js');
    await check_level();
  } else {
    await _msg('Yum, that tasted good');
  }
  const HUNGERTIME = 1300;
  const STOMACHSIZE = 2000;
  g.food_left += HUNGERTIME + rnd(400) - 200;
  if (g.food_left > STOMACHSIZE) g.food_left = STOMACHSIZE;
  g.hungry_state = 0;
}

function detach_from_pack(g, item) {
  if (item.l_prev) item.l_prev.l_next = item.l_next;
  else g.pack = item.l_next;
  if (item.l_next) item.l_next.l_prev = item.l_prev;
  item.l_prev = item.l_next = null;
}

/**
 * chg_str(amt): modify player's strength.
 */
export function chg_str(amt) {
  const g = game();
  if (amt === 0) return;
  if (amt > 0) {
    for (let i = 0; i < amt; i++) {
      if (g.player.t_stats.s_str.st_str < 18) {
        g.player.t_stats.s_str.st_str++;
      } else if (g.player.t_stats.s_str.st_add === 0) {
        g.player.t_stats.s_str.st_add = rnd(50) + 1;
      } else if (g.player.t_stats.s_str.st_add <= 50) {
        g.player.t_stats.s_str.st_add = 51 + rnd(24);
      } else if (g.player.t_stats.s_str.st_add <= 75) {
        g.player.t_stats.s_str.st_add = 76 + rnd(14);
      } else if (g.player.t_stats.s_str.st_add <= 90) {
        g.player.t_stats.s_str.st_add = 91;
      } else if (g.player.t_stats.s_str.st_add < 100) {
        g.player.t_stats.s_str.st_add++;
      }
    }
    const ms = g.max_stats.s_str;
    const cs = g.player.t_stats.s_str;
    if (cs.st_str > ms.st_str || (cs.st_str === 18 && cs.st_add > ms.st_add)) {
      g.max_stats.s_str = { st_str: cs.st_str, st_add: cs.st_add };
    }
  } else {
    for (let i = 0; i < -amt; i++) {
      const s = g.player.t_stats.s_str;
      if (s.st_str < 18 || s.st_add === 0) {
        s.st_str--;
      } else if (s.st_add < 51) {
        s.st_add = 0;
      } else if (s.st_add < 76) {
        s.st_add = 1 + rnd(50);
      } else if (s.st_add < 91) {
        s.st_add = 51 + rnd(25);
      } else if (s.st_add < 100) {
        s.st_add = 76 + rnd(14);
      } else {
        s.st_add = 91 + rnd(8);
      }
    }
    if (g.player.t_stats.s_str.st_str < 3) g.player.t_stats.s_str.st_str = 3;
  }
}

/**
 * aggravate(): aggravate all monsters.
 */
export function aggravate() {
  const g = game();
  for (let mi = g.mlist; mi !== null; mi = mi.l_next) {
    runto(mi.l_data.t_pos, g.player.t_pos);
  }
}

/**
 * vowelstr(str): return 'n' if str starts with vowel.
 */
export function vowelstr(str) {
  if (!str) return '';
  switch (str[0]) {
    case 'a': case 'e': case 'i': case 'o': case 'u': return 'n';
    default: return '';
  }
}

/**
 * is_current(obj): is this one of the currently equipped items?
 */
export function is_current(obj) {
  const g = game();
  if (obj === null) return false;
  if (obj === g.cur_armor || obj === g.cur_weapon ||
      obj === g.cur_ring[LEFT] || obj === g.cur_ring[RIGHT]) {
    _msg(g.terse ? 'In use.' : "That's already in use.");
    return true;
  }
  return false;
}

/**
 * get_dir(): set up direction delta for prefix commands.
 */
export async function get_dir() {
  const g = game();
  const prompt = g.terse ? 'Direction: ' : 'Which direction? ';
  if (!g.terse) await _msg(prompt);

  let gotit = false;
  do {
    gotit = true;
    const ch = await _readchar();
    switch (ch) {
      case 'h': case 'H': g.delta = { y: 0,  x: -1 }; break;
      case 'j': case 'J': g.delta = { y: 1,  x: 0  }; break;
      case 'k': case 'K': g.delta = { y: -1, x: 0  }; break;
      case 'l': case 'L': g.delta = { y: 0,  x: 1  }; break;
      case 'y': case 'Y': g.delta = { y: -1, x: -1 }; break;
      case 'u': case 'U': g.delta = { y: -1, x: 1  }; break;
      case 'b': case 'B': g.delta = { y: 1,  x: -1 }; break;
      case 'n': case 'N': g.delta = { y: 1,  x: 1  }; break;
      case '\x1b': return false;
      default:
        g.mpos = 0;
        await _msg(prompt);
        gotit = false;
    }
  } while (!gotit);

  if ((g.player.t_flags & ISHUH) && rnd(100) > 80) {
    do {
      g.delta = { y: rnd(3) - 1, x: rnd(3) - 1 };
    } while (g.delta.y === 0 && g.delta.x === 0);
  }
  g.mpos = 0;
  return true;
}

const ISHUH = 0x20;
const ISDARK_FLAG = 0o002;

/**
 * search(): grope around to find hidden things.
 */
export async function search() {
  const g = game();
  if (g.player.t_flags & ISBLIND) return;
  for (let x = g.player.t_pos.x - 1; x <= g.player.t_pos.x + 1; x++) {
    for (let y = g.player.t_pos.y - 1; y <= g.player.t_pos.y + 1; y++) {
      const ch = g.stdscr[y] ? g.stdscr[y][x] : ' ';
      if (ch === SECRETDOOR) {
        if (rnd(100) < 20) {
          g.stdscr[y][x] = DOOR;
          g.count = 0;
        }
      } else if (ch === TRAP) {
        const cw_ch = g.cw[y] ? g.cw[y][x] : ' ';
        if (cw_ch === TRAP) continue;
        if (rnd(100) > 50) continue;
        const tp = trap_at(y, x);
        if (tp) {
          tp.tr_flags |= ISFOUND;
          mvwaddch(g.cw, y, x, TRAP);
          g.count = 0;
          g.running = false;
          await _msg(tr_name(tp.tr_type));
        }
      }
    }
  }
}

/**
 * add_haste(potion): add haste to player.
 */
export async function add_haste(potion) {
  const g = game();
  const { extinguish } = await import('./daemon.js');
  const { nohaste } = await import('./daemons.js');
  const { fuse } = await import('./daemon.js');
  if (g.player.t_flags & ISHASTE) {
    await _msg('You faint from exhaustion.');
    g.no_command += rnd(8);
    extinguish(nohaste);
  } else {
    g.player.t_flags |= ISHASTE;
    if (potion) fuse(nohaste, 0, rnd(4) + 4, AFTER);
  }
}

const ISHASTE = 0x80;
const AFTER = 2;
