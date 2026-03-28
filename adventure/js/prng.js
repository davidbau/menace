// prng.js - LCG PRNG for Colossal Cave Adventure
//
// Ported from open-adventure 2.5 (main.c / misc.c)
// Parameters: a=1093, c=221587, m=1048576
// Faithful port of set_seed, get_next_lcg_value, randrange.

export class AdventurePRNG {
  constructor() {
    this.a = 1093;
    this.c = 221587;
    this.m = 1048576;
    this.x = 0;
  }

  /** Set seed, clamped to mod m. */
  setSeed(v) {
    this.x = ((v % this.m) + this.m) % this.m;
  }

  /** Return current value, then iterate. Matches get_next_lcg_value(). */
  next() {
    const old = this.x;
    this.x = (this.a * this.x + this.c) % this.m;
    return old;
  }

  /** Return random integer in [0, range). Matches randrange(). */
  range(n) {
    return Math.floor(n * this.next() / this.m);
  }

  /** Return true with probability n%. Matches PCT(). */
  pct(n) {
    return this.range(100) < n;
  }
}
