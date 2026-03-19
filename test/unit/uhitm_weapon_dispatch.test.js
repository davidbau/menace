import { test } from 'node:test';
import assert from 'node:assert/strict';

import { hmon_hitmon_weapon } from '../../js/uhitm.js';
import { DART, BOW } from '../../js/objects.js';

test('thrown ammo with matching launcher uses melee damage branch', () => {
    const hmd = {
        thrown: 1,
        player: {
            weapon: { otyp: BOW },
        },
        dmg: 0,
        use_weapon_skill: false,
        train_weapon_skill: false,
        silvermsg: false,
        silverobj: false,
        lightobj: false,
        ispoisoned: false,
        dieroll: 10,
    };
    const mon = {
        mndx: 12,
        data: { msize: 0 },
        mhp: 10,
    };
    const obj = {
        otyp: DART,
        oclass: 2,
        spe: 0,
        oeroded: 0,
        oeroded2: 0,
        opoisoned: false,
    };

    hmon_hitmon_weapon(hmd, mon, obj);

    assert.equal(hmd.use_weapon_skill, true);
});
