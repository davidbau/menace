/**
 * command.js — Command dispatcher for Rogue 3.6 JS port.
 * Ported from command.c.
 */

import { game } from './gstate.js';
import { rnd } from './rng.js';
import { wmove, wclrtoeol, mvwaddstr, waddstr, wprintw, draw, wclear } from './curses.js';
import { helpstr } from './data.js';
import {
  BEFORE, AFTER, LEFT, RIGHT, R_SEARCH, R_TELEPORT, ISHASTE, LINES,
  CALLABLE, RING, POTION, SCROLL, STICK,
} from './const.js';
import { do_daemons, do_fuses } from './daemon.js';
import { runners } from './chase.js';

// Injected deps
let _msg = null;
let _addmsg = null;
let _readchar = null;
let _status = null;
let _look = null;
let _do_move = null;
let _do_run = null;
let _fight = null;
let _pick_up = null;
let _inventory = null;
let _picky_inven = null;
let _drop = null;
let _quaff = null;
let _read_scroll = null;
let _eat = null;
let _wield = null;
let _wear = null;
let _take_off = null;
let _ring_on = null;
let _ring_off = null;
let _option = null;
let _get_item = null;
let _d_level = null;
let _u_level = null;
let _help = null;
let _identify = null;
let _search = null;
let _do_zap = null;
let _get_dir = null;
let _missile = null;
let _teleport = null;
let _new_level = null;
let _draw = null;
let _ISRING = null;
let _quit = null;
let _save_game = null;
let _wizard_cmds = null;
let _total_winner = null;

export function _setCommandDeps(deps) {
  _msg = deps.msg;
  _addmsg = deps.addmsg;
  _readchar = deps.readchar;
  _status = deps.status;
  _look = deps.look;
  _do_move = deps.do_move;
  _do_run = deps.do_run;
  _fight = deps.fight;
  _pick_up = deps.pick_up;
  _inventory = deps.inventory;
  _picky_inven = deps.picky_inven;
  _drop = deps.drop;
  _quaff = deps.quaff;
  _read_scroll = deps.read_scroll;
  _eat = deps.eat;
  _wield = deps.wield;
  _wear = deps.wear;
  _take_off = deps.take_off;
  _ring_on = deps.ring_on;
  _ring_off = deps.ring_off;
  _option = deps.option;
  _get_item = deps.get_item;
  _d_level = deps.d_level;
  _u_level = deps.u_level;
  _help = deps.help;
  _identify = deps.identify;
  _search = deps.search;
  _do_zap = deps.do_zap;
  _get_dir = deps.get_dir;
  _missile = deps.missile;
  _teleport = deps.teleport;
  _new_level = deps.new_level;
  _draw = deps.draw;
  _ISRING = deps.ISRING;
  _quit = deps.quit;
  _save_game = deps.save_game;
  _wizard_cmds = deps.wizard_cmds;
  _total_winner = deps.total_winner;
}

/**
 * command(): process user commands.
 */
export async function command() {
  const g = game();
  let ntimes = 1;
  let countch = '', direction = '', newcount = false;

  if (g.player.t_flags & ISHASTE) ntimes++;

  // Let daemons start up
  await do_daemons(BEFORE);
  await do_fuses(BEFORE);

  while (ntimes--) {
    await _look(true);
    if (!g.running) g.door_stop = false;
    _status();
    g.lastscore = g.purse;
    wmove(g.cw, g.player.t_pos.y, g.player.t_pos.x);

    if (!((g.running || g.count) && g.jump)) {
      draw(g.cw);
    }

    g.take = 0;
    g.after = true;

    if (g.wizard) g.waswizard = true;

    let ch;
    if (!g.no_command) {
      if (g.running) ch = g.runch;
      else if (g.count) ch = countch;
      else {
        ch = await _readchar();
        if (g.mpos !== 0 && !g.running) await _msg('');
      }
    } else {
      ch = ' ';
    }

    if (g.no_command) {
      if (--g.no_command === 0) await _msg('You can move again.');
    } else {
      // Handle digit prefix (count)
      if (ch >= '0' && ch <= '9') {
        g.count = 0;
        newcount = true;
        while (ch >= '0' && ch <= '9') {
          g.count = g.count * 10 + (ch.charCodeAt(0) - '0'.charCodeAt(0));
          ch = await _readchar();
        }
        countch = ch;
        // Turn off count for non-repeatable commands
        switch (ch) {
          case 'h': case 'j': case 'k': case 'l':
          case 'y': case 'u': case 'b': case 'n':
          case 'H': case 'J': case 'K': case 'L':
          case 'Y': case 'U': case 'B': case 'N':
          case 'q': case 'r': case 's': case 'f':
          case 't': case 'C': case 'I': case ' ':
          case 'z': case 'p':
            break;
          default:
            g.count = 0;
        }
      }

      if (ch === 'f') {
        if (!(g.player.t_flags & ISBLIND)) {
          g.door_stop = true;
          g.firstmove = true;
        }
        if (g.count && !newcount) ch = direction;
        else ch = await _readchar();
        switch (ch) {
          case 'h': case 'j': case 'k': case 'l':
          case 'y': case 'u': case 'b': case 'n':
            ch = ch.toUpperCase();
        }
        direction = ch;
      }

      newcount = false;
      if (g.count && !g.running) g.count--;

      await dispatch(g, ch);

      if (!g.running) g.door_stop = false;
    }

    // Pick up items if walked over something
    if (g.take !== 0) {
      if (_pick_up) await _pick_up(g.take);
    }
    if (!g.running) g.door_stop = false;
  }

  // Run AFTER daemons/fuses (skip if game ended, e.g. after death)
  if (g.after && g.playing) {
    await _look(false);
    await do_daemons(AFTER);
    await do_fuses(AFTER);
    if (_ISRING && _ISRING(LEFT, R_SEARCH)) {
      if (_search) await _search();
    } else if (_ISRING && _ISRING(LEFT, R_TELEPORT) && rnd(100) < 2) {
      if (_teleport) _teleport();
    }
    if (_ISRING && _ISRING(RIGHT, R_SEARCH)) {
      if (_search) await _search();
    } else if (_ISRING && _ISRING(RIGHT, R_TELEPORT) && rnd(100) < 2) {
      if (_teleport) _teleport();
    }
  }
}

async function dispatch(g, ch) {
  switch (ch) {
    case 'h': await _do_move(0, -1); break;
    case 'j': await _do_move(1, 0); break;
    case 'k': await _do_move(-1, 0); break;
    case 'l': await _do_move(0, 1); break;
    case 'y': await _do_move(-1, -1); break;
    case 'u': await _do_move(-1, 1); break;
    case 'b': await _do_move(1, -1); break;
    case 'n': await _do_move(1, 1); break;
    case 'H': await _do_run('h'); break;
    case 'J': await _do_run('j'); break;
    case 'K': await _do_run('k'); break;
    case 'L': await _do_run('l'); break;
    case 'Y': await _do_run('y'); break;
    case 'U': await _do_run('u'); break;
    case 'B': await _do_run('b'); break;
    case 'N': await _do_run('n'); break;
    case 't':
      if (_get_dir && await _get_dir()) {
        if (_missile) await _missile(g.delta.y, g.delta.x);
      } else {
        g.after = false;
      }
      break;
    case 'Q': g.after = false; if (_quit) await _quit(); break;
    case 'i': g.after = false; if (_inventory) await _inventory(g.pack, 0); break;
    case 'I': g.after = false; if (_picky_inven) await _picky_inven(); break;
    case 'd': if (_drop) await _drop(); break;
    case 'q': if (_quaff) await _quaff(); break;
    case 'r': if (_read_scroll) await _read_scroll(); break;
    case 'e': if (_eat) await _eat(); break;
    case 'w': if (_wield) await _wield(); break;
    case 'W': if (_wear) await _wear(); break;
    case 'T': if (_take_off) await _take_off(); break;
    case 'P': if (_ring_on) await _ring_on(); break;
    case 'R': if (_ring_off) await _ring_off(); break;
    case 'o': if (_option) await _option(); break;
    case 'c': g.after = false; await call_item(); break;
    case '>': g.after = false; if (_d_level) await _d_level(); break;
    case '<': g.after = false; if (_u_level) await _u_level(); break;
    case '?': g.after = false; if (_help) await _help(); break;
    case '/': g.after = false; if (_identify) await _identify(); break;
    case 's': if (_search) await _search(); break;
    case 'z': if (_do_zap) await _do_zap(false); break;
    case 'p':
      if (_get_dir && await _get_dir()) {
        if (_do_zap) await _do_zap(true);
      } else {
        g.after = false;
      }
      break;
    case 'v':
      await _msg(`Rogue version ${g.release || '3.6'}. (mctesq was here)`);
      break;
    case '\x0c': // Ctrl-L: redraw
      g.after = false;
      draw(g.cw);
      break;
    case '\x12': // Ctrl-R: reprint message
      g.after = false;
      await _msg(g.huh || '');
      break;
    case 'S':
      g.after = false;
      if (_save_game && await _save_game()) {
        wmove(g.cw, LINES - 1, 0);
        wclrtoeol(g.cw);
        draw(g.cw);
        g.playing = false;
      }
      break;
    case ' ':
      // Rest
      break;
    case '\x10': // Ctrl-P: wizard toggle
      g.after = false;
      if (g.wizard) {
        g.wizard = false;
        await _msg('Not wizard any more');
      } else {
        await _msg('Sorry');
      }
      break;
    case '\x1b': // Escape
      g.door_stop = false;
      g.count = 0;
      g.after = false;
      break;
    default:
      g.after = false;
      if (g.wizard && _wizard_cmds) {
        await _wizard_cmds(ch);
      } else {
        await _msg(`Illegal command '${unctrl(ch)}'.`);
        g.count = 0;
      }
  }
}

function unctrl(ch) {
  const code = ch.charCodeAt(0);
  if (code < 32) return '^' + String.fromCharCode(code + 64);
  return ch;
}

/**
 * quit(): ask player to confirm, then exit.
 */
export async function quit() {
  const g = game();
  await _msg('Really quit?');
  draw(g.cw);
  const ch = await _readchar();
  if (ch === 'y') {
    g.playing = false;
  } else {
    wmove(g.cw, 0, 0);
    wclrtoeol(g.cw);
    _status();
    draw(g.cw);
    g.mpos = 0;
    g.count = 0;
  }
}

/**
 * d_level(): go down a level.
 */
export async function d_level() {
  const g = game();
  const { winat } = await import('./curses.js');
  const { STAIRS } = await import('./const.js');
  if (winat(g.player.t_pos.y, g.player.t_pos.x) !== STAIRS) {
    await _msg('I see no way down.');
  } else {
    g.level++;
    if (_new_level) await _new_level();
  }
}

/**
 * u_level(): go up a level.
 */
export async function u_level() {
  const g = game();
  const { winat } = await import('./curses.js');
  const { STAIRS } = await import('./const.js');
  if (winat(g.player.t_pos.y, g.player.t_pos.x) === STAIRS) {
    if (g.amulet) {
      g.level--;
      if (g.level === 0) {
        if (_total_winner) await _total_winner();
        else g.playing = false;
        return;
      }
      if (_new_level) await _new_level();
      await _msg('You feel a wrenching sensation in your gut.');
      return;
    }
  }
  await _msg('I see no way up.');
}

/**
 * help(): give help.
 */
export async function help() {
  const g = game();
  await _msg('Character you want help for (* for all): ');
  const helpch = await _readchar();
  g.mpos = 0;

  if (helpch !== '*') {
    wmove(g.cw, 0, 0);
    for (const entry of helpstr) {
      if (entry.h_ch === helpch) {
        await _msg(`${unctrl(entry.h_ch)}${entry.h_desc}`);
        return;
      }
    }
    await _msg(`Unknown character '${unctrl(helpch)}'`);
    return;
  }

  wclear(g.hw);
  let cnt = 0;
  for (const entry of helpstr) {
    if (!entry.h_ch) break;  // sentinel: h_ch === 0
    mvwaddstr(g.hw, cnt % 23, cnt > 22 ? 40 : 0, unctrl(entry.h_ch));
    waddstr(g.hw, entry.h_desc);
    cnt++;
  }
  wmove(g.hw, LINES - 1, 0);
  wprintw(g.hw, '--Press space to continue--');
  draw(g.hw);
  const { wait_for } = await import('./io.js');
  await wait_for(' ');
  wclear(g.hw);
  draw(g.hw);
  wmove(g.cw, 0, 0);
  wclrtoeol(g.cw);
  _status();
}

/**
 * call_item(): allow the player to name an unidentified ring/potion/scroll/stick.
 * Ported from call() in command.c.
 */
async function call_item() {
  const g = game();
  const item = await _get_item('call', CALLABLE);
  if (item === null) return;
  const obj = item.l_data;

  let guess, know, elsewise;
  switch (obj.o_type) {
    case RING:
      guess = g.r_guess; know = g.r_know;
      elsewise = g.r_guess[obj.o_which] ?? g.r_stones[obj.o_which];
      break;
    case POTION:
      guess = g.p_guess; know = g.p_know;
      elsewise = g.p_guess[obj.o_which] ?? g.p_colors[obj.o_which];
      break;
    case SCROLL:
      guess = g.s_guess; know = g.s_know;
      elsewise = g.s_guess[obj.o_which] ?? g.s_names[obj.o_which];
      break;
    case STICK:
      guess = g.ws_guess; know = g.ws_know;
      elsewise = g.ws_guess[obj.o_which] ?? g.ws_made[obj.o_which];
      break;
    default:
      await _msg("You can't call that anything");
      return;
  }

  if (know[obj.o_which]) {
    await _msg('That has already been identified');
    return;
  }

  if (g.terse) _addmsg('C'); else _addmsg('Was c');
  await _msg(`alled "${elsewise || ''}"`);

  await _msg(g.terse ? 'Call it: ' : 'What do you want to call it? ');
  const buf = await get_line(_readchar, elsewise || '');
  if (buf !== null) guess[obj.o_which] = buf;
}

async function get_line(readchar, initial) {
  const g = game();
  const { wmove, wclrtoeol, draw, waddstr } = await import('./curses.js');
  // Position cursor at end of prompt (g.mpos tracks where message ended)
  const startX = g.mpos;
  // C's get_str() starts with empty buffer (does not pre-show initial value)
  let buf = '';
  for (;;) {
    const ch = await readchar();
    if (ch === '\r' || ch === '\n') return buf || initial;
    if (ch === '\x1b') return null;
    if (ch === '\x7f' || ch === '\x08') {
      if (buf.length > 0) {
        buf = buf.slice(0, -1);
        wmove(g.cw, 0, startX);
        wclrtoeol(g.cw);
        waddstr(g.cw, buf);
        draw(g.cw);
      }
    } else {
      buf += ch;
      wmove(g.cw, 0, startX);
      wclrtoeol(g.cw);
      waddstr(g.cw, buf);
      draw(g.cw);
    }
  }
}

/**
 * identify(): tell player what something is.
 */
export async function identify() {
  const g = game();
  await _msg('What do you want identified? ');
  const ch = await _readchar();
  g.mpos = 0;

  if (ch === '\x1b') {
    await _msg('');
    return;
  }

  let str;
  if (ch >= 'A' && ch <= 'Z') {
    str = g.monsters[ch.charCodeAt(0) - 65].m_name;
  } else {
    switch (ch) {
      case '|': case '-': str = 'wall of a room'; break;
      case '$': str = 'gold'; break;
      case '%': str = 'passage leading down'; break;
      case '+': str = 'door'; break;
      case '.': str = 'room floor'; break;
      case '@': str = 'you'; break;
      case '#': str = 'passage'; break;
      case '^': str = 'trap'; break;
      case '!': str = 'potion'; break;
      case '?': str = 'scroll'; break;
      case ':': str = 'food'; break;
      case ')': str = 'weapon'; break;
      case ' ': str = 'solid rock'; break;
      case ']': str = 'armor'; break;
      case ',': str = 'The Amulet of Yendor'; break;
      case '=': str = 'ring'; break;
      case '/': str = 'wand or staff'; break;
      default: str = 'unknown character';
    }
  }
  await _msg(`'${unctrl(ch)}' : ${str}`);
}
