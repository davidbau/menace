/**
 * Test for Gehennom demon lair level generation
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { resetLevelState, getLevelState } from '../../js/sp_lev.js';
import { generate as generateAsmodeus } from '../../js/levels/asmodeus.js';
import { generate as generateBaalz } from '../../js/levels/baalz.js';
import { generate as generateJuiblex } from '../../js/levels/juiblex.js';
import { generate as generateOrcus } from '../../js/levels/orcus.js';
import { initRng } from '../../js/rng.js';
import { STONE, ROOM, VWALL, TRWALL, CORR } from '../../js/config.js';

describe('Demon lair level generation', () => {
    before(() => {
        initRng(1);
    });

    it('should generate Asmodeus lair with correct terrain', () => {
        resetLevelState();
        generateAsmodeus();

        const state = getLevelState();
        const map = state.map;

        assert.ok(map, 'Map should be created');

        let wallCount = 0;
        let roomCount = 0;

        for (let x = 0; x < 80; x++) {
            for (let y = 0; y < 21; y++) {
                const typ = map.locations[x][y].typ;
                if (typ >= VWALL && typ <= TRWALL) wallCount++;
                if (typ === ROOM || typ === CORR) roomCount++;
            }
        }

        assert.ok(wallCount > 40, `Should have walls (found ${wallCount})`);
        assert.ok(roomCount > 80, `Should have room cells (found ${roomCount})`);
    });

    it('should place Asmodeus demon lord', () => {
        resetLevelState();
        initRng(1);
        generateAsmodeus();

        const state = getLevelState();
        const map = state.map;

        // Check for Asmodeus
        const asmodeus = map.monsters.find(m => m.id === 'Asmodeus');
        assert.ok(asmodeus, 'Asmodeus should be present');

        // Should have multiple monsters
        assert.ok(map.monsters.length >= 6, `Should have monsters (found ${map.monsters.length})`);

        // Should have objects and traps
        assert.ok(map.objects.length >= 8, `Should have objects (found ${map.objects.length})`);
        assert.ok(map.traps.length >= 5, `Should have traps (found ${map.traps.length})`);
    });

    it('should generate Baalzebub lair with correct terrain', () => {
        resetLevelState();
        initRng(2);
        generateBaalz();

        const state = getLevelState();
        const map = state.map;

        assert.ok(map, 'Map should be created');

        let roomCount = 0;
        for (let x = 0; x < 80; x++) {
            for (let y = 0; y < 21; y++) {
                const typ = map.locations[x][y].typ;
                if (typ === ROOM || typ === CORR) roomCount++;
            }
        }

        assert.ok(roomCount > 80, `Should have room cells (found ${roomCount})`);

        // Check for Baalzebub
        const baalz = map.monsters.find(m => m.id === 'Baalzebub');
        assert.ok(baalz, 'Baalzebub should be present');
    });

    it('should generate Juiblex lair with correct terrain', () => {
        resetLevelState();
        initRng(3);
        generateJuiblex();

        const state = getLevelState();
        const map = state.map;

        assert.ok(map, 'Map should be created');

        let roomCount = 0;
        for (let x = 0; x < 80; x++) {
            for (let y = 0; y < 21; y++) {
                const typ = map.locations[x][y].typ;
                if (typ === ROOM || typ === CORR) roomCount++;
            }
        }

        assert.ok(roomCount > 80, `Should have room cells (found ${roomCount})`);

        // Check for Juiblex
        const juiblex = map.monsters.find(m => m.id === 'Juiblex');
        assert.ok(juiblex, 'Juiblex should be present');

        // Juiblex has many slimes
        assert.ok(map.monsters.length >= 25, `Should have many monsters (found ${map.monsters.length})`);
    });

    it('should generate Orcus lair with correct terrain', () => {
        resetLevelState();
        initRng(4);
        generateOrcus();

        const state = getLevelState();
        const map = state.map;

        assert.ok(map, 'Map should be created');

        let roomCount = 0;
        for (let x = 0; x < 80; x++) {
            for (let y = 0; y < 21; y++) {
                const typ = map.locations[x][y].typ;
                if (typ === ROOM || typ === CORR) roomCount++;
            }
        }

        assert.ok(roomCount > 80, `Should have room cells (found ${roomCount})`);

        // Check for Orcus
        const orcus = map.monsters.find(m => m.id === 'Orcus');
        assert.ok(orcus, 'Orcus should be present');

        // Orcus has many undead
        assert.ok(map.monsters.length >= 15, `Should have many monsters (found ${map.monsters.length})`);
    });
});
