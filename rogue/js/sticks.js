/**
 * sticks.js — Stick/wand/staff functions for Rogue 3.6 JS port.
 * Ported from sticks.c.
 */

import { game } from './gstate.js';
import { rnd, roll } from './rng.js';
import { mvwaddch, mvwinch, winat } from './curses.js';
import {
  WS_LIGHT, WS_HIT, WS_DRAIN, WS_POLYMORPH, WS_TELAWAY, WS_TELTO,
  WS_CANCEL, WS_MISSILE, WS_HASTE_M, WS_SLOW_M, WS_ELECT, WS_FIRE, WS_COLD,
  STICK, PLAYER, FLOOR, BOLT_LENGTH,
  ISRUN, ISHELD, ISHASTE, ISSLOW, ISCANC, ISINVIS,
} from './const.js';

// Injected deps
let _msg = null;
let _addmsg = null;
let _endmsg = null;
let _get_item = null;
let _step_ok = null;
let _find_mons = null;
let _new_monster = null;
let _rnd_room = null;
let _rnd_pos = null;
let _do_motion = null;
let _hit_monster = null;
let _save_throw = null;
let _save = null;
let _runto = null;
let _fight = null;
let _light = null;
let _roomin = null;
let _cansee = null;
let _killed = null;

export function _setSticksDeps(deps) {
  _msg = deps.msg;
  _addmsg = deps.addmsg;
  _endmsg = deps.endmsg;
  _get_item = deps.get_item;
  _step_ok = deps.step_ok;
  _find_mons = deps.find_mons;
  _new_monster = deps.new_monster;
  _rnd_room = deps.rnd_room;
  _rnd_pos = deps.rnd_pos;
  _do_motion = deps.do_motion;
  _hit_monster = deps.hit_monster;
  _save_throw = deps.save_throw;
  _save = deps.save;
  _runto = deps.runto;
  _fight = deps.fight;
  _light = deps.light;
  _roomin = deps.roomin;
  _cansee = deps.cansee;
  _killed = deps.killed;
}

/**
 * fix_stick(cur): initialize charges and damage for a wand/staff.
 */
export function fix_stick(cur) {
  const g = game();
  const wsType = g.ws_type ? g.ws_type[cur.o_which] : '';
  if (wsType === 'staff') {
    cur.o_damage = '2d3';
  } else {
    cur.o_damage = '1d1';
  }
  cur.o_hurldmg = '1d1';
  cur.o_charges = rnd(5) + 3;
  if (cur.o_which === WS_HIT) {
    cur.o_hplus = 3;
    cur.o_dplus = 3;
    cur.o_damage = '1d8';
  } else if (cur.o_which === WS_LIGHT) {
    cur.o_charges = rnd(10) + 10;
  }
}

/**
 * do_zap(gotdir): zap a wand/staff.
 */
export async function do_zap(gotdir) {
  const g = game();
  const item = await _get_item('zap with', STICK);
  if (item === null) return;
  const obj = item.l_data;
  if (obj.o_type !== STICK) {
    await _msg("You can't zap with that!");
    g.after = false;
    return;
  }
  if (obj.o_charges === 0) {
    await _msg('Nothing happens.');
    return;
  }
  if (!gotdir) {
    do {
      g.delta.y = rnd(3) - 1;
      g.delta.x = rnd(3) - 1;
    } while (g.delta.y === 0 && g.delta.x === 0);
  }

  switch (obj.o_which) {
    case WS_LIGHT: {
      g.ws_know[WS_LIGHT] = true;
      const rp = _roomin(g.player.t_pos);
      if (rp === null) {
        await _msg('The corridor glows and then fades');
      } else {
        _addmsg('The room is lit');
        if (!g.terse) _addmsg(' by a shimmering blue light.');
        _endmsg();
        rp.r_flags &= ~0o000001; // ISDARK
        _light(g.player.t_pos);
        mvwaddch(g.cw, g.player.t_pos.y, g.player.t_pos.x, PLAYER);
      }
      break;
    }

    case WS_DRAIN: {
      if (g.player.t_stats.s_hpt < 2) {
        await _msg('You are too weak to use it.');
        return;
      }
      const rp = _roomin(g.player.t_pos);
      if (rp === null) {
        drain(g.player.t_pos.y - 1, g.player.t_pos.y + 1,
              g.player.t_pos.x - 1, g.player.t_pos.x + 1);
      } else {
        drain(rp.r_pos.y, rp.r_pos.y + rp.r_max.y,
              rp.r_pos.x, rp.r_pos.x + rp.r_max.x);
      }
      break;
    }

    case WS_POLYMORPH:
    case WS_TELAWAY:
    case WS_TELTO:
    case WS_CANCEL: {
      let y = g.player.t_pos.y;
      let x = g.player.t_pos.x;
      while (_step_ok(winat(y, x))) {
        y += g.delta.y;
        x += g.delta.x;
      }
      const monster = mvwinch(g.mw, y, x);
      if (monster >= 'A' && monster <= 'Z') {
        const omonst = monster;
        if (monster === 'F') g.player.t_flags &= ~0o000400; // ISHELD
        const mitem = _find_mons(y, x);
        const tp = mitem.l_data;
        if (obj.o_which === WS_POLYMORPH) {
          // Remove from list and re-create as random monster
          const listp = { val: g.mlist };
          // detach tp from mlist
          detach_mlist(g, mitem);
          const oldch = tp.t_oldch;
          const newpos = { y, x };
          const newmonst = String.fromCharCode(rnd(26) + 'A'.charCodeAt(0));
          _new_monster(mitem, newmonst, newpos);
          if (!(tp.t_flags & ISRUN)) _runto(newpos, g.player.t_pos);
          if (mvwinch(g.cw, y, x) >= 'A' && mvwinch(g.cw, y, x) <= 'Z')
            mvwaddch(g.cw, y, x, newmonst);
          tp.t_oldch = oldch;
          g.ws_know[WS_POLYMORPH] = g.ws_know[WS_POLYMORPH] || (newmonst !== omonst);
        } else if (obj.o_which === WS_CANCEL) {
          tp.t_flags |= ISCANC;
          tp.t_flags &= ~ISINVIS;
        } else if (obj.o_which === WS_TELAWAY) {
          let rm;
          do {
            rm = _rnd_room();
            _rnd_pos(g.rooms[rm], tp.t_pos);
          } while (winat(tp.t_pos.y, tp.t_pos.x) !== FLOOR);
          mvwaddch(g.cw, y, x, tp.t_oldch);
          tp.t_dest = g.player.t_pos;
          tp.t_flags |= ISRUN;
          mvwaddch(g.mw, y, x, ' ');
          mvwaddch(g.mw, tp.t_pos.y, tp.t_pos.x, monster);
          if (tp.t_pos.y !== y || tp.t_pos.x !== x)
            tp.t_oldch = mvwinch(g.cw, tp.t_pos.y, tp.t_pos.x);
        } else {
          // WS_TELTO
          tp.t_pos.y = g.player.t_pos.y + g.delta.y;
          tp.t_pos.x = g.player.t_pos.x + g.delta.x;
          mvwaddch(g.cw, y, x, tp.t_oldch);
          tp.t_dest = g.player.t_pos;
          tp.t_flags |= ISRUN;
          mvwaddch(g.mw, y, x, ' ');
          mvwaddch(g.mw, tp.t_pos.y, tp.t_pos.x, monster);
          if (tp.t_pos.y !== y || tp.t_pos.x !== x)
            tp.t_oldch = mvwinch(g.cw, tp.t_pos.y, tp.t_pos.x);
        }
      }
      break;
    }

    case WS_MISSILE: {
      const bolt = { o_pos: { y: 0, x: 0 }, o_damage: '1d4', o_hplus: 0, o_dplus: 0 };
      await _do_motion(bolt, g.delta.y, g.delta.x);
      const bmon = mvwinch(g.mw, bolt.o_pos.y, bolt.o_pos.x);
      if (bmon >= 'A' && bmon <= 'Z') {
        const bitem = _find_mons(bolt.o_pos.y, bolt.o_pos.x);
        if (!_save_throw(3 /* VS_MAGIC */, bitem.l_data)) {
          await _hit_monster(bolt.o_pos.y, bolt.o_pos.x, bolt);
        } else if (bmon !== 'M' || mvwinch(g.cw, bolt.o_pos.y, bolt.o_pos.x) === 'M') {
          if (g.terse) await _msg('Missle vanishes');
          else await _msg('The missle vanishes with a puff of smoke');
        }
      } else {
        if (g.terse) await _msg('Missle vanishes');
        else await _msg('The missle vanishes with a puff of smoke');
      }
      g.ws_know[WS_MISSILE] = true;
      break;
    }

    case WS_HIT: {
      const ty = g.player.t_pos.y + g.delta.y;
      const tx = g.player.t_pos.x + g.delta.x;
      const ch = winat(ty, tx);
      if (ch >= 'A' && ch <= 'Z') {
        if (rnd(20) === 0) {
          obj.o_damage = '3d8';
          obj.o_dplus = 9;
        } else {
          obj.o_damage = '1d8';
          obj.o_dplus = 3;
        }
        await _fight({ y: ty, x: tx }, ch, obj, false);
      }
      break;
    }

    case WS_HASTE_M:
    case WS_SLOW_M: {
      let y = g.player.t_pos.y;
      let x = g.player.t_pos.x;
      while (_step_ok(winat(y, x))) {
        y += g.delta.y;
        x += g.delta.x;
      }
      const mch = mvwinch(g.mw, y, x);
      if (mch >= 'A' && mch <= 'Z') {
        const mitem = _find_mons(y, x);
        const tp = mitem.l_data;
        if (obj.o_which === WS_HASTE_M) {
          if (tp.t_flags & ISSLOW) tp.t_flags &= ~ISSLOW;
          else tp.t_flags |= ISHASTE;
        } else {
          if (tp.t_flags & ISHASTE) tp.t_flags &= ~ISHASTE;
          else tp.t_flags |= ISSLOW;
          tp.t_turn = true;
        }
        const dest = { y, x };
        _runto(dest, g.player.t_pos);
      }
      break;
    }

    case WS_ELECT:
    case WS_FIRE:
    case WS_COLD: {
      let dirch;
      const sum = g.delta.y + g.delta.x;
      if (sum === 0) dirch = '/';
      else if (sum === 1 || sum === -1) dirch = (g.delta.y === 0 ? '-' : '|');
      else dirch = '\\';

      const name = obj.o_which === WS_ELECT ? 'bolt' :
                   obj.o_which === WS_FIRE ? 'flame' : 'ice';
      const pos = { y: g.player.t_pos.y, x: g.player.t_pos.x };
      const spotpos = [];
      let bounced = false;
      let used = false;

      for (let i = 0; i < BOLT_LENGTH && !used; i++) {
        const ch = winat(pos.y, pos.x);
        spotpos[i] = { y: pos.y, x: pos.x };
        switch (ch) {
          case '+': case '&': case '|': case '-': case ' ':
            bounced = true;
            g.delta.y = -g.delta.y;
            g.delta.x = -g.delta.x;
            i--;
            await _msg('The bolt bounces');
            break;
          default:
            if (!bounced && ch >= 'A' && ch <= 'Z') {
              const bitem = _find_mons(pos.y, pos.x);
              if (!_save_throw(3 /* VS_MAGIC */, bitem.l_data)) {
                const bolt = { o_pos: { y: pos.y, x: pos.x }, o_damage: '6d6', o_hplus: 0, o_dplus: 0 };
                await _hit_monster(pos.y, pos.x, bolt);
                used = true;
              } else if (ch !== 'M' || mvwinch(g.cw, pos.y, pos.x) === 'M') {
                if (g.terse) await _msg(`${name} misses`);
                else await _msg(`The ${name} whizzes past the ${g.monsters[ch.charCodeAt(0) - 65].m_name}`);
                const dest = { y: pos.y, x: pos.x };
                _runto(dest, g.player.t_pos);
              }
            } else if (bounced && pos.y === g.player.t_pos.y && pos.x === g.player.t_pos.x) {
              bounced = false;
              if (!_save(3 /* VS_MAGIC */)) {
                if (g.terse) await _msg(`The ${name} hits`);
                else await _msg(`You are hit by the ${name}`);
                g.player.t_stats.s_hpt -= roll(6, 6);
                if (g.player.t_stats.s_hpt <= 0) g.playing = false;
                used = true;
              } else {
                await _msg(`The ${name} whizzes by you`);
              }
            }
            mvwaddch(g.cw, pos.y, pos.x, dirch);
        }
        pos.y += g.delta.y;
        pos.x += g.delta.x;
      }
      // Restore cells
      for (let j = 0; j < spotpos.length; j++) {
        const sp = spotpos[j];
        const under = g.stdscr[sp.y][sp.x];
        mvwaddch(g.cw, sp.y, sp.x,
          (g.mw[sp.y][sp.x] >= 'A' && g.mw[sp.y][sp.x] <= 'Z') ? g.mw[sp.y][sp.x] : under);
      }
      g.ws_know[obj.o_which] = true;
      break;
    }

    default:
      await _msg('What a bizarre schtick!');
  }

  obj.o_charges--;
}

/**
 * drain(ymin, ymax, xmin, xmax): drain HP from player, split among monsters in area.
 */
function drain(ymin, ymax, xmin, xmax) {
  const g = game();
  let count = 0;
  for (let i = ymin; i <= ymax; i++)
    for (let j = xmin; j <= xmax; j++)
      if (g.mw[i] && g.mw[i][j] >= 'A' && g.mw[i][j] <= 'Z') count++;
  if (count === 0) {
    _msg('You have a tingling feeling');
    return;
  }
  const share = Math.floor(g.player.t_stats.s_hpt / count);
  g.player.t_stats.s_hpt = Math.floor(g.player.t_stats.s_hpt / 2);
  for (let i = ymin; i <= ymax; i++) {
    for (let j = xmin; j <= xmax; j++) {
      if (g.mw[i] && g.mw[i][j] >= 'A' && g.mw[i][j] <= 'Z') {
        const mitem = _find_mons(i, j);
        if (mitem !== null) {
          const ick = mitem.l_data;
          ick.t_stats.s_hpt -= share;
          if (ick.t_stats.s_hpt < 1)
            _killed(mitem, _cansee(i, j) && !(ick.t_flags & ISINVIS));
        }
      }
    }
  }
}

/**
 * detach_mlist(g, item): remove item from g.mlist linked list.
 */
function detach_mlist(g, item) {
  if (item.l_prev) item.l_prev.l_next = item.l_next;
  else g.mlist = item.l_next;
  if (item.l_next) item.l_next.l_prev = item.l_prev;
  item.l_prev = item.l_next = null;
}
