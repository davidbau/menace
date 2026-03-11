/**
 * fight.js — Combat system for Rogue 3.6 JS port.
 * Ported from fight.c.
 */

import { game } from './gstate.js';
import { rnd, roll } from './rng.js';
import { mvwaddch, mvwinch, mvaddch } from './curses.js';
import {
  ISBLIND, CANHUH, ISHELD, ISCURSED, ISCANC, ISREGEN,
  LEFT, RIGHT,
  VS_MAGIC, VS_POISON,
  STICK, ARMOR, WEAPON, POTION, SCROLL, RING, AMULET,
  R_PROTECT, R_ADDDAM, R_ADDHIT, R_SUSTSTR, R_REGEN,
  WS_HIT, ISKNOW, ISMISL, ISMANY,
  GOLD, ISDARK, FLOOR,
} from './const.js';
import { find_mons, removeM } from './monsters.js';
import { roomin } from './rooms.js';

// e_levels: experience needed for each level
const e_levels = [
  10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120,
  10240, 20480, 40920, 81920, 163840, 327680, 655360,
  1310720, 2621440, 0,
];

// Injected deps
let _msg = null;
let _addmsg = null;
let _endmsg = null;
let _status = null;
let _runto = null;
let _save = null;
let _ISWEARING = null;
let _ISRING = null;
let _chg_str = null;
let _death = null;
let _check_level = null;
let _fall = null;
let _light = null;
let _fallpos = null;
let _new_item = null;
let _inv_name = null;
let _discard = null;
let _detach = null;
let _init_weapon = null;

export function _setFightDeps(deps) {
  _msg = deps.msg;
  _addmsg = deps.addmsg;
  _endmsg = deps.endmsg;
  _status = deps.status;
  _runto = deps.runto;
  _save = deps.save;
  _ISWEARING = deps.ISWEARING;
  _ISRING = deps.ISRING;
  _chg_str = deps.chg_str;
  _death = deps.death;
  _check_level = deps.check_level;
  _fall = deps.fall;
  _light = deps.light;
  _fallpos = deps.fallpos;
  _new_item = deps.new_item;
  _inv_name = deps.inv_name;
  _discard = deps.discard;
  _detach = deps.detach;
  _init_weapon = deps.init_weapon;
}

/**
 * fight(mp, mn, weap, thrown): player attacks monster.
 */
export async function fight(mp, mn, weap, thrown) {
  const g = game();
  const item = find_mons(mp.y, mp.x);
  if (!item) return false;
  const tp = item.l_data;

  g.quiet = 0;
  if (_runto) _runto(mp, g.player.t_pos);

  let did_hit = true;
  if (tp.t_type === 'M' && tp.t_disguise !== 'M' && !(g.player.t_flags & ISBLIND)) {
    await _msg('Wait! That\'s a mimic!');
    tp.t_disguise = 'M';
    did_hit = thrown;
  }

  if (did_hit) {
    did_hit = false;
    const mname = (g.player.t_flags & ISBLIND) ? 'it' :
                  g.monsters[mn.charCodeAt(0) - 65].m_name;

    if (roll_em(g.player.t_stats, tp.t_stats, weap, thrown)) {
      did_hit = true;
      if (thrown) await thunk(weap, mname);
      else await hit(null, mname);

      if (g.player.t_flags & CANHUH) {
        await _msg('Your hands stop glowing red');
        await _msg(`The ${mname} appears confused.`);
        tp.t_flags |= 0x20; // ISHUH
        g.player.t_flags &= ~CANHUH;
      }
      if (tp.t_stats.s_hpt <= 0) await killed(item, true);
    } else {
      if (thrown) await bounce(weap, mname);
      else await miss_msg(null, mname);
    }
  }
  g.count = 0;
  return did_hit;
}

/**
 * attack(mp): the monster attacks the player.
 */
export async function attack(mp) {
  const g = game();
  g.running = false;
  g.quiet = 0;

  if (mp.t_type === 'M' && !(g.player.t_flags & ISBLIND)) {
    mp.t_disguise = 'M';
  }
  const mname = (g.player.t_flags & ISBLIND) ? 'it' :
                g.monsters[mp.t_type.charCodeAt(0) - 65].m_name;

  if (roll_em(mp.t_stats, g.player.t_stats, null, false)) {
    if (mp.t_type !== 'E') await hit(mname, null);
    if (g.player.t_stats.s_hpt <= 0) {
      if (_death) await _death(mp.t_type);
      return;
    }
    if (!(mp.t_flags & ISCANC)) {
      switch (mp.t_type) {
        case 'R':
          if (g.cur_armor !== null && g.cur_armor.o_ac < 9) {
            if (!g.terse) await _msg('Your armor appears to be weaker now. Oh my!');
            else await _msg('Your armor weakens');
            g.cur_armor.o_ac++;
          }
          break;
        case 'E':
          if (g.player.t_flags & ISBLIND) break;
          if (!g.no_command) {
            _addmsg('You are transfixed');
            if (!g.terse) _addmsg(' by the gaze of the floating eye.');
            await _endmsg();
          }
          g.no_command += rnd(2) + 2;
          break;
        case 'A':
          if (!_save(VS_POISON)) {
            if (!(_ISWEARING && _ISWEARING(R_SUSTSTR))) {
              if (_chg_str) _chg_str(-1);
              if (!g.terse) await _msg('You feel a sting in your arm and now feel weaker');
              else await _msg('A sting has weakened you');
            } else {
              if (!g.terse) await _msg('A sting momentarily weakens you');
              else await _msg('Sting has no effect');
            }
          }
          break;
        case 'W':
          if (rnd(100) < 15) {
            if (g.player.t_stats.s_exp === 0) {
              if (_death) await _death('W');
              return;
            }
            await _msg('You suddenly feel weaker.');
            if (--g.player.t_stats.s_lvl === 0) {
              g.player.t_stats.s_exp = 0;
              g.player.t_stats.s_lvl = 1;
            } else {
              g.player.t_stats.s_exp = e_levels[g.player.t_stats.s_lvl - 1] + 1;
            }
            const fewer = roll(1, 10);
            g.player.t_stats.s_hpt -= fewer;
            g.max_hp -= fewer;
            if (g.player.t_stats.s_hpt < 1) g.player.t_stats.s_hpt = 1;
            if (g.max_hp < 1) {
              if (_death) await _death('W');
              return;
            }
          }
          break;
        case 'F':
          g.player.t_flags |= ISHELD;
          {
            const fi = g.monsters['F'.charCodeAt(0) - 65];
            g.fung_hit++;
            fi.m_stats.s_dmg = `${g.fung_hit}d1`;
          }
          break;
        case 'L': {
          const lastpurse = g.purse;
          g.purse -= goldcalc(g);
          if (!_save(VS_MAGIC)) g.purse -= goldcalc(g) * 4;
          if (g.purse < 0) g.purse = 0;
          if (g.purse !== lastpurse) await _msg('Your purse feels lighter');
          const litem = find_mons(mp.t_pos.y, mp.t_pos.x);
          if (litem) removeM(mp.t_pos, litem);
          break;
        }
        case 'N': {
          let steal = null;
          let nobj = 0;
          for (let list = g.pack; list !== null; list = list.l_next) {
            const obj = list.l_data;
            if (obj !== g.cur_armor && obj !== g.cur_weapon && is_magic(obj)) {
              nobj++;
              if (rnd(nobj) === 0) steal = list;
            }
          }
          if (steal !== null) {
            const obj = steal.l_data;
            const nitem = find_mons(mp.t_pos.y, mp.t_pos.x);
            if (nitem) removeM(mp.t_pos, nitem);
            if (obj.o_count > 1 && obj.o_group === 0) {
              const oc = obj.o_count;
              obj.o_count = 1;
              await _msg(`She stole ${_inv_name ? _inv_name(obj, true) : 'something'}!`);
              obj.o_count = oc - 1;
            } else {
              await _msg(`She stole ${_inv_name ? _inv_name(obj, true) : 'something'}!`);
              if (_detach) _detach(g.pack, steal);
              if (_discard) _discard(steal);
            }
            g.inpack--;
          }
          break;
        }
      }
    }
  } else if (mp.t_type !== 'E') {
    if (mp.t_type === 'F') {
      g.player.t_stats.s_hpt -= g.fung_hit;
      if (g.player.t_stats.s_hpt <= 0) {
        if (_death) await _death(mp.t_type);
        return;
      }
    }
    await miss_msg(mname, null);
  }

  if ((mp.t_flags & ISREGEN) && rnd(100) < 33) {
    mp.t_stats.s_hpt++;
  }
  g.count = 0;
  if (_status) _status();
}

function goldcalc(g) {
  return rnd(50 + 10 * g.level) + 2;
}

/**
 * swing(at_lvl, op_arm, wplus): returns true if swing hits.
 */
export function swing(at_lvl, op_arm, wplus) {
  const res = rnd(20) + 1;
  const need = (21 - at_lvl) - op_arm;
  return (res + wplus >= need);
}

/**
 * check_level(): check if player went up a level.
 */
export async function check_level() {
  const g = game();
  let i;
  for (i = 0; e_levels[i] !== 0; i++) {
    if (e_levels[i] > g.player.t_stats.s_exp) break;
  }
  i++;
  if (i > g.player.t_stats.s_lvl) {
    const add = roll(i - g.player.t_stats.s_lvl, 10);
    g.max_hp += add;
    g.player.t_stats.s_hpt += add;
    if (g.player.t_stats.s_hpt > g.max_hp) g.player.t_stats.s_hpt = g.max_hp;
    await _msg(`Welcome to level ${i}`);
  }
  g.player.t_stats.s_lvl = i;
}

/**
 * roll_em(att, def, weap, hurl): roll several attacks.
 */
export function roll_em(att, def, weap, hurl) {
  const g = game();
  let cp;
  let did_hit = false;
  let prop_hplus = 0, prop_dplus = 0;

  if (weap === null) {
    cp = att.s_dmg;
  } else if (hurl) {
    if ((weap.o_flags & ISMISL) && g.cur_weapon !== null &&
        g.cur_weapon.o_which === weap.o_launch) {
      cp = weap.o_hurldmg;
      prop_hplus = g.cur_weapon.o_hplus;
      prop_dplus = g.cur_weapon.o_dplus;
    } else {
      cp = (weap.o_flags & ISMISL) ? weap.o_damage : weap.o_hurldmg;
    }
  } else {
    cp = weap.o_damage;
    if (weap.o_type === STICK && weap.o_which === WS_HIT && weap.o_charges === 0) {
      weap.o_damage = '0d0';
      weap.o_hplus = weap.o_dplus = 0;
    }
  }

  // Parse damage string like "2d4/1d3"
  const parts = cp.split('/');
  for (const part of parts) {
    const m = part.match(/^(\d+)d(\d+)$/);
    if (!m) continue;
    const ndice = parseInt(m[1]);
    const nsides = parseInt(m[2]);

    let hplus = prop_hplus + (weap === null ? 0 : weap.o_hplus);
    let dplus = prop_dplus + (weap === null ? 0 : weap.o_dplus);

    if (weap === g.cur_weapon) {
      if (_ISRING && _ISRING(LEFT, R_ADDDAM)) dplus += g.cur_ring[LEFT].o_ac;
      else if (_ISRING && _ISRING(LEFT, R_ADDHIT)) hplus += g.cur_ring[LEFT].o_ac;
      if (_ISRING && _ISRING(RIGHT, R_ADDDAM)) dplus += g.cur_ring[RIGHT].o_ac;
      else if (_ISRING && _ISRING(RIGHT, R_ADDHIT)) hplus += g.cur_ring[RIGHT].o_ac;
    }

    let def_arm;
    if (def === g.player.t_stats) {
      def_arm = g.cur_armor !== null ? g.cur_armor.o_ac : def.s_arm;
      if (_ISRING && _ISRING(LEFT, R_PROTECT)) def_arm -= g.cur_ring[LEFT].o_ac;
      else if (_ISRING && _ISRING(RIGHT, R_PROTECT)) def_arm -= g.cur_ring[RIGHT].o_ac;
    } else {
      def_arm = def.s_arm;
    }

    if (swing(att.s_lvl, def_arm, hplus + str_plus(att.s_str))) {
      const proll = roll(ndice, nsides);
      const damage = dplus + proll + add_dam(att.s_str);
      def.s_hpt -= Math.max(0, damage);
      did_hit = true;
    }
  }
  return did_hit;
}

/**
 * prname(who, upper): get print name of combatant.
 */
export function prname(who, upper) {
  const g = game();
  let tbuf;
  if (who === null || who === undefined) {
    tbuf = 'you';
  } else if (g.player.t_flags & ISBLIND) {
    tbuf = 'it';
  } else {
    tbuf = 'the ' + who;
  }
  if (upper) tbuf = tbuf[0].toUpperCase() + tbuf.slice(1);
  return tbuf;
}

/**
 * hit(er, ee): print hit message.
 */
export async function hit(er, ee) {
  const g = game();
  _addmsg(prname(er, true));
  let s;
  if (g.terse) {
    s = ' hit.';
  } else {
    switch (rnd(4)) {
      case 0: s = ' scored an excellent hit on '; break;
      case 1: s = ' hit '; break;
      case 2: s = (er === null ? ' have injured ' : ' has injured '); break;
      case 3: s = (er === null ? ' swing and hit ' : ' swings and hits '); break;
    }
  }
  _addmsg(s);
  if (!g.terse) _addmsg(prname(ee, false));
  await _endmsg();
}

/**
 * miss_msg(er, ee): print miss message.
 */
export async function miss_msg(er, ee) {
  const g = game();
  _addmsg(prname(er, true));
  let s;
  switch (g.terse ? 0 : rnd(4)) {
    case 0: s = (er === null ? ' miss' : ' misses'); break;
    case 1: s = (er === null ? ' swing and miss' : ' swings and misses'); break;
    case 2: s = (er === null ? ' barely miss' : ' barely misses'); break;
    case 3: s = (er === null ? " don't hit" : " doesn't hit"); break;
  }
  _addmsg(s);
  if (!g.terse) _addmsg(' ' + prname(ee, false));
  await _endmsg();
}

/**
 * save_throw(which, tp): see if a creature saves against something.
 */
export function save_throw(which, tp) {
  const need = 14 + which - Math.floor(tp.t_stats.s_lvl / 2);
  return (roll(1, 20) >= need);
}

/**
 * save(which): hero saves against something.
 */
export function save(which) {
  const g = game();
  return save_throw(which, g.player);
}

/**
 * str_plus(str): compute bonus/penalties for strength on to-hit.
 */
export function str_plus(str) {
  if (str.st_str === 18) {
    if (str.st_add === 100) return 3;
    if (str.st_add > 50) return 2;
  }
  if (str.st_str >= 17) return 1;
  if (str.st_str > 6) return 0;
  return str.st_str - 7;
}

/**
 * add_dam(str): compute additional damage for strength.
 */
export function add_dam(str) {
  if (str.st_str === 18) {
    if (str.st_add === 100) return 6;
    if (str.st_add > 90) return 5;
    if (str.st_add > 75) return 4;
    if (str.st_add !== 0) return 3;
    return 2;
  }
  if (str.st_str > 15) return 1;
  if (str.st_str > 6) return 0;
  return str.st_str - 7;
}

/**
 * raise_level(): player magically goes up a level.
 */
export async function raise_level() {
  const g = game();
  g.player.t_stats.s_exp = e_levels[g.player.t_stats.s_lvl - 1] + 1;
  await check_level();
}

/**
 * thunk(weap, mname): a missile hits a monster.
 */
export async function thunk(weap, mname) {
  const g = game();
  if (weap.o_type === WEAPON) {
    await _msg(`The ${g.w_names[weap.o_which]} hits the ${mname}`);
  } else {
    await _msg(`You hit the ${mname}.`);
  }
}

/**
 * bounce(weap, mname): a missile misses a monster.
 */
export async function bounce(weap, mname) {
  const g = game();
  if (weap.o_type === WEAPON) {
    await _msg(`The ${g.w_names[weap.o_which]} misses the ${mname}`);
  } else {
    await _msg(`You missed the ${mname}.`);
  }
}

/**
 * is_magic(obj): returns true if obj radiates magic.
 */
export function is_magic(obj) {
  const g = game();
  switch (obj.o_type) {
    case ARMOR: return obj.o_ac !== g.a_class[obj.o_which];
    case WEAPON: return obj.o_hplus !== 0 || obj.o_dplus !== 0;
    case POTION:
    case SCROLL:
    case STICK:
    case RING:
    case AMULET: return true;
  }
  return false;
}

/**
 * killed(item, pr): put a monster to death.
 */
export async function killed(item, pr) {
  const g = game();
  const tp = item.l_data;

  if (pr) {
    _addmsg(g.terse ? 'Defeated ' : 'You have defeated ');
    if (g.player.t_flags & ISBLIND) {
      await _msg('it.');
    } else {
      if (!g.terse) _addmsg('the ');
      await _msg(`${g.monsters[tp.t_type.charCodeAt(0) - 65].m_name}.`);
    }
  }

  g.player.t_stats.s_exp += tp.t_stats.s_exp;
  await check_level();

  switch (tp.t_type) {
    case 'F':
      g.player.t_flags &= ~ISHELD;
      g.fung_hit = 0;
      g.monsters['F'.charCodeAt(0) - 65].m_stats.s_dmg = '000d0';
      break;
    case 'L': {
      const rp = roomin(tp.t_pos);
      if (rp === null) break;
      if (rp.r_goldval !== 0 || (_fallpos && _fallpos(tp.t_pos, rp.r_gold, false))) {
        rp.r_goldval += goldcalc(g);
        if (save(VS_MAGIC)) rp.r_goldval += goldcalc(g) * 4;
        mvaddch(g.stdscr, rp.r_gold.y, rp.r_gold.x, GOLD);
        if (!(rp.r_flags & ISDARK)) {
          if (_light) _light(g.player.t_pos);
          mvwaddch(g.cw, g.player.t_pos.y, g.player.t_pos.x, '@'); // PLAYER
        }
      }
      break;
    }
  }

  // Empty monster pack
  let pitem = tp.t_pack;
  removeM(tp.t_pos, item);
  while (pitem !== null) {
    const obj = pitem.l_data;
    obj.o_pos = { x: tp.t_pos.x, y: tp.t_pos.y };
    const nexti = pitem.l_next;
    if (_fall) _fall(pitem, false);
    pitem = nexti;
  }
}
