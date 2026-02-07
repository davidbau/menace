// test/unit/mkobj.test.js -- Tests for object creation and level population
// C ref: mkobj.c -- verifies object instantiation

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initRng } from '../../js/rng.js';
import { COLNO, ROWNO, ACCESSIBLE } from '../../js/config.js';
import { createObject, populateObjects, objectTypes,
         WEAPON_CLASS, ARMOR_CLASS, FOOD_CLASS, COIN_CLASS } from '../../js/mkobj.js';
import { generateLevel, wallification } from '../../js/dungeon.js';

describe('Object creation', () => {
    it('createObject creates object with type properties', () => {
        const type = objectTypes.find(t => t.name === 'dagger');
        assert.ok(type, 'dagger type should exist');

        const obj = createObject(type, 10, 5);
        assert.equal(obj.name, 'dagger');
        assert.equal(obj.oc_class, WEAPON_CLASS);
        assert.equal(obj.ox, 10);
        assert.equal(obj.oy, 5);
        assert.ok(obj.damage, 'Weapon should have damage');
        assert.ok(obj.weight > 0, 'Object should have weight');
    });

    it('createObject with null type picks random', () => {
        initRng(42);
        const obj = createObject(null, 5, 5);
        assert.ok(obj.name, 'Random object should have a name');
        assert.ok(typeof obj.oc_class === 'number');
    });

    it('createObject sets correct display properties', () => {
        const type = objectTypes.find(t => t.name === 'food ration');
        const obj = createObject(type, 10, 5);
        assert.equal(obj.displayChar, '%');
        assert.ok(typeof obj.displayColor === 'number');
    });

    it('wand objects get charges', () => {
        initRng(42);
        const type = objectTypes.find(t => t.name === 'wand of striking');
        assert.ok(type, 'wand of striking type should exist');

        const obj = createObject(type, 10, 5);
        assert.ok(obj.charges > 0, 'Wand should have charges');
    });

    it('stackable items have stackable flag', () => {
        const type = objectTypes.find(t => t.name === 'arrow');
        assert.ok(type, 'arrow type should exist');
        const obj = createObject(type, 10, 5);
        assert.ok(obj.stackable, 'Arrow should be stackable');
    });

    it('armor has AC value', () => {
        const type = objectTypes.find(t => t.name === 'leather armor');
        const obj = createObject(type, 10, 5);
        assert.ok(obj.ac > 0, 'Armor should have AC value');
    });

    it('food has nutrition value', () => {
        const type = objectTypes.find(t => t.name === 'food ration');
        const obj = createObject(type, 10, 5);
        assert.equal(obj.nutrition, 800, 'Food ration should have 800 nutrition');
    });
});

describe('Level object population', () => {
    it('populateObjects places objects on the map', () => {
        initRng(42);
        const map = generateLevel(1);
        wallification(map);
        populateObjects(map, 1);

        assert.ok(map.objects.length > 0, 'Level should have objects');
    });

    it('objects are placed on accessible terrain', () => {
        initRng(42);
        const map = generateLevel(1);
        wallification(map);
        populateObjects(map, 1);

        for (const obj of map.objects) {
            const loc = map.at(obj.ox, obj.oy);
            assert.ok(loc && ACCESSIBLE(loc.typ),
                `Object "${obj.name}" at ${obj.ox},${obj.oy} should be on accessible terrain`);
        }
    });

    it('gold pieces have quantity > 1', () => {
        initRng(42);
        const map = generateLevel(1);
        wallification(map);
        // Try several times to get gold
        for (let i = 0; i < 10; i++) {
            populateObjects(map, 1);
        }
        const gold = map.objects.filter(o => o.oc_class === COIN_CLASS);
        if (gold.length > 0) {
            for (const g of gold) {
                assert.ok(g.quantity > 1, 'Gold should have quantity > 1');
            }
        }
    });
});
