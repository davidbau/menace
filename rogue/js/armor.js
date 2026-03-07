/**
 * armor.js — Armor wear/remove for Rogue 3.6 JS port.
 * Ported from armor.c.
 */

import { game } from './gstate.js';
import { ARMOR, ISKNOW } from './const.js';

// Injected deps
let _msg = null;
let _addmsg = null;
let _endmsg = null;
let _get_item = null;
let _waste_time = null;
let _inv_name = null;
let _pack_char = null;
let _dropcheck = null;

export function _setArmorDeps(deps) {
  _msg = deps.msg;
  _addmsg = deps.addmsg;
  _endmsg = deps.endmsg;
  _get_item = deps.get_item;
  _waste_time = deps.waste_time;
  _inv_name = deps.inv_name;
  _pack_char = deps.pack_char;
  _dropcheck = deps.dropcheck;
}

/**
 * wear(): put on armor.
 */
export async function wear() {
  const g = game();
  if (g.cur_armor !== null) {
    _addmsg('You are already wearing some');
    if (!g.terse) _addmsg(".  You'll have to take it off first");
    _endmsg();
    g.after = false;
    return;
  }
  const item = await _get_item('wear', ARMOR);
  if (item === null) return;
  const obj = item.l_data;
  if (obj.o_type !== ARMOR) {
    await _msg("You can't wear that.");
    return;
  }
  await _waste_time();
  if (!g.terse) _addmsg('You are now w');
  else _addmsg('W');
  await _msg(`earing ${g.a_names[obj.o_which]}.`);
  g.cur_armor = obj;
  obj.o_flags |= ISKNOW;
}

/**
 * take_off(): remove currently worn armor.
 */
export async function take_off() {
  const g = game();
  const obj = g.cur_armor;
  if (obj === null) {
    if (g.terse) await _msg('Not wearing armor');
    else await _msg("You aren't wearing any armor");
    return;
  }
  // dropcheck calls waste_time() and sets g.cur_armor = null internally
  if (!_dropcheck(obj)) return;
  // g.cur_armor is now null (set by dropcheck)
  if (g.terse) _addmsg('Was');
  else _addmsg('You used to be ');
  await _msg(` wearing ${_pack_char(obj)}) ${_inv_name(obj, true)}`);
}
