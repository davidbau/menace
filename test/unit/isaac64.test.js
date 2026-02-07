// test/unit/isaac64.test.js -- Tests for ISAAC64 PRNG C compatibility
// Verifies that our JS ISAAC64 produces identical output to the C version.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { isaac64_init, isaac64_next_uint64 } from '../../js/isaac64.js';
import { initRng, rn2, rnd, rn1, d } from '../../js/rng.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const goldenDir = join(__dirname, '..', 'comparison', 'golden');

// Helper: create ISAAC64 context from a numeric seed (matching C init_isaac64)
function seedIsaac(seed) {
    let s = BigInt(seed) & 0xFFFFFFFFFFFFFFFFn;
    const bytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
        bytes[i] = Number(s & 0xFFn);
        s >>= 8n;
    }
    return isaac64_init(bytes);
}

// Parse golden reference file: each line is "hex_uint64 rn2_100_value"
function loadGolden(filename) {
    const text = readFileSync(join(goldenDir, filename), 'utf-8');
    return text.trim().split('\n').map(line => {
        const [hex, mod100] = line.trim().split(/\s+/);
        return { raw: BigInt('0x' + hex), mod100: parseInt(mod100) };
    });
}

describe('ISAAC64 C compatibility', () => {
    it('seed=42: raw uint64 values match C reference (500 values)', () => {
        const golden = loadGolden('isaac64_seed42.txt');
        const ctx = seedIsaac(42);
        for (let i = 0; i < golden.length; i++) {
            const raw = isaac64_next_uint64(ctx);
            assert.equal(raw, golden[i].raw,
                `Value ${i}: JS=${raw.toString(16)} C=${golden[i].raw.toString(16)}`);
        }
    });

    it('seed=0: raw uint64 values match C reference (500 values)', () => {
        const golden = loadGolden('isaac64_seed0.txt');
        const ctx = seedIsaac(0);
        for (let i = 0; i < golden.length; i++) {
            const raw = isaac64_next_uint64(ctx);
            assert.equal(raw, golden[i].raw,
                `Value ${i}: JS=${raw.toString(16)} C=${golden[i].raw.toString(16)}`);
        }
    });

    it('seed=1000000: raw uint64 values match C reference (500 values)', () => {
        const golden = loadGolden('isaac64_seed1000000.txt');
        const ctx = seedIsaac(1000000);
        for (let i = 0; i < golden.length; i++) {
            const raw = isaac64_next_uint64(ctx);
            assert.equal(raw, golden[i].raw,
                `Value ${i}: JS=${raw.toString(16)} C=${golden[i].raw.toString(16)}`);
        }
    });

    it('seed=max_uint64: raw uint64 values match C reference (500 values)', () => {
        const golden = loadGolden('isaac64_seedmax.txt');
        const ctx = seedIsaac(0xFFFFFFFFFFFFFFFFn);
        for (let i = 0; i < golden.length; i++) {
            const raw = isaac64_next_uint64(ctx);
            assert.equal(raw, golden[i].raw,
                `Value ${i}: JS=${raw.toString(16)} C=${golden[i].raw.toString(16)}`);
        }
    });

    it('rn2(100) values match C reference', () => {
        const golden = loadGolden('isaac64_seed42.txt');
        const ctx = seedIsaac(42);
        for (let i = 0; i < golden.length; i++) {
            const raw = isaac64_next_uint64(ctx);
            const mod100 = Number(raw % 100n);
            assert.equal(mod100, golden[i].mod100,
                `rn2(100) at index ${i}: JS=${mod100} C=${golden[i].mod100}`);
        }
    });
});

describe('RNG module with ISAAC64', () => {
    it('rn2 produces values matching C when seeded identically', () => {
        initRng(42);
        const golden = loadGolden('isaac64_seed42.txt');
        for (let i = 0; i < 100; i++) {
            const val = rn2(100);
            assert.equal(val, golden[i].mod100,
                `rn2(100) call ${i}: JS=${val} C=${golden[i].mod100}`);
        }
    });

    it('rn2(n) returns values in [0, n)', () => {
        initRng(99);
        for (let i = 0; i < 500; i++) {
            const val = rn2(10);
            assert.ok(val >= 0 && val < 10, `rn2(10) returned ${val}`);
        }
    });

    it('rn2(1) always returns 0', () => {
        initRng(42);
        for (let i = 0; i < 100; i++) {
            assert.equal(rn2(1), 0);
        }
    });

    it('rnd(n) returns values in [1, n]', () => {
        initRng(42);
        for (let i = 0; i < 500; i++) {
            const val = rnd(6);
            assert.ok(val >= 1 && val <= 6, `rnd(6) returned ${val}`);
        }
    });

    it('rn1(x, y) returns values in [y, y+x-1]', () => {
        initRng(42);
        for (let i = 0; i < 200; i++) {
            const val = rn1(5, 3);
            assert.ok(val >= 3 && val <= 7, `rn1(5,3) returned ${val}`);
        }
    });

    it('d(n, x) returns values in [n, n*x]', () => {
        initRng(42);
        for (let i = 0; i < 200; i++) {
            const val = d(2, 6);
            assert.ok(val >= 2 && val <= 12, `d(2,6) returned ${val}`);
        }
    });

    it('same seed produces same sequence', () => {
        initRng(12345);
        const seq1 = [];
        for (let i = 0; i < 50; i++) seq1.push(rn2(1000));

        initRng(12345);
        const seq2 = [];
        for (let i = 0; i < 50; i++) seq2.push(rn2(1000));

        assert.deepEqual(seq1, seq2);
    });

    it('different seeds produce different sequences', () => {
        initRng(42);
        const seq1 = [];
        for (let i = 0; i < 20; i++) seq1.push(rn2(1000));

        initRng(43);
        const seq2 = [];
        for (let i = 0; i < 20; i++) seq2.push(rn2(1000));

        let same = 0;
        for (let i = 0; i < 20; i++) if (seq1[i] === seq2[i]) same++;
        assert.ok(same < 5, `Too many matching values: ${same}/20`);
    });

    it('distribution is roughly uniform', () => {
        initRng(42);
        const n = 10000;
        const buckets = new Array(10).fill(0);
        for (let i = 0; i < n; i++) {
            buckets[rn2(10)]++;
        }
        for (let i = 0; i < 10; i++) {
            assert.ok(buckets[i] > 800 && buckets[i] < 1200,
                `Bucket ${i} has ${buckets[i]} -- expected ~1000`);
        }
    });
});
