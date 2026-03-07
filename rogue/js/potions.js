/**
 * potions.js — Potion effects for Rogue 3.6 JS port.
 * Ported from potions.c.
 */

import { game } from './gstate.js';
import { roll, rnd } from './rng.js';
import {
  P_CONFUSE, P_POISON, P_HEALING, P_STRENGTH, P_MFIND, P_TFIND,
  P_PARALYZE, P_SEEINVIS, P_RAISE, P_XHEAL, P_HASTE, P_RESTORE,
  P_BLIND, P_NOP,
  POTION, STICK, RING, SCROLL, AMULET,
  AFTER, ISHUH, ISBLIND, CANSEE,
  R_SUSTSTR, HOLDTIME, HUHDURATION, SEEDURATION,
} from './const.js';

// Injected deps
let _msg = null;
let _get_item = null;
let _chg_str = null;
let _fuse = null;
let _lengthen = null;
let _unconfuse = null;
let _sight = null;
let _unsee = null;
let _light = null;
let _add_haste = null;
let _raise_level = null;
let _look = null;
let _status = null;
let _inv_name = null;
let _ISWEARING = null;
let _detach = null;
let _discard = null;
let _readchar = null;

export function _setPotionsDeps(deps) {
  _msg = deps.msg;
  _get_item = deps.get_item;
  _chg_str = deps.chg_str;
  _fuse = deps.fuse;
  _lengthen = deps.lengthen;
  _unconfuse = deps.unconfuse;
  _sight = deps.sight;
  _unsee = deps.unsee;
  _light = deps.light;
  _add_haste = deps.add_haste;
  _raise_level = deps.raise_level;
  _look = deps.look;
  _status = deps.status;
  _inv_name = deps.inv_name;
  _ISWEARING = deps.ISWEARING;
  _detach = deps.detach;
  _discard = deps.discard;
  _readchar = deps.readchar;
}

/**
 * quaff(): drink a potion from inventory.
 */
export async function quaff() {
  const g = game();
  const item = await _get_item('quaff', POTION);
  if (item === null) return;
  const obj = item.l_data;
  if (obj.o_type !== POTION) {
    if (!g.terse) await _msg("Yuk! Why would you want to drink that?");
    else await _msg("That's undrinkable");
    return;
  }
  if (obj === g.cur_weapon) g.cur_weapon = null;

  const ps = g.player.t_stats;

  switch (obj.o_which) {
    case P_CONFUSE:
      if (!(g.player.t_flags & ISHUH)) {
        await _msg("Wait, what's going on here. Huh? What? Who?");
        if (g.player.t_flags & ISHUH)
          _lengthen(_unconfuse, rnd(8) + HUHDURATION);
        else
          _fuse(_unconfuse, 0, rnd(8) + HUHDURATION, AFTER);
        g.player.t_flags |= ISHUH;
      }
      g.p_know[P_CONFUSE] = true;
      break;

    case P_POISON:
      if (!_ISWEARING(R_SUSTSTR)) {
        _chg_str(-(rnd(3) + 1));
        await _msg('You feel very sick now.');
      } else {
        await _msg('You feel momentarily sick');
      }
      g.p_know[P_POISON] = true;
      break;

    case P_HEALING:
      if ((ps.s_hpt += roll(ps.s_lvl, 4)) > g.max_hp)
        ps.s_hpt = ++g.max_hp;
      await _msg('You begin to feel better.');
      _sight();
      g.p_know[P_HEALING] = true;
      break;

    case P_STRENGTH:
      await _msg('You feel stronger, now.  What bulging muscles!');
      _chg_str(1);
      g.p_know[P_STRENGTH] = true;
      break;

    case P_MFIND:
      if (g.mlist !== null) {
        await _msg('You begin to sense the presence of monsters.');
        g.p_know[P_MFIND] = true;
      } else {
        await _msg('You have a strange feeling for a moment, then it passes.');
      }
      break;

    case P_TFIND: {
      let show = false;
      for (let mobj = g.lvl_obj; mobj !== null; mobj = mobj.l_next) {
        if (is_magic(mobj.l_data)) { show = true; g.p_know[P_TFIND] = true; }
      }
      for (let titem = g.mlist; titem !== null; titem = titem.l_next) {
        const th = titem.l_data;
        for (let pitem = th.t_pack; pitem !== null; pitem = pitem.l_next) {
          if (is_magic(pitem.l_data)) { show = true; g.p_know[P_TFIND] = true; }
        }
      }
      if (show) {
        await _msg('You sense the presence of magic on this level.');
      } else {
        await _msg('You have a strange feeling for a moment, then it passes.');
      }
      break;
    }

    case P_PARALYZE:
      await _msg("You can't move.");
      g.no_command = HOLDTIME;
      g.p_know[P_PARALYZE] = true;
      break;

    case P_SEEINVIS:
      await _msg(`This potion tastes like ${g.fruit} juice.`);
      if (!(g.player.t_flags & CANSEE)) {
        g.player.t_flags |= CANSEE;
        _fuse(_unsee, 0, SEEDURATION, AFTER);
        _light(g.player.t_pos);
      }
      _sight();
      break;

    case P_RAISE:
      await _msg('You suddenly feel much more skillful');
      g.p_know[P_RAISE] = true;
      await _raise_level();
      break;

    case P_XHEAL:
      if ((ps.s_hpt += roll(ps.s_lvl, 8)) > g.max_hp)
        ps.s_hpt = ++g.max_hp;
      await _msg('You begin to feel much better.');
      g.p_know[P_XHEAL] = true;
      _sight();
      break;

    case P_HASTE:
      await _add_haste(true);
      await _msg('You feel yourself moving much faster.');
      g.p_know[P_HASTE] = true;
      break;

    case P_RESTORE: {
      await _msg('Hey, this tastes great.  It make you feel warm all over.');
      const ms = g.max_stats.s_str;
      const cs = ps.s_str;
      if (cs.st_str < ms.st_str || (cs.st_str === 18 && cs.st_add < ms.st_add))
        ps.s_str = { st_str: ms.st_str, st_add: ms.st_add };
      break;
    }

    case P_BLIND:
      await _msg('A cloak of darkness falls around you.');
      if (!(g.player.t_flags & ISBLIND)) {
        g.player.t_flags |= ISBLIND;
        _fuse(_sight, 0, SEEDURATION, AFTER);
        await _look(false);
      }
      g.p_know[P_BLIND] = true;
      break;

    case P_NOP:
      await _msg('This potion tastes extremely dull.');
      break;

    default:
      await _msg('What an odd tasting potion!');
      return;
  }

  _status();

  if (g.p_know[obj.o_which] && g.p_guess[obj.o_which]) {
    g.p_guess[obj.o_which] = null;
  } else if (!g.p_know[obj.o_which] && g.askme && g.p_guess[obj.o_which] === null) {
    await _msg(g.terse ? 'Call it: ' : 'What do you want to call it? ');
    const buf = await get_str(_readchar);
    if (buf !== null) g.p_guess[obj.o_which] = buf;
  }

  // Consume the item
  g.inpack--;
  if (obj.o_count > 1) {
    obj.o_count--;
  } else {
    _detach(item);
    _discard(item);
  }
}

function is_magic(obj) {
  switch (obj.o_type) {
    case POTION: case SCROLL: case STICK: case RING: case AMULET: return true;
    default: return false;
  }
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
