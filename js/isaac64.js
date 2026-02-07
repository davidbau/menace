// isaac64.js -- ISAAC64 PRNG (public domain)
// Faithful port of nethack-c/src/isaac64.c by Timothy B. Terriberry.
// Uses BigInt for 64-bit unsigned integer arithmetic.
// C ref: isaac64.c, isaac64.h

const MASK = 0xFFFFFFFFFFFFFFFFn;
const SZ_LOG = 8;
const SZ = 256;               // 1 << SZ_LOG
const SEED_SZ_MAX = SZ * 8;   // 2048
const GOLDEN = 0x9E3779B97F4A7C13n;

// Extract SZ_LOG bits starting at bit 3
// C ref: isaac64.c lower_bits()
function lower_bits(x) {
    return Number((x >> 3n) & 0xFFn);
}

// Extract SZ_LOG bits starting at bit SZ_LOG+3 = 11
// C ref: isaac64.c upper_bits()
function upper_bits(y) {
    return Number((y >> 11n) & 0xFFn);
}

// C ref: isaac64.c isaac64_mix()
function isaac64_mix(x) {
    const SHIFT = [9, 9, 23, 15, 14, 20, 17, 14];
    for (let i = 0; i < 8; i++) {
        x[i] = (x[i] - x[(i + 4) & 7]) & MASK;
        x[(i + 5) & 7] ^= x[(i + 7) & 7] >> BigInt(SHIFT[i]);
        x[(i + 7) & 7] = (x[(i + 7) & 7] + x[i]) & MASK;
        i++;
        x[i] = (x[i] - x[(i + 4) & 7]) & MASK;
        x[(i + 5) & 7] ^= (x[(i + 7) & 7] << BigInt(SHIFT[i])) & MASK;
        x[(i + 7) & 7] = (x[(i + 7) & 7] + x[i]) & MASK;
    }
}

// C ref: isaac64.c isaac64_update()
function isaac64_update(ctx) {
    const m = ctx.m;
    const r = ctx.r;
    let a = ctx.a;
    ctx.c = (ctx.c + 1n) & MASK;
    let b = (ctx.b + ctx.c) & MASK;

    // First half: uses m[i + SZ/2]
    for (let i = 0; i < SZ / 2;) {
        let x, y;

        x = m[i];
        a = (((a ^ ((a << 21n) & MASK)) ^ MASK) + m[i + SZ / 2]) & MASK;
        m[i] = y = (m[lower_bits(x)] + a + b) & MASK;
        r[i] = b = (m[upper_bits(y)] + x) & MASK;
        i++;

        x = m[i];
        a = ((a ^ (a >> 5n)) + m[i + SZ / 2]) & MASK;
        m[i] = y = (m[lower_bits(x)] + a + b) & MASK;
        r[i] = b = (m[upper_bits(y)] + x) & MASK;
        i++;

        x = m[i];
        a = ((a ^ ((a << 12n) & MASK)) + m[i + SZ / 2]) & MASK;
        m[i] = y = (m[lower_bits(x)] + a + b) & MASK;
        r[i] = b = (m[upper_bits(y)] + x) & MASK;
        i++;

        x = m[i];
        a = ((a ^ (a >> 33n)) + m[i + SZ / 2]) & MASK;
        m[i] = y = (m[lower_bits(x)] + a + b) & MASK;
        r[i] = b = (m[upper_bits(y)] + x) & MASK;
        i++;
    }

    // Second half: uses m[i - SZ/2]
    for (let i = SZ / 2; i < SZ;) {
        let x, y;

        x = m[i];
        a = (((a ^ ((a << 21n) & MASK)) ^ MASK) + m[i - SZ / 2]) & MASK;
        m[i] = y = (m[lower_bits(x)] + a + b) & MASK;
        r[i] = b = (m[upper_bits(y)] + x) & MASK;
        i++;

        x = m[i];
        a = ((a ^ (a >> 5n)) + m[i - SZ / 2]) & MASK;
        m[i] = y = (m[lower_bits(x)] + a + b) & MASK;
        r[i] = b = (m[upper_bits(y)] + x) & MASK;
        i++;

        x = m[i];
        a = ((a ^ ((a << 12n) & MASK)) + m[i - SZ / 2]) & MASK;
        m[i] = y = (m[lower_bits(x)] + a + b) & MASK;
        r[i] = b = (m[upper_bits(y)] + x) & MASK;
        i++;

        x = m[i];
        a = ((a ^ (a >> 33n)) + m[i - SZ / 2]) & MASK;
        m[i] = y = (m[lower_bits(x)] + a + b) & MASK;
        r[i] = b = (m[upper_bits(y)] + x) & MASK;
        i++;
    }

    ctx.b = b;
    ctx.a = a;
    ctx.n = SZ;
}

// Create a new ISAAC64 context
// C ref: isaac64.c isaac64_init()
export function isaac64_init(seed_bytes) {
    const ctx = {
        a: 0n,
        b: 0n,
        c: 0n,
        n: 0,
        r: new Array(SZ).fill(0n),
        m: new Array(SZ).fill(0n),
    };
    isaac64_reseed(ctx, seed_bytes);
    return ctx;
}

// Mix seed into state and reinitialize
// C ref: isaac64.c isaac64_reseed()
export function isaac64_reseed(ctx, seed_bytes) {
    const m = ctx.m;
    const r = ctx.r;
    let nseed = seed_bytes ? seed_bytes.length : 0;
    if (nseed > SEED_SZ_MAX) nseed = SEED_SZ_MAX;

    // XOR seed bytes into r[] as little-endian uint64s
    let i = 0;
    for (; i < (nseed >> 3); i++) {
        let val = 0n;
        for (let j = 7; j >= 0; j--) {
            val = (val << 8n) | BigInt(seed_bytes[(i << 3) | j]);
        }
        r[i] ^= val;
    }

    // Handle remaining bytes
    const remaining = nseed - (i << 3);
    if (remaining > 0) {
        let ri = BigInt(seed_bytes[i << 3]);
        for (let j = 1; j < remaining; j++) {
            ri |= BigInt(seed_bytes[(i << 3) | j]) << BigInt(j << 3);
        }
        r[i++] ^= ri;
    }

    // Initialize x[] with golden ratio constant
    const x = new Array(8).fill(GOLDEN);

    // 4 rounds of mixing
    for (let k = 0; k < 4; k++) isaac64_mix(x);

    // Mix r[] values into m[]
    for (let k = 0; k < SZ; k += 8) {
        for (let j = 0; j < 8; j++) x[j] = (x[j] + r[k + j]) & MASK;
        isaac64_mix(x);
        for (let j = 0; j < 8; j++) m[k + j] = x[j];
    }

    // Double-mix with m[]
    for (let k = 0; k < SZ; k += 8) {
        for (let j = 0; j < 8; j++) x[j] = (x[j] + m[k + j]) & MASK;
        isaac64_mix(x);
        for (let j = 0; j < 8; j++) m[k + j] = x[j];
    }

    // Generate first batch
    isaac64_update(ctx);
}

// Return next random uint64
// C ref: isaac64.c isaac64_next_uint64()
export function isaac64_next_uint64(ctx) {
    if (!ctx.n) isaac64_update(ctx);
    return ctx.r[--ctx.n];
}
