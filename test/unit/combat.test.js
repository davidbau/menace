// test/unit/combat.test.js -- Tests for the combat system
// C ref: uhitm.c, mhitu.c -- verifies attack/damage calculations

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initRng } from '../../js/rng.js';
import { Player, roles } from '../../js/player.js';
import { playerAttackMonster, monsterAttackPlayer, checkLevelUp } from '../../js/combat.js';
import { POTION_CLASS, POT_HEALING } from '../../js/objects.js';

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

    it('morale flee clears monster movement track', () => {
        initRng(42);
        const p = new Player();
        p.initRole(0);

        const mon = makeMonster({ mhp: 1000, mhpmax: 2000, ac: 10 });
        mon.mtrack = [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
            { x: 5, y: 6 },
            { x: 7, y: 8 },
        ];

        let fled = false;
        for (let i = 0; i < 1000; i++) {
            playerAttackMonster(p, mon, mockDisplay);
            if (mon.flee) {
                fled = true;
                break;
            }
            if (mon.dead) break;
        }

        assert.ok(fled, 'Monster should eventually flee during repeated hits');
        assert.deepEqual(mon.mtrack, [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
        ]);
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

    it('melee with a wielded healing potion uses potion-hit behavior', () => {
        initRng(42);
        const p = new Player();
        p.initRole(0);
        p.level = 30; // ensure hit in this test
        const potion = {
            otyp: POT_HEALING,
            oclass: POTION_CLASS,
            quan: 2,
            invlet: 'a',
            name: 'potion of healing',
        };
        p.inventory = [potion];
        p.weapon = potion;

        const mon = makeMonster({ name: 'kobold zombie', mhp: 3, mhpmax: 10, ac: 10 });
        const messages = [];
        const display = {
            putstr_message: (msg) => messages.push(msg),
            putstr() {},
        };
        playerAttackMonster(p, mon, display);

        assert.equal(potion.quan, 1, 'wielded potion stack should decrement by one');
        assert.equal(p.weapon, potion, 'remaining potion stack should stay wielded');
        assert.equal(mon.mhp, 9, 'healing potion melee-hit should still apply base melee damage');
        assert.equal(messages.at(-1), 'The kobold zombie looks sound and hale again.');
    });

    it('single wielded potion is consumed on melee hit', () => {
        initRng(42);
        const p = new Player();
        p.initRole(0);
        p.level = 30; // ensure hit in this test
        const potion = {
            otyp: POT_HEALING,
            oclass: POTION_CLASS,
            quan: 1,
            invlet: 'a',
            name: 'potion of healing',
        };
        p.inventory = [potion];
        p.weapon = potion;

        const mon = makeMonster({ mhp: 3, mhpmax: 10, ac: 10 });
        playerAttackMonster(p, mon, mockDisplay);

        assert.equal(p.inventory.length, 0, 'single potion should be removed from inventory');
        assert.equal(p.weapon, null, 'wielded potion should be cleared when consumed');
    });
});
