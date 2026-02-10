/**
 * Unit tests for animations.js (tmp_at system)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { 
    DISP_BEAM, DISP_FLASH, DISP_END, DISP_TETHER, BACKTRACK,
    initAnimations, tmp_at 
} from '../../js/animations.js';

// Mock display for testing
class MockDisplay {
    constructor() {
        this.tempGlyphs = new Map(); // Map of "x,y" -> glyph
        this.redrawn = new Set();    // Set of "x,y" positions
        this.flushCount = 0;
    }

    showTempGlyph(x, y, glyph) {
        this.tempGlyphs.set(`${x},${y}`, glyph);
    }

    redraw(x, y) {
        this.redrawn.add(`${x},${y}`);
        this.tempGlyphs.delete(`${x},${y}`);
    }

    flush() {
        this.flushCount++;
    }

    hasGlyph(x, y) {
        return this.tempGlyphs.has(`${x},${y}`);
    }

    getGlyph(x, y) {
        return this.tempGlyphs.get(`${x},${y}`);
    }

    clear() {
        this.tempGlyphs.clear();
        this.redrawn.clear();
        this.flushCount = 0;
    }
}

describe('animations.js', () => {
    let display;

    beforeEach(() => {
        display = new MockDisplay();
        initAnimations(display);
    });

    describe('DISP_FLASH mode', () => {
        it('should display glyph at single position', () => {
            const glyph = 100;
            
            tmp_at(DISP_FLASH, glyph);
            tmp_at(10, 5);
            
            assert.strictEqual(display.hasGlyph(10, 5), true);
            assert.strictEqual(display.getGlyph(10, 5), glyph);
        });

        it('should erase previous position when showing new one', () => {
            const glyph = 100;
            
            tmp_at(DISP_FLASH, glyph);
            tmp_at(10, 5);
            tmp_at(11, 5);
            
            assert.strictEqual(display.hasGlyph(10, 5), false);
            assert.strictEqual(display.hasGlyph(11, 5), true);
            assert.ok(display.redrawn.has('10,5'));
        });

        it('should cleanup on DISP_END', () => {
            const glyph = 100;
            
            tmp_at(DISP_FLASH, glyph);
            tmp_at(10, 5);
            tmp_at(DISP_END, 0);
            
            assert.strictEqual(display.hasGlyph(10, 5), false);
            assert.ok(display.redrawn.has('10,5'));
        });
    });

    describe('DISP_BEAM mode', () => {
        it('should save all positions', () => {
            const glyph = 200;
            
            tmp_at(DISP_BEAM, glyph);
            tmp_at(10, 5);
            tmp_at(11, 5);
            tmp_at(12, 5);
            
            assert.strictEqual(display.hasGlyph(10, 5), true);
            assert.strictEqual(display.hasGlyph(11, 5), true);
            assert.strictEqual(display.hasGlyph(12, 5), true);
        });

        it('should erase all positions on DISP_END', () => {
            const glyph = 200;
            
            tmp_at(DISP_BEAM, glyph);
            tmp_at(10, 5);
            tmp_at(11, 5);
            tmp_at(12, 5);
            tmp_at(DISP_END, 0);
            
            assert.strictEqual(display.hasGlyph(10, 5), false);
            assert.strictEqual(display.hasGlyph(11, 5), false);
            assert.strictEqual(display.hasGlyph(12, 5), false);
            assert.ok(display.redrawn.has('10,5'));
            assert.ok(display.redrawn.has('11,5'));
            assert.ok(display.redrawn.has('12,5'));
        });
    });

    describe('nested animations', () => {
        it('should support nested tmp_at calls', () => {
            tmp_at(DISP_FLASH, 100);
            tmp_at(10, 5);
            
            tmp_at(DISP_BEAM, 200);
            tmp_at(20, 10);
            tmp_at(21, 10);
            tmp_at(DISP_END, 0);
            
            // First animation should still be active
            assert.strictEqual(display.hasGlyph(10, 5), true);
            
            tmp_at(DISP_END, 0);
            
            // Now both should be cleaned up
            assert.strictEqual(display.hasGlyph(10, 5), false);
        });
    });
});
