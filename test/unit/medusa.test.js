/**
 * Test for Medusa's Island level generation
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { resetLevelState, getLevelState } from '../../js/sp_lev.js';
import { generate as generateMedusa } from '../../js/levels/medusa.js';
import { initRng } from '../../js/rng.js';
import { STONE, ROOM, VWALL, TRWALL, MOAT } from '../../js/config.js';

describe('Medusa level generation', () => {
    before(() => {
        initRng(1);
    });

    it('should generate the map with correct terrain', () => {
        resetLevelState();
        generateMedusa();

        const state = getLevelState();
        const map = state.map;

        assert.ok(map, 'Map should be created');

        let wallCount = 0;
        let roomCount = 0;
        let moatCount = 0;
        let objectCount = 0;
        let trapCount = 0;

        for (let x = 0; x < 80; x++) {
            for (let y = 0; y < 21; y++) {
                const typ = map.locations[x][y].typ;
                if (typ >= VWALL && typ <= TRWALL) wallCount++;
                if (typ === ROOM) roomCount++;
                if (typ === MOAT) moatCount++;
            }
        }
        objectCount = map.objects.length;
        trapCount = map.traps.length;

        assert.ok(wallCount > 30, `Should have walls (found ${wallCount})`);
        assert.ok(roomCount > 50, `Should have room cells (found ${roomCount})`);
        assert.ok(moatCount > 1000, `Should have extensive moat (found ${moatCount})`);
        // Perseus statue + 7 empty statues + 8 random objects
        assert.ok(objectCount >= 15, `Should have objects (found ${objectCount})`);
        // 5 random + 2 board traps (some may collide)
        assert.ok(trapCount >= 5, `Should have traps (found ${trapCount})`);
    });

    it('should place Medusa and water monsters', () => {
        resetLevelState();
        initRng(1);
        generateMedusa();

        const state = getLevelState();
        const map = state.map;

        // Check for monsters - Medusa + 8 positioned + 10 random
        const monsterCount = map.monsters.length;
        assert.ok(monsterCount >= 18, `Should have multiple monsters (found ${monsterCount})`);

        // Check that Medusa is at the correct position
        const medusa = map.monsters.find(m => m.id === 'Medusa');
        assert.ok(medusa, 'Medusa should be present');
        assert.equal(medusa.x, 36, 'Medusa X position');
        assert.equal(medusa.y, 10, 'Medusa Y position');
        assert.equal(medusa.asleep, 1, 'Medusa should be asleep');
    });
});
