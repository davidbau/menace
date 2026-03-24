/**
 * rng.js — Seeded RNG for Rogue 3.6 JS port
 *
 * Matches the RN macro from rogue.h in RoguelikeRestorationProject/rogue3.6:
 *   #define RN (((seed = seed*11109+13849) & 0x7fff) >> 1)
 *
 * This is a Linear Congruential Generator with:
 *   multiplier = 11109
 *   increment  = 13849
 *   mask       = 0x7fff (15 bits)
 *   shift      = >> 1 (14-bit output: 0-16383)
 *
 * rnd(range) = abs(RN) % range
 */

import { game } from './gstate.js';

let _seed = 0;

export function srand(s) {
  _seed = s | 0;
}

// RN macro: LCG step, mask to 15 bits, right-shift by 1
function RN() {
  _seed = (_seed * 11109 + 13849) | 0; // 32-bit integer overflow via |0
  return (_seed & 0x7fff) >> 1;
}

export function rand() {
  const val = RN();
  const g = game();
  if (g && g.rawRngLog) g.rawRngLog.push(val);
  return val;
}

export function getRngSeed() { return _seed; }
export function setRngSeed(s) { _seed = s | 0; }

// rnd(range): 0 to range-1
// C: abs(RN) % range
export function rnd(range) {
  if (range === 0) return 0;
  const result = Math.abs(RN()) % range;
  const g = game();
  if (g && g.rawRngLog) g.rawRngLog.push(result);
  return result;
}

// roll(n, s): sum of n dice of s sides (1..s each)
export function roll(number, sides) {
  let dtotal = 0;
  while (number--) dtotal += rnd(sides) + 1;
  return dtotal;
}
