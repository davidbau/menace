/**
 * wizard.js — Wizard mode commands for Rogue 3.6 JS port.
 * Ported from wizard.c.
 */

import { game } from './gstate.js';
import { mvwaddch, draw } from './curses.js';
import { PLAYER, WEAPON, ARMOR, RING, STICK, ISCURSED,
         R_PROTECT, R_ADDSTR, R_ADDHIT, R_ADDDAM } from './const.js';
import { rnd } from './rng.js';
import { new_item, _attach } from './list.js';

// Injected deps
let _msg = null;
let _add_pack = null;
let _check_level = null;
let _teleport = null;
let _new_level = null;
let _status = null;
let _inv_name = null;
let _readchar = null;
let _fix_stick = null;
let _init_weapon = null;
let _a_class = null;   // armor base AC array

export function _setWizardDeps(deps) {
  _msg = deps.msg;
  _add_pack = deps.add_pack;
  _check_level = deps.check_level;
  _teleport = deps.teleport;
  _new_level = deps.new_level;
  _status = deps.status;
  _inv_name = deps.inv_name;
  _readchar = deps.readchar;
  _fix_stick = deps.fix_stick;
  _init_weapon = deps.init_weapon;
  _a_class = deps.a_class;
}

/**
 * create_obj(): wizard 'C' command — interactive item creation.
 * Matches C wizard.c create_obj() exactly.
 * Reads type char, which hex char, optional blessing.
 */
async function create_obj() {
  const item = new_item();
  const obj = item.l_data;

  const g = game();

  await _msg('Type of item: ');
  const typeChar = await _readchar();
  g.mpos = 0;  // C: mpos = 0 after each readchar in create_obj()
  obj.o_type = typeChar;
  obj.o_group = 0;
  obj.o_count = 1;
  obj.o_flags = 0;
  obj.o_hplus = 0;
  obj.o_dplus = 0;
  obj.o_ac = 0;
  obj.o_damage = '0d0';
  obj.o_hurldmg = '0d0';
  obj.o_launch = -1;

  await _msg(`Which ${typeChar} do you want? (0-f)`);
  const whichChar = await _readchar();
  g.mpos = 0;
  obj.o_which = (whichChar >= '0' && whichChar <= '9')
    ? (whichChar.charCodeAt(0) - '0'.charCodeAt(0))
    : (whichChar.charCodeAt(0) - 'a'.charCodeAt(0) + 10);

  if (obj.o_type === WEAPON || obj.o_type === ARMOR) {
    await _msg('Blessing? (+,-,n)');
    const bless = await _readchar();
    g.mpos = 0;
    if (bless === '-') obj.o_flags |= ISCURSED;
    if (obj.o_type === WEAPON) {
      if (_init_weapon) _init_weapon(obj, obj.o_which);
      if (bless === '-') obj.o_hplus -= rnd(3) + 1;
      if (bless === '+') obj.o_hplus += rnd(3) + 1;
    } else {
      // ARMOR
      obj.o_ac = _a_class ? _a_class[obj.o_which] : obj.o_which;
      if (bless === '-') obj.o_ac += rnd(3) + 1;
      if (bless === '+') obj.o_ac -= rnd(3) + 1;
    }
  } else if (obj.o_type === RING) {
    const w = obj.o_which;
    if (w === R_PROTECT || w === R_ADDSTR || w === R_ADDHIT || w === R_ADDDAM) {
      await _msg('Blessing? (+,-,n)');
      const bless = await _readchar();
      g.mpos = 0;
      if (bless === '-') obj.o_flags |= ISCURSED;
      obj.o_ac = (bless === '-' ? -1 : rnd(2) + 1);
    }
  } else if (obj.o_type === STICK) {
    if (_fix_stick) _fix_stick(obj);
  }

  await _add_pack(item, false);
}

/**
 * wizard_cmds(ch): handle wizard-mode keystrokes.
 */
export async function wizard_cmds(ch) {
  const g = game();
  switch (ch) {
    case 'C': {
      // Create an item interactively — matches C wizard.c create_obj()
      await create_obj();
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
