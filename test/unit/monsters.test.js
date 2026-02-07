// test/unit/monsters.test.js -- Tests for the monster database
// C ref: monst.c, monsters.h -- verifies monster data integrity

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mons, NUMMONS,
         PM_GIANT_ANT, PM_KILLER_BEE, PM_JACKAL, PM_GRID_BUG,
         PM_NEWT, PM_GNOME, PM_KOBOLD, PM_ORC,
         S_ANT, S_DOG, S_FELINE, S_HUMANOID, S_KOBOLD, S_ORC,
         AT_BITE, AT_CLAW, AT_KICK, AT_STNG, AT_WEAP,
         AD_PHYS, AD_FIRE, AD_COLD, AD_ELEC, AD_DRST,
         CLR_RED, CLR_BROWN, CLR_YELLOW } from '../../js/monsters.js';
const monsterData = mons;

describe('Monsters database', () => {
    it('has correct total count', () => {
        assert.equal(NUMMONS, monsterData.length);
        assert.ok(NUMMONS > 350, `Expected >350 monsters, got ${NUMMONS}`);
    });

    it('all monsters have required fields', () => {
        for (let i = 0; i < monsterData.length; i++) {
            const m = monsterData[i];
            assert.equal(typeof m.name, 'string', `Monster ${i} missing name`);
            assert.equal(typeof m.symbol, 'number', `Monster ${i} missing symbol`);
            assert.equal(typeof m.level, 'number', `Monster ${i} missing level`);
            assert.equal(typeof m.speed, 'number', `Monster ${i} missing speed`);
            assert.equal(typeof m.ac, 'number', `Monster ${i} missing ac`);
            assert.equal(typeof m.color, 'number', `Monster ${i} missing color`);
            assert.ok(Array.isArray(m.attacks), `Monster ${i} missing attacks array`);
        }
    });

    it('specific monsters match C source', () => {
        // giant ant
        const ant = monsterData[PM_GIANT_ANT];
        assert.equal(ant.name, 'giant ant');
        assert.equal(ant.symbol, S_ANT);

        // newt
        const newt = monsterData[PM_NEWT];
        assert.equal(newt.name, 'newt');

        // grid bug
        const gb = monsterData[PM_GRID_BUG];
        assert.equal(gb.name, 'grid bug');
    });

    it('monsters have valid attack types', () => {
        for (const m of monsterData) {
            for (const atk of m.attacks) {
                // Attacks are {type, damage, dice, sides} objects
                assert.equal(typeof atk.type, 'number', `${m.name} attack type not number`);
                assert.equal(typeof atk.damage, 'number', `${m.name} damage type not number`);
                assert.equal(typeof atk.dice, 'number', `${m.name} attack dice not number`);
                assert.equal(typeof atk.sides, 'number', `${m.name} attack sides not number`);
            }
        }
    });

    it('monster levels are non-negative', () => {
        for (const m of monsterData) {
            assert.ok(m.level >= 0, `${m.name} has negative level ${m.level}`);
        }
    });

    it('monster speeds are non-negative', () => {
        for (const m of monsterData) {
            assert.ok(m.speed >= 0, `${m.name} has negative speed ${m.speed}`);
        }
    });

    it('PM constants index correctly', () => {
        assert.equal(monsterData[PM_GIANT_ANT].name, 'giant ant');
        assert.equal(monsterData[PM_KILLER_BEE].name, 'killer bee');
        assert.equal(monsterData[PM_JACKAL].name, 'jackal');
        assert.equal(monsterData[PM_GNOME].name, 'gnome');
    });

    it('all symbol classes are used', () => {
        const usedSymbols = new Set(monsterData.map(m => m.symbol));
        // Should have many different symbol classes
        assert.ok(usedSymbols.size > 20, `Expected >20 symbol classes, got ${usedSymbols.size}`);
    });
});
