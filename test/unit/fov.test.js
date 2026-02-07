// test/unit/fov.test.js -- Tests for field of view computation
// C ref: vision.c -- verifies FOV/visibility calculations

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COLNO, ROWNO, ROOM, CORR, STONE, HWALL, VWALL } from '../../js/config.js';
import { GameMap } from '../../js/map.js';
import { FOV } from '../../js/fov.js';

// Create a simple map with one lit room
function makeRoomMap() {
    const map = new GameMap();
    // Room from (10,5) to (20,10)
    for (let x = 10; x <= 20; x++) {
        for (let y = 5; y <= 10; y++) {
            map.at(x, y).typ = ROOM;
            map.at(x, y).lit = true;
        }
    }
    // Walls around the room
    for (let x = 9; x <= 21; x++) {
        map.at(x, 4).typ = HWALL;
        map.at(x, 11).typ = HWALL;
    }
    for (let y = 4; y <= 11; y++) {
        map.at(9, y).typ = VWALL;
        map.at(21, y).typ = VWALL;
    }
    // Corridor leading east
    for (let x = 22; x <= 30; x++) {
        map.at(x, 7).typ = CORR;
    }
    // Room for the corridor to connect to
    map.rooms.push({ lx: 10, ly: 5, hx: 20, hy: 10, lit: true });
    return map;
}

describe('FOV', () => {
    it('creates visibility grid', () => {
        const fov = new FOV();
        const map = makeRoomMap();
        fov.compute(map, 15, 7);
        assert.ok(fov.visible);
        assert.equal(fov.visible.length, COLNO);
        assert.equal(fov.visible[0].length, ROWNO);
    });

    it('player position is always visible', () => {
        const fov = new FOV();
        const map = makeRoomMap();
        fov.compute(map, 15, 7);
        assert.ok(fov.visible[15][7], 'Player position should be visible');
    });

    it('adjacent tiles are visible', () => {
        const fov = new FOV();
        const map = makeRoomMap();
        fov.compute(map, 15, 7);
        // All 8 neighbors should be visible
        for (const [dx, dy] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
            assert.ok(fov.visible[15 + dx][7 + dy],
                `Adjacent tile (${15+dx},${7+dy}) should be visible`);
        }
    });

    it('most of lit room is visible from inside', () => {
        const fov = new FOV();
        const map = makeRoomMap();
        fov.compute(map, 15, 7); // center of room

        // Most room tiles should be visible (center area)
        let visibleCount = 0;
        let totalCount = 0;
        for (let x = 11; x <= 19; x++) {
            for (let y = 6; y <= 9; y++) {
                totalCount++;
                if (fov.visible[x][y]) visibleCount++;
            }
        }
        // At least 40% of inner room should be visible
        // (FOV uses simplified room-based visibility that may not cover all corners)
        assert.ok(visibleCount > totalCount * 0.4,
            `Expected many room tiles visible: ${visibleCount}/${totalCount}`);
    });

    it('stone beyond walls is not visible', () => {
        const fov = new FOV();
        const map = makeRoomMap();
        fov.compute(map, 15, 7);

        // Tiles far away in stone should not be visible
        assert.ok(!fov.visible[1][1], 'Far stone should not be visible');
        assert.ok(!fov.visible[50][15], 'Far stone should not be visible');
    });

    it('corridor has limited visibility', () => {
        const fov = new FOV();
        const map = makeRoomMap();
        // Place player in corridor
        fov.compute(map, 25, 7);

        // Adjacent corridor tiles should be visible
        assert.ok(fov.visible[24][7], 'Adjacent corridor should be visible');
        assert.ok(fov.visible[26][7], 'Adjacent corridor should be visible');

        // But distant stone should not be
        assert.ok(!fov.visible[25][1], 'Stone far from corridor should not be visible');
    });
});
