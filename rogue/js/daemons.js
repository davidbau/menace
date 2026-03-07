/**
 * daemons.js — Daemon functions for Rogue 3.6 JS port.
 * Ported from daemons.c.
 */

import { game } from './gstate.js';
import { rnd, roll } from './rng.js';
import { BEFORE, AFTER, WANDERTIME, R_REGEN, R_SUSTSTR, R_SEARCH, R_DIGEST, LEFT, RIGHT, ISBLIND, ISHUH, ISHASTE, CANSEE } from './const.js';

// Injected deps
let _msg = null;
let _addmsg = null;
let _ISRING = null;
let _daemon = null;
let _kill_daemon = null;
let _fuse = null;
let _extinguish = null;
let _wanderer = null;
let _light = null;

export function _setDaemonsDeps(deps) {
  _msg = deps.msg;
  _addmsg = deps.addmsg;
  _ISRING = deps.ISRING;
  _daemon = deps.daemon;
  _kill_daemon = deps.kill_daemon;
  _fuse = deps.fuse;
  _extinguish = deps.extinguish;
  _wanderer = deps.wanderer;
  _light = deps.light;
}

/**
 * doctor(): healing daemon.
 */
export function doctor() {
  const g = game();
  const lv = g.player.t_stats.s_lvl;
  const ohp = g.player.t_stats.s_hpt;
  g.quiet++;
  if (lv < 8) {
    if (g.quiet > 20 - lv * 2) g.player.t_stats.s_hpt++;
  } else {
    if (g.quiet >= 3) g.player.t_stats.s_hpt += rnd(lv - 7) + 1;
  }
  if (_ISRING && _ISRING(LEFT, R_REGEN)) g.player.t_stats.s_hpt++;
  if (_ISRING && _ISRING(RIGHT, R_REGEN)) g.player.t_stats.s_hpt++;
  if (ohp !== g.player.t_stats.s_hpt) {
    if (g.player.t_stats.s_hpt > g.max_hp) g.player.t_stats.s_hpt = g.max_hp;
    g.quiet = 0;
  }
}

let _between = 0;

export function resetBetween() { _between = 0; }

/**
 * swander(): called to start rolling for wandering monsters.
 */
export function swander() {
  if (_daemon) _daemon(rollwand, 0, BEFORE);
}

/**
 * rollwand(): roll to see if wandering monster starts.
 */
export function rollwand() {
  if (++_between >= 4) {
    if (roll(1, 6) === 4) {
      if (_wanderer) _wanderer();
      if (_kill_daemon) _kill_daemon(rollwand);
      if (_fuse) _fuse(swander, 0, WANDERTIME, BEFORE);
    }
    _between = 0;
  }
}

/**
 * unconfuse(): release player from confusion.
 */
export async function unconfuse() {
  const g = game();
  g.player.t_flags &= ~ISHUH;
  if (_msg) await _msg('You feel less confused now');
}

/**
 * unsee(): player loses see-invisible power.
 */
export function unsee() {
  const g = game();
  g.player.t_flags &= ~CANSEE;
}

/**
 * sight(): player gets sight back.
 */
export async function sight() {
  const g = game();
  if (g.player.t_flags & ISBLIND) {
    if (_extinguish) _extinguish(sight);
    g.player.t_flags &= ~ISBLIND;
    if (_light) _light(g.player.t_pos);
    if (_msg) await _msg('The veil of darkness lifts');
  }
}

/**
 * nohaste(): end hasting.
 */
export async function nohaste() {
  const g = game();
  g.player.t_flags &= ~ISHASTE;
  if (_msg) await _msg('You feel yourself slowing down.');
}

/**
 * stomach(): digest the hero's food.
 */
export async function stomach() {
  const g = game();
  if (g.food_left <= 0) {
    if (g.no_command || rnd(100) > 20) return;
    g.no_command = rnd(8) + 4;
    if (!g.terse) _addmsg('You feel too weak from lack of food.  ');
    if (_msg) await _msg('You faint');
    g.running = false;
    g.count = 0;
    g.hungry_state = 3;
  } else {
    const oldfood = g.food_left;
    const ringEat = ring_eat(LEFT) + ring_eat(RIGHT);
    g.food_left -= ringEat + 1 - (g.amulet ? 1 : 0);

    const MORETIME = 150;
    if (g.food_left < MORETIME && oldfood >= MORETIME) {
      if (_msg) await _msg('You are starting to feel weak');
      g.hungry_state = 2;
    } else if (g.food_left < 2 * MORETIME && oldfood >= 2 * MORETIME) {
      if (!g.terse) {
        if (_msg) await _msg('You are starting to get hungry');
      } else {
        if (_msg) await _msg('Getting hungry');
      }
      g.hungry_state = 1;
    }
  }
}

function ring_eat(which) {
  const g = game();
  const r = g.cur_ring[which];
  if (r === null) return 0;
  switch (r.o_which) {
    case R_REGEN:   return 2;
    case R_SUSTSTR: return 1;
    case R_SEARCH:  return (rnd(100) < 33) ? 1 : 0;
    case R_DIGEST:  return (rnd(100) < 50) ? -1 : 0;
    default:        return 0;
  }
}
