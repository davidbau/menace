// test/unit/rng.test.js -- Tests for the random number generator
// C ref: rnd.c -- verifies rn2, rnd, rn1, d match expected behavior

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initRng, rn2, rnd, rn1, d } from '../../js/rng.js';

describe('RNG module', () => {
    it('rn2(n) returns values in [0, n)', () => {
        initRng(42);
        for (let i = 0; i < 1000; i++) {
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
        for (let i = 0; i < 1000; i++) {
            const val = rnd(6);
            assert.ok(val >= 1 && val <= 6, `rnd(6) returned ${val}`);
        }
    });

    it('rn1(x, y) returns values in [y, y+x-1]', () => {
        initRng(42);
        for (let i = 0; i < 1000; i++) {
            const val = rn1(5, 3); // should be 3-7
            assert.ok(val >= 3 && val <= 7, `rn1(5,3) returned ${val}`);
        }
    });

    it('d(n, x) returns values in [n, n*x]', () => {
        initRng(42);
        for (let i = 0; i < 1000; i++) {
            const val = d(2, 6); // 2d6: 2-12
            assert.ok(val >= 2 && val <= 12, `d(2,6) returned ${val}`);
        }
    });

    it('rn2 with same seed produces same sequence', () => {
        initRng(12345);
        const seq1 = Array.from({length: 20}, () => rn2(100));
        initRng(12345);
        const seq2 = Array.from({length: 20}, () => rn2(100));
        assert.deepEqual(seq1, seq2);
    });

    it('different seeds produce different sequences', () => {
        initRng(1);
        const seq1 = Array.from({length: 20}, () => rn2(100));
        initRng(2);
        const seq2 = Array.from({length: 20}, () => rn2(100));
        assert.notDeepEqual(seq1, seq2);
    });

    it('distribution is roughly uniform', () => {
        initRng(42);
        const counts = new Array(10).fill(0);
        const n = 10000;
        for (let i = 0; i < n; i++) {
            counts[rn2(10)]++;
        }
        // Each bucket should get roughly n/10 = 1000 ± 200
        for (let i = 0; i < 10; i++) {
            assert.ok(counts[i] > 700 && counts[i] < 1300,
                `Bucket ${i} has ${counts[i]} -- expected ~1000`);
        }
    });
});
