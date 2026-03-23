/**
 * init.js — Initialization functions for Rogue 3.6 JS port.
 *
 * init_player(), init_things(), init_names(), init_colors(),
 * init_stones(), init_materials(), badcheck().
 */

import { game } from './gstate.js';
import { rnd } from './rng.js';
import { rainbow, sylls, stones, wood, metal } from './data.js';
import { MAXPOTIONS, MAXSCROLLS, MAXRINGS, MAXSTICKS, NUMTHINGS } from './const.js';

/**
 * init_player: Roll up the rogue
 */
export function init_player() {
  const g = game();
  const ps = g.player.t_stats;
  ps.s_lvl = 1;
  ps.s_exp = 0;
  g.max_hp = ps.s_hpt = 12;
  // C ref: init.c — 1% chance of exceptional strength 18/XX
  if (rnd(100) === 7) {
    ps.s_str.st_str = 18;
    ps.s_str.st_add = rnd(100) + 1;
  } else {
    ps.s_str.st_str = 16;
    ps.s_str.st_add = 0;
  }
  ps.s_dmg = "1d4";
  ps.s_arm = 10;
  // max_stats = pstats
  g.max_stats = {
    s_str: { st_str: ps.s_str.st_str, st_add: ps.s_str.st_add },
    s_exp: ps.s_exp,
    s_lvl: ps.s_lvl,
    s_arm: ps.s_arm,
    s_hpt: ps.s_hpt,
    s_dmg: ps.s_dmg,
  };
  g.player.t_pack = null;
}

/**
 * init_things: Make things cumulative probability table
 */
export function init_things() {
  const g = game();
  for (let i = 1; i < NUMTHINGS; i++) {
    g.things[i].mi_prob += g.things[i-1].mi_prob;
  }
}

/**
 * init_colors: Set up potion colors
 * C code uses strdup() to copy the string, then lowercases the COPY.
 * The original rainbow[] is never modified. So isupper(*str) is always true.
 * The do-while always exits on the first pick — no collision detection.
 * This means potions CAN get duplicate colors (the C code allows this).
 */
export function init_colors() {
  const g = game();
  for (let i = 0; i < MAXPOTIONS; i++) {
    // C: do { str = rainbow[rnd(NCOLORS)]; } until (isupper(*str));
    // Since rainbow[] is never modified (strdup), always exits on first try.
    const str = rainbow[rnd(rainbow.length)];
    // C: str = strdup(str); *str = tolower(*str);
    g.p_colors[i] = str[0].toLowerCase() + str.slice(1);
    g.p_know[i] = false;
    g.p_guess[i] = null;
    if (i > 0) {
      g.p_magic[i].mi_prob += g.p_magic[i-1].mi_prob;
    }
  }
}

/**
 * init_names: Generate scroll names from syllables
 */
export function init_names() {
  const g = game();
  for (let i = 0; i < MAXSCROLLS; i++) {
    let cp = '';
    let nwords = rnd(4) + 2;
    while (nwords--) {
      let nsyl = rnd(3) + 1;
      while (nsyl--) {
        const sp = sylls[rnd(sylls.length)];
        cp += sp;
      }
      cp += ' ';
    }
    // Remove trailing space
    cp = cp.slice(0, cp.length - 1);
    g.s_names[i] = cp;
    g.s_know[i] = false;
    g.s_guess[i] = null;
    if (i > 0) {
      g.s_magic[i].mi_prob += g.s_magic[i-1].mi_prob;
    }
  }
}

/**
 * init_stones: Set up ring stone settings
 * Same behavior as init_colors: C uses strdup so original stones[] is never modified.
 * Do-while always exits on first pick.
 */
export function init_stones() {
  const g = game();
  for (let i = 0; i < MAXRINGS; i++) {
    const str = stones[rnd(stones.length)];
    g.r_stones[i] = str[0].toLowerCase() + str.slice(1);
    g.r_know[i] = false;
    g.r_guess[i] = null;
    if (i > 0) {
      g.r_magic[i].mi_prob += g.r_magic[i-1].mi_prob;
    }
  }
}

/**
 * init_materials: Set up wand/staff materials
 * C code uses strdup() so original metal[]/wood[] are never modified.
 * Do-while always exits on first pick (since all entries start uppercase).
 * The isupper check inside sets ws_type, but since str is always uppercase,
 * ws_type is always set on the same iteration we exit the loop.
 */
export function init_materials() {
  const g = game();
  for (let i = 0; i < MAXSTICKS; i++) {
    let str;
    let wsType;
    // C: do { if (rnd(100)>50) { ... } else { ... } } until (isupper(*str));
    // Since all entries start uppercase, always exits on first try.
    if (rnd(100) > 50) {
      str = metal[rnd(metal.length)];
      wsType = "wand";
    } else {
      str = wood[rnd(wood.length)];
      wsType = "staff";
    }
    g.ws_made[i] = str[0].toLowerCase() + str.slice(1);
    g.ws_type[i] = wsType;
    g.ws_know[i] = false;
    g.ws_guess[i] = null;
    if (i > 0) {
      g.ws_magic[i].mi_prob += g.ws_magic[i-1].mi_prob;
    }
  }
}

function isUpperFirst(s) {
  return s && s[0] >= 'A' && s[0] <= 'Z';
}
