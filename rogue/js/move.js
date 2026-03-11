/**
 * move.js — Hero movement for Rogue 3.6 JS port.
 * Ported from move.c.
 */

import { game } from './gstate.js';
import { rnd, roll } from './rng.js';
import { winat, mvwinch, mvwaddch, wmove, waddch, mvinch } from './curses.js';
import {
  SECRETDOOR, DOOR, PASSAGE, FLOOR, STAIRS, TRAP, PLAYER,
  TRAPDOOR, BEARTRAP, SLEEPTRAP, ARROWTRAP, TELTRAP, DARTTRAP,
  GOLD, POTION, SCROLL, FOOD, WEAPON, ARMOR, RING, AMULET, STICK,
  LINES, COLS, ISBLIND, ISHELD, ISHUH, ISFOUND, ISDARK,
  VS_MAGIC, R_SUSTSTR, BEARTIME, SLEEPTIME, ARROW,
} from './const.js';
import { roomin } from './rooms.js';
import { find_mons } from './monsters.js';

// Injected deps
let _msg = null;
let _fight = null;
let _pick_up = null;
let _be_trapped = null;
let _step_ok = null;
let _diag_ok = null;
let _rndmove = null;
let _light = null;
let _new_level = null;
let _status = null;
let _save = null;
let _swing = null;
let _death = null;
let _ISWEARING = null;
let _chg_str = null;
let _fall = null;
let _teleport = null;
let _new_item = null;
let _init_weapon = null;
let _wake_monster = null;

export function _setMoveDeps(deps) {
  _msg = deps.msg;
  _fight = deps.fight;
  _pick_up = deps.pick_up;
  _be_trapped = deps.be_trapped;
  _step_ok = deps.step_ok;
  _diag_ok = deps.diag_ok;
  _rndmove = deps.rndmove;
  _light = deps.light;
  _new_level = deps.new_level;
  _status = deps.status;
  _save = deps.save;
  _swing = deps.swing;
  _death = deps.death;
  _ISWEARING = deps.ISWEARING;
  _chg_str = deps.chg_str;
  _fall = deps.fall;
  _teleport = deps.teleport;
  _new_item = deps.new_item;
  _init_weapon = deps.init_weapon;
  _wake_monster = deps.wake_monster;
}

/**
 * do_run(ch): start the hero running.
 */
export function do_run(ch) {
  const g = game();
  g.running = true;
  g.after = false;
  g.runch = ch;
}

/**
 * do_move(dy, dx): check and perform hero movement.
 */
export async function do_move(dy, dx) {
  const g = game();
  g.firstmove = false;

  if (g.no_move) {
    g.no_move--;
    await _msg('You are still stuck in the bear trap');
    return;
  }

  let nh;
  if (rnd(100) < 80 && (g.player.t_flags & ISHUH)) {
    nh = rndmove(g.player);
  } else {
    nh = { y: g.player.t_pos.y + dy, x: g.player.t_pos.x + dx };
  }

  if (nh.x < 0 || nh.x > COLS - 1 || nh.y < 0 || nh.y > LINES - 1 ||
      !diag_ok(g.player.t_pos, nh)) {
    g.after = false;
    g.running = false;
    return;
  }

  if (g.running && g.player.t_pos.y === nh.y && g.player.t_pos.x === nh.x) {
    g.after = g.running = false;
  }

  let ch = winat(nh.y, nh.x);

  if ((g.player.t_flags & ISHELD) && ch !== 'F') {
    await _msg('You are being held');
    return;
  }

  switch (ch) {
    case ' ':
    case '|':
    case '-':
    case SECRETDOOR:
      g.after = g.running = false;
      return;
    case TRAP:
      ch = await be_trapped(nh);
      if (ch === TRAPDOOR || ch === TELTRAP) return;
      // fall through
    case GOLD:
    case POTION:
    case SCROLL:
    case FOOD:
    case WEAPON:
    case ARMOR:
    case RING:
    case AMULET:
    case STICK:
      g.running = false;
      g.take = ch;
      // fall through
    default:
      if (ch === PASSAGE && winat(g.player.t_pos.y, g.player.t_pos.x) === DOOR) {
        if (_light) _light(g.player.t_pos);
      } else if (ch === DOOR) {
        g.running = false;
        if (winat(g.player.t_pos.y, g.player.t_pos.x) === PASSAGE) {
          if (_light) _light(nh);
        }
      } else if (ch === STAIRS) {
        g.running = false;
      } else if (ch >= 'A' && ch <= 'Z') {
        // Monster
        g.running = false;
        await _fight(nh, ch, g.cur_weapon, false);
        return;
      }

      const oldch = winat(g.player.t_pos.y, g.player.t_pos.x);
      wmove(g.cw, g.player.t_pos.y, g.player.t_pos.x);
      waddch(g.cw, oldch);
      g.player.t_pos.x = nh.x; g.player.t_pos.y = nh.y;
      wmove(g.cw, nh.y, nh.x);
      waddch(g.cw, PLAYER);
  }
}

/**
 * light(cp): illuminate a room.
 */
export async function light(cp) {
  const g = game();
  const rp = roomin(cp);
  if (rp !== null && !(g.player.t_flags & ISBLIND)) {
    for (let j = 0; j < rp.r_max.y; j++) {
      for (let k = 0; k < rp.r_max.x; k++) {
        const y = rp.r_pos.y + j;
        const x = rp.r_pos.x + k;
        let ch = show(y, x);
        wmove(g.cw, y, x);
        if (ch === SECRETDOOR) {
          ch = (j === 0 || j === rp.r_max.y - 1) ? '-' : '|';
        }
        if (ch >= 'A' && ch <= 'Z') {
          const item = await _wake_monster(y, x);
          if (item) {
            const tp = item.l_data;
            if (tp.t_oldch === ' ') {
              if (!(rp.r_flags & ISDARK)) {
                tp.t_oldch = mvwinch(g.stdscr, y, x);
              }
            }
          }
        }
        if (rp.r_flags & ISDARK) {
          const rch = mvwinch(g.cw, y, x);
          switch (rch) {
            case DOOR:
            case STAIRS:
            case TRAP:
            case '|':
            case '-':
            case ' ':
              ch = rch;
              break;
            case FLOOR:
              ch = (g.player.t_flags & ISBLIND) ? FLOOR : ' ';
              break;
            default:
              ch = ' ';
          }
        }
        mvwaddch(g.cw, y, x, ch);
      }
    }
  }
}

/**
 * show(y, x): what a cell displays as.
 */
export function show(y, x) {
  const g = game();
  let ch = winat(y, x);
  if (ch === TRAP) {
    return (trap_at(y, x).tr_flags & ISFOUND) ? TRAP : FLOOR;
  } else if (ch === 'M' || ch === 'I') {
    const it = find_mons(y, x);
    if (!it) return ch;
    const tp = it.l_data;
    if (ch === 'M') {
      ch = tp.t_disguise;
    } else if (!(g.player.t_flags & 0x10000 /* CANSEE */)) {
      ch = mvwinch(g.stdscr, y, x);
    }
  }
  return ch;
}

/**
 * be_trapped(tc): stepped on a trap.
 */
export async function be_trapped(tc) {
  const g = game();
  const tp = trap_at(tc.y, tc.x);
  g.count = g.running = false;
  mvwaddch(g.cw, tp.tr_pos.y, tp.tr_pos.x, TRAP);
  tp.tr_flags |= ISFOUND;
  const ch = tp.tr_type;

  switch (ch) {
    case TRAPDOOR:
      g.level++;
      if (_new_level) await _new_level();
      await _msg('You fell into a trap!');
      break;
    case BEARTRAP:
      g.no_move += BEARTIME;
      await _msg('You are caught in a bear trap');
      break;
    case SLEEPTRAP:
      g.no_command += SLEEPTIME;
      await _msg('A strange white mist envelops you and you fall asleep');
      break;
    case ARROWTRAP:
      if (_swing && _swing(g.player.t_stats.s_lvl - 1, g.player.t_stats.s_arm, 1)) {
        await _msg('Oh no! An arrow shot you');
        if ((g.player.t_stats.s_hpt -= roll(1, 6)) <= 0) {
          await _msg('The arrow killed you.');
          if (_death) await _death('a');
        }
      } else {
        await _msg('An arrow shoots past you.');
        const item = _new_item(mk_obj_data());
        const arrow = item.l_data;
        arrow.o_type = WEAPON;
        arrow.o_which = ARROW;
        if (_init_weapon) _init_weapon(arrow, ARROW);
        arrow.o_count = 1;
        arrow.o_pos = { x: g.player.t_pos.x, y: g.player.t_pos.y };
        arrow.o_hplus = 0;
        arrow.o_dplus = 0;
        if (_fall) await _fall(item, false);
      }
      break;
    case TELTRAP:
      if (_teleport) _teleport();
      break;
    case DARTTRAP:
      if (_swing && _swing(g.player.t_stats.s_lvl + 1, g.player.t_stats.s_arm, 1)) {
        await _msg('A small dart just hit you in the shoulder');
        if ((g.player.t_stats.s_hpt -= roll(1, 4)) <= 0) {
          await _msg('The dart killed you.');
          if (_death) await _death('d');
        }
        if (!(_ISWEARING && _ISWEARING(R_SUSTSTR))) {
          if (_chg_str) _chg_str(-1);
        }
      } else {
        await _msg('A small dart whizzes by your ear and vanishes.');
      }
      break;
  }
  return ch;
}

/**
 * trap_at(y, x): find the trap at (y, x).
 */
export function trap_at(y, x) {
  const g = game();
  for (let i = 0; i < g.ntraps; i++) {
    if (g.traps[i].tr_pos.y === y && g.traps[i].tr_pos.x === x) return g.traps[i];
  }
  return g.traps[0]; // fallback
}

/**
 * rndmove(who): move in a random direction.
 */
export function rndmove(who) {
  const g = game();
  let ret = { x: who.t_pos.x, y: who.t_pos.y };
  let nopen = 0;
  const dest = { x: 0, y: 0 };

  for (let y = who.t_pos.y - 1; y <= who.t_pos.y + 1; y++) {
    if (y < 0 || y >= LINES) continue;
    for (let x = who.t_pos.x - 1; x <= who.t_pos.x + 1; x++) {
      if (x < 0 || x >= COLS) continue;
      const ch = winat(y, x);
      if (_step_ok(ch)) {
        dest.y = y;
        dest.x = x;
        if (!diag_ok(who.t_pos, dest)) continue;
        if (ch === SCROLL) {
          let scared = false;
          for (let item = g.lvl_obj; item !== null; item = item.l_next) {
            const obj = item.l_data;
            if (obj.o_pos.y === y && obj.o_pos.x === x &&
                obj.o_which === 9 /* S_SCARE */) {
              scared = true;
              break;
            }
          }
          if (scared) continue;
        }
        if (rnd(++nopen) === 0) {
          ret = { x: dest.x, y: dest.y };
        }
      }
    }
  }
  return ret;
}

/**
 * diag_ok(sp, ep): is diagonal move legal?
 */
export function diag_ok(sp, ep) {
  if (ep.x === sp.x || ep.y === sp.y) return true;
  return (step_ok_ch(mvinch(ep.y, sp.x)) && step_ok_ch(mvinch(sp.y, ep.x)));
}

function step_ok_ch(ch) {
  if (_step_ok) return _step_ok(ch);
  return ch !== ' ' && ch !== '|' && ch !== '-';
}

function mk_obj_data() {
  return {
    o_type: ' ', o_pos: { x: 0, y: 0 }, o_count: 1, o_which: 0,
    o_hplus: 0, o_dplus: 0, o_flags: 0, o_group: 0,
    o_damage: '0d0', o_hurldmg: '0d0', o_ac: 11, o_launch: 100,
  };
}
