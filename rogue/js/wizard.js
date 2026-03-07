/**
 * wizard.js — Wizard mode commands for Rogue 3.6 JS port.
 * Ported from wizard.c.
 */

import { game } from './gstate.js';
import { mvwaddch, draw } from './curses.js';
import { PLAYER } from './const.js';

// Injected deps
let _msg = null;
let _new_thing = null;
let _add_pack = null;
let _check_level = null;
let _teleport = null;
let _new_level = null;
let _light = null;
let _look = null;
let _status = null;
let _inv_name = null;

export function _setWizardDeps(deps) {
  _msg = deps.msg;
  _new_thing = deps.new_thing;
  _add_pack = deps.add_pack;
  _check_level = deps.check_level;
  _teleport = deps.teleport;
  _new_level = deps.new_level;
  _light = deps.light;
  _look = deps.look;
  _status = deps.status;
  _inv_name = deps.inv_name;
}

/**
 * wizard_cmds(ch): handle wizard-mode keystrokes.
 */
export async function wizard_cmds(ch) {
  const g = game();
  switch (ch) {
    case 'c': {
      // Create a random item and add to pack
      if (_new_thing && _add_pack) {
        const item = _new_thing();
        if (item) {
          await _add_pack(item, false);
        }
      } else {
        await _msg('(wizard c: new_thing not available)');
      }
      break;
    }

    case '+': {
      // Raise experience level
      g.player.t_stats.s_exp = g.player.t_stats.s_exp * 2 + 1;
      if (_check_level) _check_level();
      if (_status) _status();
      await _msg('You feel much more experienced!');
      break;
    }

    case '>': {
      // Go to next dungeon level
      g.level++;
      if (_new_level) await _new_level();
      break;
    }

    case 'p': {
      // Teleport to random position
      if (_teleport) _teleport();
      break;
    }

    case 'w': {
      // Show player's complete status
      const ps = g.player.t_stats;
      await _msg(`S:${ps.s_str.st_str}/${ps.s_str.st_add} X:${ps.s_exp} L:${ps.s_lvl} A:${ps.s_arm} H:${ps.s_hpt}/${g.max_hp}`);
      break;
    }

    case 'm': {
      // Reveal all monsters on current map
      for (let node = g.mlist; node !== null; node = node.l_next) {
        const m = node.l_data;
        mvwaddch(g.cw, m.t_pos.y, m.t_pos.x, m.t_type);
      }
      if (_status) _status();
      draw(g.cw);
      break;
    }

    case 'i': {
      // List items on floor
      let count = 0;
      for (let node = g.lvl_obj; node !== null; node = node.l_next) {
        count++;
      }
      await _msg(`${count} item(s) on floor.`);
      break;
    }

    case 'f': {
      // Food cheat: reset food_left
      g.food_left = 1700;
      g.hungry_state = 0;
      if (_status) _status();
      await _msg('You feel full.');
      break;
    }

    default:
      await _msg(`Unknown wizard command '${ch}'.`);
      break;
  }
}
