/**
 * rip.js — End-of-game screens for Rogue 3.6 JS port.
 * Ported from rip.c.
 */

import { game } from './gstate.js';
import { clear, draw, mvwaddstr } from './curses.js';
import { wait_for } from './io.js';
import {
  FOOD, WEAPON, ARMOR, AMULET, SCROLL, POTION, RING, STICK,
  MACE, SWORD, BOW, ARROW, DAGGER, ROCK, TWOSWORD, SLING, DART,
  CROSSBOW, BOLT, SPEAR,
  LEATHER, RING_MAIL, STUDDED_LEATHER, SCALE_MAIL, CHAIN_MAIL,
  SPLINT_MAIL, BANDED_MAIL, PLATE_MAIL,
  R_PROTECT, R_ADDSTR, R_ADDHIT, R_ADDDAM,
  LINES,
} from './const.js';

const RIP_ART = [
  '                       __________',
  '                      /          \\',
  '                     /    REST    \\',
  '                    /      IN      \\',
  '                   /     PEACE      \\',
  '                  /                  \\',
  '                  |                  |',
  '                  |                  |',
  '                  |   killed by a    |',
  '                  |                  |',
  '                  |       1980       |',
  '                 *|     *  *  *      | *',
  '         ________)/\\\\_//(\\/(/\\)/\\//\\/|_)_______',
];

/**
 * killname(monst): return the name of what killed the player.
 */
export function killname(monst) {
  const g = game();
  if (monst >= 'A' && monst <= 'Z') {
    return g.monsters[monst.charCodeAt(0) - 65].m_name;
  }
  switch (monst) {
    case 'a': return 'arrow';
    case 'd': return 'dart';
    case 'b': return 'bolt';
    default:  return 'something';
  }
}

/**
 * death(monst): show the RIP screen and stop the game.
 */
export async function death(monst) {
  const g = game();
  const year = new Date().getFullYear() % 100;
  const killer = killname(monst);
  const vowel = /^[aeiou]/i.test(killer) ? 'n' : '';

  g.purse -= Math.floor(g.purse / 10);

  clear();
  const startRow = 8;
  for (let i = 0; i < RIP_ART.length; i++) {
    mvwaddstr(g.stdscr, startRow + i, 0, RIP_ART[i]);
  }

  // Inscribe name centered around col 28
  const name = g.whoami || 'rogue';
  const nameCol = Math.max(0, 28 - Math.floor((name.length + 1) / 2));
  mvwaddstr(g.stdscr, 14, nameCol, name);

  // Inscribe gold centered around col 28
  const goldStr = `${g.purse} Au`;
  const goldCol = Math.max(0, 28 - Math.floor((goldStr.length + 1) / 2));
  mvwaddstr(g.stdscr, 15, goldCol, goldStr);

  // "a" or "an" at col 33 on the "killed by a" line
  mvwaddstr(g.stdscr, 16, 33, vowel);

  // Killer name centered around col 28
  const killerCol = Math.max(0, 28 - Math.floor((killer.length + 1) / 2));
  mvwaddstr(g.stdscr, 17, killerCol, killer);

  // Year at col 28
  mvwaddstr(g.stdscr, 18, 28, String(year).padStart(2, ' '));

  mvwaddstr(g.stdscr, LINES - 1, 0, '--Press space to continue--');
  draw(g.stdscr);
  await wait_for(' ');
  g.playing = false;
}

/**
 * total_winner(): show the winning screen and tally inventory worth.
 */
export async function total_winner() {
  const g = game();

  clear();

  // "YOU MADE IT" banner
  mvwaddstr(g.stdscr, 1,  0, '                                                               ');
  mvwaddstr(g.stdscr, 2,  0, '  @   @               @   @           @          @@@  @     @  ');
  mvwaddstr(g.stdscr, 3,  0, '  @   @               @@ @@           @           @   @     @  ');
  mvwaddstr(g.stdscr, 4,  0, '  @   @  @@@  @   @   @ @ @  @@@   @@@@  @@@      @  @@@    @  ');
  mvwaddstr(g.stdscr, 5,  0, '   @@@@ @   @ @   @   @   @     @ @   @ @   @     @   @     @  ');
  mvwaddstr(g.stdscr, 6,  0, '      @ @   @ @   @   @   @  @@@@ @   @ @@@@@     @   @     @  ');
  mvwaddstr(g.stdscr, 7,  0, '  @   @ @   @ @  @@   @   @ @   @ @   @ @         @   @  @     ');
  mvwaddstr(g.stdscr, 8,  0, '   @@@   @@@   @@ @   @   @  @@@@  @@@@  @@@     @@@   @@   @  ');
  mvwaddstr(g.stdscr, 9,  0, '                                                               ');
  mvwaddstr(g.stdscr, 10, 0, '     Congratulations, you have made it to the light of day!    ');

  mvwaddstr(g.stdscr, LINES - 1, 0, '--Press space to continue--');
  draw(g.stdscr);
  await wait_for(' ');

  // Tally inventory
  clear();
  mvwaddstr(g.stdscr, 0, 0, '   Worth  Item');
  let row = 1;
  let totalWorth = g.purse;
  let c = 'a';

  for (let ip = g.pack; ip !== null; ip = ip.l_next) {
    const obj = ip.l_data;
    let worth = 0;
    switch (obj.o_type) {
      case FOOD:
        worth = 2 * obj.o_count;
        break;
      case WEAPON: {
        const wbases = [8, 15, 75, 1, 2, 0, 30, 1, 1, 15, 1, 2]; // MACE..SPEAR
        worth = (wbases[obj.o_which] || 0) *
                (1 + 10 * obj.o_hplus + 10 * obj.o_dplus) *
                obj.o_count;
        obj.o_flags |= 0o000002; // ISKNOW
        break;
      }
      case ARMOR: {
        const abases = [5, 30, 15, 3, 75, 80, 90, 400]; // LEATHER..PLATE_MAIL
        worth = (abases[obj.o_which] || 0) *
                (1 + 10 * (g.a_class[obj.o_which] - obj.o_ac));
        obj.o_flags |= 0o000002;
        break;
      }
      case SCROLL:
        g.s_know[obj.o_which] = true;
        worth = g.s_magic[obj.o_which].mi_worth * obj.o_count;
        break;
      case POTION:
        g.p_know[obj.o_which] = true;
        worth = g.p_magic[obj.o_which].mi_worth * obj.o_count;
        break;
      case RING:
        obj.o_flags |= 0o000002;
        g.r_know[obj.o_which] = true;
        worth = g.r_magic[obj.o_which].mi_worth;
        if (obj.o_which === R_ADDSTR || obj.o_which === R_ADDDAM ||
            obj.o_which === R_PROTECT || obj.o_which === R_ADDHIT) {
          if (obj.o_ac > 0) worth += obj.o_ac * 20;
          else worth = 50;
        }
        break;
      case STICK:
        obj.o_flags |= 0o000002;
        g.ws_know[obj.o_which] = true;
        worth = g.ws_magic[obj.o_which].mi_worth + 20 * obj.o_charges;
        break;
      case AMULET:
        worth = 1000;
        break;
    }
    totalWorth += worth;

    const { inv_name } = await import('./things.js');
    const worthStr = String(worth).padStart(7);
    mvwaddstr(g.stdscr, row, 0, `${c}) ${worthStr}  ${inv_name(obj, false)}`);
    row++;
    c = String.fromCharCode(c.charCodeAt(0) + 1);
    if (row >= LINES - 2) break; // don't overflow screen
  }

  const goldStr = String(g.purse).padStart(7);
  mvwaddstr(g.stdscr, row, 0, `   ${goldStr}  Gold Pieces`);

  mvwaddstr(g.stdscr, LINES - 1, 0, `Total worth: ${totalWorth} Au  --Press space to continue--`);
  draw(g.stdscr);
  await wait_for(' ');
  g.playing = false;
}
