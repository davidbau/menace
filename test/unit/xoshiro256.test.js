/**
 * Unit tests for xoshiro256** PRNG matching Lua 5.4's math.random behavior.
 *
 * These reference values are computed from Lua 5.4's lmathlib.c setseed/nextrand
 * algorithm. Once C is recompiled with the math.randomseed(NETHACK_SEED) patch,
 * these values can be verified against actual Lua output.
 *
 * Algorithm:
 *   setseed(n1, n2=0): state = [n1, 0xff, n2, 0], advance 16 times
 *   nextrand: xoshiro256** (rotl(s1*5, 7)*9, then state update)
 *   math.random(): I2d(nextrand) -> float in [0, 1)
 *   math.random(a, b): project(I2UInt(nextrand), b-a) + a
 */

import { seedFromMainRng, xoshiroRandom, xoshiroRandomInt, getXoshiroState } from '../../js/xoshiro256.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('xoshiro256** seeding', () => {
    it('seedFromMainRng(33) produces deterministic state', () => {
        seedFromMainRng(33);
        const state = getXoshiroState();
        // State after setseed(33, 0) + 16 warmup advances
        assert.equal(state.s0, 'b8c6eed1fc13d96');
        assert.equal(state.s1, '9bf8e18275b01cb7');
        assert.equal(state.s2, '853363bddc6dedf');
        assert.equal(state.s3, 'f3df689c2d4269b6');
    });

    it('seedFromMainRng(0) produces deterministic state', () => {
        seedFromMainRng(0);
        const state = getXoshiroState();
        assert.equal(state.s0, 'c4e5dc5a2a80f13a');
        assert.equal(state.s1, 'ca305206fdc9963b');
    });

    it('same seed produces same sequence', () => {
        seedFromMainRng(42);
        const a = [xoshiroRandom(), xoshiroRandom(), xoshiroRandom()];
        seedFromMainRng(42);
        const b = [xoshiroRandom(), xoshiroRandom(), xoshiroRandom()];
        assert.deepEqual(a, b);
    });

    it('different seeds produce different sequences', () => {
        seedFromMainRng(1);
        const a = xoshiroRandom();
        seedFromMainRng(2);
        const b = xoshiroRandom();
        assert.notEqual(a, b);
    });
});

describe('xoshiroRandom() float output', () => {
    it('produces values in [0, 1)', () => {
        seedFromMainRng(100);
        for (let i = 0; i < 1000; i++) {
            const v = xoshiroRandom();
            assert.ok(v >= 0 && v < 1, `value ${v} out of range`);
        }
    });

    it('seed 33 first value matches reference', () => {
        seedFromMainRng(33);
        const v = xoshiroRandom();
        // Reference: 0.374297579745438
        assert.ok(Math.abs(v - 0.374297579745438) < 1e-15);
    });
});

describe('xoshiroRandomInt() integer range', () => {
    it('randomInt(50, 99) with seed 33 matches reference', () => {
        seedFromMainRng(33);
        const values = [];
        for (let i = 0; i < 5; i++) values.push(xoshiroRandomInt(50, 99));
        // Reference values from Lua 5.4 math.randomseed(33); math.random(50,99)
        assert.deepEqual(values, [95, 78, 89, 54, 65]);
    });

    it('randomInt(1, 6) stays in range', () => {
        seedFromMainRng(77);
        for (let i = 0; i < 1000; i++) {
            const v = xoshiroRandomInt(1, 6);
            assert.ok(v >= 1 && v <= 6, `value ${v} out of range [1,6]`);
        }
    });

    it('randomInt with power-of-2 range', () => {
        // Range [0, 7] has n=7, n+1=8 is power of 2 -> fast path
        seedFromMainRng(33);
        for (let i = 0; i < 100; i++) {
            const v = xoshiroRandomInt(0, 7);
            assert.ok(v >= 0 && v <= 7, `value ${v} out of range [0,7]`);
        }
    });

    it('randomInt(0, 99) for percent() equivalent', () => {
        seedFromMainRng(33);
        for (let i = 0; i < 100; i++) {
            const v = xoshiroRandomInt(0, 99);
            assert.ok(v >= 0 && v <= 99, `value ${v} out of range [0,99]`);
        }
    });
});
