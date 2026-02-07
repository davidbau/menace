// rng.js -- Random number generation
// Mirrors rnd.c from the C source.
// Uses xoshiro128** for the PRNG (see DECISIONS.md #8).

let state = new Uint32Array(4);

// Initialize the PRNG with a seed
// C ref: rnd.c:42 init_isaac64()
export function initRng(seed) {
    // Use SplitMix32 to initialize state from a single seed
    // (standard practice for xoshiro family)
    let s = seed >>> 0;
    for (let i = 0; i < 4; i++) {
        s += 0x9e3779b9;
        s = s >>> 0;
        let z = s;
        z = (z ^ (z >>> 16)) >>> 0;
        z = Math.imul(z, 0x85ebca6b) >>> 0;
        z = (z ^ (z >>> 13)) >>> 0;
        z = Math.imul(z, 0xc2b2ae35) >>> 0;
        z = (z ^ (z >>> 16)) >>> 0;
        state[i] = z;
    }
}

// xoshiro128** core
function nextRaw() {
    const result = (Math.imul(rotl(Math.imul(state[1], 5), 7), 9)) >>> 0;
    const t = (state[1] << 9) >>> 0;
    state[2] ^= state[0];
    state[3] ^= state[1];
    state[1] ^= state[2];
    state[0] ^= state[3];
    state[2] ^= t;
    state[3] = rotl(state[3], 11);
    return result;
}

function rotl(x, k) {
    return ((x << k) | (x >>> (32 - k))) >>> 0;
}

// 0 <= rn2(x) < x
// C ref: rnd.c:93-107
export function rn2(x) {
    if (x <= 0) return 0;
    return nextRaw() % x;
}

// 1 <= rnd(x) <= x
// C ref: rnd.c:153-165
export function rnd(x) {
    if (x <= 0) return 1;
    return (nextRaw() % x) + 1;
}

// rn1(x, y) = rnd(x) + y - 1 = rn2(x) + y
// Used extensively in C code: rn1(x,y) means random in [y, y+x-1]
// C ref: global.h macro
export function rn1(x, y) {
    return rn2(x) + y;
}

// rnl(x) - luck-adjusted random, good luck approaches 0
// C ref: rnd.c:109-151
export function rnl(x, luck = 0) {
    if (x <= 0) return 0;
    let adjustment = luck;
    if (x <= 15) {
        adjustment = Math.floor((Math.abs(adjustment) + 1) / 3) * Math.sign(adjustment);
    }
    let i = rn2(x);
    if (adjustment && rn2(37 + Math.abs(adjustment))) {
        i -= adjustment;
        if (i < 0) i = 0;
        else if (i >= x) i = x - 1;
    }
    return i;
}

// d(n, x) = sum of n rolls of rnd(x)
// C ref: rnd.c:173+ (d() function)
export function d(n, x) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
        sum += rnd(x);
    }
    return sum;
}

// Initialize with a random seed by default
initRng(Math.floor(Math.random() * 0xFFFFFFFF));
