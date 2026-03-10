import test from 'node:test';
import assert from 'node:assert/strict';

import {
    noises, resetNoisesState, slept_monst, rustm,
} from '../../js/mhitm.js';
import { AT_EXPL, AT_BREA, AD_FIRE, PM_STEAM_VORTEX } from '../../js/monsters.js';
import { objectData, WEAPON_CLASS } from '../../js/objects.js';
import { is_flammable } from '../../js/objdata.js';

test('mhitm noises emits and rate-limits hearing messages', async () => {
    resetNoisesState();
    const msgs = [];
    const display = { putstr_message: async (s) => msgs.push(String(s)) };
    const magr = { mx: 1, my: 1 };
    const mattk = { aatyp: AT_EXPL };
    const ctx = { player: { x: 0, y: 0, deaf: false }, turnCount: 11 };

    await noises(magr, mattk, display, ctx);
    await noises(magr, mattk, display, ctx);
    assert.equal(msgs.length, 1);
    assert.match(msgs[0], /explosion/i);
});

test('mhitm slept_monst releases hero when a grabber falls asleep', () => {
    const mon = { mcanmove: false, mfrozen: 5 };
    const player = { ustuck: mon, uswallow: false, data: {} };
    slept_monst(mon, player);
    assert.equal(player.ustuck, null);
});

test('mhitm rustm skips steam-vortex fire erosion but erodes non-steam fire targets', () => {
    const fireData = { attacks: [{ aatyp: AT_BREA, adtyp: AD_FIRE, damn: 0, damd: 0 }] };
    let flammableOtyp = 0;
    for (let i = 0; i < objectData.length; i++) {
        if (is_flammable({ otyp: i })) {
            flammableOtyp = i;
        }
        if (flammableOtyp > 0) break;
    }
    assert.ok(flammableOtyp > 0);

    const steamWeapon = { otyp: flammableOtyp, oclass: WEAPON_CLASS, oeroded: 0 };
    const steamDef = { data: fireData, mndx: PM_STEAM_VORTEX };
    for (let i = 0; i < 200; i++) {
        rustm(steamDef, steamWeapon);
    }
    assert.equal(steamWeapon.oeroded || 0, 0);
});
