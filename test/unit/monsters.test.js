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
         } from '../../js/monsters.js';
import { CLR_RED, CLR_BROWN, CLR_YELLOW } from '../../js/const.js';
const monsterData = mons;

describe('Monsters database', () => {
    it('has correct total count', () => {
        assert.equal(NUMMONS, monsterData.length);
        assert.ok(NUMMONS > 350, `Expected >350 monsters, got ${NUMMONS}`);
    });

    it('all monsters have required fields', () => {
        for (let i = 0; i < monsterData.length; i++) {
            const m = monsterData[i];
            assert.equal(typeof m.mname, 'string', `Monster ${i} missing mname`);
            assert.equal(typeof m.mlet, 'number', `Monster ${i} missing mlet`);
            assert.equal(typeof m.mlevel, 'number', `Monster ${i} missing mlevel`);
            assert.equal(typeof m.mmove, 'number', `Monster ${i} missing mmove`);
            assert.equal(typeof m.ac, 'number', `Monster ${i} missing ac`);
            assert.equal(typeof m.mcolor, 'number', `Monster ${i} missing mcolor`);
            assert.ok(Array.isArray(m.attacks), `Monster ${i} missing attacks array`);
        }
    });

    it('specific monsters match C source', () => {
        // giant ant
        const ant = monsterData[PM_GIANT_ANT];
        assert.equal(ant.mname, 'giant ant');
        assert.equal(ant.mlet, S_ANT);

        // newt
        const newt = monsterData[PM_NEWT];
        assert.equal(newt.mname, 'newt');

        // grid bug
        const gb = monsterData[PM_GRID_BUG];
        assert.equal(gb.mname, 'grid bug');
    });

    it('monsters have valid attack types', () => {
        for (const m of monsterData) {
            for (const atk of m.attacks) {
                // Attacks are canonical C-style {aatyp, adtyp, damn, damd}
                // with legacy aliases kept for compatibility.
                assert.equal(typeof atk.aatyp, 'number', `${m.mname} aatyp not number`);
                assert.equal(typeof atk.adtyp, 'number', `${m.mname} adtyp not number`);
                assert.equal(typeof atk.damn, 'number', `${m.mname} damn not number`);
                assert.equal(typeof atk.damd, 'number', `${m.mname} damd not number`);
            }
        }
    });

    it('monster levels are non-negative', () => {
        for (const m of monsterData) {
            assert.ok(m.mlevel >= 0, `${m.mname} has negative level ${m.mlevel}`);
        }
    });

    it('monster speeds are non-negative', () => {
        for (const m of monsterData) {
            assert.ok(m.mmove >= 0, `${m.mname} has negative speed ${m.mmove}`);
        }
    });

    it('PM constants index correctly', () => {
        assert.equal(monsterData[PM_GIANT_ANT].mname, 'giant ant');
        assert.equal(monsterData[PM_KILLER_BEE].mname, 'killer bee');
        assert.equal(monsterData[PM_JACKAL].mname, 'jackal');
        assert.equal(monsterData[PM_GNOME].mname, 'gnome');
    });

    it('all symbol classes are used', () => {
        const usedSymbols = new Set(monsterData.map(m => m.mlet));
        // Should have many different symbol classes
        assert.ok(usedSymbols.size > 20, `Expected >20 symbol classes, got ${usedSymbols.size}`);
    });
});
