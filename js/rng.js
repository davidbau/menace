// rng.js -- Random number generation
// Faithful port of rnd.c from the C source.
// Uses ISAAC64 PRNG for exact C compatibility.
// C ref: rnd.c, isaac64.c

import { isaac64_init, isaac64_next_uint64 } from './isaac64.js';

let ctx = null; // ISAAC64 context

// Initialize the PRNG with a seed (unsigned long, up to 64 bits)
// C ref: rnd.c init_isaac64() -- converts seed to little-endian bytes
export function initRng(seed) {
    // Convert seed to BigInt, then to 8 little-endian bytes
    // C ref: rnd.c init_isaac64() -- sizeof(unsigned long) = 8 on 64-bit Linux
    let s = BigInt(seed) & 0xFFFFFFFFFFFFFFFFn;
    const bytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
        bytes[i] = Number(s & 0xFFn);
        s >>= 8n;
    }
    ctx = isaac64_init(bytes);
}

// Raw 64-bit value, modulo x -- matches C's RND(x) macro
// C ref: rnd.c RND() = isaac64_next_uint64() % x
function RND(x) {
    const raw = isaac64_next_uint64(ctx);
    return Number(raw % BigInt(x));
}

// 0 <= rn2(x) < x
// C ref: rnd.c:93-107
export function rn2(x) {
    if (x <= 0) return 0;
    return RND(x);
}

// 1 <= rnd(x) <= x
// C ref: rnd.c:153-165
export function rnd(x) {
    if (x <= 0) return 1;
    return RND(x) + 1;
}

// rn1(x, y) = rn2(x) + y -- random in [y, y+x-1]
// C ref: hack.h macro
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
    let i = RND(x);
    if (adjustment && rn2(37 + Math.abs(adjustment))) {
        i -= adjustment;
        if (i < 0) i = 0;
        else if (i >= x) i = x - 1;
    }
    return i;
}

// d(n, x) = NdX dice roll = n + sum of n RND(x) calls
// C ref: rnd.c:173-188
export function d(n, x) {
    // C: tmp = n; while(n--) tmp += RND(x); return tmp;
    let tmp = n;
    for (let i = 0; i < n; i++) {
        tmp += RND(x);
    }
    return tmp;
}

// Return the raw ISAAC64 context (for save/restore)
export function getRngState() {
    return ctx;
}

// Restore ISAAC64 context (for save/restore)
export function setRngState(savedCtx) {
    ctx = savedCtx;
}

// Initialize with a random seed by default
initRng(Math.floor(Math.random() * 0xFFFFFFFF));
