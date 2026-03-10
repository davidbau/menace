import test from 'node:test';
import assert from 'node:assert/strict';

import {
    mhitm_ad_were,
    mhitm_ad_pest,
    mhitm_ad_famn,
} from '../../js/uhitm.js';
import { AT_KICK, M1_THICK_HIDE, M1_HERBIVORE } from '../../js/monsters.js';

test('mhitm_ad_were delegates through physical handling (kick vs thick hide -> zero damage)', () => {
    const magr = { mcan: false, data: {} };
    const mdef = { data: { mflags1: M1_THICK_HIDE } };
    const mattk = { aatyp: AT_KICK };
    const mhm = { damage: 7 };

    mhitm_ad_were(magr, mattk, mdef, mhm);
    assert.equal(mhm.damage, 0);
});

test('mhitm_ad_pest routes to AD_DISE behavior (fungus target -> zero damage)', () => {
    const magr = { mcan: false, data: {} };
    const mdef = { data: { mlet: 'F' } };
    const mattk = { adtyp: 0 };
    const mhm = { damage: 9 };

    mhitm_ad_pest(magr, mattk, mdef, mhm);
    assert.equal(mhm.damage, 0);
});

test('mhitm_ad_famn zeroes damage only for non-eaters', () => {
    const magr = { mcan: false, data: {} };
    const mattk = { adtyp: 0 };

    const nonEater = { data: { mflags1: 0 } };
    const mhm1 = { damage: 6 };
    mhitm_ad_famn(magr, mattk, nonEater, mhm1);
    assert.equal(mhm1.damage, 0);

    const eater = { data: { mflags1: M1_HERBIVORE } };
    const mhm2 = { damage: 6 };
    mhitm_ad_famn(magr, mattk, eater, mhm2);
    assert.equal(mhm2.damage, 6);
});
