/**
 * Unit tests for delay.js (animation timing)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { delay_output, skipAnimationDelays, getAnimationDelay } from '../../js/delay.js';

describe('delay.js', () => {
    describe('delay_output', () => {
        it('should delay for approximately 50ms', async () => {
            const start = Date.now();
            await delay_output();
            const elapsed = Date.now() - start;
            
            // Allow 10ms tolerance for timing
            assert.ok(elapsed >= 45 && elapsed <= 60, 
                     `Expected ~50ms, got ${elapsed}ms`);
        });

        it('should skip delays when SKIP_ANIMATION_DELAYS is set', async () => {
            skipAnimationDelays(true);
            
            const start = Date.now();
            await delay_output();
            const elapsed = Date.now() - start;
            
            // Should be nearly instant (< 5ms)
            assert.ok(elapsed < 5, `Expected <5ms with skip, got ${elapsed}ms`);
            
            skipAnimationDelays(false);
        });

        it('should use custom delay time', async () => {
            const start = Date.now();
            await delay_output(100);
            const elapsed = Date.now() - start;
            
            assert.ok(elapsed >= 95 && elapsed <= 110,
                     `Expected ~100ms, got ${elapsed}ms`);
        });
    });

    describe('getAnimationDelay', () => {
        it('should return default 50ms', () => {
            assert.strictEqual(getAnimationDelay(), 50);
        });
    });
});
