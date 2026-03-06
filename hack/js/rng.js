// C ref: rnd.c — seeded random number generator
// Uses glibc LCG: seed = seed * 1103515245 + 12345; return (seed >> 16) & 0x7fff
import { game } from './gstate.js';

// Advance the LCG seed one step and return the raw 15-bit value (0..32767)
function rand() {
  // Must use 32-bit arithmetic. JavaScript uses 64-bit floats so we force 32-bit.
  // (seed * 1103515245 + 12345) truncated to 32 bits, then >> 16 & 0x7fff
  const lo = (game.rngSeed & 0xffff) * 1103515245;
  const hi = (game.rngSeed >>> 16)   * 1103515245;
  let next = ((hi << 16) + lo + 12345) | 0;
  game.rngSeed = next >>> 0;  // keep as unsigned 32-bit
  return (game.rngSeed >> 16) & 0x7fff;
}

// C ref: rn1(x,y) — returns rand()%x + y
// Range: [y, y+x-1]
export function rn1(x, y) {
  const v = rand() % x + y;
  if (game.rngLog) game.rngLog.push({ fn: 'rn1', x, y, v });
  return v;
}

// C ref: rn2(x) — returns rand()%x
// Range: [0, x-1]
export function rn2(x) {
  const v = rand() % x;
  if (game.rngLog) game.rngLog.push({ fn: 'rn2', x, v });
  return v;
}

// C ref: rnd(x) — returns rand()%x + 1
// Range: [1, x]
export function rnd(x) {
  const v = rand() % x + 1;
  if (game.rngLog) game.rngLog.push({ fn: 'rnd', x, v });
  return v;
}

// C ref: d(n,x) — sum of n rolls of rnd(x)
export function d(n, x) {
  let tmp = 0;
  for (let i = 0; i < n; i++) tmp += rand() % x + 1;
  if (game.rngLog) game.rngLog.push({ fn: 'd', n, x, v: tmp });
  return tmp;
}

// Seed the RNG — called once at game start
export function seedRng(seed) {
  game.rngSeed = seed >>> 0;
}
