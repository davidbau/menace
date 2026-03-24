/**
 * rooms.js — Room generation for Rogue 3.6 JS port.
 * Faithfully ported from rooms.c.
 */

import { game } from './gstate.js';
import { rnd } from './rng.js';
import { mvaddch, move, addch, winat, _stdscrState } from './curses.js';
import {
  MAXROOMS, LINES, COLS, ISGONE, ISDARK, GOLD, FLOOR,
} from './const.js';
import { new_item, _attach } from './list.js';

// Forward declarations — set by newlevel.js after imports
let _new_monster = null;
let _randmonster = null;
let _new_thing = null;

export function _setRoomsDeps(new_monster, randmonster, new_thing) {
  _new_monster = new_monster;
  _randmonster = randmonster;
  _new_thing = new_thing;
}

/**
 * do_rooms: Draw the nine rooms and populate them.
 */
export function do_rooms() {
  const g = game();
  const rooms = g.rooms;

  // C ref: rooms.c — bsze = {COLS/3, LINES/3}
  const bszeX = Math.floor(COLS / 3);
  const bszeY = Math.floor(LINES / 3);

  for (const rp of rooms) {
    rp.r_goldval = rp.r_nexits = rp.r_flags = 0;
  }

  const left_out = rnd(4);
  for (let i = 0; i < left_out; i++) {
    rooms[rnd_room()].r_flags |= ISGONE;
  }

  for (let i = 0; i < MAXROOMS; i++) {
    const rp = rooms[i];
    // C ref: rooms.c — top.x = (i%3)*bsze.x + 1; top.y = i/3*bsze.y;
    const topX = (i % 3) * bszeX + 1;
    const topY = Math.floor(i / 3) * bszeY;

    if (rp.r_flags & ISGONE) {
      do {
        rp.r_pos.x = topX + rnd(bszeX - 2) + 1;
        rp.r_pos.y = topY + rnd(bszeY - 2) + 1;
        rp.r_max.x = -COLS;
        rp.r_max.y = -LINES;
      } while (rp.r_pos.y <= 0 || rp.r_pos.y >= LINES - 1);
      continue;
    }

    if (rnd(10) < g.level - 1)
      rp.r_flags |= ISDARK;

    // C ref: rooms.c — room size and position (retry if y == 0)
    do {
      rp.r_max.x = rnd(bszeX - 4) + 4;
      rp.r_max.y = rnd(bszeY - 4) + 4;
      rp.r_pos.x = topX + rnd(bszeX - rp.r_max.x);
      rp.r_pos.y = topY + rnd(bszeY - rp.r_max.y);
    } while (rp.r_pos.y === 0);

    if (rnd(100) < 50 && (!g.amulet || g.level >= g.max_level)) {
      rp.r_goldval = goldcalc();
      rnd_pos(rp, rp.r_gold);
    }

    draw_room(rp);

    if (rnd(100) < (rp.r_goldval > 0 ? 80 : 25)) {
      const item = new_item(mk_thing_data());
      const tp = item.l_data;
      let mp = { x: 0, y: 0 };
      do {
        rnd_pos(rp, mp);
      } while (winat(mp.y, mp.x) !== FLOOR);
      _new_monster(item, _randmonster(false), mp);
      const monIdx = tp.t_type.charCodeAt(0) - 65;
      if (rnd(100) < g.monsters[monIdx].m_carry) {
        const titem = _new_thing();
        const listp = { val: tp.t_pack };
        _attach(listp, titem);
        tp.t_pack = listp.val;
      }
    }
  }
}

function mk_thing_data() {
  return {
    t_pos: { x: 0, y: 0 },
    t_turn: false,
    t_type: '@',
    t_disguise: '@',
    t_oldch: ' ',
    t_dest: null,
    t_flags: 0,
    t_stats: { s_str: { st_str: 10, st_add: 0 }, s_exp: 0, s_lvl: 1, s_arm: 10, s_hpt: 1, s_dmg: "1d4" },
    t_pack: null,
  };
}

function goldcalc() {
  const g = game();
  return rnd(50 + 10 * g.level) + 2;
}

/**
 * draw_room: draw walls and floor of a room onto stdscr.
 * C code:
 *   move(rp->r_pos.y, rp->r_pos.x+1);
 *   vert(rp->r_max.y-2);   -- left side
 *   move(rp->r_pos.y+rp->r_max.y-1, rp->r_pos.x);
 *   horiz(rp->r_max.x);    -- bottom
 *   move(rp->r_pos.y, rp->r_pos.x);
 *   horiz(rp->r_max.x);    -- top
 *   vert(rp->r_max.y-2);   -- right side (starting from where horiz left off)
 */
export function draw_room(rp) {
  // Left side: draw '|' at (r_pos.y+1..r_pos.y+r_max.y-2, r_pos.x)
  // vert() in C: getyx(y,x); x--; then moves to (y+1, x) and adds '|', etc.
  // move(r_pos.y, r_pos.x+1) sets cursor at (r_pos.y, r_pos.x+1)
  // vert(): x-- => x = r_pos.x; then draws at y+1, y+2, ...
  move(rp.r_pos.y, rp.r_pos.x + 1);
  vert(rp.r_max.y - 2);  // Left side

  // Bottom line
  move(rp.r_pos.y + rp.r_max.y - 1, rp.r_pos.x);
  horiz(rp.r_max.x);  // Bottom

  // Top line
  move(rp.r_pos.y, rp.r_pos.x);
  horiz(rp.r_max.x);  // Top

  // Right side: after horiz(r_max.x), cursor is at (r_pos.y, r_pos.x + r_max.x)
  // vert(): x-- => x = r_pos.x + r_max.x - 1; then draws at y+1, y+2, ...
  vert(rp.r_max.y - 2);  // Right side

  // Floor
  for (let j = 1; j < rp.r_max.y - 1; j++) {
    move(rp.r_pos.y + j, rp.r_pos.x + 1);
    for (let k = 1; k < rp.r_max.x - 1; k++) {
      addch(FLOOR);
    }
  }

  if (rp.r_goldval) {
    mvaddch(rp.r_gold.y, rp.r_gold.x, GOLD);
  }
}

/**
 * horiz: draw cnt '-' characters starting at current stdscr cursor
 */
export function horiz(cnt) {
  while (cnt--) addch('-');
}

/**
 * vert: draw cnt '|' characters going downward.
 * C code: getyx(stdscr, y, x); x--; while(cnt--) { move(++y, x); addch('|'); }
 */
export function vert(cnt) {
  const g = game();
  // Get current stdscr cursor position
  let y = _stdscrState.y;
  let x = _stdscrState.x - 1; // x-- because C does getyx then x--
  while (cnt--) {
    y++;
    if (y >= 0 && y < LINES && x >= 0 && x < COLS) {
      g.stdscr[y][x] = '|';
    }
    _stdscrState.y = y;
    _stdscrState.x = x + 1; // addch() advances x, but we want to write at x
  }
  // After last addch, cursor is at (y, x+1)
  _stdscrState.x = x + 1;
}

/**
 * rnd_pos: pick a random spot in a room
 */
export function rnd_pos(rp, cp) {
  cp.x = rp.r_pos.x + rnd(rp.r_max.x - 2) + 1;
  cp.y = rp.r_pos.y + rnd(rp.r_max.y - 2) + 1;
}

/**
 * rnd_room: pick a room that is really there (not ISGONE)
 */
export function rnd_room() {
  const g = game();
  let rm;
  do {
    rm = rnd(MAXROOMS);
  } while (g.rooms[rm].r_flags & ISGONE);
  return rm;
}

/**
 * roomin: find what room coordinates are in. Returns null if none.
 */
export function roomin(cp) {
  const g = game();
  for (const rp of g.rooms) {
    if (inroom(rp, cp)) return rp;
  }
  return null;
}

/**
 * inroom: true if cp is inside rp
 * C: (cp)->x <= (rp)->r_pos.x + ((rp)->r_max.x - 1) && (rp)->r_pos.x <= (cp)->x
 *  && (cp)->y <= (rp)->r_pos.y + ((rp)->r_max.y - 1) && (rp)->r_pos.y <= (cp)->y
 */
export function inroom(rp, cp) {
  if (rp.r_flags & ISGONE) return false;
  if (rp.r_max.x <= 0) return false;
  return cp.x <= rp.r_pos.x + (rp.r_max.x - 1) && rp.r_pos.x <= cp.x &&
         cp.y <= rp.r_pos.y + (rp.r_max.y - 1) && rp.r_pos.y <= cp.y;
}
