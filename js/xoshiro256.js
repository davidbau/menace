/**
 * xoshiro256** PRNG implementation to match Lua 5.4's math.random
 *
 * C ref: Lua 5.4 uses xoshiro256** for math.random()
 * NetHack's Lua themed room reservoir sampling uses math.random (invisible to RNG logger)
 * This must be seeded identically to C's Lua to produce the same themed room selections
 *
 * Algorithm: https://prng.di.unimi.it/xoshiro256starstar.c
 */

import { envFlag } from './runtime_env.js';

let s0 = 0n;
let s1 = 0n;
let s2 = 0n;
let s3 = 0n;

/**
 * Seed the xoshiro256** state with four 64-bit values
 * C ref: Lua seeds from system entropy, but NetHack should seed from MT state
 *
 * @param {bigint} seed0 - First 64-bit seed value
 * @param {bigint} seed1 - Second 64-bit seed value
 * @param {bigint} seed2 - Third 64-bit seed value
 * @param {bigint} seed3 - Fourth 64-bit seed value
 */
export function seedXoshiro(seed0, seed1, seed2, seed3) {
    s0 = BigInt.asUintN(64, seed0);
    s1 = BigInt.asUintN(64, seed1);
    s2 = BigInt.asUintN(64, seed2);
    s3 = BigInt.asUintN(64, seed3);
}

/**
 * Rotate left operation for 64-bit values
 * @param {bigint} x - Value to rotate
 * @param {number} k - Number of bits to rotate
 * @returns {bigint} - Rotated value
 */
function rotl(x, k) {
    const n = BigInt(k);
    return BigInt.asUintN(64, (x << n) | (x >> (64n - n)));
}

/**
 * Generate next random number (0.0 to 1.0, excluding 1.0)
 * Matches Lua 5.4's math.random() behavior
 *
 * @returns {number} - Random number in [0, 1)
 */
export function xoshiroRandom() {
    const result = xoshiroNext();
    // Convert to double in [0, 1) range
    // Lua 5.4 uses the high 53 bits: (result >> 11) * (1.0 / (1 << 53))
    const shifted = result >> 11n;
    return Number(shifted) * (1.0 / 9007199254740992.0); // 2^53
}

/**
 * Generate random integer in [low, high] matching Lua 5.4's math.random(low, high).
 * C ref: lmathlib.c math_random() + project() — rejection sampling for unbiased range.
 *
 * @param {number} low - Lower bound (inclusive)
 * @param {number} high - Upper bound (inclusive)
 * @returns {number} - Random integer in [low, high]
 */
export function xoshiroRandomInt(low, high) {
    const n = BigInt(high - low); // range = high - low
    let ran = xoshiroNext();
    // C ref: lmathlib.c project() — unbiased projection into [0, n]
    if ((n & (n + 1n)) === 0n) {
        // n+1 is power of 2 — no bias
        ran = ran & n;
    } else {
        let lim = n;
        lim |= (lim >> 1n);
        lim |= (lim >> 2n);
        lim |= (lim >> 4n);
        lim |= (lim >> 8n);
        lim |= (lim >> 16n);
        lim |= (lim >> 32n);
        while ((ran & lim) > n) {
            ran = xoshiroNext();
        }
        ran = ran & lim;
    }
    return Number(ran) + low;
}

/**
 * Get current state for debugging
 * @returns {object} - Current state
 */
export function getXoshiroState() {
    return {
        s0: s0.toString(16),
        s1: s1.toString(16),
        s2: s2.toString(16),
        s3: s3.toString(16)
    };
}

/**
 * Seed xoshiro from main NetHack RNG seed
 * C ref: Lua's math.random might be seeded from the main game seed, not MT init
 *
 * @param {number} seed - Main RNG seed (e.g., 163)
 */
/**
 * Seed xoshiro256** matching Lua 5.4's math.randomseed(seed) behavior.
 * C ref: lmathlib.c setseed() — sets state[0]=n1, state[1]=0xff,
 * state[2]=n2, state[3]=0, then advances 16 times to mix.
 *
 * When called as math.randomseed(seed) with one argument: n1=seed, n2=0.
 *
 * @param {number|bigint} seed - The game seed (same as NETHACK_SEED)
 */
export function seedFromMainRng(seed) {
    const DEBUG = envFlag('DEBUG_XOSHIRO');
    const n1 = BigInt.asUintN(64, BigInt(seed));
    const n2 = 0n;

    // C ref: lmathlib.c setseed()
    s0 = n1;
    s1 = BigInt.asUintN(64, 0xffn);
    s2 = n2;
    s3 = 0n;

    // Advance 16 times to spread seed (matches C's setseed warmup)
    for (let i = 0; i < 16; i++) {
        xoshiroNext();
    }

    if (DEBUG) {
        console.log(`[xoshiro] Seeded from game seed: ${seed}`);
        console.log('[xoshiro] State after warmup:', getXoshiroState());
    }
}

/**
 * Raw xoshiro256** advance (returns the 64-bit result, doesn't convert to float).
 * Used by setseed warmup and by xoshiroRandom.
 */
function xoshiroNext() {
    const result = BigInt.asUintN(64, rotl(s1 * 5n, 7) * 9n);
    const t = BigInt.asUintN(64, s1 << 17n);
    s2 ^= s0;
    s3 ^= s1;
    s1 ^= s2;
    s0 ^= s3;
    s2 ^= t;
    s3 = rotl(s3, 45);
    // Keep all state values in 64-bit range
    s0 = BigInt.asUintN(64, s0);
    s1 = BigInt.asUintN(64, s1);
    s2 = BigInt.asUintN(64, s2);
    s3 = BigInt.asUintN(64, s3);
    return result;
}

/**
 * Simple SplitMix64 generator for seeding xoshiro from a single 64-bit value
 * C ref: Common pattern for seeding xoshiro from a single seed
 */
function splitmix64(seed) {
    const results = [];
    let state = BigInt.asUintN(64, seed);

    for (let i = 0; i < 4; i++) {
        state = BigInt.asUintN(64, state + 0x9e3779b97f4a7c15n);
        let z = state;
        z = BigInt.asUintN(64, (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n);
        z = BigInt.asUintN(64, (z ^ (z >> 27n)) * 0x94d049bb133111ebn);
        results.push(BigInt.asUintN(64, z ^ (z >> 31n)));
    }

    return results;
}

/**
 * Seed xoshiro from NetHack MT initialization
 *
 * C ref: When Lua is initialized, math.random is seeded from system entropy or MT state
 * For NetHack, we need to seed from the MT19937 state to get deterministic results
 *
 * The MT initialization calls (30 total) set up the MT state:
 * - rn2(1000), rn2(1001), rn2(1002), rn2(1003), rn2(1004)
 * - rn2(1010)
 * - rn2(1012)
 * - rn2(1014) through rn2(1036)
 *
 * We'll use the first 4 values to create 64-bit seeds
 *
 * @param {number[]} mtInitValues - Array of rn2 results from MT init
 */
export function seedFromMT(mtInitValues) {
    if (mtInitValues.length < 30) {
        console.warn(`seedFromMT: got ${mtInitValues.length} values, expected 30`);
    }

    const DEBUG = envFlag('DEBUG_XOSHIRO');

    // Try creating a hash from ALL 30 MT values
    // This might better match how Lua initializes from full MT state
    let hash = 0n;
    for (let i = 0; i < mtInitValues.length && i < 30; i++) {
        hash = BigInt.asUintN(64, hash * 31n + BigInt(mtInitValues[i]));
    }

    // Use SplitMix64 on the hash to generate 4 seeds
    const seeds = splitmix64(hash);
    const seed0 = seeds[0];
    const seed1 = seeds[1];
    const seed2 = seeds[2];
    const seed3 = seeds[3];

    seedXoshiro(seed0, seed1, seed2, seed3);

    if (DEBUG) {
        console.log('\n[xoshiro] Seeded from MT init values (direct):', mtInitValues.slice(0, 4));
        console.log('[xoshiro] Seeds:', [seed0, seed1, seed2, seed3].map(s => s.toString()));
        console.log('[xoshiro] State:', getXoshiroState());
    }
}
