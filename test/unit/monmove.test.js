// test/unit/monmove.test.js -- Tests for monster movement AI
// C ref: monmove.c -- verifies monster movement behavior

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initRng } from '../../js/rng.js';
import { COLNO, ROWNO, ROOM, STONE, HWALL } from '../../js/config.js';
import { GameMap } from '../../js/map.js';
import { moveMonsters } from '../../js/monmove.js';
import { Player } from '../../js/player.js';

// Mock display
const mockDisplay = { putstr_message() {} };

// Create a simple open room map
function makeSimpleMap() {
    const map = new GameMap();
    // Make a 20x10 room
    for (let x = 10; x < 30; x++) {
        for (let y = 5; y < 15; y++) {
            map.at(x, y).typ = ROOM;
        }
    }
    // Add walls around
    for (let x = 9; x <= 30; x++) {
        map.at(x, 4).typ = HWALL;
        map.at(x, 15).typ = HWALL;
    }
    return map;
}

describe('Monster movement', () => {
    it('hostile monsters move toward player', () => {
        initRng(42);
        const map = makeSimpleMap();
        const player = new Player();
        player.x = 20; player.y = 10;
        player.initRole(0);

        // Place a hostile monster far from player
        const mon = {
            name: 'test monster',
            mx: 15, my: 10,
            mhp: 10, mhpmax: 10,
            ac: 8, level: 1,
            speed: 12, movement: 12,
            attacks: [[0, 0, 1, 4]],
            dead: false, sleeping: false,
            confused: false, peaceful: false,
            tame: false, flee: false,
        };
        map.monsters.push(mon);

        const startDist = Math.abs(mon.mx - player.x) + Math.abs(mon.my - player.y);
        moveMonsters(map, player, mockDisplay);
        const endDist = Math.abs(mon.mx - player.x) + Math.abs(mon.my - player.y);

        assert.ok(endDist <= startDist,
            `Monster should move toward player: dist ${startDist} -> ${endDist}`);
    });

    it('sleeping monsters do not move', () => {
        initRng(42);
        const map = makeSimpleMap();
        const player = new Player();
        player.x = 20; player.y = 10;
        player.initRole(0);

        const mon = {
            name: 'sleeper',
            mx: 12, my: 10,
            mhp: 10, mhpmax: 10,
            ac: 8, level: 1,
            speed: 12, movement: 12,
            attacks: [],
            dead: false, sleeping: true,
            confused: false, peaceful: false,
            tame: false, flee: false,
        };
        map.monsters.push(mon);

        const startX = mon.mx, startY = mon.my;
        moveMonsters(map, player, mockDisplay);

        // Sleeping monster far from player should stay put
        assert.equal(mon.mx, startX);
        assert.equal(mon.my, startY);
    });

    it('dead monsters are removed', () => {
        const map = makeSimpleMap();
        const player = new Player();
        player.x = 20; player.y = 10;
        player.initRole(0);

        map.monsters.push({
            name: 'dead one',
            mx: 12, my: 10,
            mhp: 0, mhpmax: 10,
            ac: 8, level: 1,
            speed: 12, movement: 0,
            attacks: [],
            dead: true, sleeping: false,
            confused: false, peaceful: false,
            tame: false, flee: false,
        });

        assert.equal(map.monsters.length, 1);
        moveMonsters(map, player, mockDisplay);
        assert.equal(map.monsters.length, 0, 'Dead monsters should be removed');
    });

    it('monsters do not move through walls', () => {
        initRng(42);
        const map = makeSimpleMap();
        const player = new Player();
        player.x = 20; player.y = 10;
        player.initRole(0);

        // Place a wall between monster and player
        for (let y = 5; y < 15; y++) {
            map.at(17, y).typ = HWALL;
        }

        const mon = {
            name: 'blocked',
            mx: 15, my: 10,
            mhp: 10, mhpmax: 10,
            ac: 8, level: 1,
            speed: 12, movement: 12,
            attacks: [[0, 0, 1, 4]],
            dead: false, sleeping: false,
            confused: false, peaceful: false,
            tame: false, flee: false,
        };
        map.monsters.push(mon);

        moveMonsters(map, player, mockDisplay);

        // Monster should not have passed through the wall
        assert.ok(mon.mx <= 16 || mon.mx >= 18,
            `Monster at ${mon.mx} should not be on wall at x=17`);
    });
});
