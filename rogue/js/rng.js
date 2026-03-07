/**
 * rng.js — Seeded RNG for Rogue 3.6 JS port
 *
 * macOS rand() uses the Park-Miller (Lehmer) generator:
 *   next = (seed * 16807) % 2147483647
 *   return next & 0x7fff
 *
 * Verified: srand(42) -> rand() = 705894 raw, 705894 & 0x7fff = 17766
 * which matches session seed42.json step 0 rng[0] = 17766.
 */

import { game } from './gstate.js';

const M = 2147483647; // 2^31 - 1

let _seed = 0;

export function srand(s) {
  _seed = (s | 0) >>> 0;
  if (_seed === 0) _seed = 1; // Park-Miller seed must be nonzero
}

// Park-Miller: next = (seed * 16807) % (2^31-1)
// JS loses precision with 32-bit int * 16807 if seed is large, so use BigInt
export function rand() {
  // Use BigInt for the multiplication to avoid precision loss
  _seed = Number(BigInt(_seed) * 16807n % 2147483647n);
  // Log the low 15 bits for parity testing (matches session JSON format)
  const g = game();
  if (g && g.rawRngLog) g.rawRngLog.push(_seed & 0x7fff);
  return _seed;  // Return FULL value (used by rnd() for modulo)
}

export function getRngSeed() { return _seed; }
export function setRngSeed(s) { _seed = Number(s) >>> 0; if (_seed === 0) _seed = 1; }

// rnd(range): 0 to range-1
// C: rand() % range — uses full Park-Miller value, NOT masked to 15 bits
export function rnd(range) {
  return range === 0 ? 0 : rand() % range;
}

// roll(n, s): sum of n dice of s sides (1..s each)
export function roll(number, sides) {
  let dtotal = 0;
  while (number--) dtotal += rnd(sides) + 1;
  return dtotal;
}
