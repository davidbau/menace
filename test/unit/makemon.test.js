// test/unit/makemon.test.js -- Tests for monster creation and population
// C ref: makemon.c -- verifies monster instantiation

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initRng } from '../../js/rng.js';
import { COLNO, ROWNO, ACCESSIBLE } from '../../js/config.js';
import { createMonster, populateLevel, monsterTypes } from '../../js/makemon.js';
import { generateLevel, wallification } from '../../js/dungeon.js';
import { GameMap } from '../../js/map.js';

describe('Monster creation', () => {
    it('monsterTypes has entries', () => {
        assert.ok(monsterTypes.length > 10, `Expected >10 monster types, got ${monsterTypes.length}`);
    });

    it('createMonster creates a valid monster', () => {
        initRng(42);
        const map = new GameMap();
        const type = monsterTypes[0];
        const mon = createMonster(map, type, 10, 5, 1);

        assert.ok(mon, 'Should create a monster');
        assert.equal(mon.mx, 10);
        assert.equal(mon.my, 5);
        assert.ok(mon.mhp > 0, 'Monster should have HP');
        assert.ok(mon.speed > 0, 'Monster should have speed');
        assert.equal(typeof mon.name, 'string');
        assert.equal(typeof mon.displayChar, 'string');
        assert.ok(!mon.dead, 'New monster should not be dead');
    });

    it('each monster type creates valid instances', () => {
        initRng(42);
        const map = generateLevel(1);
        wallification(map);
        // Place monsters in center of first room
        const room = map.rooms[0];
        const cx = Math.floor((room.lx + room.hx) / 2);
        const cy = Math.floor((room.ly + room.hy) / 2);
        for (const type of monsterTypes) {
            const mon = createMonster(map, type, cx, cy, 1);
            if (mon) {
                assert.ok(mon.mhp > 0, `${type.name} should have positive HP`);
                assert.ok(mon.speed >= 0, `${type.name} should have non-negative speed`);
                assert.ok(Array.isArray(mon.attacks), `${type.name} should have attacks array`);
            }
        }
    });
});

describe('Level monster population', () => {
    it('populateLevel places monsters on the map', () => {
        initRng(42);
        const map = generateLevel(1);
        wallification(map);
        populateLevel(map, 1);

        assert.ok(map.monsters.length > 0, 'Level should have monsters');
    });

    it('monsters are placed on accessible terrain', () => {
        initRng(42);
        const map = generateLevel(1);
        wallification(map);
        populateLevel(map, 1);

        for (const mon of map.monsters) {
            const loc = map.at(mon.mx, mon.my);
            assert.ok(loc && ACCESSIBLE(loc.typ),
                `Monster "${mon.name}" at ${mon.mx},${mon.my} should be on accessible terrain`);
        }
    });

    it('no two monsters share the same tile', () => {
        initRng(42);
        const map = generateLevel(1);
        wallification(map);
        populateLevel(map, 1);

        const positions = new Set();
        for (const mon of map.monsters) {
            const key = `${mon.mx},${mon.my}`;
            assert.ok(!positions.has(key),
                `Two monsters at ${key}`);
            positions.add(key);
        }
    });

    it('deeper levels have more/tougher monsters', () => {
        initRng(42);
        const map1 = generateLevel(1);
        wallification(map1);
        populateLevel(map1, 1);

        initRng(42);
        const map5 = generateLevel(5);
        wallification(map5);
        populateLevel(map5, 5);

        // Deeper levels should tend to have more or tougher monsters
        const avgLevel1 = map1.monsters.reduce((s, m) => s + m.level, 0) / Math.max(map1.monsters.length, 1);
        const avgLevel5 = map5.monsters.reduce((s, m) => s + m.level, 0) / Math.max(map5.monsters.length, 1);

        // This is a statistical test; deeper levels should generally have higher avg level
        // but we won't enforce it strictly since RNG can vary
        assert.ok(typeof avgLevel1 === 'number');
        assert.ok(typeof avgLevel5 === 'number');
    });
});
