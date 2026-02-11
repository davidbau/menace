/**
 * xoshiro256** PRNG implementation to match Lua 5.4's math.random
 *
 * C ref: Lua 5.4 uses xoshiro256** for math.random()
 * NetHack's Lua themed room reservoir sampling uses math.random (invisible to RNG logger)
 * This must be seeded identically to C's Lua to produce the same themed room selections
 *
 * Algorithm: https://prng.di.unimi.it/xoshiro256starstar.c
 */

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
    // xoshiro256** algorithm
    const result = BigInt.asUintN(64, rotl(s1 * 5n, 7) * 9n);
    const t = s1 << 17n;

    s2 ^= s0;
    s3 ^= s1;
    s1 ^= s2;
    s0 ^= s3;
    s2 ^= t;
    s3 = rotl(s3, 45);

    // Convert to double in [0, 1) range
    // Lua 5.4 uses the high 53 bits: (result >> 11) * (1.0 / (1 << 53))
    const shifted = result >> 11n;
    return Number(shifted) * (1.0 / 9007199254740992.0); // 2^53
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

    // Try different seeding strategy: use sequential values with mixing
    // Lua may use a different approach to seed xoshiro from entropy
    // Let's try using values at specific positions mixed with constants
    const v0 = mtInitValues[0] || 0;
    const v1 = mtInitValues[1] || 0;
    const v2 = mtInitValues[2] || 0;
    const v3 = mtInitValues[3] || 0;
    const v4 = mtInitValues[4] || 0;
    const v5 = mtInitValues[5] || 0;
    const v6 = mtInitValues[6] || 0;
    const v7 = mtInitValues[7] || 0;

    // Mix the values to create 64-bit seeds
    // This is experimental - trying to match C's Lua seeding
    const seed0 = (BigInt(v0) << 32n) | BigInt(v1) | (BigInt(v2) << 16n);
    const seed1 = (BigInt(v3) << 32n) | BigInt(v4) | (BigInt(v5) << 16n);
    const seed2 = (BigInt(v6) << 32n) | BigInt(v7) | (BigInt(v0) ^ BigInt(v4));
    const seed3 = (BigInt(v1) << 32n) | (BigInt(v2) ^ BigInt(v6)) | BigInt(v3);

    seedXoshiro(seed0, seed1, seed2, seed3);

    const DEBUG = typeof process !== 'undefined' && process.env.DEBUG_XOSHIRO === '1';
    if (DEBUG) {
        console.log('\n[xoshiro] Seeded from MT init values:', mtInitValues.slice(0, 8));
        console.log('[xoshiro] Seeds: [', seed0.toString(16), seed1.toString(16), seed2.toString(16), seed3.toString(16), ']');
        console.log('[xoshiro] State:', getXoshiroState());
    }
}
