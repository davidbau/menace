// test/unit/combat.test.js -- Tests for the combat system
// C ref: uhitm.c, mhitu.c -- verifies attack/damage calculations

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initRng } from '../../js/rng.js';
import { Player, roles } from '../../js/player.js';
import { playerAttackMonster, monsterAttackPlayer, checkLevelUp } from '../../js/combat.js';

// Mock display object
const mockDisplay = {
    putstr_message() {},
    putstr() {},
};

// Create a simple test monster matching makemon.js format
function makeMonster(opts = {}) {
    return {
        name: opts.name || 'test monster',
        displayChar: opts.displayChar || 'x',
        mhp: opts.mhp || 10,
        mhpmax: opts.mhpmax || 10,
        mac: opts.ac !== undefined ? opts.ac : 8,
        mx: opts.mx || 5,
        my: opts.my || 5,
        mlevel: opts.level || 1,
        speed: opts.speed || 12,
        attacks: opts.attacks || [{dmg: [1, 4]}],
        dead: false,
        exp: opts.exp || 10,
        sleeping: false,
        peaceful: false,
    };
}

describe('Combat system', () => {
    it('playerAttackMonster deals damage', () => {
        initRng(42);
        const p = new Player();
        p.initRole(0);
        p.x = 5; p.y = 5;

        const mon = makeMonster({ mhp: 100, ac: 10 }); // easy to hit
        let totalDamage = 0;
        for (let i = 0; i < 50; i++) {
            const startHp = mon.mhp;
            playerAttackMonster(p, mon, mockDisplay);
            totalDamage += startHp - mon.mhp;
        }
        assert.ok(totalDamage > 0, 'Player should deal damage over 50 attacks');
    });

    it('playerAttackMonster can kill monster', () => {
        initRng(42);
        const p = new Player();
        p.initRole(0);
        const mon = makeMonster({ mhp: 1, ac: 10 });
        // Attack until dead (should happen quickly with 1 HP)
        for (let i = 0; i < 100 && !mon.dead; i++) {
            playerAttackMonster(p, mon, mockDisplay);
        }
        assert.ok(mon.dead, 'Monster with 1 HP should die after several attacks');
    });

    it('monsterAttackPlayer deals damage', () => {
        initRng(42);
        const p = new Player();
        p.initRole(0);
        p.ac = 10; // easy to hit

        const mon = makeMonster({ attacks: [{dmg: [2, 6]}] }); // 2d6 damage
        const startHp = p.hp;
        let totalDamage = 0;
        for (let i = 0; i < 50; i++) {
            const before = p.hp;
            monsterAttackPlayer(mon, p, mockDisplay);
            totalDamage += before - p.hp;
            p.hp = startHp; // reset for next attack
        }
        assert.ok(totalDamage > 0, 'Monster should deal damage over 50 attacks');
    });

    it('checkLevelUp advances player level', () => {
        const p = new Player();
        p.initRole(0);
        p.level = 1;
        p.exp = 0;

        // Give enough XP to level up
        p.exp = 30; // should be enough for level 2
        checkLevelUp(p, mockDisplay);
        assert.ok(p.level >= 2, `Player should be level 2+ with 30 XP, got ${p.level}`);
    });

    it('higher AC makes monster harder to hit', () => {
        initRng(42);
        const p = new Player();
        p.initRole(0);

        // Count hits against easy target (AC 10)
        let hitsEasy = 0;
        for (let i = 0; i < 200; i++) {
            const mon = makeMonster({ mhp: 100, ac: 10 });
            const before = mon.mhp;
            playerAttackMonster(p, mon, mockDisplay);
            if (mon.mhp < before) hitsEasy++;
        }

        initRng(42);
        // Count hits against hard target (AC 0)
        let hitsHard = 0;
        for (let i = 0; i < 200; i++) {
            const mon = makeMonster({ mhp: 100, ac: 0 });
            const before = mon.mhp;
            playerAttackMonster(p, mon, mockDisplay);
            if (mon.mhp < before) hitsHard++;
        }

        assert.ok(hitsEasy >= hitsHard,
            `Should hit AC 10 (${hitsEasy}) more often than AC 0 (${hitsHard})`);
    });
});
