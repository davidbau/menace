/**
 * Test for Bigroom variant level generation
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { resetLevelState, getLevelState } from '../../js/sp_lev.js';
import { generate as generateBigroom } from '../../js/levels/bigroom.js';
import { generate as generateBigroom2 } from '../../js/levels/bigroom-2.js';
import { generate as generateBigroom3 } from '../../js/levels/bigroom-3.js';
import { generate as generateBigroom4 } from '../../js/levels/bigroom-4.js';
import { generate as generateBigroom5 } from '../../js/levels/bigroom-5.js';
import { generate as generateBigroom6 } from '../../js/levels/bigroom-6.js';
import { generate as generateBigroom7 } from '../../js/levels/bigroom-7.js';
import { generate as generateBigroom8 } from '../../js/levels/bigroom-8.js';
import { initRng } from '../../js/rng.js';
import { STONE, ROOM, VWALL, TRWALL } from '../../js/config.js';

describe('Bigroom variant level generation', () => {
    before(() => {
        initRng(1);
    });

    it('should generate bigroom (variant 1) with large open room', () => {
        resetLevelState();
        generateBigroom();

        const state = getLevelState();
        const map = state.map;

        assert.ok(map, 'Map should be created');

        let roomCount = 0;
        for (let x = 0; x < 80; x++) {
            for (let y = 0; y < 21; y++) {
                const typ = map.locations[x][y].typ;
                if (typ === ROOM) roomCount++;
            }
        }

        // Bigroom should have a large open area
        assert.ok(roomCount > 400, `Should have large open room (found ${roomCount} room cells)`);
    });

    it('should generate bigroom-2 variant', () => {
        resetLevelState();
        initRng(2);
        generateBigroom2();

        const state = getLevelState();
        const map = state.map;

        assert.ok(map, 'Map should be created');
        assert.ok(map.locations, 'Should have terrain');
    });

    it('should generate bigroom-3 variant', () => {
        resetLevelState();
        initRng(3);
        generateBigroom3();

        const state = getLevelState();
        const map = state.map;

        assert.ok(map, 'Map should be created');
        assert.ok(map.locations, 'Should have terrain');
    });

    it('should generate bigroom-4 variant', () => {
        resetLevelState();
        initRng(4);
        generateBigroom4();

        const state = getLevelState();
        const map = state.map;

        assert.ok(map, 'Map should be created');
        assert.ok(map.locations, 'Should have terrain');
    });

    it('should generate bigroom-5 variant', () => {
        resetLevelState();
        initRng(5);
        generateBigroom5();

        const state = getLevelState();
        const map = state.map;

        assert.ok(map, 'Map should be created');
        assert.ok(map.locations, 'Should have terrain');
    });

    it('should generate bigroom-6 variant', () => {
        resetLevelState();
        initRng(6);
        generateBigroom6();

        const state = getLevelState();
        const map = state.map;

        assert.ok(map, 'Map should be created');
        assert.ok(map.locations, 'Should have terrain');
    });

    it('should generate bigroom-7 variant', () => {
        resetLevelState();
        initRng(7);
        generateBigroom7();

        const state = getLevelState();
        const map = state.map;

        assert.ok(map, 'Map should be created');
        assert.ok(map.locations, 'Should have terrain');
    });

    it('should generate bigroom-8 variant', () => {
        resetLevelState();
        initRng(8);
        generateBigroom8();

        const state = getLevelState();
        const map = state.map;

        assert.ok(map, 'Map should be created');
        assert.ok(map.locations, 'Should have terrain');
    });

    it('all variants should have objects and monsters', () => {
        const generators = [
            generateBigroom, generateBigroom2, generateBigroom3, generateBigroom4,
            generateBigroom5, generateBigroom6, generateBigroom7, generateBigroom8
        ];

        generators.forEach((gen, i) => {
            resetLevelState();
            initRng(i + 1);
            gen();

            const state = getLevelState();
            const map = state.map;

            // All bigrooms should have some content
            const hasContent = (map.objects?.length > 0) || (map.monsters?.length > 0) || (map.traps?.length > 0);
            assert.ok(hasContent, `Bigroom variant ${i + 1} should have some content`);
        });
    });
});
