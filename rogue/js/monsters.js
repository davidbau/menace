/**
 * monsters.js — Monster creation and AI for Rogue 3.6 JS port.
 * Ported from monsters.c and chase.c.
 */

import { game } from './gstate.js';
import { rnd, roll } from './rng.js';
import {
  mvwaddch, mvwinch, winat, waddch, draw,
  _stdscrState, _cwState,
} from './curses.js';
import {
  GOLD, POTION, SCROLL, STAIRS, WEAPON, ARMOR, RING, STICK, AMULET,
  FLOOR, PASSAGE, DOOR, SECRETDOOR, PLAYER,
  ISMEAN, ISGREED, ISRUN, ISINVIS, ISBLIND, CANSEE, ISHELD, ISHUH,
  ISFOUND, ISBLOCK, ISREGEN,
  VS_MAGIC,
  R_AGGR, R_STEALTH, R_SEARCH, R_TELEPORT,
  LINES, COLS, MAXROOMS,
} from './const.js';
import { new_item, _attach, ll_next } from './list.js';
import { roomin, rnd_room, rnd_pos, inroom } from './rooms.js';
import { addmsg } from './io.js';

// Injected dependencies
let _msg = null;
let _runto = null;
let _save = null;
let _unconfuse = null;
let _fuse = null;
let _lengthen = null;
let _attack = null;
let _ISWEARING = null;
let _step_ok = null;
let _cansee = null;

export function _setMonsterDeps(deps) {
  _msg = deps.msg;
  _runto = deps.runto;
  _save = deps.save;
  _unconfuse = deps.unconfuse;
  _fuse = deps.fuse;
  _lengthen = deps.lengthen;
  _attack = deps.attack;
  _ISWEARING = deps.ISWEARING;
  _step_ok = deps.step_ok;
  _cansee = deps.cansee;
}

/**
 * randmonster(wander): pick a monster appropriate to the level.
 */
export function randmonster(wander) {
  const g = game();
  const mons = wander ? g.wand_mons : g.lvl_mons;
  let d;
  do {
    d = g.level + (rnd(10) - 5);
    if (d < 1) d = rnd(5) + 1;
    if (d > 26) d = rnd(5) + 22;
  } while (mons[d - 1] === ' ');
  return mons[d - 1];
}

/**
 * new_monster(item, type, cp): pick a new monster and add it to mlist.
 */
export function new_monster(item, type, cp) {
  const g = game();

  // attach to mlist
  const listp = { val: g.mlist };
  _attach(listp, item);
  g.mlist = listp.val;

  const tp = item.l_data;
  tp.t_type = type;
  tp.t_pos = { x: cp.x, y: cp.y };
  tp.t_oldch = mvwinch(g.cw, cp.y, cp.x);
  mvwaddch(g.mw, cp.y, cp.x, type);

  const mp = g.monsters[type.charCodeAt(0) - 65];
  if (!tp.t_stats) tp.t_stats = {};
  tp.t_stats.s_hpt = roll(mp.m_stats.s_lvl, 8);
  tp.t_stats.s_lvl = mp.m_stats.s_lvl;
  tp.t_stats.s_arm = mp.m_stats.s_arm;
  tp.t_stats.s_dmg = mp.m_stats.s_dmg;
  tp.t_stats.s_exp = mp.m_stats.s_exp;
  tp.t_stats.s_str = { st_str: 10, st_add: 0 };
  tp.t_flags = mp.m_flags;
  tp.t_turn = true;
  tp.t_pack = null;

  if (_ISWEARING && _ISWEARING(R_AGGR)) {
    if (_runto) _runto(cp, g.player.t_pos);
  }

  if (type === 'M') {
    let mch;
    if (tp.t_pack !== null) {
      mch = tp.t_pack.l_data.o_type;
    } else {
      const max_items = g.level > 25 ? 9 : 8;
      switch (rnd(max_items)) {
        case 0: mch = GOLD; break;
        case 1: mch = POTION; break;
        case 2: mch = SCROLL; break;
        case 3: mch = STAIRS; break;
        case 4: mch = WEAPON; break;
        case 5: mch = ARMOR; break;
        case 6: mch = RING; break;
        case 7: mch = STICK; break;
        case 8: mch = AMULET; break;
        default: mch = GOLD;
      }
    }
    tp.t_disguise = mch;
  }
}

/**
 * wanderer(): a wandering monster starts up.
 */
export async function wanderer() {
  const g = game();
  const item = new_item(mk_thing_data());
  const hr = roomin(g.player.t_pos);
  let cp = { x: 0, y: 0 };
  let rp, ch;
  do {
    const i = rnd_room();
    rp = g.rooms[i];
    if (rp === hr) continue;
    rnd_pos(rp, cp);
    ch = g.stdscr[cp.y] ? g.stdscr[cp.y][cp.x] : ' ';
  } while (rp === hr || !_step_ok(ch));

  new_monster(item, randmonster(true), cp);
  const tp = item.l_data;
  tp.t_flags |= ISRUN;
  tp.t_pos = { x: cp.x, y: cp.y };
  tp.t_dest = g.player.t_pos;

  if (g.wizard) {
    await _msg(`Started a wandering ${g.monsters[tp.t_type.charCodeAt(0) - 65].m_name}`);
  }
}

/**
 * wake_monster(y, x): called when hero sees monster.
 */
export async function wake_monster(y, x) {
  const g = game();
  const it = find_mons(y, x);
  if (!it) { await _msg("Can't find monster in show"); return it; }
  const tp = it.l_data;
  const ch = tp.t_type;

  if (rnd(100) > 33 && (tp.t_flags & ISMEAN) && !(tp.t_flags & ISHELD) &&
      !(_ISWEARING && _ISWEARING(R_STEALTH))) {
    tp.t_dest = g.player.t_pos;
    tp.t_flags |= ISRUN;
  }

  if (ch === 'U' && !(g.player.t_flags & ISBLIND)) {
    const rp = roomin(g.player.t_pos);
    if ((rp !== null && !(rp.r_flags & 0o001)) ||  // ISDARK
        DISTANCE(y, x, g.player.t_pos.y, g.player.t_pos.x) < 3) {
      if (!(tp.t_flags & ISFOUND) && !(_save && _save(VS_MAGIC))) {
        await _msg("The umber hulk's gaze has confused you.");
        if (g.player.t_flags & ISHUH) {
          if (_lengthen) _lengthen(_unconfuse, rnd(20) + 20);
        } else {
          if (_fuse) _fuse(_unconfuse, 0, rnd(20) + 20, 2); // AFTER=2
        }
        g.player.t_flags |= ISHUH;
      }
      tp.t_flags |= ISFOUND;
    }
  }

  // Hide invisible monsters
  if ((tp.t_flags & ISINVIS) && !(g.player.t_flags & CANSEE)) {
    // return it but show underlying char
  }

  // Greedy monsters guard gold
  if ((tp.t_flags & ISGREED) && !(tp.t_flags & ISRUN)) {
    const rp = roomin(tp.t_pos);
    if (rp !== null && rp.r_goldval) {
      tp.t_dest = rp.r_gold;
      tp.t_flags |= ISRUN;
    }
  }

  return it;
}

/**
 * find_mons(y, x): find monster at coordinates.
 */
export function find_mons(y, x) {
  const g = game();
  for (let item = g.mlist; item !== null; item = item.l_next) {
    const th = item.l_data;
    if (th.t_pos.y === y && th.t_pos.x === x) return item;
  }
  return null;
}

/**
 * removeM(mp, item): remove a monster from screen and list.
 */
export function removeM(mp, item) {
  const g = game();
  mvwaddch(g.mw, mp.y, mp.x, ' ');
  mvwaddch(g.cw, mp.y, mp.x, item.l_data.t_oldch);
  const listp = { val: g.mlist };
  _detach_from(listp, item);
  g.mlist = listp.val;
}

function _detach_from(listp, item) {
  if (item.l_prev) item.l_prev.l_next = item.l_next;
  else listp.val = item.l_next;
  if (item.l_next) item.l_next.l_prev = item.l_prev;
  item.l_next = item.l_prev = null;
}

/**
 * DISTANCE(y1, x1, y2, x2): squared distance
 */
export function DISTANCE(y1, x1, y2, x2) {
  return (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
}

/**
 * cansee(y, x): can the hero see that coordinate?
 */
export function cansee(y, x) {
  const g = game();
  if (g.player.t_flags & ISBLIND) return false;
  const tp = { x, y };
  const rer = roomin(tp);
  return (rer !== null && rer === roomin(g.player.t_pos) && !(rer.r_flags & 0o001)) ||
         DISTANCE(y, x, g.player.t_pos.y, g.player.t_pos.x) < 3;
}

/**
 * genocide(): remove all monsters of a given type.
 */
export async function genocide() {
  const g = game();
  let c;
  addmsg_helper("Which monster");
  if (!g.terse) addmsg_helper(" do you wish to wipe out");
  await _msg("? ");

  while (true) {
    c = await g.input.getKey();
    if (c === '\x1b') return;
    if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')) break;
    g.mpos = 0;
    await _msg("Please specifiy a letter between 'A' and 'Z'");
  }

  if (c >= 'a' && c <= 'z') c = c.toUpperCase();

  // Remove all monsters of this type from mlist
  let ip = g.mlist;
  while (ip !== null) {
    const next = ip.l_next;
    const mp = ip.l_data;
    if (mp.t_type === c) {
      removeM(mp.t_pos, ip);
    }
    ip = next;
  }

  // Remove from monster lists
  for (let i = 0; i < 26; i++) {
    if (g.lvl_mons[i] === c) {
      g.lvl_mons[i] = ' ';
      g.wand_mons[i] = ' ';
      break;
    }
  }
}

function addmsg_helper(s) {
  addmsg('%s', s);
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
