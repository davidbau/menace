/**
 * Test for Vlad's Tower levels generation
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { resetLevelState, getLevelState } from '../../js/sp_lev.js';
import { generate as generateTower1 } from '../../js/levels/tower1.js';
import { generate as generateTower2 } from '../../js/levels/tower2.js';
import { generate as generateTower3 } from '../../js/levels/tower3.js';
import { initRng } from '../../js/rng.js';
import { STONE, ROOM, HWALL, VWALL, TRWALL } from '../../js/config.js';

describe('Vlad\'s Tower level generation', () => {
    before(() => {
        initRng(42);
    });

    it('should generate tower1 (upper stage) with correct terrain', () => {
        resetLevelState();
        generateTower1();

        const state = getLevelState();
        const map = state.map;

        assert.ok(map, 'Map should be created');

        let wallCount = 0;
        let roomCount = 0;
        let objectCount = 0;

        for (let x = 0; x < 80; x++) {
            for (let y = 0; y < 21; y++) {
                const typ = map.locations[x][y].typ;
                if (typ >= HWALL && typ <= TRWALL) wallCount++;
                if (typ === ROOM) roomCount++;
            }
        }
        objectCount = map.objects.length;

        assert.ok(wallCount > 50, `Should have walls (found ${wallCount})`);
        assert.ok(roomCount > 20, `Should have room cells (found ${roomCount})`);
        assert.equal(objectCount, 7, 'Should have 7 chests (1 + 6 niches)');
    });

    it('should generate tower2 (middle stage) with correct terrain', () => {
        resetLevelState();
        initRng(42);
        generateTower2();

        const state = getLevelState();
        const map = state.map;

        assert.ok(map, 'Map should be created');

        let objectCount = map.objects.length;

        // Tower2 has: 2 chests, 1 water walking boots, 1 crystal plate mail, 1 spellbook
        assert.ok(objectCount >= 4, `Should have multiple objects (found ${objectCount})`);
    });

    it('should generate tower3 (entry) with correct terrain', () => {
        resetLevelState();
        initRng(42);
        generateTower3();

        const state = getLevelState();
        const map = state.map;

        assert.ok(map, 'Map should be created');

        let objectCount = map.objects.length;
        let trapCount = map.traps.length;
        const objectIds = new Set(map.objects.map((o) => o.id).filter(Boolean));

        // Tower3 guarantees 4 scripted trapped objects. Extra objects may be
        // generated as trap victims depending on random trap type selection.
        assert.ok(objectCount >= 4, `Should have at least 4 objects (found ${objectCount})`);
        assert.equal(trapCount, 4, 'Should have 4 traps (one per object)');
        assert.ok(objectIds.has('long sword'), 'Should include scripted long sword');
        assert.ok(objectIds.has('lock pick'), 'Should include scripted lock pick');
        assert.ok(objectIds.has('elven cloak'), 'Should include scripted elven cloak');
        assert.ok(objectIds.has('blindfold'), 'Should include scripted blindfold');
    });

    it('should shuffle niches randomly in tower1', () => {
        // Generate tower1 with two different seeds and verify chest positions differ
        resetLevelState();
        initRng(1);
        generateTower1();
        const map1 = getLevelState().map;
        const positions1 = map1.objects.map(o => `${o.ox},${o.oy}`).join(';');

        resetLevelState();
        initRng(2);
        generateTower1();
        const map2 = getLevelState().map;
        const positions2 = map2.objects.map(o => `${o.ox},${o.oy}`).join(';');

        // With different seeds, shuffled positions should differ
        assert.notEqual(positions1, positions2, 'Chest positions should vary with different seeds');
    });
});
