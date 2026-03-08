/**
 * wizard.js — Wizard mode commands for Rogue 3.6 JS port.
 * Ported from wizard.c.
 */

import { game } from './gstate.js';
import { mvwaddch, draw } from './curses.js';
import { PLAYER, WEAPON, ARMOR, RING, STICK, ISCURSED,
         R_PROTECT, R_ADDSTR, R_ADDHIT, R_ADDDAM,
         TWOSWORD, SWORD, PLATE_MAIL, ISKNOW } from './const.js';
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
let _inventory = null;
let _get_item = null;

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
  _inventory = deps.inventory;
  _get_item = deps.get_item;
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
 * Matches C command.c wizard switch exactly.
 */
export async function wizard_cmds(ch) {
  const g = game();
  switch (ch) {
    case '@': {
      // Show hero position
      await _msg(`@ ${g.player.t_pos.y},${g.player.t_pos.x}`);
      break;
    }

    case 'C': {
      // Create an item interactively — matches C wizard.c create_obj()
      await create_obj();
      break;
    }

    case '\x09': {
      // Ctrl-I: inventory of floor items
      if (_inventory) await _inventory(g.lvl_obj, 0);
      break;
    }

    case '\x04': {
      // Ctrl-D: go down one dungeon level
      g.level++;
      if (_new_level) await _new_level();
      break;
    }

    case '\x15': {
      // Ctrl-U: go up one dungeon level
      g.level--;
      if (_new_level) await _new_level();
      break;
    }

    case '\x18': {
      // Ctrl-X: show all monsters on mw
      draw(g.mw);
      break;
    }

    case '\x14': {
      // Ctrl-T: teleport to random position
      if (_teleport) _teleport();
      break;
    }

    case '\x05': {
      // Ctrl-E: show food_left
      await _msg(`food left: ${g.food_left}`);
      break;
    }

    case '\x01': {
      // Ctrl-A: show pack item count
      await _msg(`${g.inpack} things in your pack`);
      break;
    }

    case '\x0e': {
      // Ctrl-N: charge a stick to 10000
      if (_get_item) {
        const item = await _get_item('charge', STICK);
        if (item !== null) item.l_data.o_charges = 10000;
      }
      break;
    }

    case '\x08': {
      // Ctrl-H: raise 9 levels + give two-handed sword and plate mail
      for (let i = 0; i < 9; i++) {
        if (_check_level) _check_level();
      }
      // Two-handed sword (+1,+1)
      {
        const item = new_item();
        const obj = item.l_data;
        obj.o_type = WEAPON;
        obj.o_which = TWOSWORD;
        if (_init_weapon) _init_weapon(obj, SWORD);
        obj.o_hplus = 1;
        obj.o_dplus = 1;
        if (_add_pack) await _add_pack(item, true);
        g.cur_weapon = obj;
      }
      // Plate mail (AC -5)
      {
        const item = new_item();
        const obj = item.l_data;
        obj.o_type = ARMOR;
        obj.o_which = PLATE_MAIL;
        obj.o_ac = -5;
        obj.o_flags |= ISKNOW;
        g.cur_armor = obj;
        if (_add_pack) await _add_pack(item, true);
      }
      break;
    }

    default:
      await _msg(`Illegal command '${ch}'.`);
      break;
  }
}
