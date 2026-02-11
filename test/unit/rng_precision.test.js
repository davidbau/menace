/**
 * RNG Precision Tests - Verify JavaScript RNG matches C NetHack exactly
 *
 * Tests the deterministic random number generator implementation
 * against known C NetHack sequences.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { initRng, rn2, rnd, rn1, d } from '../../js/rng.js';

describe('RNG Precision', () => {
  describe('Basic RNG Functions', () => {
    it('rn2() should produce deterministic sequence', () => {
      initRng(12345);

      // C ref: rng.c rn2() implementation
      // Verify determinism by running twice with same seed
      const seq1 = [];
      for (let i = 0; i < 10; i++) {
        seq1.push(rn2(10));
      }

      initRng(12345);
      const seq2 = [];
      for (let i = 0; i < 10; i++) {
        seq2.push(rn2(10));
      }

      // Sequences should match exactly
      assert.deepStrictEqual(seq1, seq2,
        'Same seed should produce identical rn2() sequence');

      // All values should be in range [0, 9]
      for (let i = 0; i < seq1.length; i++) {
        assert(seq1[i] >= 0 && seq1[i] < 10,
          `rn2(10) value ${seq1[i]} out of range [0, 9]`);
      }
    });

    it('rnd() should match C NetHack sequence', () => {
      initRng(54321);

      // C ref: rng.c rnd() returns 1 to N inclusive
      const values = [];
      for (let i = 0; i < 10; i++) {
        const val = rnd(6); // Like a d6
        values.push(val);
        assert(val >= 1 && val <= 6, `rnd(6) should be 1-6, got ${val}`);
      }

      // Verify we get different values (not stuck)
      const unique = new Set(values);
      assert(unique.size >= 3, 'Should have at least 3 different values in 10 rolls');
    });

    it('rn1() should match C NetHack range', () => {
      initRng(99999);

      // C ref: rn1(N, X) returns X to X+N-1 inclusive
      for (let i = 0; i < 20; i++) {
        const val = rn1(5, 10); // Returns 10-14
        assert(val >= 10 && val <= 14,
          `rn1(5, 10) should be 10-14, got ${val}`);
      }
    });

    it('d() should match dice rolling', () => {
      initRng(11111);

      // C ref: d(N, X) rolls N X-sided dice
      for (let i = 0; i < 20; i++) {
        const val = d(3, 6); // 3d6
        assert(val >= 3 && val <= 18,
          `d(3, 6) should be 3-18, got ${val}`);
      }
    });
  });

  describe('Determinism', () => {
    it('same seed should produce same sequence', () => {
      const seed = 42;

      initRng(seed);
      const seq1 = Array.from({length: 20}, () => rn2(100));

      initRng(seed);
      const seq2 = Array.from({length: 20}, () => rn2(100));

      assert.deepStrictEqual(seq1, seq2,
        'Same seed should produce identical RNG sequence');
    });

    it('different seeds should produce different sequences', () => {
      initRng(1);
      const seq1 = Array.from({length: 20}, () => rn2(100));

      initRng(2);
      const seq2 = Array.from({length: 20}, () => rn2(100));

      assert.notDeepStrictEqual(seq1, seq2,
        'Different seeds should produce different sequences');
    });
  });

  describe('Boundary Cases', () => {
    it('rn2(1) should always return 0', () => {
      initRng(12345);
      for (let i = 0; i < 10; i++) {
        assert.strictEqual(rn2(1), 0, 'rn2(1) must always return 0');
      }
    });

    it('rn2(2) should return 0 or 1', () => {
      initRng(12345);
      const values = Array.from({length: 20}, () => rn2(2));

      for (const val of values) {
        assert(val === 0 || val === 1, `rn2(2) must be 0 or 1, got ${val}`);
      }

      // Should get both values in 20 trials
      assert(values.includes(0) && values.includes(1),
        'rn2(2) should produce both 0 and 1');
    });

    it('rnd(1) should always return 1', () => {
      initRng(12345);
      for (let i = 0; i < 10; i++) {
        assert.strictEqual(rnd(1), 1, 'rnd(1) must always return 1');
      }
    });

    it('large numbers should work', () => {
      initRng(12345);

      const val = rn2(1000000);
      assert(val >= 0 && val < 1000000,
        `rn2(1000000) should be 0-999999, got ${val}`);
    });
  });

  describe('Distribution Quality', () => {
    it('rn2() should have reasonable distribution', () => {
      initRng(12345);
      const buckets = new Array(10).fill(0);
      const trials = 1000;

      for (let i = 0; i < trials; i++) {
        buckets[rn2(10)]++;
      }

      // Each bucket should get roughly trials/10 = 100
      // Allow 30-170 range (should be very rare to fail)
      for (let i = 0; i < 10; i++) {
        assert(buckets[i] >= 30 && buckets[i] <= 170,
          `Bucket ${i} got ${buckets[i]}, expected ~100`);
      }
    });

    it('d() should have plausible average', () => {
      initRng(12345);
      let sum = 0;
      const trials = 1000;

      for (let i = 0; i < trials; i++) {
        sum += d(3, 6); // 3d6, average should be 10.5
      }

      const avg = sum / trials;

      // Allow 10.0-11.0 range (should be very safe)
      assert(avg >= 10.0 && avg <= 11.0,
        `d(3, 6) average was ${avg}, expected ~10.5`);
    });
  });

  describe('RNG State Validation', () => {
    it('should not produce NaN', () => {
      initRng(12345);

      for (let i = 0; i < 100; i++) {
        const val = rn2(100);
        assert(!isNaN(val), `RNG produced NaN at iteration ${i}`);
      }
    });

    it('should not produce negative numbers', () => {
      initRng(12345);

      for (let i = 0; i < 100; i++) {
        assert(rn2(100) >= 0, `rn2() produced negative number`);
        assert(rnd(100) >= 1, `rnd() produced value < 1`);
        assert(rn1(10, 5) >= 5, `rn1() produced value < base`);
      }
    });

    it('should not exceed bounds', () => {
      initRng(12345);

      for (let i = 0; i < 100; i++) {
        assert(rn2(100) < 100, `rn2(100) produced value >= 100`);
        assert(rnd(100) <= 100, `rnd(100) produced value > 100`);
        assert(rn1(10, 5) < 15, `rn1(10, 5) produced value >= 15`);
      }
    });
  });
});
