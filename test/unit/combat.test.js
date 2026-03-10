// test/unit/combat.test.js -- Tests for the combat system
// C ref: uhitm.c, mhitu.c -- verifies attack/damage calculations

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initRng } from '../../js/rng.js';
import { Player, roles } from '../../js/player.js';
import { do_attack } from '../../js/uhitm.js';
import { mattacku } from '../../js/mhitu.js';
import { POTION_CLASS, POT_HEALING, ORCISH_DAGGER, WEAPON_CLASS } from '../../js/objects.js';
import { SLIMED } from '../../js/const.js';
import { AT_WEAP, AT_BITE, AD_LEGS, AD_SLIM, AD_WERE, AD_DGST, AD_PEST, AD_SSEX, M1_HUMANOID, PM_WEREWOLF, mons } from '../../js/monsters.js';

// Mock display object
const mockDisplay = {
    putstr_message() {},
    putstr() {},
};

// Create a simple test monster matching makemon.js format
function makeMonster(opts = {}) {
    const ac = opts.ac !== undefined ? opts.ac : 8;
    return {
        name: opts.name || 'test monster',
        displayChar: opts.displayChar || 'x',
        mhp: opts.mhp || 10,
        mhpmax: opts.mhpmax || 10,
        // Combat to-hit uses worn.find_mac(mon) -> mon.type.ac.
        // Keep mac too for any legacy callers in tests.
        mac: ac,
        type: { ac },
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
    it('hmon deals damage', async () => {
        initRng(42);
        const p = new Player();
        p.initRole(0);
        p.x = 5; p.y = 5;

        const mon = makeMonster({ mhp: 100, ac: 10, mx: 6, my: 5 }); // easy to hit
        let totalDamage = 0;
        for (let i = 0; i < 50; i++) {
            const startHp = mon.mhp;
            await do_attack(p, mon, mockDisplay);
            totalDamage += startHp - mon.mhp;
        }
        assert.ok(totalDamage > 0, 'Player should deal damage over 50 attacks');
    });

    it('hmon can kill monster', async () => {
        initRng(42);
        const p = new Player();
        p.initRole(0);
        const mon = makeMonster({ mhp: 1, ac: 10, mx: 6, my: 5 });
        // Attack until dead (should happen quickly with 1 HP)
        for (let i = 0; i < 100 && !mon.dead; i++) {
            await do_attack(p, mon, mockDisplay);
        }
        assert.ok(mon.dead, 'Monster with 1 HP should die after several attacks');
    });

    it('mattacku deals damage', async () => {
        initRng(42);
        const p = new Player();
        p.initRole(0);
        p.ac = 10; // easy to hit
        p.x = 5; p.y = 5;

        const mon = makeMonster({ attacks: [{dmg: [2, 6]}], mx: 6, my: 5 }); // 2d6 damage
        const startHp = p.hp;
        let totalDamage = 0;
        for (let i = 0; i < 50; i++) {
            const before = p.hp;
            await mattacku(mon, p, mockDisplay);
            totalDamage += before - p.hp;
            p.hp = startHp; // reset for next attack
        }
        assert.ok(totalDamage > 0, 'Monster should deal damage over 50 attacks');
    });

    it('AT_WEAP monster attacks apply wielded weapon damage', async () => {
        const p = new Player();
        p.initRole(0);
        p.ac = 10;
        p.x = 5; p.y = 5;
        const baseHp = p.hp;
        const weapon = {
            otyp: ORCISH_DAGGER,
            oclass: WEAPON_CLASS,
            quan: 1,
            spe: 0,
            enchantment: 0,
        };

        const withWeapon = makeMonster({
            attacks: [{ aatyp: AT_WEAP, damn: 1, damd: 4 }],
            mx: 6, my: 5,
        });
        withWeapon.weapon = weapon;
        let withWeaponTotal = 0;
        initRng(123);
        for (let i = 0; i < 200; i++) {
            const before = p.hp;
            await mattacku(withWeapon, p, mockDisplay);
            withWeaponTotal += before - p.hp;
            p.hp = baseHp;
        }

        const noWeapon = makeMonster({
            attacks: [{ aatyp: AT_WEAP, damn: 1, damd: 4 }],
            mx: 6, my: 5,
        });
        noWeapon.weapon = null;
        let noWeaponTotal = 0;
        initRng(123);
        for (let i = 0; i < 200; i++) {
            const before = p.hp;
            await mattacku(noWeapon, p, mockDisplay);
            noWeaponTotal += before - p.hp;
            p.hp = baseHp;
        }

        assert.ok(withWeaponTotal > noWeaponTotal,
            `AT_WEAP with weapon should deal more damage (${withWeaponTotal} > ${noWeaponTotal})`);
    });

    it('AT_WEAP monster attacks show C-style swing message with possessive weapon', async () => {
        initRng(42);
        const p = new Player();
        p.initRole(0);
        p.ac = 10;
        p.x = 5; p.y = 5;

        const mon = makeMonster({
            name: 'goblin',
            level: 10,
            attacks: [{ aatyp: AT_WEAP, damn: 1, damd: 4 }],
        });
        mon.type = { mflags1: M1_HUMANOID, mflags2: 0, geno: 0 };
        mon.female = true;
        mon.weapon = {
            otyp: ORCISH_DAGGER,
            oclass: WEAPON_CLASS,
            quan: 1,
            dknown: true,
            known: false,
        };
        mon.mx = 6;
        mon.my = 5;

        const messages = [];
        const display = {
            putstr_message: (msg) => messages.push(msg),
            putstr() {},
        };
        const game = { flags: { verbose: true }, fov: { canSee: () => true } };
        await mattacku(mon, p, display, game);

        assert.equal(messages[0], 'The goblin thrusts her crude dagger.');
    });

    it('AD_LEGS attack sets wounded legs state', async () => {
        initRng(42);
        const p = new Player();
        p.initRole(0);
        p.ac = 10;
        p.x = 5;
        p.y = 5;
        p.boots = null;

        const mon = makeMonster({
            attacks: [{ aatyp: AT_BITE, adtyp: AD_LEGS, damn: 1, damd: 1 }],
            mx: 6, my: 5,
        });

        for (let i = 0; i < 200 && !p.woundedLegs; i++) {
            await mattacku(mon, p, mockDisplay);
        }

        assert.ok(p.woundedLegs, 'AD_LEGS should set wounded legs');
        assert.ok((p.eWoundedLegs || 0) !== 0, 'wounded leg side bits should be set');
        assert.ok((p.hWoundedLegs || 0) > 0, 'wounded leg timeout should be set');
    });

    it('AD_SLIM applies sliming without forcing zero physical damage', async () => {
        initRng(42);
        const p = new Player();
        p.initRole(0);
        p.ac = 10;
        p.x = 5;
        p.y = 5;
        p.unchanging = false;

        const mon = makeMonster({
            level: 12,
            attacks: [{ aatyp: AT_BITE, adtyp: AD_SLIM, damn: 1, damd: 4 }],
            mx: 6, my: 5,
        });
        mon.mcan = false;

        let damaged = false;
        for (let i = 0; i < 80; i++) {
            const hp0 = p.hp;
            await mattacku(mon, p, mockDisplay);
            if (p.hp < hp0) damaged = true;
            if ((p.getPropTimeout?.(SLIMED) || 0) > 0) break;
        }

        assert.ok((p.getPropTimeout?.(SLIMED) || 0) > 0, 'AD_SLIM should set Slimed timeout');
        assert.ok(damaged, 'AD_SLIM hit should still deal physical damage');
    });

    it('AD_WERE can infect hero lycanthropy when conditions allow', async () => {
        initRng(123);
        const p = new Player();
        p.initRole(0);
        p.ac = 10;
        p.x = 5;
        p.y = 5;
        p.ulycn = -1;
        p.protectionFromShapeChangers = false;
        p.weapon = null;

        const mon = makeMonster({
            level: 14,
            attacks: [{ aatyp: AT_BITE, adtyp: AD_WERE, damn: 1, damd: 4 }],
            mx: 6, my: 5,
        });
        mon.mcan = false;
        mon.data = mons[PM_WEREWOLF];
        mon.type = mons[PM_WEREWOLF];

        for (let i = 0; i < 200 && p.ulycn < 0; i++) {
            await mattacku(mon, p, mockDisplay);
        }

        assert.equal(p.ulycn, PM_WEREWOLF);
    });

    it('AD_DGST on mhitu path does not apply direct damage', async () => {
        initRng(7);
        const p = new Player();
        p.initRole(0);
        p.ac = 10;
        p.x = 5;
        p.y = 5;
        const hp0 = p.hp;

        const mon = makeMonster({
            level: 12,
            attacks: [{ aatyp: AT_BITE, adtyp: AD_DGST, damn: 6, damd: 6 }],
            mx: 6, my: 5,
        });
        mon.mcan = false;

        for (let i = 0; i < 12; i++) {
            await mattacku(mon, p, mockDisplay);
        }
        assert.equal(p.hp, hp0, 'AD_DGST should not deal direct damage in mhitu path');
    });

    it('AD_PEST applies disease side-effects while preserving physical damage path', async () => {
        initRng(11);
        const p = new Player();
        p.initRole(0);
        p.ac = 10;
        p.x = 5;
        p.y = 5;
        p.sick = 0;
        const hp0 = p.hp;

        const mon = makeMonster({
            level: 14,
            attacks: [{ aatyp: AT_BITE, adtyp: AD_PEST, damn: 1, damd: 4 }],
            mx: 6, my: 5,
        });
        mon.mcan = false;

        await mattacku(mon, p, mockDisplay);
        assert.ok((p.sick || 0) > 0, 'AD_PEST should apply disease side effect');
        assert.ok(p.hp <= hp0, 'AD_PEST should preserve normal physical damage path');
    });

    it('AD_SSEX uses seduction/theft path and does not apply direct damage', async () => {
        initRng(19);
        const p = new Player();
        p.initRole(0);
        p.ac = 10;
        p.x = 5;
        p.y = 5;

        const stolen = { otyp: POT_HEALING, oclass: POTION_CLASS, quan: 1, invlet: 'a' };
        p.inventory = [stolen];
        const hp0 = p.hp;

        const mon = makeMonster({
            level: 10,
            attacks: [{ aatyp: AT_BITE, adtyp: AD_SSEX, damn: 4, damd: 6 }],
            mx: 6, my: 5,
        });
        mon.mcan = false;
        mon.minvent = null;

        await mattacku(mon, p, mockDisplay);
        assert.equal(p.hp, hp0, 'AD_SSEX should not apply direct damage on mhitu seduction path');
    });


    it('morale flee clears monster movement track', async () => {
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
            await do_attack(p, mon, mockDisplay);
            if (mon.mflee) {
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

    it('higher AC makes monster harder to hit', async () => {
        initRng(42);
        const p = new Player();
        p.initRole(0);

        // Count hits against easy target (AC 10)
        let hitsEasy = 0;
        for (let i = 0; i < 200; i++) {
            const mon = makeMonster({ mhp: 100, ac: 10 });
            const before = mon.mhp;
            await do_attack(p, mon, mockDisplay);
            if (mon.mhp < before) hitsEasy++;
        }

        initRng(42);
        // Count hits against hard target (AC 0)
        let hitsHard = 0;
        for (let i = 0; i < 200; i++) {
            const mon = makeMonster({ mhp: 100, ac: 0 });
            const before = mon.mhp;
            await do_attack(p, mon, mockDisplay);
            if (mon.mhp < before) hitsHard++;
        }

        assert.ok(hitsEasy >= hitsHard,
            `Should hit AC 10 (${hitsEasy}) more often than AC 0 (${hitsHard})`);
    });

    it('melee with a wielded healing potion uses potion-hit behavior', async () => {
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
        await do_attack(p, mon, display);

        assert.equal(potion.quan, 1, 'wielded potion stack should decrement by one');
        assert.equal(p.weapon, potion, 'remaining potion stack should stay wielded');
        assert.equal(mon.mhp, 9, 'healing potion melee-hit should still apply base melee damage');
        assert.equal(messages.at(-1), 'The kobold zombie looks sound and hale again.');
    });

    it('single wielded potion is consumed on melee hit', async () => {
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
        await do_attack(p, mon, mockDisplay);

        assert.equal(p.inventory.length, 0, 'single potion should be removed from inventory');
        assert.equal(p.weapon, null, 'wielded potion should be cleared when consumed');
    });
});
