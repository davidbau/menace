/**
 * rings.js — Ring wear/remove for Rogue 3.6 JS port.
 * Ported from rings.c.
 */

import { game } from './gstate.js';
import { RING, LEFT, RIGHT, ESCAPE, R_ADDSTR, R_SEEINVIS, R_AGGR, CANSEE } from './const.js';

// Injected deps
let _msg = null;
let _get_item = null;
let _is_current = null;
let _chg_str = null;
let _light = null;
let _aggravate = null;
let _inv_name = null;
let _dropcheck = null;
let _status = null;
let _readchar = null;

export function _setRingsDeps(deps) {
  _msg = deps.msg;
  _get_item = deps.get_item;
  _is_current = deps.is_current;
  _chg_str = deps.chg_str;
  _light = deps.light;
  _aggravate = deps.aggravate;
  _inv_name = deps.inv_name;
  _dropcheck = deps.dropcheck;
  _status = deps.status;
  _readchar = deps.readchar;
}

/**
 * ring_on(): put on a ring.
 */
export async function ring_on() {
  const g = game();
  const item = await _get_item('put on', RING);
  if (item === null) return;
  const obj = item.l_data;
  if (obj.o_type !== RING) {
    if (!g.terse) await _msg('It would be difficult to wrap that around a finger');
    else await _msg('Not a ring');
    return;
  }

  if (_is_current(obj)) return;

  let ring;
  if (g.cur_ring[LEFT] === null && g.cur_ring[RIGHT] === null) {
    ring = await gethand(g);
    if (ring < 0) return;
  } else if (g.cur_ring[LEFT] === null) {
    ring = LEFT;
  } else if (g.cur_ring[RIGHT] === null) {
    ring = RIGHT;
  } else {
    if (!g.terse) await _msg('You already have a ring on each hand');
    else await _msg('Wearing two');
    return;
  }
  g.cur_ring[ring] = obj;

  // Apply ring effects
  switch (obj.o_which) {
    case R_ADDSTR: {
      const saveMax = { st_str: g.max_stats.s_str.st_str, st_add: g.max_stats.s_str.st_add };
      _chg_str(obj.o_ac);
      g.max_stats.s_str = saveMax;
      break;
    }
    case R_SEEINVIS:
      g.player.t_flags |= CANSEE;
      _light(g.player.t_pos);
      break;
    case R_AGGR:
      _aggravate();
      break;
  }
  _status();

  if (g.r_know[obj.o_which] && g.r_guess[obj.o_which]) {
    g.r_guess[obj.o_which] = null;
  } else if (!g.r_know[obj.o_which] && g.askme && g.r_guess[obj.o_which] === null) {
    g.mpos = 0;
    await _msg(g.terse ? 'Call it: ' : 'What do you want to call it? ');
    const buf = await get_str(_readchar);
    if (buf !== null) g.r_guess[obj.o_which] = buf;
    await _msg('');
  }
}

/**
 * ring_off(): remove a ring.
 */
export async function ring_off() {
  const g = game();
  if (g.cur_ring[LEFT] === null && g.cur_ring[RIGHT] === null) {
    if (g.terse) await _msg('No rings');
    else await _msg("You aren't wearing any rings");
    return;
  }

  let ring;
  if (g.cur_ring[LEFT] === null) {
    ring = RIGHT;
  } else if (g.cur_ring[RIGHT] === null) {
    ring = LEFT;
  } else {
    ring = await gethand(g);
    if (ring < 0) return;
  }

  g.mpos = 0;
  const obj = g.cur_ring[ring];
  if (obj === null) {
    await _msg('Not wearing such a ring');
    return;
  }
  // dropcheck handles g.cur_ring[ring] = null internally
  if (_dropcheck(obj)) {
    await _msg(`Was wearing ${_inv_name(obj, true)}`);
  }
}

/**
 * gethand(): ask player which hand (LEFT or RIGHT), return -1 on escape.
 */
async function gethand(g) {
  for (;;) {
    if (g.terse) await _msg('Left or Right ring? ');
    else await _msg('Left hand or right hand? ');
    const c = await _readchar();
    if (c === 'l' || c === 'L') return LEFT;
    if (c === 'r' || c === 'R') return RIGHT;
    if (c === '\x1b' || c.charCodeAt(0) === ESCAPE) return -1;
    g.mpos = 0;
    if (g.terse) await _msg('L or R');
    else await _msg('Please type L or R');
  }
}

/**
 * get_str(): read a line of input. Returns the string, or null on Escape.
 */
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
