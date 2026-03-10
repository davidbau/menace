// test/unit/makemon.test.js -- Tests for C-faithful monster creation
// C ref: makemon.c -- verifies makemon(), mons[], and level generation monsters

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initRng } from '../../js/rng.js';
import { ACCESSIBLE, MM_ASLEEP, NO_MM_FLAGS, MM_NOGRP } from '../../js/const.js';
import {
    makemon, rndmonnum, withMakemonPlayerOverride, mbirth_limit,
    init_mongen_order, check_mongen_order, dump_mongen,
    mkclass_aligned, mkclass_poly, propagate
} from '../../js/makemon.js';
import { A_CHAOTIC } from '../../js/const.js';
import { mons, PM_NAZGUL, PM_ERINYS, PM_LEPRECHAUN, PM_LITTLE_DOG, G_UNIQ, S_LICH, S_ZOMBIE } from '../../js/monsters.js';
import { initLevelGeneration, makelevel, wallification } from '../../js/dungeon.js';

/** Find an unoccupied accessible tile in a room. */
function findEmptyTile(map, room) {
    for (let y = room.ly; y <= room.hy; y++) {
        for (let x = room.lx; x <= room.hx; x++) {
            const loc = map.at(x, y);
            if (loc && ACCESSIBLE(loc.typ) && !map.monsterAt(x, y)) {
                return { x, y };
            }
        }
    }
    return null;
}

describe('Monster creation (C-faithful)', () => {
    it('mons[] has many entries', () => {
        assert.ok(mons.length > 300, `Expected >300 monster types, got ${mons.length}`);
    });

    it('makemon creates a valid monster with known mndx', async () => {
        initRng(42);
        initLevelGeneration();
        const map = await makelevel(1);
        wallification(map);

        const room = map.rooms[0];
        const pos = findEmptyTile(map, room);
        assert.ok(pos, 'Should find an empty tile in room');

        // Find a grid bug in mons[]
        const mndx = mons.findIndex(m => m.name === 'grid bug');
        assert.ok(mndx >= 0, 'grid bug should exist in mons[]');

        const mon = makemon(mndx, pos.x, pos.y, NO_MM_FLAGS, 1, map);
        assert.ok(mon, 'Should create a monster');
        assert.equal(mon.mx, pos.x);
        assert.equal(mon.my, pos.y);
        assert.ok(mon.mhp > 0, 'Monster should have HP');
        assert.ok((mon.data?.mmove || 0) > 0, 'Monster should have mmove on mon.data');
        assert.equal(mon.name, 'grid bug');
        assert.equal(typeof mon.displayChar, 'string');
        assert.ok(!mon.dead, 'New monster should not be dead');
    });

    it('makemon with null selects random monster', async () => {
        initRng(42);
        initLevelGeneration();
        const map = await makelevel(1);
        wallification(map);

        const room = map.rooms[0];
        const pos = findEmptyTile(map, room);
        assert.ok(pos, 'Should find an empty tile in room');

        const mon = makemon(null, pos.x, pos.y, NO_MM_FLAGS, 1, map);
        assert.ok(mon, 'Should create a random monster');
        assert.ok(mon.mhp > 0, 'Monster should have HP');
        assert.ok(mon.name, 'Monster should have a name');
    });

    it('rndmonnum returns valid monster index', () => {
        initRng(42);
        for (let i = 0; i < 20; i++) {
            const mndx = rndmonnum(1);
            assert.ok(mndx >= 0 && mndx < mons.length,
                `rndmonnum should return valid index, got ${mndx}`);
        }
    });

    it('makemon peace_minded follows player alignment context', () => {
        const gremlin = mons.findIndex(m => m.name === 'gremlin');
        assert.ok(gremlin >= 0, 'gremlin should exist in mons[]');

        // Use a simple accessible tile map so only monster-creation logic is exercised.
        const map = {
            monsters: [],
            at: () => ({ typ: 100 }),
            monsterAt() { return null; },
            addMonster(m) { this.monsters.unshift(m); },
        };

        initRng(1234);
        const chaoticGremlin = withMakemonPlayerOverride(
            { roleIndex: 1, alignment: -1, alignmentRecord: 10, race: 0, inventory: [] },
            () => makemon(gremlin, 10, 10, NO_MM_FLAGS, 1, map)
        );
        assert.equal(chaoticGremlin.peaceful, true);

        initRng(1234);
        map.monsters = [];
        const lawfulGremlin = withMakemonPlayerOverride(
            { roleIndex: 4, alignment: 1, alignmentRecord: 10, race: 0, inventory: [] },
            () => makemon(gremlin, 10, 10, NO_MM_FLAGS, 1, map)
        );
        assert.equal(lawfulGremlin.peaceful, false);
    });

    it('MM_ASLEEP marks new monsters sleeping', () => {
        const map = {
            monsters: [],
            at: () => ({ typ: 100 }),
            monsterAt() { return null; },
            addMonster(m) { this.monsters.unshift(m); },
        };
        const gridBug = mons.findIndex(m => m.name === 'grid bug');
        assert.ok(gridBug >= 0, 'grid bug should exist in mons[]');
        const mon = makemon(gridBug, 10, 10, MM_ASLEEP, 1, map);
        assert.equal(mon.msleeping, 1);
        assert.equal(mon.sleeping, true);
    });

    it('leprechauns start asleep by default', () => {
        const map = {
            monsters: [],
            at: () => ({ typ: 100 }),
            monsterAt() { return null; },
            addMonster(m) { this.monsters.unshift(m); },
        };
        const mon = makemon(PM_LEPRECHAUN, 11, 10, NO_MM_FLAGS, 1, map);
        assert.equal(mon.msleeping, 1);
        assert.equal(mon.sleeping, true);
    });
});

describe('Level monster population (C-faithful)', () => {
    it('makelevel places monsters on the map', async () => {
        initRng(42);
        initLevelGeneration();
        const map = await makelevel(1);
        wallification(map);

        assert.ok(map.monsters.length > 0, 'Level should have monsters');
    });

    it('monsters are placed on accessible terrain', async () => {
        initRng(42);
        initLevelGeneration();
        const map = await makelevel(1);
        wallification(map);

        for (const mon of map.monsters) {
            const loc = map.at(mon.mx, mon.my);
            assert.ok(loc && ACCESSIBLE(loc.typ),
                `Monster "${mon.name}" at ${mon.mx},${mon.my} should be on accessible terrain`);
        }
    });

    it('no two monsters share the same tile', async () => {
        initRng(42);
        initLevelGeneration();
        const map = await makelevel(1);
        wallification(map);

        const positions = new Set();
        for (const mon of map.monsters) {
            const key = `${mon.mx},${mon.my}`;
            assert.ok(!positions.has(key),
                `Two monsters at ${key}`);
            positions.add(key);
        }
    });

    it('monsters have C-faithful properties', async () => {
        initRng(42);
        initLevelGeneration();
        const map = await makelevel(1);
        wallification(map);

        for (const mon of map.monsters) {
            assert.equal(typeof mon.mndx, 'number', `${mon.name} should have mndx`);
            assert.ok(mon.mndx >= 0 && mon.mndx < mons.length,
                `${mon.name} mndx ${mon.mndx} should be valid`);
            assert.ok(mon.mhp > 0, `${mon.name} should have positive HP`);
            assert.ok((mon.data?.mmove || 0) >= 0, `${mon.name} should have non-negative mmove`);
            assert.ok(Array.isArray(mon.attacks), `${mon.name} should have attacks array`);
            assert.ok(Array.isArray(mon.mtrack), `${mon.name} should have mtrack array`);
        }
    });
});

// ========================================================================
// mbirth_limit
// ========================================================================

describe('mbirth_limit', () => {
    it('returns 9 for PM_NAZGUL', () => {
        assert.equal(mbirth_limit(PM_NAZGUL), 9);
    });

    it('returns 3 for PM_ERINYS', () => {
        assert.equal(mbirth_limit(PM_ERINYS), 3);
    });

    it('returns 120 (MAXMONNO) for ordinary monsters', () => {
        assert.equal(mbirth_limit(PM_LITTLE_DOG), 120);
    });

    it('returns 120 for index 0', () => {
        assert.equal(mbirth_limit(0), 120);
    });
});

describe('makemon C-surface helpers', () => {
    it('initializes a monotonic mongen order', () => {
        init_mongen_order();
        assert.equal(check_mongen_order(), true);
        const dumped = dump_mongen();
        assert.ok(Array.isArray(dumped));
        assert.ok(dumped.length > 100);
    });

    it('mkclass_aligned filters by alignment sign', () => {
        initRng(7);
        const mndx = mkclass_aligned(S_ZOMBIE, 0, A_CHAOTIC, 8);
        assert.ok(mndx >= 0);
        const mal = mons[mndx].maligntyp || 0;
        assert.ok(Math.sign(mal) === Math.sign(A_CHAOTIC) || mal === 0);
    });

    it('mkclass_poly returns a valid index for common class', () => {
        initRng(9);
        const mndx = mkclass_poly(S_LICH);
        if (mndx >= 0) {
            assert.equal(mons[mndx].mlet, S_LICH);
        } else {
            // Accept NON_PM if all candidates are masked on current state.
            assert.equal(mndx, -1);
        }
    });

    it('propagate updates born count and extinction flags', () => {
        const game = { mvitals: new Array(mons.length).fill(null).map(() => ({ born: 0, mvflags: 0 })) };
        const regular = PM_LITTLE_DOG;
        const unique = PM_LEPRECHAUN;
        const originalGeno = mons[unique].geno;
        mons[unique].geno = originalGeno | G_UNIQ;

        const r1 = propagate(regular, true, false, game);
        assert.equal(r1, true);
        assert.equal(game.mvitals[regular].born, 1);

        const r2 = propagate(unique, true, false, game);
        assert.equal(r2, true);
        assert.ok((game.mvitals[unique].mvflags & 0x02) !== 0);
        mons[unique].geno = originalGeno;
    });
});
