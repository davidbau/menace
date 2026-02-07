// test/unit/map.test.js -- Tests for the game map
// C ref: rm.h, display.h -- verifies GameMap structure and accessors

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COLNO, ROWNO, STONE, ROOM, ACCESSIBLE } from '../../js/config.js';
import { GameMap } from '../../js/map.js';

describe('GameMap', () => {
    it('creates a map with correct dimensions', () => {
        const map = new GameMap();
        assert.ok(map.locations);
        assert.equal(map.locations.length, COLNO);
        assert.equal(map.locations[0].length, ROWNO);
    });

    it('initializes all cells as STONE', () => {
        const map = new GameMap();
        for (let x = 0; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                assert.equal(map.at(x, y).typ, STONE);
            }
        }
    });

    it('at() returns null for out-of-bounds coordinates', () => {
        const map = new GameMap();
        assert.equal(map.at(-1, 0), null);
        assert.equal(map.at(0, -1), null);
        assert.equal(map.at(COLNO, 0), null);
        assert.equal(map.at(0, ROWNO), null);
    });

    it('can modify cell types', () => {
        const map = new GameMap();
        map.at(10, 5).typ = ROOM;
        assert.equal(map.at(10, 5).typ, ROOM);
        assert.ok(ACCESSIBLE(map.at(10, 5).typ));
    });

    it('tracks rooms array', () => {
        const map = new GameMap();
        assert.ok(Array.isArray(map.rooms));
        assert.equal(map.rooms.length, 0);
        map.rooms.push({ lx: 5, ly: 3, hx: 15, hy: 8 });
        assert.equal(map.rooms.length, 1);
    });

    it('tracks monsters array', () => {
        const map = new GameMap();
        assert.ok(Array.isArray(map.monsters));
        map.monsters.push({ mx: 10, my: 5, dead: false });
        assert.equal(map.monsters.length, 1);
    });

    it('monsterAt() finds monsters at coordinates', () => {
        const map = new GameMap();
        const mon = { mx: 10, my: 5, mhp: 10, dead: false };
        map.monsters.push(mon);
        assert.equal(map.monsterAt(10, 5), mon);
        assert.equal(map.monsterAt(11, 5), null);
    });

    it('monsterAt() skips dead monsters', () => {
        const map = new GameMap();
        map.monsters.push({ mx: 10, my: 5, mhp: 0, dead: true });
        assert.equal(map.monsterAt(10, 5), null);
    });

    it('objectsAt() finds objects at coordinates', () => {
        const map = new GameMap();
        map.objects.push({ ox: 10, oy: 5, name: 'dagger' });
        map.objects.push({ ox: 10, oy: 5, name: 'gold piece' });
        map.objects.push({ ox: 20, oy: 5, name: 'armor' });
        const objs = map.objectsAt(10, 5);
        assert.equal(objs.length, 2);
    });

    it('has stair positions', () => {
        const map = new GameMap();
        assert.ok(map.upstair);
        assert.ok(map.dnstair);
        assert.equal(typeof map.upstair.x, 'number');
        assert.equal(typeof map.dnstair.y, 'number');
    });
});
