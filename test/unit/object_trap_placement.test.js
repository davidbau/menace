/**
 * Test for object and trap placement in special levels
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { resetLevelState, getLevelState, des, finalize_level } from '../../js/sp_lev.js';
import { initRng } from '../../js/rng.js';
import { BOULDER, SCR_EARTH } from '../../js/objects.js';
import { PIT } from '../../js/config.js';

describe('Object and trap placement', () => {
    before(() => {
        initRng(42);
    });

    it('should place named objects at specific coordinates', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        des.level_flags('noflip');

        // Place some boulders
        await des.object('boulder', 10, 5);
        await des.object('boulder', 15, 8);
        await des.object('boulder', 20, 12);

        await finalize_level();

        const state = getLevelState();
        const map = state.map;

        // Check that objects were created
        assert.equal(map.objects.length, 3, 'Should have 3 objects');

        // Check boulder at (10, 5)
        const obj1 = map.objects.find(o => o.ox === 10 && o.oy === 5);
        assert.ok(obj1, 'Should have object at (10, 5)');
        assert.equal(obj1.otyp, BOULDER, 'Object should be a boulder');

        // Check boulder at (15, 8)
        const obj2 = map.objects.find(o => o.ox === 15 && o.oy === 8);
        assert.ok(obj2, 'Should have object at (15, 8)');
        assert.equal(obj2.otyp, BOULDER, 'Object should be a boulder');
    });

    it('should place scroll of earth', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        des.level_flags('noflip');

        await des.object('scroll of earth', 5, 10);

        await finalize_level();

        const state = getLevelState();
        const map = state.map;

        const scroll = map.objects.find(o => o.ox === 5 && o.oy === 10);
        assert.ok(scroll, 'Should have scroll at (5, 10)');
        assert.equal(scroll.otyp, SCR_EARTH, 'Object should be scroll of earth');
    });

    it('should place traps at specific coordinates', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.' });
        des.level_flags('noflip');

        // Place some pit traps
        await des.trap('pit', 10, 5);
        await des.trap('pit', 12, 5);
        await des.trap('pit', 14, 5);

        await finalize_level();

        const state = getLevelState();
        const map = state.map;

        // Check that traps were created
        assert.equal(map.traps.length, 3, 'Should have 3 traps');

        // Check pit at (10, 5)
        const trap1 = map.trapAt(10, 5);
        assert.ok(trap1, 'Should have trap at (10, 5)');
        assert.equal(trap1.ttyp, PIT, 'Trap should be a pit');

        // Check pit at (12, 5)
        const trap2 = map.trapAt(12, 5);
        assert.ok(trap2, 'Should have trap at (12, 5)');
        assert.equal(trap2.ttyp, PIT, 'Trap should be a pit');
    });

    it('should not place duplicate traps at same location', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.' });
        des.level_flags('noflip');

        // Try to place two traps at same spot
        await des.trap('pit', 10, 5);
        await des.trap('pit', 10, 5); // Should be ignored

        await finalize_level();

        const state = getLevelState();
        const map = state.map;

        assert.equal(map.traps.length, 1, 'Should only have 1 trap');
    });

    it('should handle multiple objects and traps like Sokoban', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        des.level_flags('noflip');

        // Simulate Sokoban-like placement
        // Boulders
        await des.object('boulder', 2, 2);
        await des.object('boulder', 2, 3);
        await des.object('boulder', 10, 2);

        // Scrolls
        await des.object('scroll of earth', 2, 11);
        await des.object('scroll of earth', 3, 11);

        // Pit traps
        await des.trap('pit', 3, 6);
        await des.trap('pit', 4, 6);
        await des.trap('pit', 5, 6);

        await finalize_level();

        const state = getLevelState();
        const map = state.map;

        assert.equal(map.objects.length, 5, 'Should have 5 objects');
        assert.equal(map.traps.length, 3, 'Should have 3 traps');

        // Check boulders
        const boulders = map.objects.filter(o => o.otyp === BOULDER);
        assert.equal(boulders.length, 3, 'Should have 3 boulders');

        // Check scrolls
        const scrolls = map.objects.filter(o => o.otyp === SCR_EARTH);
        assert.equal(scrolls.length, 2, 'Should have 2 scrolls of earth');

        // Check pits
        const pits = map.traps.filter(t => t.ttyp === PIT);
        assert.equal(pits.length, 3, 'Should have 3 pit traps');
    });
});
